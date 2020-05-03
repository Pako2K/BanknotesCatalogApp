"use strict";

const https = require('https');
const http = require('http');
const fs = require('fs');
const logger = require('./utils/logger');
const express = require('express');
const session = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session);
const crypto = require('crypto');
const DBs = require('./DBConnections');
const api = require('./banknotes-api');

// Read environment parameter
const ENV = process.argv[2];

console.log(" *** ENVIRONMENT: " + ENV);

const appConfigFile = `config/${ENV}/app.config.json`;

// Read configuration properties from file
const appConfig = JSON.parse(fs.readFileSync(appConfigFile));

// Initialize logger for the whole application
const log = logger.initialize(appConfig.logConfigFile);
log.info(`Logger initialized at ${log.level} level`);

// Initialize DB connections
DBs.connect(appConfig.credentialsDB, 'credentialsDB')
    .then(() => {
        DBs.connect(appConfig.catalogueDB, 'catalogueDB')
            .then(() => {
                startServer();
            })
            .catch((err) => {
                // In case of error terminate the application
                terminate(err);
            });

    })
    .catch((err) => {
        // In case of error terminate the application
        terminate(err);
    });



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

    api.initialize(app);


    const sslOptions = {
        handshakeTimeout: appConfig.sslOptions.handshakeTimeout,
        requestCert: false, // NO MUTUAL AUTHENTICATION
        maxVersion: appConfig.sslOptions.maxVersion,
        minVersion: appConfig.sslOptions.minVersion,
        key: fs.readFileSync(appConfig.sslOptions.privateKeyFile),
        cert: fs.readFileSync(appConfig.sslOptions.certificateFile)
    };

    log.debug("SSL Options: " + JSON.stringify(appConfig.sslOptions));

    if (appConfig.useHTTPS) {
        https.createServer(sslOptions, app).listen(appConfig.serverPort);
        log.info("Listening port (https): " + appConfig.serverPort);
    } else {
        http.createServer(app).listen(appConfig.serverPort);
        log.info("Listening port (http): " + appConfig.serverPort);
    }
}


function terminate(err) {
    log.error(err);
    log.info("Closing application");
    logger.shutdown(() => {
        process.exit(1);
    });
}
/*

let Exception = require('./utils/Exception').Exception;
const banknotesAPI = require("./banknotes-api");

app.use(
    extSessionMgmt // Additional session management
);

try {
    // Initialize the API: open the DB and assign the routes to the express app (application server)
    banknotesAPI.initialize(app, banknotesDBFile, credDBFile)
    .then(() => {
        // Only when the initialization is successfully completed, create the app listener
        let server = app.listen(8081, function() {
            logger.info(`App listening at port: ${server.address().port}`);
        });
    })
    .catch((err) => {
        // In case of error terminate the application
        terminate(err);
    });
} catch (exc) {
    terminate(exc);
}




function extSessionMgmt(req, res, next) {
    // // User is not logged in anymore or is anonymous
    // // Extract username from the cookie:
    // let username = getHeaderCookie(req.headers.cookie, "banknotes.ODB.username");
    // if (!username) {
    //     if (req.session.user) {
    //         logger.info("Username not received. Disconnecting current session for " + req.session.user);
    //         // Cancel current session and sent error
    //         destroySession(req, res, 403, "SES-1", "Invalid username");
    //         return;
    //     } else {
    //         // Anonymous session does not expire
    //         req.session.cookie.maxAge = undefined;
    //     }
    // } else if (!req.session.user || req.session.user !== username) {
    //     logger.info("Username does not match or session has expired. Disconnecting current session for " + req.session.user);
    //     // Cancel current session and sent error
    //     destroySession(req, res, 403, "SES-2", "Invalid session");
    //     return;
    // }
    next();
}
*/