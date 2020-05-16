"use strict";

const url = require('url');
const log = require("../../utils/logger").logger;
const Exception = require('../../utils/Exception').Exception;
const dbs = require('../../db-connections');


let catalogueDB;


module.exports.initialize = function(app) {
    catalogueDB = dbs.getDBConnection('catalogueDB');

    app.get('/variants/years', variantsYearsGET);
    app.get('/variants', variantsGET);

    log.debug("Variants service initialized");

};


// ===> /variants/years
function variantsYearsGET(request, response) {
    let sql = `SELECT  BVA.bva_issue_year AS "issueYear",
                    TER.ter_con_id AS "continentId", count (DISTINCT TER.ter_id) AS "numTerritories", 
                    count (DISTINCT CUR.cur_id) AS "numCurrencies", count (DISTINCT SER.ser_id) AS "numSeries", 
                    count(DISTINCT(BAN.ban_face_value + BAN.ban_cus_id)) AS "numDenominations", 
                    count(DISTINCT BAN.ban_id) AS "numNotes", count(BVA.bva_id) AS "numVariants"
                FROM bva_variant BVA
                LEFT JOIN ban_banknote BAN ON BAN.ban_id = BVA.bva_ban_id
                LEFT JOIN ser_series SER ON BAN.ban_ser_id = SER.ser_id
                LEFT JOIN cur_currency CUR ON SER.ser_cur_id = CUR.cur_id
                LEFT JOIN tec_territory_currency TEC ON (TEC.tec_cur_id = CUR.cur_id AND TEC.tec_cur_type='OWNED')
                LEFT JOIN ter_territory TER ON (TER.ter_id = TEC.tec_ter_id AND TER.ter_con_id <> 1)
                GROUP BY "issueYear", "continentId"`;

    catalogueDB.getAndReply(response, sql);
}



//===> /variants?contId&terTypeId&terStartDateFrom&terStartDateTo&terEndDateFrom&terEndDateTo&curType
//               &curStartDateFrom&curStartDateTo&curEndDateFrom&currEndDateTo&minDenom&maxDenom&issueDateFrom&issueDateTo
function variantsGET(request, response) {
    let queryStrJSON = url.parse(request.url, true).query;
    let param;

    // Calculate the filters for territories
    let sqlTerritory = "";
    param = queryStrJSON.contId || "";
    if (param !== "")
        sqlTerritory = `AND TER.ter_con_id = ${param}`;

    param = queryStrJSON.terTypeId || "";
    if (param !== "")
        sqlTerritory += ` AND TER.ter_tty_id = ${param}`;

    param = queryStrJSON.terStartDateFrom || "";
    if (param !== "")
        sqlTerritory += ` AND CAST(substr(TER.ter_start,1,4) AS INTEGER) >= ${param}`;

    param = queryStrJSON.terStartDateTo || "";
    if (param !== "")
        sqlTerritory += ` AND CAST(substr(TER.ter_start,1,4) AS INTEGER) <= ${param}`;

    param = queryStrJSON.terEndDateFrom || "";
    if (param !== "")
        sqlTerritory += ` AND CAST(substr(TER.ter_end,1,4) AS INTEGER) >= ${param}`;

    param = queryStrJSON.terEndDateTo || "";
    if (param !== "")
        sqlTerritory += ` AND CAST(substr(TER.ter_end,1,4) AS INTEGER) <= ${param}`;

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
    param = queryStrJSON.issueDateFrom || "";
    if (param !== "")
        if (sqlBanknote === "")
            sqlBanknote = `WHERE issueYear >= ${param}`;
        else
            sqlBanknote += ` AND issueYear >= ${param}`;
    param = queryStrJSON.issueDateTo || "";
    if (param !== "") {
        if (sqlBanknote === "")
            sqlBanknote = `WHERE issueYear <= ${param}`;
        else
            sqlBanknote += ` AND issueYear <= ${param}`;
    }

    // If the 3 sql filters are "" (and therefore they are equal)
    if (sqlTerritory === sqlCurrency && sqlBanknote === sqlCurrency) {
        new Exception(400, "VAR-001", "Search parameters not found").send(response);
        return;
    }


    let sqlStr = `  SELECT BVA.bva_cat_id AS "catalogueId", CASE WHEN BAN.ban_cus_id = 0 THEN BAN.ban_face_value ELSE BAN.ban_face_value / CUS.cus_value END AS "denomination",
                            BVA.bva_issue_year AS "issueYear", BVA.bva_printed_date AS "printedDate", SER.ser_id AS "seriesId", SER.ser_name AS "seriesName", 
                            CUR.cur_id AS "currencyId", CUR.cur_name AS "currencyName", TER.ter_id AS "territoryId", TER.ter_name AS "territoryName"
                    FROM bva_variant BVA
                    INNER JOIN ban_banknote BAN ON BVA.bva_ban_id = BAN.ban_id
                    INNER JOIN cus_currency_unit CUS ON BAN.ban_cus_id = CUS.cus_id
                    INNER JOIN ser_series SER ON BAN.ban_ser_id = SER.ser_id
                    INNER JOIN cur_currency CUR ON SER.ser_cur_id = CUR.cur_id ${sqlCurrency}
                    INNER JOIN tec_territory_currency TEC ON CUR.cur_id = TEC.tec_cur_id AND TEC.tec_cur_type = 'OWNED'
                    INNER JOIN ter_territory TER ON TEC.tec_ter_id = TER.ter_id ${sqlTerritory}
                    ${sqlBanknote}`;

    catalogueDB.execSQL(sqlStr, [], (err, rows) => {
        if (err) {
            new Exception(500, err.code, err.message).send(response);
            return;
        }

        if (rows.length > 500) {
            new Exception(413, "VAR-002", "Too many variants found: " + rows.length).send(response);
            return;
        }

        // Build reply JSON
        response.writeHead(200, { 'Content-Type': 'application/json' });
        response.write(JSON.stringify(rows));
        response.send();
    });
}