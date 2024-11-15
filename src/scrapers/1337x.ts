import axios from "axios";
import { Url1337X } from "../environment";
import { IScraper } from "./scraper";
import { Logger } from "../utils/logger";
import * as cheerio from 'cheerio';
import moment from "moment";
import { ISearchResult } from "./search-result";

export class Scraper1337x implements IScraper {

    public async search(searchTerm: string, regex: string): Promise<ISearchResult | null> {
        let regexObj = regex ? new RegExp(regex) : null;        
        let url = this.getSearchUrl(searchTerm);

        Logger.info(`Searching ${url}`);

        let content = await axios.get(url).then(r => {
            return r.data as string;
        }).catch(e => {
            Logger.error(`Could not get search results from 1337X url ${url}: ${e.message}`);
            return "";
        });

        if (!content) {
            return null;
        }

        const document = cheerio.load(content);
        var rows = document("tr");
        for (let i = 0; i < rows.length; i++) {
            let secondaryPageInfo = this.validateRow(rows[i], regexObj);
            if (secondaryPageInfo) {
                let magnetUrl = await this.getMagnetUrl(secondaryPageInfo.link);
                if (magnetUrl) {
                    return {
                        link: magnetUrl,
                        name: secondaryPageInfo.name,
                        time: secondaryPageInfo.time
                    };
                }
            }
        }

        return null;
    }

    private validateRow(row: cheerio.Element, regex: RegExp | null) {
        if (row.childNodes.filter((x: any) => x.name == 'th').length > 0) {
            return false;
        };

        if (regex) {
            let rowHtml = cheerio.load(row).html()
            if (!regex.test(rowHtml)) {
                return false;
            }
        }

        let data = row.childNodes.filter((x: any) => x.name == 'td').map((x: any) => x.children);
        let link = this.getRelativeUrl(data[0][1].attribs.href);
        let time = data[3][0].data;

        Logger.info(`Checking ${link} ${time}`);

        if (!this.validateDate(time)) {
            return false;
        }

        return {
            link: link,
            name: data[0][1].children[0].data.trim(),
            time: time
        };
    }

    private async getMagnetUrl(url: string) {
        var content = await axios.get(url).then(r => {
            return r.data as string;
        }).catch(e => {
            Logger.error(`Could not get secondary 1337x page ${url}: ${e.message}`);
            return "";
        });
        const document = cheerio.load(content);
        if (!document) {
            Logger.error(`Could not get secondary page from 1337X`);
            return false;
        }
        var links = document("a")
        for (let i = 0; i < links.length; i++) {
            if (links[i].attribs && links[i].attribs.href && links[i].attribs.href.startsWith("magnet:?")) {
                return links[i].attribs.href;
            }
        }
        Logger.error(`Could not find magnet url`);
        return false;
    }

    private validateDate(uploadDate: string): boolean {
        var dateString = moment().subtract(1, 'days').format('MMM. DD');
        if (dateString.endsWith(" 1")) {
            dateString += "st"
        } else if (dateString.endsWith(" 2")) {
            dateString += "nd"
        } else if (dateString.endsWith(" 3")) {
            dateString += "rd"
        }
        let a = uploadDate.includes(dateString);
        let b = uploadDate.endsWith("am");
        let c = uploadDate.endsWith("pm");
        return uploadDate.includes(dateString) || uploadDate.includes("am") || uploadDate.includes("pm");
    }

    private getSearchUrl(searchTerm: string) {
        return Url1337X.replace("%search%", encodeURIComponent(searchTerm));
    }

    private getRelativeUrl(relativeUrl: string): string {
        return Url1337X.substring(0, Url1337X.indexOf("/sort-search")) + relativeUrl;
    }

}