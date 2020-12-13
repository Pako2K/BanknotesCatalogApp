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

    let variantsUri;
    let itemsUri;
    if (Session.getUsername())
        itemsUri = `/territory/${countryId}/currencies/items/stats`;
    else
        variantsUri = `/territory/${countryId}/currencies/variants/stats`;

    asyncGET(variantsUri || itemsUri, (currenciesJSON, status) => {
        if (variantsUri) {
            // Add null collectionStats
            for (let row of currenciesJSON) {
                row.start = parseInt(row.start.slice(0, 4));
                if (row.end) row.end = parseInt(row.end.slice(0, 4));
                row.collectionStats = {};
                row.collectionStats.numCurrencies = 0;
                row.collectionStats.numSeries = 0;
                row.collectionStats.numDenominations = 0;
                row.collectionStats.numNotes = 0;
                row.collectionStats.numVariants = 0;
                row.collectionStats.price = 0;
            }
        } else {
            for (let row of currenciesJSON) {
                row.start = parseInt(row.start.slice(0, 4));
                if (row.end) row.end = parseInt(row.end.slice(0, 4));
            }
        }

        currenciesTable.loadData(currenciesJSON, "Created");
    });
}


function loadTable(currenciesJSON) {
    currenciesTable.clean();

    for (let currency of currenciesJSON) {
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