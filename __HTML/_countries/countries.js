"use strict"

$("#countries-table").ready(() => {
    let variantsUri;
    let itemsUri;
    if (getCookie("banknotes.ODB.username"))
        itemsUri = "/territories/items/stats";
    else
        variantsUri = "/territories/variants/stats";

    // Get territories and statistics
    $.ajax({
        type: "GET",
        url: variantsUri || itemsUri,
        async: true,
        cache: false,
        timeout: 5000,
        dataType: 'json',

        success: function(countriesJSON, status) {
            if (variantsUri) {
                // Add null collectionStats
                for (let row of countriesJSON) {
                    row.collectionStats = {};
                    row.collectionStats.numCurrencies = 0;
                    row.collectionStats.numSeries = 0;
                    row.collectionStats.numDenominations = 0;
                    row.collectionStats.numNotes = 0;
                    row.collectionStats.numVariants = 0;
                    row.collectionStats.price = 0;
                }
            }
            storeCountriesTable(countriesJSON);
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
    loadCountriesTable();
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
        "Founded": "start",
        "Finished": "end",
        "Currencies": "numCurrencies",
        "Series": "numSeries",
        "Denom.": "numDenominations",
        "Notes": "numNotes",
        "Variants": "numVariants"
    };
    let flag = $(htmlElem).text() === "Collect.";
    storeCountriesTable(JSON.parse($("#countries-table").data("value")), mapFieldName[mapKey], flag);
}


function storeCountriesTable(countriesJSON, sortingField, isCollecBasedSorting) {
    // Retrieve sorting 
    let sortingAsc = $(".sort-selection").hasClass("sort-asc");

    if (sortingField) {
        // Reverse sorting for statistic fields
        let statsFieldNames = [
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
        if (sortingField !== "name")
            sortingFields.push("name");

        countriesJSON = sortJSON(countriesJSON, sortingFields, sortingAsc);
    }

    $("#countries-table").data("value", JSON.stringify(countriesJSON));

    // Load countries table body
    loadCountriesTable();
}


function loadCountriesTable() {
    // Retrieve filters from the Cookies
    let filterContId = Number(getCookie("banknotes.ODB.selectedContinent") || 0);

    let foundedFrom = Number(getCookie("banknotes.ODB.filter.foundedFrom") || -10000);
    let foundedTo = Number(getCookie("banknotes.ODB.filter.foundedTo") || new Date().getFullYear());
    let yearFromStr = getCookie("banknotes.ODB.filter.disappearedFrom");
    let yearToStr = getCookie("banknotes.ODB.filter.disappearedTo");
    let disappearedFrom;
    if (yearFromStr !== "") disappearedFrom = Number(yearFromStr);
    let disappearedTo;
    if (yearToStr !== "") disappearedTo = Number(yearToStr);
    let existing = Number(getCookie("banknotes.ODB.filter.existing") || 1);
    let extinct = Number(getCookie("banknotes.ODB.filter.extinct") || 1);

    let terTypesJSON = JSON.parse($("#countries-filters").data("territory-types"));
    let countryTypesArray = [];
    for (let type of terTypesJSON) {
        let countryTypeStr = getCookie(`banknotes.ODB.filter.countryTypeId-${type.id}`);
        if (countryTypeStr === undefined || countryTypeStr === "1") {
            countryTypesArray.push(type.id);
        }
    }

    // Clean table body and foot
    $("#countries-table>tbody").empty();
    $("#countries-table>tfoot>tr").empty();

    // Retrieve countries info in JSON object
    let countriesJSON = JSON.parse($("#countries-table").data("value"));

    let record = "";

    let totals = {
        currencies: { cat: 0, col: 0 },
        series: { cat: 0, col: 0 },
        denom: { cat: 0, col: 0 },
        notes: { cat: 0, col: 0 },
        variants: { cat: 0, col: 0 },
        price: 0
    };

    // Statistics
    let statsTerType = [];
    let territoryTypes = JSON.parse($("#countries-filters").data("territory-types"));
    // Territory type id's 
    const TER_TYPES = [];
    territoryTypes.forEach(element => {
        TER_TYPES[element.id] = element.abbrevation;
        statsTerType[element.id] = { existing: { total: 0, issuing: 0, col: 0 }, extinct: { total: 0, issuing: 0, col: 0 } };
    });

    for (let country of countriesJSON) {
        // Apply filters
        if (country.start <= foundedTo && country.start >= foundedFrom && (filterContId === 0 || country.continentId === filterContId)) {
            if (disappearedFrom && (country.end === null || country.end < disappearedFrom)) continue;
            if (disappearedTo && (country.end === null || country.end > disappearedTo)) continue;
            if ((!extinct && (country.end !== null && country.end < foundedTo)) ||
                (!existing && (country.end === null || country.end >= foundedTo)) ||
                (countryTypesArray.indexOf(country.territoryTypeId) === -1))
                continue;

            if (!country.end)
                country.end = "";

            let flagFileName = country.iso3;
            if (!country.iso3) {
                country.iso3 = "-";
                // Remove spaces and commas
                flagFileName = country.name.replace(/,|\s/g, "");
            }

            let priceStr = (country.collectionStats.price === 0) ? '-' : country.collectionStats.price.toFixed(2) + ' €';
            record = `<tr>
                                <th><img src="/data/_flags_/` + flagFileName.toLowerCase() + `.png"></th>
                                <th>${country.iso3}</th>
                                <th class="name"><a href="/_country/index.html?countryId=` + country.id + `">` + country.name + `</a></th>
                                <th>` + country.start + `</th>
                                <th>` + country.end + `</th>
                                <th>` + TER_TYPES[country.territoryTypeId] + `</th>
                                <td>${country.numCurrencies}</td>
                                <td class="only-logged-in">${country.collectionStats.numCurrencies || '-'}</td>
                                <td>${country.numSeries}</td>
                                <td class="only-logged-in">${country.collectionStats.numSeries || '-'}</td>
                                <td>${country.numDenominations}</td>
                                <td class="only-logged-in">${country.collectionStats.numDenominations || '-'}</td>
                                <td>${country.numNotes}</td>
                                <td class="only-logged-in">${country.collectionStats.numNotes || '-'}</td>
                                <td>${country.numVariants}</td>
                                <td class="only-logged-in">${country.collectionStats.numVariants || '-'}</td>
                                <td class="only-logged-in">${priceStr}</td>
                            </tr>`;
            $("#countries-table>tbody").append(record);

            totals.currencies.cat += country.numCurrencies;
            totals.currencies.col += country.collectionStats.numCurrencies;
            totals.series.cat += country.numSeries;
            totals.series.col += country.collectionStats.numSeries;
            totals.denom.cat += country.numDenominations;
            totals.denom.col += country.collectionStats.numDenominations;
            totals.notes.cat += country.numNotes;
            totals.notes.col += country.collectionStats.numNotes;
            totals.variants.cat += country.numVariants;
            totals.variants.col += country.collectionStats.numVariants;
            totals.price += country.collectionStats.price;

            // Statistics:
            if (existing && country.end === "") {
                statsTerType[country.territoryTypeId].existing.total++;
                if (country.numCurrencies) {
                    statsTerType[country.territoryTypeId].existing.issuing++;
                    if (country.collectionStats.numCurrencies)
                        statsTerType[country.territoryTypeId].existing.col++;
                }
            } else {
                statsTerType[country.territoryTypeId].extinct.total++;
                if (country.numCurrencies) {
                    statsTerType[country.territoryTypeId].extinct.issuing++;
                    if (country.collectionStats.numCurrencies)
                        statsTerType[country.territoryTypeId].extinct.col++;
                }
            }
        }
    }

    let totalsHTML = `<th colspan="6">TOTAL</th>
                        <td>${totals.currencies.cat}</td>
                        <td class="only-logged-in">${totals.currencies.col}</td>
                        <td>${totals.series.cat}</td>
                        <td class="only-logged-in">${totals.series.col}</td>
                        <td>${totals.denom.cat}</td>
                        <td class="only-logged-in">${totals.denom.col}</td>
                        <td>${totals.notes.cat}</td>
                        <td class="only-logged-in">${totals.notes.col}</td>
                        <td>${totals.variants.cat}</td>
                        <td class="only-logged-in">${totals.variants.col}</td>
                        <td class="only-logged-in">${totals.price.toFixed(2)} €</td>`;
    $("#countries-table>tfoot>tr").append(totalsHTML);

    // Add statisctics to stats table
    let statsValuesJSON = [];
    statsTerType.forEach((elem, key) => {
        statsValuesJSON.push({
            rowId: `filter-row-${key}`,
            values: [elem.existing.total, elem.existing.issuing, elem.existing.col,
                elem.extinct.total, elem.extinct.issuing, elem.extinct.col
            ]
        });
    });
    statsFilterTableSetData($("table.stats-filter-table"), statsValuesJSON);

    // Hide collection columns if no user is logged 
    if (!getCookie("banknotes.ODB.username")) {
        $(".only-logged-in").hide();
        $('#countries-table>thead>tr>th[colspan="2"]').attr("colspan", 1);
        $('#countries-filters table>thead>tr>th[colspan="3"]').attr("colspan", 2);
    }
}