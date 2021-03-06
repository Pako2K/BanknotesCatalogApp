$(window).resize(function() {
    if (window.seriesDropdown)
        window.seriesDropdown.setSize(calcFontSize());
});

function calcFontSize() {
    return ($(window).width() < 420) ? 11 : 14;
}

function initializeDetails() {
    $("#details-main-div>div:not(:first-of-type)").hide();

    // Hide the New Series button
    let flagIsAdminStr = Session.isAdmin();
    if (!flagIsAdminStr || flagIsAdminStr === "0") {
        $(".only-admin").css("opacity", 0.3);
    }

    // Load the series list
    $("div.series-list").empty();
    for (let elem of seriesJSON) {
        let endDate = "";
        if (elem.end == null || elem.end == "")
            endDate = " - present";
        else if (elem.end !== elem.start)
            endDate = " - " + elem.end;

        $("div.series-list").append(`<div data-id='${elem.id}' onclick='seriesOptionClicked(this)'>${elem.name + " [" + elem.start + endDate + "]"}</div>`);
    }

    // In case the user selected a series the option in the navigation will contain a series-id
    let seriesId = $('#currency-views>p').eq(0).data("series-id");

    if (seriesId !== "") {
        $(`div.series-list>div[data-id='${seriesId}']`).click();
    }
}


function seriesOptionClicked(elem) {
    if ($(elem).hasClass("selected")) {
        $("div.series-list>div.selected").removeClass("selected");
        $("#details-main-div>div>img").hide();
        $("#details-main-div>div:not(:first-of-type)").hide();
    } else {
        $("div.series-list>div.selected").removeClass("selected");
        $(elem).addClass("selected");
        $("#details-main-div>div>img").show();

        loadSeriesDetails($(elem).data("id"));

        // Scrolling:
        let seriesElem = $("div.series-info");
        let buttonHeight = $("div.series-options>div.clickable-button").height();
        $("html").animate({
            scrollTop: seriesElem.offset().top - buttonHeight * 1.5
        });

    }
};


function loadSeriesDetails(seriesId, newDenomId) {
    $("#details-main-div>div:not(:first-of-type)").show();

    // Clean-up series info
    $("div.series-info").empty();

    // Clean-up all banknotes
    $("div.banknotes-section").empty();

    asyncGET(`/series/${seriesId}`, (result, status) => {
        // Store series id and name
        $("div.series-info").data("series-id", seriesId);
        $("div.series-info").data("series-name", result[0].name);
        $("div.series-info").data("series-start", result[0].start);
        $("div.series-info").data("series-end", result[0].end);

        // Set series Info
        if (result[0].name) {
            let endDate = "";
            if (result[0].end == null || result[0].end == "")
                endDate = " - present";
            else if (result[0].end !== result[0].start)
                endDate = " - " + result[0].end;
            $("div.series-info").append(`<h5 name="h5name" id="series-name">${result[0].name} [${result[0].start}${endDate}]</h5>`);
        }
        if (result[0].issuerName) {
            $("div.series-info").append(`<p id="series-issuer">Issued by: <span data-id="${result[0].issuerId}">${result[0].issuerName}</span></p>`);
        }
        if (result[0].isOverstamped) {
            $("div.series-info").append(`<p id="series-is-overstamped"><i>Overstamped</i> Series</p>`);
        }
        if (result[0].lawDate) {
            $("div.series-info").append(`<p id="series-law-date"><span>${result[0].lawDate}</span></p>`);
        }
        if (result[0].description) {
            $("div.series-info").append(`<p id="series-description">Description: <span>${result[0].description}</span></p>`);
        }
    });

    // Retrieve and load banknotes and variants info
    let variantsUri;
    let itemsUri;
    if (Session.getUsername())
        itemsUri = `/series/${seriesId}/items`;
    else
        variantsUri = `/series/${seriesId}/variants`;

    asyncGET(variantsUri || itemsUri, (notesJSON, status) => {
                // Currency plural names
                let plurals = [];
                let pluralStrs = [];
                if ($("#currency-name").data("plural"))
                    pluralStrs = $("#currency-name").data("plural").split(',');
                for (let elem of pluralStrs) {
                    let elemItem = elem.split('-');
                    if (elemItem.length === 1)
                        plurals[0] = elemItem[0];
                    else
                        plurals[elem[0]] = elemItem[1];
                }

                // For each banknote
                for (let denom of notesJSON) {
                    // Create section
                    let denomStr = denom.denomination.toLocaleString("de-DE") + ' ';
                    if (denom.denomination != 1)
                        denomStr += plurals[denom.denomination] || plurals[0];
                    else
                        denomStr += $("#currency-name").text();
                    let faceValueStr;
                    if (denom.faceValue) {
                        faceValueStr = denom.faceValue.toLocaleString("de-DE") + ' ';
                        if (denom.faceValue != 1) {
                            let unit = $("#currency-subunit").data("units").find((unit) => { return unit.id === denom.unitId });
                            faceValueStr += unit.namePlural;
                        } else
                            faceValueStr += denom.unitName;
                    }
                    let sizeElemStr = denom.width && denom.height ?
                        `${denom.width}mm X ${denom.height}mm` : "";

                    let tags = denom.obverseTags ? `[<span>${denom.obverseTags}</span>] - ` : "";
                    let obverseElem = denom.obverseDescription ?
                        `<p>Obverse: ${tags}<span>${denom.obverseDescription}</span></p>` : "";
                    tags = denom.reverseTags ? `[<span>${denom.reverseTags}</span>] - ` : "";
                    let reverseElem = denom.reverseDescription ?
                        `<p>Reverse: ${tags}<span>${denom.reverseDescription}</span></p>` : "";

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

                            itemsBoxHTML = `<div class="item-add-box" data-variant='${variantStr}'>
                                                <div class="clickable-button" onclick='openUpsertCollectionFromDetails(this, "${denomStr}")'>
                                                    <div>
                                                        <img src="./details/add-black.png" alt="Add new item"/>
                                                        <p>Add to Collection</p>
                                                    </div>
                                                </div>
                                            </div>`;
                        }

                        let overstampedNote;
                        if (variant.overstampedCatalogueId)
                            overstampedNote = `${variant.overstampedCatalogueId} (${variant.overstampedTerritoryName})`;



                        variantsHTML +=
                            `<div class="variant-box section-title">
                                        <p>${dateStr} ${variant.catalogueId === "NA" ? "" : " &#9654 " + variant.catalogueId}</p>
                                        <img class="only-admin sqr-button clickable-button" src="./details/edit.png" onclick='openUpsertVariant(${denom.id}, "${denomStr.replace("'", "\\'")}${faceValueStr ? " [ " + faceValueStr + " ]": ""}", ${variant.id})' alt="Edit Variant"/>
                                        
                                                                              
                                        <div class="variant-pictures">
                                            <img src="" alt="obverse" onerror="this.style.display='none'"/>
                                            <img src="" alt="reverse" onerror="this.style.display='none'"/>
                                            <img src="" alt="variant feature" onerror="this.style.display='none'"/>
                                            
                                        </div> 
                                        <div class="variant-info">
                                            ${addInfo("Obverse Color", variant.obverseColor)}
                                            ${addInfo("Reverse Color", variant.reverseColor)}
                                            ${addInfo("Overstamped note", overstampedNote)}
                                            ${addInfo("Printer", variant.printerName)}
                                            ${addInfo("Signature", variant.signature)}
                                            ${addInfo("Additional Signature", variant.signatureExt)}
                                            ${addInfo("Watermark", variant.watermark)}
                                            ${addInfo("Security Thread", variant.securityThread)}
                                            ${addInfo("Additional Security", variant.securityExt)}
                                            ${addInfo("Mintage", variant.mintage ? variant.mintage.toLocaleString("de-DE"): null)}
                                            ${addInfoBoolean("Not Issued", variant.notIssued)}
                                            ${addInfoBoolean("Replacement", variant.isReplacement)}
                                            ${addInfoBoolean("Specimen", variant.isSpecimen)}
                                            ${addInfoBoolean("Error Note", variant.isError)}
                                            ${addInfoBoolean("Commemorative", variant.isCommemorative)}
                                            ${addInfoBoolean("Numismatic Product", variant.isNumismaticProduct)}
                                            ${addInfo("Description", variant.variantDescription)}
                                        </div>
                                        ${itemsBoxHTML}
                                    </div>`;
                    }

                    let banknotesSection = $("div.banknotes-section");
                    banknotesSection.append(
                            `<div class="banknote-section" id="banknote-id-${denom.denomination}">
                        <div class="banknote-title section-title">
                            <p>${faceValueStr ? faceValueStr + " [ " + denomStr + " ]": denomStr}</p>
                            <img class="only-admin sqr-button clickable-button" src="./details/edit.png" onclick="openUpsertDenomination($(this).parent().parent().data('denomination'))" alt="Edit Denomination"/>
                        </div>
                        <div class="banknote-info">
                            <div>
                                ${(denom.materialId != null && denom.materialId !== "") ? `<p>Material: <span data-id="${denom.materialId}">${denom.materialName || ""}</span></p>` :  "" }
                                ${addInfo("Size", sizeElemStr)}
                                ${obverseElem}
                                ${reverseElem}
                                ${addInfo("Description", denom.description)}
                            </div>
                        </div>
                        <div class="variants-section">
                            ${variantsHTML}
                            <div id="denom-id-${denom.id}" class="variant-add-box only-admin" >
                                <div class="clickable-button" onclick="openUpsertVariant(${denom.id}, '${denomStr.replace("'", "\\'")}${faceValueStr ? " [ " + faceValueStr + " ]": ""}')">
                                    <div>
                                        <img src="./details/add-blue.png" alt="Add variant"/>
                                        <p>New Variant</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>`);
                   
                banknotesSection.children().last().data("denomination", denom);
            }

            let flagIsAdminStr = Session.isAdmin();
            if (!flagIsAdminStr || flagIsAdminStr === "0") {
                //$(".only-admin").hide();
                $(".only-admin").css("opacity", 0.3);
            }

            // In case the user selected a specific banknote the option in the navigation will contain a "denomination"
            let denomination = $('#currency-views>p').eq(0).data("denomination");
            if (denomination !== "") {
                // Scrolling:
                let denomSection = $(`#banknote-id-${denomination}`);
                if (denomSection) {
                    $("html").animate({
                        scrollTop: denomSection.offset().top
                    });
                }

                // Remove the denomination
                $('#currency-views>p').eq(0).data("denomination", "");
            }

            // In case a new banknote (Denomination) was create open automatically the new variant form
            if(newDenomId)
                $(`#denom-id-${newDenomId} div.clickable-button`).click();
        });
}


function openUpsertCollectionFromDetails(imgElem, denomStr) {
    if (Session.getUsername()){
        let variantJSON = $(imgElem).parent().data("variant");
        variantJSON.denominationStr = denomStr;

        let gradesJSON = $("#grades-coding").data("grades");
        let seriesId = $("div.series-info").data("series-id");

        new UpsertCollectionForm(variantJSON, gradesJSON, ()=>{loadSeriesDetails(seriesId)});
    }
    else
        alert("You must log in to add this note to your collection.");
}


function openUpsertSeries(isNewSeries) {
    let flagIsAdminStr = Session.isAdmin();
    if (!flagIsAdminStr || flagIsAdminStr === "0") {
        alert("Only Collaborators can edit the catalogue.\nContact banknotes-catalogue@gmx.net to request a Collaborator account.");
        return;
    }

    let currencyIdParam = window.location.search.split("?")[1].split("&")[0];
    if (currencyIdParam.split("=")[0] !== "currencyId")
        return;

    let currencyJSON = { id: currencyIdParam.split("=")[1], name: $("#currency-name").text(), territoryId: territoryId };
    let thisSeriesJSON = isNewSeries ? undefined : {
        id: $("div.series-info").data("series-id"),
        name: $("div.series-info").data("series-name"),
        start: $("div.series-info").data("series-start"),
        end: $("div.series-info").data("series-end"),
        isOverstamped: $("div.series-info #series-is-overstamped").length,
        issuerId: $("div.series-info #series-issuer>span").data("id"),
        lawDate: $("div.series-info #series-law-date>span").text(),
        description: $("div.series-info #series-description>span").text()
    };

    new UpsertIssueForm(currencyJSON, thisSeriesJSON, (newIssue)=>{
        if (!thisSeriesJSON){
            seriesJSON.push(newIssue);
            seriesJSON.sort((a,b)=>{return a.start-b.start;});
        }
        else{
            //Search the updated series and replace it
            let idx = seriesJSON.findIndex((val)=>{
                return val.id === newIssue.id;
            });
            seriesJSON.splice(idx,1,newIssue);
        }
        $('#currency-views>p').eq(0).data("series-id", newIssue.id);
        initializeDetails(); 
    });
}


function openUpsertDenomination(denom) {
    let flagIsAdminStr = Session.isAdmin();
    if (!flagIsAdminStr || flagIsAdminStr === "0") {
        alert("Only Collaborators can edit the catalogue.\nContact banknotes-catalogue@gmx.net to request a Collaborator account.");
        return;
    }
    let seriesJSON = { id: $("div.series-info").data("series-id"), name: $("div.series-info").data("series-name"), isOverstamped: $("div.series-info #series-is-overstamped").length };
    let currencyJSON = { id: $("#currency-name").data("id"), name: $("#currency-name").text(), units: $("#currency-subunit").data("units") };

    new UpsertDenominationForm(currencyJSON, seriesJSON, denom, (newDenomId)=>{loadSeriesDetails(seriesJSON.id, newDenomId)});
}



function openUpsertVariant(banknoteId, banknoteDenomination, variantId) {
    let flagIsAdminStr = Session.isAdmin();
    if (!flagIsAdminStr || flagIsAdminStr === "0") {
        alert("Only Collaborators can edit the catalogue.\nContact banknotes-catalogue@gmx.net to request a Collaborator account.");
        return;
    }
    let seriesId = $("div.series-info").data("series-id");
    let isOverstamped = $("div.series-info #series-is-overstamped").length;
    let territory = {id: territoryId, name:$("#country-name").text()};

    new UpsertVariantForm(territory, isOverstamped, banknoteId, banknoteDenomination, variantId, ()=>{loadSeriesDetails(seriesId)});
}



function addInfo(title, value) {
    if (value != null && value !== "") {
        return `<p>${title}: <span>${value}</span></p>`;
    } else {
        return "";
    }
}


function addInfoBoolean(title, value) {
    if (value) {
        return `<p class="boolean">${title}</p>`;
    } else {
        return "";
    }
}




// function dropHandler(ev) {
//     // Prevent default behavior (Prevent file from being opened)
//     ev.preventDefault();
    
  
//     if (ev.dataTransfer.items) {
//       // Use DataTransferItemList interface to access the file(s)
//       for (var i = 0; i < ev.dataTransfer.items.length; i++) {
//         // If dropped items aren't files, reject them
//         if (ev.dataTransfer.items[i].kind === 'file') {
//           var file = ev.dataTransfer.items[i].getAsFile();
//           console.log('... file[' + i + '].name = ' + file.name);
//         }
//         else{
//             console.log('NO FILE!');
//             break;
//         }
//       }
//     } else {
//       // Use DataTransfer interface to access the file(s)
//       for (var i = 0; i < ev.dataTransfer.files.length; i++) {
//         console.log('... file[' + i + '].name = ' + ev.dataTransfer.files[i].name);
//       }
//     }

//     ev.target.style.outline = "none";
//     ev.target.style.color = "grey";
// }


// function dragOverHandler(ev) {
//     if (ev.target.className === "drop-area"){
//         ev.target.style.outline = "2px dotted grey";
//         ev.target.style.color = "black";
//     }

//     // Prevent default behavior (Prevent file from being opened)
//     ev.preventDefault();
//   }

// function dragLeaveHandler(ev){
//     if (ev.fromElement.parentElement.className !== "drop-area"){
//         ev.target.style.outline = "none";
//         ev.target.style.color = "grey";
//     }

//     // Prevent default behavior (Prevent file from being opened)
//     ev.preventDefault();
// }