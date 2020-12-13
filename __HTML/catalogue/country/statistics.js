let seriesTable;
let denominationsTable;
let yearsTable;

function showStatistics() {
    $("#results-section").empty();

    // ISSUES
    //----------------------------------------
    $("#results-section").append(`
        <div id="issues-card" class="card">
            <div class="block-title">
              <p>Issues</p>
              <p class="show-hide"><span class="disabled" onclick="showBlock(this,'Issues')">Show</span>|<span onclick="hideBlock(this,'Issues')">Hide</span></p>
            </div>
        </div>`);

    // Store and load data
    seriesTable = new StatsListTable($("#results-section>div:last-of-type"), [
        { name: "Name", align: "left", isSortable: 1, optionalShow: 0 },
        { name: "Currency", align: "left", isSortable: 0, optionalShow: 0 },
        { name: "Start", align: "center", isSortable: 1, optionalShow: 0 },
        { name: "End", align: "center", isSortable: 0, optionalShow: 0 },
    ], ["Denoms.", "Variants"], fillSeriesTable);

    let variantsUri;
    let itemsUri;
    if (Session.getUsername())
        itemsUri = `/territory/${countryId}/series/items/stats`;
    else
        variantsUri = `/territory/${countryId}/series/variants/stats`;

    asyncGET(variantsUri || itemsUri, (resultJSON, status) => {
        if (variantsUri) {
            // Add null collectionStats
            for (let row of resultJSON) {
                row.collectionStats = {};
                row.collectionStats.numDenominations = 0;
                row.collectionStats.numVariants = 0;
                row.collectionStats.price = 0;
            }
        }

        seriesTable.loadData(resultJSON, "Name");

        if (getCookie(_COOKIE_COUNTRY_STATISTICS_ISSUES_HIDE) === "")
            $("#issues-card span:last-of-type").click();
    });

    // DENOMINATIONS
    //----------------------------------------
    $("#results-section").append(`
        <div id="denominations-card" class="card">
            <div class="block-title">
              <p>Denominations</p>
              <p class="show-hide"><span class="disabled" onclick="showBlock(this,'Denominations')">Show</span>|<span onclick="hideBlock(this,'Denominations')">Hide</span></p>
            </div>
        </div>`);

    // Store and load data
    denominationsTable = new StatsListTable($("#results-section>div:last-of-type"), [
        { name: "Denomination", align: "center", isSortable: 1, optionalShow: 0 },
    ], ["Currencies", "Issues", "Variants"], fillDenominationsTable);

    if (Session.getUsername())
        itemsUri = `/territory/${countryId}/denominations/items/stats`;
    else
        variantsUri = `/territory/${countryId}/denominations/variants/stats`;

    asyncGET(variantsUri || itemsUri, (resultJSON, status) => {
        if (variantsUri) {
            // Add null collectionStats
            for (let row of resultJSON) {
                row.collectionStats = {};
                row.collectionStats.numCurrencies = 0;
                row.collectionStats.numSeries = 0;
                row.collectionStats.numVariants = 0;
                row.collectionStats.price = 0;
            }
        }

        denominationsTable.loadData(resultJSON, "Denomination");

        if (getCookie(_COOKIE_COUNTRY_STATISTICS_DENOMINATIONS_HIDE) === "")
            $("#denominations-card span:last-of-type").click();
    });


    // ISSUE YEARS
    //----------------------------------------
    $("#results-section").append(`
        <div id="years-card" class="card">
            <div class="block-title">
              <p>Issue Years</p>
              <p class="show-hide"><span class="disabled" onclick="showBlock(this,'Years')">Show</span>|<span onclick="hideBlock(this,'Years')">Hide</span></p>
            </div>
        </div>`);

    // Store and load data
    yearsTable = new StatsListTable($("#results-section>div:last-of-type"), [
        { name: "Issue Year", align: "center", isSortable: 1, optionalShow: 0 },
    ], ["Denominations", "Variants"], fillYearsTable);

    if (Session.getUsername())
        itemsUri = `/territory/${countryId}/years/items/stats?dateType=issue`;
    else
        variantsUri = `/territory/${countryId}/years/variants/stats?dateType=issue`;

    asyncGET(variantsUri || itemsUri, (resultJSON, status) => {
        if (variantsUri) {
            // Add null collectionStats
            for (let row of resultJSON) {
                row.collectionStats = {};
                row.collectionStats.numDenominations = 0;
                row.collectionStats.numVariants = 0;
                row.collectionStats.price = 0;
            }
        }

        yearsTable.loadData(resultJSON, "Issue Year");

        if (getCookie(_COOKIE_COUNTRY_STATISTICS_YEARS_HIDE) === "")
            $("#years-card span:last-of-type").click();
    });
}


function fillSeriesTable(resultJSON) {
    seriesTable.clean();

    for (let series of resultJSON) {
        let descFields = [];

        descFields.push(`<a href="/catalogue/currency/index.html?currencyId=${series.currency.id}&seriesId=${series.id}">${series.name}</a>`);

        let name = "";
        if (series.currency.iso3)
            name = `(${series.currency.iso3}) `;
        name += series.currency.name;
        descFields.push(name);

        descFields.push(series.start);
        descFields.push(series.end || "");

        seriesTable.addRecord(descFields, [series.numDenominations, series.numVariants], [series.collectionStats.numDenominations, series.collectionStats.numVariants],
            series.collectionStats.price);
    }
}


function fillDenominationsTable(resultJSON) {
    denominationsTable.clean();

    // Aggregate with the denominations if the value is the same (This can happend when the units are different)
    let aggDenominations = [];
    if (resultJSON.length)
        aggDenominations.push(resultJSON[0]);
    for (let i = 1; i < resultJSON.length; i++) {
        let j = aggDenominations.length - 1;
        if (resultJSON[i].denomination.toLocaleString("de-DE") === aggDenominations[j].denomination.toLocaleString("de-DE")) {
            aggDenominations[j].numCurrencies += resultJSON[i].numCurrencies;
            aggDenominations[j].collectionStats.numCurrencies += resultJSON[i].collectionStats.numCurrencies;
            aggDenominations[j].numSeries += resultJSON[i].numSeries;
            aggDenominations[j].collectionStats.numSeries += resultJSON[i].collectionStats.numSeries;
            aggDenominations[j].numVariants += resultJSON[i].numVariants;
            aggDenominations[j].collectionStats.numVariants += resultJSON[i].collectionStats.numVariants;
            aggDenominations[j].collectionStats.price = parseFloat(aggDenominations[j].collectionStats.price) + parseFloat(resultJSON[i].collectionStats.price);
        } else {
            aggDenominations.push(resultJSON[i]);
        }
    }

    for (let denomination of aggDenominations) {
        let descFields = [];

        descFields.push(denomination.denomination.toLocaleString("de-DE"));

        denominationsTable.addRecord(descFields, [denomination.numCurrencies, denomination.numSeries, denomination.numVariants], [denomination.collectionStats.numCurrencies, denomination.collectionStats.numSeries, denomination.collectionStats.numVariants],
            denomination.collectionStats.price);
    }
}


function fillYearsTable(resultJSON) {
    yearsTable.clean();

    for (let year of resultJSON) {
        let descFields = [];

        descFields.push(year.issueYear);

        yearsTable.addRecord(descFields, [year.numDenominations, year.numVariants], [year.collectionStats.numDenominations, year.collectionStats.numVariants],
            year.collectionStats.price);
    }
}

function showBlock(elem, blockName) {
    if (!$(elem).hasClass("disabled")) {
        $(elem).parent().parent().siblings().show();
        $(elem).siblings(".disabled").removeClass("disabled");
        $(elem).addClass("disabled");
    }

    if (blockName === 'Issues')
        deleteCookie(_COOKIE_COUNTRY_STATISTICS_ISSUES_HIDE);
    else if (blockName === 'Denominations')
        deleteCookie(_COOKIE_COUNTRY_STATISTICS_DENOMINATIONS_HIDE);
    else
        deleteCookie(_COOKIE_COUNTRY_STATISTICS_YEARS_HIDE);
}

function hideBlock(elem, blockName) {
    if (!$(elem).hasClass("disabled")) {
        $(elem).parent().parent().siblings().hide();
        $(elem).siblings(".disabled").removeClass("disabled");
        $(elem).addClass("disabled");
    }
    if (blockName === 'Issues')
        setCookie(_COOKIE_COUNTRY_STATISTICS_ISSUES_HIDE, "");
    else if (blockName === 'Denominations')
        setCookie(_COOKIE_COUNTRY_STATISTICS_DENOMINATIONS_HIDE, "");
    else
        setCookie(_COOKIE_COUNTRY_STATISTICS_YEARS_HIDE, "");
}