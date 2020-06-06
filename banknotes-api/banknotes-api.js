"use strict";

const log = require("../utils/logger").logger;

const users = require("./services/Users");
const territories = require("./services/Territories");
const currencies = require("./services/Currencies");
const series = require("./services/Series");
const banknotes = require("./services/Banknotes");
const variants = require("./services/Variants");
const items = require("./services/Items");
const misc = require("./services/Miscellanea");

module.exports.initialize = function(app) {
    users.initialize(app);
    territories.initialize(app);
    currencies.initialize(app);
    series.initialize(app);
    banknotes.initialize(app);
    variants.initialize(app);
    items.initialize(app);
    misc.initialize(app);
    log.debug(`API Services initialized`);
}