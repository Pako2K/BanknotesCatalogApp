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


$("#years-filters").ready(() => {
    let year = getCookie("banknotes.ODB.filter.issue-year.issuedTo");
    if (year && year !== "") {
        window.filters[0].initTo(year);
    }

    year = getCookie("banknotes.ODB.filter.issue-year.issuedFrom");
    if (year && year !== "") {
        window.filters[0].initFrom(year);
    }
});


function yearFilterChanged(filterName, from, to) {
    // Store value in the cookie
    setCookie("banknotes.ODB.filter.issue-year.issuedFrom", from);
    setCookie("banknotes.ODB.filter.issue-year.issuedTo", to);

    // Show filetered years
    loadYearsTable();
}