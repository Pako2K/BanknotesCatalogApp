"use strict";

const log = require("../../utils/logger").logger;
const Exception = require('../../utils/Exception').Exception;
const dbs = require('../../db-connections');
const crypto = require('crypto');
const jsonParser = require('body-parser').json();
const jsonValidator = require('jsonschema').validate;
const moment = require('moment');
const mailer = require('nodemailer');
const fs = require('fs');

// Read configuration properties from file
const mailConfig = JSON.parse(fs.readFileSync(`./config/${process.argv[2]}/mail.config.json`));

// Setup mail transport
mailConfig.SMTPTransport.auth.pass = process.env.MAIL_PWD;
let mailTransport = mailer.createTransport(mailConfig.SMTPTransport);

const VAL_CODE_LENGTH = 8;

let credDB;
let catalogueDB;

module.exports.initialize = function(app) {
    credDB = dbs.getDBConnection('credentialsDB');
    catalogueDB = dbs.getDBConnection('catalogueDB');

    app.put('/user', jsonParser, userPUT);
    app.post('/user/validation', jsonParser, userValidationPOST);
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


// ===> /user (register)
function userPUT(request, response) {
    // Validate user info in the body 
    let valResult = jsonValidator(request.body, UserSchema);
    if (valResult.errors.length) {
        new Exception(400, "REG-1", JSON.stringify(valResult.errors)).send(response);
        return;
    }

    // decode password
    let buf = Buffer.from(request.body.password, 'base64');
    let pwd = buf.toString();
    // Validate password length: it must have at least 8 characters and no more than 30
    if (pwd.length > 30 || pwd.length < 8) {
        new Exception(400, "REG-2", "Password is too short (less than 8 characters) or too long (more than 30 characters)").send(response);
        return;
    }

    // Validate that username and passowrd do not contain a ":"
    if (pwd.indexOf(":") !== -1 || request.body.username.indexOf(":") !== -1) {
        new Exception(400, "REG-3", "Username and Password cannot contain ':'").send(response);
        return;
    }

    // Check that the username and the email are not already used 
    const sqlSelectUser = ` SELECT * FROM cre_credentials
                            WHERE cre_username = $1
                            OR cre_mail = $2`;
    credDB.execSQL(sqlSelectUser, [request.body.username, request.body.email], (err, rows) => {
        if (err) {
            new Exception(500, err.code, err.message).send(response);
            return;
        }

        if (rows.length) {
            if (rows[0].cre_state === 0) {
                // User already exists!
                new Exception(403, "REG-2", "Username or email is already registered").send(response);
                return;
            } else {
                // Retrieve Insertion Timestamp and compare it to the current timestamp
                let now = moment();
                let insertTimestamp = moment(rows[0].cre_insert_timestamp);
                if ((now.diff(insertTimestamp, 'seconds')) > 1800) {
                    // Delete "expired" user and continue
                    const sqlDeleteUser = "DELETE FROM cre_credentials WHERE cre_username = $1";
                    credDB.execSQL(sqlDeleteUser, [request.body.username], (err) => {
                        if (err) {
                            new Exception(500, err.code, err.message).send(response);
                            return;
                        }
                    });
                } else {
                    // User already exists!
                    new Exception(403, "REG-2", "Username or email is already registered").send(response);
                    return;
                }
            }
        }

        // Calculate Salt 
        const saltLength = 32;
        let salt = crypto.randomBytes(Math.ceil(saltLength / 2)).toString('hex').slice(0, saltLength);

        // Create password hash
        let hashedPwd = encryptPwd(salt, pwd);

        // Generate validation code
        let validationCode = crypto.randomBytes(Math.ceil(VAL_CODE_LENGTH / 2)).toString('hex').slice(0, VAL_CODE_LENGTH);

        // Create session id to be used during the confirmation of the user (using the validation code)
        log.info(`User ${request.body.username} has requested to sign up`);
        setUserSession(request, request.body.username).catch((err) => {
            new Exception(500, err.code, err.message).send(response);
            return;
        }).then(() => {
            mailConfig.registrationOptions.to = request.body.email;
            mailConfig.registrationOptions.html = mailConfig.registrationOptions.html.replace("%%USERNAME%%", request.body.username)
                .replace("%%CODE%%", validationCode).replace("%%EXPIRATION%%", request.session.cookie.originalMaxAge / 60000);

            mailTransport.sendMail(mailConfig.registrationOptions, function(error, info) {
                if (error) {
                    log.error(`Email not sent: ${request.body.email}. User Name: ${request.body.username}.\nERROR: ${JSON.stringify(error)}`);
                    new Exception(500, "REG-3", error.message).send(response);
                    return;
                }
                log.info(`Validation mail sent to ${request.body.email}. User Name: ${request.body.username}. ${info.response}`);

                // Store credentials in DB's and send reply
                const sqlInsertUserCredential = `INSERT INTO cre_credentials (cre_username, cre_salt, cre_hashed_pwd, cre_mail, cre_is_admin, cre_validation_code, cre_state)
                                                VALUES ($1, $2, $3, $4, 0, $5, -1)`;
                credDB.execSQL(sqlInsertUserCredential, [request.body.username, salt, hashedPwd, request.body.email, validationCode], (err) => {
                    if (err) {
                        new Exception(500, err.code, err.message).send(response);
                        return;
                    }

                    response.writeHead(200);
                    response.send();
                });
            });
        });
    });
}

const UserValidationSchema = {
    "type": "object",
    "required": ["username", "validationCode"],
    "properties": {
        "username": {
            "type": "string",
            "maxLength": 16,
            "minLength": 3,
            "pattern": "^[A-Za-z 0-9]+$"
        },
        "validationCode": {
            "type": "string",
            "minLength": VAL_CODE_LENGTH,
        }
    }
};
// ===> /user/validation (registration confirmation)
function userValidationPOST(request, response) {
    // Validate user info in the body 
    let valResult = jsonValidator(request.body, UserValidationSchema);
    if (valResult.errors.length) {
        new Exception(400, "VAL-01", JSON.stringify(valResult.errors)).send(response);
        return;
    }

    // Check that the username matches the session user
    if (request.body.username !== request.session.user) {
        new Exception(403, "VAL-02", `Session is not valid or expired`).send(response);
        return;
    }

    // Check that the validation code is correct
    const sqlSelectUser = ` SELECT * FROM cre_credentials
                            WHERE cre_username = $1`;
    credDB.execSQL(sqlSelectUser, [request.session.user], (err, rows) => {
        if (err) {
            new Exception(500, err.code, err.message).send(response);
            return;
        }

        if (rows[0].length === 0) {
            new Exception(403, "VAL-03", `User is not valid`).send(response);
            return;
        }

        if (rows[0].cre_state === 0) {
            // User already activated!
            response.writeHead(200);
            response.send();
            return;
        }

        if (rows[0].cre_validation_code !== request.body.validationCode) {
            let newState;
            if (rows[0].cre_state === -1) newState = 1;
            else if (rows[0].cre_state === 1) newState = 2;
            else newState = 3;

            if (newState < 3) {
                // Update state
                const sqlUpdateState = "UPDATE cre_credentials SET cre_state = $1 WHERE cre_username = $2";
                credDB.execSQL(sqlUpdateState, [newState, request.session.user], (err) => {
                    if (err) {
                        new Exception(500, err.code, err.message).send(response);
                        return
                    }
                    new Exception(403, "VAL-04", `Validation code is wrong. ${3 - newState} attempts left.`).send(response);
                    return;
                });
            } else {
                // Cancel registration
                // Delete user
                const sqlDeleteUser = "DELETE FROM cre_credentials WHERE cre_username = $1";
                credDB.execSQL(sqlDeleteUser, [request.session.user], (err) => {
                    if (err) {
                        new Exception(500, err.code, err.message);
                    }
                    request.session.destroy((err) => {
                        if (err) {
                            new Exception(500, err.code, err.message);
                        }
                        new Exception(403, "VAL-05", `Validation code is wrong. Registration has been cancelled`).send(response);
                        return;
                    });
                });
            }
        } else {
            // Confirm registration: update State and CatalogDB table
            // Update state
            const sqlUpdateState = "UPDATE cre_credentials SET cre_state = 0,  cre_validation_code = NULL WHERE cre_username = $1";
            credDB.execSQL(sqlUpdateState, [request.session.user], (err) => {
                if (err) {
                    new Exception(500, err.code, err.message).send(response);
                    return;
                }
                // Copy username to catalogueDB
                const sqlInsertUserCatalogue = `INSERT INTO usr_user (usr_name) VALUES ($1)`;
                catalogueDB.execSQL(sqlInsertUserCatalogue, [request.body.username], (err) => {
                    if (err) {
                        new Exception(500, err.code, err.message).send(response);
                        return;
                    }
                    response.writeHead(200, { 'Content-Type': 'application/json' });
                    response.write("{}");
                    response.send();
                });
            });
        }
    });
}



// ===> /user/session (login)
function userSessionGET(request, response) {
    try {
        // Validate and parse authorization header
        if (!request.headers.authorization) {
            new Exception(400, "LOG-01", "Http header (authorization) not provided").send(response);
            return;
        }

        // Extract username and password
        // Authorization looks like  "Basic Y2hhcmxlczoxMjM0NQ==". The second part is in base64(user:pwd)
        let tokenizedAuth = request.headers.authorization.split(' ');
        if (tokenizedAuth.length !== 2 || tokenizedAuth[0] !== "Basic") {
            new Exception(400, "LOG-02", "Value of Http header (authorization) is not valid").send(response);
            return;
        }

        // Decode string user:pwd
        let buf = Buffer.from(tokenizedAuth[1], 'base64');
        let usrPwd = buf.toString();

        let usrPwdArray = usrPwd.split(':'); // split on a ':'
        if (usrPwdArray.length !== 2) {
            new Exception(400, "LOG-03", "Invalid username:password in 'authorization' header").send(response);
            return;
        }

        let username = usrPwdArray[0];
        let password = usrPwdArray[1];

        log.debug(`Login requested by: ${username}`);

        const sqlSelectCredentials = `  SELECT cre_salt, cre_hashed_pwd, cre_is_admin AS "isAdmin", cre_last_connection AS "lastConnection", cre_state AS "state" 
                                    FROM cre_credentials where cre_username = $1`;

        credDB.execSQL(sqlSelectCredentials, [username], (err, rows) => {
            if (err) {
                new Exception(500, err.code, err.message).send(response);
                return;
            }

            // Calculate hashed password and compare to te stored one
            if (rows.length && rows[0].cre_hashed_pwd === encryptPwd(rows[0].cre_salt, password)) {
                if (rows[0].state === 0) {
                    // User is active
                    log.info(`User ${username} logged in`);
                    setUserSession(request, username).catch((err) => {
                        new Exception(500, err.code, err.message).send(response);
                        return;
                    }).then(() => {
                        let replyJSON = { isAdmin: rows[0].isAdmin, lastConnection: rows[0].lastConnection };
                        response.writeHead(200, { 'Content-Type': 'application/json' });
                        response.write(JSON.stringify(replyJSON));
                        response.send();

                        // Store login date && reset state
                        const sqlInsertDate = "UPDATE cre_credentials SET cre_last_connection = $1 WHERE cre_username = $2";
                        credDB.execSQL(sqlInsertDate, [moment().format('dddd, DD MMMM YYYY, HH:mm'), username], (err) => {
                            new Exception(500, err.code, err.message);
                            return;
                        });
                    });
                } else {
                    // User activation is not completed
                    new Exception(401, "AUT-02", `User ${username} is not activated`).send(response);
                    return;
                }
            } else {
                // Unauthorized
                new Exception(401, "AUT-01", `User ${username} not found or wrong password`).send(response);
                return;
            }
        });
    } catch (err) {
        new Exception(500, "ERR", "Unexpected Internal Error. " + err.message, err.stack).send(response);
    }
}



// ===> /user/session (logout)
function userSessionDELETE(request, response) {
    request.session.destroy((err) => {
        if (err) {
            new Exception(500, err.code, err.message).send(response);
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
        new Exception(400, "USER-1", "Username in cookie is missing").send(res);
        return;
    }

    // Check that the user matches with the session user
    if (!req.session.user || req.session.user !== username) {
        log.info("Username is not valid or session has expired.");
        // Cancel current session and sent error
        // sent error
        new Exception(403, "USER-2", "Username not logged-in or invalid session").send(res);
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