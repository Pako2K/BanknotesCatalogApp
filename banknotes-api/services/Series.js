"use strict";

const log = require("../../utils/logger").logger;
const Exception = require('../../utils/Exception').Exception;
const dbs = require('../../db-connections');

let catalogueDB;


module.exports.initialize = function(app) {
    catalogueDB = dbs.getDBConnection('catalogueDB');

    app.get('/currency/:currencyId/series', currencyByIdSeriesGET);
    app.get('/series/:seriesId/', seriesByIdGET);

    log.debug("Series service initialized");
};


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