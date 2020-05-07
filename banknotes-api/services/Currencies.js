"use strict";

const log = require("../../utils/logger").logger;
const Exception = require('../../utils/Exception').Exception;
const dbs = require('../../db-connections');


let catalogueDB;


module.exports.initialize = function(app) {
    catalogueDB = dbs.getDBConnection('catalogueDB');

    app.get('/currencies', currenciesGET);
    app.get('/territory/:territoryId/currencies', territoryByIdCurrenciesGET);
    app.get('/currency/:currencyId', currencyByIdGET);

    log.debug("Currencies service initialized");
};


// ===> /currencies
function currenciesGET(request, response) {
    let sql = ` SELECT  CUR.cur_id AS "id", TER.ter_con_id AS "continentId", TER.ter_id AS "territoryId",
                        TER.ter_name AS "territoryName", CASE WHEN TER.ter_tty_id = 2 THEN 'SHARED' ELSE 'OWNED' END AS "currencyType", 
                        CUR.cur_symbol AS "symbol", TEC.tec_ISO3 AS "iso3", CUR.cur_name AS "name", 
                        CUR.cur_start AS "start", CUR.cur_end AS "end", count (DISTINCT SER.ser_id) AS "numSeries", 
                        count(DISTINCT(BAN.ban_face_value + BAN.ban_cus_id)) AS "numDenominations", 
                        count(DISTINCT BAN.ban_id) AS "numNotes", count(BVA.bva_id) AS "numVariants"
                FROM cur_currency CUR
                LEFT JOIN tec_territory_currency TEC ON (TEC.tec_cur_id = CUR.cur_id AND TEC.tec_cur_type='OWNED')
                LEFT JOIN ter_territory TER ON (TER.ter_id = TEC.tec_ter_id AND TER.ter_con_id <> 1)
                LEFT JOIN ser_series SER ON SER.ser_cur_id = TEC.tec_cur_id
                LEFT JOIN ban_banknote BAN ON BAN.ban_ser_id = SER.ser_id
                LEFT JOIN bva_variant BVA ON BVA.bva_ban_id = BAN.ban_id
                GROUP BY "id", "continentId", "territoryId", "territoryName", "currencyType", "iso3"
                ORDER BY "name", "territoryName", "start", "end"`;

    catalogueDB.getAndReply(response, sql);
}

// ===> //territory/:territoryId/currencies
function territoryByIdCurrenciesGET(request, response) {
    let territoryId = request.params.territoryId;

    let sql = `SELECT   CUR.cur_id AS id, TER.ter_con_id AS "continentId", TER.ter_id AS "territoryId",
                        TER.ter_name AS "territoryName", TEC.tec_cur_type AS "currencyType", 
                        CUR.cur_symbol AS "symbol", TEC.tec_ISO3 AS "iso3", CUR.cur_name AS "name", 
                        CUR.cur_start AS "start", CUR.cur_end AS "end", count (DISTINCT SER.ser_id) AS "numSeries", 
                        count(DISTINCT(BAN.ban_face_value + BAN.ban_cus_id)) AS "numDenominations", 
                        count(DISTINCT BAN.ban_id) AS "numNotes", count(BVA.bva_id) AS "numVariants"
                FROM cur_currency CUR
                INNER JOIN tec_territory_currency TEC ON TEC.tec_cur_id = CUR.cur_id AND TEC.tec_ter_id = ${territoryId}
                LEFT JOIN ter_territory TER ON (TER.ter_id = TEC.tec_ter_id)
                LEFT JOIN ser_series SER ON SER.ser_cur_id = TEC.tec_cur_id
                LEFT JOIN ban_banknote BAN ON BAN.ban_ser_id = SER.ser_id
                LEFT JOIN bva_variant BVA ON BVA.bva_ban_id = BAN.ban_id
                GROUP BY id, "continentId","territoryId","territoryName","currencyType","iso3"
                ORDER BY start, end`;

    catalogueDB.getAndReply(response, sql);
}


// ===> /currency/:currencyId
function currencyByIdGET(request, response) {
    let currencyId = request.params.currencyId;

    let sql = ` SELECT cur.*, TEC.tec_iso3, TER.ter_con_id,  CON.con_name, TER.ter_id, TER.ter_iso3, TER.ter_name, CUS.cus_value, CUS.cus_name, CUS.cus_abbreviation,
                        pred.cur_id AS pred_cur_id, pred.cur_name AS pred_cur_name, predTEC.tec_ISO3 AS pred_tec_iso3, pred.cur_replacement_rate AS pred_cur_replacement_rate,
                        succ.cur_name AS succ_cur_name, succTEC.tec_ISO3 AS succ_tec_iso3
                FROM cur_currency CUR
                INNER JOIN tec_territory_currency TEC ON TEC.tec_cur_id = CUR.cur_id AND TEC.tec_cur_type = "OWNED"
                INNER JOIN ter_territory TER ON TEC.tec_ter_id = TER.ter_id
                INNER JOIN con_continent CON ON con_id = TER.ter_con_id
                LEFT JOIN cus_currency_unit CUS ON CUR.cur_id = CUS.cus_cur_id
                LEFT JOIN cur_currency pred ON pred.cur_successor = cur.cur_id
                LEFT JOIN tec_territory_currency predTEC ON predTEC.tec_cur_id = pred.cur_id AND predTEC.tec_cur_type = "OWNED"
                LEFT JOIN cur_currency succ ON succ.cur_id = cur.cur_successor 
                LEFT JOIN tec_territory_currency succTEC ON succTEC.tec_cur_id = succ.cur_id AND succTEC.tec_cur_type = "OWNED"
                WHERE CUR.cur_id = ${currencyId}`;

    catalogueDB.execSQL(sql, [], (err, rows) => {
        if (err) {
            let exception = new Exception(500, err.code, err.message);
            exception.send(response);
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

// let sqlCountryCurrencies =
//     `SELECT * 
//     FROM cur_currency
//     INNER JOIN tec_territory_currency ON cur_id = tec_cur_id
//     WHERE tec_ter_id = ?
//     ORDER BY cur_start`;

// // ===> /country/currencies?countryId=<id>&stats
// module.exports.countryCurrenciesGET = function(request, response) {
//     console.log(request.url);
//     console.log(url.parse(request.url, true).query);

//     let id = url.parse(request.url, true).query.countryId;
//     let stats = url.parse(request.url, true).query.stats;

//     if (id === undefined || id === '') {
//         response.writeHead(400, { 'Content-Type': 'application/json' });
//         response.send();
//         return;
//     }

//     db.all(sqlCountryCurrencies, [id], (err, rows) => {
//         if (err) {
//             throw err;
//         }

//         console.log(JSON.stringify(rows));

//         // If stats are requested
//         let statsJSON;
//         if (stats !== undefined && rows.length) {
//             // List of currencies
//             let curIds = [];
//             rows.forEach((item, index) => { curIds.push(item.cur_id); });
//             console.log(curIds);
//             getCurrenciesStats(curIds, (err, statsJSON) => {
//                 if (err) {
//                     throw err;
//                 }

//                 console.log("stats: ", JSON.stringify(statsJSON));

//                 countryCurrenciesGET_sendReply(rows, statsJSON, response);
//             });
//         } else {
//             countryCurrenciesGET_sendReply(rows, undefined, response);
//         }
//     });
// };


// function countryCurrenciesGET_sendReply(currencies, stats, response) {
//     // Build reply JSON
//     let replyJSON = [];
//     let i;
//     for (i in currencies) {
//         replyJSON.push({ "id": currencies[i].cur_id });
//         if (currencies[i].cur_iso3 != null) {
//             replyJSON[i].iso3 = currencies[i].cur_iso3
//         }
//         replyJSON[i].name = currencies[i].cur_name;
//         replyJSON[i].countryId = currencies[i].tec_ter_id;
//         replyJSON[i].start = currencies[i].cur_start;
//         if (currencies[i].cur_end != null)
//             replyJSON[i].end = currencies[i].cur_end;
//         replyJSON[i].type = currencies[i].tec_cur_type;
//     }

//     if (stats !== undefined) {
//         for (i in stats) {
//             // Find the index of the currency
//             let pos = replyJSON.findIndex((elem) => {
//                 return elem.id === stats[i].currencyId;
//             });
//             // stats = [{currencyId: ?, numDenom: ?, series: [{id: ?, numNotes: ?, numVariants: ?}]}]
//             replyJSON[pos].stats = { "numDenom": stats[i].numDenom, "series": stats[i].series };
//         }
//     }

//     console.log("Reply:" + JSON.stringify(replyJSON));

//     response.writeHead(200, { 'Content-Type': 'application/json' });
//     response.write(JSON.stringify(replyJSON));
//     response.send();
// }



// let sqlCurrencyUnits =
//     `SELECT 0 id,  cur.cur_name name FROM cur_currency cur
//     WHERE cur.cur_id = ?1
//     UNION
//     SELECT cus_id id, cus_name
//     FROM cus_currency_unit
//     WHERE cus_cur_id = ?1`;

// // ===> /currency/units?currencyId=$id
// module.exports.currencyUnitsGET = function(request, response) {
//     console.log(request.url);
//     console.log(url.parse(request.url, true).query);

//     let id = url.parse(request.url, true).query.currencyId;

//     if (id === undefined || id === '') {
//         response.writeHead(400);
//         response.send();
//         return;
//     }

//     db.all(sqlCurrencyUnits, [id], (err, rows) => {
//         if (err) {
//             response.writeHead(500, { 'Content-Type': 'application/json' });
//             response.write(JSON.stringify({ "Error": err.errno, "ErrorMsg": err.message }));
//             response.send();
//             return;
//         }

//         console.log(rows);

//         var resultJsonStr = JSON.stringify(rows);

//         response.writeHead(200, { 'Content-Type': 'application/json' });
//         response.write(resultJsonStr);
//         response.send();
//     });
// };


// //////////////////////////////////////////////////////////////////////////////////////
// /// STATS ///
// //////////////////////////////////////////////////////////////////////////////////////
// function getCurrenciesStats(curIds, callbackFn) {
//     // result = [{currencyId: ?, numDenom: ?, series: [{id: ?, numNotes: ?, numVariants: ?}]}]
//     let result = [];

//     let error;

//     if (curIds.length === 0)
//         callbackFn(error, result);

//     // Only when the synchronizer has reached 2 can the result be sent back through the callback
//     let synchronizer = 0;
//     const FINAL = 2;

//     let listCurIds = curIds.join(",");

//     let series = [];
//     curIds.forEach((elem, index) => {
//         result.push({ "currencyId": elem, "numDenom": 0, "series": series });
//     });

//     // Get series stats
//     const sqlSeriesStats = `
//             SELECT SER.ser_cur_id, SER.ser_id, count(DISTINCT BAN.ban_id) numNotes, count(BVA.bva_id) numVariants
//             FROM ser_series SER
//             LEFT JOIN ban_banknote BAN ON BAN.ban_ser_id = SER.ser_id
//             LEFT JOIN bva_variant BVA ON BVA.bva_ban_id = BAN.ban_id
//             WHERE SER.ser_cur_id IN (?)
//             GROUP BY ser_cur_id, SER.ser_id
//             `;
//     db.all(sqlSeriesStats, [listCurIds], (err, rows) => {
//         if (err) {
//             console.log(err);
//             if (error === undefined) {
//                 error = err;
//                 callbackFn(err);
//             }
//         }

//         console.log("Stats Series:" + JSON.stringify(rows));

//         let pos;
//         for (let row of rows) {
//             // find currency index
//             pos = result.findIndex((value) => {
//                 return value.currencyId == row.ser_cur_id;
//             });
//             result[pos].series.push({ "id": row.ser_id, "numNotes": row.numNotes, "numVariants": row.numVariants });
//         }

//         synchronizer += 1;

//         if (synchronizer === FINAL) {
//             callbackFn(error, result);
//         }
//     });


//     // In parallel, get number of denominations per currency
//     const sqlDenomStats = `
//             SELECT SER.ser_cur_id, count(DISTINCT(BAN.ban_face_value + BAN.ban_cus_id)) numDenom
//             FROM ser_series SER
//             LEFT JOIN ban_banknote BAN ON BAN.ban_ser_id = SER.ser_id
//             LEFT JOIN bva_variant BVA ON BVA.bva_ban_id = BAN.ban_id
//             WHERE SER.ser_cur_id IN (?)
//             GROUP BY ser_cur_id
//             `;

//     db.all(sqlDenomStats, [listCurIds], (err, rows) => {
//         if (err) {
//             console.log(err);
//             if (error === undefined) {
//                 error = err;
//                 callbackFn(err);
//             }
//         }

//         console.log("Stats Denom: " + JSON.stringify(rows));

//         let pos;
//         for (let row of rows) {
//             // find currency index
//             pos = result.findIndex((value) => {
//                 return value.currencyId == row.ser_cur_id;
//             });
//             result[pos].numDenom = row.numDenom;
//         }

//         synchronizer += 1;
//         if (synchronizer === FINAL) {
//             callbackFn(error, result);
//         }
//     });
// }