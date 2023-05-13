const cheerio = require('cheerio');
const moment = require('moment');
const axios = require('axios')

let scraper_nyaa = {
    docker: undefined,
    searchUrl: "",

    init(settings, docker) {
        this.docker = docker;
        this.searchUrl = settings.UrlNyaa;
    },

    async searchDownload(searchTerm, regex) {
        let regexObj = regex ? new RegExp(regex) : false;
        var url = this.searchUrl + encodeURIComponent(searchTerm);
        var content = (await axios.get(url)).data;
        if (!content) {
            return false;
        }
        const document = cheerio.load(content);
        var rows = document("tbody tr");
        for (let i = 0; i < rows.length; i++) {
            let url = this.validateRow(rows[i], regexObj);
            if (url) {
                return url;
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
        let data = row.childNodes.filter(x => x.name == 'td').map(x => x.children);
        let link = data[2][3].attribs.href
        let time = data[4][0].data;
        let name = data[1][1].children[0].data;

        if (!this.validateDate(time)) {
            return false;
        }

        return {
            link: link,
            name: name,
            time: time
        };
    },

    validateDate(uploadDate) {
        var todayString = moment().format('yyyy-MM-DD');
        var yesterdayString = moment().subtract(1, 'days').format('yyyy-MM-DD');
        var tomorrowString = moment().add(1, 'days').format('yyyy-MM-DD');
        return uploadDate.startsWith(todayString) || uploadDate.startsWith(yesterdayString) || uploadDate.startsWith(tomorrowString);
    }


}

module.exports = scraper_nyaa;