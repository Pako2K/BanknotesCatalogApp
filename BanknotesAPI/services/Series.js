"use strict";

let url = require('url');

let db;


module.exports.initialize = function(database) {
    db = database;
};


let sqlSeries =
    `SELECT * 
    FROM ser_series
    INNER JOIN cur_currency ON cur_id = ser_cur_id
    WHERE ser_cur_id = ?
    ORDER BY ser_start`;

// ===> /currency/series?currencyId=<id>
module.exports.currencySeriesGET = function(request, response) {
    console.log(request.url);
    console.log(url.parse(request.url, true).query);

    let id = url.parse(request.url, true).query.currencyId;

    if (id === undefined || id === '') {
        response.writeHead(400);
        response.send();
        return;
    }

    db.all(sqlSeries, [id], (err, rows) => {
        if (err) {
            response.writeHead(500, { 'Content-Type': 'application/json' });
            response.write(JSON.stringify({ "Error": err.errno, "ErrorMsg": err.message }));
            response.send();
            return;
        }

        console.log(rows);

        let resultJson = [];
        let row;
        for (row of rows) {
            resultJson.push({
                "id": row.ser_id,
                "name": row.ser_name,
                "start": row.ser_start,
                "end": row.ser_end,
                "issuer": row.ser_issuer,
                "lawDate": row.ser_law_date,
                "description": row.ser_description
            });
        }

        response.writeHead(200, { 'Content-Type': 'application/json' });
        response.write(JSON.stringify(resultJson));
        response.send();
    });
}


let sqlSeriesByID =
    `SELECT * 
    FROM ser_series
    WHERE ser_id = ?`;

// ===> /series?seriesId=$id
module.exports.seriesGET = function(request, response) {
    console.log(request.url);
    console.log(url.parse(request.url, true).query);

    let id = url.parse(request.url, true).query.seriesId;

    if (id === undefined || id === '') {
        response.writeHead(400);
        response.send();
        return;
    }

    db.get(sqlSeriesByID, [id], (err, row) => {
        if (err) {
            response.writeHead(500, { 'Content-Type': 'application/json' });
            response.write(JSON.stringify({ "Error": err.errno, "ErrorMsg": err.message }));
            response.send();
            return;
        }

        console.log(row);

        let resultJson = {
            "id": row.ser_id,
            "name": row.ser_name,
            "start": row.ser_start,
            "end": row.ser_end,
            "issuer": row.ser_issuer,
            "lawDate": row.ser_law_date,
            "description": row.ser_description
        };
        response.writeHead(200, { 'Content-Type': 'application/json' });
        response.write(JSON.stringify(resultJson));
        response.send();
    });
}


let sqlInsertSeries = `INSERT INTO ser_series(ser_cur_id, ser_name, ser_start, ser_end, ser_issuer, ser_law_date, ser_description) 
                       VALUES (?, ?, ?, ?, ?, ?, ?)`;

// ===> /currency/series
module.exports.currencySeriesPOST = function(request, response) {
    console.log(request.url);
    console.log(request.body);

    let newSeries = request.body;

    // Validate fields
    let errorMsg = "";
    if (newSeries.currencyId == null || newSeries.currencyId === "")
        errorMsg = "CurrencyID not provided";
    if (newSeries.start == null || newSeries.start === "" || Number.isNaN(Number(newSeries.start)))
        errorMsg = "Start year not provided or invalid";
    if (newSeries.end != null && (Number.isNaN(Number(newSeries.end))))
        errorMsg = "End year is invalid";
    if (newSeries.issuer == null || newSeries.issuer === "")
        errorMsg = "Issuer not provided or invalid";

    if (errorMsg !== "") {
        response.writeHead(500, { 'Content-Type': 'application/json' });
        response.write(JSON.stringify({ "ErrorMsg": errorMsg }));
        response.send();
        return;
    }


    db.run(sqlInsertSeries, [newSeries.currencyId, newSeries.name, newSeries.start, newSeries.end,
        newSeries.issuer, newSeries.lawDate, newSeries.description
    ], function(err) {
        if (err) {
            response.writeHead(500, { 'Content-Type': 'application/json' });
            response.write(JSON.stringify({ "Error": err.errno, "ErrorMsg": err.message }));
            response.send();
            return;
        }

        response.writeHead(200);
        response.send();
    });
}


let sqlUpdateSeries = `UPDATE ser_series
                       SET ser_name = ?, ser_start = ?, ser_end = ?, ser_issuer = ?, ser_law_date = ?, ser_description = ? 
                       WHERE ser_id = ?`;

// ===> /series
module.exports.seriesPUT = function(request, response) {
    console.log(request.url);
    console.log(request.body);

    let series = request.body;

    // Validate fields
    let errorMsg = "";
    if (series.start == null || series.start === "" || Number.isNaN(Number(series.start)))
        errorMsg = "Start year not provided or invalid";
    if (series.end != null && (Number.isNaN(Number(series.end))))
        errorMsg = "End year is invalid";
    if (series.issuer == null || series.issuer === "")
        errorMsg = "Issuer not provided or invalid";

    if (errorMsg !== "") {
        response.writeHead(500, { 'Content-Type': 'application/json' });
        response.write(JSON.stringify({ "ErrorMsg": errorMsg }));
        response.send();
        return;
    }


    db.run(sqlUpdateSeries, [series.name, series.start, series.end, series.issuer, series.lawDate, series.description, series.id], function(err) {
        if (err) {
            response.writeHead(500, { 'Content-Type': 'application/json' });
            response.write(JSON.stringify({ "Error": err.errno, "ErrorMsg": err.message }));
            response.send();
            return;
        }

        response.writeHead(200);
        response.send();
    });
}