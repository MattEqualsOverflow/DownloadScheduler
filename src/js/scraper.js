let scraper = {
    docker: undefined,
    scrapers: undefined,

    init(settings, docker) {
        this.docker = docker;

        let scraper_1337x = require('./scrapers/1337x.js');
        scraper_1337x.init(settings, docker);

        let scraper_nyaa = require('./scrapers/nyaa.js');
        scraper_nyaa.init(settings, docker);

        this.scrapers = {
            "1337x": scraper_1337x,
            'nyaa': scraper_nyaa
        }
    },

    async search(site, searchTerm, regex) {
        if (!this.scrapers[site.toLocaleLowerCase()]) {
            console.log("Invalid site type %s", site);
            return false;
        }
        return this.scrapers[site.toLocaleLowerCase()].searchDownload(searchTerm, regex);
    }
}

module.exports = scraper;