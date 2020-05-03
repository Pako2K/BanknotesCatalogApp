"use strict"

function setContinentImg() {
    $("#cont-img>img").attr("src", getSelectedImg());
}


$("#countries-filters").ready(() => {
    // Load Country types synchronously, before anything else
    let terTypesJSON;
    $.ajax({
        type: "GET",
        url: `/territory-types`,
        async: false,
        cache: true,
        timeout: 5000,
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
    let year = getCookie("banknotes.ODB.filter.yearTo");
    if (!year) {
        year = new Date().getFullYear();
        $("#input-year-to").val(year);
        setCookie("banknotes.ODB.filter.yearTo", year);
    } else {
        $("#input-year-to").val(year);
    }

    year = getCookie("banknotes.ODB.filter.yearFrom");
    if (year) {
        $("#input-year-from").val(year);
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


function yearFilterChanged(elemId) {
    // Store value in the cookie
    if (elemId === "input-year-from")
        setCookie("banknotes.ODB.filter.yearFrom", $("#" + elemId).val());
    else
        setCookie("banknotes.ODB.filter.yearTo", $("#" + elemId).val());

    // Load table body
    loadCountriesTable();
}