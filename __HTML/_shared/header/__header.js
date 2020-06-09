"use strict"

$("#username").ready(() => {
    let user = getCookie("banknotes.ODB.username");
    if (user !== undefined && user !== "") {
        $("#username").text(user);
        $("#username").show();
        $('div.user-info>a>img[alt="logout"]').show();
    } else {
        $("#username").text("");
        if (window.location.pathname !== '/index.html' && window.location.pathname !== '/')
            $('div.user-info>a>img[alt="home"]').show();
    }
});

$("nav").ready(() => {
    let elemId = window.location.pathname.split("/")[1] || "index.html";

    $('#' + elemId).addClass("selected-option");

    // Add the click event to the other options
    $('nav>p:not(.selected-option)').each((index, element) => {
        $(element).click(() => {
            window.location.pathname = $(element).attr("id");
        });
    });
});



function _header_logout() {
    let user = getCookie("banknotes.ODB.username");
    $.ajax({
        type: "DELETE",
        url: `/user/session?username=${user}`,
        async: false,
        cache: false,
        timeout: 5000,
        dataType: 'json',

        success: function(result, status) {
            deleteCookie("banknotes.ODB.username");
        },

        error: function(xhr, status, error) {
            switch (xhr.status) {
                case 403:
                    deleteCookie("banknotes.ODB.username");
                    break;
                default:
                    alert(`Logout failed. \n${xhr.status} - ${error}\nPlease try again or contact the web site administrator.`);
            }
        }
    });
}