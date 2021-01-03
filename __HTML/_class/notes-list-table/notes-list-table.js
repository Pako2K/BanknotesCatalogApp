"use strict"

/* DEPENDENCIES: 

    /_shared/session.js
    /_shared/ajax-wrapper.js
    /_class/form/upsert-collection-form.js
    /_class/form/modal-form.css

*/

if (!$("head>script[src='/_shared/session.js']").length) {
    $("head").append(`
        <script src="/_shared/session.js"></script>`);
}
if (!$("head>script[src='/_shared/ajax-wrapper.js']").length) {
    $("head").append(`
        <script src="/_shared/ajax-wrapper.js"></script>`);
}
if (!$("head>script[src='/_class/form/upsert-collection-form.js']").length) {
    $("head").append(`
        <script src="/_class/form/upsert-collection-form.js"></script>
        <link rel="stylesheet" type="text/css" href="/_class/form/modal-form.css">`);
}


class NotesListTable {

    static _catCols = [{ name: "Territory", JSONfields: ["territoryName"], optionalShow: false },
        { name: "Cat. Id", JSONfields: ["catalogueIdPreffix", "catalogueIdInt", "catalogueIdSuffix"], optionalShow: false },
        { name: "Currency", JSONfields: ["currencyName"], optionalShow: false },
        { name: "Denomination", JSONfields: ["denomination"], optionalShow: false },
        { name: "Issue Date", JSONfields: ["issueYear"], optionalShow: false },
        { name: "Printed Date", JSONfields: ["printedDate"], optionalShow: false },
        { name: "Issue Name", JSONfields: ["seriesName"], optionalShow: true },
        { name: "Printed by", JSONfields: ["printer"], optionalShow: true },
        { name: "Width", JSONfields: ["width"], optionalShow: true },
        { name: "Height", JSONfields: ["height"], optionalShow: true },
        { name: "Description", optionalShow: false }
    ];

    static _colCols = [{ name: "Qty.", JSONfields: ["quantity"] },
        { name: "Grade" },
        { name: "Price", JSONfields: ["price"] },
        { name: "Seller", JSONfields: ["seller"] },
        { name: "Purchased", JSONfields: ["purchased"] },
        { name: "Notes" }
    ]

    static _sortingFields = ["territoryName", "catalogueIdPreffix", "catalogueIdInt", "catalogueIdSuffix",
        "currencyName", "denomination", "issueYear", "printedDate", "seriesName", "printer",
        "quantity", "price", "purchased", "seller"
    ];

    static _uid = 1;

    static _gradesJSON = [];
    /* 
        tableType = ALL | TER | CUR | COL
    */
    constructor(parentElement, tableType) {
        this._catCols = NotesListTable._catCols.slice();
        this._colCols = NotesListTable._colCols.slice();
        this._sortingFields = NotesListTable._sortingFields.slice();
        this._tableType = tableType;
        switch (tableType) {
            case "CUR":
                this._catCols.splice(2, 1);
                this._catCols.splice(0, 1);
                this._sortingFields.splice(4, 1);
                this._sortingFields.splice(0, 1);
                break;
            case "TER":
                this._catCols.splice(6, 1);
                this._catCols.splice(0, 1);
                this._sortingFields.splice(8, 1);
                this._sortingFields.splice(0, 1);
                break;

            case "COL":
            case "ALL":
                this._colCols.splice(3, 3);
                this._colCols.splice(0, 1);
                this._sortingFields.splice(-2, 2);
                this._sortingFields.splice(-2, 1);
                break;
            default:
                throw "Invalid table type: " + tableType;
        }

        let catHeaders = [];
        for (let catCol of this._catCols) {
            let catHeader = `<th rowspan="2" class="${catCol.optionalShow?'optional-show':''}"><span class="${catCol.JSONfields?'is-sortable':''}">${catCol.name}</span>`;
            if (catCol.JSONfields)
                catHeader += `  <div class="sort-div">
                                    <div class="sort-asc"></div>
                                    <div class="sort-desc"></div>
                                </div>`;
            catHeader += '</th>';
            catHeaders.push(catHeader);
        }

        let colHeaders = [];
        for (let colCol of this._colCols) {
            let colHeader = `<th class="only-logged-in"><span class="${colCol.JSONfields?'is-sortable':''}">${colCol.name}</span>`;
            if (colCol.JSONfields)
                colHeader += `  <div class="sort-div">
                                  <div class="sort-asc"></div>
                                    <div class="sort-desc"></div>
                                </div>`;
            colHeader += '</th>';
            colHeaders.push(colHeader);
        }

        let id = "notes-list-table-" + NotesListTable._uid;
        NotesListTable._uid++;

        parentElement.append(`
            <p class="login-warning"><a href="/index.html">Log in</a> to see your collection stats!</p>
            <table id="${id}" class="notes-list-table">
                <thead>
                    <tr>
                        ${catHeaders.join('')}
                        <th colspan="${this._colCols.length}" class="only-logged-in">Collection</th>
                    </tr>
                    <tr>
                        ${colHeaders.join('')}
                    </tr>
                </thead>
                <tbody></tbody>
            </table>
            <div class="grades-coding">
                <div>
                    <h3>Grades Color Coding</h3>
                </div>
            </div>`);

        this._table = $(`#${id}`);

        this._table.find("span.is-sortable").each((i, elem) => {
            $(elem).click(() => {
                this.sort($(elem));
            });
        });
        this._table.find("div.sort-div").each((i, elem) => {
            $(elem).click(() => {
                this.sort($(elem));
            });
        });

        if (!Session.getUsername()) {
            this._table.find(".only-logged-in").css('opacity', '0.25');
            this._table.siblings("p.login-warning").show();
        } else {
            // Load grades from DB
            asyncGET("/grades", (grades, status) => {
                // store info so it can be reused in the upsert-collection form
                NotesListTable._gradesJSON = grades;

                let gradesHTML = "";
                for (let grade of grades) {
                    gradesHTML += `<p class="${grade.grade}-grade" title="${grade.description}">${grade.name}</p>`;
                }
                this._table.siblings("div.grades-coding").children("div").append(gradesHTML);
                this._table.siblings("div.grades-coding").show();
            });
        }
    }

    /*
        param recordsJSON
        param sortBy
    */
    addData(recordsJSON) {
        // Parse the catalogue id in order to be able to sort
        //Select the collection records to be used for sorting (except tableType="COL") 
        for (let row of recordsJSON) {
            let parsedCatId = NotesListTable._parseCatalogueId(row.catalogueId);
            row.catalogueIdPreffix = parsedCatId.catalogueIdPreffix;
            row.catalogueIdInt = parsedCatId.catalogueIdInt;
            row.catalogueIdSuffix = parsedCatId.catalogueIdSuffix;
            if (this._tableType === "ALL") {
                if (row.item) {
                    row.quantity = row.item.quantity;
                    row.grade = row.item.grade;
                    row.price = parseFloat(row.item.price);
                } else {
                    row.quantity = 0;
                    row.grade = "-";
                    row.price = 0;
                }
            } else {
                if (row.items[0]) {
                    row.quantity = parseFloat(row.items[0].quantity);
                    row.price = parseFloat(row.items[0].price);
                    row.purchaseDate = row.items[0].purchaseDate;
                } else {
                    row.quantity = -1;
                    row.price = -1;
                    row.purchaseDate = "";
                }
            }
        }

        this._data = recordsJSON;

        this._table.find(".sorting-column").removeClass("sorting-column");
        this._table.find(".sort-selection").removeClass("sort-selection");
        this.sort(this._table.find("th>span.is-sortable").first());
    }

    removeData() {
        $(`#${this._id}>tbody`).empty();
        this._data = null;
    }

    sort(htmlElem) {
        let ascDiv = $(htmlElem).parent().children("div").children(".sort-asc");
        let descDiv = $(htmlElem).parent().children("div").children(".sort-desc");
        let titleElem = $(htmlElem).parent().children("span");

        // Select column if it was not selected

        if (!$(titleElem).hasClass("sorting-column")) {
            this._table.find(".sorting-column").removeClass("sorting-column");
            $(titleElem).addClass("sorting-column");
        }

        // Determine ASC or DESC sorting
        let sortingAsc = true;
        if ($(ascDiv).hasClass("sort-selection")) {
            $(ascDiv).removeClass("sort-selection");
            $(descDiv).addClass("sort-selection");
            sortingAsc = false;
        } else if ($(descDiv).hasClass("sort-selection")) {
            $(descDiv).removeClass("sort-selection");
            $(ascDiv).addClass("sort-selection");
        } else {
            this._table.find(".sort-selection").removeClass("sort-selection");
            $(ascDiv).addClass("sort-selection");
        }

        let sortingFields = [];
        let catCol = this._catCols.find((val, idx) => {
            return val.name === titleElem.text();
        });
        if (catCol)
            sortingFields = catCol.JSONfields;
        else {
            sortingFields = (this._colCols.find((val, idx) => {
                return val.name === titleElem.text();
            }).JSONfields);
        }

        if (sortingFields[0] === "catalogueId") {
            sortingFields = ["catalogueIdPreffix", "catalogueIdInt", "catalogueIdSuffix"];
        }
        this._sortingFields.forEach((val, idx) => {
            if (sortingFields.indexOf(val) === -1 && sortingFields.length < 7) sortingFields.push(val);
        });


        sortJSON(this._data, sortingFields, sortingAsc);

        // Clean table body and foot
        this._table.find("tbody").empty();
        this._table.siblings("p.not-issued").remove();

        // Retrieve info in JSON object
        let rowsHTML = "";
        let existsNotIssued = false;
        let rowHTML;
        switch (this._tableType) {
            case "ALL":
                for (let variant of this._data) {
                    if (variant.notIssued)
                        existsNotIssued = true;

                    let gradeClass = variant.item ? variant.item.grade + "-grade" : "";
                    rowsHTML += `  <tr class="${variant.notIssued?'not-issued':''}">
                                    <th class="left"><a href="/catalogue/country/index.html?countryId=${variant.territoryId}">${variant.territoryName}</a></th>
                                    <th class="${gradeClass}"><a href="/catalogue/currency/index.html?currencyId=${variant.currencyId}&seriesId=${variant.seriesId}&denomination=${variant.denomination}">${variant.catalogueId}${variant.notIssued?' (*)':''}</a></th>
                                    <th><a href="/catalogue/currency/index.html?currencyId=${variant.currencyId}">${variant.currencyName}</a></th>
                                    <th>${variant.denomination.toLocaleString("de-DE")}</th>
                                    <th>${variant.issueYear}</th>
                                    <th>${variant.printedDate || "ND"}</th>
                                    <th class="left optional-show"><a href="/catalogue/currency/index.html?currencyId=${variant.currencyId}&seriesId=${variant.seriesId}">${variant.seriesName}</a></th>
                                    <th class="left optional-show">${variant.printer || "-"}</th>
                                    <th class="optional-show">${variant.width || "-"}</th>
                                    <th class="optional-show">${variant.height || "-"}</th>
                                    <th class="left">${variant.description || ""}</th>
                                    <td class="only-logged-in ${gradeClass}">${variant.grade}</td>
                                    <td class="only-logged-in ${gradeClass}">${variant.price + ' €'}</td>
                                </tr>`;
                }
                this._table.find("tbody").append(rowsHTML);
                break;
            case "TER":
                for (let recordIdx in this._data) {
                    let record = this._data[recordIdx];
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
                    rowHTML = `<tr class="${record.notIssued?'not-issued':''}">
                                    <th rowspan=${rowspan} class="${thGradeClass}"><a class="${thGradeClass}" href="/catalogue/currency/index.html?currencyId=${record.currencyId}&seriesId=${record.seriesId}&denomination=${record.denomination}">${record.catalogueId}${record.notIssued?' (*)':''}</a></th>
                                    <th rowspan=${rowspan}><a href="/catalogue/currency/index.html?currencyId=${record.currencyId}">${record.currencyName}</a></th> 
                                    <th rowspan=${rowspan}>${record.denomination.toLocaleString("de-DE")}</th>
                                    <th rowspan=${rowspan}>${record.issueYear}</th>
                                    <th rowspan=${rowspan}>${record.printedDate || "ND"}</th>
                                    <th rowspan=${rowspan} class="left optional-show">${record.printer || "-"}</th>
                                    <th rowspan=${rowspan} class="optional-show">${record.width || "-"}</th>
                                    <th rowspan=${rowspan} class="optional-show">${record.height || "-"}</th>
                                    <th rowspan=${rowspan} class="left">${record.description || ""}</th>`;

                    if (record.items && record.items.length) {
                        rowHTML += `<td class="only-logged-in ${gradeClass}">${record.items[0].quantity}</td>
                                    <td class="only-logged-in ${gradeClass}">${record.items[0].grade}</td>
                                    <td class="only-logged-in ${gradeClass}">${record.items[0].price + " €"}</td>
                                    <td class="left only-logged-in ${gradeClass}">${record.items[0].seller || ""}</td>
                                    <td class="only-logged-in ${gradeClass}">${record.items[0].purchaseDate || ""}</td>
                                    <td class="left only-logged-in ${gradeClass}">${record.items[0].description || ""}</td>
                                </tr>`;

                        this._table.find("tbody").append(rowHTML);

                        if (Session.getUsername()) {
                            this._table.find("tbody>tr:last-of-type>td.only-logged-in").click(() => {
                                this._collectionForm(recordIdx);
                            });
                        }

                        for (let i = 1; i < record.items.length; i++) {
                            gradeClass = `${record.items[i].grade}-grade`;
                            rowHTML = `<tr>
                                        <td class="only-logged-in ${gradeClass}">${record.items[i].quantity}</td>
                                        <td class="only-logged-in ${gradeClass}">${record.items[i].grade}</td>
                                        <td class="only-logged-in ${gradeClass}">${record.items[i].price + " €"}</td>
                                        <td class="left only-logged-in ${gradeClass}">${record.items[i].seller || ""}</td>
                                        <td class="only-logged-in ${gradeClass}">${record.items[i].purchaseDate || ""}</td>
                                        <td class="left only-logged-in ${gradeClass}">${record.items[i].description || ""}</td>
                                    </tr>`;
                            this._table.find("tbody").append(rowHTML);

                            if (Session.getUsername()) {
                                this._table.find("tbody>tr:last-of-type>td.only-logged-in").click(() => {
                                    this._collectionForm(recordIdx);
                                });
                            }
                        }
                    } else {
                        rowHTML += `<td class="only-logged-in">0</td>
                                    <td class="only-logged-in">-</td>
                                    <td class="only-logged-in">0 €</td>
                                    <td class="left only-logged-in"></td>
                                    <td class="only-logged-in"></td>
                                    <td class="left only-logged-in"></td>
                                </tr>`;

                        this._table.find("tbody").append(rowHTML);

                        if (Session.getUsername()) {
                            this._table.find("tbody>tr:last-of-type>td.only-logged-in").click(() => {
                                this._collectionForm(recordIdx);
                            });
                        }
                    }
                }
                if (Session.getUsername()) {
                    this._table.find("tbody>tr>td.only-logged-in").css("cursor", "pointer");
                }

                break;
            case "CUR":
                for (let recordIdx in this._data) {
                    let record = this._data[recordIdx];
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
                    rowHTML = `<tr class="${record.notIssued?'not-issued':''}">
                                    <th rowspan=${rowspan} class="${thGradeClass}"><a class="${thGradeClass}" href="/catalogue/currency/index.html?currencyId=${record.currencyId}&seriesId=${record.seriesId}&denomination=${record.denomination}">${record.catalogueId}${record.notIssued?' (*)':''}</a></th>
                                    <th rowspan=${rowspan}>${record.denomination.toLocaleString("de-DE")}</th>
                                    <th rowspan=${rowspan}>${record.issueYear}</th>
                                    <th rowspan=${rowspan}>${record.printedDate || "ND"}</th>
                                    <th rowspan=${rowspan} class="left optional-show"><a href="/catalogue/currency/index.html?currencyId=${record.currencyId}&seriesId=${record.seriesId}">${record.seriesName}</a></th>
                                    <th rowspan=${rowspan} class="left optional-show">${record.printer || "-"}</th>
                                    <th rowspan=${rowspan} class="optional-show">${record.width || "-"}</th>
                                    <th rowspan=${rowspan} class="optional-show">${record.height || "-"}</th>
                                    <th rowspan=${rowspan} class="left">${record.description || ""}</th>`;

                    if (record.items && record.items.length) {
                        rowHTML += `<td class="only-logged-in ${gradeClass}">${record.items[0].quantity}</td>
                                    <td class="only-logged-in ${gradeClass}">${record.items[0].grade}</td>
                                    <td class="only-logged-in ${gradeClass}">${record.items[0].price + " €"}</td>
                                    <td class="left only-logged-in ${gradeClass}">${record.items[0].seller || ""}</td>
                                    <td class="only-logged-in ${gradeClass}">${record.items[0].purchaseDate || ""}</td>
                                    <td class="left only-logged-in ${gradeClass}">${record.items[0].description || ""}</td>
                                </tr>`;

                        this._table.find("tbody").append(rowHTML);

                        if (Session.getUsername()) {
                            this._table.find("tbody>tr:last-of-type>td.only-logged-in").click(() => {
                                this._collectionForm(recordIdx);
                            });
                        }

                        for (let i = 1; i < record.items.length; i++) {
                            gradeClass = `${record.items[i].grade}-grade`;
                            rowHTML = `<tr>
                                        <td class="only-logged-in ${gradeClass}">${record.items[i].quantity}</td>
                                        <td class="only-logged-in ${gradeClass}">${record.items[i].grade}</td>
                                        <td class="only-logged-in ${gradeClass}">${record.items[i].price + " €"}</td>
                                        <td class="left only-logged-in ${gradeClass}">${record.items[i].seller || ""}</td>
                                        <td class="only-logged-in ${gradeClass}">${record.items[i].purchaseDate || ""}</td>
                                        <td class="left only-logged-in ${gradeClass}">${record.items[i].description || ""}</td>
                                    </tr>`;
                            this._table.find("tbody").append(rowHTML);

                            if (Session.getUsername()) {
                                this._table.find("tbody>tr:last-of-type>td.only-logged-in").click(() => {
                                    this._collectionForm(recordIdx);
                                });
                            }
                        }
                    } else {
                        rowHTML += `<td class="only-logged-in">0</td>
                                    <td class="only-logged-in">-</td>
                                    <td class="only-logged-in">0 €</td>
                                    <td class="left only-logged-in"></td>
                                    <td class="only-logged-in"></td>
                                    <td class="left only-logged-in"></td>
                                </tr>`;

                        this._table.find("tbody").append(rowHTML);

                        if (Session.getUsername()) {
                            this._table.find("tbody>tr:last-of-type>td.only-logged-in").click(() => {
                                this._collectionForm(recordIdx);
                            });
                        }
                    }
                }
                if (Session.getUsername()) {
                    this._table.find("tbody>tr>td.only-logged-in").css("cursor", "pointer");
                }
                break;
        }
        if (existsNotIssued)
            this._table.after("<p class='not-issued'>(*) NOT ISSUED</p>");

        if (!Session.getUsername()) {
            this._table.find(".only-logged-in").css('opacity', '0.25');
        }
    }

    show() {
        this._table.show();
        if (!Session.getUsername()) {
            this._table.find("p.login-warning").show();
        }
    }

    hide() {
        this._table.hide();
        this._table.siblings().hide();
    }

    static _parseCatalogueId(catalogueId) {
        let record = {};
        record.catalogueIdPreffix = "";
        record.catalogueIdInt = 0;
        record.catalogueIdSuffix = "";

        for (let i = 0; i < catalogueId.length; i++) {
            let char = catalogueId[i];
            let integer = parseInt(char);
            if (isNaN(integer))
                record.catalogueIdPreffix += char;
            else {
                record.catalogueIdInt = parseInt(catalogueId.slice(i));
                record.catalogueIdSuffix = catalogueId.slice(i + record.catalogueIdInt.toString().length)
                break;
            }
        }

        return record;
    }

    _collectionForm(variantsIdx) {
        let variantJSON = this._data[variantsIdx];
        variantJSON.denominationStr = variantJSON.denomination + " " + variantJSON.currencyName;
        new UpsertCollectionForm(variantJSON, NotesListTable._gradesJSON, () => {
            location.reload();
        });
    }
}