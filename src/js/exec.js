var exec = require('child_process').exec;

let delay = ms => new Promise(resolve => setTimeout(resolve, ms));

let executeCommand = async (command) => {
    let logCommand = command;
    if (logCommand.length > 100) {
        logCommand = logCommand.substring(0, 97) + "...";
    }
    //console.log(command);
    let results = "";
    let hasCompleted = false;
    exec(command, function (error, stdout, stderr) {
        if (error) {
            console.log("Error making command '%s'", command);
            console.log(error);
            results = null;
        }
        else {
            results = stdout.trim();
            hasCompleted = true;
        }
    });

    while (!hasCompleted) {
        await delay(50);
    }

    return results;
    
}

module.exports = executeCommand;