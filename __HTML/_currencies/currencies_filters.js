"use strict"

function setContinentImg() {
    $("#cont-img>img").attr("src", getSelectedImg());
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
    let year = getCookie("banknotes.ODB.filter.yearTo-currency");
    if (!year) {
        year = new Date().getFullYear();
        $("#input-year-to").val(year);
        setCookie("banknotes.ODB.filter.yearTo-currency", year);
    } else {
        $("#input-year-to").val(year);
    }

    year = getCookie("banknotes.ODB.filter.yearFrom-currency");
    if (year) {
        $("#input-year-from").val(year);
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


function yearFilterChanged(elemId) {
    // Store value in the cookie
    if (elemId === "input-year-from")
        setCookie("banknotes.ODB.filter.yearFrom-currency", $("#" + elemId).val());
    else
        setCookie("banknotes.ODB.filter.yearTo-currency", $("#" + elemId).val());

    // Load table body
    loadCurrenciesTable();
}