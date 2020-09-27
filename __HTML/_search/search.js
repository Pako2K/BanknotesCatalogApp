"use strict"

function loadContinents(filterObj) {
    // Load continents from db 
    $.ajax({
        type: "GET",
        url: `/continents`,
        async: true,
        cache: true,
        timeout: 5000,
        dataType: 'json',

        success: function(result, status) {
            for (let cont of result) {
                filterObj.addOption(cont.id, cont.name)
            }
        },
        error: function(xhr, status, error) {
            alert(`Query failed. \n${status} - ${error}\nPlease contact the web site administrator.`);
            window.location.pathname = "/";
        }
    });
}

function loadTerritoryTypes(filterObj) {
    // Load Country types synchronously, before anything else
    let terTypesJSON;
    $.ajax({
        type: "GET",
        url: `/territory-types`,
        async: true,
        cache: true,
        timeout: 5000,
        dataType: 'json',
        success: function(result, status) {
            for (let type of result) {
                filterObj.addOption(type.id, type.name)
            }
        },
        error: function(xhr, status, error) {
            alert(`Query failed. \n${status} - ${error}\nPlease contact the web site administrator.`);
        }
    });
}

$(document).ready(() => {
    let filters = {
        continent: "",
        territory: { type: "", foundedFrom: "", foundedTo: "", disappearedFrom: "", disappearedTo: "" },
        currency: { createdFrom: "", createdTo: "", replacedFrom: "", replacedTo: "" },
        banknote: { denominationMin: "", denominationMax: "", issuedateFrom: "", issuedateTo: "" },
    };

    $(".filters-section").data("filters", JSON.stringify(filters));
});

$(window).resize(function() {
    let fontSize = calcFontSize();
    for (let filter of window.filters) {
        filter.setSize(fontSize);
    }
});

function calcFontSize() {
    if ($(window).width() < 420) return 11;
    else return 14;
}


function territoryFilterChanged(filterName, from, to) {
    // Store new value in the list of filters
    let filters = JSON.parse($(".filters-section").data("filters"));
    if (filterName === "Founded") {
        filters.territory.foundedFrom = from || "";
        filters.territory.foundedTo = to || "";
    } else {
        filters.territory.disappearedFrom = from || "";
        filters.territory.disappearedTo = to || "";
    }

    $(".filters-section").data("filters", JSON.stringify(filters));
    callVariantsAPI(filters);
}

function currencyFilterChanged(filterName, from, to) {
    // Store new value in the list of filters
    let filters = JSON.parse($(".filters-section").data("filters"));
    if (filterName === "Created") {
        filters.currency.createdFrom = from || "";
        filters.currency.createdTo = to || "";
    } else {
        filters.currency.replacedFrom = from || "";
        filters.currency.replacedTo = to || "";
    }

    $(".filters-section").data("filters", JSON.stringify(filters));
    callVariantsAPI(filters);
}

function banknoteFilterChanged(filterName, from, to) {
    // Store new value in the list of filters
    let filters = JSON.parse($(".filters-section").data("filters"));
    if (filterName === "Denomination") {
        filters.banknote.denominationMin = from || "";
        filters.banknote.denominationMax = to || "";
    } else {
        filters.banknote.issuedateFrom = from || "";
        filters.banknote.issuedateTo = to || "";
    }

    $(".filters-section").data("filters", JSON.stringify(filters));
    callVariantsAPI(filters);
}

function selectFilterChanged(filterName, id, value) {
    // Store new value in the list of filters
    let filters = JSON.parse($(".filters-section").data("filters"));
    if (filterName === "Continent")
        filters.continent = id || "";
    else
        filters.territory.type = id || "";

    $(".filters-section").data("filters", JSON.stringify(filters));
    callVariantsAPI(filters);
}

function callVariantsAPI(filters) {
    // Build query string
    let queryStr = "";
    queryStr += "continentId=" + filters.continent + "&terTypeId=" + filters.territory.type +
        "&terStartDateFrom=" + filters.territory.foundedFrom + "&terStartDateTo=" + filters.territory.foundedTo +
        "&terEndDateFrom=" + filters.territory.disappearedFrom + "&terEndDateTo=" + filters.territory.disappearedTo +
        "&curStartDateFrom=" + filters.currency.createdFrom + "&curStartDateTo=" + filters.currency.createdTo +
        "&curEndDateFrom=" + filters.currency.replacedFrom + "&curEndDateTo=" + filters.currency.replacedTo +
        "&minDenom=" + filters.banknote.denominationMin + "&maxDenom=" + filters.banknote.denominationMax +
        "&issueYearFrom=" + filters.banknote.issuedateFrom + "&issueYearTo=" + filters.banknote.issuedateTo;

    // Get variants
    $("#results-section").removeClass("success");
    $("#results-section").removeClass("not-found");
    $("#results-section").removeClass("too-many-results");

    let urlStr = `/variants?${queryStr}`
    if (getCookie("banknotes.ODB.username"))
        urlStr = `/items?${queryStr}`

    $.ajax({
        type: "GET",
        url: urlStr,
        async: true,
        cache: false,
        timeout: 5000,
        dataType: 'json',

        success: function(variantsJSON, status) {
            if (variantsJSON.length === 0) {
                $("#results-section").addClass("not-found");
                return;
            }
            $("#results-section").addClass("success");

            for (let row of variantsJSON) {
                // Parse the catalogue id in order to be able to sort
                row.catalogueIdInt = parseInt(row.catalogueId.slice(2));
                row.catalogueIdSuffix = row.catalogueId.slice(2 + row.catalogueIdInt.toString().length);
                row.grade = row.grade || "-";
                row.price = row.price || 0;
            }

            $("#results-table").data("value", JSON.stringify(variantsJSON));

            // Sort by the first column
            $("#results-table th:first-of-type>span").click();
        },
        error: function(xhr, status, error) {
            if (xhr.responseJSON) {
                switch (xhr.responseJSON.status) {
                    case 400:
                        break;
                    case 413:
                        $("#results-section").addClass("too-many-results");
                        $("#results-section>p>span").text(xhr.responseJSON.description.split(":")[1]);
                        break;
                    default:
                        alert(`Query failed. \n${status} - ${error}\nPlease contact the web site administrator.`);
                }
            } else {
                alert(`Query failed. \n${status} - ${error}\nPlease contact the web site administrator.`);
            }

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
                        <th class="name"><a href="/_currency/index.html?currencyId=${variant.currencyId}&seriesId=${variant.seriesId}&denomination=${variant.denomination}">${variant.catalogueId}</a></th>
                        <th class="name"><a href="/_country/index.html?countryId=${variant.territoryId}">${variant.territoryName}</a></th>
                        <th class="name"><a href="/_currency/index.html?currencyId=${variant.currencyId}">${variant.currencyName}</a></th>
                        <th class="name"><a href="/_currency/index.html?currencyId=${variant.currencyId}&seriesId=${variant.seriesId}">${variant.seriesName}</a></th>
                        <th>${variant.denomination.toLocaleString("de-DE")}</th>
                        <th>${variant.issueYear}</th>
                        <th>${variant.printedDate || "ND"}</th>
                        <th>${variant.issuer || "-"}</th>
                        <th>${variant.printer || "-"}</th>
                        <th>${variant.width || "-"}</th>
                        <th>${variant.height || "-"}</th>
                        <th>${variant.mintage || "-"}</th>
                        <td class="only-logged-in">${(variant.item) ? variant.item.grade : "-"}</td>
                        <td class="only-logged-in">${(variant.item) ? variant.item.price.toFixed(2) + ' €' : "-"}</td>
                    </tr>`;
        $("#results-table>tbody").append(record);
    }

    // Hide collection columns if no user is logged 
    if (!getCookie("banknotes.ODB.username")) {
        $(".only-logged-in").css('opacity', '0.25');
        // Show warning
        $("p.not-logged-in").show();
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
        "Catalogue Id": "catalogueIdInt",
        "Territory": "territoryName",
        "Currency": "currencyName",
        "Series": "seriesName",
        "Denomination": "denomination",
        "Issue Date": "issueYear",
        "Printed Date": "printedDate",
        "Issued by": "issuer",
        "Printer": "printer",
        "Price": "price",
        "Width (mm)": "width",
        "Height (mm)": "height",
        "Mintage": "mintage"
    };
    let isCollecBasedSorting = $(htmlElem).text() === "Collect.";
    let sortingField = mapFieldName[mapKey];
    if (isCollecBasedSorting)
        sortingField = "collecStats." + sortingField;

    // Retrieve sorting 
    let sortingAsc = $(".sort-selection").hasClass("sort-asc");

    // Sort
    let sortingFields = [sortingField];
    if (sortingField !== "catalogueIdInt")
        sortingFields.push("catalogueIdInt");

    let variantsJSON = sortJSON(JSON.parse($("#results-table").data("value")), sortingFields, sortingAsc);

    // Store result
    $("#results-table").data("value", JSON.stringify(variantsJSON));

    // Load denominations table body
    loadResultsTable();

    // Save the sorting field so it can be read after re-loading the data
    $("#results-table").data("sorting-field", sortingField);
}