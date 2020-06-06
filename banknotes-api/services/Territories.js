"use strict";

const log = require("../../utils/logger").logger;
const Exception = require('../../utils/Exception').Exception;
const dbs = require('../../db-connections');


let catalogueDB;

module.exports.initialize = function(app) {
    catalogueDB = dbs.getDBConnection('catalogueDB');

    app.get('/continents', continentsGET);
    app.get('/territory-types', territoryTypesGET);
    app.get('/territories/stats', territoriesStatsGET);
    app.get('/territory/:territoryId', territoryByIdGET);

    log.debug("Territories service initialized");
};


// ===> /continents
function continentsGET(request, response) {
    const sql = `SELECT con_id as id, con_name as name 
                            FROM con_continent
                            WHERE con_order NOTNULL
                            ORDER BY con_order`;

    catalogueDB.getAndReply(response, sql);
}


// ===> /territory-types
function territoryTypesGET(request, response) {
    let sql = `SELECT  tty_id AS id, tty_name AS name, tty_abbr AS abbrevation, tty_desc AS description
                FROM tty_territory_type
                WHERE tty_order NOTNULL
                ORDER BY tty_order`;

    catalogueDB.getAndReply(response, sql);
}



// ===> /territories/stats
function territoriesStatsGET(request, response) {
    let sql = ` SELECT  TER.ter_id AS "id", TER.ter_con_id AS "continentId", TER.ter_tty_id AS "territoryTypeId", 
                                TER.ter_iso3 AS "iso3", TER.ter_name AS "name", TER.ter_start AS "start", TER.ter_end AS "end", 
                                count(DISTINCT TEC.tec_cur_id) AS "numCurrencies", count (DISTINCT SER.ser_id) AS "numSeries", 
                                count(DISTINCT(BAN.ban_face_value + BAN.ban_cus_id)) AS "numDenominations", 
                                count(DISTINCT BAN.ban_id) AS "numNotes", count(BVA.bva_id) AS "numVariants"
                            FROM ter_territory TER
                            LEFT JOIN tec_territory_currency TEC ON (TEC.tec_ter_id = TER.ter_id AND TEC.tec_cur_type='OWNED')
                            LEFT JOIN ser_series SER ON SER.ser_cur_id = TEC.tec_cur_id
                            LEFT JOIN ban_banknote BAN ON BAN.ban_ser_id = SER.ser_id
                            LEFT JOIN bva_variant BVA ON BVA.bva_ban_id = BAN.ban_id
                            WHERE TER.ter_con_id <> 1
                            GROUP BY TER.ter_id
                            ORDER BY TER.ter_name`;

    catalogueDB.getAndReply(response, sql);
}


// ===> /territory/{territoryId}
function territoryByIdGET(request, response) {
    let territoryId = request.params.territoryId;

    let sql = ` SELECT TER.*, CON.con_name, TTY.tty_name, TER2.ter_name AS ter_parent_name, TER2.ter_iso3 AS ter_parent_iso3  
                FROM ter_territory TER
                INNER JOIN con_continent CON ON TER.ter_con_id = CON.con_id
                INNER JOIN tty_territory_type TTY ON TER.ter_tty_id = TTY.tty_id
                LEFT OUTER JOIN ter_territory TER2 ON TER.ter_parent_country_id = TER2.ter_id
                WHERE TER.ter_id = ${territoryId}`;

    catalogueDB.execSQL(sql, [], (err, rows) => {
        if (err) {
            new Exception(500, err.code, err.message).send(response);
            return;
        }

        var replyJSON = {};
        let result = rows[0];
        if (result) {
            // Build reply JSON
            replyJSON.id = result.ter_id;
            replyJSON.continent = { "id": result.ter_con_id, "name": result.con_name };
            replyJSON.territoryType = { "id": result.ter_tty_id, "name": result.tty_name };
            if (result.ter_iso2)
                replyJSON.iso2 = result.ter_iso2;
            if (result.ter_iso3)
                replyJSON.iso3 = result.ter_iso3;
            replyJSON.name = result.ter_name;
            replyJSON.officialName = result.ter_official_name;
            replyJSON.start = result.ter_start;
            if (result.ter_end)
                replyJSON.end = result.ter_end;
            replyJSON.officialName = result.ter_official_name;
            if (result.ter_parent_country_id)
                replyJSON.parent = { "id": result.ter_parent_country_id, "name": result.ter_parent_name, "iso3": result.ter_parent_iso3 };
            replyJSON.description = result.ter_description;

            let succesorsStr = result.ter_successor_id;
            let sql = "";
            let succesors = [];
            if (succesorsStr) {
                succesors = succesorsStr.split(",");
                sql = ` SELECT 'SUC' AS type, ter_id, ter_name, ter_iso3 
                        FROM ter_territory 
                        WHERE ter_id in (${succesorsStr})
                        UNION
                        `;
            }
            sql += `SELECT 'PRE' AS type, ter_id, ter_name, ter_iso3 
                    FROM ter_territory 
                    WHERE ter_successor_id = '${result.ter_id}' 
                    OR ter_successor_id like '%,${result.ter_id}' 
                    OR ter_successor_id like '${result.ter_id},%' 
                    OR ter_successor_id like '%,${result.ter_id},%'`;

            catalogueDB.execSQL(sql, [], (err, rows) => {
                if (err) {
                    new Exception(500, err.code, err.message).send(response);
                    return;
                }
                replyJSON.predecessors = [];
                replyJSON.successors = [];
                for (let record of rows) {
                    if (record.type === "PRE")
                        replyJSON.predecessors.push({ "id": record.ter_id, "name": record.ter_name, "iso3": record.ter_iso3 });
                    else
                        replyJSON.successors.push({ "id": record.ter_id, "name": record.ter_name, "iso3": record.ter_iso3 });
                }

                if (replyJSON.successors.length < succesors.length) {
                    new Exception(500, "TER-1", "Succesor id not found").send(response);
                    return;
                }

                response.writeHead(200, { 'Content-Type': 'application/json' });
                response.write(JSON.stringify(replyJSON));
                response.send();
            });
        }
    });
}



// let commonSelect = `(ter_end > ?1 OR ter_end is NULL) AS existing, count(DISTINCT ter_id) AS total, 
//                     count(DISTINCT(
//                         CASE tec_cur_type
//                             WHEN 'OWNED' 
//                                 THEN ter_id 
//                             ELSE 
//                                 NULL  
//                         END)) AS countIssuing
//                     FROM ter_territory TER
//                     LEFT JOIN tec_territory_currency TEC ON TEC.tec_ter_id = TER.ter_id
//                     WHERE ter_con_id <> 1
//                     AND ter_start <= ?1 `;

// let sqlCountriesStats = `SELECT ter_con_id, ter_tty_id, ${commonSelect}
//                         GROUP BY ter_con_id, ter_tty_id, existing
//                         UNION
//                         SELECT ter_con_id, 0 as ter_tty_id, ${commonSelect}
//                         GROUP BY ter_con_id, existing 
//                         UNION
//                         SELECT 0 as ter_con_id, ter_tty_id, ${commonSelect}
//                         GROUP BY ter_tty_id, existing
//                         UNION
//                         SELECT 0 as ter_con_id, 0 as ter_tty_id, ${commonSelect}
//                         GROUP BY existing
//                         ORDER BY ter_con_id asc, ter_tty_id asc, existing`;


// // ===> /countries/stats?year=$year
// module.exports.countriesStatsGET = function(request, response) {
//     let year = url.parse(request.url, true).query.year;

//     if (year === undefined || year === '')
//         year = new Date().getFullYear();
//     logger.debug("Year " + year);

//     db.all(sqlCountriesStats, [year], (err, rows) => {
//         if (err) {
//             throw err;
//         }

//         // Build reply JSON
//         var replyJSON = [];
//         var contId = rows[0].ter_con_id;
//         var ttyId = rows[0].ter_tty_id;
//         var tty = { "id": ttyId, "existingTotal": 0, "extinctTotal": 0, "existingIssuing": 0, "extinctIssuing": 0 };
//         var ttyArray = [];
//         var row;
//         for (row of rows) {
//             if (row.ter_con_id !== contId) {
//                 //Add Continent and reset
//                 ttyArray.push(Object.assign({}, tty));
//                 replyJSON.push({ "continentId": contId, "territoryTypes": ttyArray });
//                 contId = row.ter_con_id;
//                 ttyId = row.ter_tty_id;
//                 ttyArray = [];
//                 tty.id = ttyId;
//                 tty.existing = 0;
//                 tty.extinct = 0;
//             }
//             if (row.ter_tty_id !== ttyId) {
//                 // Add tty and reset
//                 ttyId = row.ter_tty_id;
//                 ttyArray.push(Object.assign({}, tty));
//                 tty.id = ttyId;
//                 tty.existingTotal = 0;
//                 tty.existingIssuing = 0;
//                 tty.extinctTotal = 0;
//                 tty.extinctIssuing = 0;
//             }
//             if (row.existing) {
//                 tty.existingTotal = row.total;
//                 tty.existingIssuing = row.countIssuing;
//             } else {
//                 tty.extinctTotal = row.total;
//                 tty.extinctIssuing = row.countIssuing;
//             }
//         }
//         ttyArray.push(tty);
//         replyJSON.push({ "continentId": contId, "territoryTypes": ttyArray });

//         var resultJsonStr = JSON.stringify(replyJSON);

//         response.writeHead(200, { 'Content-Type': 'application/json' });
//         response.write(resultJsonStr);
//         response.send();
//     });
// };