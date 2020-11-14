function initializeTimeline() {
    let seriesJSON = JSON.parse($(document).data("series-summary"));

    if (getCookie("banknotes.ODB.username"))
        $("#grades-div").show();
    else
        $("#grades-div").hide();

    if (seriesJSON.length === 0) {
        $("#grades-div").hide();
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
            timeout: TIMEOUT,
            dataType: 'json',

            success: function(notesJSON, status) {
                numReplies++;
                notesArray[idx] = notesJSON;
                notesArray[idx].seriesId = seriesJSON[idx].id
                notesArray[idx].seriesName = seriesJSON[idx].name
                if (numReplies === seriesJSON.length) {
                    drawTables(notesArray);
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


function drawTables(notesArray) {
    let searchStrArr = window.location.search.substr(1).split("&");
    let searchParam = searchStrArr[0].split("=");
    let currencyId = searchParam[0] === "currencyId" ? searchParam[1] : "";

    $("#timeline-table-div").empty();

    let denominations = []; // "Rows": 1 row for each denomination
    let issueYears = []; // Array of arrays: 1 column for each issue year of each series
    let totalIssueYears = 0;
    for (let series of notesArray) {
        // Determine all the issue years
        let seriesIssueYears = []; // "Columns": 1 column for each issue year in thsi series
        for (let denom of series) {
            let obj = { d: denom.denomination, f: denom.faceValue };
            if (!denominations.find((elem) => { return obj.d === elem.d && obj.f === elem.f })) {
                denominations.push(obj);
            }
            for (let variant of denom.variants) {
                if (!seriesIssueYears.includes(variant.issueYear)) {
                    seriesIssueYears.push(variant.issueYear);
                    totalIssueYears++;
                }
            }
        }

        // Sort numerically
        if (seriesIssueYears.length === 0) {
            seriesIssueYears.push("0");
            totalIssueYears++;
        } else
            seriesIssueYears.sort((a, b) => { return a - b });

        issueYears.push(seriesIssueYears);
    }
    // Sort all the denominations
    if (denominations.length === 0)
        denominations.push("0");
    else
        denominations.sort((a, b) => { return a.d - b.d });

    denominations.forEach((elem, idx) => {
        denominations[idx] = elem.d.toLocaleString("de-DE") + ((elem.f && elem.f !== elem.d) ? " [" + elem.f.toLocaleString("de-DE") + "]" : "");
    });

    // Create the matrix with all the variants
    let row = [];
    let variantsMatrix = [];
    // Add 1 row for each denomination
    for (let i = 0; i < denominations.length; i++) {
        let row = [];
        // Create 1 row with all the columns. Each cell contains an array of cells! (when there are several variants for teh same year and denomination)
        for (let i = 0; i < totalIssueYears; i++)
            row.push([]);
        variantsMatrix.push(row);
    }


    // Iterate through all the series again and assign the variant/item to each cell in the table
    let totalColIdx = 0;
    const NO_GRADE = "no-grade";
    for (let seriesIdx in notesArray) {
        for (let denom of notesArray[seriesIdx]) {
            let rowIdx = denominations.indexOf(denom.denomination.toLocaleString("de-DE") + (denom.faceValue ? " [" + denom.faceValue + "]" : ""));

            for (let variant of denom.variants) {
                let gradeClass = NO_GRADE;
                let priceStr = "";
                if (variant.items && variant.items.length) {
                    gradeClass = `${variant.items[0].grade}-grade`;
                    priceStr = variant.items[0].price + " €";
                }
                let colIdx = totalColIdx + issueYears[seriesIdx].indexOf(variant.issueYear);
                // Store the issue year as well
                let variantStr = JSON.stringify(variant);
                variantStr = variantStr.replace(/'/g, "&#39");
                variantsMatrix[rowIdx][colIdx].push(`<td class="subcol-1 ${gradeClass}">${variant.printedDate || "ND"}</td>
                                                    <td class="subcol-2 ${gradeClass}" data-variant='${variantStr}' title="${variant.variantDescription || ""}">${variant.catalogueId}</td>
                                                    <td class="subcol-3 ${gradeClass}">${priceStr}</td>`);
            }
        }
        totalColIdx += issueYears[seriesIdx].length;
    }

    // Maximum number of issue years per table
    const MAX_NUM_YEARS = 8;

    // Number of years left in the current table
    let yearsLeft = totalIssueYears;

    let colIndex = 0;
    let globalSeriesIndex = 0;
    let seriesYearIndex = 0;
    while (yearsLeft > 0) {
        let numCols = Math.min(yearsLeft, MAX_NUM_YEARS);

        // Create the HTML table
        let rowsHTML = "";
        for (let rowIdx in variantsMatrix) {
            // First check the maximum number of variants in the same denomination and year
            let maxSubrows = 0;
            for (let i = colIndex; i < colIndex + numCols; i++) {
                maxSubrows = Math.max(maxSubrows, variantsMatrix[rowIdx][i].length);
            }

            if (maxSubrows === 0)
                continue;

            // Create the row and subrows and iterate through all the columns
            // First subrow
            if (maxSubrows === 1)
                rowsHTML += `<tr class="last-subrow" data-denom="${denominations[rowIdx]}">`;
            else
                rowsHTML += `<tr data-denom="${denominations[rowIdx]}">`;

            rowsHTML += `       <th rowspan="${maxSubrows}">${denominations[rowIdx].toLocaleString("de-DE")}</th>`;
            for (let i = colIndex; i < colIndex + numCols; i++) {
                rowsHTML += variantsMatrix[rowIdx][i][0] || `<td class='subcol-1 ${NO_GRADE}'></td><td class='${NO_GRADE}'></td><td class='${NO_GRADE}'></td>`;
            }
            rowsHTML += `</tr>`;

            // Next subrows
            for (let subrow = 1; subrow < maxSubrows; subrow++) {
                if (subrow === maxSubrows - 1)
                    rowsHTML += ` <tr class="last-subrow" data-denom="${denominations[rowIdx]}">`;
                else
                    rowsHTML += ` <tr data-denom="${denominations[rowIdx]}">`;

                for (let i = colIndex; i < colIndex + numCols; i++) {
                    rowsHTML += variantsMatrix[rowIdx][i][subrow] || `<td class='subcol-1 ${NO_GRADE}'></td><td class='${NO_GRADE}'></td><td class='${NO_GRADE}'></td>`;
                }
                rowsHTML += `</tr>`;
            }
        }

        let firstHeaderHTML = "";
        let secondHeaderHTML = "";
        let thirdHeaderHTML = "";
        let totalYears = 0;
        let localSeriesIndex = globalSeriesIndex;
        while (totalYears < numCols) {
            firstHeaderHTML += `<th colspan="${Math.min(3 * (issueYears[localSeriesIndex].length - seriesYearIndex),3*(MAX_NUM_YEARS - totalYears))}">
                                    <a href="/_currency/index.html?currencyId=${currencyId}&seriesId=${notesArray[localSeriesIndex].seriesId}">
                                        ${notesArray[localSeriesIndex].seriesName}
                                    </a>
                                </th>`;

            let yearIdx = seriesYearIndex;
            for (; yearIdx < issueYears[localSeriesIndex].length; yearIdx++) {
                let year = issueYears[localSeriesIndex][yearIdx];
                secondHeaderHTML += `<th colspan="3">${year != 0 ? year : "N.A"}</th>`;
                thirdHeaderHTML += `<td class="subcol-1">Dated</td>
                                    <td>Cat Id</td>
                                    <td>Price</td>`;
                totalYears++;
                if (totalYears >= numCols) {
                    break;
                }
            }
            if (yearIdx < issueYears[localSeriesIndex].length - 1) {
                // Series not completed 
                seriesYearIndex = yearIdx + 1;
            } else {
                // Series completed 
                seriesYearIndex = 0;
                globalSeriesIndex++;
            }
            localSeriesIndex++;
        }

        $("#timeline-table-div").append(
            `<table class="timeline-table">
            <thead>
                <tr>
                    <td></td>
                    ${firstHeaderHTML}
                </tr>
                <tr>
                    <td></td>
                    ${secondHeaderHTML}
                </tr>
                <tr>
                    <td>Denom.</td>
                    ${thirdHeaderHTML}
                </tr>
            </thead>
            <tbody>
                ${rowsHTML}
            <tbody>
        </table>`);

        yearsLeft -= numCols;
        colIndex += MAX_NUM_YEARS;
    }


    // Add hover events and click events
    for (let i = 1; i <= 3; i++) {
        $(".subcol-" + i).mouseenter(highlightRow);
        $(".subcol-" + i).mouseleave(highlightRowOff);
        $(".subcol-" + i).click(openUpsertCollection);
    }
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
    if (getCookie("banknotes.ODB.username")) {
        let variantJSON;

        // "this" identifies the sub-column!
        if ($(this).hasClass("subcol-1")) {
            variantJSON = $(this).next().data("variant");
        } else if ($(this).hasClass("subcol-2")) {
            variantJSON = $(this).data("variant");
        } else if ($(this).hasClass("subcol-3")) {
            variantJSON = $(this).prev().data("variant");
        }
        variantJSON.denominationStr = $(this).parent().data("denom") + " " + $("#currency-name").text();

        let gradesJSON = $("#grades-div").data("grades");
        let seriesId = $(this).parents("section.series-detail-section").data("series-id");

        $("div.modal-form-placeholder").load("./forms/collection/__collection.html", () => { initializeUpsertCollection(seriesId, variantJSON, gradesJSON) });
        $("div.modal-form-placeholder").show();

        resetExpiration();
    } else
        alert("Please log in to add this note to your collection.");
}