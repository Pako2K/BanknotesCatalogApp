"use strict"

$("#denominations-table").ready(readDenominations);

function readDenominations() {
    // Read years from the cookies
    let yearFrom = getCookie("banknotes.ODB.filter.yearFrom-denom");
    let yearTo = getCookie("banknotes.ODB.filter.yearTo-denom");

    // Get denominations
    $.ajax({
        type: "GET",
        url: `/banknotes/denominations?fromYear=${yearFrom}&toYear=${yearTo}`,
        async: true,
        cache: false,
        timeout: 5000,
        dataType: 'json',

        success: function(denominationsJSON, status) {
            for (let row of denominationsJSON) {
                // Add collection statistics
                row.collecStats = {};
                row.collecStats.numTerritories = 0;
                row.collecStats.numCurrencies = 0;
                row.collecStats.numSeries = 0;
                row.collecStats.numVariants = 0;
                row.collecStats.price = 0;
            }

            if (getCookie("banknotes.ODB.username")) {
                $.ajax({
                    type: "GET",
                    url: `/items/stats?grouping=denomination&fromYear=${yearFrom}&toYear=${yearTo}`,
                    async: true,
                    cache: false,
                    timeout: 5000,
                    dataType: 'json',

                    success: function(collecResult, status) {
                        // Consolidate results with the countries info
                        let collecIndex = 0;
                        for (let row of denominationsJSON) {
                            if (collecIndex >= collecResult.length)
                                break;
                            if (row.denomination === collecResult[collecIndex].denomination) {
                                row.collecStats.numTerritories = collecResult[collecIndex].numTerritories;
                                row.collecStats.numCurrencies = collecResult[collecIndex].numCurrencies;
                                row.collecStats.numSeries = collecResult[collecIndex].numSeries;
                                row.collecStats.numVariants = collecResult[collecIndex].numVariants;
                                row.collecStats.price = collecResult[collecIndex].price;
                                collecIndex++;
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
                let sortingField = "denomination";
                let storedSortingField = $("#denominations-table").data("sorting-field");
                if (storedSortingField) {
                    sortingField = storedSortingField;
                }

                storeDenominationsTable(denominationsJSON, sortingField, $("#denominations-table .sorting-column").text() === "Collect.");
            }
        },
        error: function(xhr, status, error) {
            alert(`Query failed. \n${status} - ${error}\nPlease contact the web site administrator.`);
        }
    });
}


function continentFilterUpdated(contId) {
    setContinentImg();

    // Update page
    loadDenominationsTable();
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
        sortingField = "collecStats." + sortingField;

    let sortingFields = [sortingField];
    if (sortingField !== "denomination")
        sortingFields.push("denomination");


    denominationsJSON = sortJSON(denominationsJSON, sortingFields, sortingAsc);

    $("#denominations-table").data("value", JSON.stringify(denominationsJSON));

    // Load denominations table body
    loadDenominationsTable();
}



function loadDenominationsTable() {
    // Retrieve filters from the Cookies
    let filterContId = Number(getCookie("banknotes.ODB.selectedContinent") || 0);

    // Clean table body and foot
    $("#denominations-table>tbody").empty();
    $("#denominations-table>tfoot>tr").empty();

    // Retrieve denominations info in JSON object
    let denominationsJSON = JSON.parse($("#denominations-table").data("value"));

    let record = "";

    for (let denom of denominationsJSON) {
        // Apply filters
        if (filterContId === 0 || denom.continentId === filterContId) {

            let priceStr = (denom.collecStats.price === 0) ? "-" : denom.collecStats.price.toFixed(2) + ' €';
            record = `<tr>
                                    <th>${denom.denomination}</th>
                                    <td>${denom.numTerritories}</td>
                                    <td class="only-logged-in">${denom.collecStats.numTerritories || "-"}</td>
                                    <td>${denom.numCurrencies}</td>
                                    <td class="only-logged-in">${denom.collecStats.numCurrencies || "-"}</td>
                                    <td>${denom.numSeries}</td>
                                    <td class="only-logged-in">${denom.collecStats.numSeries || "-"}</td>
                                    <td>${denom.numVariants}</td>
                                    <td class="only-logged-in">${denom.collecStats.numVariants || "-"}</td>
                                    <td class="only-logged-in">${priceStr}</td>
                                </tr>`;
            $("#denominations-table>tbody").append(record);
        }
    }

    // Hide collection columns if no user is logged 
    if (!getCookie("banknotes.ODB.username")) {
        $(".only-logged-in").hide();
        $('#denominations-table>thead>tr>th[colspan="2"]').attr("colspan", 1);
    }
}