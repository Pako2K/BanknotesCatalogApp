function initializeUpsertSeries(currencyJSON, seriesJSON) {
    $("#upsert-series-dialog").data("currency-id", currencyJSON.id);

    // Fill-in the issuers
    $.ajax({
        type: "GET",
        url: `/issuer`,
        contentType: "application/json",
        async: true,
        cache: false,
        timeout: 5000,
        dataType: 'json',

        success: function(result, status) {
            for (let issuer of result)
                $("#upsert-series-dialog select[name='series-issuer']").append(`<option value='${issuer.id}'>${issuer.name}</option>`);

            if (seriesJSON)
                $("#upsert-series-dialog select[name='series-issuer']").val(seriesJSON.issuerId)
            else
                $("#upsert-series-dialog select[name='series-issuer']").val(0)
        },

        error: function(xhr, status, error) {
            alert(`Query failed. \n${status} - ${error}\nPlease contact the web site administrator.`);
        }
    });


    if (seriesJSON) {
        $("#upsert-series-dialog").data("series-id", seriesJSON.id);

        $("#upsert-series-dialog>h3").text('Update Series');
        $("#upsert-series-dialog>h4").text(`${currencyJSON.name} - ${seriesJSON.name || "New Series"}`);

        // Show values in the form
        $("#upsert-series-dialog input[name='series-name']").val(seriesJSON.name);
        $("#upsert-series-dialog input[name='series-start']").val(seriesJSON.start);
        $("#upsert-series-dialog input[name='series-end']").val(seriesJSON.end);
        $("#upsert-series-dialog input[name='series-law-date']").val(seriesJSON.lawDate);
        $("#upsert-series-dialog textarea[name='series-description']").val(seriesJSON.description);
    } else {
        $("#upsert-series-dialog>h3").text(`Add New Series`);
        $("#upsert-series-dialog>h4").text("");
    }
}

function closeUpsertSeries() {
    $("div.modal-form-placeholder").empty();
    $("div.modal-form-placeholder").hide();
}

function upsertSeries() {
    // Retrieve the series fields 
    let series = {};
    if ($("#upsert-series-dialog").data("series-id"))
        series.id = parseInt($("#upsert-series-dialog").data("series-id"));
    let currencyId = $("#upsert-series-dialog").data("currency-id");
    series.name = $("input[name='series-name']").val();
    series.start = parseInt($("input[name='series-start']").val());
    if ($("input[name='series-end']").val() !== "")
        series.end = parseInt($("input[name='series-end']").val());
    if ($("select[name='series-issuer']").val())
        series.issuerId = parseInt($("select[name='series-issuer']").val());
    if ($("input[name='series-law-date']").val() !== "")
        series.lawDate = $("input[name='series-law-date']").val();
    if ($("textarea[name='series-description']").val() !== "")
        series.description = $("textarea[name='series-description']").val();


    if (!series.id) {
        // Insert new series
        series.id = 0;
        $.ajax({
            type: "PUT",
            url: `/currency/${currencyId}/series`,
            contentType: "application/json",
            async: false,
            cache: false,
            data: JSON.stringify(series),
            timeout: 5000,
            dataType: 'json',

            success: function(result, status) {
                location.reload();
            },

            error: function(xhr, status, error) {
                switch (xhr.status) {
                    case 400:
                        alert("Data is not correct.\n" + xhr.responseJSON.code + ": " + xhr.responseJSON.description);
                        break;
                    case 403:
                        alert("Your session is not a valid Admin session or has expired.");
                        _clearSessionCookies();
                        location.reload();
                        break;
                    default:
                        alert(`Query failed. \n${status} - ${error}\nPlease contact the web site administrator.`);
                }
            }
        });
    } else {
        // Update series

        $.ajax({
            type: "PUT",
            url: `/series/${series.id}`,
            contentType: "application/json",
            async: false,
            cache: false,
            data: JSON.stringify(series),
            timeout: 5000,
            dataType: 'json',

            success: function(result, status) {
                location.reload();
            },

            error: function(xhr, status, error) {
                switch (xhr.status) {
                    case 400:
                        alert("Data is not correct.\n" + xhr.responseJSON.code + ": " + xhr.responseJSON.description);
                        break;
                    case 403:
                        alert("Your session is not a valid Admin session or has expired.");
                        _clearSessionCookies();
                        location.reload();
                        break;
                    default:
                        alert(`Query failed. \n${status} - ${error}\nPlease contact the web site administrator.`);
                }
            }
        });
    }
}