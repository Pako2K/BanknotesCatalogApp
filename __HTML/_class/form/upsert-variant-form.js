class UpsertVariantForm extends ModalForm {
    static FORM_HTML = `
        <div class="inline-fields">
            <div>
                <p class="field-title">Printed date</p>
                <input name="variant-printed-date" type="text" size="12" maxlength="10" autocomplete="off" onfocusout="UpsertVariantForm.setIssueYear()" />
            </div>
            <div>
                <p class="field-title required-input">Issue year</p>
                <input name="variant-issue-year" type="number" style="width: 6em" required/>
            </div>
            <div>
                <p class="field-title required-input">Catalogue Id</p>
                <input value="P-" name="variant-catalogue-id" type="text" size="10" maxlength="12" autocomplete="off" required/>
            </div>
        </div>

        <div class="fields-group only-overstamped">
            <p class="field-title required-input">Overstamped Banknote</p>
            <div class="inline-fields">
                <div>
                    <p class="field-title required-input">Territory</p>
                    <select name="overstamped-territory" style="width: 14em" required/>
                </div>
                <div>
                    <p class="field-title required-input">Catalogue Id</p>
                    <input value="" name="overstamped-cat-id" type="text" size="10" maxlength="12" autocomplete="off" required/>
                </div>
            </div>
        </div>
        <div class="flag-fields">
            <div>
                <input type="checkbox" name="not-issued" value="1">
                <span>NOT ISSUED</span>
            </div>
        </div>
        <div>
            <p class="field-title">Printer</p>
            <select name="variant-printer" style="width: 25em" />
        </div>
        <div class="inline-fields non-overstamped">
            <div>
                <p class="field-title">Obverse Color</p>
                <input name="variant-obverse-color" type="text" size="16" maxlength="25" autocomplete="off" />
            </div>
            <div>
                <p class="field-title">Reverse Color</p>
                <input name="variant-reverse-color" type="text" size="16" maxlength="25" autocomplete="off" />
            </div>
        </div>
        <div class="non-overstamped">
            <p class="field-title">Signature</p>
            <input name="variant-signature" type="text" size="36" maxlength="60" autocomplete="off" />
        </div>
        <div class="non-overstamped">
            <p class="field-title">Watermark</p>
            <input name="variant-watermark" type="text" size="36" maxlength="60" autocomplete="off" />
        </div>
        <div class="non-overstamped">
            <p class="field-title">Security thread</p>
            <input name="variant-security-thread" type="text" size="36" maxlength="40" autocomplete="off"></input>
        </div>
        <div class="non-overstamped">
            <p class="field-title">Other Security features</p>
            <textarea name="variant-security" rows="1" cols="36"></textarea>
        </div>
        <div class="flag-fields non-overstamped">
            <div>
                <input type="checkbox" name="is-specimen" value="1">
                <span>Specimen</span>
            </div>
            <div>
                <input type="checkbox" name="is-replacement" value="1">
                <span>Replacement</span>
            </div>
            <div>
                <input type="checkbox" name="is-error" value="1">
                <span>Error</span>
            </div>
            <div>
                <input type="checkbox" name="is-commemorative" value="1">
                <span>Commemorative</span>
            </div>
            <div>
                <input type="checkbox" name="is-num-product" value="1">
                <span>Numismatic Product</span>
            </div>
        </div>
        <div class="non-overstamped">
            <p class="field-title">Mintage</p>
            <input name="variant-mintage" type="number" style="width: 8em" />
        </div>

        <div>
            <p class="field-title">Notes</p>
            <textarea name="variant-description" rows="2" cols="36"></textarea>
        </div>`;

    static onSubmitCallback;

    static cache = { printerId: null };

    constructor(territory, isOverstamped, banknoteId, denominationStr, variantId, onSubmitCallback) {
        let title = variantId ? "Update Variant" : "Add new Variant";
        super("upsert-variant-form", title, denominationStr, UpsertVariantForm.FORM_HTML, UpsertVariantForm.submit);

        UpsertVariantForm.onSubmitCallback = onSubmitCallback;

        ModalForm.show();
        let form = ModalForm.getForm();

        // Store values neede for the submit
        form.data("banknote-id", banknoteId);
        form.data("variant-id", variantId);

        form.find("input[name='variant-printed-date']").focus();

        // If the series contains overstamped notes, then hide the "inherited" features
        if (isOverstamped) {
            // Fill-in the Countries
            form.find("select[name='overstamped-territory']").append(`<option value='${territory.id}'>${territory.name}</option>`);
            form.find("input[name='overstamped-cat-id']").val("P-");
            asyncGET(`/territory/${territory.id}`, (result, status) => {
                if (result.parent)
                    form.find("select[name='overstamped-territory']").append(`<option value='${result.parent.id}'>${result.parent.name}</option>`);
                if (result.predecessors) {
                    for (let ter of result.predecessors)
                        form.find("select[name='overstamped-territory']").append(`<option value='${ter.id}'>${ter.name}</option>`);
                }
            });

            form.find(".non-overstamped").hide();
            form.find("select[name='overstamped-territory']").attr("required", "");
            form.find("input[name='overstamped-cat-id']").attr("required", "");
        } else {
            form.find("select[name='overstamped-territory']").removeAttr("required");
            form.find("input[name='overstamped-cat-id']").removeAttr("required");
            form.find(".only-overstamped").hide();
        }

        // Fill-in the printers
        asyncGET(`/printer`, (result, status) => {
            for (let printer of result)
                form.find("select[name='variant-printer']").append(`<option value='${printer.id}'>${printer.name}</option>`);

            if (variantId) {
                // Retrieve variant info 
                asyncGET(`/variant/${variantId}`, (variant, status) => {
                    form.find("input[name='variant-printed-date']").val(variant.printedDate);
                    form.find("input[name='variant-issue-year']").val(variant.issueYear);
                    form.find("input[name='variant-catalogue-id']").val(variant.catalogueId);
                    form.find("select[name='variant-printer']").val(variant.printerId);
                    form.find("select[name='overstamped-territory']").val(variant.overstampedTerritoryId);
                    form.find("input[name='overstamped-cat-id']").val(variant.overstampedCatalogueId);
                    form.find("input[name='not-issued']").prop("checked", parseInt(variant.notIssued));
                    form.find("input[name='variant-obverse-color']").val(variant.obverseColor);
                    form.find("input[name='variant-reverse-color']").val(variant.reverseColor);
                    form.find("input[name='variant-signature']").val(variant.signature);
                    form.find("input[name='variant-signature-ext']").val(variant.signatureExt);
                    form.find("input[name='variant-watermark']").val(variant.watermark);
                    form.find("input[name='variant-security-thread']").val(variant.securityThread);
                    form.find("textarea[name='variant-security']").val(variant.securityExt);

                    form.find("input[name='is-specimen']").prop("checked", variant.isSpecimen);
                    form.find("input[name='is-commemorative']").prop("checked", variant.isCommemorative);
                    form.find("input[name='is-num-product']").prop("checked", variant.isNumismaticProduct);
                    form.find("input[name='is-replacement']").prop("checked", variant.isReplacement);
                    form.find("input[name='is-error']").prop("checked", variant.isError);

                    form.find("input[name='variant-mintage']").val(variant.mintage);
                    form.find("textarea[name='variant-description']").val(variant.description);
                });
            } else {
                form.find("select[name='variant-printer']").val(UpsertVariantForm.cache.printerId || 0)
            }
        });
    }

    static submit() {
        let form = ModalForm.getForm();

        // Retrieve the note fields in case of new note
        let variant = {};
        let banknoteId = form.data("banknote-id");
        variant.variantId = form.data("variant-id") || 0;

        variant.issueYear = parseInt(form.find("input[name='variant-issue-year']").val());
        if (form.find("input[name='variant-printed-date']").val() !== "")
            variant.printedDate = $("input[name='variant-printed-date']").val();
        if (form.find("input[name='variant-catalogue-id']").val() !== "")
            variant.catalogueId = form.find("input[name='variant-catalogue-id']").val();
        if (form.find("select[name='overstamped-territory']").val())
            variant.overstampedTerritoryId = parseInt(form.find("select[name='overstamped-territory']").val());
        if (form.find("input[name='overstamped-cat-id']").val() !== "")
            variant.overstampedCatalogueId = form.find("input[name='overstamped-cat-id']").val();
        variant.notIssued = form.find("input[name='not-issued']").prop("checked");
        if (form.find("select[name='variant-printer']").val())
            variant.printerId = parseInt(form.find("select[name='variant-printer']").val());
        if (form.find("input[name='variant-obverseColor']").val() !== "")
            variant.obverseColor = form.find("input[name='variant-obverse-color']").val();
        if (form.find("input[name='variant-reverseColor']").val() !== "")
            variant.reverseColor = form.find("input[name='variant-reverse-color']").val();
        if (form.find("input[name='variant-signature']").val() !== "")
            variant.signature = form.find("input[name='variant-signature']").val();
        if (form.find("input[name='variant-signature-ext']").val() !== "")
            variant.signatureExt = form.find("input[name='variant-signature-ext']").val();
        if (form.find("input[name='variant-watermark']").val() !== "")
            variant.watermark = form.find("input[name='variant-watermark']").val();
        if (form.find("input[name='variant-security-thread']").val() !== "")
            variant.securityThread = form.find("input[name='variant-security-thread']").val();
        if (form.find("textarea[name='variant-security']").val() !== "")
            variant.securityExt = form.find("textarea[name='variant-security']").val();
        variant.isSpecimen = form.find("input[name='is-specimen']").prop("checked");
        variant.isCommemorative = form.find("input[name='is-commemorative']").prop("checked");
        variant.isNumismaticProduct = form.find("input[name='is-num-product']").prop("checked");
        variant.isReplacement = form.find("input[name='is-replacement']").prop("checked");
        variant.isError = form.find("input[name='is-error']").prop("checked");
        if (form.find("input[name='variant-mintage']").val())
            variant.mintage = parseInt(form.find("input[name='variant-mintage']").val());
        if (form.find("textarea[name='variant-description']").val() !== "")
            variant.description = form.find("textarea[name='variant-description']").val();

        if (!variant.variantId) {
            // Insert new variant
            asyncPUT(`/denomination/${banknoteId}/variant`, variant, (result, status) => {
                // Close the window
                ModalForm.close();

                UpsertVariantForm.onSubmitCallback();
            });
        } else {
            // Update variant
            asyncPUT(`/variant/${variant.variantId}`, variant, (result, status) => {
                // Close the window
                ModalForm.close();

                UpsertVariantForm.onSubmitCallback();
            });
        }
        UpsertVariantForm.cache.printerId = variant.printerId;
    }

    static setIssueYear() {
        let form = ModalForm.getForm();

        let printedDate = form.find("input[name='variant-printed-date']").val();
        let issueYear = form.find("input[name='variant-issue-year']").val();
        if (printedDate !== "" && !issueYear)
            form.find("input[name='variant-issue-year']").val(printedDate.split(".")[0]);
    }
}