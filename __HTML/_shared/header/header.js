"use strict"

/*
     DEPENDENCIES:
        /_shared/constants.js
        /_shared/session.js
*/

const HEADER_HTML = `
<header>
    <div class="main-header">
        <div>
            <div class="title">
                <img src="/img/boc.png" alt="BOC ICON">
                <h1>The Banknotes&nbsp;</h1>
                <h1>Online Catalogue</h1>
            </div>
            <div class="user-info">
                <p id="username"></p>
                <a href="/index.html"><img src="/_shared/header/img/logout.png" title="Log Out" alt="logout" onclick="Session.logout()"></a>
                <a href="/index.html"><img src="/_shared/header/img/home.png" title="Log In" alt="home"></a>
            </div>
        </div>

        <nav>
            <a id="default-nav-opt" href="/catalogue/index.html?countries">Countries</a>
            <a href="/catalogue/?currencies">Currencies</a>
            <a href="/catalogue/grouping/?denominations">Denominations</a>
            <a href="/catalogue/grouping/?years">Years</a>
            <a href="/_search/">Search</a>
            <a href="/collection/">My Collection</a>
            <a href="/_more/">More...</a>
        </nav>

    </div>

    <div id="bookmarks">
        <p>Last viewed: </p>
        <div>
        </div>
    </div>
</header>
`;

class Header {
    /* It assumes that the element body/header exists */
    constructor() {
        $("body").prepend(HEADER_HTML);

        // If a header is created is because the page is (re)loaded and that will
        // automatically reset the expiration time of the session in the server side.
        Session.resetExpiration();

        let user = Session.getUsername();
        let urlPath = window.location.pathname;

        // Show or hide the username
        if (user != null && user !== "") {
            $("#username").text(user);
            $("#username").show();
            $('div.user-info>a>img[alt="logout"]').show();
        } else {
            $("#username").text("");
            $("#username").hide();
            if (urlPath !== '/index.html' && urlPath !== '/')
                $('div.user-info>a>img[alt="home"]').show();
        }

        // Highlight the option in the menu
        if (window.location.href.indexOf("?") !== -1)
            urlPath += '?' + window.location.href.split('?')[1];
        $(`a[href='${urlPath}']`).addClass("selected-option");


        // Parse bookmark links (separated by '#')
        let bookmarks = localStorage.getItem(_COOKIE_BOOKMARKS);
        if (bookmarks) {
            let bookmarkArray = bookmarks.split("#");
            bookmarkArray.forEach(element => {
                // Add in reverse order
                $("#bookmarks>div").prepend(element);
            });
        }
    }

    static updateBookmarks(url, country, currency) {
        let bookmarks = localStorage.getItem(_COOKIE_BOOKMARKS);

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
        localStorage.setItem(_COOKIE_BOOKMARKS, bookmarks);
    }
}


// AND CREATE THE HEADER!!!
new Header();