import { ITorrentStatus } from "./transmission";

export class TorrentStatus implements ITorrentStatus {

    public id?: number;
    public name?: string;
    public percentDone?: number;
    public dateCreated?: number;
    public doneDate?: number;
    public downloadDir?: string;
    public addedDate?: number;
    public rateDownload?: number;
    public rateUpload?: number
    public uploadRatio?: number;
    public files?: any[];
    public hashString?: string;
    public activityDate?: number;
    public totalSize?: number;
    public downloadedEver?: number;
    public uploadedEver?: number;
    public added?: Date;
    public created?: Date;
    public activity?: Date;
    public done?: Date;

    constructor(params: ITorrentStatus) {
        this.id = params.id;
        this.name = params.name;
        this.addedDate = params.addedDate;
        this.percentDone = params.percentDone;
        this.dateCreated = params.dateCreated;
        this.doneDate = params.doneDate;
        this.downloadDir = params.downloadDir;
        this.rateDownload = params.rateDownload;
        this.rateUpload = params.rateUpload;
        this.uploadRatio = params.uploadRatio;
        this.files = params.files;
        this.hashString = params.hashString;
        this.activityDate = params.activityDate;
        this.totalSize = params.totalSize;
        this.downloadedEver = params.downloadedEver;
        this.uploadedEver = params.uploadedEver;
        this.added = params.addedDate ? new Date(params.addedDate * 1000) : undefined;
        this.created = params.dateCreated ? new Date(params.dateCreated * 1000) : undefined;
        this.activity = params.activityDate ? new Date(params.activityDate * 1000) : undefined;
        this.done = params.doneDate ? new Date(params.doneDate * 1000) : undefined;
    }

    public isCompleted(): boolean {
        return !!(this.percentDone && this.percentDone >= 1)
    }
}
