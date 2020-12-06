let countriesTable;
let statsSummaryTable;
let foundedFilter;
let extinctFilter;
let existingButton;
let extinctButton;
let terTypeButtons = [];

let territoryTypesJSON;
let territoryTypesMap;

// Statistics
let statsTerType = [];

function initialize() {
    // Customize some texts:
    $(`#types-filter>p`).text("Territory Type");

    $('#catalogue-stats>div.block-description').append(`
        <p>Shows 3 statistics for each territory type, either existing or extinct territories, according to the filters:</p>
        <p>the total number of territories in the catalogue, </p>
        <p>the number of territories which issue their own currencies,</p>
        <p>the number of territories in your collection.</p>`);

    $('#catalogue-list div.block-title>p').text("List of Territories");

    if (getCookie(_COOKIE_COUNTRY_FILTERS_HIDE) === "")
        hideBlock("#catalogue-filters span:last-of-type", "filters");
    if (getCookie(_COOKIE_COUNTRY_STATS_HIDE) === "")
        hideBlock("#catalogue-stats span:last-of-type", "stats");


    foundedFilter = new FromToFilter($("#years-filter>div:first-of-type"), "Founded", yearFilterChanged);
    extinctFilter = new FromToFilter($("#years-filter>div:last-of-type"), "Extinct", yearFilterChanged);

    foundedFilter.initFrom(getCookie(_COOKIE_COUNTRY_FILTER_FOUNDED_FROM));
    foundedFilter.initTo(getCookie(_COOKIE_COUNTRY_FILTER_FOUNDED_TO));
    extinctFilter.initFrom(getCookie(_COOKIE_COUNTRY_FILTER_EXTINCT_FROM));
    extinctFilter.initTo(getCookie(_COOKIE_COUNTRY_FILTER_EXTINCT_TO));

    // Load Country types synchronously, before anything else
    $.ajax({
        type: "GET",
        url: `/territory-types`,
        async: false,
        cache: true,
        timeout: TIMEOUT,
        dataType: 'json',
        success: function(result, status) {
            let disabledTerTypes = [];
            let cookie = getCookie(_COOKIE_COUNTRY_FILTER_TER_TYPES_DISABLED);
            if (cookie)
                disabledTerTypes = cookie.split("#");

            territoryTypesJSON = result;
            territoryTypesMap = [];
            let rows = [];
            territoryTypesJSON.forEach(element => {
                territoryTypesMap[element.id] = element.abbrevation;
                statsTerType[element.id] = { existing: { total: 0, issuing: 0, col: 0 }, extinct: { total: 0, issuing: 0, col: 0 } };

                rows.push({ id: element.id, name: element.name });

                $("#types-filter>ul").append(`<li><div id="ter-type-${element.id}"></div>${element.name}</li>`);
                terTypeButtons[element.id] = new SlideButton($(`#ter-type-${element.id}`), 24, 13, true, terTypeFilterChanged);
            });

            statsSummaryTable = new StatsSummaryTable($("#summary-table"), ["Total", "Issuer", "Collect."], rows);
            disabledTerTypes.forEach((val, idx) => {
                terTypeButtons[parseInt(val)].click();
            });

        },
        error: function(xhr, status, error) {
            alert(`Query failed. \n${status} - ${error}\nPlease contact the web site administrator.`);
        }
    });

    // Add slide buttons
    existingButton = new SlideButton($("#existing-slide-button"), 30, 16, true, stateFilterChanged);
    extinctButton = new SlideButton($("#extinct-slide-button"), 30, 16, true, stateFilterChanged);

    if (getCookie(_COOKIE_COUNTRY_FILTER_EXISTING) == "false") existingButton.click();
    if (getCookie(_COOKIE_COUNTRY_FILTER_EXTINCT) == "false") extinctButton.click();


    let existingInYear = getCookie(_COOKIE_COUNTRY_FILTER_EXISTING_IN_YEAR);
    if (existingInYear)
        $("#existing-year-filter>input").val(existingInYear).blur();

    let variantsUri;
    let itemsUri;
    if (getCookie(_COOKIE_USERNAME))
        itemsUri = "/territories/items/stats";
    else
        variantsUri = "/territories/variants/stats";

    // Get territories and statistics
    $.ajax({
        type: "GET",
        url: variantsUri || itemsUri,
        async: true,
        cache: false,
        timeout: TIMEOUT,
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
            // Store and load data
            countriesTable = new StatsListTable($("#catalogue-list-table"), [{ name: "", align: "center", isSortable: 0, optionalShow: 1 },
                { name: "ISO", align: "center", isSortable: 1, optionalShow: 1 },
                { name: "Name", align: "left", isSortable: 1, optionalShow: 0 },
                { name: "Founded", align: "center", isSortable: 1, optionalShow: 1 },
                { name: "Finished", align: "center", isSortable: 1, optionalShow: 1 },
                { name: "Type", align: "center", isSortable: 0, optionalShow: 0 }
            ], ["Currencies", "Issues", "Denoms.", "Note Types", "Variants"], loadTables);

            countriesTable.loadData(countriesJSON, "Name");
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
    let foundedFrom = foundedFilter.getFrom();
    let foundedTo = foundedFilter.getTo();
    let extinctFrom = extinctFilter.getFrom();
    let extinctTo = extinctFilter.getTo();
    let existingInYear = $("#existing-year-filter input").val();
    let showExisting = existingButton.isActive();
    let showExtinct = extinctButton.isActive();

    for (let country of countriesJSON) {

        // Apply filters 
        if (filterContId && filterContId !== country.continentId) continue;

        if ((foundedFrom && country.start < foundedFrom) || (foundedTo && country.start > foundedTo)) continue;

        if ((extinctFrom && country.end < extinctFrom) || (extinctTo && country.end > extinctTo)) continue;

        if (existingInYear && !(country.start < existingInYear && (!country.end || country.end > existingInYear))) continue;

        if (!terTypeButtons[country.territoryTypeId].isActive()) continue;

        if ((!showExtinct && (country.end !== null)) ||
            (!showExisting && (country.end === null))
        ) continue;

        let flagFileName = country.iso3;
        if (!country.iso3) {
            country.iso3 = "-";
            // Remove spaces and commas
            flagFileName = country.name.replace(/,|\s/g, "");
        }

        let descFields = [];
        descFields.push(`<img src="/data/_flags_/${flagFileName.toLowerCase()}.png">`);
        descFields.push(country.iso3);
        descFields.push(`<a href="/_country/index.html?countryId=${country.id}">${country.name}</a>`);
        descFields.push(country.start);
        descFields.push(country.end || "");
        descFields.push(territoryTypesMap[country.territoryTypeId]);
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


function showBlock(elem, blockName) {
    if (!$(elem).hasClass("disabled")) {
        $(elem).parent().parent().siblings().show();
        $(elem).siblings(".disabled").removeClass("disabled");
        $(elem).addClass("disabled");
    }

    if (blockName === 'filters')
        deleteCookie(_COOKIE_COUNTRY_FILTERS_HIDE);
    else
        deleteCookie(_COOKIE_COUNTRY_STATS_HIDE);
}

function hideBlock(elem, blockName) {
    if (!$(elem).hasClass("disabled")) {
        $(elem).parent().parent().siblings().hide();
        $(elem).siblings(".disabled").removeClass("disabled");
        $(elem).addClass("disabled");
    }
    if (blockName === 'filters')
        setCookie(_COOKIE_COUNTRY_FILTERS_HIDE, "");
    else
        setCookie(_COOKIE_COUNTRY_STATS_HIDE, "");
}


function changedContinent(contId, contName) {

    $("#applied-filters>span.cont-name").text(contName);

    // Get data and reload the tables
    if (countriesTable)
        loadTables(countriesTable.getData());
}

function yearFilterChanged(filterName, from, to) {
    // Store value in the cookie
    if (filterName === "Founded") {
        setCookie(_COOKIE_COUNTRY_FILTER_FOUNDED_FROM, from);
        setCookie(_COOKIE_COUNTRY_FILTER_FOUNDED_TO, to);
    } else {
        setCookie(_COOKIE_COUNTRY_FILTER_EXTINCT_FROM, from);
        setCookie(_COOKIE_COUNTRY_FILTER_EXTINCT_TO, to);
    }

    // Get data and reload the tables
    if (countriesTable)
        loadTables(countriesTable.getData());
}

function stateFilterChanged(id, state) {
    let type = id.split('-')[0];

    if (type === "existing") {
        setCookie(_COOKIE_COUNTRY_FILTER_EXISTING, state);
    } else {
        setCookie(_COOKIE_COUNTRY_FILTER_EXTINCT, state);
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
    if (countriesTable)
        loadTables(countriesTable.getData());
}

function terTypeFilterChanged(id, state) {
    let terTypeId = id.split("-")[2];
    let disabledTerTypes = [];
    let cookie = getCookie(_COOKIE_COUNTRY_FILTER_TER_TYPES_DISABLED);
    if (cookie)
        disabledTerTypes = cookie.split("#");

    if (!state) {
        statsSummaryTable.disableRow(terTypeId);
        // Add to Cookie
        if (disabledTerTypes.indexOf(terTypeId) === -1)
            disabledTerTypes.push(terTypeId);
    } else {
        statsSummaryTable.enableRow(terTypeId);
        // Update Cookie
        let pos = disabledTerTypes.indexOf(terTypeId);
        if (pos !== -1)
            disabledTerTypes.splice(pos, 1);
    }
    setCookie(_COOKIE_COUNTRY_FILTER_TER_TYPES_DISABLED, disabledTerTypes.join("#"));

    // Get data and reload the tables
    if (countriesTable)
        loadTables(countriesTable.getData());
}

function existingYearFilterChanged(elem) {
    if ($(elem).data("init-value") !== $(elem).val()) {
        setCookie(_COOKIE_COUNTRY_FILTER_EXISTING_IN_YEAR, $(elem).val());

        if ($(elem).val() && $(elem).val() != "") {
            $(`#applied-filters>span.existing-in`).text("Existing in " + $(elem).val());
            $(`#applied-filters>span.existing-in`).show();
        } else {
            $(`#applied-filters>span.existing-in`).hide();
        }
        $(elem).data("init-value", $(elem).val());
        if (countriesTable)
            loadTables(countriesTable.getData());
    }
}