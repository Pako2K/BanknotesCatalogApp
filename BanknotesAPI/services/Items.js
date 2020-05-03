"use strict";

const url = require('url');
const log = require("../utils/logger").logger;
const Exception = require('../utils/Exception').Exception;
const dbs = require('../DBConnections');
const users = require('./Users');

let catalogueDB;

module.exports.initialize = function(app) {
    catalogueDB = dbs.getDB('catalogueDB');

    app.get('/items/stats', users.validateUser, itemsStatsGET);
    app.get('/variants/items', users.validateUser, variantsItemsGET);
    app.get('/territory/:territoryId/items/stats', users.validateUser, territoryByIdItemsStatsGET);

    log.debug("Items service initialized");
};



// ==> items/stats?grouping=<grouping>&fromYear&toYear'
function itemsStatsGET(request, response) {
    let grouping = url.parse(request.url, true).query.grouping;
    const GROUPINGS = ['territory', 'currency', 'denomination', 'year'];
    if (grouping === undefined || grouping === '' || GROUPINGS.indexOf(grouping) === -1) {
        // Invalid parameter
        let exception = new Exception(400, "ITEM-1", "Query parameter missing or not valid");
        exception.send(response);
        return;
    }

    let sqlStats = "";
    switch (grouping) {
        case "territory":
            sqlStats = `SELECT TER.ter_id AS id, count(DISTINCT TEC.tec_cur_id) AS numCurrencies, count (DISTINCT SER.ser_id) AS numSeries, 
                            count(DISTINCT(BAN.ban_face_value + BAN.ban_cus_id)) AS numDenominations, count(DISTINCT BAN.ban_id) AS numNotes, count(BVA.bva_id) AS numVariants,
                            sum(BIT.bit_price) AS price
                            FROM ter_territory TER
                            LEFT JOIN tec_territory_currency TEC ON (TEC.tec_ter_id = TER.ter_id AND TEC.tec_cur_type='OWNED')
                            LEFT JOIN ser_series SER ON SER.ser_cur_id = TEC.tec_cur_id
                            LEFT JOIN ban_banknote BAN ON BAN.ban_ser_id = SER.ser_id
                            LEFT JOIN bva_variant BVA ON BVA.bva_ban_id = BAN.ban_id
                            INNER JOIN bit_item BIT ON bit_bva_id = bva_id
                            INNER JOIN usr_user USR ON USR.usr_id = bit_usr_id AND USR.usr_name = ?
                            WHERE TER.ter_con_id <> 1
                            GROUP BY TER.ter_id
                            ORDER BY TER.ter_name`;
            break;

        case "currency":
            sqlStats = `SELECT CUR.cur_id AS id, count (DISTINCT SER.ser_id) AS numSeries, count(DISTINCT(BAN.ban_face_value + BAN.ban_cus_id)) AS numDenominations, 
                            count(DISTINCT BAN.ban_id) AS numNotes, count(BVA.bva_id) AS numVariants, sum(BIT.bit_price) AS price
                            FROM cur_currency CUR
                            LEFT JOIN ser_series SER ON SER.ser_cur_id = CUR.cur_id
                            LEFT JOIN ban_banknote BAN ON BAN.ban_ser_id = SER.ser_id
                            LEFT JOIN bva_variant BVA ON BVA.bva_ban_id = BAN.ban_id
                            INNER JOIN bit_item BIT ON BIT.bit_bva_id = BVA.bva_id
                            INNER JOIN usr_user USR ON USR.usr_id = BIT.bit_usr_id AND USR.usr_name = ?
                            GROUP BY CUR.cur_id
                            ORDER BY CUR.cur_name`;
            break;

        case "denomination":
            let yearFilter = "";

            let fromYear = parseInt(url.parse(request.url, true).query.fromYear);
            if (!isNaN(fromYear))
                yearFilter = `AND BVA.bva_issue_year >= ${fromYear}`;

            let toYear = parseInt(url.parse(request.url, true).query.toYear);
            if (!isNaN(toYear))
                yearFilter += ` AND BVA.bva_issue_year <= ${toYear}`;

            sqlStats = `SELECT  CASE WHEN BAN.ban_cus_id = 0 THEN BAN.ban_face_value ELSE BAN.ban_face_value / CUS.cus_value END AS denomination,
                                count (DISTINCT TER.ter_id) AS numTerritories, count (DISTINCT CUR.cur_id) AS numCurrencies,
                                count (DISTINCT SER.ser_id) AS numSeries, count(BVA.bva_id) AS numVariants, sum(BIT.bit_price) AS price
                        FROM ban_banknote BAN
                        LEFT JOIN ser_series SER ON BAN.ban_ser_id = SER.ser_id
                        LEFT JOIN cur_currency CUR ON SER.ser_cur_id = CUR.cur_id
                        LEFT JOIN tec_territory_currency TEC ON (TEC.tec_cur_id = CUR.cur_id AND TEC.tec_cur_type='OWNED')
                        LEFT JOIN ter_territory TER ON (TER.ter_id = TEC.tec_ter_id AND TER.ter_con_id <> 1)
                        INNER JOIN bva_variant BVA ON BVA.bva_ban_id = BAN.ban_id ${yearFilter}
                        LEFT JOIN cus_currency_unit CUS ON CUS.cus_id = BAN.ban_cus_id
                        INNER JOIN bit_item BIT ON BIT.bit_bva_id = BVA.bva_id
                        INNER JOIN usr_user USR ON USR.usr_id = BIT.bit_usr_id AND USR.usr_name = ?
                        GROUP BY denomination`;
            break;
        case "year":
            sqlStats = `SELECT  BVA.bva_issue_year AS issueYear,
                                TER.ter_con_id AS continentId, count (DISTINCT TER.ter_id) AS numTerritories, 
                                count (DISTINCT CUR.cur_id) AS numCurrencies, count (DISTINCT SER.ser_id) AS numSeries, 
                                count(DISTINCT(BAN.ban_face_value + BAN.ban_cus_id)) AS numDenominations, 
                                count(DISTINCT BAN.ban_id) AS numNotes, count(BVA.bva_id) AS numVariants,
                                sum(BIT.bit_price) AS price
                        FROM bva_variant BVA
                        LEFT JOIN ban_banknote BAN ON BAN.ban_id = BVA.bva_ban_id
                        LEFT JOIN ser_series SER ON BAN.ban_ser_id = SER.ser_id
                        LEFT JOIN cur_currency CUR ON SER.ser_cur_id = CUR.cur_id
                        LEFT JOIN tec_territory_currency TEC ON (TEC.tec_cur_id = CUR.cur_id AND TEC.tec_cur_type='OWNED')
                        LEFT JOIN ter_territory TER ON (TER.ter_id = TEC.tec_ter_id AND TER.ter_con_id <> 1)
                        INNER JOIN bit_item BIT ON BIT.bit_bva_id = BVA.bva_id
                        INNER JOIN usr_user USR ON USR.usr_id = BIT.bit_usr_id AND USR.usr_name = ?
                        GROUP BY issueYear`;
            break;
    }

    catalogueDB.all(sqlStats, [request.session.user], (err, rows) => {
        if (err) {
            let exception = new Exception(500, err.code, err.message);
            exception.send(response);
            return;
        }

        response.writeHead(200, { 'Content-Type': 'application/json' });
        response.write(JSON.stringify(rows));
        response.send();
    });
}


// ==> /territory/:territoryId/items/stats?grouping=<grouping>'
function territoryByIdItemsStatsGET(request, response) {
    let territoryId = request.params.territoryId;
    let grouping = url.parse(request.url, true).query.grouping;
    const GROUPINGS = ['currency', 'series', 'denomination', 'year'];
    if (grouping === undefined || grouping === '' || GROUPINGS.indexOf(grouping) === -1) {
        // Invalid parameter
        let exception = new Exception(400, "ITEM-1", "Query parameter missing or not valid");
        exception.send(response);
        return;
    }

    let sqlStats = "";
    switch (grouping) {
        case "currency":
            sqlStats = `SELECT CUR.cur_id AS id, count (DISTINCT SER.ser_id) AS numSeries, count(DISTINCT(BAN.ban_face_value + BAN.ban_cus_id)) AS numDenominations, 
                            count(DISTINCT BAN.ban_id) AS numNotes, count(BVA.bva_id) AS numVariants, sum(BIT.bit_price) AS price
                            FROM cur_currency CUR
                            INNER JOIN tec_territory_currency TEC ON TEC.tec_cur_id = CUR.cur_id AND TEC.tec_ter_id = ${territoryId}
                            LEFT JOIN ser_series SER ON SER.ser_cur_id = CUR.cur_id
                            LEFT JOIN ban_banknote BAN ON BAN.ban_ser_id = SER.ser_id
                            LEFT JOIN bva_variant BVA ON BVA.bva_ban_id = BAN.ban_id
                            INNER JOIN bit_item BIT ON BIT.bit_bva_id = BVA.bva_id
                            INNER JOIN usr_user USR ON USR.usr_id = BIT.bit_usr_id AND USR.usr_name = ?
                            GROUP BY CUR.cur_id
                            ORDER BY CUR.cur_start, CUR.cur_end, CUR.cur_name`;
            break;
            // case "series":
            //     break;
            // case "denomination":
            //     let yearFilter = "";

            //     let fromYear = parseInt(url.parse(request.url, true).query.fromYear);
            //     if (!isNaN(fromYear))
            //         yearFilter = `AND BVA.bva_issue_year >= ${fromYear}`;

            //     let toYear = parseInt(url.parse(request.url, true).query.toYear);
            //     if (!isNaN(toYear))
            //         yearFilter += ` AND BVA.bva_issue_year <= ${toYear}`;

            //     sqlStats = `SELECT  CASE WHEN BAN.ban_cus_id = 0 THEN BAN.ban_face_value ELSE BAN.ban_face_value / CUS.cus_value END AS denomination,
            //                         count (DISTINCT TER.ter_id) AS numTerritories, count (DISTINCT CUR.cur_id) AS numCurrencies,
            //                         count (DISTINCT SER.ser_id) AS numSeries, count(BVA.bva_id) AS numVariants, sum(BIT.bit_price) AS price
            //                 FROM ban_banknote BAN
            //                 LEFT JOIN ser_series SER ON BAN.ban_ser_id = SER.ser_id
            //                 LEFT JOIN cur_currency CUR ON SER.ser_cur_id = CUR.cur_id
            //                 LEFT JOIN tec_territory_currency TEC ON (TEC.tec_cur_id = CUR.cur_id AND TEC.tec_cur_type='OWNED')
            //                 LEFT JOIN ter_territory TER ON (TER.ter_id = TEC.tec_ter_id AND TER.ter_con_id <> 1)
            //                 INNER JOIN bva_variant BVA ON BVA.bva_ban_id = BAN.ban_id ${yearFilter}
            //                 LEFT JOIN cus_currency_unit CUS ON CUS.cus_id = BAN.ban_cus_id
            //                 INNER JOIN bit_item BIT ON BIT.bit_bva_id = BVA.bva_id
            //                 INNER JOIN usr_user USR ON USR.usr_id = BIT.bit_usr_id AND USR.usr_name = ?
            //                 GROUP BY denomination`;
            //     break;
            // case "year":
            //     sqlStats = `SELECT  BVA.bva_issue_year AS issueYear,
            //                         TER.ter_con_id AS continentId, count (DISTINCT TER.ter_id) AS numTerritories, 
            //                         count (DISTINCT CUR.cur_id) AS numCurrencies, count (DISTINCT SER.ser_id) AS numSeries, 
            //                         count(DISTINCT(BAN.ban_face_value + BAN.ban_cus_id)) AS numDenominations, 
            //                         count(DISTINCT BAN.ban_id) AS numNotes, count(BVA.bva_id) AS numVariants,
            //                         sum(BIT.bit_price) AS price
            //                 FROM bva_variant BVA
            //                 LEFT JOIN ban_banknote BAN ON BAN.ban_id = BVA.bva_ban_id
            //                 LEFT JOIN ser_series SER ON BAN.ban_ser_id = SER.ser_id
            //                 LEFT JOIN cur_currency CUR ON SER.ser_cur_id = CUR.cur_id
            //                 LEFT JOIN tec_territory_currency TEC ON (TEC.tec_cur_id = CUR.cur_id AND TEC.tec_cur_type='OWNED')
            //                 LEFT JOIN ter_territory TER ON (TER.ter_id = TEC.tec_ter_id AND TER.ter_con_id <> 1)
            //                 INNER JOIN bit_item BIT ON BIT.bit_bva_id = BVA.bva_id
            //                 INNER JOIN usr_user USR ON USR.usr_id = BIT.bit_usr_id AND USR.usr_name = ?
            //                 GROUP BY issueYear`;
            //     break;
    }

    catalogueDB.all(sqlStats, [request.session.user], (err, rows) => {
        if (err) {
            let exception = new Exception(500, err.code, err.message);
            exception.send(response);
            return;
        }

        response.writeHead(200, { 'Content-Type': 'application/json' });
        response.write(JSON.stringify(rows));
        response.send();
    });
}

//===> /variants/items?contId&terTypeId&terStartDateFrom&terStartDateTo&terEndDateFrom&terEndDateTo&curType
//               &curStartDateFrom&curStartDateTo&curEndDateFrom&currEndDateTo&minDenom&maxDenom&issueDateFrom&issueDateTo
function variantsItemsGET(request, response) {
    let queryStrJSON = url.parse(request.url, true).query;
    let param;

    // Calculate the filters for territories
    let sqlTerritory = "";
    param = queryStrJSON.contId || "";
    if (param !== "")
        sqlTerritory = `AND TER.ter_con_id = ${param}`;

    param = queryStrJSON.terTypeId || "";
    if (param !== "")
        sqlTerritory += ` AND TER.ter_tty_id = ${param}`;

    param = queryStrJSON.terStartDateFrom || "";
    if (param !== "")
        sqlTerritory += ` AND CAST(substr(TER.ter_start,1,4) AS INTEGER) >= ${param}`;

    param = queryStrJSON.terStartDateTo || "";
    if (param !== "")
        sqlTerritory += ` AND CAST(substr(TER.ter_start,1,4) AS INTEGER) <= ${param}`;

    param = queryStrJSON.terEndDateFrom || "";
    if (param !== "")
        sqlTerritory += ` AND CAST(substr(TER.ter_end,1,4) AS INTEGER) >= ${param}`;

    param = queryStrJSON.terEndDateTo || "";
    if (param !== "")
        sqlTerritory += ` AND CAST(substr(TER.ter_end,1,4) AS INTEGER) <= ${param}`;

    // Calculate the filters for currencies
    let sqlCurrency = "";
    param = queryStrJSON.curStartDateFrom || "";
    if (param !== "")
        sqlCurrency += ` AND CAST(substr(CUR.cur_start,1,4) AS INTEGER) >= ${param}`;

    param = queryStrJSON.curStartDateTo || "";
    if (param !== "")
        sqlCurrency += ` AND CAST(substr(CUR.cur_start,1,4) AS INTEGER) <= ${param}`;

    param = queryStrJSON.curEndDateFrom || "";
    if (param !== "")
        sqlCurrency += ` AND CAST(substr(CUR.cur_end,1,4) AS INTEGER) >= ${param}`;

    param = queryStrJSON.curEndDateTo || "";
    if (param !== "")
        sqlCurrency += ` AND CAST(substr(CUR.cur_end,1,4) AS INTEGER) <= ${param}`;

    // Calculate the filters for banknotes
    let sqlBanknote = "";
    param = queryStrJSON.minDenom || "";
    if (param !== "")
        sqlBanknote = `WHERE denomination >= ${param}`;
    param = queryStrJSON.maxDenom || "";
    if (param !== "") {
        if (sqlBanknote === "")
            sqlBanknote = `WHERE denomination <= ${param}`;
        else
            sqlBanknote += ` AND denomination <= ${param}`;
    }
    param = queryStrJSON.issueDateFrom || "";
    if (param !== "")
        if (sqlBanknote === "")
            sqlBanknote = `WHERE issueYear >= ${param}`;
        else
            sqlBanknote += ` AND issueYear >= ${param}`;
    param = queryStrJSON.issueDateTo || "";
    if (param !== "") {
        if (sqlBanknote === "")
            sqlBanknote = `WHERE issueYear <= ${param}`;
        else
            sqlBanknote += ` AND issueYear <= ${param}`;
    }

    // If the 3 sql filters are "" (and therefore they are equal)
    if (sqlTerritory === sqlCurrency && sqlBanknote === sqlCurrency) {
        let exception = new Exception(400, "ITE-001", "Search parameters not found");
        exception.send(response);
        return;
    }


    let sqlStr = `  SELECT BVA.bva_cat_id AS catalogueId, CASE WHEN BAN.ban_cus_id = 0 THEN BAN.ban_face_value ELSE BAN.ban_face_value / CUS.cus_value END AS denomination,
                            BVA.bva_issue_year AS issueYear, BVA.bva_printed_date AS printedDate, SER.ser_id AS seriesId, SER.ser_name AS seriesName, 
                            CUR.cur_id AS currencyId, CUR.cur_name AS currencyName, TER.ter_id AS territoryId, TER.ter_name AS territoryName,
                            BIT.bit_gra_grade AS grade, BIT.bit_price AS price
                    FROM bva_variant BVA 
					LEFT JOIN bit_item BIT ON BIT.bit_bva_id = BVA.bva_id
                    INNER JOIN ban_banknote BAN ON BVA.bva_ban_id = BAN.ban_id
                    INNER JOIN cus_currency_unit CUS ON BAN.ban_cus_id = CUS.cus_id
                    INNER JOIN ser_series SER ON BAN.ban_ser_id = SER.ser_id
                    INNER JOIN cur_currency CUR ON SER.ser_cur_id = CUR.cur_id ${sqlCurrency}
                    INNER JOIN tec_territory_currency TEC ON CUR.cur_id = TEC.tec_cur_id AND TEC.tec_cur_type = "OWNED"
                    INNER JOIN ter_territory TER ON TEC.tec_ter_id = TER.ter_id ${sqlTerritory}
                    ${sqlBanknote}`;

    catalogueDB.all(sqlStr, [], (err, rows) => {
        if (err) {
            let exception = new Exception(500, err.code, err.message);
            exception.send(response);
            return;
        }

        if (rows.length > 500) {
            let exception = new Exception(413, "ITE-002", "Too many variants found: " + rows.length);
            exception.send(response);
            return;
        }

        // Build reply JSON
        response.writeHead(200, { 'Content-Type': 'application/json' });
        response.write(JSON.stringify(rows));
        response.send();
    });
}



// let commonSelect = `(ter_end > ?1 OR ter_end is NULL) AS existing, count(DISTINCT ter_name) AS count
//                     FROM usr_user, bit_item, bva_variant, ban_banknote, ser_series, cur_currency, tec_territory_currency, ter_territory
//                     WHERE usr_name = ?2
//                     AND bit_usr_id = usr_id
//                     AND bit_bva_id = bva_id
//                     AND bva_ban_id = ban_id
//                     AND ban_ser_id = ser_id
//                     AND ser_cur_id = cur_id
//                     AND cur_id = tec_cur_id
//                     AND tec_ter_id = ter_id
//                     AND tec_cur_type='OWNED'
//                     AND ter_start <= ?1`;
// var sqlCountriesInCollecStats =
//     `SELECT ter_con_id, ter_tty_id, ${commonSelect}
//     GROUP BY ter_con_id, ter_tty_id, existing
//     UNION
//     SELECT ter_con_id, 0 AS ter_tty_id, ${commonSelect}
//     GROUP BY ter_con_id, existing
//     UNION
//     SELECT 0 AS ter_con_id, ter_tty_id, ${commonSelect}
//     GROUP BY ter_tty_id, existing
//     UNION
//     SELECT 0 AS ter_con_id, 0 AS ter_tty_id, ${commonSelect}
//     GROUP BY existing
//     ORDER BY ter_con_id asc, ter_tty_id asc, existing`;

// // ==> collection/stats?year=<year>'
// module.exports.collectionStatsGET = function(request, response) {
//     let year = url.parse(request.url, true).query.year;

//     if (year === undefined || year === '')
//         year = new Date().getFullYear();

//     logger.debug("Year: " + year);

//     db.all(sqlCountriesInCollecStats, [year, request.session.user], (err, rows) => {
//         if (err) {
//             let exception = new Exception(500, err.code, err.message);
//             exception.send(response);
//             return;
//         }

//         // Build reply JSON: [ {contId, [ type = {Id, existing, extinct}]}], ID=0 is the total
//         let replyJSON = [];
//         if (rows.length) {
//             let tty = { "id": 0, "existing": 0, "extinct": 0 };
//             let ttyArray = [];
//             let contId = rows[0].ter_con_id;
//             let ttyId = rows[0].ter_tty_id;
//             tty.id = ttyId;
//             let row;
//             for (row of rows) {
//                 if (row.ter_con_id !== contId) {
//                     //Add Continent and reset
//                     ttyArray.push({ "id": tty.id, "existing": tty.existing, "extinct": tty.extinct });
//                     replyJSON.push({ "continentId": contId, "territoryTypes": ttyArray });
//                     contId = row.ter_con_id;
//                     ttyId = row.ter_tty_id;
//                     ttyArray = [];
//                     tty.id = ttyId;
//                     tty.existing = 0;
//                     tty.extinct = 0;
//                 }
//                 if (row.ter_tty_id !== ttyId) {
//                     // Add tty and reset
//                     ttyId = row.ter_tty_id;
//                     ttyArray.push({ "id": tty.id, "existing": tty.existing, "extinct": tty.extinct });
//                     tty.id = ttyId;
//                     tty.existing = 0;
//                     tty.extinct = 0;
//                 }
//                 if (row.existing) {
//                     tty.existing = row.count;
//                 } else {
//                     tty.extinct = row.count;
//                 }
//             }
//             ttyArray.push(tty);
//             replyJSON.push({ "continentId": contId, "territoryTypes": ttyArray });
//         }

//         var resultJsonStr = JSON.stringify(replyJSON);

//         response.writeHead(200, { 'Content-Type': 'application/json' });
//         response.write(resultJsonStr);
//         response.send();
//     });
// }







// const sqlCurrenciesStats = `
//             SELECT CUR.cur_id AS currencyId, count(DISTINCT(BAN.ban_face_value + BAN.ban_cus_id)) AS numDenom, count(DISTINCT SER.ser_id) AS numSeries, 
//                     count(DISTINCT BAN.ban_id) AS numNotes, count(BVA.bva_id) AS numVariants, sum(BIT.bit_price) AS price
//             FROM tec_territory_currency TEC
//             LEFT JOIN cur_currency CUR ON CUR.cur_id = TEC.tec_cur_id
//             LEFT JOIN ser_series SER ON SER.ser_cur_id = CUR.cur_id
//             LEFT JOIN ban_banknote BAN ON BAN.ban_ser_id = SER.ser_id
//             LEFT JOIN bva_variant BVA ON BVA.bva_ban_id = BAN.ban_id
//             LEFT JOIN bit_item BIT ON bit_bva_id = bva_id
//             INNER JOIN usr_user USR ON USR.usr_id = bit_usr_id AND USR.usr_name = ?2
//             WHERE TEC.tec_ter_id = ?1
//             GROUP BY CUR.cur_id
//             ORDER BY CUR.cur_start
//             `;

// // ==> collection/country/currencies/stats?countryId=<id>'
// module.exports.collectionCountryCurrenciesStatsGET = function(request, response) {
//     // Returns: [{"currencyId":74, "numDenom":2, "numSeries":5,"numNotes":7,"numVariants":20,"price":2.2},
//     //           {"currencyId":75, "numDenom":1, "numSeries":7,"numNotes":7,"numVariants":20,"price":2.1}]
//     let countryId = url.parse(request.url, true).query.countryId;

//     if (countryId === undefined || countryId === '') {
//         let exception = new Exception(400, 'COL-1', 'CountryId not provided');
//         exception.send(response);
//         return;
//     }

//     db.all(sqlCurrenciesStats, [countryId, request.session.user], (err, rows) => {
//         if (err) {
//             let exception = new Exception(500, err.code, err.message);
//             exception.send(response);
//             return;
//         }

//         response.writeHead(200, { 'Content-Type': 'application/json' });
//         response.write(JSON.stringify(rows));
//         response.send();
//     });
// }


// const sqlCurrencySeriesStats = `
//     		SELECT SER.ser_id AS id, count(DISTINCT BAN.ban_id) AS numNotes, count(BVA.bva_id) AS numVariants, sum(BIT.bit_price) AS price
//             FROM cur_currency CUR
//             LEFT JOIN ser_series SER ON SER.ser_cur_id = CUR.cur_id
//             LEFT JOIN ban_banknote BAN ON BAN.ban_ser_id = SER.ser_id
//             LEFT JOIN bva_variant BVA ON BVA.bva_ban_id = BAN.ban_id
//             INNER JOIN bit_item BIT ON bit_bva_id = bva_id
//             INNER JOIN usr_user USR ON USR.usr_id = bit_usr_id AND USR.usr_name = ?2
//             WHERE CUR.cur_id = ?1
//             GROUP BY SER.ser_id
//             `;

// // ==> collection/currency/series/stats?currencyId=<id>'
// module.exports.collectionCurrencySeriesStatsGET = function(request, response) {
//     // Returns: [{"id":5,"numNotes":7,"numVariants":20,"price":2.2},{"id":6,"numNotes":6,"numVariants":6,"price":12.2}]
//     let currencyId = url.parse(request.url, true).query.currencyId;

//     if (currencyId === undefined || currencyId === '') {
//         let exception = new Exception(400, 'COL-1', 'currencyId not provided');
//         exception.send(response);
//         return;
//     }

//     db.all(sqlCurrencySeriesStats, [currencyId, request.session.user], (err, rows) => {
//         if (err) {
//             let exception = new Exception(500, err.code, err.message);
//             exception.send(response);
//             return;
//         }

//         response.writeHead(200, { 'Content-Type': 'application/json' });
//         response.write(JSON.stringify(rows));
//         response.send();
//     });
// }



// const sqlSeriesCollection = `
//             SELECT * FROM
//             (SELECT BAN.ban_id, BAN.ban_face_value, UNI.cus_value, BVA.bva_id, BVA.bva_printed_date, BVA.bva_issue_year, BVA.bva_cat_id, BVA.bva_description
//                 FROM ban_banknote BAN
//                 LEFT JOIN cus_currency_unit UNI ON BAN.ban_cus_id = UNI.cus_id
//                 LEFT JOIN bva_variant BVA ON BAN.ban_id = BVA.bva_ban_id
//                 WHERE BAN.ban_ser_id = ?1
//             )
//             LEFT JOIN 
//             (SELECT IT.bit_id, IT.bit_bva_id, IT.bit_quantity, IT.bit_gra_grade, GRA.gra_value, IT.bit_price, IT.bit_seller, IT.bit_purchase_date, IT.bit_description
//                 FROM bit_item IT 
//                 INNER JOIN usr_user USR ON USR.usr_id = IT.bit_usr_id AND USR.usr_name = ?2
//                 INNER JOIN gra_grade GRA ON GRA.gra_grade = IT.bit_gra_grade
//             ) ON bit_bva_id = bva_id
//             ORDER BY ban_face_value, bva_issue_year, bva_printed_date
//             `;

// // ==> /collection/series?seriesId=<id>'
// module.exports.collectionSeriesGET = function(request, response) {
//     // Returns: [{"id":74, "denomination":20, "variants":[{ "id": , "printedDate": , "issueYear": , "catId": , "description": , items: [{id, quantity, grade, gradeValue, price, seller, purchaseDate, description}]}]}]

//     let seriesId = url.parse(request.url, true).query.seriesId;

//     if (seriesId === undefined || seriesId === '') {
//         let exception = new Exception(400, 'COL-1', 'Currency Id not provided');
//         exception.send(response);
//         return;
//     }

//     db.all(sqlSeriesCollection, [seriesId, request.session.user], (err, rows) => {
//         if (err) {
//             let exception = new Exception(500, err.code, err.message);
//             exception.send(response);
//             return;
//         }

//         let variant = {};
//         let variants = [];
//         let denomination = {};
//         let denominations = [];
//         let items = [];
//         let prevDen = 0;
//         let prevVariant = 0;
//         for (let row of rows) {
//             if (row.ban_id !== prevDen) {
//                 if (prevDen !== 0)
//                     denominations.push(denomination);
//                 // Insert denomination info
//                 let den = row.ban_face_value;
//                 if (row.cus_value != null && row.cus_value != 0) {
//                     den /= row.cus_value;
//                 }
//                 denomination = { "id": row.ban_id, "denomination": den, "variants": [] };
//                 prevDen = row.ban_id;
//             }

//             if (row.bva_id != null && row.bva_id !== prevVariant) {
//                 variant = { "id": row.bva_id, "printedDate": row.bva_printed_date, "issueYear": row.bva_issue_year, "catId": row.bva_cat_id, "description": row.bva_description, "items": [] };
//                 prevVariant = row.bva_id;
//                 denomination.variants.push(variant);
//             }

//             if (row.bit_id != null) {
//                 let item = {
//                     "id": row.bit_id,
//                     "quantity": row.bit_quantity,
//                     "grade": row.bit_gra_grade,
//                     "gradeValue": row.gra_value,
//                     "price": row.bit_price,
//                     "seller": row.bit_seller,
//                     "purchaseDate": row.bit_purchaseDate,
//                     "description": row.bit_description
//                 };
//                 denomination.variants[denomination.variants.length - 1].items.push(item);
//             }
//         }
//         denominations.push(denomination);

//         // Sort the denominations by value
//         denominations.sort((a, b) => { return a.denomination - b.denomination; });

//         response.writeHead(200, { 'Content-Type': 'application/json' });
//         response.write(JSON.stringify(denominations));
//         response.send();
//     });

// }



// const sqlGrades = `
//     		SELECT gra_value AS value, gra_grade AS grade, gra_name AS name, gra_description AS description
//             FROM gra_grade
//             ORDER BY value
//             `;

// // ==> /grades'
// module.exports.gradesGET = function(request, response) {

//     db.all(sqlGrades, [], (err, rows) => {
//         if (err) {
//             let exception = new Exception(500, err.code, err.message);
//             exception.send(response);
//             return;
//         }

//         response.writeHead(200, { 'Content-Type': 'application/json' });
//         response.write(JSON.stringify(rows));
//         response.send();
//     });
// }



// let sqlInsertItem = `INSERT INTO bit_item (bit_usr_id, bit_bva_id, bit_quantity, bit_gra_grade, bit_price, bit_seller, bit_purchase_date, bit_description)
//                     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;

// // ==> collection/item'
// module.exports.collectionItemPOST = function(request, response) {
//     // Request: {username, variantId, quantity, grade, price, seller, purchaseDate, description}
//     logger.debug("Insert new item: " + JSON.stringify(request.body))

//     // Check the user and get user id
//     if (request.session.user !== request.body.username) {
//         response.writeHead(403, { 'Content-Type': 'application/json' });
//         response.write(JSON.stringify({ errorCode: "COL-2", errorMsg: "Session not created or expired" }));
//         response.send();
//         return;
//     }
//     getUserId(request.body.username).catch((err) => {
//         response.writeHead(err.status, { 'Content-Type': 'application/json' });
//         response.write(JSON.stringify({ errorCode: err.code, errorMsg: err.message }));
//         response.send();
//     }).then((usrId) => {
//         // Execute the insertion
//         db.run(sqlInsertItem, [usrId, request.body.variantId, request.body.quantity, request.body.grade, request.body.price, request.body.seller,
//             request.body.purchaseDate, request.body.description
//         ], function(err) {
//             if (err) {
//                 response.writeHead(500, { 'Content-Type': 'application/json' });
//                 response.write(JSON.stringify({ errorCode: err.errno, errorMsg: err.message }));
//                 response.send();
//                 return;
//             }

//             response.writeHead(200);
//             response.send();
//         });
//     });
// }

// let sqlUpdateItem = `UPDATE bit_item 
//                     SET bit_quantity = ?, bit_grade = ?, bit_price = ?, bit_seller = ?, bit_purchase_date = ?, bit_description = ?
//                     WHERE bit_id = ?`;

// // ==> /item'
// module.exports.collectionItemPUT = function(request, response) {
//     // Request: {id, quantity, grade, price, seller, purchaseDate, description}

//     // Check the user and get user id
//     getUserId(username).catch((err) => {
//         response.writeHead(err.status, { 'Content-Type': 'application/json' });
//         response.write(JSON.stringify({ errorCode: err.code, errorMsg: err.message }));
//         response.send();
//     }).then((usrId) => {
//         // Execute the update
//         db.run(sqlUpdateItem, [request.quantity, request.grade, request.price, request.seller,
//             request.purchaseDate, request.description, request.id
//         ], function(err) {
//             if (err) {
//                 response.writeHead(500, { 'Content-Type': 'application/json' });
//                 response.write(JSON.stringify({ errorCode: err.errno, errorMsg: err.message }));
//                 response.send();
//                 return;
//             }

//             response.writeHead(200);
//             response.send();
//         });
//     });
// }



// let sqlSelectUsr = `SELECT usr_id FROM usr_user
//                     WHERE usr_name = ?`;

// function getUserId(username) {
//     return new Promise((resolve, reject) => {
//         db.get(sqlSelectUsr, [username], (err, row) => {
//             if (err) {
//                 if (err) {
//                     logger.error(err.message);
//                     reject({ status: 500, code: err.code, message: err.message });
//                 }
//             }

//             console.log(row);

//             if (row === undefined) {
//                 reject({ status: 400, code: "COL-1", message: "User does not exist!" });
//             } else {
//                 resolve(row.usr_id);
//             }
//         });
//     });
// }