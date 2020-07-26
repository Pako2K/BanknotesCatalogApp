function loadYearsTable(countryId) {
    let variantsUri;
    let itemsUri;
    if (getCookie("banknotes.ODB.username"))
        itemsUri = `/territory/${countryId}/years/items/stats?dateType=issue`;
    else
        variantsUri = `/territory/${countryId}/years/variants/stats?dateType=issue`;

    // Clean table body
    $("#years-table>tbody").empty();

    $.ajax({
        type: "GET",
        url: variantsUri || itemsUri,
        async: true,
        cache: false,
        timeout: 5000,
        dataType: 'json',
        success: function(resultJSON, status) {
            if (variantsUri) {
                // Add null collectionStats
                for (let row of resultJSON) {
                    row.collectionStats = {};
                    row.collectionStats.numDenominations = 0;
                    row.collectionStats.numVariants = 0;
                    row.collectionStats.price = 0;
                }
            }

            fillYearsTable(resultJSON);
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
            }
        }
    });
}


function fillYearsTable(resultJSON) {
    for (let year of resultJSON) {
        let priceStr = (year.collectionStats.price === 0) ? '-' : year.collectionStats.price.toFixed(2) + ' €';
        let record = `  <tr>
                            <th>${year.issueYear}</a></th>
                            <td>${year.numDenominations}</td>
                            <td class="only-logged-in">${year.collectionStats.numDenominations || "-"}</td>
                            <td>${year.numVariants}</td>
                            <td class="only-logged-in">${year.collectionStats.numVariants || "-"}</td>
                            <td class="only-logged-in">${priceStr}</td>
                        </tr>`;

        $("#years-table>tbody").append(record);
    }
    if (!getCookie("banknotes.ODB.username")) {
        $(".only-logged-in").hide();
        $('#years-table>thead>tr>th[colspan="2"]').attr("colspan", 1);
    }
}