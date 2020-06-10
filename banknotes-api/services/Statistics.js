"use strict";

const log = require("../../utils/logger").logger;
const Exception = require('../../utils/Exception').Exception;
const dbs = require('../../db-connections');
const users = require('./Users');


let catalogueDB;

module.exports.initialize = function(app) {
    catalogueDB = dbs.getDBConnection('catalogueDB');

    app.get('/territories/variants/stats', territoriesVariantsStatsGET);
    app.get('/territories/items/stats', users.validateSessionUser, territoriesItemsStatsGET);

    log.debug("Statistics service initialized");
};


const territoriesStats_commonSELECT = ` count(DISTINCT TEC.tec_cur_id) AS "numCurrencies", count (DISTINCT SER.ser_id) AS "numSeries", 
                                        count(DISTINCT(BAN.ban_face_value + BAN.ban_cus_id)) AS "numDenominations", 
                                        count(DISTINCT BAN.ban_id) AS "numNotes", count(BVA.bva_id) AS "numVariants"`;
const territoriesStats_commonFROM = `FROM ter_territory TER
                                    INNER JOIN con_continent CON ON CON.con_id = TER.ter_con_id AND CON.con_order IS NOT NULL
                                    LEFT JOIN tec_territory_currency TEC ON (TEC.tec_ter_id = TER.ter_id AND TEC.tec_cur_type='OWNED')
                                    LEFT JOIN ser_series SER ON SER.ser_cur_id = TEC.tec_cur_id
                                    LEFT JOIN ban_banknote BAN ON BAN.ban_ser_id = SER.ser_id
                                    LEFT JOIN bva_variant BVA ON BVA.bva_ban_id = BAN.ban_id`;
// ===> /territories/variants/stats
function territoriesVariantsStatsGET(request, response) {
    let sql = ` SELECT  TER.ter_id AS "id", TER.ter_iso3 AS "iso3", TER.ter_name AS "name", TER.ter_con_id AS "continentId", 
                        TER.ter_tty_id AS "territoryTypeId", TER.ter_start AS "start", TER.ter_end AS "end", 
                        ${territoriesStats_commonSELECT}
                ${territoriesStats_commonFROM}
                GROUP BY TER.ter_id
                ORDER BY TER.ter_name`;

    catalogueDB.getAndReply(response, sql);
}



// ===> /territories/items/stats
function territoriesItemsStatsGET(request, response) {
    let sql = ` SELECT  TER.ter_id AS "id", TER.ter_iso3 AS "iso3", TER.ter_name AS "name", TER.ter_con_id AS "continentId", 
                        TER.ter_tty_id AS "territoryTypeId", TER.ter_start AS "start", TER.ter_end AS "end", 
                        ${territoriesStats_commonSELECT}
                ${territoriesStats_commonFROM}
                GROUP BY TER.ter_id
                ORDER BY TER.ter_name`;

    // Retrieve the catalogue statistics
    catalogueDB.execSQL(sql, [], (err, catRows) => {
        if (err) {
            err.message += `\nSQL Query: ${sql}`;
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
                err.message += `\nSQL Query: ${sql}`;
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
                    row.collectionStats.numNotes = colRows[collecIndex].numNotes;
                    row.collectionStats.numVariants = colRows[collecIndex].numVariants;
                    row.collectionStats.numDenominations = colRows[collecIndex].numDenominations;
                    row.collectionStats.price = colRows[collecIndex].price;
                    collecIndex++;
                } else {
                    row.collectionStats.numCurrencies = 0;
                    row.collectionStats.numSeries = 0;
                    row.collectionStats.numNotes = 0;
                    row.collectionStats.numVariants = 0;
                    row.collectionStats.numDenominations = 0;
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



// // ==> items/stats?grouping=<grouping>&fromYear&toYear'
// function itemsStatsGET(request, response) {
//     let grouping = url.parse(request.url, true).query.grouping;
//     const GROUPINGS = ['territory', 'currency', 'denomination', 'year'];
//     if (grouping === undefined || grouping === '' || GROUPINGS.indexOf(grouping) === -1) {
//         // Invalid parameter
//         new Exception(400, "ITEM-1", "Query parameter missing or not valid").send(response);
//         return;
//     }

//     let sqlStats = "";
//     switch (grouping) {
//         case "territory":
//             sqlStats = `SELECT TER.ter_id AS id, count(DISTINCT TEC.tec_cur_id) AS "numCurrencies", count (DISTINCT SER.ser_id) AS "numSeries", 
//                             count(DISTINCT(BAN.ban_face_value + BAN.ban_cus_id)) AS "numDenominations", count(DISTINCT BAN.ban_id) AS "numNotes", 
//                             count(BVA.bva_id) AS "numVariants", sum(BIT.bit_price) AS "price"
//                             FROM ter_territory TER
//                             LEFT JOIN tec_territory_currency TEC ON (TEC.tec_ter_id = TER.ter_id AND TEC.tec_cur_type='OWNED')
//                             LEFT JOIN ser_series SER ON SER.ser_cur_id = TEC.tec_cur_id
//                             LEFT JOIN ban_banknote BAN ON BAN.ban_ser_id = SER.ser_id
//                             LEFT JOIN bva_variant BVA ON BVA.bva_ban_id = BAN.ban_id
//                             INNER JOIN bit_item BIT ON bit_bva_id = bva_id
//                             INNER JOIN usr_user USR ON USR.usr_id = bit_usr_id AND USR.usr_name = $1
//                             WHERE TER.ter_con_id <> 1
//                             GROUP BY TER.ter_id
//                             ORDER BY TER.ter_name`;
//             break;

//         case "currency":
//             sqlStats = `SELECT CUR.cur_id AS id, count (DISTINCT SER.ser_id) AS "numSeries", count(DISTINCT(BAN.ban_face_value + BAN.ban_cus_id)) AS "numDenominations", 
//                             count(DISTINCT BAN.ban_id) AS "numNotes", count(BVA.bva_id) AS "numVariants", sum(BIT.bit_price) AS "price"
//                             FROM cur_currency CUR
//                             LEFT JOIN ser_series SER ON SER.ser_cur_id = CUR.cur_id
//                             LEFT JOIN ban_banknote BAN ON BAN.ban_ser_id = SER.ser_id
//                             LEFT JOIN bva_variant BVA ON BVA.bva_ban_id = BAN.ban_id
//                             INNER JOIN bit_item BIT ON BIT.bit_bva_id = BVA.bva_id
//                             INNER JOIN usr_user USR ON USR.usr_id = BIT.bit_usr_id AND USR.usr_name = $1
//                             GROUP BY CUR.cur_id
//                             ORDER BY CUR.cur_name`;
//             break;

//         case "denomination":
//             let yearFilter = "";

//             let fromYear = parseInt(url.parse(request.url, true).query.fromYear);
//             if (!isNaN(fromYear))
//                 yearFilter = `AND BVA.bva_issue_year >= ${fromYear}`;

//             let toYear = parseInt(url.parse(request.url, true).query.toYear);
//             if (!isNaN(toYear))
//                 yearFilter += ` AND BVA.bva_issue_year <= ${toYear}`;

//             sqlStats = `SELECT  CASE WHEN BAN.ban_cus_id = 0 THEN BAN.ban_face_value ELSE BAN.ban_face_value / CUS.cus_value END AS "denomination",
//                                 count (DISTINCT TER.ter_id) AS "numTerritories", count (DISTINCT CUR.cur_id) AS "numCurrencies",
//                                 count (DISTINCT SER.ser_id) AS "numSeries", count(BVA.bva_id) AS "numVariants", sum(BIT.bit_price) AS "price"
//                         FROM ban_banknote BAN
//                         LEFT JOIN ser_series SER ON BAN.ban_ser_id = SER.ser_id
//                         LEFT JOIN cur_currency CUR ON SER.ser_cur_id = CUR.cur_id
//                         LEFT JOIN tec_territory_currency TEC ON (TEC.tec_cur_id = CUR.cur_id AND TEC.tec_cur_type='OWNED')
//                         LEFT JOIN ter_territory TER ON (TER.ter_id = TEC.tec_ter_id AND TER.ter_con_id <> 1)
//                         INNER JOIN bva_variant BVA ON BVA.bva_ban_id = BAN.ban_id ${yearFilter}
//                         LEFT JOIN cus_currency_unit CUS ON CUS.cus_id = BAN.ban_cus_id
//                         INNER JOIN bit_item BIT ON BIT.bit_bva_id = BVA.bva_id
//                         INNER JOIN usr_user USR ON USR.usr_id = BIT.bit_usr_id AND USR.usr_name = $1
//                         GROUP BY denomination`;
//             break;
//         case "year":
//             sqlStats = `SELECT  BVA.bva_issue_year AS "issueYear",
//                                 TER.ter_con_id AS "continentId", count (DISTINCT TER.ter_id) AS "numTerritories", 
//                                 count (DISTINCT CUR.cur_id) AS "numCurrencies", count (DISTINCT SER.ser_id) AS "numSeries", 
//                                 count(DISTINCT(BAN.ban_face_value + BAN.ban_cus_id)) AS "numDenominations", 
//                                 count(DISTINCT BAN.ban_id) AS "numNotes", count(BVA.bva_id) AS "numVariants",
//                                 sum(BIT.bit_price) AS "price"
//                         FROM bva_variant BVA
//                         LEFT JOIN ban_banknote BAN ON BAN.ban_id = BVA.bva_ban_id
//                         LEFT JOIN ser_series SER ON BAN.ban_ser_id = SER.ser_id
//                         LEFT JOIN cur_currency CUR ON SER.ser_cur_id = CUR.cur_id
//                         LEFT JOIN tec_territory_currency TEC ON (TEC.tec_cur_id = CUR.cur_id AND TEC.tec_cur_type='OWNED')
//                         LEFT JOIN ter_territory TER ON (TER.ter_id = TEC.tec_ter_id AND TER.ter_con_id <> 1)
//                         INNER JOIN bit_item BIT ON BIT.bit_bva_id = BVA.bva_id
//                         INNER JOIN usr_user USR ON USR.usr_id = BIT.bit_usr_id AND USR.usr_name = $1
//                         GROUP BY "issueYear", "continentId"`;
//             break;
//     }

//     catalogueDB.execSQL(sqlStats, [request.session.user], (err, rows) => {
//         if (err) {
//             new Exception(500, err.code, err.message).send(response);
//             return;
//         }

//         response.writeHead(200, { 'Content-Type': 'application/json' });
//         response.write(JSON.stringify(rows));
//         response.send();
//     });
// }