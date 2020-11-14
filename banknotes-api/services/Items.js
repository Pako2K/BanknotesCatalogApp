"use strict";

const log = require("../../utils/logger").logger;
const Exception = require('../../utils/Exception').Exception;
const dbs = require('../../db-connections');
const users = require('./Users');


let catalogueDB;

module.exports.initialize = function(app) {
    catalogueDB = dbs.getDBConnection('catalogueDB');

    app.get('/items/all', users.validateSessionUser, itemsAllGET);

    log.debug("Items service initialized");
};



// ===> /items/all
function itemsAllGET(request, response) {
    let sql = ` SELECT  CON.con_id AS "continentId", TER.ter_id AS "territoryId", TER.ter_name AS "territoryName", CUR.cur_id AS "currencyId", CUR.cur_name AS "currencyName", 
                        BVA.bva_cat_id AS "catalogueId", CASE WHEN BAN.ban_cus_id = 0 THEN BAN.ban_face_value ELSE BAN.ban_face_value / CUS.cus_value END AS "denomination",
                        BVA.bva_id AS "variantId", BIT.bit_id AS "id", BIT.bit_gra_grade AS "grade", BIT.bit_price AS "price", 
                        BIT.bit_quantity AS "quantity", BIT.bit_seller AS "seller", BIT.bit_purchase_date AS "purchaseDate",
                        BIT.bit_description AS "description"
                FROM bit_item BIT
                INNER JOIN usr_user USR ON USR.usr_id = BIT.bit_usr_id AND USR.usr_name = $1
                INNER JOIN gra_grade GRA ON GRA.gra_grade = BIT.bit_gra_grade
                INNER JOIN bva_variant BVA ON BVA.bva_id = BIT.bit_bva_id
                INNER JOIN ban_banknote BAN ON BAN.ban_id = BVA.bva_ban_id
                INNER JOIN ser_series SER ON SER.ser_id = BAN.ban_ser_id
                INNER JOIN iss_issuer ISS ON ISS.iss_id = SER.ser_iss_id
                INNER JOIN cur_currency CUR ON CUR.cur_id = SER.ser_cur_id
                LEFT JOIN cus_currency_unit CUS ON BAN.ban_cus_id = CUS.cus_id
                INNER JOIN ter_territory TER ON TER.ter_id = ISS.iss_ter_id
                INNER JOIN con_continent CON ON CON.con_id = TER.ter_con_id
                ORDER BY "variantId" ASC, GRA.gra_value ASC, "price" DESC`;

    catalogueDB.execSQL(sql, [request.session.user], (err, itemsJSON) => {
        if (err) {
            new Exception(500, err.code, err.message).send(response);
            return;
        }

        let prevVariantId = 0;
        for (let row of itemsJSON) {
            // Add duplicated flag and remove variantId
            if (row.variantId === prevVariantId)
                row.isDuplicated = true;
            else {
                row.isDuplicated = false;
                prevVariantId = row.variantId;
            }
            delete row.variantId;
        }

        response.writeHead(200, { 'Content-Type': 'application/json' });
        response.write(JSON.stringify(itemsJSON));
        response.send();
    });
}