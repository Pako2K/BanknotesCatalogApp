"use strict";

const log = require("../../utils/logger").logger;
const Exception = require('../../utils/Exception').Exception;
const dbs = require('../../db-connections');


let catalogueDB;

module.exports.initialize = function(app) {
    catalogueDB = dbs.getDBConnection('catalogueDB');

    app.get('/continents', continentsGET);
    app.get('/territory-types', territoryTypesGET);
    app.get('/territory/:territoryId', territoryByIdGET);

    log.debug("Territories service initialized");
};


// ===> /continents
function continentsGET(request, response) {
    const sql = `   SELECT con_id as id, con_name as name 
                    FROM con_continent
                    WHERE con_order NOTNULL
                    ORDER BY con_order`;

    catalogueDB.getAndReply(response, sql);
}


// ===> /territory-types
function territoryTypesGET(request, response) {
    let sql = `SELECT  tty_id AS id, tty_name AS name, tty_abbr AS abbrevation, tty_desc AS description
                FROM tty_territory_type
                WHERE tty_order NOTNULL
                ORDER BY tty_order`;

    catalogueDB.getAndReply(response, sql);
}


// ===> /territory/{territoryId}
function territoryByIdGET(request, response) {
    let territoryId = parseInt(request.params.territoryId);

    // Check that the Id is an integer
    if (Number.isNaN(territoryId) || territoryId.toString() !== request.params.territoryId) {
        new Exception(400, "TER-1", "Invalid Territory Id, " + request.params.territoryId).send(response);
        return;
    }

    let sql = ` SELECT TER.*, CON.con_name, TTY.tty_name, TER2.ter_name AS ter_parent_name, TER2.ter_iso3 AS ter_parent_iso3  
                FROM ter_territory TER
                INNER JOIN con_continent CON ON TER.ter_con_id = CON.con_id
                INNER JOIN tty_territory_type TTY ON TER.ter_tty_id = TTY.tty_id
                LEFT OUTER JOIN ter_territory TER2 ON TER.ter_parent_country_id = TER2.ter_id
                WHERE TER.ter_id = ${territoryId}`;

    catalogueDB.execSQL(sql, [], (err, rows) => {
        if (err) {
            new Exception(500, err.code, err.message).send(response);
            return;
        }

        var replyJSON = {};
        let result = rows[0];
        if (result) {
            // Build reply JSON
            replyJSON.id = result.ter_id;
            if (result.ter_iso3) replyJSON.iso3 = result.ter_iso3;
            replyJSON.name = result.ter_name;
            replyJSON.continent = { "id": result.ter_con_id, "name": result.con_name };
            replyJSON.territoryType = { "id": result.ter_tty_id, "name": result.tty_name };
            if (result.ter_iso2) replyJSON.iso2 = result.ter_iso2;
            replyJSON.officialName = result.ter_official_name;
            replyJSON.start = result.ter_start;
            if (result.ter_end) replyJSON.end = result.ter_end;
            if (result.ter_parent_country_id) {
                replyJSON.parent = { "id": result.ter_parent_country_id, "iso3": result.ter_parent_iso3, "name": result.ter_parent_name };
            }
            if (result.ter_description) replyJSON.description = result.ter_description;

            // Retrieve the information for the predecessor and succesor territories
            let succesorsStr = result.ter_successor_id;
            let sql = "";
            let succesors = [];
            if (succesorsStr && succesorsStr !== "") {
                succesors = succesorsStr.split(",");
                sql = ` SELECT 'SUC' AS type, ter_id, ter_name, ter_iso3 
                        FROM ter_territory 
                        WHERE ter_id in (${succesorsStr})
                        UNION
                        `;
            }
            sql += `SELECT 'PRE' AS type, ter_id, ter_name, ter_iso3 
                    FROM ter_territory 
                    WHERE ter_successor_id = '${result.ter_id}' 
                    OR ter_successor_id like '%,${result.ter_id}' 
                    OR ter_successor_id like '${result.ter_id},%' 
                    OR ter_successor_id like '%,${result.ter_id},%'`;

            catalogueDB.execSQL(sql, [], (err, rows) => {
                if (err) {
                    new Exception(500, err.code, err.message).send(response);
                    return;
                }
                let predecesorsArray = [];
                let successorsArray = [];
                for (let record of rows) {
                    let obj = { "id": record.ter_id, "name": record.ter_name }
                    if (record.ter_iso3) obj.iso3 = record.ter_iso3;
                    if (record.type === "PRE") predecesorsArray.push(obj);
                    else successorsArray.push(obj);
                }
                if (predecesorsArray.length) replyJSON.predecessors = predecesorsArray;
                if (successorsArray.length) replyJSON.successors = successorsArray;

                // Check that all the succesor id's exist
                if (successorsArray.length < succesors.length) {
                    new Exception(500, "TER-2", "Data inconsitency. Successor id not found").send(response);
                    return;
                }

                response.writeHead(200, { 'Content-Type': 'application/json' });
                response.write(JSON.stringify(replyJSON));
                response.send();
            });
        } else {
            response.writeHead(200, { 'Content-Type': 'application/json' });
            response.write(JSON.stringify(replyJSON));
            response.send();
        }
    });
}