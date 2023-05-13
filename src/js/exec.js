var exec = require('child_process').exec;

let delay = ms => new Promise(resolve => setTimeout(resolve, ms));

let executeCommand = async (command) => {
    let logCommand = command;
    if (logCommand.length > 100) {
        logCommand = logCommand.substring(0, 97) + "...";
    }
    //console.log("Executing command: %s", logCommand);
    let results = "";
    exec(command, function (error, stdout, stderr) {
        if (error) {
            console.log("Error making command '%s'", command);
            console.log(error);
            results = null;
        }
        else {
            results = stdout.trim();
        }
    });

    while (results === "") {
        await delay(50);
    }

    return results;
    
}

module.exports = executeCommand;