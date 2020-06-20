"use strict";

const url = require('url');
const log = require("../../utils/logger").logger;
const Exception = require('../../utils/Exception').Exception;
const dbs = require('../../db-connections');
const users = require('./Users');

let catalogueDB;

module.exports.initialize = function(app) {
    catalogueDB = dbs.getDBConnection('catalogueDB');

    log.debug("Items service initialized");
};





// let sqlInsertItem = `INSERT INTO bit_item (bit_usr_id, bit_bva_id, bit_quantity, bit_gra_grade, bit_price, bit_seller, bit_purchase_date, bit_description)
//                     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;

// // ==> collection/item'
// module.exports.collectionItemPOST = function(request, response) {
//     // Request: {username, variantId, quantity, grade, price, seller, purchaseDate, description}
//     logger.debug("Insert new item: " + JSON.stringify(request.body))

//     // Check the user and get user id
//     if (request.session.user !== request.body.username) {
//         response.writeHead(403, { 'Content-Type': 'application/json' });
//         response.write(JSON.stringify({ errorCode: "COL-2", errorMsg: "Session not created or expired" }));
//         response.send();
//         return;
//     }
//     getUserId(request.body.username).catch((err) => {
//         response.writeHead(err.status, { 'Content-Type': 'application/json' });
//         response.write(JSON.stringify({ errorCode: err.code, errorMsg: err.message }));
//         response.send();
//     }).then((usrId) => {
//         // Execute the insertion
//         db.run(sqlInsertItem, [usrId, request.body.variantId, request.body.quantity, request.body.grade, request.body.price, request.body.seller,
//             request.body.purchaseDate, request.body.description
//         ], function(err) {
//             if (err) {
//                 response.writeHead(500, { 'Content-Type': 'application/json' });
//                 response.write(JSON.stringify({ errorCode: err.errno, errorMsg: err.message }));
//                 response.send();
//                 return;
//             }

//             response.writeHead(200);
//             response.send();
//         });
//     });
// }

// let sqlUpdateItem = `UPDATE bit_item 
//                     SET bit_quantity = ?, bit_grade = ?, bit_price = ?, bit_seller = ?, bit_purchase_date = ?, bit_description = ?
//                     WHERE bit_id = ?`;

// // ==> /item'
// module.exports.collectionItemPUT = function(request, response) {
//     // Request: {id, quantity, grade, price, seller, purchaseDate, description}

//     // Check the user and get user id
//     getUserId(username).catch((err) => {
//         response.writeHead(err.status, { 'Content-Type': 'application/json' });
//         response.write(JSON.stringify({ errorCode: err.code, errorMsg: err.message }));
//         response.send();
//     }).then((usrId) => {
//         // Execute the update
//         db.run(sqlUpdateItem, [request.quantity, request.grade, request.price, request.seller,
//             request.purchaseDate, request.description, request.id
//         ], function(err) {
//             if (err) {
//                 response.writeHead(500, { 'Content-Type': 'application/json' });
//                 response.write(JSON.stringify({ errorCode: err.errno, errorMsg: err.message }));
//                 response.send();
//                 return;
//             }

//             response.writeHead(200);
//             response.send();
//         });
//     });
// }