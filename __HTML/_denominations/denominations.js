"use strict"

$("#denominations-table").ready(readDenominations);

function readDenominations() {
    let variantsUri;
    let itemsUri;
    if (getCookie("banknotes.ODB.username"))
        itemsUri = "/denominations/items/stats";
    else
        variantsUri = "/denominations/variants/stats";

    // Retrieve filters from the Cookies
    let filterContId = Number(getCookie("banknotes.ODB.selectedContinent") || 0);
    let yearFrom = getCookie("banknotes.ODB.filter.denomination.issuedFrom");
    let yearTo = getCookie("banknotes.ODB.filter.denomination.issuedTo");

    let queryStr = "";
    if (filterContId) queryStr = "?continentId=" + filterContId;

    if (yearFrom) {
        if (queryStr === "") queryStr += "?";
        else queryStr += "&";
        queryStr += "yearFrom=" + yearFrom;
    }
    if (yearTo) {
        if (queryStr === "") queryStr += "?";
        else queryStr += "&";
        queryStr += "yearTo=" + yearTo;
    }
    // Get denominations
    $.ajax({
        type: "GET",
        url: (variantsUri || itemsUri) + queryStr,
        async: true,
        cache: false,
        timeout: 5000,
        dataType: 'json',

        success: function(denominationsJSON, status) {
            if (variantsUri) {
                // Add null collectionStats
                for (let row of denominationsJSON) {
                    row.collectionStats = {};
                    row.collectionStats.numTerritories = 0;
                    row.collectionStats.numCurrencies = 0;
                    row.collectionStats.numSeries = 0;
                    row.collectionStats.numVariants = 0;
                    row.collectionStats.price = 0;
                }
            }

            let sortingField = "denomination";
            let storedSortingField = $("#denominations-table").data("sorting-field");
            if (storedSortingField) {
                sortingField = storedSortingField;
            }
            storeDenominationsTable(denominationsJSON, sortingField, $("#denominations-table .sorting-column").text() === "Collect.");
        },
        error: function(xhr, status, error) {
            switch (xhr.status) {
                case 403:
                    alert("Your session is not valid or has expired.");
                    _clearSessionCookies();
                    location.reload();
                    break;
                default:
                    alert(`Query failed. \n${status} - ${error}\nPlease contact the web site administrator.`);
            }
        }
    });
}

function continentsLoaded() {
    // Change image
    $("#cont-img>img").attr("src", getSelectedImg());
}


function continentFilterUpdated() {
    // Change image
    $("#cont-img>img").attr("src", getSelectedImg());
    // Retrieve denominations
    readDenominations();
}

function sortClick(htmlElem, titleStr) {
    let mapKey = listTableSetSortingColumn(htmlElem);

    // Determine the field name (it might no be the title of the column)
    if (titleStr)
        mapKey = titleStr;

    // Load table body
    // Mapping column name - field name
    let mapFieldName = {
        "Denomination": "denomination",
        "Territories": "numTerritories",
        "Currencies": "numCurrencies",
        "Series": "numSeries",
        "Variants": "numVariants"
    };
    let flag = $(htmlElem).text() === "Collect.";
    let sortingField = mapFieldName[mapKey];
    storeDenominationsTable(JSON.parse($("#denominations-table").data("value")), sortingField, flag);

    // Save the sorting field so it can be read after re-loading the data
    $("#denominations-table").data("sorting-field", sortingField);
}


function storeDenominationsTable(denominationsJSON, sortingField, isCollecBasedSorting) {
    // Retrieve sorting 
    let sortingAsc = $(".sort-selection").hasClass("sort-asc");

    // Reverse sorting for statistic fields
    let statsFieldNames = [
        "numTerritories",
        "numCurrencies",
        "numSeries",
        "numVariants"
    ];
    if (statsFieldNames.indexOf(sortingField) !== -1)
        sortingAsc = !sortingAsc;

    if (isCollecBasedSorting)
        sortingField = "collectionStats." + sortingField;

    let sortingFields = [sortingField];
    if (sortingField !== "denomination")
        sortingFields.push("denomination");


    denominationsJSON = sortJSON(denominationsJSON, sortingFields, sortingAsc);

    $("#denominations-table").data("value", JSON.stringify(denominationsJSON));

    // Load denominations table body
    loadDenominationsTable();
}



function loadDenominationsTable() {
    // Clean table body and foot
    $("#denominations-table>tbody").empty();
    $("#denominations-table>tfoot>tr").empty();

    // Retrieve denominations info in JSON object
    let denominationsJSON = JSON.parse($("#denominations-table").data("value"));

    let record = "";

    // Aggregate with the denominations if the value is the same (This can happend when the units are different)
    let aggDenominations = [];
    if (denominationsJSON.length)
        aggDenominations.push(denominationsJSON[0]);
    for (let i = 1; i < denominationsJSON.length; i++) {
        let j = aggDenominations.length - 1;
        if (denominationsJSON[i].denomination.toLocaleString("de-DE") === aggDenominations[j].denomination.toLocaleString("de-DE")) {
            aggDenominations[j].numTerritories += denominationsJSON[i].numTerritories;
            aggDenominations[j].collectionStats.numTerritories += denominationsJSON[i].collectionStats.numTerritories;
            aggDenominations[j].numCurrencies += denominationsJSON[i].numCurrencies;
            aggDenominations[j].collectionStats.numCurrencies += denominationsJSON[i].collectionStats.numCurrencies;
            aggDenominations[j].numSeries += denominationsJSON[i].numSeries;
            aggDenominations[j].collectionStats.numSeries += denominationsJSON[i].collectionStats.numSeries;
            aggDenominations[j].numVariants += denominationsJSON[i].numVariants;
            aggDenominations[j].collectionStats.numVariants += denominationsJSON[i].collectionStats.numVariants;
            aggDenominations[j].collectionStats.price = parseFloat(aggDenominations[j].collectionStats.price) + parseFloat(denominationsJSON[i].collectionStats.price);
        } else {
            aggDenominations.push(denominationsJSON[i]);
        }
    }

    for (let denom of aggDenominations) {
        let priceStr = (denom.collectionStats.price === 0) ? "-" : denom.collectionStats.price + ' €';
        record = `  <tr>
                        <th>${denom.denomination.toLocaleString("de-DE")}</th>
                        <td>${denom.numTerritories}</td>
                        <td class="only-logged-in">${denom.collectionStats.numTerritories || "-"}</td>
                        <td>${denom.numCurrencies}</td>
                        <td class="only-logged-in">${denom.collectionStats.numCurrencies || "-"}</td>
                        <td>${denom.numSeries}</td>
                        <td class="only-logged-in">${denom.collectionStats.numSeries || "-"}</td>
                        <td>${denom.numVariants}</td>
                        <td class="only-logged-in">${denom.collectionStats.numVariants || "-"}</td>
                        <td class="only-logged-in">${priceStr}</td>
                    </tr>`;
        $("#denominations-table>tbody").append(record);
    }

    if (!getCookie("banknotes.ODB.username")) {
        $(".only-logged-in").css('opacity', '0.25');
        // Show warning
        $("p.not-logged-in").show();
    }
}