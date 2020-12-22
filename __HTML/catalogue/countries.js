"use strict"

let countriesTable;
let statsSummaryTable;
let territoryFilters;
let listCard;

let territoryTypesAbbr;
// Statistics
let statsTerType = [];

function initialize() {
    // Load Country types before anything else
    asyncGET("/territory-types", (territoryTypesJSON, status) => {
        territoryTypesAbbr = [];

        territoryTypesJSON.forEach(element => {
            territoryTypesAbbr[element.id] = element.abbrevation;
            statsTerType[element.id] = {};
        });

        // Insert Territory filters
        territoryFilters = new TerritoryFilters("Countries", $(`#catalogue-filters`), territoryTypesJSON, onTerritoryFiltersChanged);

        // Insert territory stats
        let card = new ShowHideCard("CountriesStats", $('#catalogue-stats'), "Stats");
        card.setContent(`
            <div id="summary-table">
            </div>
            <div class="block-description">
            </div>`);
        statsSummaryTable = new StatsSummaryTable($("#summary-table"), ["Total", "Issuer", "Collect."], territoryTypesJSON);

        $('#catalogue-stats div.block-description').append(`
            <p>Shows 3 statistics for each territory type, either existing or extinct territories, according to the filters:</p>
            <p>the total number of territories in the catalogue, </p>
            <p>the number of territories which issue their own currencies,</p>
            <p>the number of territories in your collection.</p>`);
    });

    let variantsUri;
    let itemsUri;
    if (Session.getUsername())
        itemsUri = "/territories/items/stats";
    else
        variantsUri = "/territories/variants/stats";

    // Get territories and statistics
    asyncGET(variantsUri || itemsUri, (countriesJSON, status) => {
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
        // Store and load data
        let subtitle = ContinentsFilter.getSelectedName();
        listCard = new SimpleCard($('#catalogue-list'), "List of Territories", subtitle);
        listCard.setContent(`
            <div id="catalogue-list-table">
            </div>`);

        countriesTable = new StatsListTable($("#catalogue-list-table"), [{ name: "", align: "center", isSortable: 0, optionalShow: 1 },
            { name: "ISO", align: "center", isSortable: 1, optionalShow: 1 },
            { name: "Name", align: "left", isSortable: 1, optionalShow: 0 },
            { name: "Founded", align: "center", isSortable: 1, optionalShow: 1 },
            { name: "Finished", align: "center", isSortable: 1, optionalShow: 1 },
            { name: "Type", align: "center", isSortable: 0, optionalShow: 0 }
        ], ["Currencies", "Issues", "Denoms.", "Note Types", "Variants"], loadTables);

        countriesTable.loadData(countriesJSON, "Name");
    });
}


function loadTables(countriesJSON) {
    let totals = {
        variants: { cat: 0, col: 0 },
        price: 0
    };

    // Clean-up table
    countriesTable.clean();

    // Reset stats
    statsTerType.forEach((elem, idx) => {
        statsTerType[idx] = { existing: { total: 0, issuing: 0, col: 0 }, extinct: { total: 0, issuing: 0, col: 0 } };
    })

    // Retrieve values for filtering
    let filterContId = ContinentsFilter.getSelectedId();
    let filtersJSON = territoryFilters.getFilters();

    let foundedFrom = filtersJSON.founded.from;
    let foundedTo = filtersJSON.founded.to;
    let extinctFrom = filtersJSON.extinct.from;
    let extinctTo = filtersJSON.extinct.to;
    let existingInYear = filtersJSON.existingInYear;
    let showExisting = filtersJSON.isExisting === "false" ? false : true;
    let showExtinct = filtersJSON.isExtinct === "false" ? false : true;

    // Set subtitle
    let subtitle = ContinentsFilter.getSelectedName();
    if (!showExisting)
        subtitle += "&nbsp;&nbsp;&nbsp;Not Existing";
    if (!showExtinct)
        subtitle += "&nbsp;&nbsp;&nbsp;Not Extinct";
    if (existingInYear && existingInYear != "")
        subtitle += "&nbsp;&nbsp;&nbsp;Existing in " + existingInYear;

    listCard.setSubtitle(subtitle);

    // Format summary table
    showExisting ? statsSummaryTable.enableColumns(0) : statsSummaryTable.disableColumns(0);
    showExtinct ? statsSummaryTable.enableColumns(1) : statsSummaryTable.disableColumns(1);
    statsTerType.forEach((val, idx) => {
        if (filtersJSON.disabledTerTypes.indexOf(idx.toString()) !== -1)
            statsSummaryTable.disableRow(idx);
        else
            statsSummaryTable.enableRow(idx);
    });


    for (let country of countriesJSON) {
        // Apply filters 
        if (filterContId && filterContId !== country.continentId) continue;

        if ((foundedFrom && country.start < foundedFrom) || (foundedTo && country.start > foundedTo)) continue;

        if ((extinctFrom && country.end < extinctFrom) || (extinctTo && country.end > extinctTo)) continue;

        if (existingInYear && !(country.start <= existingInYear && (!country.end || country.end >= existingInYear))) continue;

        if (filtersJSON.disabledTerTypes.indexOf(country.territoryTypeId.toString()) !== -1) continue;

        if ((!showExtinct && (country.end !== null)) ||
            (!showExisting && (country.end === null))
        ) continue;

        // Remove spaces and commas
        let flagFileName = country.iso3 || country.name.replace(/,|\s/g, "");

        let descFields = [];
        descFields.push(`<img src="/data/_flags_/${flagFileName.toLowerCase()}.png">`);
        descFields.push(country.iso3 || "-");
        descFields.push(`<a href="/catalogue/country/index.html?countryId=${country.id}">${country.name}</a>`);
        descFields.push(country.start);
        descFields.push(country.end || "");
        descFields.push(territoryTypesAbbr[country.territoryTypeId]);
        countriesTable.addRecord(descFields, [country.numCurrencies, country.numSeries, country.numDenominations, country.numNotes, country.numVariants], [country.collectionStats.numCurrencies, country.collectionStats.numSeries, country.collectionStats.numDenominations, country.collectionStats.numNotes, country.collectionStats.numVariants],
            country.collectionStats.price);

        // Totals:
        totals.variants.cat += parseInt(country.numVariants);
        totals.variants.col += country.collectionStats.numVariants;
        totals.price += country.collectionStats.price;

        // Statistics:
        if (!country.end || country.end === "") {
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

    countriesTable.setFooter(totals.variants.cat, totals.variants.col, totals.price);


    // Add statistics to stats summary table
    let statsValuesJSON = [];
    statsTerType.forEach((elem, key) => {
        statsValuesJSON[key] = [elem.existing.total, elem.existing.issuing, elem.existing.col, elem.extinct.total, elem.extinct.issuing, elem.extinct.col];
    });
    statsSummaryTable.setData(statsValuesJSON);
}


function changedContinent(contId, contName) {
    // Get data and reload the tables
    loadTables(countriesTable.getData());
}


function onTerritoryFiltersChanged() {
    loadTables(countriesTable.getData());
}