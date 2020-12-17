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


function asyncPUT(url, dataJSON, successCallback, errorCallback) {
    $.ajax({
        type: "PUT",
        url: url,
        contentType: "application/json",
        async: false,
        cache: false,
        data: JSON.stringify(dataJSON),
        timeout: TIMEOUT,
        dataType: 'json',
        success: successCallback,
        error: function(xhr, status, error) {
            switch (xhr.status) {
                case 400:
                    alert("Data is not correct.\n" + xhr.responseJSON.code + ": " + xhr.responseJSON.description);
                    break;
                case 403:
                    alert("Your session is not a valid Admin session or has expired.");
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


function asyncPOST(url, dataJSON, successCallback, errorCallback) {
    $.ajax({
        type: "POST",
        url: url,
        contentType: "application/json",
        async: false,
        cache: false,
        data: JSON.stringify(dataJSON),
        timeout: TIMEOUT,
        dataType: 'json',
        success: successCallback,
        error: function(xhr, status, error) {
            switch (xhr.status) {
                case 400:
                    alert("Data is not correct.\n" + xhr.responseJSON.code + ": " + xhr.responseJSON.description);
                    break;
                case 403:
                    alert("Your session is not a valid Admin session or has expired.");
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


function asyncDELETE(url, successCallback, errorCallback) {
    $.ajax({
        type: "DELETE",
        url: url,
        async: false,
        cache: false,
        timeout: TIMEOUT,
        dataType: 'json',
        success: successCallback,
        error: function(xhr, status, error) {
            switch (xhr.status) {
                case 403:
                    alert("Your session is not a valid Admin session or has expired.");
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