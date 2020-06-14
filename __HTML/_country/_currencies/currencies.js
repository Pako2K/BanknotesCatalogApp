function loadCurrenciesTable(countryId) {
    let variantsUri;
    let itemsUri;
    if (getCookie("banknotes.ODB.username"))
        itemsUri = `/territory/${countryId}/currencies/items/stats`;
    else
        variantsUri = `/territory/${countryId}/currencies/variants/stats`;

    // Clean table body
    $("#currencies-table>tbody").empty();

    $.ajax({
        type: "GET",
        url: variantsUri || itemsUri,
        async: true,
        cache: false,
        timeout: 5000,
        dataType: 'json',
        success: function(currenciesJSON, status) {
            if (variantsUri) {
                // Add null collectionStats
                for (let row of currenciesJSON) {
                    row.collectionStats = {};
                    row.collectionStats.numCurrencies = 0;
                    row.collectionStats.numSeries = 0;
                    row.collectionStats.numDenominations = 0;
                    row.collectionStats.numNotes = 0;
                    row.collectionStats.numVariants = 0;
                    row.collectionStats.price = 0;
                }
            }

            fillTable(currenciesJSON);
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
}


function fillTable(currenciesJSON) {
    for (let currency of currenciesJSON) {
        let startDate = currency.start.slice(0, 4);
        let endDate = (currency.end || "").slice(0, 4);
        let iso3 = currency.iso3 || "-";

        let priceStr = (currency.collectionStats.price === 0) ? '-' : currency.collectionStats.price.toFixed(2) + ' €';
        let record = `  <tr>
                            <th>` + iso3 + `</th>
                            <th class="name"><a href="/_currency/index.html?currencyId=` + currency.id + `">${currency.name}</a></th>
                            <th>` + startDate + `</th>
                            <th>` + endDate + `</th>
                            <th>` + currency.currencyType + `</th>
                            <td>${currency.numSeries}</td>
                            <td class="only-logged-in">${currency.collectionStats.numSeries || "-"}</td>
                            <td>${currency.numDenominations}</td>
                            <td class="only-logged-in">${currency.collectionStats.numDenominations || "-"}</td>
                            <td>${currency.numNotes}</td>
                            <td class="only-logged-in">${currency.collectionStats.numNotes || "-"}</td>
                            <td>${currency.numVariants}</td>
                            <td class="only-logged-in">${currency.collectionStats.numVariants || "-"}</td>
                            <td class="only-logged-in">${priceStr}</td>
                        </tr>`;

        $("#currencies-table>tbody").append(record);
    }
    if (!getCookie("banknotes.ODB.username")) {
        $(".only-logged-in").hide();
        $('#currencies-table>thead>tr>th[colspan="2"]').attr("colspan", 1);
    }
}