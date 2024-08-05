import { DownloadCronPrefix } from "../environment";

var cron = require('node-cron');

const Weekdays  = ["SUN","MON","TUE","WED","THU","FRI","SAT"];
export  { Weekdays };

export class Cron {

    task: any;

    constructor(schedule: string, callback: () => void, autoStart: boolean = true) {

        this.task = cron.schedule(schedule, callback, { scheduled: autoStart });
    }

    start() {
        this.task.start();
    }

    stop() {
        this.task.stop();
    }
}

export class CronTest {
    validate(cronSchedule: string): boolean {
        return cron.validate(cronSchedule);
    }
}

export function ConvertDaysToCron(days: string[]): string[] | undefined {

    let hasValidDays = true;
    days.forEach(day => {
        if (!Weekdays.includes(day)) {
            hasValidDays = false;
        }
    });

    if (!hasValidDays) { 
        return undefined;
    }

    return days.map(x => `${DownloadCronPrefix} ${x}`);
}