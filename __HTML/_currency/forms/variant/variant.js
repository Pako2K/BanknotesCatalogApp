function initializeUpsertVariant(territory, seriesId, isOverstamped, banknoteId, denominationStr, variantId) {
    $("#upsert-variant-dialog").data("series-id", seriesId);
    $("#upsert-variant-dialog").data("banknote-id", banknoteId);
    $("#upsert-variant-dialog").data("variant-id", variantId);

    $("#upsert-variant-dialog>h4").text(`${denominationStr}`);

    $("#upsert-variant-dialog input[name='variant-printed-date']").focus();

    // If the series contains overstamped notes, then hide the "inherited" features
    if (isOverstamped) {
        // Fill-in the Countries
        $("#upsert-variant-dialog select[name='overstamped-territory']").append(`<option value='${territory.id}'>${territory.name}</option>`);
        $("#upsert-variant-dialog input[name='overstamped-cat-id']").val("P-");

        $(".non-overstamped").hide();
        $("select[name='overstamped-territory']").attr("required", "");
        $("input[name='overstamped-cat-id']").attr("required", "");
        $(".only-overstamped").show();
    } else {
        $(".non-overstamped").show();
        $("select[name='overstamped-territory']").removeAttr("required");
        $("input[name='overstamped-cat-id']").removeAttr("required");
        $(".only-overstamped").hide();
    }


    // Fill-in the printers
    $.ajax({
        type: "GET",
        url: `/printer`,
        contentType: "application/json",
        async: true,
        cache: false,
        timeout: 5000,
        dataType: 'json',

        success: function(result, status) {
            for (let printer of result)
                $("#upsert-variant-dialog select[name='variant-printer']").append(`<option value='${printer.id}'>${printer.name}</option>`);

            if (variantId) {
                $("#upsert-variant-dialog>h3").text(`Update Variant`);

                // Retrieve variant info 
                $.ajax({
                    type: "GET",
                    url: `/variant/${variantId}`,
                    async: true,
                    cache: false,
                    timeout: 5000,
                    dataType: 'json',

                    success: function(variant, status) {
                        $("#upsert-variant-dialog input[name='variant-printed-date']").val(variant.printedDate);
                        $("#upsert-variant-dialog input[name='variant-issue-year']").val(variant.issueYear);
                        $("#upsert-variant-dialog input[name='variant-catalogue-id']").val(variant.catalogueId);
                        $("#upsert-variant-dialog select[name='variant-printer']").val(variant.printerId);
                        $("#upsert-variant-dialog select[name='overstamped-territory']").val(variant.overstampedTerritoryId);
                        $("#upsert-variant-dialog input[name='overstamped-cat-id']").val(variant.overstampedCatalogueId);
                        $("#upsert-variant-dialog input[name='not-issued']").prop("checked", parseInt(variant.notIssued));
                        $("#upsert-variant-dialog input[name='variant-obverse-color']").val(variant.obverseColor);
                        $("#upsert-variant-dialog input[name='variant-reverse-color']").val(variant.reverseColor);
                        $("#upsert-variant-dialog input[name='variant-signature']").val(variant.signature);
                        $("#upsert-variant-dialog input[name='variant-signature-ext']").val(variant.signatureExt);
                        $("#upsert-variant-dialog input[name='variant-watermark']").val(variant.watermark);
                        $("#upsert-variant-dialog input[name='variant-security-thread']").val(variant.securityThread);
                        $("#upsert-variant-dialog input[name='variant-security']").val(variant.securityExt);

                        $("#upsert-variant-dialog input[name='is-specimen']").prop("checked", variant.isSpecimen);
                        $("#upsert-variant-dialog input[name='is-commemorative']").prop("checked", variant.isCommemorative);
                        $("#upsert-variant-dialog input[name='is-num-product']").prop("checked", variant.isNumismaticProduct);
                        $("#upsert-variant-dialog input[name='is-replacement']").prop("checked", variant.isReplacement);
                        $("#upsert-variant-dialog input[name='is-error']").prop("checked", variant.isError);

                        $("#upsert-variant-dialog input[name='variant-mintage']").val(variant.mintage);
                        $("#upsert-variant-dialog textarea[name='variant-description']").val(variant.description);
                    },
                    error: function(xhr, status, error) {
                        alert(`Query failed. \n${status} - ${error}\nPlease contact the web site administrator.`);
                    }
                });

            } else {
                $("#upsert-variant-dialog>h3").text(`Add New Variant`);
                $("#upsert-variant-dialog select[name='variant-printer']").val(0)
            }
        },

        error: function(xhr, status, error) {
            alert(`Query failed. \n${status} - ${error}\nPlease contact the web site administrator.`);
        }
    });
}


function closeUpsertVariant() {
    $("div.modal-form-placeholder").empty();
    $("div.modal-form-placeholder").hide();
}



function upsertVariant() {
    // Retrieve the note fields in case of new note
    let variant = {};
    let banknoteId = $("#upsert-variant-dialog").data("banknote-id");

    variant.variantId = $("#upsert-variant-dialog").data("variant-id") || 0;

    variant.issueYear = parseInt($("input[name='variant-issue-year']").val());
    if ($("input[name='variant-printed-date']").val() !== "")
        variant.printedDate = $("input[name='variant-printed-date']").val();
    if ($("input[name='variant-catalogue-id']").val() !== "")
        variant.catalogueId = $("input[name='variant-catalogue-id']").val();
    if ($("select[name='overstamped-territory']").val())
        variant.overstampedTerritoryId = parseInt($("select[name='overstamped-territory']").val());
    if ($("input[name='overstamped-cat-id']").val() !== "")
        variant.overstampedCatalogueId = $("input[name='overstamped-cat-id']").val();
    variant.notIssued = $("input[name='not-issued']").prop("checked");
    if ($("select[name='variant-printer']").val())
        variant.printerId = parseInt($("select[name='variant-printer']").val());
    if ($("input[name='variant-obverseColor']").val() !== "")
        variant.obverseColor = $("input[name='variant-obverse-color']").val();
    if ($("input[name='variant-reverseColor']").val() !== "")
        variant.reverseColor = $("input[name='variant-reverse-color']").val();
    if ($("input[name='variant-signature']").val() !== "")
        variant.signature = $("input[name='variant-signature']").val();
    if ($("input[name='variant-signature-ext']").val() !== "")
        variant.signatureExt = $("input[name='variant-signature-ext']").val();
    if ($("input[name='variant-watermark']").val() !== "")
        variant.watermark = $("input[name='variant-watermark']").val();
    if ($("input[name='variant-security-thread']").val() !== "")
        variant.securityThread = $("input[name='variant-security-thread']").val();
    if ($("textarea[name='variant-security']").val() !== "")
        variant.securityExt = $("textarea[name='variant-security']").val();
    variant.isSpecimen = $("input[name='is-specimen']").prop("checked");
    variant.isCommemorative = $("input[name='is-commemorative']").prop("checked");
    variant.isNumismaticProduct = $("input[name='is-num-product']").prop("checked");
    variant.isReplacement = $("input[name='is-replacement']").prop("checked");
    variant.isError = $("input[name='is-error']").prop("checked");
    if ($("input[name='variant-mintage']").val())
        variant.mintage = parseInt($("input[name='variant-mintage']").val());
    if ($("textarea[name='variant-description']").val() !== "")
        variant.description = $("textarea[name='variant-description']").val();

    if (!variant.variantId) {
        // Insert new variant        
        $.ajax({
            type: "PUT",
            url: `/denomination/${banknoteId}/variant`,
            contentType: "application/json",
            async: false,
            cache: false,
            data: JSON.stringify(variant),
            timeout: 5000,
            dataType: 'json',

            success: function(result, status) {
                loadSeriesDetails($("#upsert-variant-dialog").data("series-id"));

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
        // Update variant

        $.ajax({
            type: "PUT",
            url: `/variant/${variant.variantId}`,
            contentType: "application/json",
            async: false,
            cache: false,
            data: JSON.stringify(variant),
            timeout: 5000,
            dataType: 'json',

            success: function(result, status) {
                loadSeriesDetails($("#upsert-variant-dialog").data("series-id"));

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


function setIssueYear() {
    let printedDate = $("input[name='variant-printed-date']").val();
    let issueYear = $("input[name='variant-issue-year']").val();
    if (printedDate !== "" && !issueYear)
        $("input[name='variant-issue-year']").val(printedDate.split(".")[0]);
}