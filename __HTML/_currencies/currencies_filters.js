"use strict"

function setContinentImg() {
    $("#cont-img>img").attr("src", getSelectedImg());
}


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
    // Initialize stats and filters table
    let existingFlag = Number(getCookie("banknotes.ODB.filter.existing-currency") || 1);
    let extinctFlag = Number(getCookie("banknotes.ODB.filter.extinct-currency") || 1);
    let rowFlags = [];
    for (let type of['owned', 'shared']) {
        rowFlags.push(Number(getCookie(`banknotes.ODB.filter.${type}-currency`) || 1));
    }
    initStatsFilterTable($("table.stats-filter-table"), [existingFlag, extinctFlag], existsCheckChanged, rowFlags, curTypeCheckChanged)


    // Default "to" filter year : current year
    let year = getCookie("banknotes.ODB.filter.currency.createdTo");
    if (year && year !== "") {
        window.filters[0].initTo(year);
    }

    year = getCookie("banknotes.ODB.filter.currency.createdFrom");
    if (year && year !== "") {
        window.filters[0].initFrom(year);
    }

    year = getCookie("banknotes.ODB.filter.currency.replacedTo");
    if (year && year !== "") {
        window.filters[1].initTo(year);
    }

    year = getCookie("banknotes.ODB.filter.currency.replacedFrom");
    if (year && year !== "") {
        window.filters[1].initFrom(year);
    }
});


function existsCheckChanged(id, onFlag) {
    if (id === "existing-check") {
        setCookie("banknotes.ODB.filter.existing-currency", onFlag ? 1 : 0);
    } else if (id === "disappeared-check") {
        setCookie("banknotes.ODB.filter.extinct-currency", onFlag ? 1 : 0);
    }

    loadCurrenciesTable();
}


function curTypeCheckChanged(id, onFlag) {
    let type = id.split("-")[2]; // returns "owned" or "shared"
    setCookie(`banknotes.ODB.filter.${type}-currency`, onFlag ? 1 : 0);

    loadCurrenciesTable();
}


function yearFilterChanged(filterName, from, to) {
    // Store value in the cookie
    if (filterName === "Created") {
        setCookie("banknotes.ODB.filter.currency.createdFrom", from);
        setCookie("banknotes.ODB.filter.currency.createdTo", to);
    } else {
        setCookie("banknotes.ODB.filter.currency.replacedFrom", from);
        setCookie("banknotes.ODB.filter.currency.replacedTo", to);
    }

    // Load table body
    loadCurrenciesTable();
}