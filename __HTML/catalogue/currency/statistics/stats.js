"use strict"

function initializeStats() {
    let searchStrArr = window.location.search.substr(1).split("&");
    let searchParam = searchStrArr[0].split("=");
    let currencyId = searchParam[0] === "currencyId" ? searchParam[1] : "";

    $("#grades-coding").hide();

    let uriToken;
    if (Session.getUsername())
        uriToken = "items";
    else
        uriToken = "variants";

    asyncGET(`/currency/${currencyId}/series/${uriToken}/stats?territoryId=${territoryId}`, (seriesJSON, status) => {
        if (uriToken === "variants") {
            // Add null collectionStats
            for (let row of seriesJSON) {
                row.collectionStats = {};
                row.collectionStats.numDenominations = 0;
                row.collectionStats.numVariants = 0;
                row.collectionStats.price = 0;
            }
        }

        loadSeriesTable(currencyId, seriesJSON);
    });

    asyncGET(`/currency/${currencyId}/denominations/${uriToken}/stats?territoryId=${territoryId}`, (denomJSON, status) => {
        if (uriToken === "variants") {
            // Add null collectionStats
            for (let row of denomJSON) {
                row.collectionStats = {};
                row.collectionStats.numSeries = 0;
                row.collectionStats.numVariants = 0;
                row.collectionStats.price = 0;
            }
        }

        loadDenominationsTable(denomJSON);
    });

    asyncGET(`/currency/${currencyId}/years/${uriToken}/stats?dateType=issue&territoryId=${territoryId}`, (yearsJSON, status) => {
        if (uriToken === "variants") {
            // Add null collectionStats
            for (let row of yearsJSON) {
                row.collectionStats = {};
                row.collectionStats.numDenominations = 0;
                row.collectionStats.numVariants = 0;
                row.collectionStats.price = 0;
            }
        }

        loadYearsTable(yearsJSON);
    });

    asyncGET(`/currency/${currencyId}/years/${uriToken}/stats?dateType=printed&territoryId=${territoryId}`, (yearsJSON, status) => {
        if (uriToken === "variants") {
            // Add null collectionStats
            for (let row of yearsJSON) {
                row.collectionStats = {};
                row.collectionStats.numDenominations = 0;
                row.collectionStats.numVariants = 0;
                row.collectionStats.price = 0;
            }
        }

        loadPrintedTable(yearsJSON);
    });

    if (!Session.getUsername()) {
        $(".only-logged-in").css('opacity', '0.25');
        // Show warning
        $("p.not-logged-in").show();
    } else
        $("p.not-logged-in").hide();
}


function loadSeriesTable(currencyId, seriesJSON) {
    // Clean table body
    $("#series-stats>tbody").empty();

    let record = "";
    let count = seriesJSON.length;
    for (let i = count - 1; i >= 0; i--) {
        var endDate = seriesJSON[i].end != null ? seriesJSON[i].end : "";

        record = `  <tr>
                        <th class="name"><a href="/catalogue/currency/index.html?currencyId=${currencyId}&seriesId=${seriesJSON[i].id}">${ seriesJSON[i].name}</a></th>
                        <th>` + seriesJSON[i].start + `</th>
                        <th>` + endDate + `</th>
                        <td>${seriesJSON[i].numDenominations}</td>
                        <td class="only-logged-in">${seriesJSON[i].collectionStats.numDenominations || "-"}</td>
                        <td>${seriesJSON[i].numVariants}</td>
                        <td class="only-logged-in">${seriesJSON[i].collectionStats.numVariants || "-"}</td>
                        <td class="only-logged-in">${priceToStr(seriesJSON[i].collectionStats.price)}</td>
                    </tr>`;
        $("#series-stats>tbody").prepend(record);
    }
}


function loadDenominationsTable(denomJSON) {
    // Clean table body
    $("#denominations-stats>tbody").empty();

    let record = "";
    let count = denomJSON.length;
    for (let i = count - 1; i >= 0; i--) {
        record = `  <tr>
                        <th>${denomJSON[i].denomination.toLocaleString("de-DE")}</th>
                        <td>${denomJSON[i].numSeries}</td>
                        <td class="only-logged-in">${denomJSON[i].collectionStats.numSeries || "-"}</td>
                        <td>${denomJSON[i].numVariants}</td>
                        <td class="only-logged-in">${denomJSON[i].collectionStats.numVariants || "-"}</td>
                        <td class="only-logged-in">${priceToStr(denomJSON[i].collectionStats.price)}</td>
                    </tr>`;
        $("#denominations-stats>tbody").prepend(record);
    }
}


function loadYearsTable(yearsJSON) {
    // Clean table body
    $("#years-stats>tbody").empty();

    let record = "";
    let count = yearsJSON.length;
    for (let i = count - 1; i >= 0; i--) {
        record = `  <tr>
                        <th>` + yearsJSON[i].issueYear + `</th>
                        <td>${yearsJSON[i].numDenominations}</td>
                        <td class="only-logged-in">${yearsJSON[i].collectionStats.numDenominations || "-"}</td>
                        <td>${yearsJSON[i].numVariants}</td>
                        <td class="only-logged-in">${yearsJSON[i].collectionStats.numVariants || "-"}</td>
                        <td class="only-logged-in">${priceToStr(yearsJSON[i].collectionStats.price)}</td>
                    </tr>`;
        $("#years-stats>tbody").prepend(record);
    }
}


function loadPrintedTable(yearsJSON) {
    // Clean table body
    $("#dated-stats>tbody").empty();

    let record = "";
    let count = yearsJSON.length;
    for (let i = count - 1; i >= 0; i--) {
        record = `  <tr>
                        <th>` + yearsJSON[i].printedDate + `</th>
                        <td>${yearsJSON[i].numDenominations}</td>
                        <td class="only-logged-in">${yearsJSON[i].collectionStats.numDenominations || "-"}</td>
                        <td>${yearsJSON[i].numVariants}</td>
                        <td class="only-logged-in">${yearsJSON[i].collectionStats.numVariants || "-"}</td>
                        <td class="only-logged-in">${priceToStr(yearsJSON[i].collectionStats.price)}</td>
                    </tr>`;
        $("#dated-stats>tbody").prepend(record);
    }
}


function priceToStr(price) {
    return price ? price.toFixed(2) + " €" : "-";
}