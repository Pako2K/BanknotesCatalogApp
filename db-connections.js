"use strict";

const log = require("./utils/logger").logger;
const Exception = require('./utils/Exception').Exception;
const { Pool } = require('pg');

// By default int8 (int 64 bits) is converted to string. This will change the conversion from int8 to int4 instead
var types = require('pg').types
types.setTypeParser(20, (val) => { return parseInt(val) });

const dbArray = [];

class PostgresDB {
    constructor(conParams) {
        this.pool = new Pool(conParams);
        log.info(`Connected to DB: ${conParams.database}`);
    }

    execSQL(sqlStr, params, callback) {
        this.pool.query(sqlStr, params, (err, result) => {
            if (err)
                callback(err);
            else
                callback(err, result.rows);
        });
    }

    disconnect() {
        this.pool.end();
    }

    getAndReply(response, sqlStr) {
        this.pool.query(sqlStr, (err, result) => {
            if (err) {
                let exception = new Exception(500, err.code, err.message);
                exception.send(response);
                return;
            }

            // Build reply JSON
            response.writeHead(200, { 'Content-Type': 'application/json' });
            response.write(JSON.stringify(result.rows));
            response.send();
        });
    }
}

module.exports.connect = function(conParams, dbAlias) {
    let dbConnection = this.getDBConnection(dbAlias);
    if (dbConnection) {
        log.info(`Already connected to DB: ${conParams.database}`);
        return dbConnection;
    } else {
        log.debug(`Trying to open connection to DB ${conParams.database}`);
        try {
            dbConnection = new PostgresDB(conParams);
            dbArray.push({ alias: dbAlias, connection: dbConnection })
        } catch (err) {
            log.error(err);
        }
        return dbConnection;
    }
}

module.exports.disconnect = function(dbAlias) {
    this.getDBConnection(dbAlias).disconnect();
}

module.exports.disconnectAll = function() {
    dbArray.forEach((value, index) => { value.connection.disconnect(); });
}

module.exports.getDBConnection = function(dbAlias) {
    let pos = dbArray.findIndex((value, index) => {
        return value.alias === dbAlias;
    });
    if (pos !== -1)
        return dbArray[pos].connection;
    else
        return undefined;
}