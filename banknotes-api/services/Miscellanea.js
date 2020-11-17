"use strict";

const log = require("../../utils/logger").logger;
const Exception = require('../../utils/Exception').Exception;
const dbs = require('../../db-connections');
const jsonParser = require('body-parser').json();
const users = require('./Users');

let catalogueDB;
let serviceValidator;
let schemas = {};

function getReqJSONSchema(swaggerObj, path, operation) {
    return swaggerObj["paths"][path][operation]["requestBody"]["content"]["application/json"]["schema"];
}


module.exports.initialize = function(app, banknotesOAS, validator) {
    catalogueDB = dbs.getDBConnection('catalogueDB');
    serviceValidator = validator;

    app.get('/grades', gradesGET);
    app.get('/territory/:territoryId/issuer', territoryIssuerGET);
    app.get('/issuer', issuerGET);
    app.put('/issuer', users.validateSessionUser, users.validateAdminUser, jsonParser, issuerPUT);
    schemas.issuerPUT = getReqJSONSchema(banknotesOAS, "/issuer", "put");

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



// ===> /territory/{territoryId}/issuer
function territoryIssuerGET(request, response) {
    let territoryId = parseInt(request.params.territoryId);

    // Check that the Id is an integer
    if (Number.isNaN(territoryId) || territoryId.toString() !== request.params.territoryId) {
        new Exception(400, "ISS-1", "Invalid Territory Id, " + request.params.territoryId).send(response);
        return;
    }


    const sql = `   SELECT iss_id AS id, iss_name AS name, iss_description AS description
                    FROM iss_issuer
                    WHERE iss_ter_id = ${territoryId}
                    ORDER BY name`;

    catalogueDB.getAndReply(response, sql);
}



// ===> /issuer
function issuerGET(request, response) {
    const sql = `   SELECT ISS.iss_id AS id, ISS.iss_name AS name, ISS.iss_description AS description, ISS.iss_ter_id AS "territoryId", TER.ter_name AS "territoryName"
	                FROM iss_issuer ISS
                    INNER JOIN ter_territory TER ON TER.ter_id = ISS.iss_ter_id
                    ORDER BY ISS.iss_name`;

    catalogueDB.getAndReply(response, sql);
}

// ===> /issuer (PUT)
function issuerPUT(request, response) {
    let issuer = request.body;

    const sqlInsert = `INSERT INTO iss_issuer (iss_name, iss_ter_id)
                       VALUES( $1, $2)`;
    catalogueDB.execSQLUpsert(sqlInsert, [issuer.name, issuer.territoryId], (err, result) => {
        if (err) {
            new Exception(500, err.code, err.message).send(response);
            return;
        }

        const sql = `SELECT iss_id AS "id"
                     FROM iss_issuer
                    WHERE iss_name = $1 AND iss_ter_id = $2`;

        catalogueDB.execSQL(sql, [issuer.name, issuer.territoryId], (err, result) => {
            if (err) {
                err.message += `\nSQL Query: ${sqlStr}`;
                new Exception(500, err.code, err.message).send(response);
                return;
            }

            // Build reply JSON
            response.writeHead(200, { 'Content-Type': 'application/json' });
            response.write(JSON.stringify(result[0]));
            response.send();
        });
    });
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