const cheerio = require('cheerio');
const moment = require('moment');

let scraper_1337x = {
    docker: undefined,
    searchUrl: "",
    baseUrl: "",

    init(settings, docker) {
        this.docker = docker;
        this.baseUrl = settings.Url1337X;
        this.searchUrl = settings.Url1337X + "/sort-search/%search%/time/desc/1/";
    },

    async searchDownload(searchTerm, regex) {
        let regexObj = regex ? new RegExp(regex) : false;
        var url = this.searchUrl.replace("%search%", encodeURIComponent(searchTerm))

        this.log(url);

        var content = await this.docker.getUrlContents(url);

        //this.log(content);

        if (!content) {
            return false;
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
        return false;
    },

    validateRow(row, regex) {
        if (row.childNodes.filter(x => x.name == 'th').length > 0) {
            return false;
        };
        if (regex !== false) {
            let rowHtml = cheerio.load(row).html()
            if (!regex.test(rowHtml)) {
                return false;
            }
        }

        this.log(row);

        let data = row.childNodes.filter(x => x.name == 'td').map(x => x.children);
        let link = this.baseUrl + data[0][1].attribs.href
        let time = data[3][0].data;

        this.log("Row found with time: " + time);

        if (!this.validateDate(time)) {
            return false;
        }

        return {
            link: link,
            name: data[0][1].children[0].data.trim(),
            time: time
        };
    },

    async getMagnetUrl(url) {
        var content = await this.docker.getUrlContents(url);
        const document = cheerio.load(content);
        if (!document) {
            return false;
        }
        var links = document("a")
        for (let i = 0; i < links.length; i++) {
            if (links[i].attribs && links[i].attribs.href && links[i].attribs.href.startsWith("magnet:?")) {
                return links[i].attribs.href;
            }
        }
        return false;
    },

    validateDate(uploadDate) {
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
        return uploadDate.includes(dateString) || uploadDate.endsWith("am") || uploadDate.endsWith("pm");
    },

    log(message) {
        console.log(`[${moment().format()}] [1337X] ${message}`)
    },


}

module.exports = scraper_1337x;