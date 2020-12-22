"use strict"

let issuedFilter;
let listCard;
let yearsTable;

const _COOKIE_YEARS_FILTER_ISSUED_FROM = "BOC.years.filter.issued.from";
const _COOKIE_YEARS_FILTER_ISSUED_TO = "BOC.years.filter.issued.to";


function initialize() {
    // Insert Denomination filters in a card
    let card = new ShowHideCard("YearFilter", $('#filters'), "Filters");
    card.setContent(`
        <div id="years-filter">
            <div></div>
        </div>`);

    issuedFilter = new FromToFilter($("#years-filter>div"), "Issued", yearFilterChanged);
    issuedFilter.initFrom(localStorage.getItem(_COOKIE_YEARS_FILTER_ISSUED_FROM));
    issuedFilter.initTo(localStorage.getItem(_COOKIE_YEARS_FILTER_ISSUED_TO));

    // Store and load data
    listCard = new SimpleCard($('#list-card'), "List of Issue Years", "");
    listCard.setContent(`
      <div id="list-table">
      </div>`);

    yearsTable = new StatsListTable($("#list-table"), [
        { name: "Issue Year", align: "center", isSortable: 1, optionalShow: 0 },
    ], ["Territories", "Currencies", "Issues", "Denominations", "Note Types", "Variants"], loadTable);

    readYears();
}


function readYears() {
    let variantsUri;
    let itemsUri;
    if (Session.getUsername())
        itemsUri = "/years/items/stats";
    else
        variantsUri = "/years/variants/stats";

    // Retrieve filters 
    let filterContId = ContinentsFilter.getSelectedId();

    // Set subtitle
    listCard.setSubtitle(ContinentsFilter.getSelectedName());

    let queryStr = "?dateType=issue";
    if (filterContId) queryStr += "&continentId=" + filterContId;

    // Get years
    asyncGET((variantsUri || itemsUri) + queryStr, (yearsJSON, status) => {
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
    readYears();
}


function yearFilterChanged(filterName, from, to) {
    // Store value in the cookie
    localStorage.setItem(_COOKIE_YEARS_FILTER_ISSUED_FROM, from);
    localStorage.setItem(_COOKIE_YEARS_FILTER_ISSUED_TO, to);

    loadTable(yearsTable.getData());
}