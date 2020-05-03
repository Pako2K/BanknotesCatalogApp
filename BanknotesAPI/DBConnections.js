const log = require("./utils/logger").logger;
const Exception = require('./utils/Exception').Exception;
const sqlite3 = require('sqlite3');


const dbArray = [];

module.exports.connect = function(file, dbAlias) {
    return new Promise((resolve, reject) => {
        if (this.getDB(dbAlias)) {
            log.info(`Already connected to DB: ${file}`);
            resolve();
        } else {
            log.debug(`Trying to open DB ${file}`);
            let dbConnection = new sqlite3.Database(file, sqlite3.OPEN_READWRITE, (err) => {
                if (err) {
                    log.error(err.message);
                    reject(err);
                    return;
                };
                log.info(`Connected to DB: ${file}`);
                dbArray.push({ alias: dbAlias, connection: dbConnection })
                resolve();
            });
        }
    });
}

module.exports.getDB = function(dbAlias) {
    let pos = dbArray.findIndex((value, index) => {
        return value.alias === dbAlias;
    });
    if (pos !== -1)
        return dbArray[pos].connection;
    else
        return undefined;
}


module.exports.simpleSQLOperation = function(response, db, sqlStr) {
    db.all(sqlStr, [], (err, rows) => {
        if (err) {
            let exception = new Exception(500, err.code, err.message);
            exception.send(response);
            return;
        }

        // Build reply JSON
        response.writeHead(200, { 'Content-Type': 'application/json' });
        response.write(JSON.stringify(rows));
        response.send();
    });
}