"use strict"

/* DEPENDENCIES: 

    /shared/cookies.js
    /shared/constants.js

*/

class StatsSummaryTable {
    static _max_id = 1;

    _id = 0;
    _numCols;
    _numRows;
    _notLoggedInClass = "";

    /* 
        cols = [name]
        rows = [id, name]
    */
    constructor(parentElement, cols, rows) {
        $("head").append('<link rel="stylesheet" type="text/css" href="/_shared/stats-summary-table-class/stats-summary-table.css">');

        this._id = "stats-summary-table-" + StatsSummaryTable._max_id;
        this._numCols = cols.length;
        this._numRows = rows.length;

        StatsSummaryTable._max_id++;

        if (!getCookie(_COOKIE_USERNAME)) {
            parentElement.append('<p class="login-warning"><a href="/index.html">Log in</a> to see your collection stats!</p>');
            this._notLoggedInClass = "not-logged-in"
        }




        let subCols = "";
        let footerCols = "";
        cols.forEach((val, idx) => {
            if (idx === 0) {
                subCols += `<td class="sub-column-1">${cols[idx]}</td>`;
                footerCols += `<td class="sub-column-1"></td>`;
            } else if (idx === (this._numCols - 1)) {
                subCols += `<td class="${this._notLoggedInClass}">${cols[idx]}</td>`;
                footerCols += `<td class="${this._notLoggedInClass}"></td>`;
            } else {
                subCols += `<td>${cols[idx]}</td>`;
                footerCols += `<td></td>`;
            }
        });

        let bodyHTML = "";
        rows.forEach((val, idx) => {
            bodyHTML += `<tr id="row-id-${val.id}">
                            <th>
                                ${val.name}
                            </th>
                            ${footerCols}
                            ${footerCols}
                            ${footerCols}
                        </tr>`;
        });

        parentElement.append(
            `<table id="${this._id}" class="stats-summary-table">
                <thead>
                    <tr>
                        <th></th>
                        <th colspan="${this._numCols}">
                            <div>Existing</div>
                        </th>
                        <th colspan="${this._numCols}">
                            <div>Extinct</div>
                        </th>
                        <th colspan="${this._numCols}">TOTAL</th>
                    </tr>
                    <tr>
                        <td></td>
                        ${subCols}
                        ${subCols}
                        ${subCols}
                    </tr>
                </thead>
                <tbody>
                    ${bodyHTML}
                </tbody>
                <tfoot>
                    <tr>
                        <th>TOTAL</th>
                        ${footerCols}
                        ${footerCols}
                        ${footerCols}
                    </tr>
                </tfoot>
            </table>`);
    }

    setData(valuesJSON) {
        let table = $(`#${this._id}`);

        let numSubCols = this._numCols * 2;

        let subTotals = [];
        while (subTotals.length < this._numCols)
            subTotals.push(0);
        let totals = [];
        while (totals.length < numSubCols)
            totals.push(0);
        if (valuesJSON.length === 1 && (!valuesJSON.rowId || valuesJSON.rowId === "")) {
            // Add values directly to the total row in the footer
            let cells = table.find("tfoot>tr>td");
            valuesJSON[0].values.forEach((elem, idx) => {
                cells.eq(idx).text(elem);
                subTotals[idx % (this._numCols)] += elem;
            });

            subTotals.forEach((elem, idx) => {
                cells.eq(numSubCols + idx).text(elem);
            });
        } else {
            // Iterate through the rows
            valuesJSON.forEach((row, terType) => {
                let rowCells = table.find(`tbody>tr[id=row-id-${terType}]>td`);
                // Set the values
                subTotals.fill(0);
                row.forEach((elem, idx) => {
                    rowCells.eq(idx).text(elem);
                    subTotals[idx % (this._numCols)] += elem;
                    totals[idx] += elem;
                });
                subTotals.forEach((elem, idx) => {
                    rowCells.eq(numSubCols + idx).text(elem);
                });
            });

            // Add total values in the footer
            subTotals.fill(0);
            let cells = table.find("tfoot>tr>td");
            totals.forEach((elem, idx) => {
                cells.eq(idx).text(elem);
                subTotals[idx % (this._numCols)] += elem;
            });
            subTotals.forEach((elem, idx) => {
                cells.eq(numSubCols + idx).text(elem);
            });
        }
    }

    /* col = 0 (existing), col = 1 (extinct)*/
    disableColumns(col) {
        let table = $(`#${this._id}`);

        table.find(`thead>tr:first-of-type>th:nth-of-type(${col+2})`).addClass("disabled-stats-cell");
        for (let i = 0; i < 3; i++) {
            table.find(`thead>tr:last-of-type>td:nth-of-type(${col*3+2+i})`).addClass("disabled-stats-cell");
            table.find(`tbody tr>td:nth-of-type(${col*3+1+i})`).addClass("disabled-stats-cell");
            table.find(`tfoot tr>td:nth-of-type(${col*3+1+i})`).addClass("disabled-stats-cell");
        }
    }

    /* col = 0 (existing), col = 1 (extinct)*/
    enableColumns(col) {
        let table = $(`#${this._id}`);

        table.find(`thead>tr:first-of-type>th:nth-of-type(${col+2})`).removeClass("disabled-stats-cell");
        for (let i = 0; i < 3; i++) {
            table.find(`thead>tr:last-of-type>td:nth-of-type(${col*3+2+i})`).removeClass("disabled-stats-cell");
            table.find(`tbody tr>td:nth-of-type(${col*3+1+i})`).removeClass("disabled-stats-cell");
            table.find(`tfoot tr>td:nth-of-type(${col*3+1+i})`).removeClass("disabled-stats-cell");
        }
    }

    disableRow(rowId) {
        let table = $(`#${this._id}`);
        table.find(`#row-id-${rowId}`).addClass("disabled-stats-cell");
    }

    enableRow(rowId) {
        let table = $(`#${this._id}`);
        table.find(`#row-id-${rowId}`).removeClass("disabled-stats-cell");
    }

}