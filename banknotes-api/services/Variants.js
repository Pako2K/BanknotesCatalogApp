"use strict";

const url = require('url');
const log = require("../../utils/logger").logger;
const Exception = require('../../utils/Exception').Exception;
const dbs = require('../../db-connections');
const jsonParser = require('body-parser').json();
const users = require('./Users');


let catalogueDB;
let serviceValidator;
let schemas = {};


module.exports.initialize = function(app, banknotesOAS, validator) {
    catalogueDB = dbs.getDBConnection('catalogueDB');
    serviceValidator = validator;

    app.put('/denomination/:denominationId/variant', users.validateSessionUser, users.validateAdminUser, jsonParser, denominationVariantPUT);
    schemas.denominationVariantPUT = getReqJSONSchema(banknotesOAS, "/denomination/{denominationId}/variant", "put");

    app.get('/variant/:variantId', variantGET);
    app.put('/variant/:variantId', users.validateSessionUser, users.validateAdminUser, jsonParser, variantPUT);
    schemas.variantPUT = getReqJSONSchema(banknotesOAS, "/variant/{variantId}", "put");

    app.get('/variants', addOnlyVariants, itemsGET);
    app.get('/items', users.validateSessionUser, itemsGET);
    app.get('/series/:seriesId/variants', addOnlyVariants, seriesByIdItemsGET);
    app.get('/series/:seriesId/items', users.validateSessionUser, seriesByIdItemsGET);

    app.post('/variant/:variantId/item', users.validateSessionUser, jsonParser, variantItemPOST);
    schemas.variantItemPOST = getReqJSONSchema(banknotesOAS, "/variant/{variantId}/item", "post");
    app.put('/item', users.validateSessionUser, jsonParser, itemPUT);
    schemas.itemPUT = getReqJSONSchema(banknotesOAS, "/item", "put");
    app.delete('/item/:itemId', users.validateSessionUser, itemDELETE);

    app.get('/issue-years/variants/stats', addOnlyVariants, issueYearsItemsStatsGET);
    app.get('/issue-years/items/stats', users.validateSessionUser, issueYearsItemsStatsGET);
    app.get('/territory/:territoryId/issue-years/variants/stats', addOnlyVariants, territoryByIdIssueYearsItemsStatsGET);
    app.get('/territory/:territoryId/issue-years/items/stats', users.validateSessionUser, territoryByIdIssueYearsItemsStatsGET);
    app.get('/currency/:currencyId/issue-years/variants/stats', addOnlyVariants, currencyByIdIssueYearsItemsStatsGET);
    app.get('/currency/:currencyId/issue-years/items/stats', users.validateSessionUser, currencyByIdIssueYearsItemsStatsGET);


    log.debug("Variants service initialized");
};

function getReqJSONSchema(swaggerObj, path, operation) {
    return swaggerObj["paths"][path][operation]["requestBody"]["content"]["application/json"]["schema"];
}


function addOnlyVariants(request, response, next) {
    request.onlyVariants = true;
    next();
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



// ==> denomination/:denominationId/variant
function denominationVariantPUT(request, response) {
    let denominationId = parseInt(request.params.denominationId);

    // Check that the Id is an integer
    if (Number.isNaN(denominationId) || denominationId.toString() !== request.params.denominationId) {
        new Exception(400, "VAR-01", "Invalid denomination id, " + request.params.denominationId).send(response);
        return;
    }

    // Validate variant info in the body 
    let valResult = serviceValidator.validate(request.body, schemas.denominationVariantPUT);
    if (valResult.errors.length) {
        new Exception(400, "VAR-02", JSON.stringify(valResult.errors)).send(response);
        return;
    }

    let variant = request.body;

    const sqlInsert = `INSERT INTO bva_variant(bva_ban_id, bva_issue_year, bva_printed_date, bva_cat_id, bva_overstamped_id, bva_printer,
                                                bva_signature, bva_signature_ext, bva_watermark, bva_security_thread, bva_added_security, 
                                                bva_is_specimen, bva_is_commemorative, bva_is_numis_product, bva_is_replacement, bva_is_error, bva_description)
                       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)`;
    catalogueDB.execSQLUpsert(sqlInsert, [denominationId, variant.issueYear, variant.printedDate, variant.catalogueId, variant.overstampedVariantId,
        variant.printer, variant.signature, variant.signatureExt, variant.watermark, variant.securityThread,
        variant.securityExt, variant.isSpecimen ? 1 : 0, variant.isCommemorative ? 1 : 0, variant.isNumismaticProduct ? 1 : 0, variant.isReplacement ? 1 : 0,
        variant.isError ? 1 : 0, variant.description
    ], (err, result) => {
        if (err) {
            new Exception(500, err.code, err.message).send(response);
            return;
        }

        // Get the new variant id
        let sql = ` SELECT bva_id AS id
                    FROM bva_variant
                    WHERE bva_ban_id = $1 
                    AND bva_cat_id = $2`;
        catalogueDB.execSQL(sql, [denominationId, variant.catalogueId], (err, rows) => {
            if (err) {
                new Exception(500, err.code, err.message).send(response);
                return;
            }

            let replyJSON = { id: rows[0].id };

            response.writeHead(200, { 'Content-Type': 'application/json' });
            response.write(JSON.stringify(replyJSON));
            response.send();
        });
    });
}



// ==> /variant/:variantId GET
function variantGET(request, response) {
    let variantId = parseInt(request.params.variantId);

    // Check that the Id is an integer
    if (Number.isNaN(variantId) || variantId.toString() !== request.params.variantId) {
        new Exception(400, "VAR-01", "Invalid denomination id, " + request.params.variantId).send(response);
        return;
    }

    const sql = `SELECT BVA.bva_id AS "variantId", BVA.bva_issue_year AS "issueYear", BVA.bva_printed_date AS "printedDate", BVA.bva_cat_id AS "catalogueId",
                        BVA.bva_overstamped_id AS "overstampedVariantId", BVA.bva_printer AS "printer",
                        BVA.bva_signature AS "signature", BVA.bva_signature_ext AS "signatureExt", BVA.bva_watermark AS "watermark",
                        BVA.bva_security_thread AS "securityThread", BVA.bva_added_security AS "securityExt", BVA.bva_is_specimen AS "isSpecimen",
                        BVA.bva_is_replacement AS "isReplacement", BVA.bva_is_error AS "isError", BVA.bva_is_commemorative AS "isCommemorative",
                        BVA.bva_is_numis_product AS "isNumismaticProduct", BVA.bva_description AS "description"
                FROM bva_variant BVA
                WHERE BVA.bva_id = $1`;

    catalogueDB.execSQL(sql, [variantId], (err, rows) => {
        if (err) {
            err.message += `\nSQL Query: ${sql}`;
            new Exception(500, err.code, err.message).send(response);
            return;
        }

        // Build reply JSON
        response.writeHead(200, { 'Content-Type': 'application/json' });
        response.write(JSON.stringify(rows[0]));
        response.send();
    });
}

// ==> /variant/:variantId PUT
function variantPUT(request, response) {
    let variantId = parseInt(request.params.variantId);

    // Check that the Id is an integer
    if (Number.isNaN(variantId) || variantId.toString() !== request.params.variantId) {
        new Exception(400, "VAR-01", "Invalid denomination id, " + request.params.variantId).send(response);
        return;
    }

    // Validate variant info in the body 
    let valResult = serviceValidator.validate(request.body, schemas.variantPUT);
    if (valResult.errors.length) {
        new Exception(400, "VAR-02", JSON.stringify(valResult.errors)).send(response);
        return;
    }

    let variant = request.body;

    const sqlUpdate = ` UPDATE bva_variant 
                        SET bva_issue_year = $2, bva_printed_date = $3, bva_cat_id = $4, bva_overstamped_id = $5, bva_printer = $6,
                            bva_signature = $7, bva_signature_ext = $8, bva_watermark = $9, bva_security_thread = $10, bva_added_security = $11, 
                            bva_is_specimen = $12, bva_is_commemorative = $13, bva_is_numis_product = $14, bva_is_replacement = $15, bva_is_error = $16,
                            bva_description = $17
                        WHERE bva_id = $1`;
    catalogueDB.execSQLUpsert(sqlUpdate, [variantId, variant.issueYear, variant.printedDate, variant.catalogueId, variant.overstampedVariantId,
        variant.printer, variant.signature, variant.signatureExt, variant.watermark, variant.securityThread, variant.securityExt,
        variant.isSpecimen ? 1 : 0, variant.isCommemorative ? 1 : 0, variant.isNumismaticProduct ? 1 : 0, variant.isReplacement ? 1 : 0,
        variant.isError ? 1 : 0, variant.description
    ], (err, result) => {
        if (err) {
            if (err.code === "23503")
                new Exception(404, "VAR-04", "Variant not found for the given id: " + variantId).send(response);
            else
                new Exception(500, err.code, err.message).send(response);
            return;
        }

        response.writeHead(200, { 'Content-Type': 'application/json' });
        response.write("{}");
        response.send();
    });
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
    let seriesId = parseInt(request.params.seriesId);

    // Check that the Id is an integer
    if (Number.isNaN(seriesId) || seriesId.toString() !== request.params.seriesId) {
        new Exception(400, "VAR-1", "Invalid Series Id, " + request.params.seriesId).send(response);
        return;
    }

    let sql = ` SELECT  BAN.ban_id AS "id", CASE WHEN BAN.ban_cus_id = 0 THEN BAN.ban_face_value ELSE BAN.ban_face_value / CUS.cus_value END AS "denomination",
                        CASE WHEN BAN.ban_cus_id = 0 THEN null ELSE BAN.ban_face_value END AS "faceValue", 
                        CASE WHEN BAN.ban_cus_id = 0 THEN null ELSE CUS.cus_value END AS "unitValue",
                        CASE WHEN BAN.ban_cus_id = 0 THEN null ELSE CUS.cus_name END AS "unitName",
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
                if (row.unitName) denominationJSON.unitName = row.unitName;
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
                INNER JOIN usr_user USR ON USR.usr_id = BIT.bit_usr_id AND USR.usr_name = $2
                WHERE BAN.ban_ser_id = $1
                ORDER BY "variantId", "gradeValue", "price" DESC`;

        catalogueDB.execSQL(sql, [seriesId, request.session.user], (err, colRows) => {
            if (err) {
                new Exception(500, err.code, err.message).send(response);
                return;
            }

            // Join the collection results into the catalogue data
            for (let denom of replyJSON) {
                for (let variant of denom.variants) {
                    variant.items = [];
                    // Check if the variant is in the collection
                    let foundIndex = colRows.findIndex((element) => {
                        return element.variantId === variant.id;
                    });
                    while (foundIndex !== -1 && foundIndex < colRows.length && colRows[foundIndex].variantId === variant.id) {
                        // Add item
                        let item = {};
                        item.id = colRows[foundIndex].id;
                        item.grade = colRows[foundIndex].grade;
                        item.price = colRows[foundIndex].price;
                        item.quantity = colRows[foundIndex].quantity;
                        item.seller = colRows[foundIndex].seller;
                        item.purchaseDate = colRows[foundIndex].purchaseDate;
                        item.description = colRows[foundIndex].description;

                        variant.items.push(item);

                        foundIndex++;
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



// ==> /variant/:variantId/item
function variantItemPOST(request, response) {
    let variantId = parseInt(request.params.variantId);

    // Check that the Id is an integer
    if (Number.isNaN(variantId) || variantId.toString() !== request.params.variantId) {
        new Exception(400, "VAR-1", "Invalid variant id, " + request.params.variantId).send(response);
        return;
    }

    // Validate item info in the body 
    let valResult = serviceValidator.validate(request.body, schemas.variantItemPOST);
    if (valResult.errors.length) {
        new Exception(400, "VAR-2", JSON.stringify(valResult.errors)).send(response);
        return;
    }

    let item = request.body;

    // Execute the insertion
    const sqlInsertItem = `INSERT INTO bit_item (bit_usr_id, bit_bva_id, bit_quantity, bit_gra_grade, bit_price, bit_seller, bit_purchase_date, bit_description)
                       SELECT usr.usr_id, $2 AS bva_id, $3 AS quantity, $4 AS grade, $5 AS proce, $6 AS seller, $7 AS date, $8 AS desc
                       FROM usr_user usr
                       WHERE usr_name = $1`;
    catalogueDB.execSQLUpsert(sqlInsertItem, [request.session.user, variantId, item.quantity, item.grade, item.price, item.seller, item.purchaseDate, item.description], (err, result) => {
        if (err) {
            new Exception(500, err.code, err.message).send(response);
            return;
        }

        // Get the new item id
        let sql = ` SELECT max(bit_id) AS itemId
                    FROM bit_item b
                    INNER JOIN usr_user u ON b.bit_usr_id = u.usr_id AND u.usr_name = $1`;
        catalogueDB.execSQL(sql, [request.session.user], (err, rows) => {
            if (err) {
                new Exception(500, err.code, err.message).send(response);
                return;
            }

            let replyJSON = { itemId: rows[0].itemId };

            response.writeHead(200, { 'Content-Type': 'application/json' });
            response.write(JSON.stringify(replyJSON));
            response.send();
        });
    });
}



const sqlUpdateItem = ` UPDATE bit_item 
                        SET bit_quantity = $2, bit_gra_grade = $3, bit_price = $4, bit_seller = $5, bit_purchase_date = $6, bit_description = $7
                        WHERE bit_id = $1 AND bit_usr_id = (SELECT usr_id FROM usr_user WHERE usr_name = $8)`;

// ==> /item
function itemPUT(request, response) {
    // Validate item info in the body 
    let valResult = serviceValidator.validate(request.body, schemas.itemPUT);
    if (valResult.errors.length) {
        new Exception(400, "VAR-2", JSON.stringify(valResult.errors)).send(response);
        return;
    }

    let item = request.body;

    // Execute the update
    catalogueDB.execSQLUpsert(sqlUpdateItem, [item.id, item.quantity, item.grade, item.price, item.seller, item.purchaseDate, item.description, request.session.user], (err, result) => {
        if (err) {
            new Exception(500, err.code, err.message).send(response);
            return;
        }
        if (result.rowCount) {
            response.writeHead(200, { 'Content-Type': 'application/json' });
            response.write("{}");
            response.send();
        } else {
            new Exception(404, "VAR-3", "Item not found: " + item.id).send(response);
            return;
        }
    });
}


// ==> /item/:itemId
function itemDELETE(request, response) {
    let itemId = parseInt(request.params.itemId);

    // Check that the Id is an integer
    if (Number.isNaN(itemId) || itemId.toString() !== request.params.itemId) {
        new Exception(400, "VAR-1", "Invalid item id, " + request.params.itemId).send(response);
        return;
    }

    const sql = `DELETE FROM bit_item WHERE bit_id = $1 AND bit_usr_id = (SELECT usr_id FROM usr_user WHERE usr_name = $2)`
        // Execute the deletion
    catalogueDB.execSQLUpsert(sql, [itemId, request.session.user], (err, result) => {
        if (err) {
            new Exception(500, err.code, err.message).send(response);
            return;
        }
        if (result.rowCount) {
            response.writeHead(200, { 'Content-Type': 'application/json' });
            response.write("{}");
            response.send();
        } else {
            new Exception(404, "ITEM-1", "Item not found: " + item.id).send(response);
            return;
        }
    });
}




const issueYearStats_commonSELECT = `BVA.bva_issue_year AS "issueYear", count (DISTINCT TER.ter_id) AS "numTerritories", 
                                    count (DISTINCT CUR.cur_id) AS "numCurrencies", count (DISTINCT SER.ser_id) AS "numSeries", 
                                    count(DISTINCT(BAN.ban_face_value + BAN.ban_cus_id)) AS "numDenominations", 
                                    count(DISTINCT BAN.ban_id) AS "numNotes", count(DISTINCT BVA.bva_id) AS "numVariants"`;
const issueYearStats_commonFROM = ` FROM bva_variant BVA
                                    LEFT JOIN ban_banknote BAN ON BAN.ban_id = BVA.bva_ban_id
                                    LEFT JOIN ser_series SER ON BAN.ban_ser_id = SER.ser_id
                                    LEFT JOIN cur_currency CUR ON SER.ser_cur_id = CUR.cur_id
                                    LEFT JOIN tec_territory_currency TEC ON (TEC.tec_cur_id = CUR.cur_id AND TEC.tec_cur_type='OWNED')
                                    `;

// ===> /issue-years/items/stats?continentId&fromYear&toYear
function issueYearsItemsStatsGET(request, response) {
    let continentFilter = "";
    let continentId = parseInt(url.parse(request.url, true).query.continentId);
    if (!isNaN(continentId))
        continentFilter = `AND TER.ter_con_id = ${continentId}`;

    let sql = ` SELECT  ${issueYearStats_commonSELECT}
                ${issueYearStats_commonFROM}
                LEFT JOIN ter_territory TER ON TER.ter_id = TEC.tec_ter_id ${continentFilter}
                INNER JOIN con_continent CON ON CON.con_id = TER.ter_con_id AND CON.con_order IS NOT NULL
                GROUP BY "issueYear"`;

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

        sql = `SELECT  ${issueYearStats_commonSELECT}, sum(BIT.bit_price * BIT.bit_quantity) AS "price"
                    ${issueYearStats_commonFROM}
                    LEFT JOIN ter_territory TER ON TER.ter_id = TEC.tec_ter_id ${continentFilter}
                    INNER JOIN con_continent CON ON CON.con_id = TER.ter_con_id AND CON.con_order IS NOT NULL
                    INNER JOIN bit_item BIT ON BIT.bit_bva_id = BVA.bva_id
                    INNER JOIN usr_user USR ON USR.usr_id = BIT.bit_usr_id AND USR.usr_name = $1
                    GROUP BY "issueYear"`;
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
                    row.collectionStats.numDenominations = colRows[collecIndex].numDenominations;
                    row.collectionStats.numNotes = colRows[collecIndex].numNotes;
                    row.collectionStats.numVariants = colRows[collecIndex].numVariants;
                    row.collectionStats.price = colRows[collecIndex].price;
                    collecIndex++;
                } else {
                    row.collectionStats.numTerritories = 0;
                    row.collectionStats.numCurrencies = 0;
                    row.collectionStats.numSeries = 0;
                    row.collectionStats.numDenominations = 0;
                    row.collectionStats.numNotes = 0;
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







const yearsStats_commonSELECT =
    `BVA.bva_issue_year AS "issueYear", count(DISTINCT(BAN.ban_face_value + BAN.ban_cus_id)) AS "numDenominations", 
    count(DISTINCT BVA.bva_id) AS "numVariants"`;

const territoryYearsStats_commonFROM =
    `FROM bva_variant BVA
    INNER JOIN tec_territory_currency TEC ON TEC.tec_ter_id = $1 AND TEC.tec_cur_type='OWNED'
    LEFT JOIN ban_banknote BAN ON BAN.ban_id = BVA.bva_ban_id
    INNER JOIN ser_series SER ON BAN.ban_ser_id = SER.ser_id AND SER.ser_cur_id = TEC.tec_cur_id`;

// ===> /territory/:territoryId/issue-years/items/stats
function territoryByIdIssueYearsItemsStatsGET(request, response) {
    let territoryId = parseInt(request.params.territoryId);

    // Check that the Id is an integer
    if (Number.isNaN(territoryId) || territoryId.toString() !== request.params.territoryId) {
        new Exception(400, "VAR-1", "Invalid Territory Id, " + request.params.territoryId).send(response);
        return;
    }

    let sql = ` SELECT  ${yearsStats_commonSELECT}
                ${territoryYearsStats_commonFROM}
                GROUP BY "issueYear"`;

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

        sql = ` SELECT ${yearsStats_commonSELECT}, sum(BIT.bit_price * BIT.bit_quantity) AS "price"
                ${territoryYearsStats_commonFROM}
                INNER JOIN bit_item BIT ON BIT.bit_bva_id = BVA.bva_id
                INNER JOIN usr_user USR ON USR.usr_id = BIT.bit_usr_id AND USR.usr_name = $2
                GROUP BY "issueYear"`;

        catalogueDB.execSQL(sql, [territoryId, request.session.user], (err, colRows) => {
            if (err) {
                new Exception(500, err.code, err.message).send(response);
                return;
            }

            // Join the collection results into the catalogue statistics
            let collecIndex = 0;
            for (let row of catRows) {
                row.collectionStats = {};
                if (collecIndex < colRows.length && row.issueYear === colRows[collecIndex].issueYear) {
                    row.collectionStats.numDenominations = colRows[collecIndex].numDenominations;
                    row.collectionStats.numVariants = colRows[collecIndex].numVariants;
                    row.collectionStats.price = colRows[collecIndex].price;
                    collecIndex++;
                } else {
                    row.collectionStats.numDenominations = 0;
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




const currencyYearsStats_commonFROM =
    `FROM bva_variant BVA
    INNER JOIN ban_banknote BAN ON BAN.ban_id = BVA.bva_ban_id
    INNER JOIN ser_series SER ON BAN.ban_ser_id = SER.ser_id AND SER.ser_cur_id = $1`;

// ===> /currency/:currencyId/issue-years/items/stats
function currencyByIdIssueYearsItemsStatsGET(request, response) {
    let currencyId = parseInt(request.params.currencyId);

    // Check that the Id is an integer
    if (Number.isNaN(currencyId) || currencyId.toString() !== request.params.currencyId) {
        new Exception(400, "VAR-1", "Invalid Currency Id, " + request.params.currencyId).send(response);
        return;
    }

    let sql = ` SELECT  ${yearsStats_commonSELECT}
                ${currencyYearsStats_commonFROM}
                GROUP BY "issueYear"`;

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

        sql = ` SELECT ${yearsStats_commonSELECT}, sum(BIT.bit_price * BIT.bit_quantity) AS "price"
                ${currencyYearsStats_commonFROM}
                INNER JOIN bit_item BIT ON BIT.bit_bva_id = BVA.bva_id
                INNER JOIN usr_user USR ON USR.usr_id = BIT.bit_usr_id AND USR.usr_name = $2
                GROUP BY "issueYear"`;

        catalogueDB.execSQL(sql, [currencyId, request.session.user], (err, colRows) => {
            if (err) {
                new Exception(500, err.code, err.message).send(response);
                return;
            }

            // Join the collection results into the catalogue statistics
            let collecIndex = 0;
            for (let row of catRows) {
                row.collectionStats = {};
                if (collecIndex < colRows.length && row.issueYear === colRows[collecIndex].issueYear) {
                    row.collectionStats.numDenominations = colRows[collecIndex].numDenominations;
                    row.collectionStats.numVariants = colRows[collecIndex].numVariants;
                    row.collectionStats.price = colRows[collecIndex].price;
                    collecIndex++;
                } else {
                    row.collectionStats.numDenominations = 0;
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