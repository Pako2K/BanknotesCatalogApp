"use strict";

const log = require("../../utils/logger").logger;
const Exception = require('../../utils/Exception').Exception;
const dbs = require('../../db-connections');


let catalogueDB;

module.exports.initialize = function(app) {
    catalogueDB = dbs.getDBConnection('catalogueDB');

    app.get('/territories/stats', territoriesStatsGET);

    log.debug("Territories service initialized");
};


// ===> /territories/stats
function territoriesStatsGET(request, response) {
    let sql = ` SELECT  TER.ter_id AS "id", TER.ter_con_id AS "continentId", TER.ter_tty_id AS "territoryTypeId", 
                        TER.ter_iso3 AS "iso3", TER.ter_name AS "name", TER.ter_start AS "start", TER.ter_end AS "end", 
                        count(DISTINCT TEC.tec_cur_id) AS "numCurrencies", count (DISTINCT SER.ser_id) AS "numSeries", 
                        count(DISTINCT(BAN.ban_face_value + BAN.ban_cus_id)) AS "numDenominations", 
                        count(DISTINCT BAN.ban_id) AS "numNotes", count(BVA.bva_id) AS "numVariants"
                FROM ter_territory TER
                LEFT JOIN tec_territory_currency TEC ON (TEC.tec_ter_id = TER.ter_id AND TEC.tec_cur_type='OWNED')
                LEFT JOIN ser_series SER ON SER.ser_cur_id = TEC.tec_cur_id
                LEFT JOIN ban_banknote BAN ON BAN.ban_ser_id = SER.ser_id
                LEFT JOIN bva_variant BVA ON BVA.bva_ban_id = BAN.ban_id
                WHERE TER.ter_con_id <> 1
                GROUP BY TER.ter_id
                ORDER BY TER.ter_name`;

    catalogueDB.getAndReply(response, sql);
}