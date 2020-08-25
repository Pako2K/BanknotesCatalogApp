"use strict";

const url = require('url');
const log = require("../../utils/logger").logger;
const jsonParser = require('body-parser').json();
const Exception = require('../../utils/Exception').Exception;
const dbs = require('../../db-connections');
const users = require('./Users');

let catalogueDB;
let serviceValidator;
let schemas = {};

module.exports.initialize = function(app, banknotesOAS, validator) {
    catalogueDB = dbs.getDBConnection('catalogueDB');
    serviceValidator = validator;

    app.put('/currency/:currencyId/series', users.validateSessionUser, users.validateAdminUser, jsonParser, currencySeriesPUT);
    schemas.currencySeriesPUT = getReqJSONSchema(banknotesOAS, "/currency/{currencyId}/series", "put");

    app.put('/series/:seriesId', users.validateSessionUser, users.validateAdminUser, jsonParser, seriesPUT);
    schemas.seriesPUT = getReqJSONSchema(banknotesOAS, "/series/{seriesId}", "put");

    app.get('/currency/:currencyId/series', currencyByIdSeriesGET);
    app.get('/series/:seriesId/', seriesByIdGET);
    app.get('/territory/:territoryId/series/variants/stats', addOnlyVariants, territoryByIdSeriesItemsStatsGET);
    app.get('/territory/:territoryId/series/items/stats', users.validateSessionUser, territoryByIdSeriesItemsStatsGET);
    app.get('/currency/:currencyId/series/variants/stats', addOnlyVariants, currencyByIdSeriesItemsStatsGET);
    app.get('/currency/:currencyId/series/items/stats', users.validateSessionUser, currencyByIdSeriesItemsStatsGET);

    log.debug("Series service initialized");
};


function getReqJSONSchema(swaggerObj, path, operation) {
    return swaggerObj["paths"][path][operation]["requestBody"]["content"]["application/json"]["schema"];
}


function addOnlyVariants(request, response, next) {
    request.onlyVariants = true;
    next();
}



// ===> /currency/:currencyId/series PUT
function currencySeriesPUT(request, response) {
    let currencyId = parseInt(request.params.currencyId);

    // Check that the Id is an integer
    if (Number.isNaN(currencyId) || currencyId.toString() !== request.params.currencyId) {
        new Exception(400, "SER-01", "Invalid currency id, " + request.params.currencyId).send(response);
        return;
    }

    // Validate series info in the body 
    let valResult = serviceValidator.validate(request.body, schemas.currencySeriesPUT);
    if (valResult.errors.length) {
        new Exception(400, "SER-02", JSON.stringify(valResult.errors)).send(response);
        return;
    }

    let series = request.body;

    const sqlInsert = `INSERT INTO ser_series(ser_cur_id, ser_name, ser_start, ser_end, ser_iss_id, ser_law_date, ser_description)
	                    VALUES ($1, $2, $3, $4, $5, $6, $7)`;
    catalogueDB.execSQLUpsert(sqlInsert, [currencyId, series.name, series.start, series.end, series.issuerId, series.lawDate, series.description], (err, result) => {
        if (err) {
            if (err.code === "23505")
                new Exception(400, "SER-03", "Series already exists in this currency").send(response);
            else if (err.code === "23503")
                new Exception(404, "SER-04", "Currency not found: " + currencyId).send(response);
            else
                new Exception(500, err.code, err.message).send(response);
            return;
        }

        // Get the new series id
        let sql = ` SELECT ser_id AS id
                    FROM ser_series
                    WHERE ser_cur_id = $1
                    AND ser_name = $2`;
        catalogueDB.execSQL(sql, [currencyId, series.name], (err, rows) => {
            if (err) {
                new Exception(500, err.code, err.message).send(response);
                return;
            }

            let replyJSON = { id: rows[0].id };

            response.writeHead(200, { 'Content-Type': 'application/json' });
            response.write(JSON.stringify(replyJSON));
            response.send();
        });
    });
}



// ===> /series/:seriesId PUT
function seriesPUT(request, response) {
    let seriesId = parseInt(request.params.seriesId);

    // Check that the Id is an integer
    if (Number.isNaN(seriesId) || seriesId.toString() !== request.params.seriesId) {
        new Exception(400, "SER-01", "Invalid series id, " + request.params.seriesId).send(response);
        return;
    }

    // Validate series info in the body 
    let valResult = serviceValidator.validate(request.body, schemas.seriesPUT);
    if (valResult.errors.length) {
        new Exception(400, "SER-02", JSON.stringify(valResult.errors)).send(response);
        return;
    }

    let series = request.body;

    const sqlUpdate = ` UPDATE ser_series 
                        SET ser_name=$2, ser_start=$3, ser_end=$4, ser_iss_id=$5, ser_law_date=$6, ser_description=$7
	                    WHERE ser_id = $1`;
    catalogueDB.execSQLUpsert(sqlUpdate, [seriesId, series.name, series.start, series.end, series.issuerId, series.lawDate, series.description], (err, result) => {
        if (err) {
            if (err.code === "23503")
                new Exception(404, "SER-03", "Series not found for the given id: " + seriesId).send(response);
            else
                new Exception(500, err.code, err.message).send(response);
            return;
        }

        response.writeHead(200, { 'Content-Type': 'application/json' });
        response.write("{}");
        response.send();
    });
}



// ===> /currency/:currencyId/series
function currencyByIdSeriesGET(request, response) {
    let currencyId = parseInt(request.params.currencyId);
    let queryStrJSON = url.parse(request.url, true).query;

    // Check that the Id is an integer
    if (Number.isNaN(currencyId) || currencyId.toString() !== request.params.currencyId) {
        new Exception(400, "SER-1", "Invalid Currency Id, " + request.params.currencyId).send(response);
        return;
    }

    // Filter for territory
    let territoryId = queryStrJSON.territoryId || "";
    // Check that the Id is an integer
    if (Number.isNaN(territoryId) || territoryId.toString() !== territoryId) {
        new Exception(400, "SER-1", "Invalid Territory Id, " + territoryId).send(response);
        return;
    }

    let sqlJoin = `INNER JOIN tec_territory_currency TEC ON TEC.tec_cur_type = 'OWNED' AND TEC.tec_cur_id = ${currencyId}
                    INNER JOIN iss_issuer ISS ON ISS.iss_id = SER.ser_iss_id AND ISS.iss_ter_id = TEC.tec_ter_id`;
    if (territoryId !== "")
        sqlJoin = `INNER JOIN iss_issuer ISS ON ISS.iss_id = SER.ser_iss_id AND ISS.iss_ter_id = ${territoryId}`;


    let sql = `SELECT SER.ser_id AS "id", SER.ser_name AS "name", SER.ser_start AS "start", SER.ser_end AS "end"
                FROM ser_series SER
                ${sqlJoin}
                WHERE SER.ser_cur_id = ${currencyId}
                ORDER BY "start", "end", "name"`;

    catalogueDB.getAndReply(response, sql);
}


// ===> /series/:seriesId
function seriesByIdGET(request, response) {
    let seriesId = parseInt(request.params.seriesId);

    // Check that the Id is an integer
    if (Number.isNaN(seriesId) || seriesId.toString() !== request.params.seriesId) {
        new Exception(400, "SER-1", "Invalid Series Id, " + request.params.seriesId).send(response);
        return;
    }

    let sql = ` SELECT SER.ser_id AS "id", SER.ser_name AS "name", SER.ser_start AS "start", SER.ser_end AS "end", SER.ser_iss_id AS "issuerId", 
                        ISS.iss_name AS "issuerName", SER.ser_law_date AS "lawDate", SER.ser_description AS "description"
                FROM ser_series SER
                LEFT JOIN iss_issuer ISS ON ISS.iss_id = SER.ser_iss_id
                WHERE SER.ser_id = ${seriesId}`;

    catalogueDB.getAndReply(response, sql);
}




const seriesStats_commonSELECT =
    `SER.ser_id AS "id", count(DISTINCT(BAN.ban_face_value + BAN.ban_cus_id)) AS "numDenominations", 
    count(DISTINCT BVA.bva_id) AS "numVariants"`;

const territorySerieStats_commonFROM =
    `FROM ser_series SER
    INNER JOIN iss_issuer ISS ON ISS.iss_id = SER.ser_iss_id
    INNER JOIN tec_territory_currency TEC ON TEC.tec_ter_id = $1 AND SER.ser_cur_id = TEC.tec_cur_id AND TEC.tec_ter_id = ISS.iss_ter_id
    LEFT JOIN cur_currency CUR ON CUR.cur_id = TEC.tec_cur_id
    LEFT JOIN ban_banknote BAN ON BAN.ban_ser_id = SER.ser_id
    LEFT JOIN bva_variant BVA ON BVA.bva_ban_id = BAN.ban_id`;

// ===> /territory/:territoryId/series/items/stats
function territoryByIdSeriesItemsStatsGET(request, response) {
    let territoryId = request.params.territoryId;

    // Check that the Id is an integer
    if (Number.isNaN(territoryId) || territoryId.toString() !== request.params.territoryId) {
        new Exception(400, "VAR-1", "Invalid Territory Id, " + request.params.territoryId).send(response);
        return;
    }

    let sql = ` SELECT  SER.ser_name AS "name", SER.ser_start AS "start", SER.ser_end AS "end", CUR.cur_id, CUR.cur_name, TEC.tec_iso3,
                ${seriesStats_commonSELECT}
                ${territorySerieStats_commonFROM}
                GROUP BY "id", CUR.cur_id, CUR.cur_name, TEC.tec_iso3
                ORDER BY "start", "end"`;

    // Retrieve the catalogue statistics
    catalogueDB.execSQL(sql, [territoryId], (err, catRows) => {
        if (err) {
            new Exception(500, err.code, err.message).send(response);
            return;
        }

        // Build reply JSON
        for (let row of catRows) {
            row.currency = { id: row.cur_id, name: row.cur_name, iso3: row.tec_iso3 };
            delete row.cur_id;
            delete row.cur_name;
            delete row.tec_iso3;
            if (row.end == null) delete row.end;
        }

        if (request.onlyVariants) {
            response.writeHead(200, { 'Content-Type': 'application/json' });
            response.write(JSON.stringify(catRows));
            response.send();
            return;
        }

        sql = ` SELECT ${seriesStats_commonSELECT}, sum(BIT.bit_price * BIT.bit_quantity) AS "price"
                ${territorySerieStats_commonFROM}
                INNER JOIN bit_item BIT ON BIT.bit_bva_id = BVA.bva_id
                INNER JOIN usr_user USR ON USR.usr_id = BIT.bit_usr_id AND USR.usr_name = $2
                GROUP BY "id"`;

        catalogueDB.execSQL(sql, [territoryId, request.session.user], (err, colRows) => {
            if (err) {
                new Exception(500, err.code, err.message).send(response);
                return;
            }

            // Join the collection results into the catalogue statistics, taking into account the the ordering is different in both resultsets
            for (let row of catRows) {
                row.collectionStats = {};
                // Try to find id in the Collection resultset
                let found = colRows.findIndex((elem) => { return elem.id === row.id });
                if (found !== -1) {
                    row.collectionStats.numDenominations = colRows[found].numDenominations;
                    row.collectionStats.numVariants = colRows[found].numVariants;
                    row.collectionStats.price = colRows[found].price;
                } else {
                    row.collectionStats.numDenominations = 0;
                    row.collectionStats.numVariants = 0;
                    row.collectionStats.price = 0;
                }
            }

            response.writeHead(200, { 'Content-Type': 'application/json' });
            response.write(JSON.stringify(catRows));
            response.send();
        });
    });
}



// ===> /currency/:currencyId/series/items/stats
function currencyByIdSeriesItemsStatsGET(request, response) {
    let currencyId = request.params.currencyId;
    let queryStrJSON = url.parse(request.url, true).query;

    // Check that the Id is an integer
    if (Number.isNaN(currencyId) || currencyId.toString() !== request.params.currencyId) {
        new Exception(400, "VAR-1", "Invalid Currency Id, " + request.params.currencyId).send(response);
        return;
    }

    // Filter for territory
    let territoryId = queryStrJSON.territoryId || "";
    // Check that the Id is an integer
    if (Number.isNaN(territoryId) || territoryId.toString() !== territoryId) {
        new Exception(400, "VAR-1", "Invalid Territory Id, " + territoryId).send(response);
        return;
    }

    const currencySeriesStats_commonFROM = `FROM ser_series SER
                                            INNER JOIN iss_issuer ISS ON ISS.iss_id = SER.ser_iss_id ${territoryId === "" ? "" :'AND ISS.iss_ter_id = ' + territoryId}
                                            LEFT JOIN ban_banknote BAN ON BAN.ban_ser_id = SER.ser_id
                                            LEFT JOIN bva_variant BVA ON BVA.bva_ban_id = BAN.ban_id`;


    let sql = ` SELECT  SER.ser_name AS "name", SER.ser_start AS "start", SER.ser_end AS "end",
                ${seriesStats_commonSELECT}
                ${currencySeriesStats_commonFROM}
                WHERE SER.ser_cur_id = $1
                GROUP BY "id"
                ORDER BY "start", "end"`;

    // Retrieve the catalogue statistics
    catalogueDB.execSQL(sql, [currencyId], (err, catRows) => {
        if (err) {
            new Exception(500, err.code, err.message).send(response);
            return;
        }

        if (request.onlyVariants) {
            response.writeHead(200, { 'Content-Type': 'application/json' });
            response.write(JSON.stringify(catRows));
            response.send();
            return;
        }

        sql = ` SELECT ${seriesStats_commonSELECT}, sum(BIT.bit_price * BIT.bit_quantity) AS "price"
                ${currencySeriesStats_commonFROM}
                INNER JOIN bit_item BIT ON BIT.bit_bva_id = BVA.bva_id
                INNER JOIN usr_user USR ON USR.usr_id = BIT.bit_usr_id AND USR.usr_name = $2
                WHERE SER.ser_cur_id = $1
                GROUP BY "id"`;

        catalogueDB.execSQL(sql, [currencyId, request.session.user], (err, colRows) => {
            if (err) {
                new Exception(500, err.code, err.message).send(response);
                return;
            }

            // Join the collection results into the catalogue statistics, taking into account the the ordering is different in both resultsets
            for (let row of catRows) {
                row.collectionStats = {};
                // Try to find id in the Collection resultset
                let found = colRows.findIndex((elem) => { return elem.id === row.id });
                if (found !== -1) {
                    row.collectionStats.numDenominations = colRows[found].numDenominations;
                    row.collectionStats.numVariants = colRows[found].numVariants;
                    row.collectionStats.price = colRows[found].price;
                } else {
                    row.collectionStats.numDenominations = 0;
                    row.collectionStats.numVariants = 0;
                    row.collectionStats.price = 0;
                }
            }

            response.writeHead(200, { 'Content-Type': 'application/json' });
            response.write(JSON.stringify(catRows));
            response.send();
        });
    });
}