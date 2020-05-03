"use strict";

let log4js = require('log4js');
let fs = require('fs');

module.exports.initialize = function(configFile) {
    // Read logging configuration properties from a file
    let logConfig = fs.readFileSync(configFile);
    log4js.configure(JSON.parse(logConfig));
    return log4js.getLogger();
}

module.exports.logger = log4js.getLogger();
module.exports.shutdown = function(callback) { log4js.shutdown(callback); };