import axios, { RawAxiosRequestHeaders } from 'axios';
import * as fs from 'fs';
import { Logger } from '../utils/logger';
import { TransmissionHost, TransmissionIpApiPort, TransmissionPort } from '../environment';
import { ISessionStats } from './session-stats';
import { TorrentStatus } from './torrent-status';

export interface ITorrentStatus {
    id?: number;
    name?: string;
    percentDone?: number;
    dateCreated?: number;
    doneDate?: number;
    downloadDir?: string;
    addedDate?: number;
    rateDownload?: number;
    rateUpload?: number;
    uploadRatio?: number;
    files?: any[]; // Array<{name: string; length: number; bytesCompleted: number}>;
    hashString?: string;
    activityDate?: number;
    totalSize?: number;
    downloadedEver?: number;
    uploadedEver?: number;
    added?: Date;
    created?: Date;
    activity?: Date;
    done?: Date;
}

export class Transmission {
    public static readonly SessionHeader = 'X-Transmission-Session-Id';
    private sessionToken: string | null = null;
    private lastSessionTime: number = 0;
    private isValid = false;

    private options = {
        host: TransmissionHost,
        path: '/transmission/rpc',
        port: TransmissionPort,
        authUsername: "",
        authPassword: ""
    };
    
    public isConnectionValid(): boolean {
        return this.isValid;
    }

    public async validateConnection(): Promise<void> {

        let transmissionIp = await axios.get(`http://${TransmissionHost}:${TransmissionIpApiPort}/`).then(response => {
            return response.data as string;
        }).catch((e) => {
            Logger.error(`Error getting ip from transmission docker image: ${e.message}`);
        });

        if (!transmissionIp) {
            this.isValid = false;
            return;
        }

        let hostIp = await axios.get("https://api.ipify.org/?format=json").then(response => {
            return response.data.ip as string;
        }).catch((e) => {
            Logger.error(`Error getting docker image status: ${e.message}`);
        });

        if (!hostIp) {
            this.isValid = false;
            return;
        }

        if (hostIp == transmissionIp) {
            Logger.error(`Host ip ${hostIp} matches transmission ip. Proxy does not appear to be working.`);
            this.isValid = false;
            return;
        }

        try {
            var sessionInfo = await this.rpcGetSession();
            if (sessionInfo) {
                this.isValid = true;
            } else {
                this.isValid = false;
            }
        } catch (e) {
            Logger.error("Error reaching out to transmission");
            this.isValid = false;
        }
    };

    private async getToken(): Promise<string | null> {
        if (this.sessionToken && new Date().getTime() - this.lastSessionTime < 3600000) {
            return this.sessionToken;
        }
        try {
            const headers: Partial<RawAxiosRequestHeaders> = {};
            this.addAuthHeader(headers)
            const response = await axios.get(this.requestURL(), { headers });
            return response.headers[Transmission.SessionHeader];
        } catch (err: any) {

            if (err.response?.headers) {
                this.sessionToken = err.response.headers[Transmission.SessionHeader.toLowerCase()];
            }
            
            if (this.sessionToken) {
                Logger.info("Updated transmission session token");
                this.lastSessionTime = new Date().getTime();
                return this.sessionToken;
            } else {
                Logger.error("Unable to get transmission header token");
                return null;
            }
        }
    }

    private async rpcCall<T = any>(method: string, args: any): Promise<T | undefined> {
        const data = {
            arguments: args,
            method,
        };
        const token = await this.getToken();
        if (!token) {
            return undefined;
        }
        const headers: Partial<RawAxiosRequestHeaders> = {};
        headers[Transmission.SessionHeader] = token;
        this.addAuthHeader(headers)
        const response = await axios.post<T>(this.requestURL(), data, {
            headers,
        }).catch(e => {
            Logger.error(`Unable to make rpcCall ${method}`);
            this.sessionToken = null;
            this.lastSessionTime = 0;
            return undefined;
        });
        return response?.data;
    }

    private async rpcGetTorrents(params: any = {}): Promise<TorrentStatus[] | undefined> {
        let result = await this.rpcCall<{ arguments: { torrents: ITorrentStatus[] } }>('torrent-get', {
            fields: [
                'id',
                'name',
                'doneDate',
                'percentDone',
                'dateCreated',
                'downloadDir',
                'addedDate',
                'rateDownload',
                'rateUpload',
                'uploadRatio', // uploadedEver / downloadedEver
                'files',
                'totalSize',
                'downloadedEver',
                'uploadedEver',
                'hashString',
                'activityDate',
            ],
            ...params
        });

        return result?.arguments?.torrents.map(x => new TorrentStatus(x)) ?? undefined;
    }

    private async rpcGetSession(params: any = {}): Promise<ISessionStats | undefined> {
        let result = await this.rpcCall<{ arguments: ISessionStats }>('session-stats', undefined);
        return result?.arguments;
    }

    public async getTorrents(): Promise<TorrentStatus[] | undefined> {
        return await this.rpcGetTorrents();
    }

    public async getTorrentInfo(torrent: number | string): Promise<TorrentStatus[] | undefined> {
        if (typeof (torrent) == "number") {
            return await this.rpcGetTorrents({ ids: torrent })
        } else if (typeof (torrent) == "string") {
            return await this.rpcGetTorrents({ hashString: torrent })
        }
        return [];
    }

    public async getTorrentById(torrent: number | string): Promise<TorrentStatus | undefined> {
        const results = await this.getTorrentInfo(torrent);
        if (results == undefined) {
            return undefined;
        }
        return results.length > 0 ? results[0] : undefined;
    }

    public async startTorrent(
        torrent: string,
        downloadDir?: string
    ): Promise<TorrentStatus | null> {
        let torrentLC = torrent.toLocaleLowerCase();
        if (torrentLC.startsWith("http://") || torrent.startsWith("https://") || torrent.startsWith("magnet:?")) {
            return this.startTorrentByUrl(torrent, downloadDir);
        } else {
            return this.startTorrentByBuffer(fs.readFileSync(torrent), downloadDir);
        }

    }

    private async startTorrentByUrl(
        torrent: string,
        downloadDir?: string
    ): Promise<TorrentStatus | null> {

        let args = {
            filename: torrent,
            'download-dir': downloadDir
        };

        const response = await this.rpcCall<{
            result: string;
            arguments: {
                'torrent-added': {
                    hashString: string;
                    id: number;
                };
                'torrent-duplicate': {
                    hashString: string;
                    id: number;
                }
            };
        }>('torrent-add', args);

        if (!response) {
            return null;
        }

        if (response.result && response.result === 'success') {
            if (response.arguments['torrent-duplicate']) {
                return new TorrentStatus({
                    id: response.arguments['torrent-duplicate'].id,
                    hashString: response.arguments['torrent-duplicate'].hashString
                })
            }
            return new TorrentStatus({
                id: response.arguments['torrent-added'].id,
                hashString: response.arguments['torrent-added'].hashString
            });
        } else {
            return null;
        }
    }

    private async startTorrentByBuffer(
        torrent: Buffer,
        downloadDir?: string
    ): Promise<TorrentStatus | null> {
        const metainfo = torrent.toString('base64');
        let args;
        if (downloadDir) {
            args = {
                'download-dir': downloadDir,
                metainfo,
            };
        } else {
            args = {
                metainfo,
            };
        }

        const response = await this.rpcCall<{
            result: string;
            arguments: {
                'torrent-added': {
                    hashString: string;
                    id: number;
                };
                'torrent-duplicate': {
                    hashString: string;
                    id: number;
                }
            };
        }>('torrent-add', args);

        if (!response) {
            return null;
        }

        if (response.result && response.result === 'success') {
            if (response.arguments['torrent-duplicate']) {
                return new TorrentStatus({
                    id: response.arguments['torrent-duplicate'].id,
                    hashString: response.arguments['torrent-duplicate'].hashString
                });
            }
            return new TorrentStatus({
                id: response.arguments['torrent-added'].id,
                hashString: response.arguments['torrent-added'].hashString
            });
        } else {
            return null;
        }
    }

    public async removeTorrent(
        torrent: number | string,
        deleteLocalData = false
    ): Promise<boolean> {
        if (typeof(torrent) == "number") {
            return this.rpcCall<{ arguments: { }, result: string }>('torrent-remove', {
                'delete-local-data': deleteLocalData,
                ids: [torrent],
            }).then(x => {
                return x?.result == "success"
            }).catch(e => {
                Logger.error(e.Message);
                return false;
            });
        } else if (typeof(torrent) == "string") {
            return this.rpcCall<{ arguments: { }, result: string }>('torrent-remove', {
                'delete-local-data': deleteLocalData,
                hashString: [torrent],
            }).then(x => {
                return x?.result == "success"
            }).catch(e => {
                Logger.error(e.Message);
                return false;
            });
        }
        return false;
    }

    private addAuthHeader(header: Partial<RawAxiosRequestHeaders>) {
        if (this.options.authUsername && this.options.authPassword) {
            header.Authorization = `Basic ${Buffer.from(`${this.options.authUsername}:${this.options.authPassword}`).toString('base64')}`
        }
    }

    private requestURL(): string {
        return `http://${this.options.host}:${this.options.port}${this.options.path}`;
    }
}