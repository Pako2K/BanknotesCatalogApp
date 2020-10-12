"use strict";

const log = require("../../utils/logger").logger;
const Exception = require('../../utils/Exception').Exception;
const dbs = require('../../db-connections');
const users = require('./Users');


let catalogueDB;

module.exports.initialize = function(app) {
    catalogueDB = dbs.getDBConnection('catalogueDB');

    app.get('/continents', continentsGET);
    app.get('/territory-types', territoryTypesGET);
    app.get('/territory/:territoryId', territoryByIdGET);
    app.get('/territories/variants/stats', addOnlyVariants, territoriesItemsStatsGET);
    app.get('/territories/items/stats', users.validateSessionUser, territoriesItemsStatsGET);

    log.debug("Territories service initialized");
};

function addOnlyVariants(request, response, next) {
    request.onlyVariants = true;
    next();
}


// ===> /continents
function continentsGET(request, response) {
    const sql = `   SELECT con_id as id, con_name as name 
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


// ===> /territory/{territoryId}
function territoryByIdGET(request, response) {
    let territoryId = parseInt(request.params.territoryId);

    // Check that the Id is an integer
    if (Number.isNaN(territoryId) || territoryId.toString() !== request.params.territoryId) {
        new Exception(400, "TER-1", "Invalid Territory Id, " + request.params.territoryId).send(response);
        return;
    }

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
            if (result.ter_iso3) replyJSON.iso3 = result.ter_iso3;
            replyJSON.name = result.ter_name;
            replyJSON.continent = { "id": result.ter_con_id, "name": result.con_name };
            replyJSON.territoryType = { "id": result.ter_tty_id, "name": result.tty_name };
            if (result.ter_iso2) replyJSON.iso2 = result.ter_iso2;
            replyJSON.officialName = result.ter_official_name;
            replyJSON.start = result.ter_start;
            if (result.ter_end) replyJSON.end = result.ter_end;
            if (result.ter_parent_country_id) {
                replyJSON.parent = { "id": result.ter_parent_country_id, "iso3": result.ter_parent_iso3, "name": result.ter_parent_name };
            }
            if (result.ter_description) replyJSON.description = result.ter_description;

            // Retrieve the information for the predecessor and succesor territories
            let succesorsStr = result.ter_successor_id;
            let sql = "";
            let succesors = [];
            if (succesorsStr && succesorsStr !== "") {
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
                let predecesorsArray = [];
                let successorsArray = [];
                for (let record of rows) {
                    let obj = { "id": record.ter_id, "name": record.ter_name }
                    if (record.ter_iso3) obj.iso3 = record.ter_iso3;
                    if (record.type === "PRE") predecesorsArray.push(obj);
                    else successorsArray.push(obj);
                }
                if (predecesorsArray.length) replyJSON.predecessors = predecesorsArray;
                if (successorsArray.length) replyJSON.successors = successorsArray;

                // Check that all the succesor id's exist
                if (successorsArray.length < succesors.length) {
                    new Exception(500, "TER-2", "Data inconsitency. Successor id not found").send(response);
                    return;
                }

                response.writeHead(200, { 'Content-Type': 'application/json' });
                response.write(JSON.stringify(replyJSON));
                response.send();
            });
        } else {
            response.writeHead(200, { 'Content-Type': 'application/json' });
            response.write(JSON.stringify(replyJSON));
            response.send();
        }
    });
}



const territoriesStats_commonSELECT = ` count(DISTINCT TEC.tec_cur_id) AS "numCurrencies", count (DISTINCT SER.ser_id) AS "numSeries", 
                                        count(DISTINCT(BAN.ban_face_value * 10000 + BAN.ban_cus_id)) AS "numDenominations", 
                                        count(DISTINCT BAN.ban_id) AS "numNotes", count(DISTINCT BVA.bva_id) AS "numVariants"`;
const territoriesStats_commonFROM = `FROM ter_territory TER
                                    INNER JOIN con_continent CON ON CON.con_id = TER.ter_con_id AND CON.con_order IS NOT NULL
                                    LEFT JOIN tec_territory_currency TEC ON TEC.tec_ter_id = TER.ter_id AND TEC.tec_cur_type = 'OWNED'
                                    LEFT JOIN iss_issuer ISS ON ISS.iss_ter_id = TEC.tec_ter_id
                                    LEFT JOIN ser_series SER ON ISS.iss_id = SER.ser_iss_id AND SER.ser_cur_id = TEC.tec_cur_id
                                    LEFT JOIN ban_banknote BAN ON BAN.ban_ser_id = SER.ser_id
                                    LEFT JOIN bva_variant BVA ON BVA.bva_ban_id = BAN.ban_id`;
// ===> /territories/items/stats
function territoriesItemsStatsGET(request, response) {
    let sql = ` WITH resultset AS (
                    SELECT  TER.ter_id AS "id", TER.ter_iso3 AS "iso3", TER.ter_name AS "name", TER.ter_con_id AS "continentId", 
                            TER.ter_tty_id AS "territoryTypeId", TER.ter_start AS "start", TER.ter_end AS "end", 
                            ${territoriesStats_commonSELECT}
                    ${territoriesStats_commonFROM}
                    GROUP BY TER.ter_id
                    UNION
                    SELECT  TER.ter_id AS "id", TER.ter_iso3 AS "iso3", TER.ter_name AS "name", TER.ter_con_id AS "continentId", 
                            TER.ter_tty_id AS "territoryTypeId", TER.ter_start AS "start", TER.ter_end AS "end", 
                            ${territoriesStats_commonSELECT}
                    FROM ter_territory TER
                    INNER JOIN con_continent CON ON CON.con_id = TER.ter_con_id AND CON.con_order IS NOT NULL
                    LEFT JOIN tec_territory_currency TEC ON TEC.tec_ter_id = TER.ter_id AND TEC.tec_cur_type = 'SHARED'
                    LEFT JOIN ser_series SER ON SER.ser_cur_id = TEC.tec_cur_id
                    INNER JOIN iss_issuer ISS ON (ISS.iss_id = SER.ser_iss_id AND ISS.iss_ter_id = TEC.tec_ter_id)
                    LEFT JOIN ban_banknote BAN ON BAN.ban_ser_id = SER.ser_id
                    LEFT JOIN bva_variant BVA ON BVA.bva_ban_id = BAN.ban_id
                    GROUP BY TER.ter_id
                )
                SELECT "id", "iso3","name", "continentId", "territoryTypeId", "start", "end", CAST(sum("numCurrencies") AS INTEGER) AS "numCurrencies",
                        CAST(sum("numSeries") AS INTEGER) AS "numSeries", CAST(sum("numDenominations") AS INTEGER) AS "numDenominations", 
                        CAST(sum("numNotes") AS INTEGER) AS "numNotes", CAST(sum("numVariants") AS INTEGER) AS "numVariants"
                FROM resultset
                GROUP BY "id", "iso3","name", "continentId", "territoryTypeId", "start", "end"
                ORDER BY "id"`;

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

        sql = ` SELECT * FROM ( 
                    SELECT  TER.ter_id AS id, ${territoriesStats_commonSELECT}, sum(BIT.bit_price * BIT.bit_quantity) AS "price"
                    ${territoriesStats_commonFROM}
                    INNER JOIN bit_item BIT ON bit_bva_id = bva_id
                    INNER JOIN usr_user USR ON USR.usr_id = bit_usr_id AND USR.usr_name = $1
                    GROUP BY TER.ter_id
                    UNION
                    SELECT  TER.ter_id AS "id", ${territoriesStats_commonSELECT}, sum(BIT.bit_price * BIT.bit_quantity) AS "price"
                    FROM ter_territory TER
                    INNER JOIN con_continent CON ON CON.con_id = TER.ter_con_id AND CON.con_order IS NOT NULL
                    LEFT JOIN tec_territory_currency TEC ON TEC.tec_ter_id = TER.ter_id AND TEC.tec_cur_type = 'SHARED'
                    LEFT JOIN ser_series SER ON SER.ser_cur_id = TEC.tec_cur_id
                    INNER JOIN iss_issuer ISS ON (ISS.iss_id = SER.ser_iss_id AND ISS.iss_ter_id = TEC.tec_ter_id)
                    LEFT JOIN ban_banknote BAN ON BAN.ban_ser_id = SER.ser_id
                    LEFT JOIN bva_variant BVA ON BVA.bva_ban_id = BAN.ban_id
                    INNER JOIN bit_item BIT ON bit_bva_id = bva_id
                    INNER JOIN usr_user USR ON USR.usr_id = bit_usr_id AND USR.usr_name = $1
                    GROUP BY TER.ter_id
                ) AS stats ORDER BY "id"`;

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
                    row.collectionStats.price = colRows[collecIndex].price.toFixed(2);
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