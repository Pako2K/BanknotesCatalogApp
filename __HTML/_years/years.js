"use strict"

$("#years-table").ready(readIssueYears);

function readIssueYears() {
    let variantsUri;
    let itemsUri;
    if (getCookie("banknotes.ODB.username"))
        itemsUri = "/years/items/stats";
    else
        variantsUri = "/years/variants/stats";

    // Retrieve filters from the Cookies
    let filterContId = Number(getCookie("banknotes.ODB.selectedContinent") || 0);

    let queryStr = "?dateType=issue";
    if (filterContId) queryStr += "&continentId=" + filterContId;

    // Get years
    $.ajax({
        type: "GET",
        url: (variantsUri || itemsUri) + queryStr,
        async: true,
        cache: false,
        timeout: 5000,
        dataType: 'json',

        success: function(yearsJSON, status) {
            if (variantsUri) {
                // Add null collectionStats
                for (let row of yearsJSON) {
                    row.collectionStats = {};
                    row.collectionStats.numTerritories = 0;
                    row.collectionStats.numCurrencies = 0;
                    row.collectionStats.numSeries = 0;
                    row.collectionStats.numDenominations = 0;
                    row.collectionStats.numNotes = 0;
                    row.collectionStats.numVariants = 0;
                    row.collectionStats.price = 0;
                }
            }

            let sortingField = "issueYear";
            let storedSortingField = $("#years-table").data("sorting-field");
            if (storedSortingField) {
                sortingField = storedSortingField;
            }
            storeYearsTable(yearsJSON, sortingField, $("#years-table .sorting-column").text() === "Collect.");
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
    readIssueYears();
}


function sortClick(htmlElem, titleStr) {
    let mapKey = listTableSetSortingColumn(htmlElem);

    // Determine the field name (it might no be the title of the column)
    if (titleStr)
        mapKey = titleStr;

    // Load table body
    // Mapping column name - field name
    let mapFieldName = {
        "Issue Year": "issueYear",
        "Territories": "numTerritories",
        "Currencies": "numCurrencies",
        "Series": "numSeries",
        "Denominations": "numDenominations",
        "Notes": "numNotes",
        "Variants": "numVariants"
    };
    let flag = $(htmlElem).text() === "Collect.";
    let sortingField = mapFieldName[mapKey];
    storeYearsTable(JSON.parse($("#years-table").data("value")), sortingField, flag);

    // Save the sorting field so it can be read after re-loading the data
    $("#years-table").data("sorting-field", sortingField);
}


function storeYearsTable(yearsJSON, sortingField, isCollecBasedSorting) {
    // Retrieve sorting 
    let sortingAsc = $(".sort-selection").hasClass("sort-asc");

    // Reverse sorting for statistic fields
    let statsFieldNames = [
        "numTerritories",
        "numCurrencies",
        "numSeries",
        "numDenominations",
        "numNotes",
        "numVariants"
    ];
    if (statsFieldNames.indexOf(sortingField) !== -1)
        sortingAsc = !sortingAsc;

    if (isCollecBasedSorting)
        sortingField = "collectionStats." + sortingField;

    let sortingFields = [sortingField];
    if (sortingField !== "issueYear")
        sortingFields.push("issueYear");


    yearsJSON = sortJSON(yearsJSON, sortingFields, sortingAsc);

    $("#years-table").data("value", JSON.stringify(yearsJSON));

    // Load years table body
    loadYearsTable();
}



function loadYearsTable() {
    // Read years from the cookies
    let yearFrom = getCookie("banknotes.ODB.filter.issue-year.issuedFrom");
    let yearTo = getCookie("banknotes.ODB.filter.issue-year.issuedTo");

    // Clean table body and foot
    $("#years-table>tbody").empty();
    $("#years-table>tfoot>tr").empty();

    // Retrieve years info in JSON object
    let yearsJSON = JSON.parse($("#years-table").data("value"));

    let record = "";

    for (let year of yearsJSON) {
        // Apply filters
        if ((!yearFrom || year.issueYear >= yearFrom) && (!yearTo || year.issueYear <= yearTo)) {
            let priceStr = (year.collectionStats.price === 0) ? "-" : year.collectionStats.price.toFixed(2) + ' €';
            record = `  <tr>
                            <th>${year.issueYear}</th>
                            <td>${year.numTerritories}</td>
                            <td class="only-logged-in">${year.collectionStats.numTerritories || "-"}</td>
                            <td>${year.numCurrencies}</td>
                            <td class="only-logged-in">${year.collectionStats.numCurrencies || "-"}</td>
                            <td>${year.numSeries}</td>
                            <td class="only-logged-in">${year.collectionStats.numSeries || "-"}</td>
                            <td>${year.numDenominations}</td>
                            <td class="only-logged-in">${year.collectionStats.numDenominations || "-"}</td>
                            <td>${year.numNotes}</td>
                            <td class="only-logged-in">${year.collectionStats.numNotes || "-"}</td>
                            <td>${year.numVariants}</td>
                            <td class="only-logged-in">${year.collectionStats.numVariants || "-"}</td>
                            <td class="only-logged-in">${priceStr}</td>
                        </tr>`;
            $("#years-table>tbody").append(record);
        }
    }

    if (!getCookie("banknotes.ODB.username")) {
        $(".only-logged-in").css('opacity', '0.25');
        // Show warning
        $("p.not-logged-in").show();
    }
}