"use strict";


const https = require('https');
const http = require('http');
const fs = require('fs');
const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');
const logger = require('./utils/logger');
const express = require('express');
const session = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session);
const crypto = require('crypto');
const DBs = require('./db-connections');
const api = require('./banknotes-api/banknotes-api');

// Read environment parameter
const ENV = process.argv[2];

console.log(" *** ENVIRONMENT: " + ENV);

const appConfigFile = `./config/${ENV}/app.config.json`;

// Read configuration properties from file
const appConfig = JSON.parse(fs.readFileSync(appConfigFile));

// Initialize logger for the whole application
const log = logger.initialize(appConfig.logConfigFile);
log.info(`Logger initialized at ${log.level} level`);

// Initialize DB connections and Server Port. By default values are taken from the environment. If not available, then read them from the conifg
appConfig.credentialsDB.connectionString = process.env.CRE_DATABASE_URL || appConfig.credentialsDB.connectionString;
log.info(appConfig.credentialsDB.connectionString);

appConfig.catalogueDB.connectionString = process.env.CAT_DATABASE_URL || appConfig.catalogueDB.connectionString;
log.info(appConfig.catalogueDB.connectionString);

appConfig.serverPort = process.env.PORT || appConfig.serverPort;

// Connect to the DB's and start the server
if (DBs.connect(appConfig.credentialsDB, 'credentialsDB') && DBs.connect(appConfig.catalogueDB, 'catalogueDB')) {
    startServer();
} else {
    terminate();
}



function startServer() {
    // Create the express app
    const app = express();

    // Add session middleware
    const sessionConf = appConfig.sessionOptions;
    sessionConf.secret = crypto.randomBytes(Math.ceil(16 / 2)).toString('hex').slice(0, 16);
    sessionConf.store = new SQLiteStore({ db: ':memory:' });
    app.use(session(sessionConf));

    // Add middleware for the static content path
    app.use(express.static(appConfig.staticContent));

    // Add midleware to generate Swagger UI
    const usersOAS = YAML.load('./banknotes-api/oas/users-api.yaml');
    const banknotesOAS = YAML.load('./banknotes-api/oas/banknotes-api.yaml');
    app.use('/api-docs/users', swaggerUi.serve, swaggerUi.setup(usersOAS));
    app.use('/api-docs/banknotes', swaggerUi.serve, swaggerUi.setup(banknotesOAS));

    // Add default logging middleware
    app.use((req, res, next) => {
        log.debug(`URL requested: ${req.url}`);
        log.debug(`HTTP Method: ${req.method}`);
        log.debug("Cookies: " + req.headers.cookie);
        log.debug("Session: " + req.session.id);
        log.debug("User: " + req.session.user);
        log.debug("Original MaxAge: " + req.session.cookie.originalMaxAge);
        log.debug("MaxAge: " + req.session.cookie.maxAge);
        next();
    });

    api.initialize(app, usersOAS, banknotesOAS);

    if (appConfig.useHTTPS) {
        const sslOptions = {
            handshakeTimeout: appConfig.sslOptions.handshakeTimeout,
            requestCert: false, // NO MUTUAL AUTHENTICATION
            maxVersion: appConfig.sslOptions.maxVersion,
            minVersion: appConfig.sslOptions.minVersion,
            key: fs.readFileSync(appConfig.sslOptions.privateKeyFile),
            cert: fs.readFileSync(appConfig.sslOptions.certificateFile)
        };

        log.debug("SSL Options: " + JSON.stringify(appConfig.sslOptions));

        https.createServer(sslOptions, app).listen(appConfig.serverPort);
        log.info("Listening port (https): " + appConfig.serverPort);
    } else {
        http.createServer(app).listen(appConfig.serverPort);
        log.info("Listening port (http): " + appConfig.serverPort);
    }
}


function terminate() {
    log.info("Closing application");
    DBs.disconnectAll();
    logger.shutdown(() => {
        process.exit(1);
    });
}