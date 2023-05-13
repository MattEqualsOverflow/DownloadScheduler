var exec = require('./exec.js')
var moment = require('moment');

let docker = {
    container: "",
    defaultContainer: "",

    init(settings) {
        this.defaultContainer = settings.DockerBase;
    },

    async getDockerList(callback) {
        var results = [];
        var first = true;
        var nameIndex = 0;
        var statusIndex = 0;
        var portsIndex = 0;
        let response = await exec("docker container ls");
        response.split('\n').forEach(element => {
            if (first) {
                nameIndex = element.indexOf("NAME");
                statusIndex = element.indexOf("STATUS");
                portsIndex = element.indexOf("PORTS");
                first = false;
            } else {
                let name = element.substring(nameIndex).trim();
                let status = element.substring(statusIndex, portsIndex).trim();
                if (name != '') {
                    results.push({
                        name: name,
                        status: status
                    });
                }
            }
        });
        return results;
    },

    async selectContainer(baseName) {
        if (!baseName) {
            baseName = this.defaultContainer;
        }
        let containers = await this.getDockerList();
        let containerInfo = containers.find(x => x.name.startsWith(baseName));

        if (!containerInfo ) {
            this.log(`Container ${baseName} not found`);
            this.container = false;
            return false;
        } else if (!containerInfo.status.includes("(healthy)")) {
            this.log(`Container ${containerInfo.name} status is invalid: ${containerInfo.status}`);
            this.container = false;
            return false;
        }
        this.log(`Container ${containerInfo.name} found and in healthy status`);
        this.container = containerInfo.name;
        return true;
    },

    async getUrlContents(url) {
        if (!this.container) {
            this.log("No valid container");
            return false;
        }
        return exec("docker exec " + this.container + " /bin/bash -c \"curl -s " + url + "\"")
    },

    async getCurrentIp() {
        return this.getUrlContents("https://api.my-ip.io/ip.txt");
    },

    log(message) {
        console.log(`[${moment().format()}] [docker] ${message}`)
    },
}

module.exports = docker;
