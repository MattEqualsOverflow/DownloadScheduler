var exec = require('./exec.js');

let pydownload = {
    pyDirectory:"",
    command: "",

    init(settings) {
        this.command = settings.PythonCommand;
        let path = require('path');
        this.pyDirectory = path.resolve(__dirname, '../py')+path.sep;
    },

    executeFile(file, arguments) {
        let filePath = this.pyDirectory + file;
        let argumentString = arguments.join("\" \"");
        let commandString = this.command.replace("%arguments%", `"${filePath}" "${argumentString}"`);
        return exec(commandString);
    },

    download(url, path) {
        if (!url.startsWith("magnet")) {
            console.log("Invalid download url");
            return false;
        }
        path = path.replace("\\", "/");
        if (!path.startsWith("/data/")) {
            path = "/data/" + path;
        }
        path = path.replace("//", "/");
        return this.executeFile("download_file.py", [url, path]);
    },

    getStatus(id) {
        return this.executeFile("check_file.py", [id])
    }
}

module.exports = pydownload;