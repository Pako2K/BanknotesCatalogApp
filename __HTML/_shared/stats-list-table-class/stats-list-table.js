"use strict"

/* DEPENDENCIES: 

    /shared/cookies.js
    /shared/constants.js
    /shared/utils.js

*/

class StatsListTable {
    static _max_id = 1;
    _numDescCols;
    _numStatsCols;
    _id;
    _alignments = [];
    _optionalShow = [];
    _notLoggedInClass = "";
    _loadCallback;
    _rawDataJSON;

    // Dictionary column name - field name
    _mapFieldName = {
        "Issue Year": "issueYear",
        "Denomination": "denomination",
        "ISO": "iso3",
        "Name": "name",
        "Territory": "territory.name",
        "Start": "start",
        "Founded": "start",
        "Created": "start",
        "Finished": "end",
        "Replaced": "end",
        "Territories": "numTerritories",
        "Currencies": "numCurrencies",
        "Issues": "numSeries",
        "Denoms.": "numDenominations",
        "Note Types": "numNotes",
        "Variants": "numVariants",
        "Price": "collectionStats.price"
    };

    // Field names for statistics
    _statsFieldNames = [
        "numTerritories",
        "numCurrencies",
        "numSeries",
        "numDenominations",
        "numNotes",
        "numVariants"
    ];

    /* 
        descCols = [{name, align, isSortable, optionalShow}]
        statsCols = [name]
    */
    constructor(parentElement, descCols, statsCols, loadCallback) {
        this._numDescCols = descCols.length;
        this._numStatsCols = statsCols.length;
        this._loadCallback = loadCallback;
        this._id = "stats-list-table-" + StatsListTable._max_id;
        StatsListTable._max_id++;

        if (!Session.getUsername()) {
            parentElement.append('<p class="login-warning"><a href="/index.html">Log in</a> to see your collection stats!</p>');
            this._notLoggedInClass = "not-logged-in";
        }

        let headerFirstRow = "";
        for (let col of descCols) {
            let alignClass = `align-${col.align}`;
            this._alignments.push(alignClass);

            let optionalShowClass = col.optionalShow ? "optional-show" : "";
            this._optionalShow.push(optionalShowClass);
            if (col.isSortable) {
                headerFirstRow += ` <th rowspan="2" class="${optionalShowClass}"><span class="is-sortable">${col.name}</span>
                                        <div class="sort-div">
                                            <div class="sort-asc"></div>
                                            <div class="sort-desc"></div>
                                        </div>
                                    </th>`;
            } else {
                headerFirstRow += `<th rowspan="2" class="${optionalShowClass}">${col.name}</th>`;
            }
        }

        let headerSecondRow = "";
        for (let col of statsCols) {
            headerFirstRow += ` <th colspan="2" class="th-stats">${col}</th>`;
            headerSecondRow += `<td><span class="is-sortable" data-stats-col="${col}">Catalog</span>
                                    <div class="sort-div">
                                        <div class="sort-asc"></div>
                                        <div class="sort-desc"></div>
                                    </div>
                                </td>
                                <td><span class="is-sortable ${this._notLoggedInClass}" data-stats-col="${col}">Collect.</span>
                                    <div class="sort-div">
                                        <div class="sort-asc"></div>
                                        <div class="sort-desc"></div>
                                    </div>
                                </td>`;
        }
        headerFirstRow += `<th rowspan="2" class="th-stats"><span class="is-sortable ${this._notLoggedInClass}">Price</span>
                                <div class="sort-div">
                                    <div class="sort-asc"></div>
                                    <div class="sort-desc"></div>
                                </div>
                            </th>`;

        parentElement.append(
            `<table id="${this._id}" class="stats-list-table">
                <thead>
                    <tr>
                        ${headerFirstRow}
                    </tr>
                    <tr>
                        ${headerSecondRow}
                    </tr>
                </thead>
                <tbody>
                </tbody>
                <tfoot>
                    <tr>
                    </tr>
                </tfoot>
            </table>`);
        parentElement.find("span.is-sortable").each((i, elem) => {
            $(elem).click(() => {
                let titleStr = $(elem).data("stats-col");
                this.sort($(elem), titleStr);
            });
        });
        parentElement.find("div.sort-div").each((i, elem) => {
            $(elem).click(() => {
                this.sort($(elem));
            });
        });
    }


    addRecord(descFields, catStats, colStats, price) {
        let thFields = "";
        for (let i = 0; i < this._numDescCols; i++) {
            thFields += `<th class="${this._alignments[i]} ${this._optionalShow[i]}">${descFields[i]}</th>`;
        }

        let tdFields = "";
        for (let i = 0; i < this._numStatsCols; i++) {
            tdFields += `<td>${catStats[i]}</td> <td class="${this._notLoggedInClass}">${colStats[i] || '-'}</td>`;
        }

        let priceStr = (price === 0) ? '-' : price.toFixed(2) + ' €';

        let tableRow = `<tr>${thFields}${tdFields}<td class="${this._notLoggedInClass}">${priceStr}</td></tr>`;
        $(`#${this._id}>tbody`).append(tableRow);
    }

    setFooter(catNumVariants, colNumVariants, price) {
        let priceStr = (price === 0) ? '-' : price.toFixed(2) + ' €';

        let footer = $(`#${this._id}>tfoot>tr`);
        footer.empty();
        let footerRow = "";
        for (let i = 0; i < this._numDescCols; i++) {
            footerRow += `<th class="${this._optionalShow[i]}"></th>`;
        }
        footerRow += `<th colspan="${2*(this._numStatsCols - 1)}">TOTAL</th>
                        <td>${catNumVariants}</td>
                        <td class="only-logged-in">${colNumVariants}</td>
                        <td class="only-logged-in">${priceStr}</td>`;
        footer.append(footerRow);
    }

    loadData(recordsJSON, defaultSortCol) {
        let table = $(`#${this._id}`);
        this._rawDataJSON = recordsJSON;

        // Invoke sort 
        table.find(".sorting-column").removeClass("sorting-column");
        table.find(".sort-selection").removeClass("sort-selection");
        table.find("thead>tr>th span.is-sortable").each((i, elem) => {
            if ($(elem).text() === defaultSortCol)
                $(elem).click();
        });
    }

    getData() {
        return this._rawDataJSON;
    }

    sort(htmlElem, titleStr) {
        // Determine the text of the sorting column
        let ascDiv = $(htmlElem).parent().children("div").children(".sort-asc");
        let descDiv = $(htmlElem).parent().children("div").children(".sort-desc");
        let titleElem = $(htmlElem).parent().children("span");

        // Select column if it was not selected
        let table = $(`#${this._id}`);
        if (!$(titleElem).hasClass("sorting-column")) {
            table.find(".sorting-column").removeClass("sorting-column");
            $(titleElem).addClass("sorting-column");
        }

        let sortingAsc = true;
        // Select ASC or DESC sorting
        if ($(ascDiv).hasClass("sort-selection")) {
            $(ascDiv).removeClass("sort-selection");
            $(descDiv).addClass("sort-selection");
            sortingAsc = false;
        } else if ($(descDiv).hasClass("sort-selection")) {
            $(descDiv).removeClass("sort-selection");
            $(ascDiv).addClass("sort-selection");
        } else {
            table.find(".sort-selection").removeClass("sort-selection");
            $(ascDiv).addClass("sort-selection");
        }

        let mapKey = $(titleElem).text();

        // Determine the field name (it might no be the title of the column)
        if (titleStr)
            mapKey = titleStr;

        let isCollecBasedSorting = $(htmlElem).text() === "Collect.";

        let sortingField = this._mapFieldName[mapKey];
        if (sortingField) {
            // Reverse sorting for statistic fields
            if (this._statsFieldNames.indexOf(sortingField) !== -1)
                sortingAsc = !sortingAsc;

            if (isCollecBasedSorting)
                sortingField = "collectionStats." + sortingField;

            let sortingFields = [sortingField];
            if (sortingField !== "name")
                sortingFields.push("name");

            this._rawDataJSON = sortJSON(this._rawDataJSON, sortingFields, sortingAsc);

            // Load countries table body
            table.children("tbody").empty();
            this._loadCallback(this._rawDataJSON);
        }
    }

    clean() {
        $(`#${this._id}>tbody`).empty();
    }
}