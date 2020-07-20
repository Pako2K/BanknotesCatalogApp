"use strict";

const url = require('url');
const jsonParser = require('body-parser').json();
const log = require("../../utils/logger").logger;
const Exception = require('../../utils/Exception').Exception;
const dbs = require('../../db-connections');
const users = require('./Users');

let catalogueDB;
let serviceValidator;
let schemas = {};


module.exports.initialize = function(app, banknotesOAS, validator) {
    catalogueDB = dbs.getDBConnection('catalogueDB');
    serviceValidator = validator;

    app.put('/series/:seriesId/denomination', users.validateSessionUser, users.validateAdminUser, jsonParser, seriesDenominationPUT);
    schemas.seriesDenominationPUT = getReqJSONSchema(banknotesOAS, "/series/{seriesId}/denomination", "put");

    app.put('/denomination/:denominationId', users.validateSessionUser, users.validateAdminUser, jsonParser, denominationPUT);
    schemas.denominationPUT = getReqJSONSchema(banknotesOAS, "/denomination/{denominationId}", "put");

    app.get('/denominations/variants/stats', addOnlyVariants, denominationsItemsStatsGET);
    app.get('/denominations/items/stats', users.validateSessionUser, denominationsItemsStatsGET);
    app.get('/territory/:territoryId/denominations/variants/stats', addOnlyVariants, territoryByIdDenominationsItemsStatsGET);
    app.get('/territory/:territoryId/denominations/items/stats', users.validateSessionUser, territoryByIdDenominationsItemsStatsGET);
    app.get('/currency/:currencyId/denominations/variants/stats', addOnlyVariants, currencyByIdDenominationsItemsStatsGET);
    app.get('/currency/:currencyId/denominations/items/stats', users.validateSessionUser, currencyByIdDenominationsItemsStatsGET);

    log.debug("Banknotes service initialized");
};


function getReqJSONSchema(swaggerObj, path, operation) {
    return swaggerObj["paths"][path][operation]["requestBody"]["content"]["application/json"]["schema"];
}


function addOnlyVariants(request, response, next) {
    request.onlyVariants = true;
    next();
}


// ==> series/:seriesId/denomination
function seriesDenominationPUT(request, response) {
    let seriesId = parseInt(request.params.seriesId);

    // Check that the Id is an integer
    if (Number.isNaN(seriesId) || seriesId.toString() !== request.params.seriesId) {
        new Exception(400, "BAN-01", "Invalid series id, " + request.params.seriesId).send(response);
        return;
    }

    // Validate banknote info in the body 
    let valResult = serviceValidator.validate(request.body, schemas.seriesDenominationPUT);
    if (valResult.errors.length) {
        new Exception(400, "BAN-02", JSON.stringify(valResult.errors)).send(response);
        return;
    }

    let banknote = request.body;

    const sqlInsert = `INSERT INTO ban_banknote (ban_ser_id, ban_cus_id, ban_face_value, ban_mat_id, ban_obverse_desc, ban_reverse_desc, ban_size_width, ban_size_height, ban_description)
                       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`;
    catalogueDB.execSQLUpsert(sqlInsert, [seriesId, banknote.unitId, banknote.faceValue, banknote.materialId, banknote.obverseDescription, banknote.reverseDescription, banknote.width, banknote.height, banknote.description], (err, result) => {
        if (err) {
            if (err.code === "23505")
                new Exception(400, "BAN-03", "Denomination already exists in this series").send(response);
            else if (err.code === "23503")
                new Exception(404, "BAN-04", "Series not found: " + seriesId).send(response);
            else
                new Exception(500, err.code, err.message).send(response);
            return;
        }

        // Get the new banknote id
        let sql = ` SELECT ban_id AS id
                    FROM ban_banknote
                    WHERE ban_ser_id = $1 
                    AND ban_face_value = $2
                    AND ban_cus_id = $3`;
        catalogueDB.execSQL(sql, [seriesId, banknote.faceValue, banknote.unitId], (err, rows) => {
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



// ==> denomination/:denominationId
function denominationPUT(request, response) {
    let denominationId = parseInt(request.params.denominationId);

    // Check that the Id is an integer
    if (Number.isNaN(denominationId) || denominationId.toString() !== request.params.denominationId) {
        new Exception(400, "BAN-01", "Invalid denomination id, " + request.params.denominationId).send(response);
        return;
    }

    // Validate banknote info in the body 
    let valResult = serviceValidator.validate(request.body, schemas.denominationPUT);
    if (valResult.errors.length) {
        new Exception(400, "BAN-02", JSON.stringify(valResult.errors)).send(response);
        return;
    }

    let banknote = request.body;

    const sqlUpdate = ` UPDATE ban_banknote 
                        SET ban_mat_id = $4, ban_obverse_desc = $5, ban_reverse_desc = $6, ban_size_width = $7, ban_size_height = $8, ban_description = $9
                        WHERE ban_id = $1 AND ban_cus_id = $2 AND ban_face_value = $3`;
    catalogueDB.execSQLUpsert(sqlUpdate, [denominationId, banknote.unitId, banknote.faceValue, banknote.materialId, banknote.obverseDescription, banknote.reverseDescription, banknote.width, banknote.height, banknote.description], (err, result) => {
        if (err) {
            if (err.code === "23503")
                new Exception(404, "BAN-04", "Denomination not found for the given id, face value and unit: " + denominationId).send(response);
            else
                new Exception(500, err.code, err.message).send(response);
            return;
        }

        response.writeHead(200, { 'Content-Type': 'application/json' });
        response.write("{}");
        response.send();
    });
}




const denominationStats_commonSELECT = ` CASE WHEN BAN.ban_cus_id = 0 THEN BAN.ban_face_value ELSE BAN.ban_face_value / CUS.cus_value END AS "denomination",
                                        count (DISTINCT TER.ter_id) AS "numTerritories", count (DISTINCT CUR.cur_id) AS "numCurrencies",
                                        count (DISTINCT SER.ser_id) AS "numSeries", count(DISTINCT BVA.bva_id) AS "numVariants"`;
const denominationStats_commonFROM = `  FROM ban_banknote BAN
                                        LEFT JOIN ser_series SER ON BAN.ban_ser_id = SER.ser_id
                                        LEFT JOIN cur_currency CUR ON SER.ser_cur_id = CUR.cur_id
                                        LEFT JOIN tec_territory_currency TEC ON (TEC.tec_cur_id = CUR.cur_id AND TEC.tec_cur_type='OWNED')
                                        LEFT JOIN cus_currency_unit CUS ON CUS.cus_id = BAN.ban_cus_id
                                        `;

// ===> /denominations/items/stats?continentId&fromYear&toYear
function denominationsItemsStatsGET(request, response) {
    let continentFilter = "";
    let continentId = parseInt(url.parse(request.url, true).query.continentId);
    if (!isNaN(continentId))
        continentFilter = `AND TER.ter_con_id = ${continentId}`;

    let yearFilter = "";
    let yearFrom = parseInt(url.parse(request.url, true).query.yearFrom);
    if (!isNaN(yearFrom))
        yearFilter = `AND BVA.bva_issue_year >= ${yearFrom}`;
    let yearTo = parseInt(url.parse(request.url, true).query.yearTo);
    if (!isNaN(yearTo))
        yearFilter += ` AND BVA.bva_issue_year <= ${yearTo}`;

    let sql = ` SELECT  ${denominationStats_commonSELECT}
                ${denominationStats_commonFROM}
                LEFT JOIN ter_territory TER ON TER.ter_id = TEC.tec_ter_id ${continentFilter}
                INNER JOIN con_continent CON ON CON.con_id = TER.ter_con_id AND CON.con_order IS NOT NULL
                ${yearFilter === "" ? "LEFT" : "INNER"} JOIN bva_variant BVA ON BVA.bva_ban_id = BAN.ban_id ${yearFilter}
                GROUP BY "denomination"`;

    if (request.onlyVariants) {
        catalogueDB.getAndReply(response, sql);
        return;
    }

    // Retrieve the catalogue statistics
    catalogueDB.execSQL(sql, [], (err, catRows) => {
        if (err) {
            new Exception(500, err.code, err.message).send(response);
            return;
        }

        sql = `SELECT  ${denominationStats_commonSELECT}, sum(BIT.bit_price * BIT.bit_quantity) AS "price"
                        ${denominationStats_commonFROM}
                        LEFT JOIN ter_territory TER ON TER.ter_id = TEC.tec_ter_id ${continentFilter}
                        INNER JOIN con_continent CON ON CON.con_id = TER.ter_con_id AND CON.con_order IS NOT NULL
                        INNER JOIN bva_variant BVA ON BVA.bva_ban_id = BAN.ban_id ${yearFilter}
                        INNER JOIN bit_item BIT ON BIT.bit_bva_id = BVA.bva_id
                        INNER JOIN usr_user USR ON USR.usr_id = BIT.bit_usr_id AND USR.usr_name = $1
                        GROUP BY denomination`;
        catalogueDB.execSQL(sql, [request.session.user], (err, colRows) => {
            if (err) {
                new Exception(500, err.code, err.message).send(response);
                return;
            }

            // Join the collection results into the catalogue statistics
            let collecIndex = 0;
            for (let row of catRows) {
                row.collectionStats = {};
                if (collecIndex < colRows.length && row.denomination === colRows[collecIndex].denomination) {
                    row.collectionStats.numTerritories = colRows[collecIndex].numTerritories;
                    row.collectionStats.numCurrencies = colRows[collecIndex].numCurrencies;
                    row.collectionStats.numSeries = colRows[collecIndex].numSeries;
                    row.collectionStats.numVariants = colRows[collecIndex].numVariants;
                    row.collectionStats.price = colRows[collecIndex].price;
                    collecIndex++;
                } else {
                    row.collectionStats.numTerritories = 0;
                    row.collectionStats.numCurrencies = 0;
                    row.collectionStats.numSeries = 0;
                    row.collectionStats.numVariants = 0;
                    row.collectionStats.price = 0;
                }
            }

            // Build reply JSON
            response.writeHead(200, { 'Content-Type': 'application/json' });
            response.write(JSON.stringify(catRows));
            response.send();
        });
    });
}




const denominationsStats_commonSELECT =
    `CASE WHEN BAN.ban_cus_id = 0 THEN BAN.ban_face_value ELSE BAN.ban_face_value / CUS.cus_value END AS denomination,
    count (DISTINCT CUR.cur_id) AS "numCurrencies", count (DISTINCT SER.ser_id) AS "numSeries", count(BVA.bva_id) AS "numVariants"`;

const territoryDenominationsStats_commonFROM =
    `FROM ban_banknote BAN
    INNER JOIN tec_territory_currency TEC ON TEC.tec_ter_id = $1 AND TEC.tec_cur_type='OWNED'
    INNER JOIN cur_currency CUR ON CUR.cur_id = TEC.tec_cur_id
    INNER JOIN cus_currency_unit CUS ON CUS.cus_id = BAN.ban_cus_id
    INNER JOIN ser_series SER ON BAN.ban_ser_id = SER.ser_id AND SER.ser_cur_id = CUR.cur_id
    LEFT JOIN bva_variant BVA ON BVA.bva_ban_id = BAN.ban_id`;

// ===> /territory/:territoryId/denominations/items/stats
function territoryByIdDenominationsItemsStatsGET(request, response) {
    let territoryId = request.params.territoryId;

    // Check that the Id is an integer
    if (Number.isNaN(territoryId) || territoryId.toString() !== request.params.territoryId) {
        new Exception(400, "VAR-1", "Invalid Territory Id, " + request.params.territoryId).send(response);
        return;
    }

    let sql = ` SELECT  ${denominationsStats_commonSELECT}
                ${territoryDenominationsStats_commonFROM}
                GROUP BY "denomination"`;

    // Retrieve the catalogue statistics
    catalogueDB.execSQL(sql, [territoryId], (err, catRows) => {
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

        sql = ` SELECT ${denominationsStats_commonSELECT}, sum(BIT.bit_price * BIT.bit_quantity) AS "price"
                ${territoryDenominationsStats_commonFROM}
                INNER JOIN bit_item BIT ON BIT.bit_bva_id = BVA.bva_id
                INNER JOIN usr_user USR ON USR.usr_id = BIT.bit_usr_id AND USR.usr_name = $2
                GROUP BY "denomination"`;

        catalogueDB.execSQL(sql, [territoryId, request.session.user], (err, colRows) => {
            if (err) {
                new Exception(500, err.code, err.message).send(response);
                return;
            }

            // Join the collection results into the catalogue statistics
            let collecIndex = 0;
            for (let row of catRows) {
                row.collectionStats = {};
                if (collecIndex < colRows.length && row.denomination === colRows[collecIndex].denomination) {
                    row.collectionStats.numCurrencies = colRows[collecIndex].numCurrencies;
                    row.collectionStats.numSeries = colRows[collecIndex].numSeries;
                    row.collectionStats.numVariants = colRows[collecIndex].numVariants;
                    row.collectionStats.price = colRows[collecIndex].price;
                    collecIndex++;
                } else {
                    row.collectionStats.numCurrencies = 0;
                    row.collectionStats.numSeries = 0;
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




const currencyDenominationsStats_commonSELECT =
    `CASE WHEN BAN.ban_cus_id = 0 THEN BAN.ban_face_value ELSE BAN.ban_face_value / CUS.cus_value END AS denomination,
    count (DISTINCT SER.ser_id) AS "numSeries", count(DISTINCT BVA.bva_id) AS "numVariants"`;

const currencyIdDenominationsStats_commonFROM =
    `FROM ban_banknote BAN
    INNER JOIN ser_series SER ON BAN.ban_ser_id = SER.ser_id AND SER.ser_cur_id = $1
    LEFT JOIN bva_variant BVA ON BVA.bva_ban_id = BAN.ban_id
    LEFT JOIN cus_currency_unit CUS ON CUS.cus_id = BAN.ban_cus_id`;

// ===> /currencyId/:currencyId/denominations/items/stats
function currencyByIdDenominationsItemsStatsGET(request, response) {
    let currencyId = request.params.currencyId;

    // Check that the Id is an integer
    if (Number.isNaN(currencyId) || currencyId.toString() !== request.params.currencyId) {
        new Exception(400, "VAR-1", "Invalid Currency Id, " + request.params.currencyId).send(response);
        return;
    }

    let sql = ` SELECT  ${currencyDenominationsStats_commonSELECT}
                ${currencyIdDenominationsStats_commonFROM}
                GROUP BY "denomination"`;

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

        sql = ` SELECT ${currencyDenominationsStats_commonSELECT}, sum(BIT.bit_price * BIT.bit_quantity) AS "price"
                ${currencyIdDenominationsStats_commonFROM}
                INNER JOIN bit_item BIT ON BIT.bit_bva_id = BVA.bva_id
                INNER JOIN usr_user USR ON USR.usr_id = BIT.bit_usr_id AND USR.usr_name = $2
                GROUP BY "denomination"`;

        catalogueDB.execSQL(sql, [currencyId, request.session.user], (err, colRows) => {
            if (err) {
                new Exception(500, err.code, err.message).send(response);
                return;
            }

            // Join the collection results into the catalogue statistics
            let collecIndex = 0;
            for (let row of catRows) {
                row.collectionStats = {};
                if (collecIndex < colRows.length && row.denomination === colRows[collecIndex].denomination) {
                    row.collectionStats.numSeries = colRows[collecIndex].numSeries;
                    row.collectionStats.numVariants = colRows[collecIndex].numVariants;
                    row.collectionStats.price = colRows[collecIndex].price;
                    collecIndex++;
                } else {
                    row.collectionStats.numSeries = 0;
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