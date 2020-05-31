"use strict"

$("#series-stats").ready(() => {
    let currencyId = window.location.search.substr("?currencyId=".length);

    $.ajax({
        type: "GET",
        url: `/currency/${currencyId}/series`,
        async: true,
        cache: false,
        timeout: 5000,
        dataType: 'json',

        success: function(result, status) {

            if (getCookie("banknotes.ODB.username")) {
                $.ajax({
                    type: "GET",
                    url: `/currency/${currencyId}/items/stats?grouping=series`,
                    async: true,
                    cache: false,
                    timeout: 5000,
                    dataType: 'json',

                    success: function(collecResult, status) {
                        // Consolidate results with the currency info
                        let collecIndex = 0;
                        for (let row of collecResult) {
                            // Find position in the results
                            let pos = result.findIndex((elem) => { return elem.id === row.id; });
                            if (pos !== -1) {
                                result[pos].numDenominationsCol = row.numDenominations;
                                result[pos].numVariantsCol = row.numVariants;
                                result[pos].priceCol = row.price;
                            }
                        }

                        loadSeriesTable(result);
                    },
                    error: function(xhr, status, error) {
                        switch (xhr.status) {
                            case 403:
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
            } else {
                loadSeriesTable(result);
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
});


function loadSeriesTable(seriesJSON) {
    // Clean table body
    $("#series-stats>tbody").empty();

    let record = "";
    let count = seriesJSON.length;
    for (let i = count - 1; i >= 0; i--) {
        var startDate = seriesJSON[i].start;
        var endDate = seriesJSON[i].end;
        if (endDate == null)
            endDate = "";

        record = `  <tr>
                        <th class="name" onclick="$('#series-id').text(` + seriesJSON[i].id + `);$('#series-list-view').trigger('click')">` + seriesJSON[i].name + `</th>
                        <th>` + startDate + `</th>
                        <th>` + endDate + `</th>
                        <td>${seriesJSON[i].numDenominations}</td>
                        <td class="only-logged-in">${seriesJSON[i].numDenominationsCol || 0}</td>
                        <td>${seriesJSON[i].numVariants}</td>
                        <td class="only-logged-in">${seriesJSON[i].numVariantsCol || 0}</td>
                        <td class="only-logged-in">${seriesJSON[i].priceCol || 0} €</td>
                    </tr>`;
        $("#series-stats>tbody").prepend(record);
    }

    if (getCookie("banknotes.ODB.username") === undefined) {
        $(".only-logged-in").hide();
        $('#series-stats>thead>tr>th[colspan="2"]').attr("colspan", 1);
    }
}



$("#denominations-stats").ready(() => {
    let currencyId = window.location.search.substr("?currencyId=".length);

    $.ajax({
        type: "GET",
        url: `/currency/${currencyId}/banknotes`,
        async: true,
        cache: false,
        timeout: 5000,
        dataType: 'json',

        success: function(result, status) {
            if (getCookie("banknotes.ODB.username")) {
                $.ajax({
                    type: "GET",
                    url: `/currency/${currencyId}/items/stats?grouping=denomination`,
                    async: true,
                    cache: false,
                    timeout: 5000,
                    dataType: 'json',

                    success: function(collecResult, status) {
                        // Consolidate results with the currency info
                        let collecIndex = 0;
                        for (let row of collecResult) {
                            // Find position in the results
                            let pos = result.findIndex((elem) => { return elem.denomination === row.denomination; });
                            if (pos !== -1) {
                                result[pos].numSeriesCol = row.numSeries;
                                result[pos].numVariantsCol = row.numVariants;
                                result[pos].priceCol = row.price;
                            }
                        }

                        loadDenominationsTable(result);
                    },
                    error: function(xhr, status, error) {
                        switch (xhr.status) {
                            case 403:
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
            } else {
                loadDenominationsTable(result);
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
});


function loadDenominationsTable(banknotesJSON) {
    // Clean table body
    $("#denominations-stats>tbody").empty();

    let record = "";
    let count = banknotesJSON.length;
    for (let i = count - 1; i >= 0; i--) {
        record = `  <tr>
                        <th>` + banknotesJSON[i].denomination + `</th>
                        <td>${banknotesJSON[i].numSeries}</td>
                        <td class="only-logged-in">${banknotesJSON[i].numSeriesCol || 0}</td>
                        <td>${banknotesJSON[i].numVariants}</td>
                        <td class="only-logged-in">${banknotesJSON[i].numVariantsCol || 0}</td>
                        <td class="only-logged-in">${banknotesJSON[i].priceCol || 0} €</td>
                    </tr>`;
        $("#denominations-stats>tbody").prepend(record);
    }

    if (getCookie("banknotes.ODB.username") === undefined) {
        $(".only-logged-in").hide();
        $('#denominations-stats>thead>tr>th[colspan="2"]').attr("colspan", 1);
    }
}


$("#years-stats").ready(() => {
    let currencyId = window.location.search.substr("?currencyId=".length);

    $.ajax({
        type: "GET",
        url: `/currency/${currencyId}/variants/years`,
        async: true,
        cache: false,
        timeout: 5000,
        dataType: 'json',

        success: function(result, status) {
            if (getCookie("banknotes.ODB.username")) {
                $.ajax({
                    type: "GET",
                    url: `/currency/${currencyId}/items/stats?grouping=year`,
                    async: true,
                    cache: false,
                    timeout: 5000,
                    dataType: 'json',

                    success: function(collecResult, status) {
                        // Consolidate results 
                        let collecIndex = 0;
                        for (let row of collecResult) {
                            // Find position in the results
                            let pos = result.findIndex((elem) => { return elem.issueYear === row.issueYear; });
                            if (pos !== -1) {
                                result[pos].numDenominationsCol = row.numDenominations;
                                result[pos].numVariantsCol = row.numVariants;
                                result[pos].priceCol = row.price;
                            }
                        }

                        loadYearsTable(result);
                    },
                    error: function(xhr, status, error) {
                        switch (xhr.status) {
                            case 403:
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
            } else {
                loadYearsTable(result);
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
});


function loadYearsTable(yearsJSON) {
    // Clean table body
    $("#years-stats>tbody").empty();

    let record = "";
    let count = yearsJSON.length;
    for (let i = count - 1; i >= 0; i--) {
        record = `  <tr>
                        <th>` + yearsJSON[i].issueYear + `</th>
                        <td>${yearsJSON[i].numDenominations}</td>
                        <td class="only-logged-in">${yearsJSON[i].numDenominationsCol || 0}</td>
                        <td>${yearsJSON[i].numVariants}</td>
                        <td class="only-logged-in">${yearsJSON[i].numVariantsCol || 0}</td>
                        <td class="only-logged-in">${yearsJSON[i].priceCol || 0} €</td>
                    </tr>`;
        $("#years-stats>tbody").prepend(record);
    }

    if (getCookie("banknotes.ODB.username") === undefined) {
        $(".only-logged-in").hide();
        $('#years-stats>thead>tr>th[colspan="2"]').attr("colspan", 1);
    }
}