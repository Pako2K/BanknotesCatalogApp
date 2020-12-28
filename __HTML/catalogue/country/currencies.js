let currenciesTable;

function showCurrencies() {
    $("#results-section").empty();
    $("#results-section").append('<div class="card"></div>');

    // Store and load data
    currenciesTable = new StatsListTable($("#results-section>div"), [
        { name: "ISO", align: "center", isSortable: 0, optionalShow: 1 },
        { name: "Name", align: "left", isSortable: 1, optionalShow: 0 },
        { name: "Created", align: "center", isSortable: 1, optionalShow: 0 },
        { name: "Replaced", align: "center", isSortable: 0, optionalShow: 1 },
        { name: "Type", align: "center", isSortable: 0, optionalShow: 0 }
    ], ["Issues", "Denoms.", "Note Types", "Variants"], loadTable);

    currenciesTable.loadData(currenciesJSON, "Created");
}


function loadTable(currencies) {
    currenciesTable.clean();

    for (let currency of currencies) {
        let descFields = [];
        descFields.push(currency.iso3 || "-");
        let queryParams = `currencyId=${currency.id}`;
        if (currency.isIssuer && countryId) {
            queryParams += `&territoryId=${countryId}`;
        }
        descFields.push(`<a href="/catalogue/currency/index.html?${queryParams}">${currency.name}</a>`);
        descFields.push(currency.start);
        descFields.push(currency.end || "");
        descFields.push(currency.currencyType);
        currenciesTable.addRecord(descFields, [currency.numSeries, currency.numDenominations, currency.numNotes, currency.numVariants], [currency.collectionStats.numSeries, currency.collectionStats.numDenominations, currency.collectionStats.numNotes, currency.collectionStats.numVariants],
            currency.collectionStats.price);
    }
}