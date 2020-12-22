"use strict"

let territoryFilters;
let currencyFilters;
let banknoteFilters;
let listCard;

let filters = {
    continent: null,
    territory: { types: null, foundedFrom: null, foundedTo: null, disappearedFrom: null, disappearedTo: null, exixting: null, extinct: null, existingIn: null },
    currency: { types: null, createdFrom: null, createdTo: null, replacedFrom: null, replacedTo: null, existingIn: null },
    banknote: { denominationMin: null, denominationMax: null, issuedateFrom: null, issuedateTo: null },
};

let territoryTypes = [];
const currencyTypes = ["OWNED", "SHARED"];

$(document).ready(() => {

    // Insert filters
    currencyFilters = new CurrencyFilters("SearchCur", $(`#currency-filter`), currencyTypes, () => {});
    banknoteFilters = new BanknoteFilters("SearchBan", $(`#banknote-filter`), () => {});

    // Results card
    listCard = new SimpleCard($('#results-list'), "List of Banknotes", "");
    listCard.setContent(`
        <p class="result-msg"></p>
        <div>
            <p class="not-logged-in"><a href="/index.html">Log in</a> to see your collection stats!</p>
            <table id="results-table" class="list-table">
                <thead>
                    <tr>
                        <th rowspan="2"><span class="is-sortable sorting-column" onclick="sortClick(this)">Cat. Id</span>
                            <div class="sort-div" onclick="sortClick(this)">
                                <div class="sort-asc"></div>
                                <div class="sort-desc"></div>
                            </div>
                        </th>
                        <th rowspan="2"><span class="is-sortable" onclick="sortClick(this)">Territory</span>
                            <div class="sort-div" onclick="sortClick(this)">
                                <div class="sort-asc"></div>
                                <div class="sort-desc"></div>
                            </div>
                        </th>
                        <th rowspan="2"><span class="is-sortable" onclick="sortClick(this)">Currency</span>
                            <div class="sort-div" onclick="sortClick(this)">
                                <div class="sort-asc"></div>
                                <div class="sort-desc"></div>
                            </div>
                        </th>
                        <th rowspan="2"><span class="is-sortable" onclick="sortClick(this)">Issue</span>
                            <div class="sort-div" onclick="sortClick(this)">
                                <div class="sort-asc"></div>
                                <div class="sort-desc"></div>
                            </div>
                        </th>
                        <th rowspan="2"><span class="is-sortable" onclick="sortClick(this)">Denomination</span>
                            <div class="sort-div" onclick="sortClick(this)">
                                <div class="sort-asc"></div>
                                <div class="sort-desc"></div>
                            </div>
                        </th>
                        <th rowspan="2"><span class="is-sortable" onclick="sortClick(this)">Issue Date</span>
                            <div class="sort-div" onclick="sortClick(this)">
                                <div class="sort-asc"></div>
                                <div class="sort-desc"></div>
                            </div>
                        </th>
                        <th rowspan="2"><span class="is-sortable" onclick="sortClick(this)">Printed Date</span>
                            <div class="sort-div" onclick="sortClick(this)">
                                <div class="sort-asc"></div>
                                <div class="sort-desc"></div>
                            </div>
                        </th>
                        <th rowspan="2"><span class="is-sortable" onclick="sortClick(this)">Issued by</span>
                            <div class="sort-div" onclick="sortClick(this)">
                                <div class="sort-asc"></div>
                                <div class="sort-desc"></div>
                            </div>
                        </th>
                        <th rowspan="2"><span class="is-sortable" onclick="sortClick(this)">Printer</span>
                            <div class="sort-div" onclick="sortClick(this)">
                                <div class="sort-asc"></div>
                                <div class="sort-desc"></div>
                            </div>
                        </th>
                        <th rowspan="2"><span class="is-sortable" onclick="sortClick(this)">Width (mm)</span>
                            <div class="sort-div" onclick="sortClick(this)">
                                <div class="sort-asc"></div>
                                <div class="sort-desc"></div>
                            </div>
                        </th>
                        <th rowspan="2"><span class="is-sortable" onclick="sortClick(this)">Height (mm)</span>
                            <div class="sort-div" onclick="sortClick(this)">
                                <div class="sort-asc"></div>
                                <div class="sort-desc"></div>
                            </div>
                        </th>
                        <th colspan="2" class="th-stats"><span class="only-logged-in">Collection</span></th>
                    </tr>
                    <tr>
                        <td><span class="only-logged-in">Grade</span></td>
                        <td><span class="is-sortable only-logged-in" onclick="sortClick(this)">Price</span>
                            <div class="sort-div" onclick="sortClick(this)">
                                <div class="sort-asc"></div>
                                <div class="sort-desc"></div>
                            </div>
                        </td>
                    </tr>
                </thead>
                <tbody></tbody>
            </table>
        </div>`);

    // Load Country types 
    asyncGET("/territory-types", (territoryTypesJSON, status) => {
        territoryTypes = territoryTypesJSON;
        // Insert Territory filters
        territoryFilters = new TerritoryFilters("SearchTer", $(`#territory-filter`), territoryTypesJSON, () => {});

        // All filters loaded: call API and fill in the list table
        callVariantsAPI();
    });

    if (!Session.getUsername()) {
        $(".only-logged-in").css('opacity', '0.25');
    }
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
    $("p.not-logged-in").hide();

    filters.continent = ContinentsFilter.getSelectedId() || "";
    if (!(getTerritoryFilters() + getCurrencyFilters() + getBanknoteFilters())) {
        $("#results-list p.result-msg").text("Enter your search criteria using the filters above.");
        $("#results-table>tbody").empty();
        $("#results-table>tfoot>tr").empty();
        $("#results-table").hide();
        listCard.setSubtitle("");
        return;
    }

    // Build query string
    let terTypeParam = "";
    if (!filters.territory.types.length) {
        alert("No territory type selected!");
        $("#results-table>tbody").empty();
        $("#results-table>tfoot>tr").empty();
        $("#results-table").hide();
        listCard.setSubtitle("");
        return;
    } else if (territoryTypes.length > filters.territory.types.length) {
        terTypeParam = "&terTypeIds=" + filters.territory.types.join(",");
    }

    let curTypeParam = "";
    if (!filters.currency.types.length) {
        alert("No currency type selected!");
        $("#results-table>tbody").empty();
        $("#results-table>tfoot>tr").empty();
        $("#results-table").hide();
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
            $("#results-table>tbody").empty();
            $("#results-table>tfoot>tr").empty();
            $("#results-table").hide();
            return;
        }
        $("#results-table").show();

        $("#results-list p.result-msg").text("");

        listCard.setSubtitle("Found: " + variantsJSON.length);

        for (let row of variantsJSON) {
            // Parse the catalogue id in order to be able to sort
            let parsedCatId = parseCatalogueId(row.catalogueId);
            row.catalogueIdPreffix = parsedCatId.catalogueIdPreffix;
            row.catalogueIdInt = parsedCatId.catalogueIdInt;
            row.catalogueIdSuffix = parsedCatId.catalogueIdSuffix;
            if (row.item) {
                row.grade = row.item.grade;
                row.price = parseFloat(row.item.price);
            } else {
                row.grade = "-";
                row.price = 0;
            }
        }

        $("#results-table").data("value", JSON.stringify(variantsJSON));

        // Sort by the first column
        $(".sort-selection").removeClass("sort-selection");
        $("#results-table th:first-of-type>span").click();

        // Hide collection columns if no user is logged 
        if (!Session.getUsername()) {
            $("p.not-logged-in").show();
        }
    }, (xhr, status, error) => {
        if (xhr.responseJSON && xhr.responseJSON.status === 413) {
            $("#results-list p.result-msg").text(`Too many banknotes found:${xhr.responseJSON.description.split(":")[1]}. Refine your search.`);
            $("#results-table>tbody").empty();
            $("#results-table>tfoot>tr").empty();
            $("#results-table").hide();
            listCard.setSubtitle("");
        }
    });
}


function loadResultsTable() {
    // Clean table body and foot
    $("#results-table>tbody").empty();
    $("#results-table>tfoot>tr").empty();

    // Retrieve denominations info in JSON object
    let variantsJSON = JSON.parse($("#results-table").data("value"));

    let record = "";

    for (let variant of variantsJSON) {
        record = `  <tr>
                        <th class="name"><a href="/catalogue/currency/index.html?currencyId=${variant.currencyId}&seriesId=${variant.seriesId}&denomination=${variant.denomination}">${variant.catalogueId}</a></th>
                        <th class="name"><a href="/catalogue/country/index.html?countryId=${variant.territoryId}">${variant.territoryName}</a></th>
                        <th class="name"><a href="/catalogue/currency/index.html?currencyId=${variant.currencyId}">${variant.currencyName}</a></th>
                        <th class="name"><a href="/catalogue/currency/index.html?currencyId=${variant.currencyId}&seriesId=${variant.seriesId}">${variant.seriesName}</a></th>
                        <th>${variant.denomination.toLocaleString("de-DE")}</th>
                        <th>${variant.issueYear}</th>
                        <th>${variant.printedDate || "ND"}</th>
                        <th class="name">${variant.issuer || "-"}</th>
                        <th class="name">${variant.printer || "-"}</th>
                        <th>${variant.width || "-"}</th>
                        <th>${variant.height || "-"}</th>
                        <td class="only-logged-in">${(variant.item) ? variant.item.grade : "-"}</td>
                        <td class="only-logged-in">${(variant.item) ? variant.item.price + ' €' : "-"}</td>
                    </tr>`;
        $("#results-table>tbody").append(record);
    }
}


function sortClick(htmlElem, titleStr) {
    let mapKey = listTableSetSortingColumn(htmlElem);

    // Determine the field name (it might no be the title of the column)
    if (titleStr)
        mapKey = titleStr;

    // Load table body
    // Mapping column name - field name
    let mapFieldName = {
        "Cat. Id": "catalogueId",
        "Territory": "territoryName",
        "Currency": "currencyName",
        "Issue": "seriesName",
        "Denomination": "denomination",
        "Issue Date": "issueYear",
        "Printed Date": "printedDate",
        "Issued by": "issuer",
        "Printer": "printer",
        "Price": "price",
        "Width (mm)": "width",
        "Height (mm)": "height"
    };
    let isCollecBasedSorting = $(htmlElem).text() === "Collect.";
    let sortingField = mapFieldName[mapKey];
    if (isCollecBasedSorting)
        sortingField = "collecStats." + sortingField;

    // Retrieve sorting 
    let sortingAsc = $(".sort-selection").hasClass("sort-asc");

    // Sort
    let sortingFields = [];
    if (sortingField !== "catalogueId") {
        sortingFields.push(sortingField);
        sortingFields.push("catalogueIdPreffix");
        sortingFields.push("catalogueIdInt");
        sortingFields.push("catalogueIdSuffix");
    } else {
        sortingFields.push("catalogueIdPreffix");
        sortingFields.push("catalogueIdInt");
        sortingFields.push("catalogueIdSuffix");
    }

    let variantsJSON = sortJSON(JSON.parse($("#results-table").data("value")), sortingFields, sortingAsc);

    // Store result
    $("#results-table").data("value", JSON.stringify(variantsJSON));

    // Load denominations table body
    loadResultsTable();

    // Save the sorting field so it can be read after re-loading the data
    $("#results-table").data("sorting-field", sortingField);
}