"use strict"

$(document).ready(() => {
    let catEntity = window.location.href.split('?')[1];
    if (!catEntity || (catEntity !== "denominations" && catEntity !== "years"))
        window.location.pathname = "/error.html";

    $("body>header").load("/_shared/header/__header.html");
    $("body>footer").load("/_shared/footer/__footer.html");

    $("head").append(`<script src="${catEntity}.js"></script>`);

    new ContinentsFilter($("#continents-filter"), changedContinent);

    initialize();
})