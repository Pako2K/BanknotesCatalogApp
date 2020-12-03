"use strict"

$("#username").ready(() => {
    let user = getCookie(_COOKIE_USERNAME);
    if (user !== undefined && user !== "") {
        $("#username").text(user);
        $("#username").show();
        $('div.user-info>a>img[alt="logout"]').show();
    } else {
        $("#username").text("");
        $("#username").hide();
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


$("#bookmarks").ready(() => {
    let bookmarks = getCookie(_COOKIE_BOOKMARKS);

    // Parse bookmark links (separated by '#')
    if (bookmarks) {
        let bookmarkArray = bookmarks.split("#");

        bookmarkArray.forEach(element => {
            // Add in reverse order
            $("#bookmarks>div").prepend(element);
        });
    }
});


function updateBookmarks(url, country, currency) {
    let bookmarks = getCookie(_COOKIE_BOOKMARKS);

    // Parse bookmark links (separated by '#')
    let bookmarkArray = [];
    if (bookmarks)
        bookmarkArray = bookmarks.split("#");

    // Check if the new url is already in the array
    let title;
    if (currency)
        title = currency + ` [${country}]`;
    else
        title = country;

    let newBookmark = `<a href="${url}">${title}</a>`;
    let pos = bookmarkArray.indexOf(newBookmark);
    if (pos !== -1)
        bookmarkArray.splice(pos, 1);

    // Check if the new link contains a country and there are links to that country, remove the country bookmark
    if (currency) {
        let pos = -1;
        bookmarkArray.some((value, index, array) => {
            if (value.indexOf(`>${country}</a>`) !== -1) {
                pos = index;
                return true;
            }
            return false;
        });

        if (pos !== -1)
            bookmarkArray.splice(pos, 1);
    }

    bookmarkArray.push(newBookmark);

    const MAX_BOOKMARKS = 4;

    if (bookmarkArray.length > MAX_BOOKMARKS)
        bookmarkArray.shift();

    bookmarks = bookmarkArray.join("#");
    setCookie(_COOKIE_BOOKMARKS, bookmarks);
}


function _logout() {

    $.ajax({
        type: "DELETE",
        url: `/user/session`,
        async: false,
        cache: false,
        timeout: TIMEOUT,
        dataType: 'json',

        success: function(result, status) {
            _clearSessionCookies();
        },

        error: function(xhr, status, error) {
            _clearSessionCookies();
            switch (xhr.status) {
                case 403:
                    break;
                default:
                    console.log(`Logout failed. \n${xhr.status} - ${error}\nContact the web site administrator.`);
            }
        }
    });
}

function _clearSessionCookies() {
    deleteCookie(_COOKIE_USERNAME);
    deleteCookie(_COOKIE_IS_ADMIN);
    deleteCookie(_COOKIE_LAST_CONNECTION);
}