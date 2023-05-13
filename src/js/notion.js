const { Client } = require("@notionhq/client")

let notion = {
    client: undefined,
    databaseId: "",

    init(settings) {
        this.client = new Client({
            auth: settings.NotionToken,
        });
        this.databaseId = settings.NotionDatabase
    },

    async getRecords() {
        try {
            const myPage = await this.client.databases.query({
                database_id: this.databaseId
            });

            let results = [];

            myPage.results.forEach(async (element) => {
                let name = this.getPropertyValue(element.properties.Name);
                let status = this.getPropertyValue(element.properties.Status);
                let updated = this.getPropertyValue(element.properties.Updated);
                let path = this.getPropertyValue(element.properties.Path);
                let search = this.getPropertyValue(element.properties.Search);
                let site = this.getPropertyValue(element.properties.Site);
                let cron = this.getPropertyValue(element.properties.Cron);
                let regex = this.getPropertyValue(element.properties.Regex);
                let url = this.getPropertyValue(element.properties.Url);
                let downloadId = this.getPropertyValue(element.properties.Id);
                let updateId = element.id;
                let properties = element.properties;

                if (path && ((cron && site && search) || url)) {
                    results.push({
                        id: updateId,
                        name: name,
                        status: status,
                        updated: updated,
                        path: path,
                        search: search,
                        site: site,
                        cron: cron,
                        regex: regex,
                        url: url,
                        downloadId: downloadId,
                        notionId: updateId,
                        notionProperties: properties
                    });
                }
            });

            return results;
        } catch (error) {
            console.log(error);
        }
        
    },

    async updateRecord(record) {
        let properties = record.notionProperties;

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

        properties.Id = {
            type: "rich_text",
            rich_text: [{
                type: "text",
                text: {
                    content: record.downloadId
                }
            }]
        }

        await this.client.pages.update({
            page_id: record.notionId,
            properties: properties
        });
    },

    getPropertyValue(property) {
        if (property.type == 'rich_text') {
            if (property.rich_text) {
                return property.rich_text.map(x => x.plain_text).join("").trim();
            }
        } else if (property.type == 'title') {
            if (property.title) {
                return property.title.map(x => x.plain_text).join("").trim();
            }
        } else if (property.type == 'select') {
            if (property.select) {
                return property.select.name;
            }
        } else if (property.type == 'date') {
            if (property.date) {
                return property.date.start;
            }
        } else if (property.type == 'url') {
            if (property.url) {
                return property.url;
            }
        } else {
            console.log("unbound type %s", property.type)
        }
        return '';
    }
}

module.exports = notion;