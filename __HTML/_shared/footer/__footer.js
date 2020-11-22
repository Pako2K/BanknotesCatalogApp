"use strict"

$(".main-footer").ready(function() {
    resetExpiration();
});

let footerTimer;

function resetExpiration() {
    let user = getCookie("banknotes.ODB.username");
    if (user !== undefined && user !== "") {
        $(".session-info").show();

        $.ajax({
            type: "POST",
            url: `/user/session`,
            async: true,
            cache: false,
            timeout: TIMEOUT,
            dataType: "json",

            success: function(result, status) {
                const INTERVAL = 5; // in seconds
                if (result.expiration) {
                    let expSec = result.expiration / 1000;
                    $("#expiration").text(Math.ceil(expSec / 60) + " minutes");
                    $("#last-connection").text(getCookie("banknotes.ODB.lastConnection"));
                    clearInterval(footerTimer);
                    footerTimer = setInterval(() => {
                        expSec -= INTERVAL;
                        if (expSec > 60) {
                            $("#expiration").text(Math.ceil(expSec / 60) + " minutes");
                        } else if (expSec > 0) {
                            $("#expiration").text(Math.ceil(expSec) + " seconds");
                        } else {
                            clearInterval(footerTimer);
                            _footer_logout();
                        }
                    }, INTERVAL * 1000);
                }
            },

            error: function(xhr, status, error) {
                let exception;
                console.log(`Ping failed. \n${xhr.status} - ${error}\nPlease contact the web site administrator.`);
            }
        });
    }
}


function _footer_logout() {
    alert("For security reasons, your session has expired.\nPlease log in again");
    _clearSessionCookies();
    location.assign("/index.html");
}