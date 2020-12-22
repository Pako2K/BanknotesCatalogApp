/*
     DEPENDENCIES:   
        /_shared/constants.js
        /_shared/cookies.js

*/


const _COOKIE_USERNAME = "BOC.user.name";
const _COOKIE_IS_ADMIN = "BOC.user.isAdmin";
const _COOKIE_LAST_CONNECTION = "BOC.user.lastConnection";
const _COOKIE_EXPIRATION = "BOC.session.expiration";
const _COOKIE_EXPIRATION_TIME = "BOC.session.expirationTime";
const _COOKIE_EXPIRATION_WARNING = "BOC.session.expirationWarning";

class Session {
    static _TIMEOUT = 15000;

    /* Login */
    static login(user, password, successCallback) {
        $.ajax({
            type: "GET",
            url: "/user/session",
            async: false,
            cache: false,
            headers: {
                "authorization": "Basic " + btoa(user + ":" + password)
            },
            timeout: Session._TIMEOUT,
            dataType: 'json',

            success: function(result, status) {
                sessionStorage.setItem(_COOKIE_USERNAME, user);
                setCookie(_COOKIE_USERNAME, user);
                sessionStorage.setItem(_COOKIE_IS_ADMIN, result.isAdmin);
                sessionStorage.setItem(_COOKIE_LAST_CONNECTION, result.lastConnection || "");
                sessionStorage.setItem(_COOKIE_EXPIRATION, result.expiration);
                sessionStorage.setItem(_COOKIE_EXPIRATION_TIME, Date.now() + result.expiration);
                sessionStorage.setItem(_COOKIE_EXPIRATION_WARNING, false);
                successCallback();
            },

            error: function(xhr, status, error) {
                switch (xhr.status) {
                    case 401:
                        alert(`Login failed.\n${xhr.responseJSON.code}: ${xhr.responseJSON.description}`);
                        break;
                    case 500:
                        if (xhr.responseJSON)
                            alert(`Login failed.\n${xhr.responseJSON.code}: ${xhr.responseJSON.description}.\nContact the web site administrator.`);
                        else
                            alert(`Login failed.\n${status}: ${error}.\nContact the web site administrator.`);
                        break;
                    default:
                        alert(`Login failed.\n${xhr.status}: ${error}\nPlease try again or contact the web site administrator.`);
                }
            }
        });
    }

    static getUsername() {
        return sessionStorage.getItem(_COOKIE_USERNAME);
    }

    static isAdmin() {
        return sessionStorage.getItem(_COOKIE_IS_ADMIN);
    }

    static getLastConnection() {
        return sessionStorage.getItem(_COOKIE_LAST_CONNECTION);
    }

    static timeLeft() {
        if (sessionStorage.getItem(_COOKIE_USERNAME)) {
            let timeLeft = parseInt(sessionStorage.getItem(_COOKIE_EXPIRATION_TIME)) - Date.now();
            if (timeLeft > 0 && timeLeft <= 60000) {
                if (sessionStorage.getItem(_COOKIE_EXPIRATION_WARNING) === "false") {
                    sessionStorage.setItem(_COOKIE_EXPIRATION_WARNING, "true");
                    alert("Your session will expire in less than 1 minute.\nRefresh the page or keep surfing to extend your session.");
                }
            }
            if (timeLeft <= 0) {
                sessionStorage.setItem(_COOKIE_EXPIRATION_WARNING, "false");
                alert("For security reasons, your session has expired.\nPlease log in again");
                Session.logout();
                timeLeft = 0;
            }
            return timeLeft;
        } else
            return 0;
    }

    static ping(successCallback) {
        if (!sessionStorage.getItem(_COOKIE_USERNAME))
            return;

        $.ajax({
            type: "POST",
            url: `/user/session`,
            async: true,
            cache: false,
            timeout: Session._TIMEOUT,
            dataType: "json",

            success: function(result, status, xhr) {
                sessionStorage.setItem(_COOKIE_EXPIRATION, result.expiration);
                sessionStorage.setItem(_COOKIE_EXPIRATION_TIME, Date.now() + result.expiration);
                successCallback();
            },

            error: function(xhr, status, error) {
                if (xhr.status = 403) {
                    alert("For security reasons, your session has expired.\nPlease log in again");
                    Session._clearSession();
                } else
                    console.log(`Ping failed. \n${xhr.status} - ${error}\nContact the web site administrator.`);
            }
        });
    }

    static resetExpiration() {
        if (sessionStorage.getItem(_COOKIE_USERNAME))
            sessionStorage.setItem(_COOKIE_EXPIRATION_TIME, Date.now() + parseInt(sessionStorage.getItem(_COOKIE_EXPIRATION)));
        return;
    }

    static logout() {
        if (!sessionStorage.getItem(_COOKIE_USERNAME))
            return;

        $.ajax({
            type: "DELETE",
            url: `/user/session`,
            async: false,
            cache: false,
            timeout: Session._TIMEOUT,
            dataType: 'json',

            success: function(result, status) {
                Session._clearSession();
            },

            error: function(xhr, status, error) {
                Session._clearSession();
                switch (xhr.status) {
                    case 403:
                        break;
                    default:
                        console.log(`Logout failed. \n${xhr.status} - ${error}\nContact the web site administrator.`);
                }
            }
        });


    }

    static _clearSession() {
        sessionStorage.removeItem(_COOKIE_USERNAME);
        deleteCookie(_COOKIE_USERNAME);
        sessionStorage.removeItem(_COOKIE_IS_ADMIN);
        sessionStorage.removeItem(_COOKIE_LAST_CONNECTION);
        sessionStorage.removeItem(_COOKIE_EXPIRATION);
        sessionStorage.removeItem(_COOKIE_EXPIRATION_TIME);

        location.assign("/index.html");
    }
}