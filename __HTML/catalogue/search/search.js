"use strict"

let territoryFilters;
let currencyFilters;
let banknoteFilters;
let listCard;
let resultsTable;

let filters = {
    continent: null,
    territory: { types: null, foundedFrom: null, foundedTo: null, disappearedFrom: null, disappearedTo: null, exixting: null, extinct: null, existingIn: null },
    currency: { types: null, createdFrom: null, createdTo: null, replacedFrom: null, replacedTo: null, existingIn: null },
    banknote: { denominationMin: null, denominationMax: null, issuedateFrom: null, issuedateTo: null },
};

let territoryTypes = [];
const currencyTypes = ["OWNED", "SHARED"];

$(document).ready(() => {

    let searchStrArr = window.location.search.substr(1).split("&");
    let searchParam = searchStrArr[0].split("=");
    let denomination = searchParam[0] === "denomination" ? searchParam[1] : null;
    let issueYear = searchParam[0] === "issued" ? searchParam[1] : null;


    // Insert filters
    currencyFilters = new CurrencyFilters("SearchCur", $(`#currency-filter`), currencyTypes, () => {});
    banknoteFilters = new BanknoteFilters("SearchBan", $(`#banknote-filter`), () => {});

    if (denomination) {
        banknoteFilters.setDenomFrom(denomination);
        banknoteFilters.setDenomTo(denomination);
        banknoteFilters.setIssuedFrom("");
        banknoteFilters.setIssuedTo("");
    } else if (issueYear) {
        banknoteFilters.setDenomFrom("");
        banknoteFilters.setDenomTo("");
        banknoteFilters.setIssuedFrom(issueYear);
        banknoteFilters.setIssuedTo(issueYear);
    }

    // Results card
    listCard = new SimpleCard($('#results-list'), "List of Banknotes", "");
    listCard.setContent(`<p class="result-msg"></p>
                        <div id="results-table"></div>`);

    resultsTable = new NotesListTable($("#results-table"), "ALL");


    // Load Country types 
    asyncGET("/territory-types", (territoryTypesJSON, status) => {
        territoryTypes = territoryTypesJSON;
        // Insert Territory filters
        territoryFilters = new TerritoryFilters("SearchTer", $(`#territory-filter`), territoryTypesJSON, () => {});

        // All filters loaded: call API and fill in the list table
        callVariantsAPI();
    });
})



function getTerritoryFilters() {
    let filtersJSON = territoryFilters.getFilters();

    filters.territory.foundedFrom = filtersJSON.founded.from || "";
    filters.territory.foundedTo = filtersJSON.founded.to || "";
    filters.territory.disappearedFrom = filtersJSON.extinct.from || "";
    filters.territory.disappearedTo = filtersJSON.extinct.to || "";
    filters.territory.exixting = filtersJSON.isExisting === "false" ? false : true;
    filters.territory.extinct = filtersJSON.isExtinct === "false" ? false : true;
    filters.territory.existingIn = filtersJSON.existingInYear || "";

    filters.territory.types = [];
    territoryTypes.forEach((element) => { filters.territory.types.push(element.id) });
    filtersJSON.disabledTerTypes.forEach(element => {
        let pos = filters.territory.types.indexOf(parseInt(element));
        if (pos !== -1)
            filters.territory.types.splice(pos, 1);
    });

    if (filters.territory.foundedFrom === "" && filters.territory.foundedTo === "" && filters.territory.disappearedFrom === "" && filters.territory.disappearedTo === "" &&
        filters.territory.exixting && filters.territory.extinct && filters.territory.existingIn === "" && filters.territory.types.length === territoryTypes.length)
        return false;
    else
        return true;
}


function getCurrencyFilters() {
    let filtersJSON = currencyFilters.getFilters();

    filters.currency.createdFrom = filtersJSON.founded.from || "";
    filters.currency.createdTo = filtersJSON.founded.to || "";
    filters.currency.replacedFrom = filtersJSON.extinct.from || "";
    filters.currency.replacedTo = filtersJSON.extinct.to || "";
    filters.currency.exixting = filtersJSON.isExisting === "false" ? false : true;
    filters.currency.extinct = filtersJSON.isExtinct === "false" ? false : true;
    filters.currency.existingIn = filtersJSON.existingInYear || "";

    filters.currency.types = [];
    currencyTypes.forEach((element) => { filters.currency.types.push(element) });
    filtersJSON.disabledCurTypes.forEach(element => {
        let pos = filters.currency.types.indexOf(element);
        if (pos !== -1)
            filters.currency.types.splice(pos, 1);
    });
    if (filters.currency.createdFrom === "" && filters.currency.createdTo === "" && filters.currency.replacedFrom === "" && filters.currency.replacedTo === "" &&
        filters.currency.exixting && filters.currency.extinct && filters.currency.existingIn === "" && filters.currency.types.length === currencyTypes.length)
        return false;
    else
        return true;
}


function getBanknoteFilters() {
    let filtersJSON = banknoteFilters.getFilters();

    filters.banknote.denominationMin = filtersJSON.denom.from || "";
    filters.banknote.denominationMax = filtersJSON.denom.to || "";
    filters.banknote.issuedateFrom = filtersJSON.issued.from || "";
    filters.banknote.issuedateTo = filtersJSON.issued.to || "";

    if (filters.banknote.issuedateFrom === "" && filters.banknote.issuedateTo === "" && filters.banknote.denominationMin === "" && filters.banknote.denominationMax === "")
        return false;
    else
        return true;
}



function callVariantsAPI() {
    filters.continent = ContinentsFilter.getSelectedId() || "";
    if (!(getTerritoryFilters() + getCurrencyFilters() + getBanknoteFilters())) {
        $("#results-list p.result-msg").text("Enter your search criteria using the filters above.");
        resultsTable.removeData();
        resultsTable.hide();
        listCard.setSubtitle("");
        return;
    }

    // Build query string
    let terTypeParam = "";
    if (!filters.territory.types.length) {
        alert("No territory type selected!");
        resultsTable.removeData();
        resultsTable.hide();
        listCard.setSubtitle("");
        return;
    } else if (territoryTypes.length > filters.territory.types.length) {
        terTypeParam = "&terTypeIds=" + filters.territory.types.join(",");
    }

    let curTypeParam = "";
    if (!filters.currency.types.length) {
        alert("No currency type selected!");
        resultsTable.removeData();
        resultsTable.hide();
        listCard.setSubtitle("");
        return;
    } else if (currencyTypes.length > filters.currency.types.length) {
        curTypeParam = "&curTypeIds=" + filters.currency.types.join(",");
    }


    let queryStr = "";
    queryStr += "continentId=" + filters.continent + terTypeParam + curTypeParam +
        "&terStartDateFrom=" + filters.territory.foundedFrom + "&terStartDateTo=" + filters.territory.foundedTo +
        "&terEndDateFrom=" + filters.territory.disappearedFrom + "&terEndDateTo=" + filters.territory.disappearedTo +
        (filters.territory.exixting ? "&terIsExisting" : "") + (filters.territory.extinct ? "&terIsExtinct" : "") +
        "&terExistingIn=" + filters.territory.existingIn +
        "&curStartDateFrom=" + filters.currency.createdFrom + "&curStartDateTo=" + filters.currency.createdTo +
        "&curEndDateFrom=" + filters.currency.replacedFrom + "&curEndDateTo=" + filters.currency.replacedTo +
        (filters.currency.exixting ? "&curIsExisting" : "") + (filters.currency.extinct ? "&curIsExtinct" : "") +
        "&curExistingIn=" + filters.currency.existingIn +
        "&minDenom=" + filters.banknote.denominationMin + "&maxDenom=" + filters.banknote.denominationMax +
        "&issueYearFrom=" + filters.banknote.issuedateFrom + "&issueYearTo=" + filters.banknote.issuedateTo;

    // Get variants
    let urlStr = `/variants?${queryStr}`
    if (Session.getUsername())
        urlStr = `/items?${queryStr}`

    asyncGET(urlStr, (variantsJSON, status) => {
        if (variantsJSON.length === 0) {
            $("#results-list p.result-msg").text("No banknotes found with this search criteria.");
            resultsTable.removeData();
            resultsTable.hide();
            listCard.setSubtitle("Found: " + 0);
            return;
        }

        resultsTable.addData(variantsJSON);
        resultsTable.show();
        $("#results-list p.result-msg").text("");
        listCard.setSubtitle("Found: " + variantsJSON.length);

    }, (xhr, status, error) => {
        if (xhr.responseJSON && xhr.responseJSON.status === 413) {
            $("#results-list p.result-msg").text(`Too many banknotes found:${xhr.responseJSON.description.split(":")[1]}. Refine your search.`);
            resultsTable.removeData();
            resultsTable.hide();
            listCard.setSubtitle("");
        }
    });
}