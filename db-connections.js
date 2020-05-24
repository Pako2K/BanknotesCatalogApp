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
    }

    beginTransaction() {
        return new Promise((resolve, reject) => {
            this.pool.connect((err, client, done) => {
                if (err) {
                    log.error('Error retrieving client connection.' + JSON.stringify(err));
                    if (client)
                        client.release();
                    reject(err);
                }
                client.query('BEGIN', (err) => {
                    if (err) {
                        log.error('Error starting transaction.' + JSON.stringify(err));
                        client.release();
                        reject(err);
                    }
                    resolve(client);
                });
            });
        });
    }

    execSQLTransaction(client, sqlStr, params) {
        return new Promise((resolve, reject) => {
            client.query(sqlStr, params, (err, result) => {
                if (err) {
                    rollbackTransaction(client);
                    reject(err);
                } else
                    resolve(result.rows);
            });
        });
    }

    commitTransaction(client) {
        return new Promise((resolve, reject) => {
            client.query('COMMIT', (err) => {
                client.release();
                if (err) {
                    log.error('Error committing transaction.' + JSON.stringify(err));
                    reject(err);
                }
                resolve();
            });
        });
    }

    rollbackTransaction(client) {
        return new Promise((resolve, reject) => {
            client.query('ROLLBACK', (err) => {
                client.release();
                if (err) {
                    log.error('Error rolling back transaction.' + JSON.stringify(err));
                    reject(err);
                }
                resolve();
            });
        });
    }

    execSQL(sqlStr, params, callback) {
        this.pool.query(sqlStr, params, (err, result) => {
            if (err) {
                err.message += `\nSQL Query: ${sqlStr}\nSQL Params: ${params}`;
                callback(err);
            } else
                callback(err, result.rows);
        });
    }

    disconnect() {
        this.pool.end();
    }

    getAndReply(response, sqlStr) {
        this.pool.query(sqlStr, (err, result) => {
            if (err) {
                err.message += `\nSQL Query: ${sqlStr}`;
                new Exception(500, err.code, err.message).send(response);
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
        log.info(`Already connected to DB: ${dbAlias}`);
        return dbConnection;
    } else {
        log.debug(`Trying to open connection to DB ${JSON.stringify(conParams)}`);
        try {
            dbConnection = new PostgresDB(conParams);
            log.info(`Connected to DB: ${dbAlias}`);
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