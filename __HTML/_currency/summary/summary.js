function initializeSummary() {
    let seriesJSON = JSON.parse($(document).data("series-summary"));

    // Create one section for each series
    if (seriesJSON.length === 0) {
        $("#grades-div").hide();
        $("#summary-main-div").append('<p>There is no data for this currency</p>');
        return;
    }
    let section = "";
    for (let series of seriesJSON) {
        let endDate = "";
        if (series.end != null && series.end !== "" && series.end !== series.start)
            endDate = " - " + series.end;

        section = ` <section class="series-detail-section" data-series-id="` + series.id + `">
                        <div class="col-expand-contract" onclick="toggleDiv(this)">
                            <img src="summary/plus-expand.png" alt="plus-expand">
                        </div>
                        <div>
                            <h4>${series.name}, ${series.start}${endDate}</h4>
                        </div>
                    </section>`;

        $("#summary-main-div").append(section);
    }

    if (getCookie("banknotes.ODB.username")) {
        // Load grades from DB
        $.ajax({
            type: "GET",
            url: `/grades`,
            async: true,
            cache: true,
            timeout: 5000,
            dataType: 'json',

            success: function(grades, status) {
                // store info so it can be reused in the upsert-collection form
                $("#grades-div").data("grades", grades);

                let gradesHTML = "";
                for (let grade of grades) {
                    gradesHTML += `<p class="${grade.grade}-grade" title="${grade.description}">${grade.name}</p>`;
                }
                $("#grades-div>div").append(gradesHTML);
            },

            error: function(xhr, status, error) {
                alert(`Query failed. \n${status} - ${error}\nPlease contact the web site administrator.`);
            }
        });
    } else {
        $("#grades-div").hide();
    }

    if (seriesJSON.length < 5)
        $("#summary-main-div>section>div.col-expand-contract").click();
};



function toggleDiv(divElem) {
    let chldn = $(divElem).next().children();
    let img = $(divElem).children("img")[0];
    if (img.alt === "plus-expand") {
        if ($(divElem).parent().data("loaded") == null) {
            loadBanknotesInfo($(divElem).parent());
            $(divElem).parent().data("loaded", "");
        }
        $(chldn).filter("table").fadeIn("slow");
        img.alt = "minus-contract";
        img.src = "summary/minus-collapse.png";
    } else {
        $(chldn).filter("table").fadeOut(200);
        img.alt = "plus-expand";
        img.src = "summary/plus-expand.png";
    }
}

// Reload Banknotes info when items are updated
function reloadBanknotesInfo(seriesId) {
    let seriesSection = $(`section.series-detail-section[data-series-id="${seriesId}"`);

    loadBanknotesInfo(seriesSection);
}


// Load Banknotes info when a section is expanded
function loadBanknotesInfo(seriesSection) {
    let seriesId = $(seriesSection).data("series-id");

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
            // Clean-up table
            $(seriesSection).find("table.summary-table").remove();

            // Collect all the different "Issue Years"
            let issueYears = []; // "Columns": 1 columns for each issue year
            let rowIndex = []; // One for each column: to be used later to insert the values of each variant
            for (let denom of notesJSON) {
                for (let variant of denom.variants) {
                    if (issueYears.indexOf(variant.issueYear) === -1) {
                        issueYears.push(variant.issueYear);
                        rowIndex.push(0);
                    }
                }
            }
            issueYears.sort();

            // Group Variants per issueYear 
            let newTableJSON = [];
            for (let denom of notesJSON) {
                let years = [];
                let yearObj = {};
                for (let variant of denom.variants) {
                    if (yearObj.issueYear !== variant.issueYear) {
                        if (yearObj.issueYear) {
                            years.push(yearObj);
                        }
                        yearObj = {};
                        yearObj.issueYear = variant.issueYear;
                        yearObj.variants = [];
                    }
                    delete variant.issueYear;
                    yearObj.variants.push(variant);
                }
                years.push(yearObj);
                newTableJSON.push({ denomination: denom.denomination, issueYears: years })
            }


            let tableHTML = `<table class="summary-table">
                                <thead>
                                    <tr>`;
            if (issueYears.length > 0)
                tableHTML += `<td></td>`; // DENOMINATION COLUMN
            for (let year of issueYears) {
                tableHTML += `<th colspan="3">` + year + `</th>`;
            }
            tableHTML += `</tr>
                          <tr>`;
            if (issueYears.length > 0)
                tableHTML += `<td></td>`; // DENOMINATION COLUMN
            for (let year of issueYears) {
                tableHTML += `<td class="subcol-1">Date</td>
                                                    <td>Cat Id</td>
                                                    <td>Price</td>`
            }
            tableHTML += `</tr>
                       </thead>
                    <tbody>`;


            for (denom of newTableJSON) {
                // Calculate the maximum number of rows for this denomination
                let rowsMax = 0;
                for (let year of denom.issueYears) {
                    if (year.variants.length > rowsMax)
                        rowsMax = year.variants.length;
                }

                // Create a table with the html for each cell, initially with empty values
                let table = [];
                for (let row = 0; row < rowsMax; row++) {
                    let htmlRowCells = [];
                    for (let year in issueYears) {
                        htmlRowCells.push('<td class="subcol-1"></td><td></td><td></td>');
                    }
                    table.push(htmlRowCells);
                }

                // Iterate through the variants and reset the html cell with the values
                rowIndex.fill(0);
                for (let year of denom.issueYears) {
                    // This is the column index
                    let colIndex = issueYears.indexOf(year.issueYear);
                    for (let variant of year.variants) {
                        //Check the items: 
                        let itemId = "";
                        let gradeClass = "";
                        let priceStr = "";
                        if (variant.items && variant.items.length) {
                            itemId = variant.items[0].id;
                            gradeClass = ` ${variant.items[0].grade}-grade`;
                            priceStr = variant.items[0].price + " €";
                        }
                        // Store the issue year as well
                        variant.issueYear = year.issueYear;
                        table[rowIndex[colIndex]][colIndex] = `<td class="subcol-1${gradeClass}">${variant.printedDate}</td>
                                                            <td class="subcol-2${gradeClass}" data-variant='${JSON.stringify(variant)}' title="${variant.variantDescription || ""}">${variant.catalogueId}</td>
                                                            <td class="subcol-3${gradeClass}">${priceStr}</td>`;
                        rowIndex[colIndex]++;
                    }
                }

                if (rowsMax === 1)
                    tableHTML += `<tr class="last-subrow" data-denom="${denom.denomination}">`;
                else
                    tableHTML += `<tr data-denom="${denom.denomination}">`;

                let i = 0;
                tableHTML += `<th class="last-subrow" rowspan="${rowsMax}">${denom.denomination}</th>
                                ${table[i].join('')}
                            </tr>`;
                for (i = 1; i < table.length - 1; i++) {
                    tableHTML += `<tr data-denom="${denom.denomination}">
                                    ${table[i].join('')}
                                </tr>`;
                }
                if (rowsMax > 1) {
                    tableHTML += `<tr class="last-subrow" data-denom="${denom.denomination}">
                                    ${table[i].join('')}
                                    </tr>`;
                }
            }

            tableHTML += `</tbody>
                        </table>`;

            $(seriesSection).children("div").last().append(tableHTML);

            // Add hover events and click events
            if (itemsUri) {
                for (let i = 1; i <= 3; i++) {
                    $(".subcol-" + i).mouseenter(highlightRow);
                    $(".subcol-" + i).mouseleave(highlightRowOff);
                    $(".subcol-" + i).click(openUpsertCollection);
                }
            } else {
                $("table.summary-table td").css("cursor", "auto");
            }
        },

        error: function(xhr, status, error) {
            switch (xhr.status) {
                case 403:
                    // Check whether the cookie has alredy been deleted
                    if (getCookie("banknotes.ODB.username")) {
                        alert("Your session is not valid or has expired.");
                        deleteCookie("banknotes.ODB.username");
                        location.reload();
                    }
                    break;
                default:
                    alert(`Query failed. \n${status} - ${error}\nPlease contact the web site administrator.`);
            }
        }
    });
}


function highlightRow() {
    $(this).addClass("highlight");

    if ($(this).hasClass("subcol-1")) {
        $(this).next().addClass("highlight").next().addClass("highlight");
    } else if ($(this).hasClass("subcol-2")) {
        $(this).prev().addClass("highlight");
        $(this).next().addClass("highlight");
    } else if ($(this).hasClass("subcol-3")) {
        $(this).prev().addClass("highlight").prev().addClass("highlight");
    }
}

function highlightRowOff() {
    $(this).removeClass("highlight");

    if ($(this).hasClass("subcol-1")) {
        $(this).next().removeClass("highlight").next().removeClass("highlight");
    } else if ($(this).hasClass("subcol-2")) {
        $(this).prev().removeClass("highlight");
        $(this).next().removeClass("highlight");
    } else if ($(this).hasClass("subcol-3")) {
        $(this).prev().removeClass("highlight").prev().removeClass("highlight");
    }
}


function openUpsertCollection() {
    let variantJSON;

    // "this" identifies the sub-column!
    if ($(this).hasClass("subcol-1")) {
        variantJSON = $(this).next().data("variant");
        // date = $(this).text();
        // catId = $(this).next().text();
        // price = $(this).next().next().text();
    } else if ($(this).hasClass("subcol-2")) {
        variantJSON = $(this).data("variant");
        // varId = $(this).data("variantid");
        // date = $(this).prev().text();
        // catId = $(this).text();
        // price = $(this).next().text();
    } else if ($(this).hasClass("subcol-3")) {
        variantJSON = $(this).prev().data("variant");
        // varId = $(this).prev().data("variantid");
        // date = $(this).prev().prev().text();
        // catId = $(this).prev().text();
        // price = $(this).text();
    }
    variantJSON.denominationStr = $(this).parent().data("denom") + " " + $("#currency-name").text();

    let gradesJSON = $("#grades-div").data("grades");
    let seriesId = $(this).parents("section.series-detail-section").data("series-id");

    $("div.modal-form-placeholder").load("./collection/__collection.html", () => { initializeUpsertCollection(seriesId, variantJSON, gradesJSON) });
    $("div.modal-form-placeholder").show();

    //     let varId;
    //     let denom;
    //     let date;
    //     let catId;
    //     let price;


    //     $('#upsert-collection-dialog input[name="variant-title"]').val(`${denom}, ${date}, ${catId}`);
    //     $('#upsert-collection-dialog input[name="collection-quantity"]').val(1);
    //     $('#upsert-collection-dialog input[name="collection-price"]').val(price);
    //     $('#upsert-collection-dialog').data('variantId', varId);
    //     $('#upsert-collection-dialog').data('series-id', $(this).parents("section").eq(0).data("series-id"));
    //     $('#upsert-collection-dialog input[value="Modify"]').hide();
    //     $('#upsert-collection-dialog').show();
}