"use strict"

$("body").ready(() => {

    // Get printers and issuers
    $.ajax({
        type: "GET",
        url: "/issuer",
        async: true,
        cache: true,
        timeout: 5000,
        dataType: 'json',

        success: function(issuersJSON, status) {
            storeIssuersTable(issuersJSON);
        },
        error: function(xhr, status, error) {
            alert(`Query failed. \n${status} - ${error}\nPlease contact the web site administrator.`);
        }
    });
    $.ajax({
        type: "GET",
        url: "/printer",
        async: true,
        cache: true,
        timeout: 5000,
        dataType: 'json',

        success: function(printersJSON, status) {
            storePrintersTable(printersJSON);
        },
        error: function(xhr, status, error) {
            alert(`Query failed. \n${status} - ${error}\nPlease contact the web site administrator.`);
        }
    });

});


function sortIssuer(htmlElem) {
    let mapKey = listTableSetSortingColumn(htmlElem);

    // Mapping column name - field name
    let mapFieldName = {
        "Name": "name",
        "Territory": "territoryName"
    };
    storeIssuersTable(JSON.parse($("#issuers-table").data("value")), mapFieldName[mapKey]);
}


function sortPrinter(htmlElem) {
    let mapKey = listTableSetSortingColumn(htmlElem);

    // Load table body
    // Mapping column name - field name
    let mapFieldName = {
        "Name": "name"
    };
    storePrintersTable(JSON.parse($("#printers-table").data("value")), "mapFieldName[mapKey]");
}


function storeIssuersTable(issuersJSON, sortingField) {
    // Retrieve sorting 
    let sortingAsc = $("#issuers-table .sort-selection").hasClass("sort-asc");

    if (sortingField) {
        let sortingFields = [sortingField];
        if (sortingField !== "name")
            sortingFields.push("name");

        issuersJSON = sortJSON(issuersJSON, sortingFields, sortingAsc);
    }

    $("#issuers-table").data("value", JSON.stringify(issuersJSON));

    // Load countries table body
    loadIssuersTable();
}


function storePrintersTable(printersJSON, sortingField) {
    // Retrieve sorting 
    let sortingAsc = $("#printers-table .sort-selection").hasClass("sort-asc");

    if (sortingField) {
        let sortingFields = [sortingField];
        if (sortingField !== "name")
            sortingFields.push("name");

        printersJSON = sortJSON(printersJSON, sortingFields, sortingAsc);
    }

    $("#printers-table").data("value", JSON.stringify(printersJSON));

    // Load countries table body
    loadPrintersTable();
}


function loadIssuersTable() {
    // Clean table body and foot
    $("#issuers-table>tbody").empty();

    // Retrieve issuers info in JSON object
    let issuersJSON = JSON.parse($("#issuers-table").data("value"));

    let record = "";

    for (let issuer of issuersJSON) {
        record = `  <tr>
                        <th class="title">${issuer.name}</th>
                        <th class="name"><a href="/_country/index.html?countryId=${issuer.territoryId}">${issuer.territoryName}</a></th>
                        <td class="text">${issuer.description || ""}</td>
                    </tr>`;
        $("#issuers-table>tbody").append(record);
    }
}


function loadPrintersTable() {
    // Clean table body and foot
    $("#printers-table>tbody").empty();

    // Retrieve issuers info in JSON object
    let printersJSON = JSON.parse($("#printers-table").data("value"));

    let record = "";

    for (let printer of printersJSON) {
        record = `  <tr>
                        <th class="title">${printer.name}</th>
                        <th class="text">${printer.location || ""}</th>
                        <td class="text">${printer.description || ""}</td>
                    </tr>`;
        $("#printers-table>tbody").append(record);
    }
}