"use strict"

function setContinentImg() {
    $("#cont-img>img").attr("src", getSelectedImg());
}


$("#currencies-filters").ready(() => {
    // Default "to" filter year : current year
    let year = getCookie("banknotes.ODB.filter.yearTo-denom");
    if (!year) {
        year = new Date().getFullYear();
        $("#input-year-to").val(year);
        setCookie("banknotes.ODB.filter.yearTo-denom", year);
    } else {
        $("#input-year-to").val(year);
    }

    year = getCookie("banknotes.ODB.filter.yearFrom-denom");
    if (year) {
        $("#input-year-from").val(year);
    }
});


function yearFilterChanged(elemId) {
    // Store value in the cookie
    if (elemId === "input-year-from")
        setCookie("banknotes.ODB.filter.yearFrom-denom", $("#" + elemId).val());
    else
        setCookie("banknotes.ODB.filter.yearTo-denom", $("#" + elemId).val());

    // Retrieve denominations
    readDenominations();
}