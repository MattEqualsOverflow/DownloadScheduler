const express = require("express");
const axios = require('axios');
const app = express();
app.listen(4010, () => {
    console.log("Server running on port 4010");
    app.get("/", (req, res, next) => {
        axios.get('https://api.ipify.org/?format=json').then((response) => {
            res.set('Content-Type', 'text/plain');
            res.send(response.data.ip);
        }).catch((reason) => {
            res.set('Content-Type', 'text/plain');
            res.send("Error: " + reason.message);
        });
        
    });
});