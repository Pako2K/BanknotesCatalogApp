"use strict";

const log = require("../../utils/logger").logger;
const Exception = require('../../utils/Exception').Exception;
const dbs = require('../../db-connections');
const users = require('./Users');

let catalogueDB;


module.exports.initialize = function(app) {
    catalogueDB = dbs.getDBConnection('catalogueDB');

    app.get('/currency/:currencyId', currencyByIdGET);
    app.get('/currencies/variants/stats', addOnlyVariants, currenciesItemsStatsGET);
    app.get('/currencies/items/stats', users.validateSessionUser, currenciesItemsStatsGET);
    app.get('/territory/:territoryId/currencies/variants/stats', addOnlyVariants, territoryByIdCurrenciesItemsStatsGET);
    app.get('/territory/:territoryId/currencies/items/stats', users.validateSessionUser, territoryByIdCurrenciesItemsStatsGET);

    log.debug("Currencies service initialized");
};

function addOnlyVariants(request, response, next) {
    request.onlyVariants = true;
    next();
}

// ===> /currency/:currencyId
function currencyByIdGET(request, response) {
    let currencyId = request.params.currencyId;

    // Check that the Id is an integer
    if (Number.isNaN(currencyId) || currencyId.toString() !== request.params.currencyId) {
        new Exception(400, "CUR-1", "Invalid Currency Id, " + request.params.currencyId).send(response);
        return;
    }

    let sql = ` SELECT cur.*, TEC.tec_iso3, TER.ter_con_id,  CON.con_name, TER.ter_id, TER.ter_iso3, TER.ter_name, CUS.cus_value, CUS.cus_name, CUS.cus_abbreviation,
                        pred.cur_id AS pred_cur_id, pred.cur_name AS pred_cur_name, predTEC.tec_ISO3 AS pred_tec_iso3, pred.cur_replacement_rate AS pred_cur_replacement_rate,
                        succ.cur_name AS succ_cur_name, succTEC.tec_ISO3 AS succ_tec_iso3
                FROM cur_currency CUR
                INNER JOIN tec_territory_currency TEC ON TEC.tec_cur_id = CUR.cur_id AND TEC.tec_cur_type = 'OWNED'
                INNER JOIN ter_territory TER ON TEC.tec_ter_id = TER.ter_id
                INNER JOIN con_continent CON ON con_id = TER.ter_con_id
                LEFT JOIN cus_currency_unit CUS ON CUR.cur_id = CUS.cus_cur_id
                LEFT JOIN cur_currency pred ON pred.cur_successor = cur.cur_id
                LEFT JOIN tec_territory_currency predTEC ON predTEC.tec_cur_id = pred.cur_id AND predTEC.tec_cur_type = 'OWNED'
                LEFT JOIN cur_currency succ ON succ.cur_id = cur.cur_successor 
                LEFT JOIN tec_territory_currency succTEC ON succTEC.tec_cur_id = succ.cur_id AND succTEC.tec_cur_type = 'OWNED'
                WHERE CUR.cur_id = ${currencyId}`;

    catalogueDB.execSQL(sql, [], (err, rows) => {
        if (err) {
            new Exception(500, err.code, err.message).send(response);
            return;
        }

        // Build reply JSON
        var replyJSON = {};
        if (rows.length > 0) {
            replyJSON.id = rows[0].cur_id;
            replyJSON.territory = {};
            replyJSON.territory.continentId = rows[0].ter_con_id;
            replyJSON.territory.continentName = rows[0].con_name;
            replyJSON.territory.id = rows[0].ter_id;
            replyJSON.territory.iso3 = rows[0].ter_iso3;
            replyJSON.territory.name = rows[0].ter_name;
            replyJSON.symbol = rows[0].cur_symbol;
            replyJSON.iso3 = rows[0].tec_iso3;
            replyJSON.name = rows[0].cur_name;
            replyJSON.fullName = rows[0].cur_full_name;
            replyJSON.units = [];
            if (rows[0].cus_value) {
                for (let row of rows) {
                    replyJSON.units.push({ "name": row.cus_name, "value": row.cus_value, "abbreviation": row.cus_abbreviation });
                }
            }
            replyJSON.start = rows[0].cur_start;
            replyJSON.end = rows[0].cur_end;
            if (rows[0].pred_cur_id) {
                replyJSON.predecessor = {};
                replyJSON.predecessor.id = rows[0].pred_cur_id;
                replyJSON.predecessor.name = rows[0].pred_cur_name;
                replyJSON.predecessor.iso3 = rows[0].pred_tec_iso3;
                replyJSON.predecessor.rate = rows[0].pred_cur_replacement_rate;
            }
            if (rows[0].cur_successor) {
                replyJSON.successor = {};
                replyJSON.successor.id = rows[0].cur_successor;
                replyJSON.successor.name = rows[0].succ_cur_name;
                replyJSON.successor.iso3 = rows[0].succ_tec_iso3;
                replyJSON.successor.rate = rows[0].cur_replacement_rate;
            }
            replyJSON.description = rows[0].cur_description;
        }

        response.writeHead(200, { 'Content-Type': 'application/json' });
        response.write(JSON.stringify(replyJSON));
        response.send();
    });
}



const currenciesStats_commonSELECT = ` count (DISTINCT SER.ser_id) AS "numSeries", 
                                        count(DISTINCT(BAN.ban_face_value + BAN.ban_cus_id)) AS "numDenominations", 
                                        count(DISTINCT BAN.ban_id) AS "numNotes", count(BVA.bva_id) AS "numVariants"`;
const currenciesStats_commonFROM = `FROM cur_currency CUR
                                    LEFT JOIN tec_territory_currency TEC ON (TEC.tec_cur_id = CUR.cur_id AND TEC.tec_cur_type='OWNED')
                                    LEFT JOIN ter_territory TER ON TER.ter_id = TEC.tec_ter_id
                                    INNER JOIN con_continent CON ON CON.con_id = TER.ter_con_id AND CON.con_order IS NOT NULL
                                    LEFT JOIN ser_series SER ON SER.ser_cur_id = TEC.tec_cur_id
                                    LEFT JOIN ban_banknote BAN ON BAN.ban_ser_id = SER.ser_id
                                    LEFT JOIN bva_variant BVA ON BVA.bva_ban_id = BAN.ban_id`;

// ===> /currencies/items/stats
function currenciesItemsStatsGET(request, response) {
    let sql = ` SELECT  CUR.cur_id AS "id", TEC.tec_ISO3 AS "iso3", CUR.cur_name AS "name", 
                        CASE WHEN TER.ter_tty_id = 2 THEN 'SHARED' ELSE 'OWNED' END AS "currencyType", TER.ter_id AS "territoryId",
                        TER.ter_name AS "territoryName", TER.ter_name AS "territoryIso3", TER.ter_con_id AS "continentId", CON.con_name AS "continentName",
                        CUR.cur_symbol AS "symbol", CUR.cur_start AS "start", CUR.cur_end AS "end", ${currenciesStats_commonSELECT}
                ${currenciesStats_commonFROM}
                GROUP BY "id", "iso3", "currencyType", "territoryId", "territoryName", "territoryIso3", "continentId", "continentName"
                ORDER BY "name", "territoryName", "start", "end"`;

    // Retrieve the catalogue statistics
    catalogueDB.execSQL(sql, [], (err, catRows) => {
        if (err) {
            new Exception(500, err.code, err.message).send(response);
            return;
        }

        let resultJSON = [];
        // Re-structure the results
        for (let row of catRows) {
            let obj = {};
            obj.id = row.id;
            if (row.iso3) obj.iso3 = row.iso3;
            obj.name = row.name;
            obj.currencyType = row.currencyType;
            obj.territory = { "id": row.territoryId, "name": row.territoryName };
            if (row.territoryIso3) obj.territory.iso3 = row.territoryIso3;
            obj.territory.continent = { "id": row.continentId, "name": row.continentName };
            if (row.symbol) obj.symbol = row.symbol;
            obj.start = row.start.split("-")[0];
            if (row.end) obj.end = row.end.split("-")[0];
            obj.numSeries = row.numSeries;
            obj.numDenominations = row.numDenominations;
            obj.numNotes = row.numNotes;
            obj.numVariants = row.numVariants;
            resultJSON.push(obj);
        }

        if (request.onlyVariants) {
            // Build reply JSON
            response.writeHead(200, { 'Content-Type': 'application/json' });
            response.write(JSON.stringify(resultJSON));
            response.send();
            return;
        }

        sql = ` SELECT  CUR.cur_id AS id, ${currenciesStats_commonSELECT}, sum(BIT.bit_price) AS "price"
                ${currenciesStats_commonFROM}
                INNER JOIN bit_item BIT ON bit_bva_id = bva_id
                INNER JOIN usr_user USR ON USR.usr_id = bit_usr_id AND USR.usr_name = $1
                GROUP BY CUR.cur_id`;

        // Retrieve the collection statistics for the session user
        catalogueDB.execSQL(sql, [request.session.user], (err, colRows) => {
            if (err) {
                new Exception(500, err.code, err.message).send(response);
                return;
            }

            // Join the collection results into the catalogue statistics
            let collecIndex = 0;
            for (let row of resultJSON) {
                row.collectionStats = {};
                if (collecIndex < colRows.length && row.id === colRows[collecIndex].id) {
                    row.collectionStats.numSeries = colRows[collecIndex].numSeries;
                    row.collectionStats.numDenominations = colRows[collecIndex].numDenominations;
                    row.collectionStats.numNotes = colRows[collecIndex].numNotes;
                    row.collectionStats.numVariants = colRows[collecIndex].numVariants;
                    row.collectionStats.price = colRows[collecIndex].price;
                    collecIndex++;
                } else {
                    row.collectionStats.numSeries = 0;
                    row.collectionStats.numDenominations = 0;
                    row.collectionStats.numNotes = 0;
                    row.collectionStats.numVariants = 0;
                    row.collectionStats.price = 0;
                }
            }

            // Build reply JSON
            response.writeHead(200, { 'Content-Type': 'application/json' });
            response.write(JSON.stringify(resultJSON));
            response.send();
        });
    });
}




const territoryCurrenciesStats_commonFROM =
    `FROM cur_currency CUR
    INNER JOIN tec_territory_currency TEC ON TEC.tec_cur_id = CUR.cur_id AND TEC.tec_ter_id = $1
    LEFT JOIN ser_series SER ON SER.ser_cur_id = TEC.tec_cur_id
    LEFT JOIN ban_banknote BAN ON BAN.ban_ser_id = SER.ser_id
    LEFT JOIN bva_variant BVA ON BVA.bva_ban_id = BAN.ban_id`;

// ===> /territory/:territoryId/currencies/items/stats
function territoryByIdCurrenciesItemsStatsGET(request, response) {
    let territoryId = request.params.territoryId;

    // Check that the Id is an integer
    if (Number.isNaN(territoryId) || territoryId.toString() !== request.params.territoryId) {
        new Exception(400, "VAR-1", "Invalid Territory Id, " + request.params.territoryId).send(response);
        return;
    }

    let sql = ` SELECT  CUR.cur_id AS "id", TEC.tec_ISO3 AS "iso3", CUR.cur_name AS "name", TEC.tec_cur_type AS "currencyType", CUR.cur_symbol AS "symbol", 
                        CASE WHEN TEC.tec_start IS NULL THEN CUR.cur_start ELSE TEC.tec_start END AS "start",
                        CASE WHEN TEC.tec_end IS NULL THEN CUR.cur_end ELSE TEC.tec_end END AS "end", ${currenciesStats_commonSELECT}
                ${territoryCurrenciesStats_commonFROM}
                GROUP BY "id", "iso3", "currencyType", "start", "end"
                ORDER BY "start", "end"`;

    // Retrieve the catalogue statistics
    catalogueDB.execSQL(sql, [territoryId], (err, catRows) => {
        if (err) {
            new Exception(500, err.code, err.message).send(response);
            return;
        }

        if (request.onlyVariants) {
            // Build reply JSON
            response.writeHead(200, { 'Content-Type': 'application/json' });
            response.write(JSON.stringify(catRows));
            response.send();
            return;
        }

        sql = ` SELECT CUR.cur_id AS "id", ${currenciesStats_commonSELECT}, sum(BIT.bit_price) AS "price"
                ${territoryCurrenciesStats_commonFROM}
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
                    row.collectionStats.numSeries = colRows[found].numSeries;
                    row.collectionStats.numDenominations = colRows[found].numDenominations;
                    row.collectionStats.numNotes = colRows[found].numNotes;
                    row.collectionStats.numVariants = colRows[found].numVariants;
                    row.collectionStats.price = colRows[found].price;
                } else {
                    row.collectionStats.numSeries = 0;
                    row.collectionStats.numDenominations = 0;
                    row.collectionStats.numNotes = 0;
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