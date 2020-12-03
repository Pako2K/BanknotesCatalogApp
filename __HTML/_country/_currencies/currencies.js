function loadCurrenciesTable(territoryId) {
    let variantsUri;
    let itemsUri;
    if (getCookie("BOC.user.name"))
        itemsUri = `/territory/${territoryId}/currencies/items/stats`;
    else
        variantsUri = `/territory/${territoryId}/currencies/variants/stats`;

    $("#grades-div").hide();

    // Clean table body
    $("#currencies-table>tbody").empty();

    $.ajax({
        type: "GET",
        url: variantsUri || itemsUri,
        async: true,
        cache: false,
        timeout: TIMEOUT,
        dataType: 'json',
        success: function(currenciesJSON, status) {
            // Store Currencies info (needed in the List option)
            $(document).data("currencies-summary", JSON.stringify(currenciesJSON));

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

            fillTable(currenciesJSON, territoryId);
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


function fillTable(currenciesJSON, territoryId) {
    for (let currency of currenciesJSON) {
        let startDate = currency.start.slice(0, 4);
        let endDate = (currency.end || "").slice(0, 4);
        let iso3 = currency.iso3 || "-";

        let queryParams = `currencyId=${currency.id}`;
        if (currency.isIssuer && territoryId) {
            queryParams += `&territoryId=${territoryId}`;
        }

        let priceStr = (currency.collectionStats.price === 0) ? '-' : currency.collectionStats.price.toFixed(2) + ' €';
        let record = `  <tr>
                            <th>` + iso3 + `</th>
                            <th class="name"><a href="/_currency/index.html?${queryParams}">${currency.name}</a></th>
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
    if (!getCookie("BOC.user.name")) {
        $(".only-logged-in").css('opacity', '0.25');
        // Show warning
        $("p.not-logged-in").show();
    }
}