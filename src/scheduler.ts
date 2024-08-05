import { ConvertDaysToCron, Cron } from "./utils/cron";
import { Logger } from './utils/logger';
import { Transmission } from "./transmission/transmission";
import { DatabaseRecord } from "./databases/database-record";
import { IDatabase } from "./databases/database";
import { IScraper } from "./scrapers/scraper";
import { ScraperNyaa } from "./scrapers/nyaa";
import { Scraper1337x } from "./scrapers/1337x";
import { RecordState } from "./databases/record-state";
import moment from "moment";
import { CleanupDays } from "./environment";

export class Scheduler {
    private database: IDatabase;
    private transmission: Transmission;
    private records: DatabaseRecord[] = [];
    private scrapers: Map<string, IScraper> = new Map<string, IScraper>();
    private skippedRecords = new Map<string, string>()

    constructor(
        database: IDatabase,
        transmission: Transmission
    ) {
        this.database = database;
        this.transmission = transmission;
        this.scrapers.set("nyaa", new ScraperNyaa());
        this.scrapers.set("1337x", new Scraper1337x());
    }

    async getNotionRecords() {

        if (!this.transmission.isConnectionValid()) {
            return;
        }

        let records = await this.database.getRecords();
        let previousRecords = this.records;

        if (!records) {
            return;
        }

        records.forEach(record => {

            let previousRecord = previousRecords.find(x => x.databaseRecordId == record.databaseRecordId);
            let hasChanged = previousRecord !== undefined && record.isDifferentFrom(previousRecord);

            // If this is a single download which has changed, previously failed, or is new
            if (record.url && record.canDownload(hasChanged)) {
                let previousStatus = record.status;
                if (hasChanged && (previousStatus == RecordState.Started || previousStatus == RecordState.Downloading)) {
                    this.removeDownload(record, true);
                }
                this.startDownload(record, record.url, record.fullPath)
            } else if (record.daysOfWeek.length > 0) {
                if (previousRecord) {
                    if (hasChanged) {
                        this.stopScheduledJob(previousRecord);
                        this.startScheduledJob(record);
                    } else {
                        record.cronTasks = previousRecord.cronTasks;
                    }
                } else {
                    this.startScheduledJob(record);
                }
            }
        });

        previousRecords.forEach(record => {
            if (record.daysOfWeek.length > 0 && records.filter(x => x.databaseRecordId == record.databaseRecordId).length == 0) {
                this.stopScheduledJob(record);
            }
        });

        this.records = records;
    }

    async checkDownloadStatuses() {

        if (!this.transmission.isConnectionValid()) {
            return;
        }

        let torrents = await this.transmission.getTorrents();
        if (torrents == undefined) {
            return;
        }

        let hashes: string[] = [];

        torrents.forEach(async (torrent) => {
            let record = this.records.find(x => x.downloadId == torrent.hashString);
            let percentDone = Math.round((torrent.percentDone ?? 0) * 100);

            if (torrent.hashString) {
                hashes.push(torrent.hashString);
            }

            // If we found a record and it wasn't previously marked as complete
            if (record && (record.status != RecordState.Complete || percentDone < 100)) { 
                record.status = percentDone >= 100 ? RecordState.Complete : `${RecordState.Downloading} (${percentDone}%)`;

                if (percentDone >= 100) {
                    this.logRecord(record, "Download complete");
                } else {
                    this.logRecord(record, `Download currently ${percentDone}% complete`);
                }

                await this.database.updateRecord(record);
            // Else delete the torrent if it's old
            } else if(percentDone >= 100 && torrent.done && torrent.hashString) {
                let doneMoment = moment(torrent.done);
                let cutOffMoment = moment().subtract(CleanupDays, 'days');

                if (doneMoment > cutOffMoment) {
                    return;
                }
                
                await this.transmission.removeTorrent(torrent.hashString, false);
                if (record) {
                    record.status = RecordState.Deleted;
                    this.logRecord(record, "Removed old torrent");
                    await this.database.updateRecord(record);
                } else {
                    Logger.info(`Removed old orphaned torrent ${torrent.hashString}`);
                }
            }
        });

        this.records.forEach(async (record) => {
            let skipStatuses = [ RecordState.Deleted, RecordState.NotFound, RecordState.Failed, RecordState.Invalid ];
            if (!skipStatuses.includes(record.status) && record.downloadId && !hashes.includes(record.downloadId)) {
                record.status = RecordState.Deleted;
                this.logRecord(record, "Download deleted");
                await this.database.updateRecord(record);
            }
        });
    }

    private async startScheduledJob(record: DatabaseRecord) {

        let scraper = this.scrapers.get(record.site.toLowerCase());
        if (!scraper) {
            this.logRecordError(record, `Invalid site: ${record.site}`);
            return;
        }

        const databaseRecordId = record.databaseRecordId;

        let crons = ConvertDaysToCron(record.daysOfWeek);

        if (crons == undefined) {
            this.logRecordError(record, `Invalid days of week: ${record.daysOfWeek}`)
            return;
        }

        crons.forEach(cronSchedule => {
            record.cronTasks.push(new Cron(cronSchedule, async () => {
                await this.downloadScheduledRecordById(databaseRecordId);
            }));
    
            this.logRecord(record, `Created scheduled task of ${cronSchedule}`);
        });

        if (record.matchesToday()) {
            await this.downloadScheduledRecord(record);
        }
        
    }

    private stopScheduledJob(record: DatabaseRecord) {
        if (record.cronTasks.length == 0) {
            this.logRecord(record, "Cannot stop previous scheduled task");
            return;
        }

        record.stopCronJobs();
        
        this.logRecord(record, "Stopped previous scheduled task");
    }

    private async downloadScheduledRecord(record: DatabaseRecord) {

        if (!this.transmission.isConnectionValid()) {
            this.logRecord(record, "Connection invalid");
            return;
        }

        try {

            // Check if it's already been downloaded today
            if (!record.canDownload()) {
                let previousSkipTime = this.skippedRecords.get(record.databaseRecordId);
                let skipTime = record.updated.toDateString() + " " + record.updated.toTimeString();
                if (previousSkipTime != skipTime && !record.isDownloading()) {
                    this.logRecord(record, `Skipping on account of status/date: ${record.status} | ${skipTime}`);
                    this.skippedRecords.set(record.databaseRecordId, skipTime);
                }
                return;
            }

            let scraper = this.scrapers.get(record.site.toLowerCase());
            if (!scraper) {
                return;
            }

            this.logRecord(record, `Searching ${record.site} for torrent '${record.search}': ${record.status} | ${record.updated}`);

            let searchResult = await scraper.search(record.search, record.regex);

            if (!searchResult || !searchResult.link) {
                record.status = RecordState.NotFound;
                await this.database.updateRecord(record);
                this.logRecord(record, "No search results found");
                return;
            }

            this.logRecord(record, `Download '${searchResult.name}' found with a time of ${searchResult.time}`);
            await this.startDownload(record, searchResult.link, record.fullPath)
        } catch (e: any) {
            this.logRecordError(record, `Unable to download: ${e.message}`);
        }

    }
    
    private async downloadScheduledRecordById(databaseRecordId: string) {

        let matchingRecords = this.records.filter(x => x.databaseRecordId == databaseRecordId);
        if (!matchingRecords || !matchingRecords[0]) {
            Logger.error(`No record could be found for database record id ${databaseRecordId}`);
            return;
        }
        this.downloadScheduledRecord(matchingRecords[0]);
    }


    private async startDownload(record: DatabaseRecord, url: string, path: string): Promise<string | undefined> {
        let startTorrent = await this.transmission.startTorrent(url, path);

        if (startTorrent?.hashString) {
            record.status = RecordState.Started;
            record.downloadId = startTorrent.hashString;
            this.logRecord(record, `Downloading torrent ${this.getTrimmedUrl(url)} to ${path} started`);
        } else {
            record.status = RecordState.Failed;
            this.logRecordError(record, `Downloading torrent ${this.getTrimmedUrl(url)} to ${path} failed`);
        }

        await this.database.updateRecord(record);
        return startTorrent?.hashString;
    }

    private async removeDownload(record: DatabaseRecord, deleteLocalData: boolean): Promise<string | undefined> {

        if (!record.downloadId) {
            return;
        }
        
        if (await this.transmission.removeTorrent(record.downloadId, deleteLocalData)) {
            this.logRecord(record, "Deleted torrent" + (deleteLocalData ? " and data" : ""));
        } else {
            this.logRecord(record, "Unable to delete torrent");
        }
    }

    private logRecord(record: DatabaseRecord, message: string) {
        if (record.name) {
            Logger.info(`${record.name} | ${message}`);
        } else {
            Logger.info(`${record.databaseRecordId} | ${message}`);
        }
    }

    private logRecordError(record: DatabaseRecord, message: string) {
        if (record.name) {
            Logger.error(`${record.name} | ${message}`);
        } else {
            Logger.error(`${record.databaseRecordId} | ${message}`);
        }
    }

    private getTrimmedUrl(url: string): string {
        if (url.length > 50) {
            return url.substring(0, 47) + "...";
        } else {
            return url;
        }
    }
}