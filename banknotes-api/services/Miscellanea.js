"use strict";

const log = require("../../utils/logger").logger;
const Exception = require('../../utils/Exception').Exception;
const dbs = require('../../db-connections');

let catalogueDB;

module.exports.initialize = function(app) {
    catalogueDB = dbs.getDBConnection('catalogueDB');

    app.get('/grades', gradesGET);
    app.get('/issuer', issuerGET);
    app.get('/printer', printerGET);
    app.get('/material', materialGET);

    log.debug("Miscellanea service initialized");
};


// ===> /printer
function printerGET(request, response) {
    const sql = `   SELECT pri_id AS id, pri_name AS name, pri_location AS location, pri_description AS description
	                FROM pri_printer
                    ORDER BY name`;

    catalogueDB.getAndReply(response, sql);
}



// ===> /issuer
function issuerGET(request, response) {
    const sql = `   SELECT iss_id AS id, iss_name AS name, iss_description AS description
	                FROM iss_issuer
                    ORDER BY name`;

    catalogueDB.getAndReply(response, sql);
}



// ===> /material
function materialGET(request, response) {
    const sql = `   SELECT mat_id AS id, mat_name AS name, mat_description AS description
	                FROM mat_material
                    ORDER BY name`;

    catalogueDB.getAndReply(response, sql);
}



// ===> /grades
function gradesGET(request, response) {
    const sql = `   SELECT gra_value as value, gra_grade as grade , gra_name as name, gra_description as description  
                    FROM gra_grade
                    ORDER BY value`;

    catalogueDB.getAndReply(response, sql);
}