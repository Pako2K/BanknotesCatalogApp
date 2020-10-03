function initializeList() {
    let seriesJSON = JSON.parse($(document).data("series-summary"));

    $("#grades-div").hide();

    if (seriesJSON.length === 0) {
        $("#timeline-main-div").append('<p>There is no data for this currency</p>');
        return;
    }

    // Get banknotes info for all the series
    let notesArray = [];
    let numReplies = 0;
    for (let idx in seriesJSON) {
        let variantsUri;
        let itemsUri;
        if (getCookie("banknotes.ODB.username"))
            itemsUri = `/series/${seriesJSON[idx].id}/items`;
        else
            variantsUri = `/series/${seriesJSON[idx].id}/variants`;

        notesArray.push({});
        $.ajax({
            type: "GET",
            url: variantsUri || itemsUri,
            async: true,
            cache: false,
            timeout: 5000,
            dataType: 'json',

            success: function(notesJSON, status) {
                numReplies++;
                notesArray[idx] = notesJSON;
                notesArray[idx].seriesId = seriesJSON[idx].id
                notesArray[idx].seriesName = seriesJSON[idx].name
                if (numReplies === seriesJSON.length) {
                    drawList(notesArray);
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
};


function drawList(notesArray) {
    $("#list-table-div").empty();

    // Create a flat JSON array and sort by CatalogueId, Issue Date, Printed Date
    let notesList = [];
    for (let series of notesArray) {
        for (let denomination of series) {
            for (let variant of denomination.variants) {
                let record = {};
                record.id = variant.id;
                record.catalogueId = variant.catalogueId;
                record.denomination = denomination.denomination;
                record.printedDate = variant.printedDate;
                record.issueYear = variant.issueYear;
                record.seriesName = series.seriesName;
                record.width = denomination.width;
                record.height = denomination.height;
                record.printer = variant.printerName;
                record.description = variant.variantDescription;
                record.items = variant.items;
                notesList.push(record);
            }
        }
    }

    notesList.sort((a, b) => { return a.issueYear - b.issueYear });

    let rowsHTML = "";
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

        rowsHTML += `<tr class="first-subrow" data-variant='${variantStr}' onclick="openUpsertCollectionFromList(this)">
                        <th class="${thGradeClass}" rowspan=${rowspan}>${record.catalogueId}</th>
                        <th class="${thGradeClass}" rowspan=${rowspan}>${record.denomination.toLocaleString("de-DE")}</th>
                        <td class="${gradeClass}" rowspan=${rowspan}>${record.issueYear}</td>
                        <td class="${gradeClass}" rowspan=${rowspan}>${record.printedDate || "ND"}</td>
                        <td rowspan=${rowspan} class="${gradeClass} text">${record.seriesName}</td>
                        <td class="${gradeClass}" rowspan=${rowspan}>${record.width || "-"}</td>
                        <td class="${gradeClass}" rowspan=${rowspan}>${record.height || "-"}</td>
                        <td rowspan=${rowspan} class="${gradeClass} text">${record.printer || "-"}</td>
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

    $("#list-table-div").append(
        `<table class="notes-list-table">
        <thead>
            <tr>
                <th rowspan=2>Cat. Id</th>
                <th rowspan=2>Denom.</th>
                <th rowspan=2>Issue Year</th>
                <th rowspan=2>Printed Date</th>
                <th rowspan=2>Series</th>
                <th rowspan=2>Width</th>
                <th rowspan=2>Height</th>
                <th rowspan=2>Printer</th>
                <th rowspan=2>Description</th>
                <th colspan=6 class="collection-field">Collection</th>
            </tr>
            <tr>
                <th class="collection-field">Qty.</th>
                <th class="collection-field">Grade</th>
                <th class="collection-field">Price</th>
                <th class="collection-field">Seller</th>
                <th class="collection-field">Purchased</th>
                <th class="collection-field">Notes</th>
            </tr>
        </thead>
        <tbody>
            ${rowsHTML}
        <tbody>
    </table>`);

    if (getCookie("banknotes.ODB.username") === undefined) {
        $(".collection-field").css('opacity', '0.25');
    }
}



function openUpsertCollectionFromList(rowElem) {
    if (getCookie("banknotes.ODB.username")) {
        let variantJSON;

        if ($(rowElem).hasClass("first-subrow"))
            variantJSON = $(rowElem).data("variant");
        else {
            let prevRow = $(rowElem).prev();
            while (!$(prevRow).hasClass("first-subrow"))
                prevRow = prevRow.prev();
            variantJSON = $(prevRow).data("variant");
        }

        variantJSON.denominationStr = variantJSON.denomination + " " + $("#currency-name").text();

        let gradesJSON = $("#grades-div").data("grades");
        let seriesId = $("section.series-detail-section").data("series-id");

        $("div.modal-form-placeholder").load("./forms/collection/__collection.html", () => { initializeUpsertCollection(seriesId, variantJSON, gradesJSON) });
        $("div.modal-form-placeholder").show();

        resetExpiration();
    } else
        alert("Please log in to add this note to your collection.");
}