"use strict"

let issuedFilter;
let listCard;
let denominationsTable;

const _COOKIE_DENOMINATIONS_FILTER_ISSUED_FROM = "BOC.denominations.filter.issued.from";
const _COOKIE_DENOMINATIONS_FILTER_ISSUED_TO = "BOC.denominations.filter.issued.to";

function initialize() {
    // Insert Denomination filters in a card
    let card = new ShowHideCard("DenominationFilter", $('#filters'), "Filters");
    card.setContent(`
        <div id="years-filter">
            <div></div>
        </div>`);

    issuedFilter = new FromToFilter($("#years-filter>div"), "Issued", yearFilterChanged);
    issuedFilter.initFrom(localStorage.getItem(_COOKIE_DENOMINATIONS_FILTER_ISSUED_FROM));
    issuedFilter.initTo(localStorage.getItem(_COOKIE_DENOMINATIONS_FILTER_ISSUED_TO));

    // Store and load data
    listCard = new SimpleCard($('#list-card'), "List of Denominations", "");
    listCard.setContent(`
          <div id="list-table">
          </div>`);

    denominationsTable = new StatsListTable($("#list-table"), [
        { name: "Denomination", align: "center", isSortable: 1, optionalShow: 0 },
    ], ["Territories", "Currencies", "Issues", "Variants"], loadTable);

    readDenominations();
}


function readDenominations() {
    let variantsUri;
    let itemsUri;
    if (Session.getUsername())
        itemsUri = "/denominations/items/stats";
    else
        variantsUri = "/denominations/variants/stats";

    // Retrieve filters
    let filterContId = ContinentsFilter.getSelectedId();
    let yearFrom = issuedFilter.getFrom();
    let yearTo = issuedFilter.getTo();

    // Set subtitle
    listCard.setSubtitle(ContinentsFilter.getSelectedName());

    let queryStr = "";
    if (filterContId) queryStr = "?continentId=" + filterContId;

    if (yearFrom) {
        if (queryStr === "") queryStr += "?";
        else queryStr += "&";
        queryStr += "yearFrom=" + yearFrom;
    }
    if (yearTo) {
        if (queryStr === "") queryStr += "?";
        else queryStr += "&";
        queryStr += "yearTo=" + yearTo;
    }

    // Get denominations
    asyncGET((variantsUri || itemsUri) + queryStr, (denominationsJSON, status) => {
        if (variantsUri) {
            // Add null collectionStats
            for (let row of denominationsJSON) {
                row.collectionStats = {};
                row.collectionStats.numTerritories = 0;
                row.collectionStats.numCurrencies = 0;
                row.collectionStats.numSeries = 0;
                row.collectionStats.numVariants = 0;
                row.collectionStats.price = 0;
            }
        }

        // Aggregate with the denominations if the value is the same (This can happend when the units are different)
        let aggDenominations = [];
        if (denominationsJSON.length)
            aggDenominations.push(denominationsJSON[0]);
        for (let i = 1; i < denominationsJSON.length; i++) {
            let j = aggDenominations.length - 1;
            if (denominationsJSON[i].denomination.toLocaleString("de-DE") === aggDenominations[j].denomination.toLocaleString("de-DE")) {
                aggDenominations[j].numTerritories += denominationsJSON[i].numTerritories;
                aggDenominations[j].collectionStats.numTerritories += denominationsJSON[i].collectionStats.numTerritories;
                aggDenominations[j].numCurrencies += denominationsJSON[i].numCurrencies;
                aggDenominations[j].collectionStats.numCurrencies += denominationsJSON[i].collectionStats.numCurrencies;
                aggDenominations[j].numSeries += denominationsJSON[i].numSeries;
                aggDenominations[j].collectionStats.numSeries += denominationsJSON[i].collectionStats.numSeries;
                aggDenominations[j].numVariants += denominationsJSON[i].numVariants;
                aggDenominations[j].collectionStats.numVariants += denominationsJSON[i].collectionStats.numVariants;
                aggDenominations[j].collectionStats.price = aggDenominations[j].collectionStats.price + denominationsJSON[i].collectionStats.price;
            } else {
                aggDenominations.push(denominationsJSON[i]);
            }
        }

        denominationsTable.loadData(aggDenominations, "Denomination");
    });
}

function loadTable(denominationsJSON) {
    let totals = {
        variants: { cat: 0, col: 0 },
        price: 0
    };

    // Clean-up table
    denominationsTable.clean();

    for (let denom of denominationsJSON) {
        let descFields = [];
        let denomStr = denom.denomination.toLocaleString("de-DE");
        descFields.push(`<a href="/catalogue/search?denomination=${denomStr}">${denomStr}</a>`);
        denominationsTable.addRecord(descFields, [denom.numTerritories, denom.numCurrencies, denom.numSeries, denom.numVariants], [denom.collectionStats.numTerritories, denom.collectionStats.numCurrencies, denom.collectionStats.numSeries, denom.collectionStats.numVariants],
            denom.collectionStats.price);

        // Totals:
        totals.variants.cat += parseInt(denom.numVariants);
        totals.variants.col += denom.collectionStats.numVariants;
        totals.price += denom.collectionStats.price;
    }
    denominationsTable.setFooter(totals.variants.cat, totals.variants.col, totals.price);
}

function changedContinent(contId, contName) {
    // Retrieve denominations
    readDenominations();
}

function yearFilterChanged(filterName, from, to) {
    // Store value in the cookie
    localStorage.setItem(_COOKIE_DENOMINATIONS_FILTER_ISSUED_FROM, from);
    localStorage.setItem(_COOKIE_DENOMINATIONS_FILTER_ISSUED_TO, to);

    readDenominations();
}