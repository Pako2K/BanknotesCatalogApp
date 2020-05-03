"use strict"

$("#years-table").ready(() => {
    // Get years
    $.ajax({
        type: "GET",
        url: `/variants/years`,
        async: true,
        cache: false,
        timeout: 5000,
        dataType: 'json',

        success: function(yearsJSON, status) {
            for (let row of yearsJSON) {
                // Add collection statistics
                row.collecStats = {};
                row.collecStats.numTerritories = 0;
                row.collecStats.numCurrencies = 0;
                row.collecStats.numSeries = 0;
                row.collecStats.numDenominations = 0;
                row.collecStats.numNotes = 0;
                row.collecStats.numVariants = 0;
                row.collecStats.price = 0;
            }

            if (getCookie("banknotes.ODB.username")) {
                $.ajax({
                    type: "GET",
                    url: `/items/stats?grouping=year`,
                    async: true,
                    cache: false,
                    timeout: 5000,
                    dataType: 'json',

                    success: function(collecResult, status) {
                        // Consolidate results with the countries info
                        let collecIndex = 0;
                        for (let row of yearsJSON) {
                            if (collecIndex >= collecResult.length)
                                break;
                            if (row.issueYear === collecResult[collecIndex].issueYear) {
                                row.collecStats.numTerritories = collecResult[collecIndex].numTerritories;
                                row.collecStats.numCurrencies = collecResult[collecIndex].numCurrencies;
                                row.collecStats.numSeries = collecResult[collecIndex].numSeries;
                                row.collecStats.numDenominations = collecResult[collecIndex].numDenominations;
                                row.collecStats.numNotes = collecResult[collecIndex].numNotes;
                                row.collecStats.numVariants = collecResult[collecIndex].numVariants;
                                row.collecStats.price = collecResult[collecIndex].price;
                                collecIndex++;
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
                                if (getCookie("banknotes.ODB.username")) {
                                    deleteCookie("banknotes.ODB.username");
                                    location.reload();
                                }
                                break;
                            default:
                                alert(`Query failed. \n${status} - ${error}\nPlease contact the web site administrator.`);
                        }
                    }
                });
            } else {
                let sortingField = "issueYear";
                let storedSortingField = $("#years-table").data("sorting-field");
                if (storedSortingField) {
                    sortingField = storedSortingField;
                }

                storeYearsTable(yearsJSON, sortingField, $("#years-table .sorting-column").text() === "Collect.");
            }
        },
        error: function(xhr, status, error) {
            alert(`Query failed. \n${status} - ${error}\nPlease contact the web site administrator.`);
        }
    });
});


function continentFilterUpdated(contId) {
    setContinentImg();

    // Update page
    loadYearsTable();
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
        sortingField = "collecStats." + sortingField;

    let sortingFields = [sortingField];
    if (sortingField !== "issueYear")
        sortingFields.push("issueYear");


    yearsJSON = sortJSON(yearsJSON, sortingFields, sortingAsc);

    $("#years-table").data("value", JSON.stringify(yearsJSON));

    // Load years table body
    loadYearsTable();
}



function loadYearsTable() {
    // Retrieve filters from the Cookies
    let filterContId = Number(getCookie("banknotes.ODB.selectedContinent") || 0);

    // Read years from the cookies
    let yearFrom = getCookie("banknotes.ODB.filter.yearFrom-year");
    let yearTo = getCookie("banknotes.ODB.filter.yearTo-year");

    // Clean table body and foot
    $("#years-table>tbody").empty();
    $("#years-table>tfoot>tr").empty();

    // Retrieve years info in JSON object
    let yearsJSON = JSON.parse($("#years-table").data("value"));

    let record = "";

    for (let year of yearsJSON) {
        // Apply filters
        if ((filterContId === 0 || year.continentId === filterContId) &&
            (!yearFrom || year.issueYear >= yearFrom) &&
            (!yearTo || year.issueYear <= yearTo)) {

            let priceStr = (year.collecStats.price === 0) ? "-" : year.collecStats.price.toFixed(2) + ' €';
            record = `<tr>
                                        <th>${year.issueYear}</th>
                                        <td>${year.numTerritories}</td>
                                        <td class="only-logged-in">${year.collecStats.numTerritories || "-"}</td>
                                        <td>${year.numCurrencies}</td>
                                        <td class="only-logged-in">${year.collecStats.numCurrencies || "-"}</td>
                                        <td>${year.numSeries}</td>
                                        <td class="only-logged-in">${year.collecStats.numSeries || "-"}</td>
                                        <td>${year.numDenominations}</td>
                                        <td class="only-logged-in">${year.collecStats.numDenominations || "-"}</td>
                                        <td>${year.numNotes}</td>
                                        <td class="only-logged-in">${year.collecStats.numNotes || "-"}</td>
                                        <td>${year.numVariants}</td>
                                        <td class="only-logged-in">${year.collecStats.numVariants || "-"}</td>
                                        <td class="only-logged-in">${priceStr}</td>
                                    </tr>`;
            $("#years-table>tbody").append(record);
        }
    }

    // Hide collection columns if no user is logged 
    if (!getCookie("banknotes.ODB.username")) {
        $(".only-logged-in").hide();
        $('#years-table>thead>tr>th[colspan="2"]').attr("colspan", 1);
    }
}