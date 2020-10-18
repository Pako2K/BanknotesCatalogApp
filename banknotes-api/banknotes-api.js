"use strict";

const fs = require('fs');

const log = require("../utils/logger").logger;

const users = require("./services/Users");
const territories = require("./services/Territories");
const currencies = require("./services/Currencies");
const series = require("./services/Series");
const banknotes = require("./services/Banknotes");
const variants = require("./services/Variants");
const items = require("./services/Items");
const misc = require("./services/Miscellanea");

const JsonValidator = require('jsonschema').Validator;

module.exports.initialize = function(app, usersOAS, banknotesOAS) {
    // Remove '#' from references
    let usersOASStr = JSON.stringify(usersOAS);
    usersOAS = JSON.parse(usersOASStr.replace(/\$ref":"#/g, '$ref":"'));

    let banknotesOASStr = JSON.stringify(banknotesOAS);
    banknotesOAS = JSON.parse(banknotesOASStr.replace(/\$ref":"#/g, '$ref":"'));

    // Load all the schemas into the Validators
    const usersValidator = new JsonValidator();
    for (let schemaName of Object.keys(usersOAS["components"]["schemas"]))
        usersValidator.addSchema(usersOAS["components"]["schemas"][schemaName], "/components/schemas/" + schemaName);

    const banknotesValidator = new JsonValidator();
    for (let schemaName of Object.keys(banknotesOAS["components"]["schemas"]))
        banknotesValidator.addSchema(banknotesOAS["components"]["schemas"][schemaName], "/components/schemas/" + schemaName);

    users.initialize(app, usersOAS, usersValidator);
    territories.initialize(app);
    currencies.initialize(app);
    series.initialize(app, banknotesOAS, banknotesValidator);
    banknotes.initialize(app, banknotesOAS, banknotesValidator);
    variants.initialize(app, banknotesOAS, banknotesValidator);
    items.initialize(app);
    misc.initialize(app);

    log.debug(`API Services initialized`);
}