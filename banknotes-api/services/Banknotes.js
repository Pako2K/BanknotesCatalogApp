"use strict";

const url = require('url');
const log = require("../../utils/logger").logger;
const Exception = require('../../utils/Exception').Exception;
const dbs = require('../../db-connections');
const users = require('./Users');

let catalogueDB;


module.exports.initialize = function(app) {
    catalogueDB = dbs.getDBConnection('catalogueDB');

    app.get('/denominations/variants/stats', addOnlyVariants, denominationsItemsStatsGET);
    app.get('/denominations/items/stats', users.validateSessionUser, denominationsItemsStatsGET);
    app.get('/territory/:territoryId/denominations/variants/stats', addOnlyVariants, territoryByIdDenominationsItemsStatsGET);
    app.get('/territory/:territoryId/denominations/items/stats', users.validateSessionUser, territoryByIdDenominationsItemsStatsGET);
    app.get('/currency/:currencyId/denominations/variants/stats', addOnlyVariants, currencyByIdDenominationsItemsStatsGET);
    app.get('/currency/:currencyId/denominations/items/stats', users.validateSessionUser, currencyByIdDenominationsItemsStatsGET);

    log.debug("Banknotes service initialized");
};


function addOnlyVariants(request, response, next) {
    request.onlyVariants = true;
    next();
}


const denominationStats_commonSELECT = ` CASE WHEN BAN.ban_cus_id = 0 THEN BAN.ban_face_value ELSE BAN.ban_face_value / CUS.cus_value END AS "denomination",
                                        count (DISTINCT TER.ter_id) AS "numTerritories", count (DISTINCT CUR.cur_id) AS "numCurrencies",
                                        count (DISTINCT SER.ser_id) AS "numSeries", count(DISTINCT BVA.bva_id) AS "numVariants"`;
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

        sql = `SELECT  ${denominationStats_commonSELECT}, sum(BIT.bit_price * BIT.bit_quantity) AS "price"
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

    // Check that the Id is an integer
    if (Number.isNaN(territoryId) || territoryId.toString() !== request.params.territoryId) {
        new Exception(400, "VAR-1", "Invalid Territory Id, " + request.params.territoryId).send(response);
        return;
    }

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

        sql = ` SELECT ${denominationsStats_commonSELECT}, sum(BIT.bit_price * BIT.bit_quantity) AS "price"
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




const currencyDenominationsStats_commonSELECT =
    `CASE WHEN BAN.ban_cus_id = 0 THEN BAN.ban_face_value ELSE BAN.ban_face_value / CUS.cus_value END AS denomination,
    count (DISTINCT SER.ser_id) AS "numSeries", count(DISTINCT BVA.bva_id) AS "numVariants"`;

const currencyIdDenominationsStats_commonFROM =
    `FROM ban_banknote BAN
    INNER JOIN ser_series SER ON BAN.ban_ser_id = SER.ser_id AND SER.ser_cur_id = $1
    INNER JOIN bva_variant BVA ON BVA.bva_ban_id = BAN.ban_id
    LEFT JOIN cus_currency_unit CUS ON CUS.cus_id = BAN.ban_cus_id`;

// ===> /currencyId/:currencyId/denominations/items/stats
function currencyByIdDenominationsItemsStatsGET(request, response) {
    let currencyId = request.params.currencyId;

    // Check that the Id is an integer
    if (Number.isNaN(currencyId) || currencyId.toString() !== request.params.currencyId) {
        new Exception(400, "VAR-1", "Invalid Currency Id, " + request.params.currencyId).send(response);
        return;
    }

    let sql = ` SELECT  ${currencyDenominationsStats_commonSELECT}
                ${currencyIdDenominationsStats_commonFROM}
                GROUP BY "denomination"`;

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

        sql = ` SELECT ${currencyDenominationsStats_commonSELECT}, sum(BIT.bit_price * BIT.bit_quantity) AS "price"
                ${currencyIdDenominationsStats_commonFROM}
                INNER JOIN bit_item BIT ON BIT.bit_bva_id = BVA.bva_id
                INNER JOIN usr_user USR ON USR.usr_id = BIT.bit_usr_id AND USR.usr_name = $2
                GROUP BY "denomination"`;

        catalogueDB.execSQL(sql, [currencyId, request.session.user], (err, colRows) => {
            if (err) {
                new Exception(500, err.code, err.message).send(response);
                return;
            }

            // Join the collection results into the catalogue statistics
            let collecIndex = 0;
            for (let row of catRows) {
                row.collectionStats = {};
                if (collecIndex < colRows.length && row.denomination === colRows[collecIndex].denomination) {
                    row.collectionStats.numSeries = colRows[collecIndex].numSeries;
                    row.collectionStats.numVariants = colRows[collecIndex].numVariants;
                    row.collectionStats.price = colRows[collecIndex].price;
                    collecIndex++;
                } else {
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






// let sqlInsertNote = `INSERT INTO ban_banknote(ban_ser_id, ban_cus_id, ban_face_value, ban_size_width, ban_size_height,
//                             ban_material, ban_obverse_desc, ban_reverse_desc, ban_description)
//                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;

// // ===> /currency/series/note
// module.exports.currencySeriesNotePOST = function(request, response) {
//     console.log(request.url);
//     console.log(request.body);

//     let newNote = request.body;

//     // Validate fields
//     let errorMsg = "";
//     if (newNote.seriesId == null || newNote.seriesId === "" || Number.isNaN(Number(newNote.seriesId)))
//         errorMsg = "SeriesID not provided";
//     if (newNote.unitId == null || newNote.unitId === "" || Number.isNaN(Number(newNote.unitId)))
//         errorMsg = "Unit not provided or invalid";
//     if (newNote.face_value != null && (Number.isNaN(Number(newNote.face_value))))
//         errorMsg = "Face value is invalid";
//     if (newNote.size_width != null && (Number.isNaN(Number(newNote.size_width))))
//         errorMsg = "Width is invalid";
//     if (newNote.size_height != null && (Number.isNaN(Number(newNote.size_height))))
//         errorMsg = "Height is invalid";
//     if (newNote.material == null || newNote.material === "")
//         errorMsg = "Material not provided";

//     if (errorMsg !== "") {
//         response.writeHead(500, { 'Content-Type': 'application/json' });
//         response.write(JSON.stringify({ "ErrorMsg": errorMsg }));
//         response.send();
//         return;
//     }


//     db.run(sqlInsertNote, [newNote.seriesId, newNote.unitId, newNote.faceValue, newNote.width, newNote.height,
//         newNote.material, newNote.obverseDesc, newNote.reverseDesc, newNote.notes
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




// let sqlUpdateNote = `UPDATE ban_banknote 
//     SET ban_size_width = ?, ban_size_height = ?, ban_material = ?, ban_obverse_desc = ?, ban_reverse_desc = ?, ban_description = ?
//     WHERE ban_id = ?`;

// // ===> /note   (Update Note)
// module.exports.notePUT = function(request, response) {
//     console.log(request.url);
//     console.log(request.body);

//     let note = request.body;

//     // Validate fields
//     let errorMsg = "";
//     if (note.size_width != null && (Number.isNaN(Number(note.size_width))))
//         errorMsg = "Width is invalid";
//     if (note.size_height != null && (Number.isNaN(Number(note.size_height))))
//         errorMsg = "Height is invalid";
//     if (note.material == null || note.material === "")
//         errorMsg = "Material not provided";

//     if (errorMsg !== "") {
//         response.writeHead(500, { 'Content-Type': 'application/json' });
//         response.write(JSON.stringify({ "ErrorMsg": errorMsg }));
//         response.send();
//         return;
//     }


//     db.run(sqlUpdateNote, [note.width, note.height, note.material, note.obverseDesc, note.reverseDesc, note.notes, note.id], function(err) {
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



// let sqlInsertVariant = `INSERT INTO bva_variant(bva_ban_id, bva_issue_year, bva_printed_date, bva_cat_id, bva_printer,
//                                                 bva_signature, bva_watermark, bva_added_security, bva_description)
//                         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;

// // ===> /currency/series/note/variant
// module.exports.currencySeriesNoteVariantPOST = function(request, response) {
//     console.log(request.url);
//     console.log(request.body);

//     let newVariant = request.body;

//     // Validate fields
//     let errorMsg = "";
//     if (newVariant.printedDate == null || newVariant.printedDate === "")
//         errorMsg = "Printed date not provided";
//     if (newVariant.issueYear == null || newVariant.issueYear === "" || Number.isNaN(Number(newVariant.issueYear)))
//         errorMsg = "Issue year not provided or invalid";
//     if (newVariant.catId == null || newVariant.catId === "")
//         errorMsg = "Catalogue Id not provided";

//     if (errorMsg !== "") {
//         response.writeHead(500, { 'Content-Type': 'application/json' });
//         response.write(JSON.stringify({ "ErrorMsg": errorMsg }));
//         response.send();
//         return;
//     }


//     db.run(sqlInsertVariant, [newVariant.banknoteId, newVariant.issueYear, newVariant.printedDate, newVariant.catId, newVariant.printer,
//         newVariant.signature, newVariant.watermark, newVariant.security, newVariant.description
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




// let sqlUpdateVariant = `UPDATE bva_variant 
//     SET bva_issue_year = ?, bva_printed_date = ?, bva_cat_id = ?, bva_printer = ?,
//         bva_signature = ?, bva_watermark = ?, bva_added_security = ?, bva_description = ?
//     WHERE bva_id = ?`;

// // ===> /variant   (Update Variant)
// module.exports.variantPUT = function(request, response) {
//     console.log(request.url);
//     console.log(request.body);

//     let variant = request.body;

//     // Validate fields
//     let errorMsg = "";
//     if (variant.printedDate == null || variant.printedDate === "")
//         errorMsg = "Printed date not provided";
//     if (variant.issueYear == null || variant.issueYear === "" || Number.isNaN(Number(variant.issueYear)))
//         errorMsg = "Issue year not provided or invalid";
//     if (variant.catId == null || variant.catId === "")
//         errorMsg = "Catalogue Id not provided";

//     if (errorMsg !== "") {
//         response.writeHead(500, { 'Content-Type': 'application/json' });
//         response.write(JSON.stringify({ "ErrorMsg": errorMsg }));
//         response.send();
//         return;
//     }

//     db.run(sqlUpdateVariant, [variant.issueYear, variant.printedDate, variant.catId, variant.printer,
//         variant.signature, variant.watermark, variant.security, variant.description, variant.id
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