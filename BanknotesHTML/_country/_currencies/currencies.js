function loadCurrenciesTable(countryId) {
    // Clean table body
    $("#currencies-table>tbody").empty();

    $.ajax({
        type: "GET",
        url: `/territory/${countryId}/currencies`,
        async: true,
        cache: false,
        timeout: 5000,
        dataType: 'json',
        success: function(currenciesJSON, status) {
            // Add collection element
            for (let currency of currenciesJSON) {
                currency.collection = {};
            }

            if (getCookie("banknotes.ODB.username")) {
                $.ajax({
                    type: "GET",
                    url: `/territory/${countryId}/items/stats?grouping=currency`,
                    async: true,
                    cache: false,
                    timeout: 5000,
                    dataType: 'json',

                    success: function(collecResult, status) {
                        // Consolidate results with the countries info
                        let collecIndex = 0;
                        for (let currency of currenciesJSON) {
                            if (collecIndex === collecResult.length)
                                break;
                            if (currency.id === collecResult[collecIndex].id) {
                                currency.collection.numDenominations = collecResult[collecIndex].numDenominations;
                                currency.collection.numSeries = collecResult[collecIndex].numSeries;
                                currency.collection.numNotes = collecResult[collecIndex].numNotes;
                                currency.collection.numVariants = collecResult[collecIndex].numVariants;
                                currency.collection.price = collecResult[collecIndex].price;

                                collecIndex++;
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
            } else {
                fillTable(currenciesJSON);
                $(".only-logged-in").hide();
                $('#currencies-table>thead>tr>th[colspan="2"]').attr("colspan", 1);
            }

        },
        error: function(xhr, status, error) {
            alert(`Query failed. \n${status} - ${error}\nPlease contact the web site administrator.`);
        }
    });
}


function fillTable(currenciesJSON) {
    for (let currency of currenciesJSON) {
        let startDate = currency.start.slice(0, 4);
        let endDate = (currency.end || "").slice(0, 4);
        let iso3 = currency.iso3 || "-";

        let record = `  <tr>
                            <th>` + iso3 + `</th>
                            <th class="name"><a href="/_currency/index.html?currencyId=` + currency.id + `">${currency.name}</a></th>
                            <th>` + startDate + `</th>
                            <th>` + endDate + `</th>
                            <th>` + currency.currencyType + `</th>
                            <td>${currency.numSeries}</td>
                            <td class="only-logged-in">${currency.collection.numSeries || "-"}</td>
                            <td>${currency.numDenominations}</td>
                            <td class="only-logged-in">${currency.collection.numDenominations || "-"}</td>
                            <td>${currency.numNotes}</td>
                            <td class="only-logged-in">${currency.collection.numNotes || "-"}</td>
                            <td>${currency.numVariants}</td>
                            <td class="only-logged-in">${currency.collection.numVariants || "-"}</td>
                            <td class="only-logged-in">${currency.collection.price || "-"} €</td>
                        </tr>`;

        $("#currencies-table>tbody").append(record);
    }
}