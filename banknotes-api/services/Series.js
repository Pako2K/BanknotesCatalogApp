"use strict";

const log = require("../../utils/logger").logger;
const Exception = require('../../utils/Exception').Exception;
const dbs = require('../../db-connections');

let catalogueDB;


module.exports.initialize = function(app) {
    catalogueDB = dbs.getDBConnection('catalogueDB');

    app.get('/currency/:currencyId/series', currencyByIdSeriesGET);

    log.debug("Series service initialized");
};

// ===> /currency/<ID>/series
function currencyByIdSeriesGET(request, response) {
    let currencyId = request.params.currencyId;

    let sql = ` SELECT SER.ser_id AS id, SER.ser_name AS name, SER.ser_start AS start, SER.ser_end AS end,
                        count(DISTINCT(BAN.ban_face_value + BAN.ban_cus_id)) AS "numDenominations", 
                        count(DISTINCT BAN.ban_id) AS "numNotes", count(BVA.bva_id) AS "numVariants"
                FROM ser_series SER
                INNER JOIN cur_currency CUR ON CUR.cur_id = ${currencyId}
                LEFT JOIN ban_banknote BAN ON BAN.ban_ser_id = SER.ser_id
                LEFT JOIN bva_variant BVA ON BVA.bva_ban_id = BAN.ban_id
                GROUP BY "start", "end", "name", "id"`;

    catalogueDB.getAndReply(response, sql);
}



// // ===> /currency/series?currencyId=<id>
// module.exports.currencySeriesGET = function(request, response) {
//     console.log(request.url);
//     console.log(url.parse(request.url, true).query);

//     let id = url.parse(request.url, true).query.currencyId;

//     if (id === undefined || id === '') {
//         response.writeHead(400);
//         response.send();
//         return;
//     }

//     db.all(sqlSeries, [id], (err, rows) => {
//         if (err) {
//             response.writeHead(500, { 'Content-Type': 'application/json' });
//             response.write(JSON.stringify({ "Error": err.errno, "ErrorMsg": err.message }));
//             response.send();
//             return;
//         }

//         console.log(rows);

//         let resultJson = [];
//         let row;
//         for (row of rows) {
//             resultJson.push({
//                 "id": row.ser_id,
//                 "name": row.ser_name,
//                 "start": row.ser_start,
//                 "end": row.ser_end,
//                 "issuer": row.ser_issuer,
//                 "lawDate": row.ser_law_date,
//                 "description": row.ser_description
//             });
//         }

//         response.writeHead(200, { 'Content-Type': 'application/json' });
//         response.write(JSON.stringify(resultJson));
//         response.send();
//     });
// }


// let sqlSeriesByID =
//     `SELECT * 
//     FROM ser_series
//     WHERE ser_id = ?`;

// // ===> /series?seriesId=$id
// module.exports.seriesGET = function(request, response) {
//     console.log(request.url);
//     console.log(url.parse(request.url, true).query);

//     let id = url.parse(request.url, true).query.seriesId;

//     if (id === undefined || id === '') {
//         response.writeHead(400);
//         response.send();
//         return;
//     }

//     db.get(sqlSeriesByID, [id], (err, row) => {
//         if (err) {
//             response.writeHead(500, { 'Content-Type': 'application/json' });
//             response.write(JSON.stringify({ "Error": err.errno, "ErrorMsg": err.message }));
//             response.send();
//             return;
//         }

//         console.log(row);

//         let resultJson = {
//             "id": row.ser_id,
//             "name": row.ser_name,
//             "start": row.ser_start,
//             "end": row.ser_end,
//             "issuer": row.ser_issuer,
//             "lawDate": row.ser_law_date,
//             "description": row.ser_description
//         };
//         response.writeHead(200, { 'Content-Type': 'application/json' });
//         response.write(JSON.stringify(resultJson));
//         response.send();
//     });
// }


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