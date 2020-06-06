"use strict";

const log = require("../../utils/logger").logger;
const Exception = require('../../utils/Exception').Exception;
const dbs = require('../../db-connections');

let catalogueDB;

module.exports.initialize = function(app) {
    catalogueDB = dbs.getDBConnection('catalogueDB');

    app.get('/grades', gradesGET);

    log.debug("Miscellanea service initialized");
};


// ===> /grades
function gradesGET(request, response) {
    const sql = `   SELECT gra_value as value, gra_grade as grade , gra_name as name, gra_description as description  
                    FROM gra_grade
                    ORDER BY value`;

    catalogueDB.getAndReply(response, sql);
}