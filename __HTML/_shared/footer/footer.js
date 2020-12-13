"use strict"

/*
     DEPENDENCIES:   
        /_shared/constants.js
        /_shared/header/header.js
*/


class Footer {
    static _footerTimer;

    constructor() {
        $("body").append(`
            <footer>
                <div class="main-footer">
                    <div class="links">
                        <a href="/site/glossary.html" target="_self">Glossary</a>
                        <a href="/site/sources.html" target="_self">Sources</a>
                        <a href="/site/contact.html" target="_self">Contact</a>
                        <a href="/site/privacy.html" target="_self">Privacy Policy</a>
                    </div>
                    <div class="session-info">
                        <p>Your session expires in:<br><span id="expiration"></span></p>
                        <p>Last connection: <br><span id="last-connection"></span></p>
                    </div>
                </div>
                <p class="copyright">@Copyright 2020 The Banknotes Online Catalogue</p>
            </footer>
        `);
        Footer.manageSessionExpiration();
    }

    static manageSessionExpiration() {
        let user = Session.getUsername();
        if (user == null || user === "")
            return;

        $(".session-info").show();


        $("#last-connection").text(Session.getLastConnection());

        let interval = Footer._updateExpiration() < 30000 ? 1 : 10; // in seconds
        clearInterval(Footer._footerTimer);
        Footer._footerTimer = setInterval(() => {
            let expires = Footer._updateExpiration();
            if (expires < 30000 && interval === 10) {
                clearInterval(Footer._footerTimer);
                Footer._footerTimer = setInterval(() => {
                    if (Footer._updateExpiration() === 0) {
                        clearInterval(Footer._footerTimer);
                    }
                }, 1000);
            } else if (expires === 0)
                clearInterval(Footer._footerTimer);
        }, interval * 1000);
    }

    static _updateExpiration() {
        let expires = Session.timeLeft();
        if (expires > 60000) {
            $("#expiration").text(Math.ceil(expires / 60000) + " minutes");
        } else if (expires > 0 && expires <= 60000) {
            $("#expiration").text(Math.ceil(expires / 1000) + " seconds");
        }

        return expires;
    }
}


// AND CREATE THE FOOTER!!!
new Footer();