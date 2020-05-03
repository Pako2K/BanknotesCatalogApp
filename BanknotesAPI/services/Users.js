"use strict";

const log = require("../utils/logger").logger;
const Exception = require('../utils/Exception').Exception;
const dbs = require('../DBConnections');
const crypto = require('crypto');
const jsonParser = require('body-parser').json();
const jsonValidator = require('jsonschema').validate;
const moment = require('moment');

let credDB;
let catalogueDB;

module.exports.initialize = function(app) {
    credDB = dbs.getDB('credentialsDB');
    catalogueDB = dbs.getDB('catalogueDB');

    app.put('/user', jsonParser, userPUT);
    app.delete('/user/session', userSessionDELETE);
    app.get('/user/session', userSessionGET);
    app.get('/user/session/ping', userSessionPingGET);

    log.debug("Users service initialized");
};


const UserSchema = {
    "type": "object",
    "required": ["username", "email", "password"],
    "properties": {
        "username": {
            "type": "string",
            "maxLength": 16,
            "minLength": 3,
            "pattern": "^[A-Za-z 0-9]+$"
        },
        "email": {
            "type": "string",
            "pattern": "^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$"
        },
        "password": {
            "type": "string",
            "description": "base64 encoded password",
            "minLength": "8",
        }
    }
};

const sqlSelectUser = `SELECT * FROM cre_credentials
                       WHERE cre_username = ?1
                       OR cre_mail = ?2`;

const sqlInsertUserCredential = `INSERT INTO cre_credentials (cre_username, cre_salt, cre_hashed_pwd, cre_mail, cre_is_admin)
                                 VALUES (?1, ?2, ?3, ?4, 0)`;

const sqlInsertUserCatalogue = `INSERT INTO usr_user (usr_name)
                                VALUES (?)`;
// ===> /user (register)
function userPUT(request, response) {
    // Validate user info in the body 
    let valResult = jsonValidator(request.body, UserSchema);
    if (valResult.errors.length) {
        let exception = new Exception(400, "REG-1", JSON.stringify(valResult.errors));
        exception.send(response);
        return;
    }

    // decode password
    let buf = Buffer.from(request.body.password, 'base64');
    let pwd = buf.toString();
    // Validate password length: it must have at least 8 characters and no more than 30
    if (pwd.length > 30 || pwd.length < 8) {
        let exception = new Exception(400, "REG-2", "Password is too short (less than 8 characters) or too long (more than 30 characters)");
        exception.send(response);
        return;
    }

    // Validate that username and passowrd do not contain a ":"
    if (pwd.indexOf(":") !== -1 || request.body.username.indexOf(":") !== -1) {
        let exception = new Exception(400, "REG-3", "Username and Password cannot contain ':'");
        exception.send(response);
        return;
    }

    // Check that the username and the email are not already used 
    credDB.get(sqlSelectUser, [request.body.username, request.body.email], (err, row) => {
        if (err) {
            let exception = new Exception(500, err.code, err.message);
            exception.send(response);
            return;
        }

        if (row !== undefined) {
            // User already exists!
            let exception = new Exception(403, "REG-2", "Username or email is already registered");
            exception.send(response);
            return;
        }

        // Calculate Salt 
        const saltLength = 32;
        let salt = crypto.randomBytes(Math.ceil(saltLength / 2)).toString('hex').slice(0, saltLength);

        // Create password hash
        let hashedPwd = encryptPwd(salt, pwd);

        // Store credentials in DB's and send reply
        credDB.run(sqlInsertUserCredential, [request.body.username, salt, hashedPwd, request.body.email], (err) => {
            if (err) {
                let exception = new Exception(500, err.code, err.message);
                exception.send(response);
                return;
            }
            // Copy username to catalogueDB
            catalogueDB.run(sqlInsertUserCatalogue, [request.body.username], (err) => {
                if (err) {
                    let exception = new Exception(500, err.code, err.message);
                    exception.send(response);
                    return;
                }

                // setUserSession(request, request.body.username).catch((err) => {
                //     let exception = new Exception(500, err.code, err.message);
                //     exception.send(response);
                //     return;
                // }).then(() => {
                response.writeHead(200);
                response.send();
                // });
            });
        });
    });
}


const sqlSelectCredentials = "SELECT cre_salt, cre_hashed_pwd, cre_is_admin AS isAdmin, cre_last_connection AS lastConnection FROM cre_credentials where cre_username = ?";
//const sqlSelectCatalogueUser = "SELECT usr_isAdmin AS isAdmin FROM usr_user WHERE usr_name = ?";
const sqlInsertDate = "UPDATE cre_credentials SET cre_last_connection = ?1 WHERE cre_username = ?2"

// ===> /user/session (login)
function userSessionGET(request, response) {
    // Validate and parse authorization header
    if (!request.headers.authorization) {
        let exception = new Exception(400, "LOG-1", "Http header not provided: authorization");
        exception.send(response);
        return;
    }

    // Extract username and password
    // Authorization looks like  "Basic Y2hhcmxlczoxMjM0NQ==". The second part is in base64(user:pwd)
    let tokenizedAuth = request.headers.authorization.split(' ');
    if (tokenizedAuth.length !== 2 || tokenizedAuth[0] !== "Basic") {
        let exception = new Exception(400, "LOG-2", "Value of Http header is not valid: authorization");
        exception.send(response);
        return;
    }

    // Decode string user:pwd
    let buf = Buffer.from(tokenizedAuth[1], 'base64');
    let usrPwd = buf.toString();

    let usrPwdArray = usrPwd.split(':'); // split on a ':'
    if (usrPwdArray.length !== 2) {
        let exception = new Exception(400, "LOG-3", "Invalid username:password in 'authorization' header");
        exception.send(response);
        return;
    }

    let username = usrPwdArray[0];
    let password = usrPwdArray[1];

    log.debug(`Login requested by: ${username}`);

    credDB.get(sqlSelectCredentials, [username], (err, row) => {
        if (err) {
            let exception = new Exception(500, err.code, err.message);
            exception.send(response);
            return;
        }

        // Calculate hashed password and compare to te stored one
        if (row !== undefined && row.cre_hashed_pwd === encryptPwd(row.cre_salt, password)) {
            log.info(`User ${username} logged in`);
            setUserSession(request, username).catch((err) => {
                let exception = new Exception(500, err.code, err.message);
                exception.send(response);
                return;
            }).then(() => {
                let replyJSON = { isAdmin: row.isAdmin, lastConnection: row.lastConnection };
                response.writeHead(200, { 'Content-Type': 'application/json' });
                response.write(JSON.stringify(replyJSON));
                response.send();

                // Store login date
                credDB.run(sqlInsertDate, [moment().format('dddd, DD MMMM YYYY, HH:mm'), username], (err) => {
                    if (err) {
                        log.error(err.code + ": " + err.message);
                        throw err;
                    }
                });
            });

        } else {
            // Unauthorized
            let exception = new Exception(401, "AUT-1", `User ${username} not found or wrong password`);
            exception.send(response);
        }
    });
}


// ===> /user/session (logout)
function userSessionDELETE(request, response) {
    request.session.destroy((err) => {
        if (err) {
            let exception = new Exception(500, err.code, err.message);
            exception.send(response);
            return;
        }

        response.writeHead(200, { 'Content-Type': 'application/json' });
        response.write("{}");
        response.send();
    });
}


// ===> /user/session/ping 
function userSessionPingGET(request, response) {
    let user = request.session.user || "";
    let expiration = 0;
    if (user !== "")
        expiration = request.session.cookie.maxAge;

    let reply = { user: user, expiration: expiration };

    response.writeHead(200, { 'Content-Type': 'application/json' });
    response.write(JSON.stringify(reply)); //
    response.send();
}



function encryptPwd(salt, pwd) {
    // Calculate hashed password 
    let saltePwd = pwd + salt;
    let hash = crypto.createHmac('sha512', salt);
    hash.update(saltePwd);
    return hash.digest('hex');
}


function setUserSession(request, username) {
    return new Promise((resolve, reject) => {
        log.debug(`Old session id: ${request.session.id}`);
        request.session.regenerate((err) => {
            if (err) {
                log.error(err.message);
                reject(err);
            }

            log.debug(`New session id: ${request.session.id}`);
            request.session.user = username;
            resolve();
        });
    });
}

module.exports.validateUser = function(req, res, next) {
    // Extract username from the cookie:
    let username = getHeaderCookie(req.headers.cookie, "banknotes.ODB.username");
    if (!username) {
        log.info("Username not received.");
        // sent error
        let exception = new Exception(400, "USER-1", "Username in cookie is missing");
        exception.send(res);
        return;
    }

    // Check that the user matches with the session user
    if (!req.session.user || req.session.user !== username) {
        log.info("Username is not valid or session has expired.");
        // Cancel current session and sent error
        // sent error
        let exception = new Exception(403, "USER-2", "Username not logged-in or invalid session");
        exception.send(res);
        return;
    }
    next();
}


// module.exports.validateSessionUser = function(req, res, next) {
//     // User is not logged in anymore or is anonymous
//     // Extract username from the cookie:
//     let username = getHeaderCookie(req.headers.cookie, "banknotes.ODB.username");
//     if (!username) {
//         if (req.session.user) {
//             log.info("Username not received. Disconnecting current session for " + req.session.user);
//             // Cancel current session and sent error
//             destroySession(req, res, 403, "SES-1", "Invalid username");
//             return;
//         } else {
//             // Anonymous session does not expire
//             req.session.cookie.maxAge = undefined;
//         }
//     } else if (!req.session.user || req.session.user !== username) {
//         log.info("Username does not match or session has expired. Disconnecting current session for " + req.session.user);
//         // Cancel current session and sent error
//         destroySession(req, res, 403, "SES-2", "Invalid session");
//         return;
//     }
//     next();
// }


// module.exports.validateAdmin = function(req, res, next) {
//     // Validate that the user has admin rights

//     // Extract username from the cookie and check tha it is the same as the current session user:
//     let username = getHeaderCookie(req.headers.cookie, "banknotes.ODB.username");
//     if (!username || !req.session.user || username !== req.session.user) {
//         log.info("Username does not match or session has expired. Disconnecting current session for " + req.session.user);
//         // Cancel current session and sent error
//         destroySession(req, res, 403, "SES-2", "Invalid session");
//         return;
//     }

//     let sqlUser = `SELECT usr_isAdmin FROM usr_user WHERE usr_name = "${username}"`;

//     catalogDB.get(sqlUser, [], (err, row) => {
//         if (err) {
//             let exception = new Exception(500, err.code, err.message);
//             exception.send(res);
//             return;
//         }


//         if (!row.usr_isAdmin) {
//             let exception = new Exception(403, "AUT-2", `User ${username} is not allowed to perform changes in the Catalogue`);
//             exception.send(res);
//             return;
//         }

//         next();
//     });
// }

function getHeaderCookie(cookie, cookieName) {
    let pos = cookie.indexOf(cookieName);
    if (pos === -1)
        return undefined;

    let substrCookie = cookie.substr(pos + 1 + cookieName.length);
    let posEnd = substrCookie.indexOf(";");
    let username;
    if (posEnd === -1)
        username = substrCookie.trim();
    else
        username = substrCookie.substr(0, posEnd).trim();

    return username;
}


// function destroySession(req, res, status, errCode, errMsg) {
//     // Cancel current session and sent error
//     req.session.destroy((err) => {
//         if (err) {
//             let exception = new Exception(500, err.code, err.message);
//             exception.send(res);
//             return;
//         }

//         let exception = new Exception(status, errCode, errMsg);
//         exception.send(res);
//     });
// }