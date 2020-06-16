"use strict";

const url = require('url');
const log = require("../../utils/logger").logger;
const Exception = require('../../utils/Exception').Exception;
const dbs = require('../../db-connections');
const users = require('./Users');


let catalogueDB;


module.exports.initialize = function(app) {
    catalogueDB = dbs.getDBConnection('catalogueDB');

    app.get('/variants', addOnlyVariants, itemsGET);
    app.get('/items', users.validateSessionUser, itemsGET);
    app.get('/series/:seriesId/variants', addOnlyVariants, seriesByIdItemsGET);
    app.get('/series/:seriesId/items', users.validateSessionUser, seriesByIdItemsGET);

    log.debug("Variants service initialized");
};

function addOnlyVariants(request, response, next) {
    request.onlyVariants = true;
    next();
}


//===> /items?contId&terTypeId&terStartDateFrom&terStartDateTo&terEndDateFrom&terEndDateTo&curType
//               &curStartDateFrom&curStartDateTo&curEndDateFrom&currEndDateTo&minDenom&maxDenom&issueDateFrom&issueDateTo
function itemsGET(request, response) {
    let queryStrJSON = url.parse(request.url, true).query;
    let param;

    // Calculate the filters for territories
    let sqlTerritory = "";
    param = queryStrJSON.continentId || "";
    if (param !== "")
        sqlTerritory = `AND TER.ter_con_id = ${param}`;

    param = queryStrJSON.terTypeId || "";
    if (param !== "")
        sqlTerritory += ` AND TER.ter_tty_id = ${param}`;

    param = queryStrJSON.terStartDateFrom || "";
    if (param !== "")
        sqlTerritory += ` AND TER.ter_start >= ${param}`;

    param = queryStrJSON.terStartDateTo || "";
    if (param !== "")
        sqlTerritory += ` AND TER.ter_start <= ${param}`;

    param = queryStrJSON.terEndDateFrom || "";
    if (param !== "")
        sqlTerritory += ` AND TER.ter_end >= ${param}`;

    param = queryStrJSON.terEndDateTo || "";
    if (param !== "")
        sqlTerritory += ` AND TER.ter_end <= ${param}`;


    // Calculate the filters for currencies
    let sqlCurrency = "";
    param = queryStrJSON.curStartDateFrom || "";
    if (param !== "")
        sqlCurrency += ` AND CAST(substr(CUR.cur_start,1,4) AS INTEGER) >= ${param}`;

    param = queryStrJSON.curStartDateTo || "";
    if (param !== "")
        sqlCurrency += ` AND CAST(substr(CUR.cur_start,1,4) AS INTEGER) <= ${param}`;

    param = queryStrJSON.curEndDateFrom || "";
    if (param !== "")
        sqlCurrency += ` AND CAST(substr(CUR.cur_end,1,4) AS INTEGER) >= ${param}`;

    param = queryStrJSON.curEndDateTo || "";
    if (param !== "")
        sqlCurrency += ` AND CAST(substr(CUR.cur_end,1,4) AS INTEGER) <= ${param}`;


    // Calculate the filters for banknotes
    let sqlBanknote = "";
    param = queryStrJSON.minDenom || "";
    if (param !== "")
        sqlBanknote = `WHERE denomination >= ${param}`;
    param = queryStrJSON.maxDenom || "";
    if (param !== "") {
        if (sqlBanknote === "")
            sqlBanknote = `WHERE denomination <= ${param}`;
        else
            sqlBanknote += ` AND denomination <= ${param}`;
    }
    param = queryStrJSON.issueYearFrom || "";
    if (param !== "")
        if (sqlBanknote === "")
            sqlBanknote = `WHERE "issueYear" >= ${param}`;
        else
            sqlBanknote += ` AND "issueYear" >= ${param}`;
    param = queryStrJSON.issueYearTo || "";
    if (param !== "") {
        if (sqlBanknote === "")
            sqlBanknote = `WHERE "issueYear" <= ${param}`;
        else
            sqlBanknote += ` AND "issueYear" <= ${param}`;
    }


    // If the 3 sql filters are "" (and therefore they are equal)
    if (sqlTerritory === sqlCurrency && sqlBanknote === sqlCurrency) {
        new Exception(400, "VAR-001", "Search parameters not found").send(response);
        return;
    }

    const commonJoinsSQL = `INNER JOIN ban_banknote BAN ON BVA.bva_ban_id = BAN.ban_id
                            INNER JOIN cus_currency_unit CUS ON BAN.ban_cus_id = CUS.cus_id
                            INNER JOIN ser_series SER ON BAN.ban_ser_id = SER.ser_id
                            INNER JOIN cur_currency CUR ON SER.ser_cur_id = CUR.cur_id ${sqlCurrency}
                            INNER JOIN tec_territory_currency TEC ON CUR.cur_id = TEC.tec_cur_id AND TEC.tec_cur_type = 'OWNED'
                            INNER JOIN ter_territory TER ON TEC.tec_ter_id = TER.ter_id ${sqlTerritory}`;

    let sql = ` WITH resultset AS (
                    SELECT  BVA.bva_id AS "variantId", BVA.bva_cat_id AS "catalogueId", 
                            BVA.bva_issue_year AS "issueYear", BVA.bva_printed_date AS "printedDate",
                            CASE WHEN BAN.ban_cus_id = 0 THEN BAN.ban_face_value ELSE BAN.ban_face_value / CUS.cus_value END AS "denomination",
                            SER.ser_id AS "seriesId", SER.ser_name AS "seriesName", 
                            CUR.cur_id AS "currencyId", CUR.cur_name AS "currencyName", TER.ter_id AS "territoryId", TER.ter_name AS "territoryName"
                    FROM bva_variant BVA
                    ${commonJoinsSQL}
                )
                SELECT * FROM resultset
                ${sqlBanknote}
                ORDER BY "variantId"`;
    if (request.onlyVariants) {
        catalogueDB.getAndReply(response, sql);
        return;
    }

    // Retrieve the catalogue data
    catalogueDB.execSQL(sql, [], (err, catRows) => {
        if (err) {
            new Exception(500, err.code, err.message).send(response);
            return;
        }


        // Retrieve the collection data
        sql = ` WITH resultset AS (
                        SELECT  BIT.bit_id AS "id", GRA.gra_value AS "gradeValue", GRA.gra_grade AS "grade", 
                                BIT.bit_price AS "price", BVA.bva_id AS "variantId", BVA.bva_issue_year AS "issueYear", 
                                CASE WHEN BAN.ban_cus_id = 0 THEN BAN.ban_face_value ELSE BAN.ban_face_value / CUS.cus_value END AS "denomination"
                        FROM bva_variant BVA 
                        LEFT JOIN bit_item BIT ON BIT.bit_bva_id = BVA.bva_id
                        LEFT JOIN usr_user USR ON USR.usr_id = BIT.bit_usr_id AND USR.usr_name = $1
                        INNER JOIN gra_grade GRA ON GRA.gra_grade = BIT.bit_gra_grade
                        ${commonJoinsSQL}
                )
                SELECT * FROM resultset RES
                ${sqlBanknote}
                ORDER BY "variantId"`;

        catalogueDB.execSQL(sql, [request.session.user], (err, colRows) => {
            if (err) {
                new Exception(500, err.code, err.message).send(response);
                return;
            }

            // Join the collection results into the catalogue data
            let collecIndex = 0;
            for (let row of catRows) {
                let item = {};
                while (collecIndex < colRows.length && row.variantId === colRows[collecIndex].variantId) {
                    // Take the collection item with the highest grade (min grade value) and price
                    if (!item.id || item.gradeValue > colRows[collecIndex].gradeValue ||
                        (item.gradeValue === colRows[collecIndex].gradeValue && item.price < colRows[collecIndex].price)) {
                        item.id = colRows[collecIndex].id;
                        item.gradeValue = colRows[collecIndex].gradeValue;
                        item.grade = colRows[collecIndex].grade;
                        item.price = colRows[collecIndex].price;
                    }
                    collecIndex++;
                }
                if (item.id) row.item = { id: item.id, grade: item.grade, price: item.price };
            }

            // Build reply JSON
            response.writeHead(200, { 'Content-Type': 'application/json' });
            response.write(JSON.stringify(catRows));
            response.send();
        });
    });
}


// ==> /series/:seriesId/items
function seriesByIdItemsGET(request, response) {
    let seriesId = request.params.seriesId;

    // Check that the Id is an integer
    if (Number.isNaN(seriesId) || seriesId.toString() !== request.params.seriesId) {
        new Exception(400, "VAR-1", "Invalid Series Id, " + request.params.seriesId).send(response);
        return;
    }

    let sql = ` SELECT  CASE WHEN BAN.ban_cus_id = 0 THEN BAN.ban_face_value ELSE BAN.ban_face_value / CUS.cus_value END AS "denomination",
                        BVA.bva_id AS "id", BVA.bva_cat_id AS "catalogueId", BVA.bva_printed_date AS "printedDate", 
                        BVA.bva_issue_year AS "issueYear", BVA.bva_description as "description"
                FROM ban_banknote BAN
                LEFT JOIN cus_currency_unit CUS ON BAN.ban_cus_id = CUS.cus_id
                LEFT JOIN bva_variant BVA ON BAN.ban_id = BVA.bva_ban_id
                WHERE BAN.ban_ser_id = ${seriesId}
                ORDER BY "denomination", "issueYear", "printedDate"`;

    if (request.onlyVariants) {
        catalogueDB.getAndReply(response, sql);
        return;
    }

    // Retrieve the catalogue data
    catalogueDB.execSQL(sql, [], (err, catRows) => {
        if (err) {
            new Exception(500, err.code, err.message).send(response);
            return;
        }

        // Retrieve the collection data
        sql = ` SELECT BIT.bit_id AS "id", GRA.gra_value AS "gradeValue", GRA.gra_grade AS "grade", 
                        BIT.bit_price AS "price", BVA.bva_id AS "variantId"
                FROM ban_banknote BAN
                LEFT JOIN bva_variant BVA ON BAN.ban_id = BVA.bva_ban_id
                LEFT JOIN bit_item BIT ON BIT.bit_bva_id = BVA.bva_id
                INNER JOIN gra_grade GRA ON GRA.gra_grade = BIT.bit_gra_grade           
                LEFT JOIN usr_user USR ON USR.usr_id = BIT.bit_usr_id AND USR.usr_name = $1
                WHERE BAN.ban_ser_id = ${seriesId}
                ORDER BY "variantId"`;

        catalogueDB.execSQL(sql, [request.session.user], (err, colRows) => {
            if (err) {
                new Exception(500, err.code, err.message).send(response);
                return;
            }

            // Join the collection results into the catalogue data
            for (let row of catRows) {
                let item = {};
                let collecIndex = colRows.findIndex((elem) => { return elem.variantId === row.id; });
                if (collecIndex !== -1) {
                    while (collecIndex < colRows.length && row.id === colRows[collecIndex].variantId) {
                        // Take the collection item with the highest grade (min grade value) and price
                        if (!item.id || item.gradeValue > colRows[collecIndex].gradeValue ||
                            (item.gradeValue === colRows[collecIndex].gradeValue && item.price < colRows[collecIndex].price)) {
                            item.id = colRows[collecIndex].id;
                            item.gradeValue = colRows[collecIndex].gradeValue;
                            item.grade = colRows[collecIndex].grade;
                            item.price = colRows[collecIndex].price;
                        }
                        collecIndex++;
                    }
                    if (item.id) row.item = { id: item.id, grade: item.grade, price: item.price };
                }
            }

            // Build reply JSON
            response.writeHead(200, { 'Content-Type': 'application/json' });
            response.write(JSON.stringify(catRows));
            response.send();
        });
    });
}