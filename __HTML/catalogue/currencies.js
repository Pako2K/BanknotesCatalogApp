"use strict"

let currenciesTable;
let statsSummaryTable;
let currencyFilters;
let listCard;


const currencyTypes = ["OWNED", "SHARED"];
// Statistics
let statsCurType = [];

function initialize() {
    currencyTypes.forEach(element => {
        statsCurType.push({});
    });

    // Insert Currency filters
    currencyFilters = new CurrencyFilters("Currencies", $(`#catalogue-filters`), currencyTypes, onCurrencyFiltersChanged);

    // Insert territory stats
    let card = new ShowHideCard("CurrenciesStats", $('#catalogue-stats'), "Stats");
    card.setContent(`
        <div id="summary-table">
        </div>
        <div class="block-description">
        </div>`);
    let rows = [];
    currencyTypes.forEach((element, idx) => {
        rows.push({ id: idx, name: element });
    });
    statsSummaryTable = new StatsSummaryTable($("#summary-table"), ["Total", "Collect."], rows);

    $('#catalogue-stats div.block-description').append(`
            <p>Shows statistics for each currency type, either existing or extinct, according to the filters:</p>
            <p>the total number of currencies in the catalogue, </p>
            <p>the number of currencies in your collection.</p>`);


    let variantsUri;
    let itemsUri;
    if (Session.getUsername())
        itemsUri = "/currencies/items/stats";
    else
        variantsUri = "/currencies/variants/stats";

    // Get currencies and stats
    asyncGET(variantsUri || itemsUri, (currenciesJSON, status) => {
        if (variantsUri) {
            // Add null collectionStats
            for (let row of currenciesJSON) {
                row.start = parseInt(row.start);
                if (row.end) row.end = parseInt(row.end);
                row.collectionStats = {};
                row.collectionStats.numSeries = 0;
                row.collectionStats.numDenominations = 0;
                row.collectionStats.numNotes = 0;
                row.collectionStats.numVariants = 0;
                row.collectionStats.price = 0;
            }
        } else {
            for (let row of currenciesJSON) {
                row.start = parseInt(row.start);
                if (row.end) row.end = parseInt(row.end);
            }
        }
        // Store and load data
        let subtitle = ContinentsFilter.getSelectedName();
        listCard = new SimpleCard($('#catalogue-list'), "List of Currencies", subtitle);
        listCard.setContent(`
            <div id="catalogue-list-table">
            </div>`);

        currenciesTable = new StatsListTable($("#catalogue-list-table"), [{ name: "", align: "center", isSortable: 0, optionalShow: 1 },
            { name: "ISO", align: "center", isSortable: 1, optionalShow: 1 },
            { name: "Name", align: "left", isSortable: 1, optionalShow: 0 },
            { name: "Territory", align: "left", isSortable: 1, optionalShow: 0 },
            { name: "Created", align: "center", isSortable: 1, optionalShow: 1 },
            { name: "Replaced", align: "center", isSortable: 1, optionalShow: 1 },
            { name: "Type", align: "center", isSortable: 0, optionalShow: 0 }
        ], ["Issues", "Denoms.", "Note Types", "Variants"], loadTables);

        currenciesTable.loadData(currenciesJSON, "Name");
    });
}

function loadTables(currenciesJSON) {
    let totals = {
        variants: { cat: 0, col: 0 },
        price: 0
    };

    // Clean-up table
    currenciesTable.clean();

    // Reset stats
    statsCurType.forEach((elem, idx) => {
        statsCurType[idx] = { existing: { total: 0, col: 0 }, extinct: { total: 0, col: 0 } };
    })

    // Retrieve filters values
    let filterContId = ContinentsFilter.getSelectedId();
    let filtersJSON = currencyFilters.getFilters();

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
        subtitle += "&nbsp;&nbsp;&nbsp;Not Replaced";
    if (existingInYear && existingInYear != "")
        subtitle += "&nbsp;&nbsp;&nbsp;Existing in " + existingInYear;

    listCard.setSubtitle(subtitle);

    // Format summary table
    showExisting ? statsSummaryTable.enableColumns(0) : statsSummaryTable.disableColumns(0);
    showExtinct ? statsSummaryTable.enableColumns(1) : statsSummaryTable.disableColumns(1);
    currencyTypes.forEach((val, idx) => {
        if (filtersJSON.disabledCurTypes.indexOf(val) !== -1)
            statsSummaryTable.disableRow(idx);
        else
            statsSummaryTable.enableRow(idx);
    });


    for (let currency of currenciesJSON) {
        // Apply filters

        if (filterContId && filterContId !== currency.territory.continent.id) continue;

        if ((foundedFrom && parseInt(currency.start) < foundedFrom) || (foundedTo && parseInt(currency.start) > foundedTo)) continue;

        if ((extinctFrom && (!currency.end || (parseInt(currency.end) < extinctFrom))) || (extinctTo && (!currency.end || (parseInt(currency.end) > extinctTo)))) continue;

        if (existingInYear && !(currency.start <= existingInYear && (!currency.end || currency.end >= existingInYear))) continue;

        if (filtersJSON.disabledCurTypes.indexOf(currency.currencyType) !== -1) continue;

        if ((!showExtinct && (currency.end != null)) ||
            (!showExisting && (currency.end == null))
        ) continue;

        let descFields = [];
        descFields.push(currency.symbol || "");
        descFields.push(currency.iso3 || "");
        descFields.push(`<a href="/catalogue/currency/index.html?currencyId=${currency.id}&territoryId=${currency.territory.id}">${currency.name}</a>`);
        descFields.push(`<a href="/catalogue/country/index.html?countryId=${currency.territory.id}">${currency.territory.name}</a>`);
        descFields.push(currency.start);
        descFields.push(currency.end || "");
        descFields.push(currency.currencyType);
        currenciesTable.addRecord(descFields, [currency.numSeries, currency.numDenominations, currency.numNotes, currency.numVariants], [currency.collectionStats.numCurrencies, currency.collectionStats.numSeries, currency.collectionStats.numDenominations, currency.collectionStats.numNotes, currency.collectionStats.numVariants],
            currency.collectionStats.price);

        // Totals:
        totals.variants.cat += parseInt(currency.numVariants);
        totals.variants.col += currency.collectionStats.numVariants;
        totals.price += currency.collectionStats.price;

        // Statistics:
        let curTypeIdx = currencyTypes.indexOf(currency.currencyType);
        if (!currency.end || currency.end === "") {
            statsCurType[curTypeIdx].existing.total++;
            if (currency.collectionStats.numVariants)
                statsCurType[curTypeIdx].existing.col++;
        } else {
            statsCurType[curTypeIdx].extinct.total++;
            if (currency.collectionStats.numVariants)
                statsCurType[curTypeIdx].extinct.col++;
        }
    }

    currenciesTable.setFooter(totals.variants.cat, totals.variants.col, totals.price);


    // Add statistics to stats summary table
    let statsValuesJSON = [];
    statsCurType.forEach((elem, idx) => {
        statsValuesJSON[idx] = [elem.existing.total, elem.existing.col, elem.extinct.total, elem.extinct.col];
    });

    statsSummaryTable.setData(statsValuesJSON);
}

function changedContinent(contId, contName) {
    // Get data and reload the tables
    loadTables(currenciesTable.getData());
}

function onCurrencyFiltersChanged() {
    loadTables(currenciesTable.getData());
}