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

    let sql = ` SELECT  BAN.ban_id AS "id", CASE WHEN BAN.ban_cus_id = 0 THEN BAN.ban_face_value ELSE BAN.ban_face_value / CUS.cus_value END AS "denomination",
                        CASE WHEN BAN.ban_cus_id = 0 THEN null ELSE BAN.ban_face_value END AS "faceValue", 
                        CASE WHEN BAN.ban_cus_id = 0 THEN null ELSE CUS.cus_value END AS "unitValue",
                        CASE WHEN BAN.ban_cus_id = 0 THEN null ELSE CUS.cus_name END AS "unitValue",
                        CASE WHEN BAN.ban_cus_id = 0 THEN null ELSE CUS.cus_abbreviation END AS "unitSymbol",
                        BAN.ban_material AS "material", BAN.ban_size_width AS "width", BAN.ban_size_height AS "height", 
                        BAN.ban_obverse_desc as "obverseDescription", BAN.ban_reverse_desc as "reverseDescription", BAN.ban_description AS "description",
                        BVA.bva_id AS "variantId", BVA.bva_issue_year AS "issueYear", BVA.bva_printed_date AS "printedDate", BVA.bva_cat_id AS "catalogueId",
                        BVA.bva_overstamped_id AS "overstampedVariantId", BVA.bva_printer AS "printer",
                        BVA.bva_signature AS "signature", BVA.bva_signature_ext AS "signatureExt", BVA.bva_watermark AS "watermark",
                        BVA.bva_security_thread AS "securityThread", BVA.bva_added_security AS "securityExt", BVA.bva_is_specimen AS "isSpecimen",
                        BVA.bva_is_replacement AS "isReplacement", BVA.bva_is_error AS "isError", BVA.bva_is_commemorative AS "isCommemorative",
                        BVA.bva_is_numis_product AS "isNumismaticProduct", BVA.bva_description AS "variantDescription"
                FROM ban_banknote BAN
                LEFT JOIN cus_currency_unit CUS ON BAN.ban_cus_id = CUS.cus_id
                LEFT JOIN bva_variant BVA ON BAN.ban_id = BVA.bva_ban_id
                WHERE BAN.ban_ser_id =  $1
                ORDER BY "denomination", "variantId"`;

    catalogueDB.execSQL(sql, [seriesId], (err, catRows) => {
        if (err) {
            new Exception(500, err.code, err.message).send(response);
            return;
        }

        let replyJSON = [];
        let denominationJSON = {};
        // Create reply JSON object
        for (let row of catRows) {
            if (row.denomination !== denominationJSON.denomination) {
                // Add denomination record
                if (denominationJSON.denomination) replyJSON.push(denominationJSON);
                // Store new denomination
                denominationJSON = {};
                denominationJSON.id = row.id;
                denominationJSON.denomination = row.denomination;
                if (row.faceValue) denominationJSON.faceValue = row.faceValue;
                if (row.unitValue) denominationJSON.unitValue = row.unitValue;
                if (row.unitSymbol) denominationJSON.unitSymbol = row.unitSymbol;
                if (row.material) denominationJSON.material = row.material;
                if (row.width) denominationJSON.width = row.width;
                if (row.height) denominationJSON.height = row.height;
                if (row.obverseDescription) denominationJSON.obverseDescription = row.obverseDescription;
                if (row.reverseDescription) denominationJSON.reverseDescription = row.reverseDescription;
                if (row.description) denominationJSON.description = row.description;
                denominationJSON.variants = [];
            }
            // Add variant
            if (row.variantId && row.variantId != null) {
                let variant = {};
                variant.id = row.variantId;
                variant.issueYear = row.issueYear;
                if (row.printedDate) variant.printedDate = row.printedDate;
                variant.catalogueId = row.catalogueId;
                if (row.overstampedVariantId) variant.overstampedVariantId = row.overstampedVariantId;
                if (row.printer) variant.printer = row.printer;
                if (row.signature) variant.signature = row.signature;
                if (row.signatureExt) variant.signatureExt = row.signatureExt;
                if (row.watermark) variant.watermark = row.watermark;
                if (row.securityThread) variant.securityThread = row.securityThread;
                if (row.securityExt) variant.securityExt = row.securityExt;
                if (row.isSpecimen) variant.isSpecimen = row.isSpecimen;
                if (row.isReplacement) variant.isReplacement = row.isReplacement;
                if (row.isError) variant.isError = row.isError;
                if (row.isCommemorative) variant.isCommemorative = row.isCommemorative;
                if (row.isNumismaticProduct) variant.isNumismaticProduct = row.isNumismaticProduct;
                if (row.variantDescription) variant.variantDescription = row.variantDescription;

                denominationJSON.variants.push(variant);
            }
        }
        // Add denomination record
        if (denominationJSON.denomination) replyJSON.push(denominationJSON);

        if (request.onlyVariants) {
            replyJSON = sortVariants(replyJSON);

            response.writeHead(200, { 'Content-Type': 'application/json' });
            response.write(JSON.stringify(replyJSON));
            response.send();
            return;
        }


        // Retrieve the collection data
        sql = ` SELECT BIT.bit_id AS "id", GRA.gra_value AS "gradeValue", GRA.gra_grade AS "grade", BIT.bit_price AS "price", 
                        BIT.bit_quantity AS "quantity", BIT.bit_seller AS "seller", BIT.bit_purchase_date AS "purchaseDate",
                        BIT.bit_description AS "description",	BVA.bva_id AS "variantId"
                FROM ban_banknote BAN
                LEFT JOIN bva_variant BVA ON BAN.ban_id = BVA.bva_ban_id
                LEFT JOIN bit_item BIT ON BIT.bit_bva_id = BVA.bva_id
                INNER JOIN gra_grade GRA ON GRA.gra_grade = BIT.bit_gra_grade           
                LEFT JOIN usr_user USR ON USR.usr_id = BIT.bit_usr_id AND USR.usr_name = $2
                WHERE BAN.ban_ser_id = $1
                ORDER BY "variantId", "gradeValue", "price" DESC`;

        catalogueDB.execSQL(sql, [seriesId, request.session.user], (err, colRows) => {
            if (err) {
                new Exception(500, err.code, err.message).send(response);
                return;
            }

            let collecIndex = 0;
            // Join the collection results into the catalogue data
            for (let denom of replyJSON) {
                for (let variant of denom.variants) {
                    variant.items = [];
                    // Check if the variant is in the collection
                    if (collecIndex < colRows.length && colRows[collecIndex].variantId === variant.id) {
                        // Add item
                        let item = {};
                        item.id = colRows[collecIndex].id;
                        item.grade = colRows[collecIndex].grade;
                        item.price = colRows[collecIndex].price;
                        item.quantity = colRows[collecIndex].quantity;
                        item.seller = colRows[collecIndex].seller;
                        item.purchaseDate = colRows[collecIndex].purchaseDate;
                        item.description = colRows[collecIndex].description;

                        variant.items.push(item);

                        collecIndex++;
                    }
                }
            }

            replyJSON = sortVariants(replyJSON);

            response.writeHead(200, { 'Content-Type': 'application/json' });
            response.write(JSON.stringify(replyJSON));
            response.send();
        });
    });
}


function sortVariants(jsonObj) {

    jsonObj.forEach(denom => {
        denom.variants.sort((a, b) => {
            // Compare the issue year
            let result = a.issueYear - b.issueYear;

            if (result === 0) {
                //Compare the printedDate
                if (a.printedDate && b.printedDate) result = a.toString().localeCompare(b.toString());
                else if (!a.printedDate && !b.printedDate) result = 0;
                else if (!a.printedDate) result = 1
                else result = -1;

                if (result === 0) {
                    // Compare the catalogue Id
                    let a_catalogueIdInt = parseInt(a.catalogueId.slice(2));
                    let b_catalogueIdInt = parseInt(b.catalogueId.slice(2));
                    result = a_catalogueIdInt - b_catalogueIdInt;
                    if (result === 0) {
                        let a_catalogueIdSuffix = a.catalogueId.slice(2 + a_catalogueIdInt.toString().length);
                        let b_catalogueIdSuffix = b.catalogueId.slice(2 + b_catalogueIdInt.toString().length);
                        result = a_catalogueIdSuffix.localeCompare(b_catalogueIdSuffix);
                    }
                }
            }
            return result;
        });
    });

    return jsonObj;
}