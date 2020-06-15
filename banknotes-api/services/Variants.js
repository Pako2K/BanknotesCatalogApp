"use strict";

const url = require('url');
const log = require("../../utils/logger").logger;
const Exception = require('../../utils/Exception').Exception;
const dbs = require('../../db-connections');


let catalogueDB;


module.exports.initialize = function(app) {
    catalogueDB = dbs.getDBConnection('catalogueDB');

    app.get('/series/:seriesId/variants', seriesByIdVariantsGET);
    app.get('/variants', variantsGET);
    app.get('/items', itemsGET);


    log.debug("Variants service initialized");

};


//===> /variants?continentId&terTypeId&terStartDateFrom&terStartDateTo&terEndDateFrom&terEndDateTo&curType
//               &curStartDateFrom&curStartDateTo&curEndDateFrom&currEndDateTo&minDenom&maxDenom&issueDateFrom&issueDateTo
function variantsGET(request, response) {
    request.onlyVariants = true;
    itemsGET(request, response);
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




// ===> /series/:seriesId/variants
// Returns: [{"denomination":20, "variants":[{ "variantId": , "printedDate": , "issueYear": , "catalogueId": , "description": }]}]
function seriesByIdVariantsGET(request, response) {
    let seriesId = request.params.currencyId;

    const sql = `
            SELECT BAN.ban_id BAN.ban_face_value, UNI.cus_value, BVA.bva_id, BVA.bva_printed_date, BVA.bva_issue_year, BVA.bva_cat_id, BVA.bva_description
                FROM ban_banknote BAN
                LEFT JOIN cus_currency_unit UNI ON BAN.ban_cus_id = UNI.cus_id
                LEFT JOIN bva_variant BVA ON BAN.ban_id = BVA.bva_ban_id
                WHERE BAN.ban_ser_id = ?1
            ORDER BY ban_face_value, bva_issue_year, bva_printed_date
            `;

    catalogueDB.execSQL(sql, [seriesId], (err, rows) => {
        if (err) {
            new Exception(500, err.code, err.message).send(response);
            return;
        }

        let variant = {};
        let variants = [];
        let denomination = {};
        let denominations = [];
        let prevDen = 0;
        let prevVariant = 0;
        for (let row of rows) {
            if (row.ban_id !== prevDen) {
                if (prevDen !== 0)
                    denominations.push(denomination);
                // Insert denomination info
                let den = row.ban_face_value;
                if (row.cus_value != null && row.cus_value != 0) {
                    den /= row.cus_value;
                }
                denomination = { "denomination": den, "variants": [] };
                prevDen = row.ban_id;
            }

            if (row.bva_id != null && row.bva_id !== prevVariant) {
                variant = { "variantId": row.bva_id, "printedDate": row.bva_printed_date, "issueYear": row.bva_issue_year, "catalogueId": row.bva_cat_id, "description": row.bva_description };
                prevVariant = row.bva_id;
                denomination.variants.push(variant);
            }
        }
        denominations.push(denomination);

        // Sort the denominations by value
        denominations.sort((a, b) => { return a.denomination - b.denomination; });

        response.writeHead(200, { 'Content-Type': 'application/json' });
        response.write(JSON.stringify(denominations));
        response.send();
    });
}