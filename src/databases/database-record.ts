import moment from "moment";
import { Cron, Weekdays } from "../utils/cron";
import { RecordState, RecordStates } from "./record-state";

export class DatabaseRecord {

    databaseRecordId: string;
    name: string;
    status: string;
    updated: Date;
    folder: string;
    path: string;
    search: string;
    site: string;
    daysOfWeek: string[] = [];
    regex: string;
    url: string;
    downloadId: string;
    fullPath: string;
    properties: Record<string, any>;
    cronTasks: Cron[] = [];

    constructor(databaseRecordId: string, name: string, status: string, updated: Date, folder: string, path: string, search: string, site: string, daysOfWeek: string[], regex: string, url: string, downloadId: string, fullPath: string, properties: Record<string, any>) {
        this.databaseRecordId = databaseRecordId;
        this.name = name;
        this.status = this.getConvertedStatus(status);
        this.updated = updated;
        this.folder = folder;
        this.path = path;
        this.search = search;
        this.site = site;
        this.daysOfWeek = daysOfWeek;
        this.regex = regex;
        this.url = url;
        this.downloadId = downloadId;
        this.fullPath = fullPath;
        this.properties = properties;
    }

    isDifferentFrom(other: DatabaseRecord): boolean {
        return this.path != other.path
            || this.folder != other.folder
            || this.search != other.search
            || this.site != other.site
            || this.regex != other.regex
            || this.url != other.url
            || this.daysOfWeek.length != other.daysOfWeek.length
            || this.daysOfWeek.sort().join(',') !== other.daysOfWeek.sort().join(',');
    }

    isValid(): boolean {
        if (this.folder && this.path && this.name && (this.isValidSchedule() || this.isValidUrlDownload())) {
            return true;
        } else {
            return false;
        }
    }

    isValidSchedule(): boolean {
        if (this.daysOfWeek.length > 0 && this.site && this.search)
            return true;
        else
            return false;
    }

    isValidUrlDownload(): boolean {
        if (this.url && (this.url.toLocaleLowerCase().startsWith("magnet:?") || this.url.toLocaleLowerCase().endsWith(".torrent"))) {
            return true;
        } else {
            return false;
        }
    }

    stopCronJobs(): void {
        this.cronTasks.forEach(x => {
            x.stop();
        });
        this.cronTasks = [];
    }

    private getConvertedStatus(status: string): string {
        if (status.startsWith(RecordState.Downloading)) {
            return RecordState.Downloading;
        } else if (RecordStates.includes(status)) {
            return status;
        } else {
            return RecordState.New;
        }
    }

    canDownload(hasChanged: boolean = true): boolean {
        let status = this.getConvertedStatus(this.status);

        if (this.isValidUrlDownload()) {
            if (status == RecordState.Complete) {
                return false;
            }
            return status == RecordState.New || status == RecordState.Invalid || status == RecordState.NotFound || status == RecordState.Failed || hasChanged;
        } else if (this.isValidSchedule()) {
            if (status == RecordState.New || status == RecordState.Invalid || status == RecordState.NotFound || status == RecordState.Deleted || status == RecordState.Failed) {
                return true;
            } else if (status == RecordState.Downloading || status == RecordState.Started) {
                return false;
            } else if (status == RecordState.Complete) {
                let updatedMoment = moment(this.updated);
                let cutOffMoment = moment().subtract(8, 'hours');
                if (updatedMoment > cutOffMoment) {
                    return false;
                }
                
                var prevDateString = this.updated.toDateString();
                var currDateString = new Date().toDateString();
                return prevDateString !== currDateString;
            }
            return true;
        } else {
            return false;
        }
    }

    isDownloading(): boolean {
        let status = this.getConvertedStatus(this.status);
        return status == RecordState.Downloading || status == RecordState.Started;
    }

    matchesToday(): boolean {
        if (this.url) {
            return false;
        }
        return this.daysOfWeek.includes(Weekdays[new Date().getDay()]);
    }
}