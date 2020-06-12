"use strict"


$(window).resize(function() {
    let fontSize = calcFontSize();
    for (let filter of window.filters) {
        filter.setSize(fontSize);
    }
});

function calcFontSize() {
    if ($(window).width() < 400) return 10;
    else if ($(window).width() < 800) return 12;
    else return 13;
}

$("#currencies-filters").ready(() => {
    // Default "to" filter year : current year
    let year = getCookie("banknotes.ODB.filter.denomination.issuedTo");
    if (year && year !== "") {
        window.filters[0].initTo(year);
    }

    year = getCookie("banknotes.ODB.filter.denomination.issuedFrom");
    if (year && year !== "") {
        window.filters[0].initFrom(year);
    }
});


function yearFilterChanged(filterName, from, to) {
    // Store value in the cookie
    setCookie("banknotes.ODB.filter.denomination.issuedFrom", from);
    setCookie("banknotes.ODB.filter.denomination.issuedTo", to);

    // Retrieve denominations
    readDenominations();
}