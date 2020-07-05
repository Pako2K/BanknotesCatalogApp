function loadDenominationsTable(countryId) {
    let variantsUri;
    let itemsUri;
    if (getCookie("banknotes.ODB.username"))
        itemsUri = `/territory/${countryId}/denominations/items/stats`;
    else
        variantsUri = `/territory/${countryId}/denominations/variants/stats`;

    // Clean table body
    $("#denominations-table>tbody").empty();

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
                    row.collectionStats.numCurrencies = 0;
                    row.collectionStats.numSeries = 0;
                    row.collectionStats.numVariants = 0;
                    row.collectionStats.price = 0;
                }
            }

            fillDenominationsTable(resultJSON);
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


function fillDenominationsTable(resultJSON) {
    for (let denomination of resultJSON) {
        let priceStr = (denomination.collectionStats.price === 0) ? '-' : denomination.collectionStats.price.toFixed(2) + ' €';
        let record = `  <tr>
                            <th>${denomination.denomination}</a></th>
                            <td>${denomination.numCurrencies}</td>
                            <td class="only-logged-in">${denomination.collectionStats.numCurrencies || "-"}</td>
                            <td>${denomination.numSeries}</td>
                            <td class="only-logged-in">${denomination.collectionStats.numSeries || "-"}</td>
                            <td>${denomination.numVariants}</td>
                            <td class="only-logged-in">${denomination.collectionStats.numVariants || "-"}</td>
                            <td class="only-logged-in">${priceStr}</td>
                        </tr>`;

        $("#denominations-table>tbody").append(record);
    }
    if (!getCookie("banknotes.ODB.username")) {
        $(".only-logged-in").hide();
        $('#denominations-table>thead>tr>th[colspan="2"]').attr("colspan", 1);
    }
}