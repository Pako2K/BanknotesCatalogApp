"use strict"

$("#currencies-table").ready(() => {
    let variantsUri;
    let itemsUri;
    if (getCookie("banknotes.ODB.username"))
        itemsUri = "/currencies/items/stats";
    else
        variantsUri = "/currencies/variants/stats";

    // Get currencies
    $.ajax({
        type: "GET",
        url: variantsUri || itemsUri,
        async: true,
        cache: false,
        timeout: 5000,
        dataType: 'json',

        success: function(currenciesJSON, status) {
            if (variantsUri) {
                // Add null collectionStats
                for (let row of currenciesJSON) {
                    row.collectionStats = {};
                    row.collectionStats.numSeries = 0;
                    row.collectionStats.numDenominations = 0;
                    row.collectionStats.numNotes = 0;
                    row.collectionStats.numVariants = 0;
                    row.collectionStats.price = 0;
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
        "Territory": "territory.name",
        "Created": "start",
        "Replaced": "end",
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
            sortingField = "collectionStats." + sortingField;

        let sortingFields = [sortingField];
        if (sortingField !== "name")
            sortingFields.push("name");
        if (sortingField !== "territory.name")
            sortingFields.push("territory.name");

        currenciesJSON = sortJSON(currenciesJSON, sortingFields, sortingAsc);
    }

    $("#currencies-table").data("value", JSON.stringify(currenciesJSON));

    // Load currencies table body
    loadCurrenciesTable();
}



function loadCurrenciesTable() {
    // Retrieve filters from the Cookies
    let filterContId = Number(getCookie("banknotes.ODB.selectedContinent") || 0);

    let createdFrom = Number(getCookie("banknotes.ODB.filter.currency.createdFrom") || -10000);
    let createdTo = Number(getCookie("banknotes.ODB.filter.currency.createdTo") || new Date().getFullYear());
    let replacedFrom = getCookie("banknotes.ODB.filter.currency.replacedFrom");
    let replacedTo = getCookie("banknotes.ODB.filter.currency.replacedTo");


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
        if (currency.start <= createdTo && currency.start >= createdFrom && (filterContId === 0 || currency.territory.continent.id === filterContId)) {
            if (replacedFrom && (currency.end == null || currency.end < replacedFrom)) continue;
            if (replacedTo && (currency.end == null || currency.end > replacedTo)) continue;
            if ((!extinct && (currency.end != null && currency.end < createdTo)) ||
                (!existing && (currency.end == null || currency.end >= createdTo)) ||
                (currencyTypesArray.indexOf(currency.currencyType) === -1))
                continue;

            if (!currency.symbol)
                currency.symbol = "";

            if (!currency.iso3)
                currency.iso3 = "-";

            let priceStr = (currency.collectionStats.price === 0) ? "-" : currency.collectionStats.price.toFixed(2) + ' €';
            record = `<tr>
                                <th>${currency.symbol}</th>
                                <th>${currency.iso3}</th>
                                <th class="name"><a href="/_currency/index.html?currencyId=${currency.id}">${currency.name}</a></th>
                                <th class="name"><a href="/_country/index.html?countryId=${currency.territory.id}">${currency.territory.name}</a></th>
                                <th>${currency.start || ""}</th>
                                <th>${currency.end || ""}</th>
                                <th>${currency.currencyType}</th>
                                <td>${currency.numSeries}</td>
                                <td class="only-logged-in">${currency.collectionStats.numSeries || "-"}</td>
                                <td>${currency.numDenominations}</td>
                                <td class="only-logged-in">${currency.collectionStats.numDenominations || "-"}</td>
                                <td>${currency.numNotes}</td>
                                <td class="only-logged-in">${currency.collectionStats.numNotes || "-"}</td>
                                <td>${currency.numVariants}</td>
                                <td class="only-logged-in">${currency.collectionStats.numVariants || "-"}</td>
                                <td class="only-logged-in">${priceStr}</td>
                            </tr>`;
            $("#currencies-table>tbody").append(record);

            totals.series.cat += currency.numSeries;
            totals.series.col += currency.collectionStats.numSeries;
            totals.denom.cat += currency.numDenominations;
            totals.denom.col += currency.collectionStats.numDenominations;
            totals.notes.cat += currency.numNotes;
            totals.notes.col += currency.collectionStats.numNotes;
            totals.variants.cat += currency.numVariants;
            totals.variants.col += currency.collectionStats.numVariants;
            totals.price += currency.collectionStats.price;

            // Statistics:
            if (existing && currency.end === "") {
                statsCurType[curTypeMap[currency.currencyType]].existing.catalog++;
                if (currency.collectionStats.numVariants)
                    statsCurType[curTypeMap[currency.currencyType]].existing.col++;
            } else {
                statsCurType[curTypeMap[currency.currencyType]].extinct.catalog++;
                if (currency.collectionStats.numVariants)
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