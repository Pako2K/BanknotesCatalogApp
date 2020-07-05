$(window).resize(function() {
    window.seriesDropdown.setSize(calcFontSize());
});

function calcFontSize() {
    return ($(window).width() < 420) ? 11 : 14;
}

function loadSeries(dropdownElem) {
    $("#details-main-div>div:not(:first-of-type)").hide();
    // Load the drop down list
    let series = JSON.parse($(document).data("series-summary"));

    if (series.length === 0) {
        $("div.drop-down-list").hide();
        return;
    }

    for (let elem of series) {
        let endDate = "";
        if (elem.end != null && elem.end != "" && elem.end !== elem.start)
            endDate = " - " + elem.end;

        dropdownElem.addOption(elem.id, elem.name + ", " + elem.start + endDate);
    }
}

function initializeDetails() {
    // In case the user selected a series the option in the navigation will contain a series-id
    let seriesId = $('#currency-nav>p').eq(1).data("series-id");

    if (seriesId !== "") {
        window.seriesDropdown.setValueById(seriesId);
    }

    $('#currency-nav>p').eq(1).data("series-id", "");
}


function selectSeriesChanged(filterName, id, value) {

    if (!id) {
        $("#details-main-div>div:not(:first-of-type)").hide();
        return;
    }
    loadSeriesDetails(id);
}

function loadSeriesDetails(seriesId) {
    $("#details-main-div>div:not(:first-of-type)").show();

    // Clean-up series info
    $("div.series-info").empty();

    // Clean-up all banknotes
    $("div.banknotes-section").empty();

    $.ajax({
        type: "GET",
        url: `/series/${seriesId}`,
        async: true,
        cache: true,
        timeout: 5000,
        dataType: 'json',
        success: function(result, status) {
            // Store series id and name
            $("div.series-info").data("series-id", seriesId);
            $("div.series-info").data("series-name", result[0].name);

            // Set series Info
            $("div.series-info").append(`<p>Issued by: <span>${result[0].issuer}</span>`);
            if (result[0].lawDate) {
                $("div.series-info").append(`<p><span>${result[0].lawDate}</span></p>`);
            }
            $("div.series-info").append(`<p>Description: <span>${result[0].description}</span>`);
        },
        error: function(xhr, status, error) {
            alert(`Query failed. \n${status} - ${error}\nPlease contact the web site administrator.`);
        }
    });

    // Retrieve and load banknotes and variants info
    let variantsUri;
    let itemsUri;
    if (getCookie("banknotes.ODB.username"))
        itemsUri = `/series/${seriesId}/items`;
    else
        variantsUri = `/series/${seriesId}/variants`;


    $.ajax({
        type: "GET",
        url: variantsUri || itemsUri,
        async: true,
        cache: false,
        timeout: 5000,
        dataType: 'json',

        success: function(notesJSON, status) {
            // For each banknote
            for (let denom of notesJSON) {
                // Create section
                let denomStr = denom.denomination + ' ' + $("#currency-name").text();
                let faceValueStr = denom.faceValue ? `${denom.faceValue} ${denom.unitName}` : "";
                let sizeElemStr = denom.width && denom.height ?
                    `${denom.width}mm X ${denom.height}mm` : "";
                let obverseElem = denom.obverseDescription ?
                    `<p>Obverse: [Tags: <span></span>] - <span>${denom.obverseDescription}</span></p>` : "";
                let reverseElem = denom.reverseDescription ?
                    `<p>Reverse: [Tags: <span></span>] - <span>${denom.reverseDescription}</span></p>` : "";

                // Create variants
                let variantsHTML = "";
                for (let variant of denom.variants) {
                    let dateStr = variant.printedDate ? variant.printedDate : "ND";
                    if (dateStr.indexOf(variant.issueYear) === -1)
                        dateStr += ` (${variant.issueYear})`;

                    let itemsBoxHTML = "";
                    let variantStr = JSON.stringify(variant);
                    variantStr = variantStr.replace(/'/g, "&#39");
                    if (variant.items && variant.items.length) {
                        let itemRows = "";
                        for (let item of variant.items) {
                            itemRows += `<tr class="${item.grade}-grade">
                                            <td>${item.quantity}</td>
                                            <td><b>${item.grade}</b></td>
                                            <td>${item.price + " €"}</td>
                                            <td>${item.purchaseDate || ""}</td>
                                            <td>${item.seller || ""}</td>
                                            <td>${item.description || ""}</td>
                                        </tr>`;
                        }

                        itemsBoxHTML = `<div class="items-info" data-variant='${variantStr}'>
                                            <table>
                                                <thead>
                                                    <tr>
                                                        <th>Qty</th>
                                                        <th>Gr.</th>
                                                        <th>Price</th>
                                                        <th>Pur. Date</th>
                                                        <th>Seller</th>
                                                        <th>Description</th>
                                                    </tr>
                                                </thead>
                                                <thead>
                                                <tbody>
                                                    ${itemRows}
                                                </tbody>
                                            </table>
                                            <img src="./details/edit.png" onclick='openUpsertCollectionFromDetails(this, "${denomStr}")' alt="Edit Items"/>
                                        </div>`;
                    } else {
                        if (itemsUri)
                            itemsBoxHTML = `<div class="item-add-box not-logged-in" data-variant='${variantStr}'>
                                                <div class="clickable-button" onclick='openUpsertCollectionFromDetails(this, "${denomStr}")'>
                                                    <div>
                                                        <img src="./details/add-black.png" alt="Add new item"/>
                                                        <p>Add to Collection</p>
                                                    </div>
                                                </div>
                                            </div>`;
                    }

                    variantsHTML +=
                        `<div class="variant-box section-title">
                            <p>${denomStr}, ${dateStr}, ${variant.catalogueId}</p>
                            <img class="only-admin sqr-button clickable-button" src="./details/edit.png" onclick="openUpsertVariantForUpdate(this, '${denomStr}')" alt="Edit Variant"/>
                            <div class="variant-pictures">
                                <img src="" alt="obverse"/>
                                <img src="" alt="reverse"/>
                                <img src="" alt="variant feature"/>
                            </div> 
                            <div class="variant-info">
                                ${addInfo("Overstamped note", variant.overstampedVariantId)}
                                ${addInfo("Printer", variant.printer)}
                                ${addInfo("Signature", variant.signature)}
                                ${addInfo("Additional Signature", variant.signatureExt)}
                                ${addInfo("Watermark", variant.watermark)}
                                ${addInfo("Security Thread", variant.securityThread)}
                                ${addInfo("Additional Security", variant.securityExt)}
                                ${addInfoBoolean("Replacement", variant.isReplacement)}
                                ${addInfoBoolean("Specimen", variant.isSpecimen)}
                                ${addInfoBoolean("Error Note", variant.isError)}
                                ${addInfoBoolean("Commemorative", variant.isCommemorative)}
                                ${addInfoBoolean("Numismatic Product", variant.isNumismaticsProduct)}
                                ${addInfo("Description", variant.variantDescription)}
                            </div>
                            ${itemsBoxHTML}
                        </div>`;
                }

                let banknotesSection = $("div.banknotes-section");
                banknotesSection.append(
                    `<div class="banknote-section">
                        <div class="banknote-title section-title">
                            <p>${denomStr}</p>
                            <img class="only-admin sqr-button clickable-button" src="./details/edit.png" onclick="openUpsertNoteForUpdate(` + denom.id + `)" alt="Edit Denomination"/>
                        </div>
                        <div class="banknote-info">
                            <div>
                                ${addInfo("Face Value", faceValueStr)}
                                ${addInfo("Material", denom.material)}
                                ${addInfo("Size", sizeElemStr)}
                                ${addInfo("Description", denom.description)}
                            </div>
                            <div>
                                ${obverseElem}
                                ${reverseElem}
                            </div>
                        </div>
                        <div class="variants-section">
                            ${variantsHTML}
                            <div class="variant-add-box only-admin" >
                                <div class="clickable-button" onclick="openUpsertVariantForInsert(${denom.id}, '${denomStr}')">
                                    <div>
                                        <img src="./details/add-blue.png" alt="Add variant"/>
                                        <p>New Variant</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                    </div>`);
            }

            let flagIsAdminStr = getCookie("banknotes.ODB.isAdmin");
            if (!flagIsAdminStr || flagIsAdminStr === "0") {
                $(".only-admin").hide();
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
            }
        }
    });
}


function openUpsertCollectionFromDetails(imgElem, denomStr) {
    let variantJSON = $(imgElem).parent().data("variant");
    variantJSON.denominationStr = denomStr;

    let gradesJSON = $("#grades-div").data("grades");
    let seriesId = $("div.series-info").data("series-id");

    $("div.modal-form-placeholder").load("./collection/__collection.html", () => { initializeUpsertCollection(seriesId, variantJSON, gradesJSON) });
    $("div.modal-form-placeholder").show();
}


function openUpsertDenomination() {
    let seriesJSON = { id: $("div.series-info").data("series-id"), name: $("div.series-info").data("series-name") };
    let currencyJSON = { id: window.location.search.substr("?currencyId=".length), name: $("#currency-name").text(), units: $("#currency-subunit").data("units") };

    $("div.modal-form-placeholder").load("./forms/denomination/__denomination.html", () => { initializeUpsertDenomination(currencyJSON, seriesJSON) });
    $("div.modal-form-placeholder").show();
}
// function openUpsertNoteForInsert() {
//     let seriesId = $("#select-series").val();
//     $('#upsert-note-dialog').data("banknote-id", "");
//     $('#upsert-note-dialog').data("series-id", seriesId);

//     // In case there was an update before:
//     $("#upsert-note-dialog input[name='note-face-value']").removeAttr("disabled");
//     $("#upsert-note-dialog input[name='note-face-value']").attr("required", "");
//     $("#note-units-select").removeAttr("disabled");

//     $('#upsert-note-dialog').show();
// }

// function openUpsertNoteForUpdate(banknoteId) {
//     // Retrieve banknote info
//     // NOTE: The other option would be to store all the info about banknotes and variants in the page!!
//     var xhttp = new XMLHttpRequest();
//     xhttp.onreadystatechange = function() {
//         if (this.readyState === 4 && this.status === 200) {
//             let banknote = JSON.parse(this.responseText);

//             $('#upsert-note-dialog').data("banknote-id", banknoteId);

//             $("#upsert-note-dialog input[name='note-face-value']").val(banknote.faceValue);
//             $("#note-units-select").val(banknote.subunit.id);
//             $("#upsert-note-dialog input[name='note-width']").val(banknote.width);
//             $("#upsert-note-dialog input[name='note-height']").val(banknote.height);
//             $("#upsert-note-dialog input[name='note-material']").val(banknote.material);
//             $("#upsert-note-dialog textarea[name='note-obverse-desc']").val(banknote.obverseDesc);
//             $("#upsert-note-dialog textarea[name='note-reverse-desc']").val(banknote.reverseDesc);
//             $("#upsert-note-dialog textarea[name='note-desc']").val(banknote.notes);

//             $("#upsert-note-dialog input[name='note-face-value']").attr("disabled", "");
//             $("#upsert-note-dialog input[name='note-face-value']").removeAttr("required");
//             $("#note-units-select").attr("disabled", "");

//             $('#upsert-note-dialog').show();
//         }
//     };
//     xhttp.open("GET", "/note?banknoteId=" + banknoteId, true);
//     xhttp.send();
// }


// function openUpsertVariantForInsert(banknoteId, banknoteDenomination) {
//     $('#upsert-variant-dialog').data("variant-id", "");
//     $('#upsert-variant-dialog').data("banknote-id", banknoteId);
//     $('#upsert-variant-dialog form>div').first().children("input").val(banknoteDenomination);

//     $('#upsert-variant-dialog').show();
// }


// function openUpsertVariantForUpdate(elem, variantDenomination) {
//     let variant = $(elem).data("variant");
//     $('#upsert-variant-dialog').data("variant-id", variant.id);
//     $('#note-denomination>input').val(variantDenomination);

//     $("#upsert-variant-dialog input[name='variant-printed-date']").val(variant.printedDate);
//     $("#upsert-variant-dialog input[name='variant-issue-year']").val(variant.issueYear);
//     $("#upsert-variant-dialog input[name='variant-catalogue-id']").val(variant.catId);
//     $("#upsert-variant-dialog input[name='variant-printer']").val(variant.printer);
//     $("#upsert-variant-dialog input[name='variant-signature']").val(variant.signature);
//     $("#upsert-variant-dialog input[name='variant-watermark']").val(variant.watermark);
//     $("#upsert-variant-dialog input[name='variant-security']").val(variant.security);
//     $("#upsert-variant-dialog textarea[name='variant-description']").val(variant.description);

//     $('#upsert-variant-dialog').show();
// }


function addInfo(title, value) {
    if (value != null && value !== "") {
        return `<p>${title}: <span>${value}</span></p>`;
    } else {
        return "";
    }
}


function addInfoBoolean(title, value) {
    if (value === true) {
        return `<p>${title}</p>`;
    } else {
        return "";
    }
}