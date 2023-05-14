const yaml = require('yaml')
const fs   = require('fs');
const file = fs.readFileSync('./settings.yml', 'utf8');
const pydownload = require('./src/js/pydownload.js');
const docker = require('./src/js/docker.js');
const notion = require('./src/js/notion.js');
const scraper = require('./src/js/scraper.js');
const scheduler = require('./src/js/scheduler.js');

let settings = yaml.parse(file);
docker.init(settings);
pydownload.init(settings);
notion.init(settings);
scraper.init(settings, docker);

async function start() {
    let dockerStarted = await docker.selectContainer();

    if (!dockerStarted) {
        setTimeout(start, 15000);
        return;
    }
    
    await scheduler.start();
}

scheduler.init(settings, docker, notion, scraper, pydownload);
start();