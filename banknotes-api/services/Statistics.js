"use strict";

const log = require("../../utils/logger").logger;
const Exception = require('../../utils/Exception').Exception;
const dbs = require('../../db-connections');
const users = require('./Users');
const url = require('url');

let catalogueDB;

module.exports.initialize = function(app) {
    catalogueDB = dbs.getDBConnection('catalogueDB');

    app.get('/territories/variants/stats', addOnlyVariants, territoriesItemsStatsGET);
    app.get('/territories/items/stats', users.validateSessionUser, territoriesItemsStatsGET);
    app.get('/currencies/variants/stats', addOnlyVariants, currenciesItemsStatsGET);
    app.get('/currencies/items/stats', users.validateSessionUser, currenciesItemsStatsGET);
    app.get('/denominations/variants/stats', addOnlyVariants, denominationsItemsStatsGET);
    app.get('/denominations/items/stats', users.validateSessionUser, denominationsItemsStatsGET);
    app.get('/issue-years/variants/stats', addOnlyVariants, issueYearsItemsStatsGET);
    app.get('/issue-years/items/stats', users.validateSessionUser, issueYearsItemsStatsGET);
    app.get('/territory/:territoryId/currencies/variants/stats', addOnlyVariants, territoryByIdCurrenciesItemsStatsGET);
    app.get('/territory/:territoryId/currencies/items/stats', users.validateSessionUser, territoryByIdCurrenciesItemsStatsGET);
    app.get('/territory/:territoryId/series/variants/stats', addOnlyVariants, territoryByIdSeriesItemsStatsGET);
    app.get('/territory/:territoryId/series/items/stats', users.validateSessionUser, territoryByIdSeriesItemsStatsGET);
    app.get('/territory/:territoryId/denominations/variants/stats', addOnlyVariants, territoryByIdDenominationsItemsStatsGET);
    app.get('/territory/:territoryId/denominations/items/stats', users.validateSessionUser, territoryByIdDenominationsItemsStatsGET);
    app.get('/territory/:territoryId/issue-years/variants/stats', addOnlyVariants, territoryByIdIssueYearsItemsStatsGET);
    app.get('/territory/:territoryId/issue-years/items/stats', users.validateSessionUser, territoryByIdIssueYearsItemsStatsGET);

    log.debug("Statistics service initialized");
};


function addOnlyVariants(request, response, next) {
    request.onlyVariants = true;
    next();
}

const territoriesStats_commonSELECT = ` count(DISTINCT TEC.tec_cur_id) AS "numCurrencies", count (DISTINCT SER.ser_id) AS "numSeries", 
                                        count(DISTINCT(BAN.ban_face_value + BAN.ban_cus_id)) AS "numDenominations", 
                                        count(DISTINCT BAN.ban_id) AS "numNotes", count(BVA.bva_id) AS "numVariants"`;
const territoriesStats_commonFROM = `FROM ter_territory TER
                                    INNER JOIN con_continent CON ON CON.con_id = TER.ter_con_id AND CON.con_order IS NOT NULL
                                    LEFT JOIN tec_territory_currency TEC ON (TEC.tec_ter_id = TER.ter_id AND TEC.tec_cur_type='OWNED')
                                    LEFT JOIN ser_series SER ON SER.ser_cur_id = TEC.tec_cur_id
                                    LEFT JOIN ban_banknote BAN ON BAN.ban_ser_id = SER.ser_id
                                    LEFT JOIN bva_variant BVA ON BVA.bva_ban_id = BAN.ban_id`;
// ===> /territories/items/stats
function territoriesItemsStatsGET(request, response) {
    let sql = ` SELECT  TER.ter_id AS "id", TER.ter_iso3 AS "iso3", TER.ter_name AS "name", TER.ter_con_id AS "continentId", 
                        TER.ter_tty_id AS "territoryTypeId", TER.ter_start AS "start", TER.ter_end AS "end", 
                        ${territoriesStats_commonSELECT}
                ${territoriesStats_commonFROM}
                GROUP BY TER.ter_id
                ORDER BY TER.ter_name`;

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

        sql = ` SELECT  TER.ter_id AS id, ${territoriesStats_commonSELECT}, sum(BIT.bit_price) AS "price"
                ${territoriesStats_commonFROM}
                INNER JOIN bit_item BIT ON bit_bva_id = bva_id
                INNER JOIN usr_user USR ON USR.usr_id = bit_usr_id AND USR.usr_name = $1
                GROUP BY TER.ter_id`;

        // Retrieve the collection statistics for the session user
        catalogueDB.execSQL(sql, [request.session.user], (err, colRows) => {
            if (err) {
                new Exception(500, err.code, err.message).send(response);
                return;
            }

            // Join the collection results into the catalogue statistics
            let collecIndex = 0;
            for (let row of catRows) {
                row.collectionStats = {};
                if (collecIndex < colRows.length && row.id === colRows[collecIndex].id) {
                    row.collectionStats.numCurrencies = colRows[collecIndex].numCurrencies;
                    row.collectionStats.numSeries = colRows[collecIndex].numSeries;
                    row.collectionStats.numDenominations = colRows[collecIndex].numDenominations;
                    row.collectionStats.numNotes = colRows[collecIndex].numNotes;
                    row.collectionStats.numVariants = colRows[collecIndex].numVariants;
                    row.collectionStats.price = colRows[collecIndex].price;
                    collecIndex++;
                } else {
                    row.collectionStats.numCurrencies = 0;
                    row.collectionStats.numSeries = 0;
                    row.collectionStats.numDenominations = 0;
                    row.collectionStats.numNotes = 0;
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



const denominationStats_commonSELECT = ` CASE WHEN BAN.ban_cus_id = 0 THEN BAN.ban_face_value ELSE BAN.ban_face_value / CUS.cus_value END AS "denomination",
                                        count (DISTINCT TER.ter_id) AS "numTerritories", count (DISTINCT CUR.cur_id) AS "numCurrencies",
                                        count (DISTINCT SER.ser_id) AS "numSeries", count(BVA.bva_id) AS "numVariants"`;
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
                INNER JOIN bva_variant BVA ON BVA.bva_ban_id = BAN.ban_id ${yearFilter}
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

        sql = `SELECT  ${denominationStats_commonSELECT}, sum(BIT.bit_price) AS "price"
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



const issueYearStats_commonSELECT = `BVA.bva_issue_year AS "issueYear", count (DISTINCT TER.ter_id) AS "numTerritories", 
                                    count (DISTINCT CUR.cur_id) AS "numCurrencies", count (DISTINCT SER.ser_id) AS "numSeries", 
                                    count(DISTINCT(BAN.ban_face_value + BAN.ban_cus_id)) AS "numDenominations", 
                                    count(DISTINCT BAN.ban_id) AS "numNotes", count(BVA.bva_id) AS "numVariants"`;
const issueYearStats_commonFROM = ` FROM bva_variant BVA
                                    LEFT JOIN ban_banknote BAN ON BAN.ban_id = BVA.bva_ban_id
                                    LEFT JOIN ser_series SER ON BAN.ban_ser_id = SER.ser_id
                                    LEFT JOIN cur_currency CUR ON SER.ser_cur_id = CUR.cur_id
                                    LEFT JOIN tec_territory_currency TEC ON (TEC.tec_cur_id = CUR.cur_id AND TEC.tec_cur_type='OWNED')
                                    `;

// ===> /issue-years/items/stats?continentId&fromYear&toYear
function issueYearsItemsStatsGET(request, response) {
    let continentFilter = "";
    let continentId = parseInt(url.parse(request.url, true).query.continentId);
    if (!isNaN(continentId))
        continentFilter = `AND TER.ter_con_id = ${continentId}`;

    let sql = ` SELECT  ${issueYearStats_commonSELECT}
                ${issueYearStats_commonFROM}
                LEFT JOIN ter_territory TER ON TER.ter_id = TEC.tec_ter_id ${continentFilter}
                INNER JOIN con_continent CON ON CON.con_id = TER.ter_con_id AND CON.con_order IS NOT NULL
                GROUP BY "issueYear"`;

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

        sql = `SELECT  ${issueYearStats_commonSELECT}, sum(BIT.bit_price) AS "price"
                    ${issueYearStats_commonFROM}
                    LEFT JOIN ter_territory TER ON TER.ter_id = TEC.tec_ter_id ${continentFilter}
                    INNER JOIN con_continent CON ON CON.con_id = TER.ter_con_id AND CON.con_order IS NOT NULL
                    INNER JOIN bit_item BIT ON BIT.bit_bva_id = BVA.bva_id
                    INNER JOIN usr_user USR ON USR.usr_id = BIT.bit_usr_id AND USR.usr_name = $1
                    GROUP BY "issueYear"`;
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
                    row.collectionStats.numDenominations = colRows[collecIndex].numDenominations;
                    row.collectionStats.numNotes = colRows[collecIndex].numNotes;
                    row.collectionStats.numVariants = colRows[collecIndex].numVariants;
                    row.collectionStats.price = colRows[collecIndex].price;
                    collecIndex++;
                } else {
                    row.collectionStats.numTerritories = 0;
                    row.collectionStats.numCurrencies = 0;
                    row.collectionStats.numSeries = 0;
                    row.collectionStats.numDenominations = 0;
                    row.collectionStats.numNotes = 0;
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



const territoryCurrenciesStats_commonFROM =
    `FROM cur_currency CUR
    INNER JOIN tec_territory_currency TEC ON TEC.tec_cur_id = CUR.cur_id AND TEC.tec_ter_id = $1
    LEFT JOIN ser_series SER ON SER.ser_cur_id = TEC.tec_cur_id
    LEFT JOIN ban_banknote BAN ON BAN.ban_ser_id = SER.ser_id
    LEFT JOIN bva_variant BVA ON BVA.bva_ban_id = BAN.ban_id`;

// ===> /territory/:territoryId/currencies/items/stats
function territoryByIdCurrenciesItemsStatsGET(request, response) {
    let territoryId = request.params.territoryId;

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



const seriesStats_commonSELECT =
    `SER.ser_id AS "id", count(DISTINCT(BAN.ban_face_value + BAN.ban_cus_id)) AS "numDenominations", 
    count(DISTINCT BAN.ban_id) AS "numNotes", count(BVA.bva_id) AS "numVariants"`;

const territorySerieStats_commonFROM =
    `FROM ser_series SER
    INNER JOIN tec_territory_currency TEC ON TEC.tec_ter_id = $1 AND SER.ser_cur_id = TEC.tec_cur_id AND TEC.tec_cur_type='OWNED'
    LEFT JOIN cur_currency CUR ON CUR.cur_id = TEC.tec_cur_id
    LEFT JOIN ban_banknote BAN ON BAN.ban_ser_id = SER.ser_id
    LEFT JOIN bva_variant BVA ON BVA.bva_ban_id = BAN.ban_id`;

// ===> /territory/:territoryId/series/items/stats
function territoryByIdSeriesItemsStatsGET(request, response) {
    let territoryId = request.params.territoryId;

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

        sql = ` SELECT ${seriesStats_commonSELECT}, sum(BIT.bit_price) AS "price"
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



const denominationsStats_commonSELECT =
    `CASE WHEN BAN.ban_cus_id = 0 THEN BAN.ban_face_value ELSE BAN.ban_face_value / CUS.cus_value END AS denomination,
    count (DISTINCT CUR.cur_id) AS "numCurrencies", count (DISTINCT SER.ser_id) AS "numSeries", count(BVA.bva_id) AS "numVariants"`;

const territoryDenominationsStats_commonFROM =
    `FROM ban_banknote BAN
    INNER JOIN tec_territory_currency TEC ON TEC.tec_ter_id = $1 AND TEC.tec_cur_type='OWNED'
    LEFT JOIN cur_currency CUR ON CUR.cur_id = TEC.tec_cur_id
    LEFT JOIN cus_currency_unit CUS ON CUS.cus_id = BAN.ban_cus_id
    LEFT JOIN ser_series SER ON BAN.ban_ser_id = SER.ser_id AND SER.ser_cur_id = CUR.cur_id
    LEFT JOIN bva_variant BVA ON BVA.bva_ban_id = BAN.ban_id`;

// ===> /territory/:territoryId/denominations/items/stats
function territoryByIdDenominationsItemsStatsGET(request, response) {
    let territoryId = request.params.territoryId;

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

        sql = ` SELECT ${denominationsStats_commonSELECT}, sum(BIT.bit_price) AS "price"
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



const yearsStats_commonSELECT =
    `BVA.bva_issue_year AS "issueYear", count(DISTINCT(BAN.ban_face_value + BAN.ban_cus_id)) AS "numDenominations", 
    count(BVA.bva_id) AS "numVariants"`;

const territoryYearsStats_commonFROM =
    `FROM bva_variant BVA
    INNER JOIN tec_territory_currency TEC ON TEC.tec_ter_id = $1 AND TEC.tec_cur_type='OWNED'
    LEFT JOIN ban_banknote BAN ON BAN.ban_id = BVA.bva_ban_id
    LEFT JOIN ser_series SER ON BAN.ban_ser_id = SER.ser_id AND SER.ser_cur_id = TEC.tec_cur_id`;

// ===> /territory/:territoryId/issue-years/items/stats
function territoryByIdIssueYearsItemsStatsGET(request, response) {
    let territoryId = request.params.territoryId;

    let sql = ` SELECT  ${yearsStats_commonSELECT}
                ${territoryYearsStats_commonFROM}
                GROUP BY "issueYear"`;

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

        sql = ` SELECT ${yearsStats_commonSELECT}, sum(BIT.bit_price) AS "price"
                ${territoryYearsStats_commonFROM}
                INNER JOIN bit_item BIT ON BIT.bit_bva_id = BVA.bva_id
                INNER JOIN usr_user USR ON USR.usr_id = BIT.bit_usr_id AND USR.usr_name = $2
                GROUP BY "issueYear"`;

        catalogueDB.execSQL(sql, [territoryId, request.session.user], (err, colRows) => {
            if (err) {
                new Exception(500, err.code, err.message).send(response);
                return;
            }

            // Join the collection results into the catalogue statistics
            let collecIndex = 0;
            for (let row of catRows) {
                row.collectionStats = {};
                if (collecIndex < colRows.length && row.issueYear === colRows[collecIndex].issueYear) {
                    row.collectionStats.numDenominations = colRows[collecIndex].numDenominations;
                    row.collectionStats.numVariants = colRows[collecIndex].numVariants;
                    row.collectionStats.price = colRows[collecIndex].price;
                    collecIndex++;
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