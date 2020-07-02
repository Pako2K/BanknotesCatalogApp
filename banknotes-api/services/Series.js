"use strict";

const log = require("../../utils/logger").logger;
const Exception = require('../../utils/Exception').Exception;
const dbs = require('../../db-connections');
const users = require('./Users');

let catalogueDB;


module.exports.initialize = function(app) {
    catalogueDB = dbs.getDBConnection('catalogueDB');

    app.get('/currency/:currencyId/series', currencyByIdSeriesGET);
    app.get('/series/:seriesId/', seriesByIdGET);
    app.get('/territory/:territoryId/series/variants/stats', addOnlyVariants, territoryByIdSeriesItemsStatsGET);
    app.get('/territory/:territoryId/series/items/stats', users.validateSessionUser, territoryByIdSeriesItemsStatsGET);
    app.get('/currency/:currencyId/series/variants/stats', addOnlyVariants, currencyByIdSeriesItemsStatsGET);
    app.get('/currency/:currencyId/series/items/stats', users.validateSessionUser, currencyByIdSeriesItemsStatsGET);

    log.debug("Series service initialized");
};


function addOnlyVariants(request, response, next) {
    request.onlyVariants = true;
    next();
}


// ===> /currency/:currencyId/series
function currencyByIdSeriesGET(request, response) {
    let currencyId = parseInt(request.params.currencyId);

    // Check that the Id is an integer
    if (Number.isNaN(currencyId) || currencyId.toString() !== request.params.currencyId) {
        new Exception(400, "SER-1", "Invalid Currency Id, " + request.params.currencyId).send(response);
        return;
    }

    let sql = `SELECT ser_id AS "id", ser_name AS "name", ser_start AS "start", ser_end AS "end"
                FROM ser_series
                WHERE ser_cur_id = ${currencyId}
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

    let sql = ` SELECT ser_id AS "id", ser_name AS "name", ser_start AS "start", ser_end AS "end", ser_issuer AS "issuer", 
                    ser_law_date AS "lawDate", ser_description AS "description"
                FROM ser_series
                WHERE ser_id = ${seriesId}`;

    catalogueDB.getAndReply(response, sql);
}




const seriesStats_commonSELECT =
    `SER.ser_id AS "id", count(DISTINCT(BAN.ban_face_value + BAN.ban_cus_id)) AS "numDenominations", 
    count(DISTINCT BVA.bva_id) AS "numVariants"`;

const territorySerieStats_commonFROM =
    `FROM ser_series SER
    INNER JOIN tec_territory_currency TEC ON TEC.tec_ter_id = $1 AND SER.ser_cur_id = TEC.tec_cur_id AND TEC.tec_cur_type='OWNED'
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




const currencySeriesStats_commonFROM =
    `FROM ser_series SER
    LEFT JOIN ban_banknote BAN ON BAN.ban_ser_id = SER.ser_id
    LEFT JOIN bva_variant BVA ON BVA.bva_ban_id = BAN.ban_id`;

// ===> /currency/:currencyId/series/items/stats
function currencyByIdSeriesItemsStatsGET(request, response) {
    let currencyId = request.params.currencyId;

    // Check that the Id is an integer
    if (Number.isNaN(currencyId) || currencyId.toString() !== request.params.currencyId) {
        new Exception(400, "VAR-1", "Invalid Currency Id, " + request.params.currencyId).send(response);
        return;
    }

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



// let sqlInsertSeries = `INSERT INTO ser_series(ser_cur_id, ser_name, ser_start, ser_end, ser_issuer, ser_law_date, ser_description) 
//                        VALUES (?, ?, ?, ?, ?, ?, ?)`;

// // ===> /currency/series
// module.exports.currencySeriesPOST = function(request, response) {
//     console.log(request.url);
//     console.log(request.body);

//     let newSeries = request.body;

//     // Validate fields
//     let errorMsg = "";
//     if (newSeries.currencyId == null || newSeries.currencyId === "")
//         errorMsg = "CurrencyID not provided";
//     if (newSeries.start == null || newSeries.start === "" || Number.isNaN(Number(newSeries.start)))
//         errorMsg = "Start year not provided or invalid";
//     if (newSeries.end != null && (Number.isNaN(Number(newSeries.end))))
//         errorMsg = "End year is invalid";
//     if (newSeries.issuer == null || newSeries.issuer === "")
//         errorMsg = "Issuer not provided or invalid";

//     if (errorMsg !== "") {
//         response.writeHead(500, { 'Content-Type': 'application/json' });
//         response.write(JSON.stringify({ "ErrorMsg": errorMsg }));
//         response.send();
//         return;
//     }


//     db.run(sqlInsertSeries, [newSeries.currencyId, newSeries.name, newSeries.start, newSeries.end,
//         newSeries.issuer, newSeries.lawDate, newSeries.description
//     ], function(err) {
//         if (err) {
//             response.writeHead(500, { 'Content-Type': 'application/json' });
//             response.write(JSON.stringify({ "Error": err.errno, "ErrorMsg": err.message }));
//             response.send();
//             return;
//         }

//         response.writeHead(200);
//         response.send();
//     });
// }


// let sqlUpdateSeries = `UPDATE ser_series
//                        SET ser_name = ?, ser_start = ?, ser_end = ?, ser_issuer = ?, ser_law_date = ?, ser_description = ? 
//                        WHERE ser_id = ?`;

// // ===> /series
// module.exports.seriesPUT = function(request, response) {
//     console.log(request.url);
//     console.log(request.body);

//     let series = request.body;

//     // Validate fields
//     let errorMsg = "";
//     if (series.start == null || series.start === "" || Number.isNaN(Number(series.start)))
//         errorMsg = "Start year not provided or invalid";
//     if (series.end != null && (Number.isNaN(Number(series.end))))
//         errorMsg = "End year is invalid";
//     if (series.issuer == null || series.issuer === "")
//         errorMsg = "Issuer not provided or invalid";

//     if (errorMsg !== "") {
//         response.writeHead(500, { 'Content-Type': 'application/json' });
//         response.write(JSON.stringify({ "ErrorMsg": errorMsg }));
//         response.send();
//         return;
//     }


//     db.run(sqlUpdateSeries, [series.name, series.start, series.end, series.issuer, series.lawDate, series.description, series.id], function(err) {
//         if (err) {
//             response.writeHead(500, { 'Content-Type': 'application/json' });
//             response.write(JSON.stringify({ "Error": err.errno, "ErrorMsg": err.message }));
//             response.send();
//             return;
//         }

//         response.writeHead(200);
//         response.send();
//     });
// }