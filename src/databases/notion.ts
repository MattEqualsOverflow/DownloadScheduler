import { Client } from "@notionhq/client";
import { NotionDatabase, NotionToken, DownloadPathPrefix } from "../environment";
import { Logger } from "../utils/logger";
import { PageObjectResponse } from "@notionhq/client/build/src/api-endpoints";
import { parse } from 'yaml'
import * as fs from 'fs';
import { DatabaseRecord } from "./database-record";
import { IDatabase } from "./database";
import { ConvertDaysToCron } from "../utils/cron";
import { prop } from "cheerio/lib/api/attributes";
import { RecordState } from "./record-state";

export class Notion implements IDatabase {

    private client: Client;
    private paths: Map<string, string> = new Map<string, string>();
    private downloadPathPrefix = "";

    constructor() {
        this.client = new Client({
            auth: NotionToken,
        });

        let yamlText = fs.readFileSync("./paths.yml", 'utf8');
        let yamlValue = parse(yamlText).Paths as any[];

        yamlValue.forEach((x: any) => {
            Object.keys(x).forEach(name => {
                this.paths.set(name, x[name] as string);
            });
        });

        if (DownloadPathPrefix) {
            this.downloadPathPrefix = DownloadPathPrefix;
            if (!this.downloadPathPrefix.endsWith("/")) {
                this.downloadPathPrefix += "/";
            }
        }
    }

    async getRecords() : Promise<DatabaseRecord[]> {
        try {
            const myPage = await this.client.databases.query({
                database_id: NotionDatabase ?? ""
            });

            let results: DatabaseRecord[] = [];

            myPage.results.forEach(async (element) => {
                let page = element as PageObjectResponse;

                let name = this.getStringProperty(page.properties.Name) ?? "";
                let status = this.getStringProperty(page.properties.Status) ?? "";
                let updated = this.getDateProperty(page.properties.Updated) ?? new Date();
                let folder = this.getStringProperty(page.properties.Folder) ?? "";
                let path = this.getStringProperty(page.properties.Path) ?? "";
                let search = this.getStringProperty(page.properties.Search) ?? "";
                let site = this.getStringProperty(page.properties.Site) ?? "";
                let daysOfWeek = this.getStringArrayProperty(page.properties.DayOfWeek) ?? [];
                let regex = this.getStringProperty(page.properties.Regex) ?? "";
                let url = this.getStringProperty(page.properties.Url) ?? "";
                let downloadId = this.getStringProperty(page.properties.DownloadId) ?? "";
                let databaseRecordId = page.id;
                let properties = page.properties;

                let fullPath = this.downloadPathPrefix;
                fullPath += this.paths.get(folder ?? "") ? this.paths.get(folder ?? "") + "/" + path : folder + "/" + path;
                fullPath = fullPath.replace("\\", "/").replace("//" ,"/");
                if (!fullPath.endsWith("/")) {
                    fullPath += "/";
                }

                if (daysOfWeek?.length > 0 && ConvertDaysToCron(daysOfWeek) == undefined) {
                    Logger.error(`Invalid days of the week: ${daysOfWeek}`);
                    return;
                } 

                let record = new DatabaseRecord(databaseRecordId, name, status, updated, folder, path, search, site, daysOfWeek, regex, url, downloadId, fullPath, properties);

                if (record.isValid()) {
                    if (record.status == RecordState.Invalid) {
                        record.status = RecordState.New;
                    }
                    results.push(record);
                } else {
                    Logger.warn(`Record ${databaseRecordId} (${name ?? "<empty name>"}) is invalid`);
                    record.status = RecordState.Invalid;
                    await this.updateRecord(record);
                }
            });

            return results;

        } catch (error: any) {
            Logger.error(`Unable to retrieve records from notion: ${error.message}`);
            return [];
        }
        
    }

    async updateRecord(record: DatabaseRecord): Promise<boolean> {
        let properties = record.properties;

        var moment = require('moment');

        properties.Updated = {
            type: "date",
            date: {
                start: moment().format()
            }
        }

        properties.Status = {
            type: "rich_text",
            rich_text: [{
                type: "text",
                text: {
                    content: record.status
                }
            }]
        }

        properties.DownloadId = {
            type: "rich_text",
            rich_text: [{
                type: "text",
                text: {
                    content: record.downloadId
                }
            }]
        }

        try {
            await this.client.pages.update({
                page_id: record.databaseRecordId,
                properties: properties
            });
            return true;
        } catch (e: any) {
            Logger.error(`Failed to update record: ${e.message}`)
            return false;
        }
        
    }

    getStringProperty(property: any): string | null {
        if (property.type == 'rich_text') {
            if (property.rich_text) {
                return property.rich_text.map((x: any) => x.plain_text).join("").trim() as string;
            }
        } else if (property.type == 'title') {
            if (property.title) {
                return property.title.map((x: any) => x.plain_text).join("").trim() as string;
            }
        } else if (property.type == 'select') {
            if (property.select) {
                return property.select.name as string;
            }
        } else if (property.type == 'url') {
            if (property.url) {
                return property.url as string;
            }
        } else {
            Logger.error(`Unbound string property type ${property.type}`);
        }
        return null;
    }

    getDateProperty(property: any): Date | null {
        if (property.type == 'date') {
            if (property?.date?.start) {
                return new Date(Date.parse(property.date.start));
            } else {
                return new Date();
            }
        } else {
            Logger.error(`Unbound date property type ${property.type}`);
        }
        return null;
    }


    getStringArrayProperty(property: any): string[] | null {
        if (property.type == 'multi_select') {
            return property?.multi_select?.map((x: any) => x.name.toUpperCase() as string);
        }
        return null;
    }

}