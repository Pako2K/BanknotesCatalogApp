let currenciesTable;
let statsSummaryTable;
let foundedFilter;
let extinctFilter;
let existingButton;
let extinctButton;
let curTypeButtons = [];

let currencyTypes;

// Statistics
let statsCurType = [];

function initialize() {
    // Customize some texts:
    $(`#types-filter>p`).text("Currency Type");

    $('#catalogue-stats>div.block-description').append(`
            <p>Shows statistics for each currency type, either existing or extinct, according to the filters:</p>
            <p>the total number of currencies in the catalogue, </p>
            <p>the number of currencies in your collection.</p>`);

    $('#catalogue-list div.block-title>p').text("List of Currencies");

    if (getCookie(_COOKIE_CURRENCY_FILTERS_HIDE) === "")
        hideBlock("#catalogue-filters span:last-of-type", "filters");
    if (getCookie(_COOKIE_CURRENCY_STATS_HIDE) === "")
        hideBlock("#catalogue-stats span:last-of-type", "stats");


    foundedFilter = new FromToFilter($("#years-filter>div:first-of-type"), "Created", yearFilterChanged);
    extinctFilter = new FromToFilter($("#years-filter>div:last-of-type"), "Replaced", yearFilterChanged);

    foundedFilter.initFrom(getCookie(_COOKIE_CURRENCY_FILTER_FOUNDED_FROM));
    foundedFilter.initTo(getCookie(_COOKIE_CURRENCY_FILTER_FOUNDED_TO));
    extinctFilter.initFrom(getCookie(_COOKIE_CURRENCY_FILTER_EXTINCT_FROM));
    extinctFilter.initTo(getCookie(_COOKIE_CURRENCY_FILTER_EXTINCT_TO));

    // Set Currency types 
    let disabledCurTypes = [];
    let cookie = getCookie(_COOKIE_CURRENCY_FILTER_CUR_TYPES_DISABLED);
    if (cookie)
        disabledCurTypes = cookie.split("#");

    currencyTypes = ["OWNED", "SHARED"];
    let rows = [];
    currencyTypes.forEach((element, idx) => {
        statsCurType[idx] = { existing: { total: 0, col: 0 }, extinct: { total: 0, col: 0 } };

        rows.push({ id: idx, name: element });

        $("#types-filter>ul").append(`<li><div id="cur-type-${element}"></div>${element}</li>`);
        curTypeButtons[element] = new SlideButton($(`#cur-type-${element}`), 24, 13, true, curTypeFilterChanged);
    });

    statsSummaryTable = new StatsSummaryTable($("#summary-table"), ["Total", "Collect."], rows);
    disabledCurTypes.forEach((val, idx) => {
        curTypeButtons[val].click();
    });


    // Add slide buttons
    existingButton = new SlideButton($("#existing-slide-button"), 30, 16, true, stateFilterChanged);
    extinctButton = new SlideButton($("#extinct-slide-button"), 30, 16, true, stateFilterChanged);

    if (getCookie(_COOKIE_CURRENCY_FILTER_EXISTING) == "false") existingButton.click();
    if (getCookie(_COOKIE_CURRENCY_FILTER_EXTINCT) == "false") extinctButton.click();


    let existingInYear = getCookie(_COOKIE_CURRENCY_FILTER_EXISTING_IN_YEAR);
    if (existingInYear)
        $("#existing-year-filter>input").val(existingInYear).blur();

    let variantsUri;
    let itemsUri;
    if (getCookie(_COOKIE_USERNAME))
        itemsUri = "/currencies/items/stats";
    else
        variantsUri = "/currencies/variants/stats";

    // Get currencies
    $.ajax({
        type: "GET",
        url: variantsUri || itemsUri,
        async: true,
        cache: false,
        timeout: TIMEOUT,
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
            // Store and load data
            currenciesTable = new StatsListTable($("#catalogue-list-table"), [{ name: "", align: "center", isSortable: 0, optionalShow: 1 },
                { name: "ISO", align: "center", isSortable: 1, optionalShow: 1 },
                { name: "Name", align: "left", isSortable: 1, optionalShow: 0 },
                { name: "Territory", align: "left", isSortable: 1, optionalShow: 0 },
                { name: "Created", align: "center", isSortable: 1, optionalShow: 1 },
                { name: "Replaced", align: "center", isSortable: 1, optionalShow: 1 },
                { name: "Type", align: "center", isSortable: 0, optionalShow: 0 }
            ], ["Issues", "Denoms.", "Note Types", "Variants"], loadTables);

            currenciesTable.loadData(currenciesJSON, "Name");
        },
        error: function(xhr, status, error) {
            switch (xhr.status) {
                case 403:
                    alert("Your session is not valid or has expired.");
                    _clearSessionCookies();
                    location.reload();
                    break;
                default:
                    alert(`Query failed. \n${status} - ${error}\nPlease contact the web site administrator.`);
            }
        }
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
    let foundedFrom = foundedFilter.getFrom();
    let foundedTo = foundedFilter.getTo();
    let extinctFrom = extinctFilter.getFrom();
    let extinctTo = extinctFilter.getTo();
    let existingInYear = $("#existing-year-filter input").val();
    let showExisting = existingButton.isActive();
    let showExtinct = extinctButton.isActive();

    for (let currency of currenciesJSON) {

        // Apply filters

        if (filterContId && filterContId !== currency.territory.continent.id) continue;

        if ((foundedFrom && parseInt(currency.start) < foundedFrom) || (foundedTo && parseInt(currency.start) > foundedTo)) continue;

        if ((extinctFrom && (!currency.end || (parseInt(currency.end) < extinctFrom))) || (extinctTo && (!currency.end || (parseInt(currency.end) > extinctTo)))) continue;

        if (existingInYear && !(currency.start < existingInYear && (!currency.end || currency.end > existingInYear))) continue;

        if (!curTypeButtons[currency.currencyType].isActive()) continue;

        if ((!showExtinct && (currency.end != null)) ||
            (!showExisting && (currency.end == null))
        ) continue;

        let descFields = [];
        descFields.push(currency.symbol || "");
        descFields.push(currency.iso3 || "");
        descFields.push(`<a href="/_currency/index.html?currencyId=${currency.id}&territoryId=${currency.territory.id}">${currency.name}</a>`);
        descFields.push(`<a href="/_country/index.html?countryId=${currency.territory.id}">${currency.territory.name}</a>`);
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
            if (currency.collectionStats.numCurrencies)
                statsCurType[curTypeIdx].existing.col++;
        } else {
            statsCurType[curTypeIdx].extinct.total++;
            if (currency.collectionStats.numCurrencies)
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


function showBlock(elem, blockName) {
    if (!$(elem).hasClass("disabled")) {
        $(elem).parent().parent().siblings().show();
        $(elem).siblings(".disabled").removeClass("disabled");
        $(elem).addClass("disabled");
    }

    if (blockName === 'filters')
        deleteCookie(_COOKIE_CURRENCY_FILTERS_HIDE);
    else
        deleteCookie(_COOKIE_CURRENCY_STATS_HIDE);
}

function hideBlock(elem, blockName) {
    if (!$(elem).hasClass("disabled")) {
        $(elem).parent().parent().siblings().hide();
        $(elem).siblings(".disabled").removeClass("disabled");
        $(elem).addClass("disabled");
    }
    if (blockName === 'filters')
        setCookie(_COOKIE_CURRENCY_FILTERS_HIDE, "");
    else
        setCookie(_COOKIE_CURRENCY_STATS_HIDE, "");
}


function changedContinent(contId, contName) {

    $("#applied-filters>span.cont-name").text(contName);

    // Get data and reload the tables
    if (currenciesTable)
        loadTables(currenciesTable.getData());
}

function yearFilterChanged(filterName, from, to) {
    // Store value in the cookie
    if (filterName === "Founded") {
        setCookie(_COOKIE_CURRENCY_FILTER_FOUNDED_FROM, from);
        setCookie(_COOKIE_CURRENCY_FILTER_FOUNDED_TO, to);
    } else {
        setCookie(_COOKIE_CURRENCY_FILTER_EXTINCT_FROM, from);
        setCookie(_COOKIE_CURRENCY_FILTER_EXTINCT_TO, to);
    }

    // Get data and reload the tables
    if (currenciesTable)
        loadTables(currenciesTable.getData());
}

function stateFilterChanged(id, state) {
    let type = id.split('-')[0];

    if (type === "existing") {
        setCookie(_COOKIE_CURRENCY_FILTER_EXISTING, state);
    } else {
        setCookie(_COOKIE_CURRENCY_FILTER_EXTINCT, state);
    }

    if (!state) {
        statsSummaryTable.disableColumns((type === "existing") ? 0 : 1);
        $(`#applied-filters>span.${type}`).text("Not " + type);
        $(`#applied-filters>span.${type}`).show();
    } else {
        statsSummaryTable.enableColumns((type === "existing") ? 0 : 1);
        $(`#applied-filters>span.${type}`).hide();
    }

    // Get data and reload the tables
    if (currenciesTable)
        loadTables(currenciesTable.getData());
}

function curTypeFilterChanged(id, state) {
    let curTypeName = id.split("-")[2];
    let curTypeId = currencyTypes.indexOf(curTypeName);
    let disabledCurTypes = [];
    let cookie = getCookie(_COOKIE_CURRENCY_FILTER_CUR_TYPES_DISABLED);
    if (cookie)
        disabledCurTypes = cookie.split("#");

    if (!state) {
        statsSummaryTable.disableRow(curTypeId);
        // Add to Cookie
        if (disabledCurTypes.indexOf(curTypeName) === -1)
            disabledCurTypes.push(curTypeName);
    } else {
        statsSummaryTable.enableRow(curTypeId);
        // Update Cookie
        let pos = disabledCurTypes.indexOf(curTypeName);
        if (pos !== -1)
            disabledCurTypes.splice(pos, 1);
    }
    setCookie(_COOKIE_CURRENCY_FILTER_CUR_TYPES_DISABLED, disabledCurTypes.join("#"));

    // Get data and reload the tables
    if (currenciesTable)
        loadTables(currenciesTable.getData());
}

function existingYearFilterChanged(elem) {
    if ($(elem).data("init-value") !== $(elem).val()) {
        setCookie(_COOKIE_CURRENCY_FILTER_EXISTING_IN_YEAR, $(elem).val());

        if ($(elem).val() && $(elem).val() != "") {
            $(`#applied-filters>span.existing-in`).text("Existing in " + $(elem).val());
            $(`#applied-filters>span.existing-in`).show();
        } else {
            $(`#applied-filters>span.existing-in`).hide();
        }
        $(elem).data("init-value", $(elem).val());
        if (currenciesTable)
            loadTables(currenciesTable.getData());
    }
}