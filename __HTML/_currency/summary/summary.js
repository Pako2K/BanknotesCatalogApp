$('#summary-main-div').ready(() => {
    let currencyId = window.location.search.substr("?currencyId=".length);

    let seriesJSON = JSON.parse($(document).data("series-stats"));

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
            // $("#grades-div").data("grades", grades);

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

    // // Load Upsert-Collection form
    // $("#upsert-collection-dialog").load("_series/_notes/upsert-collection.html");
});



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


// Load Banknotes info when a section is expanded
function loadBanknotesInfo(seriesSection) {
    let seriesId = $(seriesSection).data("series-id");

    $.ajax({
        type: "GET",
        url: `/collection/series?seriesId=${seriesId}`,
        async: true,
        cache: false,
        timeout: 5000,
        dataType: 'json',

        //         success: function(notesJSON, status) {
        //             console.log(JSON.stringify(notesJSON));
        //             // Clean-up table
        //             $(seriesSection).find("div>table").remove();

        //             // Collect all the different "Issue Years"
        //             let issueYears = []; // "Columns": 1 columns for each issue year
        //             let rowIndex = []; // One for each column: to be used later to insert the values of each variant
        //             let denom;
        //             let variant;
        //             for (denom of notesJSON) {
        //                 for (variant of denom.variants) {
        //                     if (issueYears.indexOf(variant.issueYear) === -1) {
        //                         issueYears.push(variant.issueYear);
        //                         rowIndex.push(0);
        //                     }
        //                 }
        //             }
        //             issueYears.sort();

        //             let year;
        //             let tableHTML = `<table class="variants-table">
        //                                 <thead>
        //                                     <tr>`;
        //             if (issueYears.length > 0)
        //                 tableHTML += `<td></td>`; // DENOMINATION COLUMN
        //             for (year of issueYears) {
        //                 tableHTML += `<th colspan="3">` + year + `</th>`;
        //             }
        //             tableHTML += `</tr>
        //                                     <tr>`;
        //             if (issueYears.length > 0)
        //                 tableHTML += `<td></td>`; // DENOMINATION COLUMN
        //             for (year of issueYears) {
        //                 tableHTML += `<td class="subcol-1">Date</td>
        //                                         <td>Cat Id</td>
        //                                         <td>Price</td>`
        //             }
        //             tableHTML += `</tr>
        //                                 </thead>
        //                                 <tbody>`;
        //             for (denom of notesJSON) {
        //                 let totalVariants = denom.variants.length;
        //                 if (totalVariants > 0) {
        //                     // Calculate the maximum number of rows for this denomination
        //                     let issueYear = denom.variants[0].issueYear;
        //                     let rowsMax = 0;
        //                     let rowCount = 0;
        //                     for (variant of denom.variants) {
        //                         if (variant.issueYear == issueYear) {
        //                             rowCount++;
        //                         } else {
        //                             if (rowCount > rowsMax)
        //                                 rowsMax = rowCount;
        //                             issueYear = variant.issueYear;
        //                             rowCount = 1;
        //                         }
        //                     }
        //                     // For the last issue year
        //                     if (rowCount > rowsMax)
        //                         rowsMax = rowCount;

        //                     // Create a table with the html for each cell, initially with empty values
        //                     let table = [];
        //                     for (let row = 0; row < rowsMax; row++) {
        //                         let htmlRowCells = [];
        //                         for (let year in issueYears) {
        //                             htmlRowCells.push('<td class="subcol-1"></td><td></td><td></td>');
        //                         }
        //                         table.push(htmlRowCells);
        //                     }

        //                     // Iterate through the variants and reset the html cell with the values
        //                     rowIndex.fill(0);
        //                     for (variant of denom.variants) {
        //                         // This is the column index
        //                         let colIndex = issueYears.indexOf(variant.issueYear);

        //                         //Check the items: take the one with the highest grade and the highest price
        //                         let items = variant.items;
        //                         let maxGradeValue = 100;
        //                         let maxGrade = "none";
        //                         let price = 0;
        //                         let itemId = 0;
        //                         for (let item of items) {
        //                             if (item.gradeValue < maxGradeValue) {
        //                                 maxGradeValue = item.gradeValue;
        //                                 maxGrade = item.grade;
        //                                 price = Math.max(price, item.price);
        //                                 itemId = item.id;
        //                             }
        //                         }
        //                         let gradeClass = ` ${maxGrade}-grade`;
        //                         let priceStr = price ? price + " €" : "";
        //                         table[rowIndex[colIndex]][colIndex] = `<td class="subcol-1${gradeClass}">${variant.printedDate}</td>
        //                                                                 <td class="subcol-2${gradeClass}" data-variantid="${variant.id}" data-itemid="${itemId}" title="${variant.description}">${variant.catId}</td>
        //                                                                 <td class="subcol-3${gradeClass}">${priceStr}</td>`;
        //                         rowIndex[colIndex]++;
        //                     }

        //                     if (rowsMax === 1)
        //                         tableHTML += `<tr class="last-subrow" data-denom="${denom.denomination}">`;
        //                     else
        //                         tableHTML += `<tr data-denom="${denom.denomination}">`;

        //                     let i = 0;
        //                     tableHTML += `<th class="last-subrow" rowspan="${rowsMax}">${denom.denomination}</th>
        //                                         ${table[i].join('')}
        //                                     </tr>`;
        //                     for (i = 1; i < table.length - 1; i++) {
        //                         tableHTML += `<tr data-denom="${denom.denomination}">
        //                                         ${table[i].join('')}
        //                                     </tr>`;
        //                     }
        //                     if (rowsMax > 1) {
        //                         tableHTML += `<tr class="last-subrow" data-denom="${denom.denomination}">
        //                                         ${table[i].join('')}
        //                                       </tr>`;
        //                     }
        //                 }
        //             }

        //             tableHTML += `</tbody>
        //                             </table>`;

        //             $(seriesSection).children("div").last().append(tableHTML);

        //             // Add hover events and click events
        //             for (let i = 1; i <= 3; i++) {
        //                 $(".subcol-" + i).mouseenter(highlightRow);
        //                 $(".subcol-" + i).mouseleave(highlightRowOff);
        //                 $(".subcol-" + i).click(openUpsertCollection);
        //             }
        //         },

        //         error: function(xhr, status, error) {
        //             switch (xhr.status) {
        //                 case 403:
        //                     // Check whether the cookie has alredy been deleted
        //                     if (getCookie("banknotes.ODB.username")) {
        //                         alert("Your session is not valid or has expired.");
        //                         deleteCookie("banknotes.ODB.username");
        //                         location.reload();
        //                     }
        //                     break;
        //                 default:
        //                     alert(`Query failed. \n${status} - ${error}\nPlease contact the web site administrator.`);
        //             }
        //         }
    });
}


// function highlightRow() {
//     $(this).addClass("highlight");

//     if ($(this).hasClass("subcol-1")) {
//         $(this).next().addClass("highlight").next().addClass("highlight");
//     } else if ($(this).hasClass("subcol-2")) {
//         $(this).prev().addClass("highlight");
//         $(this).next().addClass("highlight");
//     } else if ($(this).hasClass("subcol-3")) {
//         $(this).prev().addClass("highlight").prev().addClass("highlight");
//     }
// }

// function highlightRowOff() {
//     $(this).removeClass("highlight");

//     if ($(this).hasClass("subcol-1")) {
//         $(this).next().removeClass("highlight").next().removeClass("highlight");
//     } else if ($(this).hasClass("subcol-2")) {
//         $(this).prev().removeClass("highlight");
//         $(this).next().removeClass("highlight");
//     } else if ($(this).hasClass("subcol-3")) {
//         $(this).prev().removeClass("highlight").prev().removeClass("highlight");
//     }
// }


// function openUpsertCollection() {
//     let varId;
//     let denom;
//     let date;
//     let catId;
//     let price;

//     // "this" identifies the sub-column!
//     if ($(this).hasClass("subcol-1")) {
//         varId = $(this).next().data("variantid");
//         date = $(this).text();
//         catId = $(this).next().text();
//         price = $(this).next().next().text();
//     } else if ($(this).hasClass("subcol-2")) {
//         varId = $(this).data("variantid");
//         date = $(this).prev().text();
//         catId = $(this).text();
//         price = $(this).next().text();
//     } else if ($(this).hasClass("subcol-3")) {
//         varId = $(this).prev().data("variantid");
//         date = $(this).prev().prev().text();
//         catId = $(this).prev().text();
//         price = $(this).text();
//     }

//     denom = $(this).parent().data("denom") + " " + $("#currency-name").text();

//     $('#upsert-collection-dialog input[name="variant-title"]').val(`${denom}, ${date}, ${catId}`);
//     $('#upsert-collection-dialog input[name="collection-quantity"]').val(1);
//     $('#upsert-collection-dialog input[name="collection-price"]').val(price);
//     $('#upsert-collection-dialog').data('variantId', varId);
//     $('#upsert-collection-dialog').data('series-id', $(this).parents("section").eq(0).data("series-id"));
//     $('#upsert-collection-dialog input[value="Modify"]').hide();
//     $('#upsert-collection-dialog').show();
// }