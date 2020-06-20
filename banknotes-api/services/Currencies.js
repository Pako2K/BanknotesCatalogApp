"use strict";

const log = require("../../utils/logger").logger;
const Exception = require('../../utils/Exception').Exception;
const dbs = require('../../db-connections');


let catalogueDB;


module.exports.initialize = function(app) {
    catalogueDB = dbs.getDBConnection('catalogueDB');

    app.get('/currency/:currencyId', currencyByIdGET);

    log.debug("Currencies service initialized");
};



// ===> /currency/:currencyId
function currencyByIdGET(request, response) {
    let currencyId = request.params.currencyId;

    // Check that the Id is an integer
    if (Number.isNaN(currencyId) || currencyId.toString() !== request.params.currencyId) {
        new Exception(400, "CUR-1", "Invalid Currency Id, " + request.params.currencyId).send(response);
        return;
    }

    let sql = ` SELECT cur.*, TEC.tec_iso3, TER.ter_con_id,  CON.con_name, TER.ter_id, TER.ter_iso3, TER.ter_name, CUS.cus_value, CUS.cus_name, CUS.cus_abbreviation,
                        pred.cur_id AS pred_cur_id, pred.cur_name AS pred_cur_name, predTEC.tec_ISO3 AS pred_tec_iso3, pred.cur_replacement_rate AS pred_cur_replacement_rate,
                        succ.cur_name AS succ_cur_name, succTEC.tec_ISO3 AS succ_tec_iso3
                FROM cur_currency CUR
                INNER JOIN tec_territory_currency TEC ON TEC.tec_cur_id = CUR.cur_id AND TEC.tec_cur_type = 'OWNED'
                INNER JOIN ter_territory TER ON TEC.tec_ter_id = TER.ter_id
                INNER JOIN con_continent CON ON con_id = TER.ter_con_id
                LEFT JOIN cus_currency_unit CUS ON CUR.cur_id = CUS.cus_cur_id
                LEFT JOIN cur_currency pred ON pred.cur_successor = cur.cur_id
                LEFT JOIN tec_territory_currency predTEC ON predTEC.tec_cur_id = pred.cur_id AND predTEC.tec_cur_type = 'OWNED'
                LEFT JOIN cur_currency succ ON succ.cur_id = cur.cur_successor 
                LEFT JOIN tec_territory_currency succTEC ON succTEC.tec_cur_id = succ.cur_id AND succTEC.tec_cur_type = 'OWNED'
                WHERE CUR.cur_id = ${currencyId}`;

    catalogueDB.execSQL(sql, [], (err, rows) => {
        if (err) {
            new Exception(500, err.code, err.message).send(response);
            return;
        }

        // Build reply JSON
        var replyJSON = {};
        if (rows.length > 0) {
            replyJSON.id = rows[0].cur_id;
            replyJSON.territory = {};
            replyJSON.territory.continentId = rows[0].ter_con_id;
            replyJSON.territory.continentName = rows[0].con_name;
            replyJSON.territory.id = rows[0].ter_id;
            replyJSON.territory.iso3 = rows[0].ter_iso3;
            replyJSON.territory.name = rows[0].ter_name;
            replyJSON.symbol = rows[0].cur_symbol;
            replyJSON.iso3 = rows[0].tec_iso3;
            replyJSON.name = rows[0].cur_name;
            replyJSON.fullName = rows[0].cur_full_name;
            replyJSON.units = [];
            if (rows[0].cus_value) {
                for (let row of rows) {
                    replyJSON.units.push({ "name": row.cus_name, "value": row.cus_value, "abbreviation": row.cus_abbreviation });
                }
            }
            replyJSON.start = rows[0].cur_start;
            replyJSON.end = rows[0].cur_end;
            if (rows[0].pred_cur_id) {
                replyJSON.predecessor = {};
                replyJSON.predecessor.id = rows[0].pred_cur_id;
                replyJSON.predecessor.name = rows[0].pred_cur_name;
                replyJSON.predecessor.iso3 = rows[0].pred_tec_iso3;
                replyJSON.predecessor.rate = rows[0].pred_cur_replacement_rate;
            }
            if (rows[0].cur_successor) {
                replyJSON.successor = {};
                replyJSON.successor.id = rows[0].cur_successor;
                replyJSON.successor.name = rows[0].succ_cur_name;
                replyJSON.successor.iso3 = rows[0].succ_tec_iso3;
                replyJSON.successor.rate = rows[0].cur_replacement_rate;
            }
            replyJSON.description = rows[0].cur_description;
        }

        response.writeHead(200, { 'Content-Type': 'application/json' });
        response.write(JSON.stringify(replyJSON));
        response.send();
    });
}