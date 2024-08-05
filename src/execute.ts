import { Logger } from './utils/logger';
import { exec } from 'node:child_process';

export class Execute {

    async command(command: string): Promise<string | null> {

        let logCommand = command;
        if (logCommand.length > 100) {
            logCommand = logCommand.substring(0, 97) + "...";
        }
        Logger.info(`Executing command: ${logCommand}`);

        let results: string | null = "";
        let hasCompleted = false;
        exec(command, function (error, stdout, stderr) {
            if (error) {
                Logger.error(`"Error making command ${command}: ${error.message}`)
                results = null;
            }
            else {
                results = stdout.trim();
                hasCompleted = true;
            }
        });

        while (!hasCompleted) {
            await this.delay(50);
        }
    
        return results;
    }

    delay(ms: number) {
        return new Promise( resolve => setTimeout(resolve, ms) );
    }
}