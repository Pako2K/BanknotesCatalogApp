function initializeUpsertDenomination(currencyJSON, seriesJSON, noteJSON) {
    $("#upsert-note-dialog").data("currency-id", currencyJSON.id);
    $("#upsert-note-dialog").data("series-id", seriesJSON.id);

    $("#upsert-note-dialog>h4").text(`${currencyJSON.name} - ${seriesJSON.name}`);

    // Fill-in the materials
    $.ajax({
        type: "GET",
        url: `/material`,
        contentType: "application/json",
        async: true,
        cache: false,
        timeout: 5000,
        dataType: 'json',

        success: function(result, status) {
            for (let material of result)
                $("#upsert-note-dialog select[name='note-material']").append(`<option value='${material.id}'>${material.name}</option>`);

            if (noteJSON)
                $("#upsert-note-dialog select[name='note-material']").val(noteJSON.materialId)
            else
                $("#upsert-note-dialog select[name='note-material']").val(0)
        },

        error: function(xhr, status, error) {
            alert(`Query failed. \n${status} - ${error}\nPlease contact the web site administrator.`);
        }
    });

    if (noteJSON) {
        $("#upsert-note-dialog>h3").text('Update Denomination');
        $("#upsert-note-dialog").data("banknote-id", noteJSON.id);

        // Show values in the form
        $("#upsert-note-dialog input[name='note-face-value']").val(noteJSON.faceValue || noteJSON.denomination);

        $("#note-units-select").append(`<option value='${noteJSON.unitId || 0}'>${noteJSON.unitName || currencyJSON.name}</option>`);
        $("#note-units-select").val(noteJSON.unitId || 0);

        $("#upsert-note-dialog input[name='note-width']").val(noteJSON.width);
        $("#upsert-note-dialog input[name='note-height']").val(noteJSON.height);
        $("#upsert-note-dialog textarea[name='note-obverse-desc']").val(noteJSON.obverseDescription);
        $("#upsert-note-dialog textarea[name='note-reverse-desc']").val(noteJSON.reverseDescription);
        $("#upsert-note-dialog textarea[name='note-desc']").val(noteJSON.description);
        // Disable key fields
        $("#upsert-note-dialog input[name='note-face-value']").attr("disabled", "");
        $("#note-units-select").attr("disabled", "");
    } else {
        $("#upsert-note-dialog>h3").text(`Add New Denomination`);
        // Fill the select options
        $("#note-units-select").append(`<option value='0'>${currencyJSON.name}</option>`);
        for (let unit of currencyJSON.units)
            $("#note-units-select").append(`<option value='${unit.id}'>${unit.name}</option>`);
        $("#note-units-select").val("0");
    }
}


function closeUpsertDenomination() {
    $("div.modal-form-placeholder").empty();
    $("div.modal-form-placeholder").hide();
}


function upsertNote() {
    // Retrieve the note fields in case of new note
    let seriesId = $("#upsert-note-dialog").data("series-id");
    let banknote = {};
    let banknoteId = $("#upsert-note-dialog").data("banknote-id");
    banknote.faceValue = parseFloat($("input[name='note-face-value']").val());
    banknote.unitId = parseInt($("#note-units-select").val());
    banknote.materialId = parseInt($("select[name='note-material']").val());
    if ($("input[name='note-width']").val() !== "")
        banknote.width = parseInt($("input[name='note-width']").val());
    if ($("input[name='note-height']").val() !== "")
        banknote.height = parseInt($("input[name='note-height']").val());
    if ($("textarea[name='note-obverse-desc']").val() !== "")
        banknote.obverseDescription = $("textarea[name='note-obverse-desc']").val();
    if ($("textarea[name='note-reverse-desc']").val() !== "")
        banknote.reverseDescription = $("textarea[name='note-reverse-desc']").val();
    if ($("textarea[name='note-desc']").val() !== "")
        banknote.description = $("textarea[name='note-desc']").val();


    if (!banknoteId) {
        // Insert new denomination
        $.ajax({
            type: "PUT",
            url: `/series/${seriesId}/denomination`,
            contentType: "application/json",
            async: false,
            cache: false,
            data: JSON.stringify(banknote),
            timeout: 5000,
            dataType: 'json',

            success: function(result, status) {
                loadSeriesDetails(seriesId);

                // Close the window
                closeUpsertDenomination();
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
        // Update denomination

        $.ajax({
            type: "PUT",
            url: `/denomination/${banknoteId}`,
            contentType: "application/json",
            async: false,
            cache: false,
            data: JSON.stringify(banknote),
            timeout: 5000,
            dataType: 'json',

            success: function(result, status) {
                loadSeriesDetails(seriesId);

                // Close the window
                closeUpsertDenomination();
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