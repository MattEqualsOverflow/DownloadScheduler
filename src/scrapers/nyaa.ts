import { IScraper } from "./scraper";
import * as cheerio from 'cheerio';
import moment from 'moment';
import axios from 'axios';
import { UrlNyaa } from "../environment";
import { Logger } from "../utils/logger";
import { ISearchResult } from "./search-result";

export class ScraperNyaa implements IScraper {

    async search(searchTerm: string, regex: string): Promise<ISearchResult | null> {
        let regexObj = regex ? new RegExp(regex) : null;
        let url = UrlNyaa + encodeURIComponent(searchTerm);
        let content = await axios.get(url).then(r => {
            return r.data as string;
        }).catch(e => {
            Logger.error(`Could not get search results from nyaa: ${e.message}`);
            return "";
        });

        if (!content) {
            return null;
        }

        const document = cheerio.load(content);
        var rows = document("tbody tr");
        for (let i = 0; i < rows.length; i++) {
            let url = this.validateRow(rows[i], regexObj);
            if (url) {
                return url;
            }
        }
        return null;
    }

    private validateRow(row: cheerio.Element, regex: RegExp | null): ISearchResult | null {
        if (row.childNodes.filter((x: any) => x.name == 'th').length > 0) {
            return null;
        };

        if (regex) {
            let rowHtml = cheerio.load(row).html()
            if (!regex.test(rowHtml)) {
                return null;
            }
        }

        let data = row.childNodes.filter((x: any) => x.name == 'td').map((x: any) => x.children);
        let link = data[2][3].attribs.href as string;
        let time = data[4][0].data as string;
        let name = data[1].filter((x: any) => x.name == 'a' && !x.attribs.href.endsWith("#comments"))[0].children[0].data.trim() as string;
        
        if (!this.validateDate(time)) {
            return null;
        }

        return {
            link: link,
            name: name,
            time: time
        };
    }

    private validateDate(uploadDate: string) {
        var todayString = moment().format('yyyy-MM-DD');
        var yesterdayString = moment().subtract(1, 'days').format('yyyy-MM-DD');
        var tomorrowString = moment().add(1, 'days').format('yyyy-MM-DD');
        return uploadDate.startsWith(todayString) || uploadDate.startsWith(yesterdayString) || uploadDate.startsWith(tomorrowString);
    }

}