"use strict"

$(document).ready(() => {
    // Add slide buttons
    addSlideButton("only-duplicates-filter", false, (id, onFlag) => {
        if (onFlag && isSlideButtonSelected("exclude-duplicates-filter")) {
            $("#exclude-duplicates-filter").click();
        } else
            loadItemsTable();
    });

    // Add slide buttons
    addSlideButton("exclude-duplicates-filter", false, (id, onFlag) => {
        if (onFlag && isSlideButtonSelected("only-duplicates-filter")) {
            $("#only-duplicates-filter").click();
        } else
            loadItemsTable();
    });

    if (!getCookie("banknotes.ODB.username")) {
        // Show warning
        $("p.not-logged-in").show();

        return;
    }

    // Retrieve collection data
    $.ajax({
        type: "GET",
        url: "/items/all",
        async: true,
        cache: false,
        timeout: 5000,
        dataType: 'json',

        success: function(itemsJSON, status) {
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
});



function loadItemsTable(sortKey, sortAsc) {
    $("#items-table>tbody").empty();

    let itemsJSON = JSON.parse($("#items-table").data("value"));
    if (sortKey) {
        sortJSON(itemsJSON, sortKey, sortAsc);
        $("#items-table").data("value", JSON.stringify(itemsJSON));
    }

    let rowsHTML = "";
    for (let record of itemsJSON) {
        // Apply filters
        if (isSlideButtonSelected("only-duplicates-filter")) {
            if (!record.isDuplicated && record.quantity === 1) continue;
            if (record.quantity > 1) record.quantity--;
        } else {
            if (isSlideButtonSelected("exclude-duplicates-filter")) {
                if (record.isDuplicated) continue;
                record.quantity = 1;
            }
        }

        let gradeClass = `${record.grade}-grade`;
        rowsHTML += `<tr>
                        <th class="text ${gradeClass}"><a href="/_country/index.html?countryId=${record.territoryId}">${record.territoryName}</a></th>
                        <td class="${gradeClass}">${record.denomination.toLocaleString("de-DE")}</th>
                        <th class="${gradeClass}"><a href="/_currency/index.html?currencyId=${record.currencyId}">${record.currencyName}</a></th>
                        <td class="${gradeClass}">${record.catalogueId}</th>
                        <td class="${gradeClass}">${record.grade}</td>
                        <td class="${gradeClass}">${record.price + " €"}</td>
                        <td class="${gradeClass}">${record.quantity}</td>
                        <td class="text ${gradeClass}">${record.seller || ""}</td>
                        <td class="${gradeClass}">${record.purchaseDate || ""}</td>
                        <td class="text ${gradeClass}">${record.description || ""}</td>
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