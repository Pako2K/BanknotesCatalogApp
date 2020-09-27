function loadSeriesTable(countryId) {
    let variantsUri;
    let itemsUri;
    if (getCookie("banknotes.ODB.username"))
        itemsUri = `/territory/${countryId}/series/items/stats`;
    else
        variantsUri = `/territory/${countryId}/series/variants/stats`;

    // Clean table body
    $("#series-table>tbody").empty();

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

            fillSeriesTable(resultJSON);
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


function fillSeriesTable(resultJSON) {
    for (let series of resultJSON) {
        let priceStr = (series.collectionStats.price === 0) ? '-' : series.collectionStats.price.toFixed(2) + ' €';
        let record = `  <tr>
                            <th class="name"><a href="/_currency/index.html?currencyId=${series.currency.id}&seriesId=${series.id}">${ series.name}</a></th>
                            <th>${series.currency.name}</th>
                            <th>${series.start}</th>
                            <th>${series.end || ""}</th>
                            <td>${series.numDenominations}</td>
                            <td class="only-logged-in">${series.collectionStats.numDenominations || "-"}</td>
                            <td>${series.numVariants}</td>
                            <td class="only-logged-in">${series.collectionStats.numVariants || "-"}</td>
                            <td class="only-logged-in">${priceStr}</td>
                        </tr>`;

        $("#series-table>tbody").append(record);
    }
    if (!getCookie("banknotes.ODB.username")) {
        $(".only-logged-in").css('opacity', '0.25');
        // Show warning
        $("p.not-logged-in").show();
    }
}