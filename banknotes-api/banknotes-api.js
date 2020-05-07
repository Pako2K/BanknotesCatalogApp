"use strict";

const log = require("../utils/logger").logger;

const users = require("./services/Users");
const territories = require("./services/Territories");
const currencies = require("./services/Currencies");
const banknotes = require("./services/Banknotes");
const variants = require("./services/Variants");
const items = require("./services/Items");

module.exports.initialize = function(app) {
    users.initialize(app);
    territories.initialize(app);
    currencies.initialize(app);
    banknotes.initialize(app);
    variants.initialize(app);
    items.initialize(app);
    log.debug(`API Services initialized`);
}