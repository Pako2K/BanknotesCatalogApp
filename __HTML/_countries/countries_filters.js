"use strict"

function setContinentImg() {
    $("#cont-img>img").attr("src", getSelectedImg());
}

$(window).resize(function() {
    let fontSize = calcFontSize();
    for (let filter of window.filters) {
        filter.setSize(fontSize);
    }
});

function calcFontSize() {
    if ($(window).width() < 400) return 10;
    else if ($(window).width() < 800) return 12;
    else return 13;
}


$("#countries-filters").ready(() => {
    // Load Country types synchronously, before anything else
    let terTypesJSON;
    $.ajax({
        type: "GET",
        url: `/territory-types`,
        async: false,
        cache: true,
        timeout: TIMEOUT,
        dataType: 'json',
        success: function(result, status) {
            // Store in table
            $("#countries-filters").data("territory-types", JSON.stringify(result));
            terTypesJSON = result;
        },
        error: function(xhr, status, error) {
            alert(`Query failed. \n${status} - ${error}\nPlease contact the web site administrator.`);
        }
    });

    let bodyHTML = ""
    for (let type of terTypesJSON) {
        bodyHTML += `<tr id="filter-row-${type.id}">
                        <th>
                            <div id="filter-row-${type.id}-check" class="check-button"></div>
                            <div>${type.name}</div>
                        </th>
                        <td class="existing-check sub-column-1"></td>
                        <td class="existing-check"></td>
                        <td class="existing-check only-logged-in"></td>
                        <td class="disappeared-check sub-column-1"></td>
                        <td class="disappeared-check"></td>
                        <td class="disappeared-check only-logged-in"></td>
                        <td class="sub-column-1"></td>
                        <td></td>
                        <td class="only-logged-in"></td>
                    </tr>`;
    }
    $(".stats-filter-table>tbody").append(bodyHTML);

    // Initialize stats and filters table
    let existingFlag = Number(getCookie("banknotes.ODB.filter.existing") || 1);
    let extinctFlag = Number(getCookie("banknotes.ODB.filter.extinct") || 1);
    let rowFlags = [];
    for (let type of terTypesJSON) {
        rowFlags.push(Number(getCookie(`banknotes.ODB.filter.countryTypeId-${type.id}`) || 1));
    }
    initStatsFilterTable($("table.stats-filter-table"), [existingFlag, extinctFlag], existsCheckChanged, rowFlags, terTypeCheckChanged)

    // Default "to" filter year : current year
    let year = getCookie("banknotes.ODB.filter.foundedTo");
    if (year && year !== "") {
        window.filters[0].initTo(year);
    }

    year = getCookie("banknotes.ODB.filter.foundedFrom");
    if (year && year !== "") {
        window.filters[0].initFrom(year);
    }

    year = getCookie("banknotes.ODB.filter.disappearedTo");
    if (year && year !== "") {
        window.filters[1].initTo(year);
    }

    year = getCookie("banknotes.ODB.filter.disappearedFrom");
    if (year && year !== "") {
        window.filters[1].initFrom(year);
    }
});


function existsCheckChanged(id, onFlag) {
    if (id === "existing-check") {
        setCookie("banknotes.ODB.filter.existing", onFlag ? 1 : 0);
    } else if (id === "disappeared-check") {
        setCookie("banknotes.ODB.filter.extinct", onFlag ? 1 : 0);
    }

    loadCountriesTable();
}


function terTypeCheckChanged(id, onFlag) {
    let typeId = id.split("-")[2];
    setCookie(`banknotes.ODB.filter.countryTypeId-${typeId}`, onFlag ? 1 : 0);

    loadCountriesTable();
}


function yearFilterChanged(filterName, from, to) {
    // Store value in the cookie
    if (filterName === "Founded") {
        setCookie("banknotes.ODB.filter.foundedFrom", from);
        setCookie("banknotes.ODB.filter.foundedTo", to);
    } else {
        setCookie("banknotes.ODB.filter.disappearedFrom", from);
        setCookie("banknotes.ODB.filter.disappearedTo", to);
    }

    // Load table body
    loadCountriesTable();
}