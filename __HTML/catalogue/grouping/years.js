"use strict"

let issuedFilter;

let yearsTable;

function initialize() {
    // Customize some texts:
    $('.list-section div.block-title>p').text("List of Issue Years");

    if (getCookie(_COOKIE_YEARS_FILTERS_HIDE) === "")
        hideBlock("#filters span:last-of-type");

    issuedFilter = new FromToFilter($("#years-filter>div"), "Issued", yearFilterChanged);
    issuedFilter.initFrom(getCookie(_COOKIE_YEARS_FILTER_ISSUED_FROM));
    issuedFilter.initTo(getCookie(_COOKIE_YEARS_FILTER_ISSUED_TO));

    yearsTable = new StatsListTable($("#list-table"), [
        { name: "Issue Year", align: "center", isSortable: 1, optionalShow: 0 },
    ], ["Territories", "Currencies", "Issues", "Denominations", "Note Types", "Variants"], loadTable);

    readYears();
}


function readYears() {
    let variantsUri;
    let itemsUri;
    if (getCookie(_COOKIE_USERNAME))
        itemsUri = "/years/items/stats";
    else
        variantsUri = "/years/variants/stats";

    // Retrieve filters 
    let filterContId = ContinentsFilter.getSelectedId();

    let queryStr = "?dateType=issue";
    if (filterContId) queryStr += "&continentId=" + filterContId;

    // Get years
    $.ajax({
        type: "GET",
        url: (variantsUri || itemsUri) + queryStr,
        async: true,
        cache: false,
        timeout: TIMEOUT,
        dataType: 'json',

        success: function(yearsJSON, status) {
            if (variantsUri) {
                // Add null collectionStats
                for (let row of yearsJSON) {
                    row.collectionStats = {};
                    row.collectionStats.numTerritories = 0;
                    row.collectionStats.numCurrencies = 0;
                    row.collectionStats.numSeries = 0;
                    row.collectionStats.numDenominations = 0;
                    row.collectionStats.numNotes = 0;
                    row.collectionStats.numVariants = 0;
                    row.collectionStats.price = 0;
                }
            }

            yearsTable.loadData(yearsJSON, "Issue Year");
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

function loadTable(yearsJSON) {
    let totals = {
        variants: { cat: 0, col: 0 },
        price: 0
    };

    // Read years filter
    let yearFrom = issuedFilter.getFrom();
    let yearTo = issuedFilter.getTo();

    // Clean table body and foot
    yearsTable.clean();

    for (let year of yearsJSON) {
        // Apply filters
        if ((!yearFrom || year.issueYear >= yearFrom) && (!yearTo || year.issueYear <= yearTo)) {
            let descFields = [];
            descFields.push(year.issueYear);
            yearsTable.addRecord(descFields, [year.numTerritories, year.numCurrencies, year.numSeries, year.numDenominations, year.numNotes, year.numVariants], [year.collectionStats.numTerritories, year.collectionStats.numCurrencies, year.collectionStats.numSeries, year.collectionStats.numDenominations, year.collectionStats.numNotes, year.collectionStats.numVariants],
                year.collectionStats.price);

            // Totals:
            totals.variants.cat += parseInt(year.numVariants);
            totals.variants.col += year.collectionStats.numVariants;
            totals.price += year.collectionStats.price;
        }
    }
    yearsTable.setFooter(totals.variants.cat, totals.variants.col, totals.price);
}


function changedContinent(contId, contName) {
    $("#applied-filters>span.cont-name").text(contName);

    if (yearsTable)
        readYears();
}


function yearFilterChanged(filterName, from, to) {
    // Store value in the cookie
    setCookie(_COOKIE_YEARS_FILTER_ISSUED_FROM, from);
    setCookie(_COOKIE_YEARS_FILTER_ISSUED_TO, to);

    if (yearsTable)
        loadTable(yearsTable.getData());
}


function showBlock(elem) {
    if (!$(elem).hasClass("disabled")) {
        $(elem).parent().parent().siblings().show();
        $(elem).siblings(".disabled").removeClass("disabled");
        $(elem).addClass("disabled");
    }

    deleteCookie(_COOKIE_YEARS_FILTERS_HIDE);
}

function hideBlock(elem) {
    if (!$(elem).hasClass("disabled")) {
        $(elem).parent().parent().siblings().hide();
        $(elem).siblings(".disabled").removeClass("disabled");
        $(elem).addClass("disabled");
    }
    setCookie(_COOKIE_YEARS_FILTERS_HIDE, "");
}