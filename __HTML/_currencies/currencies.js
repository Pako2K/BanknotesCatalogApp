"use strict"

$("#currencies-table").ready(() => {
    // Get currencies
    $.ajax({
        type: "GET",
        url: `/currencies`,
        async: true,
        cache: false,
        timeout: 5000,
        dataType: 'json',

        success: function(currenciesJSON, status) {
            for (let row of currenciesJSON) {
                // Transform dates into years
                row.start = Number(row.start.split("-")[0]);
                row.end = row.end ? Number(row.end.split("-")[0]) : null;

                // Add collection statistics
                row.collecStats = {};
                row.collecStats.numSeries = 0;
                row.collecStats.numNotes = 0;
                row.collecStats.numVariants = 0;
                row.collecStats.numDenominations = 0;
                row.collecStats.price = 0;
            }

            if (getCookie("banknotes.ODB.username")) {
                $.ajax({
                    type: "GET",
                    url: `/items/stats?grouping=currency`,
                    async: true,
                    cache: false,
                    timeout: 5000,
                    dataType: 'json',

                    success: function(collecResult, status) {
                        // Consolidate results with the countries info
                        let collecIndex = 0;
                        for (let row of currenciesJSON) {
                            if (collecIndex >= collecResult.length)
                                break;
                            if (row.id === collecResult[collecIndex].id) {
                                row.collecStats.numSeries = collecResult[collecIndex].numSeries;
                                row.collecStats.numNotes = collecResult[collecIndex].numNotes;
                                row.collecStats.numVariants = collecResult[collecIndex].numVariants;
                                row.collecStats.numDenominations = collecResult[collecIndex].numDenominations;
                                row.collecStats.price = collecResult[collecIndex].price;
                                collecIndex++;
                            }
                        }
                        storeCurrenciesTable(currenciesJSON);
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
                storeCurrenciesTable(currenciesJSON);
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
    loadCurrenciesTable();
}


function sortClick(htmlElem, titleStr) {
    let mapKey = listTableSetSortingColumn(htmlElem);

    // Determine the field name (it might no be the title of the column)
    if (titleStr)
        mapKey = titleStr;

    // Load table body
    // Mapping column name - field name
    let mapFieldName = {
        "ISO": "iso3",
        "Name": "name",
        "Territory": "territoryName",
        "Start": "start",
        "End": "end",
        "Series": "numSeries",
        "Denom.": "numDenominations",
        "Notes": "numNotes",
        "Variants": "numVariants"
    };
    let flag = $(htmlElem).text() === "Collect.";
    storeCurrenciesTable(JSON.parse($("#currencies-table").data("value")), mapFieldName[mapKey], flag);
}


function storeCurrenciesTable(currenciesJSON, sortingField, isCollecBasedSorting) {
    // Retrieve sorting 
    let sortingAsc = $(".sort-selection").hasClass("sort-asc");


    if (sortingField) {
        // Reverse sorting for statistic fields
        let statsFieldNames = [
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
        if (sortingField !== "name")
            sortingFields.push("name");
        if (sortingField !== "territoryName")
            sortingFields.push("territoryName");

        currenciesJSON = sortJSON(currenciesJSON, sortingFields, sortingAsc);
    }

    $("#currencies-table").data("value", JSON.stringify(currenciesJSON));

    // Load currencies table body
    loadCurrenciesTable();
}



function loadCurrenciesTable() {
    // Retrieve filters from the Cookies
    let filterContId = Number(getCookie("banknotes.ODB.selectedContinent") || 0);

    let yearFrom = Number(getCookie("banknotes.ODB.filter.yearFrom-currency") || -1000);
    let yearTo = Number(getCookie("banknotes.ODB.filter.yearTo-currency") || new Date().getFullYear());
    let existing = Number(getCookie("banknotes.ODB.filter.existing-currency") || 1);
    let extinct = Number(getCookie("banknotes.ODB.filter.extinct-currency") || 1);

    let currencyTypesArray = [];
    let types = ["OWNED", "SHARED"];
    for (let type of types) {
        let currencyTypeStr = getCookie(`banknotes.ODB.filter.${type.toLowerCase()}-currency`);
        if (currencyTypeStr === undefined || currencyTypeStr === "1") {
            currencyTypesArray.push(type);
        }
    }

    // Clean table body and foot
    $("#currencies-table>tbody").empty();
    $("#currencies-table>tfoot>tr").empty();

    // Retrieve currencies info in JSON object
    let currenciesJSON = JSON.parse($("#currencies-table").data("value"));

    let record = "";

    let totals = {
        series: { cat: 0, col: 0 },
        denom: { cat: 0, col: 0 },
        notes: { cat: 0, col: 0 },
        variants: { cat: 0, col: 0 },
        price: 0
    };

    // Statistics
    let statsCurType = [];
    let curTypeMap = { OWNED: 0, SHARED: 1 };
    for (let type of types) {
        statsCurType[curTypeMap[type]] = { existing: { catalog: 0, col: 0 }, extinct: { catalog: 0, col: 0 } };
    }

    for (let currency of currenciesJSON) {
        // Apply filters
        if (currency.start <= yearTo && currency.start >= yearFrom && (filterContId === 0 || currency.continentId === filterContId)) {
            if ((!extinct && (currency.end !== null && currency.end < yearTo)) ||
                (!existing && (currency.end === null || currency.end >= yearTo)) ||
                (currencyTypesArray.indexOf(currency.currencyType) === -1))
                continue;

            if (!currency.symbol)
                currency.symbol = "";

            if (!currency.end)
                currency.end = "";

            if (!currency.iso3)
                currency.iso3 = "-";

            let priceStr = (currency.collecStats.price === 0) ? "-" : currency.collecStats.price.toFixed(2) + ' €';
            record = `<tr>
                                <th>${currency.symbol}</th>
                                <th>${currency.iso3}</th>
                                <th class="name"><a href="/_currency/index.html?currencyId=${currency.id}">${currency.name}</a></th>
                                <th class="name"><a href="/_country/index.html?countryId=${currency.territoryId}">${currency.territoryName}</a></th>
                                <th>${currency.start}</th>
                                <th>${currency.end}</th>
                                <th>${currency.currencyType}</th>
                                <td>${currency.numSeries}</td>
                                <td class="only-logged-in">${currency.collecStats.numSeries || "-"}</td>
                                <td>${currency.numDenominations}</td>
                                <td class="only-logged-in">${currency.collecStats.numDenominations || "-"}</td>
                                <td>${currency.numNotes}</td>
                                <td class="only-logged-in">${currency.collecStats.numNotes || "-"}</td>
                                <td>${currency.numVariants}</td>
                                <td class="only-logged-in">${currency.collecStats.numVariants || "-"}</td>
                                <td class="only-logged-in">${priceStr}</td>
                            </tr>`;
            $("#currencies-table>tbody").append(record);

            totals.series.cat += currency.numSeries;
            totals.series.col += currency.collecStats.numSeries;
            totals.denom.cat += currency.numDenominations;
            totals.denom.col += currency.collecStats.numDenominations;
            totals.notes.cat += currency.numNotes;
            totals.notes.col += currency.collecStats.numNotes;
            totals.variants.cat += currency.numVariants;
            totals.variants.col += currency.collecStats.numVariants;
            totals.price += currency.collecStats.price;

            // Statistics:
            if (existing && (currency.end === "" || Number(currency.end) >= yearTo)) {
                statsCurType[curTypeMap[currency.currencyType]].existing.catalog++;
                if (currency.collecStats.numVariants)
                    statsCurType[curTypeMap[currency.currencyType]].existing.col++;
            } else {
                statsCurType[curTypeMap[currency.currencyType]].extinct.catalog++;
                if (currency.collecStats.numVariants)
                    statsCurType[curTypeMap[currency.currencyType]].extinct.col++;
            }
        }
    }

    let totalsHTML = `<th colspan="7">TOTAL</th>
                        <td>${totals.series.cat}</td>
                        <td class="only-logged-in">${totals.series.col}</td>
                        <td>${totals.denom.cat}</td>
                        <td class="only-logged-in">${totals.denom.col}</td>
                        <td>${totals.notes.cat}</td>
                        <td class="only-logged-in">${totals.notes.col}</td>
                        <td>${totals.variants.cat}</td>
                        <td class="only-logged-in">${totals.variants.col}</td>
                        <td class="only-logged-in">${totals.price.toFixed(2)} €</td>`;
    $("#currencies-table>tfoot>tr").append(totalsHTML);

    // Add statisctics to stats table
    let statsValuesJSON = [];
    statsCurType.forEach((elem, key) => {
        statsValuesJSON.push({
            rowId: `row-type-${types[key].toLowerCase()}`,
            values: [elem.existing.catalog, elem.existing.col,
                elem.extinct.catalog, elem.extinct.col
            ]
        });
    });
    statsFilterTableSetData($("table.stats-filter-table"), statsValuesJSON);

    // Hide collection columns if no user is logged 
    if (!getCookie("banknotes.ODB.username")) {
        $(".only-logged-in").hide();
        $('#currencies-table>thead>tr>th[colspan="2"]').attr("colspan", 1);
        $('#currencies-filters table>thead>tr>th[colspan="2"]').attr("colspan", 1);
    }
}