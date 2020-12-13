function loadListTable(countryId, currenciesJSON) {
    // Get banknotes info for all the currencies
    let notesArray = [];
    let numReplies = 0;
    for (let idx in currenciesJSON) {
        let variantsUri;
        let itemsUri;
        if (Session.getUsername())
            itemsUri = `/currency/${currenciesJSON[idx].id}/items?territoryId=${countryId}`;
        else
            variantsUri = `/currency/${currenciesJSON[idx].id}/variants?territoryId=${countryId}`;

        notesArray.push({});
        $.ajax({
            type: "GET",
            url: variantsUri || itemsUri,
            async: true,
            cache: false,
            timeout: TIMEOUT,
            dataType: 'json',

            success: function(notesJSON, status) {
                numReplies++;
                notesArray[idx] = notesJSON;
                notesArray[idx].currencyId = currenciesJSON[idx].id;
                notesArray[idx].currencyName = currenciesJSON[idx].name + (currenciesJSON[idx].iso3 ? ` (${currenciesJSON[idx].iso3})` : "");
                if (numReplies === currenciesJSON.length) {
                    // Create a flat JSON array 
                    let notesList = [];
                    for (let currency of notesArray) {
                        for (let denomination of currency) {
                            for (let variant of denomination.variants) {
                                let record = {};
                                record.id = variant.id;
                                record.catalogueId = variant.catalogueId;
                                record.denomination = denomination.denomination;
                                record.printedDate = variant.printedDate;
                                record.issueYear = variant.issueYear;
                                record.notIssued = variant.notIssued;
                                record.currencyName = currency.currencyName;
                                record.width = denomination.width;
                                record.height = denomination.height;
                                record.description = variant.variantDescription;
                                record.items = variant.items || [];
                                record.sortingQuantity = record.items[0] ? parseFloat(record.items[0].quantity) : -1;
                                record.sortingPrice = record.items[0] ? parseFloat(record.items[0].price) : -1;
                                record.sortingPurchaseDate = record.items[0] ? record.items[0].purchaseDate : "";

                                // Parse the catalogue id in order to be able to sort
                                let parseCatId = parseCatalogueId(record.catalogueId);
                                record.catalogueIdPreffix = parseCatId.catalogueIdPreffix;
                                record.catalogueIdInt = parseCatId.catalogueIdInt;
                                record.catalogueIdSuffix = parseCatId.catalogueIdSuffix;

                                notesList.push(record);
                            }
                        }
                    }
                    // Store list:
                    $("#list-table-div").data("notes-list", JSON.stringify(notesList));
                    // And draw it
                    $("#list-table-div>table").find(".sort-selection").removeClass("sort-selection");
                    $("#list-table-div>table").find(".sorting-column").removeClass("sorting-column");
                    $("span.default-sort").click();
                }
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
                        location.reload();
                }
            }
        });
    }
}



function drawList(notesList, sortKey, sortAsc) {
    $("#list-table-div>table>tbody").empty();

    sortJSON(notesList, sortKey, sortAsc);

    let rowsHTML = "";
    let existsNotIssued = false;
    for (let record of notesList) {
        let variantStr = JSON.stringify(record);
        variantStr = variantStr.replace(/'/g, "&#39");
        let rowspan = 1;
        let thGradeClass = "th-NO-GRADE";
        let gradeClass = "";
        if (record.items && record.items.length) {
            rowspan = record.items.length;
            gradeClass = `${record.items[0].grade}-grade`;
            thGradeClass = gradeClass;
        }

        if (record.notIssued)
            existsNotIssued = true;

        rowsHTML += `<tr class="first-subrow" data-variant='${variantStr}' onclick="openUpsertCollectionFromList(this)">
                        <th class="${thGradeClass} ${record.notIssued?'not-issued':''}" rowspan=${rowspan}>${record.catalogueId}${record.notIssued?"(*)":""}</th>
                        <th class="${thGradeClass}" rowspan=${rowspan}>${record.denomination.toLocaleString("de-DE")}</th>
                        <td rowspan=${rowspan} class="${gradeClass} text">${record.currencyName}</td>
                        <td class="${gradeClass}" rowspan=${rowspan}>${record.issueYear}</td>
                        <td class="${gradeClass}" rowspan=${rowspan}>${record.printedDate || "ND"}</td>
                        <td class="${gradeClass}" rowspan=${rowspan}>${record.width || "-"}</td>
                        <td class="${gradeClass}" rowspan=${rowspan}>${record.height || "-"}</td>
                        <td rowspan=${rowspan} class="${gradeClass} text">${record.description || ""}</td>`;
        if (record.items && record.items.length) {
            rowsHTML += `<td class="collection-field first ${gradeClass}">${record.items[0].quantity}</td>
                        <td class="collection-field ${gradeClass}">${record.items[0].grade}</td>
                        <td class="collection-field ${gradeClass}">${record.items[0].price + " €"}</td>
                        <td class="text collection-field ${gradeClass}">${record.items[0].seller || ""}</td>
                        <td class="collection-field ${gradeClass}">${record.items[0].purchaseDate || ""}</td>
                        <td class="text collection-field ${gradeClass}">${record.items[0].description || ""}</td>
                    </tr>`;

            for (let i = 1; i < record.items.length; i++) {
                gradeClass = `${record.items[i].grade}-grade`;
                rowsHTML += `<tr onclick="openUpsertCollectionFromList(this)">
                            <td class="collection-field first ${gradeClass}">${record.items[i].quantity}</td>
                            <td class="collection-field ${gradeClass}">${record.items[i].grade}</td>
                            <td class="collection-field ${gradeClass}">${record.items[i].price + " €"}</td>
                            <td class="text collection-field ${gradeClass}">${record.items[i].seller || ""}</td>
                            <td class="collection-field ${gradeClass}">${record.items[i].purchaseDate || ""}</td>
                            <td class="text collection-field ${gradeClass}">${record.items[i].description || ""}</td>
                        </tr>`;
            }
        } else {
            rowsHTML += `<td class="collection-field first">0</td>
                        <td class="collection-field">-</td>
                        <td class="collection-field">-</td>
                        <td class="text collection-field"></td>
                        <td class="collection-field"></td>
                        <td class="text collection-field"></td>
                    </tr>`;
        }
    }

    $("#list-table-div>table>tbody").append(rowsHTML);

    if (existsNotIssued)
        $("#list-table-div").append("<p class='not-issued'>(*) NOT ISSUED</p>");


    if (!Session.getUsername()) {
        $(".collection-field").css('opacity', '0.25');
    }
}


function sortClick(htmlElem) {
    let sortObj = listTableSetSortingColumn(htmlElem);

    // Load table body
    // Mapping column name - field name
    let mapFieldName = {
        "Cat. Id": ["catalogueIdPreffix", "catalogueIdInt", "catalogueIdSuffix"],
        "Currency": ["currencyName", "catalogueIdPreffix", "catalogueIdInt", "catalogueIdSuffix"],
        "Denom.": ["denomination", "issueYear", "catalogueIdInt"],
        "Issue Year": ["issueYear", "catalogueIdInt"],
        "Printed Date": ["printedDate", "issueYear", "catalogueIdInt"],
        "Width": ["width", "issueYear"],
        "Height": ["height", "issueYear"],
        "Printer": ["printer", "issueYear"],
        "Qty.": ["sortingQuantity", "issueYear"],
        "Price": ["sortingPrice", "issueYear"],
        "Purchased": ["sortingPurchaseDate", "issueYear"]
    };

    drawList(JSON.parse($("#list-table-div").data("notes-list")), mapFieldName[sortObj.mapKey], sortObj.sortAsc);
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


function openUpsertCollectionFromList(rowElem) {
    if (Session.getUsername()) {
        let variantJSON;

        if ($(rowElem).hasClass("first-subrow"))
            variantJSON = $(rowElem).data("variant");
        else {
            let prevRow = $(rowElem).prev();
            while (!$(prevRow).hasClass("first-subrow"))
                prevRow = prevRow.prev();
            variantJSON = $(prevRow).data("variant");
        }

        variantJSON.denominationStr = variantJSON.denomination + " " + variantJSON.currencyName;

        let gradesJSON = $("#grades-coding").data("grades");
        let seriesId = $("section.series-detail-section").data("series-id");

        $("div.modal-form-placeholder").load("/catalogue/currency/forms/collection/__collection.html", () => { initializeUpsertCollection(seriesId, variantJSON, gradesJSON) });
        $("div.modal-form-placeholder").show();

    } else
        alert("Please log in to add this note to your collection.");
}