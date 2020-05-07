"use strict";

const url = require('url');
const log = require("../../utils/logger").logger;
const Exception = require('../../utils/Exception').Exception;
const dbs = require('../../db-connections');


let catalogueDB;


module.exports.initialize = function(app) {
    catalogueDB = dbs.getDBConnection('catalogueDB');

    app.get('/banknotes/denominations', banknotesDenominationsGET);

    log.debug("Banknotes service initialized");

};


// ===> /banknotes/denominations?fromYear&toYear
function banknotesDenominationsGET(request, response) {
    let yearFilter = "";

    let fromYear = parseInt(url.parse(request.url, true).query.fromYear);
    if (!isNaN(fromYear))
        yearFilter = `AND BVA.bva_issue_year >= ${fromYear}`;

    let toYear = parseInt(url.parse(request.url, true).query.toYear);
    if (!isNaN(toYear))
        yearFilter += ` AND BVA.bva_issue_year <= ${toYear}`;

    let sql = `SELECT   CASE WHEN BAN.ban_cus_id = 0 THEN BAN.ban_face_value ELSE BAN.ban_face_value / CUS.cus_value END AS "denomination",
                        TER.ter_con_id AS "continentId", count (DISTINCT TER.ter_id) AS "numTerritories", 
                        count (DISTINCT CUR.cur_id) AS "numCurrencies", count (DISTINCT SER.ser_id) AS "numSeries", 
                        count(BVA.bva_id) AS "numVariants"
                FROM ban_banknote BAN
                LEFT JOIN ser_series SER ON BAN.ban_ser_id = SER.ser_id
                LEFT JOIN cur_currency CUR ON SER.ser_cur_id = CUR.cur_id
                LEFT JOIN tec_territory_currency TEC ON (TEC.tec_cur_id = CUR.cur_id AND TEC.tec_cur_type='OWNED')
                LEFT JOIN ter_territory TER ON (TER.ter_id = TEC.tec_ter_id AND TER.ter_con_id <> 1)
                INNER JOIN bva_variant BVA ON BVA.bva_ban_id = BAN.ban_id ${yearFilter}
                LEFT JOIN cus_currency_unit CUS ON CUS.cus_id = BAN.ban_cus_id
                GROUP BY "denomination", "continentId"`;

    catalogueDB.getAndReply(response, sql);
}


// let sqlOneSeriesNotes =
//     `SELECT  * 
//     FROM ban_banknote 
// 	LEFT JOIN cus_currency_unit ON ban_cus_id = cus_id
// 	LEFT JOIN bva_variant ON ban_id = bva_ban_id
//     WHERE ban_ser_id = ?
//     ORDER BY ban_face_value, bva_issue_year, bva_printed_date`;

// // ===> /currency/series/notes?seriesId=$id (Get all the notes for one series of a currency)
// module.exports.currencySeriesNotesGET = function(request, response) {

//     let queryStr = url.parse(request.url, true).query;
//     console.log(JSON.stringify(queryStr));

//     if (queryStr.seriesId == null || queryStr.seriesId === "") {
//         response.writeHead(400);
//         response.send();
//         return;
//     }

//     db.all(sqlOneSeriesNotes, [queryStr.seriesId], (err, rows) => {
//         if (err) {
//             response.writeHead(500, { 'Content-Type': 'application/json' });
//             response.write(JSON.stringify({ "Error": err.errno, "ErrorMsg": err.message }));
//             response.send();
//             return;
//         }

//         console.log(rows);

//         let variant = {};
//         let variants = [];
//         let denomination = {};
//         let denominations = [];
//         let prevDen = 0;
//         for (let row of rows) {
//             let den = row.ban_face_value;
//             if (row.cus_value != null && row.cus_value != 0) {
//                 den /= row.cus_value;
//             }

//             if (den !== prevDen) {
//                 if (prevDen !== 0) {
//                     denomination.variants = variants;
//                     variants = [];
//                 }
//                 denomination = {
//                     "id": row.ban_id,
//                     "denomination": den,
//                     "material": row.ban_material,
//                     "width": row.ban_size_width,
//                     "height": row.ban_size_height,
//                     "obverseDesc": row.ban_obverse_desc,
//                     "reverseDesc": row.ban_reverse_desc,
//                     "notes": row.ban_description
//                 };
//                 denominations.push(denomination);
//                 prevDen = den;
//             }

//             if (row.bva_id != null) {
//                 variant = { "id": row.bva_id, "printedDate": row.bva_printed_date, "issueYear": row.bva_issue_year, "catId": row.bva_cat_id, "printer": row.bva_printer, "signature": row.bva_signature, "description": row.bva_description };
//                 variants.push(variant);
//             }
//         }
//         denomination.variants = variants;

//         // Sort the denominations by value
//         denominations.sort((a, b) => { return a.denomination - b.denomination; });

//         console.log(denominations);

//         response.writeHead(200, { 'Content-Type': 'application/json' });
//         response.write(JSON.stringify(denominations));
//         response.send();
//     });
// }



// let sqlNote =
//     `SELECT  * 
//     FROM ban_banknote 
// 	LEFT JOIN cus_currency_unit ON ban_cus_id = cus_id
//     WHERE ban_id = ?
//     ORDER BY ban_face_value`;

// // ===> /note?banknoteId=$id
// module.exports.noteGET = function(request, response) {
//     console.log(request.url);

//     let queryStr = url.parse(request.url, true).query;
//     console.log(JSON.stringify(queryStr));

//     if (queryStr.banknoteId == null || queryStr.banknoteId === "") {
//         response.writeHead(400);
//         response.send();
//         return;
//     }

//     db.get(sqlNote, [queryStr.banknoteId], (err, row) => {
//         if (err) {
//             response.writeHead(500, { 'Content-Type': 'application/json' });
//             response.write(JSON.stringify({ "Error": err.errno, "ErrorMsg": err.message }));
//             response.send();
//             return;
//         }

//         console.log(row);

//         let den = row.ban_face_value;
//         if (row.cus_value != null && row.cus_value != 0) {
//             den /= row.cus_value;
//         }

//         let denomination = {
//             "id": row.ban_id,
//             "denomination": den,
//             "faceValue": row.ban_face_value,
//             "subunit": { "id": row.cus_id, "name": row.cus_name },
//             "material": row.ban_material,
//             "width": row.ban_size_width,
//             "height": row.ban_size_height,
//             "obverseDesc": row.ban_obverse_desc,
//             "reverseDesc": row.ban_reverse_desc,
//             "notes": row.ban_description
//         };

//         console.log(denomination);

//         response.writeHead(200, { 'Content-Type': 'application/json' });
//         response.write(JSON.stringify(denomination));
//         response.send();
//     });
// }




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