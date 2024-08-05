export interface ISessionStats {
    activeTorrentcount: number;
    downloadSpeed: number;
    pausedTorrentcount: number;
    torrentcount: number;
    uploadSpeed: number;
    cumulative: ISessionStatsObject;
    current: ISessionStatsObject;
}

export interface ISessionStatsObject {
    uploadedBytes: number;
    downlaodedBytes: number;
    filesAdded: number;
    sessionCount: number;
    secondsActive: number;
}