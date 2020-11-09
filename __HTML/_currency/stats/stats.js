"use strict"

function initializeStats() {
    let searchStrArr = window.location.search.substr(1).split("&");
    let searchParam = searchStrArr[0].split("=");
    let currencyId = searchParam[0] === "currencyId" ? searchParam[1] : "";
    let territoryId = $("#country-data").data("territory-id");

    $("#grades-div").hide();

    let uriToken;
    if (getCookie("banknotes.ODB.username"))
        uriToken = "items";
    else
        uriToken = "variants";

    $.ajax({
        type: "GET",
        url: `/currency/${currencyId}/series/${uriToken}/stats?territoryId=${territoryId}`,
        async: true,
        cache: false,
        timeout: TIMEOUT,
        dataType: 'json',
        success: function(seriesJSON, status) {
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


    $.ajax({
        type: "GET",
        url: `/currency/${currencyId}/denominations/${uriToken}/stats?territoryId=${territoryId}`,
        async: true,
        cache: false,
        timeout: TIMEOUT,
        dataType: 'json',

        success: function(denomJSON, status) {
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


    $.ajax({
        type: "GET",
        url: `/currency/${currencyId}/years/${uriToken}/stats?dateType=issue&territoryId=${territoryId}`,
        async: true,
        cache: false,
        timeout: TIMEOUT,
        dataType: 'json',

        success: function(yearsJSON, status) {
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

    $.ajax({
        type: "GET",
        url: `/currency/${currencyId}/years/${uriToken}/stats?dateType=printed&territoryId=${territoryId}`,
        async: true,
        cache: false,
        timeout: TIMEOUT,
        dataType: 'json',

        success: function(yearsJSON, status) {
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

    if (getCookie("banknotes.ODB.username") === undefined) {
        $(".only-logged-in").css('opacity', '0.25');
        // Show warning
        $("p.not-logged-in").show();
    }
}


function loadSeriesTable(currencyId, seriesJSON) {
    // Clean table body
    $("#series-stats>tbody").empty();

    let record = "";
    let count = seriesJSON.length;
    for (let i = count - 1; i >= 0; i--) {
        var endDate = seriesJSON[i].end != null ? seriesJSON[i].end : "";

        record = `  <tr>
                        <th class="name"><a href="/_currency/index.html?currencyId=${currencyId}&seriesId=${seriesJSON[i].id}">${ seriesJSON[i].name}</a></th>
                        <th>` + seriesJSON[i].start + `</th>
                        <th>` + endDate + `</th>
                        <td>${seriesJSON[i].numDenominations}</td>
                        <td class="only-logged-in">${seriesJSON[i].collectionStats.numDenominations || 0}</td>
                        <td>${seriesJSON[i].numVariants}</td>
                        <td class="only-logged-in">${seriesJSON[i].collectionStats.numVariants || 0}</td>
                        <td class="only-logged-in">${seriesJSON[i].collectionStats.price.toFixed(2) || 0} €</td>
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
                        <td class="only-logged-in">${denomJSON[i].collectionStats.numSeries || 0}</td>
                        <td>${denomJSON[i].numVariants}</td>
                        <td class="only-logged-in">${denomJSON[i].collectionStats.numVariants || 0}</td>
                        <td class="only-logged-in">${denomJSON[i].collectionStats.price.toFixed(2) || 0} €</td>
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
                        <td class="only-logged-in">${yearsJSON[i].collectionStats.numDenominations || 0}</td>
                        <td>${yearsJSON[i].numVariants}</td>
                        <td class="only-logged-in">${yearsJSON[i].collectionStats.numVariants || 0}</td>
                        <td class="only-logged-in">${yearsJSON[i].collectionStats.price.toFixed(2) || 0} €</td>
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
                        <td class="only-logged-in">${yearsJSON[i].collectionStats.numDenominations || 0}</td>
                        <td>${yearsJSON[i].numVariants}</td>
                        <td class="only-logged-in">${yearsJSON[i].collectionStats.numVariants || 0}</td>
                        <td class="only-logged-in">${yearsJSON[i].collectionStats.price.toFixed(2) || 0} €</td>
                    </tr>`;
        $("#dated-stats>tbody").prepend(record);
    }
}