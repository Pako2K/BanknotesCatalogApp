"use strict"

$(".main-footer").ready(function() {
    let user = getCookie("banknotes.ODB.username");
    if (user !== undefined && user !== "") {
        $(".session-info").show();

        $.ajax({
            type: "POST",
            url: `/user/session`,
            async: true,
            cache: false,
            timeout: 5000,
            dataType: "json",

            success: function(result, status) {
                const INTERVAL = 5; // in seconds
                if (result.expiration) {
                    let expSec = result.expiration / 1000;
                    let unit = (expSec > 60) ? " minutes" : " minute";
                    $("#expiration").text(Math.ceil(expSec / 60) + unit);
                    $("#last-connection").text(getCookie("banknotes.ODB.lastConnection"));
                    let timer = setInterval(() => {
                        expSec -= INTERVAL;
                        if (expSec > 0) {
                            $("#expiration").text(Math.ceil(expSec / 60) + unit);
                        } else {
                            clearInterval(timer);
                            _footer_logout();
                        }
                    }, INTERVAL * 1000);
                }
            },

            error: function(xhr, status, error) {
                let exception;
                alert(`Ping failed. \n${xhr.status} - ${error}\nPlease try again or contact the web site administrator.`);
            }
        });
    }
});

function _footer_logout() {
    alert("For security reasons, your session has expired.\nPlease log in again");
    _clearSessionCookies();
    location.assign("/index.html");
}