/* DEPENDENCIES

    constants.js
    session.js

*/

function asyncGET(url, successCallback, errorCallback) {
    $.ajax({
        type: "GET",
        url: url,
        async: true,
        cache: false,
        timeout: TIMEOUT,
        dataType: 'json',
        success: successCallback,
        error: function(xhr, status, error) {
            switch (xhr.status) {
                case 403:
                    alert("For security reasons, your session has expired.\nPlease log in again");
                    Session.logout();
                    break;
                default:
                    alert(`Query failed. \n${status} - ${error}\nPlease contact the web site administrator.`);
            }
            if (errorCallback) errorCallback(xhr, status, error);
        }
    });
    Session.resetExpiration();
}

function syncGET(url, successCallback, errorCallback) {
    $.ajax({
        type: "GET",
        url: url,
        async: false,
        cache: false,
        timeout: TIMEOUT,
        dataType: 'json',
        success: successCallback,
        error: function(xhr, status, error) {
            switch (xhr.status) {
                case 403:
                    alert("For security reasons, your session has expired.\nPlease log in again");
                    Session.logout();
                    break;
                default:
                    alert(`Query failed. \n${status} - ${error}\nPlease contact the web site administrator.`);
            }
            if (errorCallback) errorCallback(xhr, status, error);
        }
    });
    Session.resetExpiration();
}