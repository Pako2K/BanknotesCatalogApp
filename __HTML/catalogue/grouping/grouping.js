"use strict"

let catEntity = window.location.href.split('?')[1];
if (!catEntity || (catEntity !== "denominations" && catEntity !== "years")) window.location.pathname = "/error.html";
$("head").append(`<script src="${catEntity}.js"></script>`);

$(document).ready(() => {
    initialize();
})