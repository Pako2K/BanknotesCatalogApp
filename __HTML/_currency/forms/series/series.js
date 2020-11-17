function initializeUpsertSeries(currencyJSON, seriesJSON) {
    $("#upsert-series-dialog").data("currency-id", currencyJSON.id);

    $("#upsert-series-dialog input[name='series-name']").focus();

    // Fill-in the issuers
    $.ajax({
        type: "GET",
        url: `/territory/${currencyJSON.territoryId}/issuer`,
        contentType: "application/json",
        async: true,
        cache: false,
        timeout: TIMEOUT,
        dataType: 'json',

        success: function(result, status) {

            for (let issuer of result) {
                $("#issuers").append(`<option value='${issuer.name}' data-id='${issuer.id}'>`);
                if (seriesJSON && !seriesJSON.issuerName && seriesJSON.issuerId === issuer.id)
                    seriesJSON.issuerName = issuer.name;
            }

            if (seriesJSON)
                $("#upsert-series-dialog input[name='series-issuer']").val(seriesJSON.issuerName);
        },

        error: function(xhr, status, error) {
            alert(`Query failed. \n${status} - ${error}\nPlease contact the web site administrator.`);
        }
    });


    $("#upsert-series-dialog").data("territory-id", currencyJSON.territoryId);
    if (seriesJSON) {
        $("#upsert-series-dialog").data("series-id", seriesJSON.id);

        $("#upsert-series-dialog>h3").text('Update Series');
        $("#upsert-series-dialog>h4").text(`${currencyJSON.name} - ${seriesJSON.name || "New Issue"}`);

        // Show values in the form
        $("#upsert-series-dialog input[name='series-name']").val(seriesJSON.name);
        $("#upsert-series-dialog input[name='series-start']").val(seriesJSON.start);
        $("#upsert-series-dialog input[name='series-end']").val(seriesJSON.end);
        $("#upsert-series-dialog input[name='is-overstamped']").prop("checked", seriesJSON.isOverstamped);
        $("#upsert-series-dialog input[name='series-law-date']").val(seriesJSON.lawDate);
        $("#upsert-series-dialog textarea[name='series-description']").val(seriesJSON.description);
    } else {
        $("#upsert-series-dialog>h3").text(`Add New Issue`);
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

    let issuerName = $("input[name='series-issuer']").val();
    if (issuerName) {
        // Get list of options
        let datalistId = $("input[name='series-issuer']").attr("list");
        let options = $(`#${datalistId} option`);
        for (let option of options) {
            if ($(option).attr("value") === issuerName) {
                series.issuerId = parseInt($(option).data("id"));
                break;
            }
        }
    }

    // New issuer!
    if (!series.issuerId) {
        if (!confirm("A new issuer will be created!")) return;

        $.ajax({
            type: "PUT",
            url: `/issuer`,
            contentType: "application/json",
            async: false,
            cache: false,
            data: JSON.stringify({ name: issuerName, territoryId: $("#upsert-series-dialog").data("territory-id") }),
            timeout: TIMEOUT,
            dataType: 'json',

            success: function(result, status) {
                series.issuerId = result.id;
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


    series.isOverstamped = $("input[name='is-overstamped']").prop("checked");
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
            timeout: TIMEOUT,
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
            timeout: TIMEOUT,
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