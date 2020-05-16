"use strict";

const logger = require("../utils/logger").logger;

module.exports.Exception = function(status, code, description, extStack) {
    this.status = status;
    this.code = code;
    this.description = description;
    this.extStack = extStack;

    if (status === 500)
        logger.error(code + " - " + description + "\n" + (extStack || "") + "\n" + new Error().stack);
    else
        logger.warn(code + " - " + description);

    this.send = function(response) {
        response.writeHead(status, { 'Content-Type': 'application/json' });
        response.write(JSON.stringify(this));
        response.send();
    };
};