"use strict";

const url = require('url');
const log = require("../../utils/logger").logger;
const Exception = require('../../utils/Exception').Exception;
const dbs = require('../../db-connections');


let catalogueDB;


module.exports.initialize = function(app) {
    catalogueDB = dbs.getDBConnection('catalogueDB');

    log.debug("Banknotes service initialized");
};





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