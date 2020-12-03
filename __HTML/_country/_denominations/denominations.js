function loadDenominationsTable(countryId) {
    let variantsUri;
    let itemsUri;
    if (getCookie("BOC.user.name"))
        itemsUri = `/territory/${countryId}/denominations/items/stats`;
    else
        variantsUri = `/territory/${countryId}/denominations/variants/stats`;

    $("#grades-div").hide();

    // Clean table body
    $("#denominations-table>tbody").empty();

    $.ajax({
        type: "GET",
        url: variantsUri || itemsUri,
        async: true,
        cache: false,
        timeout: TIMEOUT,
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
    // Aggregate with the denominations if the value is the same (This can happend when the units are different)
    let aggDenominations = [];
    if (resultJSON.length)
        aggDenominations.push(resultJSON[0]);
    for (let i = 1; i < resultJSON.length; i++) {
        let j = aggDenominations.length - 1;
        if (resultJSON[i].denomination.toLocaleString("de-DE") === aggDenominations[j].denomination.toLocaleString("de-DE")) {
            aggDenominations[j].numCurrencies += resultJSON[i].numCurrencies;
            aggDenominations[j].collectionStats.numCurrencies += resultJSON[i].collectionStats.numCurrencies;
            aggDenominations[j].numSeries += resultJSON[i].numSeries;
            aggDenominations[j].collectionStats.numSeries += resultJSON[i].collectionStats.numSeries;
            aggDenominations[j].numVariants += resultJSON[i].numVariants;
            aggDenominations[j].collectionStats.numVariants += resultJSON[i].collectionStats.numVariants;
            aggDenominations[j].collectionStats.price = parseFloat(aggDenominations[j].collectionStats.price) + parseFloat(resultJSON[i].collectionStats.price);
        } else {
            aggDenominations.push(resultJSON[i]);
        }
    }


    for (let denomination of aggDenominations) {
        let priceStr = (denomination.collectionStats.price === 0) ? '-' : denomination.collectionStats.price.toFixed(2) + ' €';
        let record = `  <tr>
                            <th>${denomination.denomination.toLocaleString("de-DE")}</a></th>
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
    if (!getCookie("BOC.user.name")) {
        $(".only-logged-in").css('opacity', '0.25');
        // Show warning
        $("p.not-logged-in").show();
    }
}