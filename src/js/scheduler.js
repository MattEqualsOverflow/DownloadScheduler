const schedule = require('node-schedule');
var moment = require('moment');

let scheduler = {

    ipapiKey: "",
    ipapiUrl: "",
    expectedCountry: "",
    docker: undefined,
    database: undefined,
    scraper: undefined,
    pydownload: undefined,
    hasValidIp: false,
    databaseReloadSchedule: "0 * * * * *",
    ipCheckSchedule: "0 0 */6 * * *",

    jobs: {},
    currentRecords: [],

    init(settings, docker, database, scraper, pydownload) {
        this.ipapiKey = settings.IpapiKey;
        this.ipapiUrl = "http://api.ipapi.com/check?access_key=" + settings.IpapiKey;
        this.expectedCountry = settings.ExpectedCountry;
        this.docker = docker;
        this.database = database;
        this.scraper = scraper;
        this.pydownload = pydownload;
        this.databaseReloadSchedule = settings.DatabaseReloadSchedule;
        this.ipCheckSchedule = settings.IpCheckSchedule;
    },

    async start() {

        if (!this.ipapiKey) {
            console.log("ipapi key required");
            return;
        }

        if (!this.expectedCountry) {
            console.log("Expected country required");
            return;
        }

        await this.validateIp();

        this.logMain("Starting main schedule of " + this.databaseReloadSchedule);
        const main = schedule.scheduleJob(this.databaseReloadSchedule, (fireData) => this.mainSchedule());

        this.logMain("Starting ip schedule schedule of " + this.ipCheckSchedule);
        const ipCheck = schedule.scheduleJob(this.ipCheckSchedule, (fireData) => this.validateIp());
    },

    mainSchedule() {
        this.getDatabaseData();
    },

    async validateIp() {
        let data = await this.docker.getUrlContents(this.ipapiUrl);
        let json = JSON.parse(data);
        this.logMain(`Country: ${json['country_name']} | Expected Country: ${this.expectedCountry} (${json['country_name'] == this.expectedCountry ? 'Valid' : 'Invalid'})`);
        this.hasValidIp = json['country_name'] == this.expectedCountry;
    },

    async getDatabaseData() {

        if (!this.hasValidIp) {
            return;
        }

        let records = await this.database.getRecords();

        records.forEach(record => {

            let previousRecord = this.currentRecords.filter(x => x.id == record.id);
            let hasPreviousRecord = previousRecord && previousRecord[0];
            let hasChanged = hasPreviousRecord && this.hasRecordChanged(previousRecord[0], record);
            

            if (record.url && (hasChanged || record.status == "Failed" || record.status == "")) {
                if (hasChanged) {
                    let temp = previousRecord[0];
                    this.hasRecordChanged(previousRecord[0], record)
                }
                this.downloadManualRecord(record);
            } else if (record.cron) {
                if (hasChanged && this.jobs[record.id]) {
                    this.removeScheduledJob(previousRecord[0]);
                    this.addScheduledJob(record);
                } else if (!hasPreviousRecord) {
                    this.addScheduledJob(record);
                }
            }
        });

        this.currentRecords.forEach(record => {
            if (record.cron && records.filter(x => x.id == record.id).length ==0) {
                this.removeScheduledJob(record);
            }
        });

        this.currentRecords = records;

        this.checkDownloadStatuses(records);
    },

    hasRecordChanged(oldRecord, newRecord) {
        return oldRecord.path != newRecord.path
            || oldRecord.search != newRecord.search
            || oldRecord.site != newRecord.site
            || oldRecord.cron != newRecord.cron
            || oldRecord.regex != newRecord.regex
            || oldRecord.url != newRecord.url;
    },

    addScheduledJob(record) {
        this.logRecord(record, `Adding schedule of ${record.cron} with search term "${record.search}"`);
        this.jobs[record.id] = schedule.scheduleJob(record.cron, (fireData) => this.downloadScheduledRecord(record));
    },

    removeScheduledJob(record) {
        this.logRecord(record, `Removing schedule of ${record.cron}`);
        this.jobs[record.id].cancel();
        this.jobs[record.id] = false;
    },

    downloadManualRecord(record) {
        this.logRecord(record, `Downloading manual record`);
        this.startDownload(record, record.url);
    },

    async downloadScheduledRecord(record) {

        if (!this.hasValidIp) {
            return;
        }

        let updatedRecord = this.currentRecords.filter(x => x.id == record.id);
        if (!updatedRecord || !updatedRecord[0]) {
            return;
        }

        // Check if it's already been downloaded today
        let prevTime = updatedRecord[0].updated ? updatedRecord[0].updated : false;
        if (prevTime && updatedRecord[0].status != "Failed" && updatedRecord[0].status != "Not Found" && updatedRecord[0].status != "") {
            let prevMoment = moment(prevTime);
            let currMoment = moment().subtract(18, 'hours');
            if (prevMoment > currMoment) {
                return;
            }
        }

        let latestRecord = updatedRecord[0];

        // Try to search for the download and start downloading it
        this.logRecord(latestRecord, `Searching site for "${latestRecord.search}"`);
        let searchResults = await this.scraper.search(latestRecord.site, latestRecord.search, latestRecord.regex);
        if (!searchResults) {
            this.logRecord(latestRecord, `No results found using search term "${latestRecord.search}"`);
            latestRecord.status = "Not Found";
            this.database.updateRecord(latestRecord);
        } else {
            this.logRecord(latestRecord, `Download "${searchResults.name}" found with a time of ${searchResults.time}`);
            this.startDownload(latestRecord, searchResults.link);
        }
    },

    async startDownload(record, url) {

        if (!url.startsWith("magnet")) {
            if (url.length > 100) {
                url = url.substring(0, 97) + "...";
            }
            this.logRecord(record, `Invalid url ${url}`);
            record.status = "Failed";
            this.database.updateRecord(record);
            return;
        }

        this.logRecord(record, `Downloading ${url.substring(0, 97)}...`);

        return;

        let downloadId = await this.pydownload.download(url, record.path);

        if (downloadId) {
            record.status = "Started";
            record.downloadId = downloadId
        } else {
            this.logRecord(record, `Failed to initiate download`);
            record.status = "Failed";
        }
        
        this.database.updateRecord(record);
    },

    logRecord(record, message) {
        console.log(`[${moment().format()}] [${record.name}] ${message}`)
    },

    logMain(message) {
        console.log(`[${moment().format()}] [main] ${message}`)
    },

    async checkDownloadStatuses(records) {
        records.filter(x => (x.status == "Started" || x.status == "Downloading")).forEach(async (record) => {
            let status = await this.pydownload.getStatus(record.downloadId);
            let newStatus = "";
            if (status == "Deleted") {
                newStatus = "Deleted";
            } else if (status == "seeding" || status == "seed pending" || status == "stopped") {
                newStatus = "Complete";
            } else {
                newStatus = "Downloading";
            }

            if (newStatus != record.status) {
                record.status = newStatus;
                await this.database.updateRecord(record);
            }
        });
    }
}

module.exports = scheduler;