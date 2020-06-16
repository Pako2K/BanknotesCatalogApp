"use strict"

function initializeStats() {
    let currencyId = window.location.search.substr("?currencyId=".length);

    let uriToken;
    if (getCookie("banknotes.ODB.username"))
        uriToken = "items";
    else
        uriToken = "variants";

    $.ajax({
        type: "GET",
        url: `/currency/${currencyId}/series/${uriToken}/stats`,
        async: true,
        cache: false,
        timeout: 5000,
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

            loadSeriesTable(seriesJSON);
        },
        error: function(xhr, status, error) {
            switch (xhr.status) {
                case 403:
                    if (getCookie("banknotes.ODB.username")) {
                        alert("Your session is not valid or has expired.");
                        deleteCookie("banknotes.ODB.username");
                        location.reload();
                    }
                    break;
                default:
                    alert(`Query failed. \n${status} - ${error}\nPlease contact the web site administrator.`);
            }
        }
    });


    $.ajax({
        type: "GET",
        url: `/currency/${currencyId}/denominations/${uriToken}/stats`,
        async: true,
        cache: false,
        timeout: 5000,
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
                    if (getCookie("banknotes.ODB.username")) {
                        alert("Your session is not valid or has expired.");
                        deleteCookie("banknotes.ODB.username");
                        location.reload();
                    }
                    break;
                default:
                    alert(`Query failed. \n${status} - ${error}\nPlease contact the web site administrator.`);
            }
        }
    });


    $.ajax({
        type: "GET",
        url: `/currency/${currencyId}/issue-years/${uriToken}/stats`,
        async: true,
        cache: false,
        timeout: 5000,
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
                    if (getCookie("banknotes.ODB.username")) {
                        alert("Your session is not valid or has expired.");
                        deleteCookie("banknotes.ODB.username");
                        location.reload();
                    }
                    break;
                default:
                    alert(`Query failed. \n${status} - ${error}\nPlease contact the web site administrator.`);
            }
        }
    });
}


function loadSeriesTable(seriesJSON) {
    // Clean table body
    $("#series-stats>tbody").empty();

    let record = "";
    let count = seriesJSON.length;
    for (let i = count - 1; i >= 0; i--) {
        var endDate = seriesJSON[i].end != null ? seriesJSON[i].end : "";

        record = `  <tr>
                        <th class="name" onclick="$('#series-id').text(` + seriesJSON[i].id + `);$('#series-list-view').trigger('click')">` + seriesJSON[i].name + `</th>
                        <th>` + seriesJSON[i].start + `</th>
                        <th>` + endDate + `</th>
                        <td>${seriesJSON[i].numDenominations}</td>
                        <td class="only-logged-in">${seriesJSON[i].collectionStats.numDenominations || 0}</td>
                        <td>${seriesJSON[i].numVariants}</td>
                        <td class="only-logged-in">${seriesJSON[i].collectionStats.numVariants || 0}</td>
                        <td class="only-logged-in">${seriesJSON[i].collectionStats.price || 0} €</td>
                    </tr>`;
        $("#series-stats>tbody").prepend(record);
    }

    if (getCookie("banknotes.ODB.username") === undefined) {
        $(".only-logged-in").hide();
        $('#series-stats>thead>tr>th[colspan="2"]').attr("colspan", 1);
    }
}


function loadDenominationsTable(denomJSON) {
    // Clean table body
    $("#denominations-stats>tbody").empty();

    let record = "";
    let count = denomJSON.length;
    for (let i = count - 1; i >= 0; i--) {
        record = `  <tr>
                        <th>` + denomJSON[i].denomination + `</th>
                        <td>${denomJSON[i].numSeries}</td>
                        <td class="only-logged-in">${denomJSON[i].collectionStats.numSeries || 0}</td>
                        <td>${denomJSON[i].numVariants}</td>
                        <td class="only-logged-in">${denomJSON[i].collectionStats.numVariants || 0}</td>
                        <td class="only-logged-in">${denomJSON[i].collectionStats.price || 0} €</td>
                    </tr>`;
        $("#denominations-stats>tbody").prepend(record);
    }

    if (getCookie("banknotes.ODB.username") === undefined) {
        $(".only-logged-in").hide();
        $('#denominations-stats>thead>tr>th[colspan="2"]').attr("colspan", 1);
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
                        <td class="only-logged-in">${yearsJSON[i].collectionStats.price || 0} €</td>
                    </tr>`;
        $("#years-stats>tbody").prepend(record);
    }

    if (getCookie("banknotes.ODB.username") === undefined) {
        $(".only-logged-in").hide();
        $('#years-stats>thead>tr>th[colspan="2"]').attr("colspan", 1);
    }
}