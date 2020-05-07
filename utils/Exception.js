"use strict";

const logger = require("../utils/logger").logger;

module.exports.Exception = function(status, code, description) {
    this.status = status;
    this.code = code;
    this.description = description;
    this.send = function(response) {
        if (status === 500)
            logger.error(code + " - " + description);
        else
            logger.info(code + " - " + description);
        response.writeHead(status, { 'Content-Type': 'application/json' });
        response.write(JSON.stringify(this));
        response.send();
    };
};