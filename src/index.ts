import { Logger } from './utils/logger';
import { CheckDownloadStatusSchedule, DatabaseReloadSchedule, IpCheckSchedule} from './environment';
import { Notion } from './databases/notion';
import { Cron } from './utils/cron';
import { Scheduler } from './scheduler';
import { Transmission } from './transmission/transmission';

Logger.info("Starting docker manager");

let notion = new Notion();
let transmission = new Transmission();
let scheduler = new Scheduler(notion, transmission);
let crons: Cron[] = [];

init();

async function init() {
    await transmission.validateConnection();

    while (!transmission.isConnectionValid()) {
        Logger.info("Waiting for valid connection");
        await delay(5000);
        await transmission.validateConnection();
    }
    
    await scheduler.getDatabaseRecords();

    new Cron(IpCheckSchedule, async() => {
        await transmission.validateConnection();
    });
    
    new Cron(DatabaseReloadSchedule, async() => {
        await scheduler.getDatabaseRecords();
    });
    
    new Cron(CheckDownloadStatusSchedule, async() => {
        await scheduler.checkDownloadStatuses();
    })
}

function delay(ms: number) {
    return new Promise( resolve => setTimeout(resolve, ms) );
}