"use strict"

function initStatsFilterTable(tableElem, colStates, onColButtonClickedCallback, rowStates, onRowButtonClickedCallback) {
    if (!tableElem)
        throw "Table element is mandatory!";

    // Add slide buttons
    tableElem.find("thead .check-button").each((idx, elem) => {
        addSlideButton($(elem).attr("id"), colStates[idx], (id, onFlag) => {
            if (!onFlag) {
                tableElem.find("." + id).addClass("disabled-stats-cell-vert");
            } else {
                tableElem.find("." + id).removeClass("disabled-stats-cell-vert");
            }

            onColButtonClickedCallback(id, onFlag);
        });
        // Disable cells depending on the state
        let colClass = $(elem).attr("id");
        if (!colStates[idx]) {
            tableElem.find("." + colClass).addClass("disabled-stats-cell-vert");
        }
    });

    // Add row check buttons
    tableElem.find("tbody .check-button").each((idx, elem) => {
        addSlideButton($(elem).attr("id"), rowStates[idx], (id, onFlag) => {
            let elem = $("#" + id);
            if (!onFlag) {
                elem.next().addClass("disabled-stats-cell");
                elem.parent().nextAll().addClass("disabled-stats-cell");
            } else {
                elem.next().removeClass("disabled-stats-cell");
                elem.parent().nextAll().removeClass("disabled-stats-cell");
            }

            onRowButtonClickedCallback(id, onFlag);
        });


        // Disable cells depending on the check buttons states
        if (!rowStates[idx]) {
            $(elem).next().addClass("disabled-stats-cell");
            $(elem).parent().nextAll().addClass("disabled-stats-cell");
        }
    });
}


// valuesJSON = {[rowId:str, values:[int]]}
function statsFilterTableSetData(tableElem, valuesJSON) {
    let numCols = tableElem.find("tfoot>tr>td").length * 2 / 3;
    let numRows = tableElem.find("tbody>tr").length;
    let numSubCols = numCols / 2;

    let subTotals = [];
    while (subTotals.length < numSubCols)
        subTotals.push(0);
    let totals = [];
    while (totals.length < numCols)
        totals.push(0);
    if (valuesJSON.length === 1 && (!valuesJSON.rowId || valuesJSON.rowId === "")) {
        // Add values directly to the total row in the footer
        let cells = tableElem.find("tfoot>tr>td");
        valuesJSON[0].values.forEach((elem, idx) => {
            cells.eq(idx).text(elem);
            subTotals[idx % (numSubCols)] += elem;
        });

        subTotals.forEach((elem, idx) => {
            cells.eq(numCols + idx).text(elem);
        });
    } else {
        // Iterate through the rows
        valuesJSON.forEach((row, idx) => {
            let rowCells = tableElem.find(`tbody>tr[id=${row.rowId}]>td`);
            // Set the values
            subTotals.fill(0);
            row.values.forEach((elem, idx) => {
                rowCells.eq(idx).text(elem);
                subTotals[idx % (numSubCols)] += elem;
                totals[idx] += elem;
            });
            subTotals.forEach((elem, idx) => {
                rowCells.eq(numCols + idx).text(elem);
            });
        });

        // Add total values in the footer
        subTotals.fill(0);
        let cells = tableElem.find("tfoot>tr>td");
        totals.forEach((elem, idx) => {
            cells.eq(idx).text(elem);
            subTotals[idx % (numSubCols)] += elem;
        });
        subTotals.forEach((elem, idx) => {
            cells.eq(numCols + idx).text(elem);
        });
    }
}