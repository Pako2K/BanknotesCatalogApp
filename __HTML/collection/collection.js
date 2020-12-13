"use strict"

let onlyDuplicatesBtn;
let noDuplicatesBtn;

$(document).ready(() => {
    // Add slide buttons
    onlyDuplicatesBtn = new SlideButton($(`#only-duplicates-button`), 24, 13, true, duplicatesFilterChanged);
    noDuplicatesBtn = new SlideButton($(`#exclude-duplicates-button`), 24, 13, true, duplicatesFilterChanged);

    if (getCookie(_COOKIE_COLLECTION_FILTER_ONLY_DUPLICATES) == "false") onlyDuplicatesBtn.click();
    if (getCookie(_COOKIE_COLLECTION_FILTER_NO_DUPLICATES) == "false") noDuplicatesBtn.click();

    $("#applied-filters>span.cont-name").text(ContinentsFilter.getSelectedName());

    if (!Session.getUsername()) {
        // Show warning
        $("p.not-logged-in").show();
        return;
    }

    // Retrieve collection data
    asyncGET("/items/all", (itemsJSON, status) => {
        // Parse the catalogue id in order to be able to sort
        for (let record of itemsJSON) {
            let parsedCatId = parseCatalogueId(record.catalogueId)
            record.catalogueIdPreffix = parsedCatId.catalogueIdPreffix;
            record.catalogueIdInt = parsedCatId.catalogueIdInt;
            record.catalogueIdSuffix = parsedCatId.catalogueIdSuffix;
        }

        $("#items-table").data("value", JSON.stringify(itemsJSON));

        // Load countries table body
        $("#items-table span.default-sort").click();
    });

});


function changedContinent(contId, contName) {
    $("#applied-filters>span.cont-name").text(contName);

    // Update page
    if ($("#items-table").data("value"))
        loadItemsTable();
}

function duplicatesFilterChanged(id, state) {
    let text;
    let filtersClass;
    if (id === "only-duplicates-button") {
        setCookie(_COOKIE_COLLECTION_FILTER_ONLY_DUPLICATES, state);
        filtersClass = "only-duplicates";
        text = "Only Duplicates"
    } else {
        setCookie(_COOKIE_COLLECTION_FILTER_NO_DUPLICATES, state);
        filtersClass = "exclude-duplicates";
        text = "Exclude Duplicates"
    }

    if (!state) {
        $(`#applied-filters>span.${filtersClass}`).text(text);
        $(`#applied-filters>span.${filtersClass}`).show();
    } else {
        $(`#applied-filters>span.${filtersClass}`).hide();
    }

    // Get data and reload the tables
    if ($("#items-table").data("value"))
        loadItemsTable();
}

function loadItemsTable(sortKey, sortAsc) {
    $("#items-table>tbody").empty();

    let itemsJSON = JSON.parse($("#items-table").data("value"));
    if (sortKey) {
        sortJSON(itemsJSON, sortKey, sortAsc);
        $("#items-table").data("value", JSON.stringify(itemsJSON));
    } else {
        sortKey = JSON.parse($("#items-table").data("sortKeys"));
        sortAsc = $("#items-table").data("sortAsc");
    }

    let rowsHTML = "";
    let sortingKeyValue = itemsJSON.length ? itemsJSON[0][sortKey[0]] : null;
    let aggregatedPrice = 0;
    let aggregateFlag = sortKey[0] !== "quantity" && sortKey[0] !== "price";

    let filterContId = ContinentsFilter.getSelectedId();

    for (let record of itemsJSON) {

        // Apply filters
        if (filterContId != 0 && record.continentId != filterContId) continue

        if (!onlyDuplicatesBtn.isActive()) {
            if (!record.isDuplicated && record.quantity === 1) continue;
            if (record.quantity > 1) record.quantity--;
        } else {
            if (!noDuplicatesBtn.isActive()) {
                if (record.isDuplicated) continue;
                record.quantity = 1;
            }
        }

        if (aggregateFlag && record[sortKey[0]] !== sortingKeyValue && rowsHTML !== "") {
            rowsHTML += `<tr>
                            <th colspan="9" class="aggregated">Total [${sortingKeyValue || "NA"}]:</th>
                            <td class="aggregated">${aggregatedPrice.toFixed(2) + " €"}</td>
                        </tr>`;
            aggregatedPrice = 0;
        }

        let gradeClass = `${record.grade}-grade`;
        rowsHTML += `<tr>
                        <th class="text ${gradeClass}"><a href="/catalogue/country/index.html?countryId=${record.territoryId}">${record.territoryName}</a></th>
                        <td class="${gradeClass}">${record.denomination.toLocaleString("de-DE")}</th>
                        <th class="${gradeClass}"><a href="/catalogue/currency/index.html?currencyId=${record.currencyId}">${record.currencyName}</a></th>
                        <td class="${gradeClass}">${record.catalogueId}</th>
                        <td class="${gradeClass}">${record.grade}</td>
                        <td class="${gradeClass}">${record.quantity}</td>
                        <td class="text ${gradeClass}">${record.seller || ""}</td>
                        <td class="${gradeClass}">${record.purchaseDate || ""}</td>
                        <td class="text ${gradeClass}">${record.description || ""}</td>
                        <td class="${gradeClass}">${record.price + " €"}</td>
                    </tr>`;

        if (aggregateFlag) {
            sortingKeyValue = record[sortKey[0]];
            aggregatedPrice += record.quantity * record.price;
        }
    }
    if (aggregateFlag && rowsHTML !== "") {
        rowsHTML += `<tr>
                        <th colspan="9" class="aggregated">Total [${sortingKeyValue || "NA"}]:</th>
                        <td class="aggregated">${aggregatedPrice.toFixed(2) + " €"}</td>
                    </tr>`;
    }

    $("#items-table>tbody").append(rowsHTML);
}



function sortClick(htmlElem) {
    let sortObj = listTableSetSortingColumn(htmlElem);

    // Mapping column name - field name
    let mapFieldName = {
        "Territory": ["territoryName", "catalogueIdPreffix", "catalogueIdInt", "catalogueIdSuffix"],
        "Currency": ["currencyName", "territoryName", "catalogueIdPreffix", "catalogueIdInt", "catalogueIdSuffix"],
        "Cat. Id": ["catalogueIdPreffix", "catalogueIdInt", "catalogueIdSuffix"],
        "Denom.": ["denomination", "territoryName", "catalogueIdPreffix", "catalogueIdInt", "catalogueIdSuffix"],
        "Qty.": ["quantity", "territoryName", "catalogueIdPreffix", "catalogueIdInt", "catalogueIdSuffix"],
        "Price": ["price", "territoryName", "catalogueIdPreffix", "catalogueIdInt", "catalogueIdSuffix"],
        "Seller": ["seller", "purchaseDate", "territoryName", "catalogueIdPreffix", "catalogueIdInt", "catalogueIdSuffix"],
        "Purchased": ["purchaseDate", "seller", "territoryName", "catalogueIdPreffix", "catalogueIdInt", "catalogueIdSuffix"]
    };

    $("#items-table").data("sortKeys", JSON.stringify(mapFieldName[sortObj.mapKey]));
    $("#items-table").data("sortAsc", sortObj.sortAsc);

    loadItemsTable(mapFieldName[sortObj.mapKey], sortObj.sortAsc);
}




function listTableSetSortingColumn(sortingElem) {
    let ascDiv = $(sortingElem).parent().children("div").children(".sort-asc");
    let descDiv = $(sortingElem).parent().children("div").children(".sort-desc");
    let titleElem = $(sortingElem).parent().children("span");

    // Select column if it was not selected
    let table = $(titleElem).parents("table"); // This is needed just in case there are more tables in the same page!
    if (!$(titleElem).hasClass("sorting-column")) {
        $(table).find(".sorting-column").removeClass("sorting-column");
        $(titleElem).addClass("sorting-column");
    }

    // Determine ASC or DESC sorting
    let sortAsc = true;
    if ($(ascDiv).hasClass("sort-selection")) {
        $(ascDiv).removeClass("sort-selection");
        $(descDiv).addClass("sort-selection");
        sortAsc = false;
    } else if ($(descDiv).hasClass("sort-selection")) {
        $(descDiv).removeClass("sort-selection");
        $(ascDiv).addClass("sort-selection");
    } else {
        $(table).find(".sort-selection").removeClass("sort-selection");
        $(ascDiv).addClass("sort-selection");
    }

    let result = { mapKey: $(titleElem).text(), sortAsc: sortAsc };
    // Return the text of the sorting column
    return result;
}


function showBlock(elem) {
    if (!$(elem).hasClass("disabled")) {
        $(elem).parent().parent().siblings().show();
        $(elem).siblings(".disabled").removeClass("disabled");
        $(elem).addClass("disabled");
    }

    deleteCookie(_COOKIE_COLLECTION_FILTERS_HIDE);
}

function hideBlock(elem) {
    if (!$(elem).hasClass("disabled")) {
        $(elem).parent().parent().siblings().hide();
        $(elem).siblings(".disabled").removeClass("disabled");
        $(elem).addClass("disabled");
    }
    setCookie(_COOKIE_COLLECTION_FILTERS_HIDE, "");
}