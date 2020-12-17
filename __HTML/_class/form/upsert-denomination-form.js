class UpsertDenominationForm extends ModalForm {
    static FORM_HTML = `
        <div class="inline-fields">
            <div>
                <p class="field-title required-input">Face value</p>
                <input name="note-face-value" style="width: 12em" type="number" min="0.1" step="0.1" required/>
            </div>
            <div>
                <p class="field-title required-input">Unit</p>
                <select name="note-units" style="width: 12em" required>
                        </select>
            </div>
        </div>
        <div class="non-overstamped">
            <p class="field-title required-input">Material</p>
            <select name="note-material" style="width: 12em" required>
                    </select>
        </div>
        <div class="inline-fields non-overstamped">
            <div>
                <p class="field-title">Width (in mm)</p>
                <input name="note-width" style="width: 9em" type="number" min="1" />
            </div>
            <div>
                <p class="field-title">Height (in mm)</p>
                <input name="note-height" style="width: 9em" type="number" min="1" />
            </div>
        </div>
        <div class="fields-group non-overstamped">
            <p class="field-title">Obverse</p>
            <div>
                <p class="field-title">Tags</p>
                <textarea name="note-obverse-tags" rows="2" cols="36"></textarea>
            </div>
            <div>
                <p class="field-title">Description</p>
                <textarea name="note-obverse-desc" rows="4" cols="36"></textarea>
            </div>
        </div>
        <div class="fields-group non-overstamped">
            <p class="field-title">Reverse</p>
            <div>
                <p class="field-title">Tags</p>
                <textarea name="note-reverse-tags" rows="2" cols="36"></textarea>
            </div>
            <div>
                <p class="field-title">Description</p>
                <textarea name="note-reverse-desc" rows="4" cols="36"></textarea>
            </div>
        </div>
        <div>
            <p>Notes</p>
            <textarea name="note-desc" rows="2" cols="36"></textarea>
        </div>`;

    static onSubmitCallback;

    constructor(currencyJSON, seriesJSON, denomJSON, onSubmitCallback) {
        let title = denomJSON ? "Update Denomination" : "Insert Denomination";
        let subtitle = `${currencyJSON.name} - ${seriesJSON.name}`;
        super("upsert-denomination-form", title, subtitle, UpsertDenominationForm.FORM_HTML, UpsertDenominationForm.submit);

        UpsertDenominationForm.onSubmitCallback = onSubmitCallback;

        ModalForm.show();
        let form = ModalForm.getForm();

        // Data to be used during the submit
        form.data("currency-id", currencyJSON.id);
        form.data("series-id", seriesJSON.id);

        form.find("input[name='note-face-value']").focus();

        // If the series contains overstamped notes, then only the face value and the units are needed
        let materialSel = form.find("select[name='note-material']");
        if (seriesJSON.isOverstamped) {
            form.find(".non-overstamped").hide();
            materialSel.removeAttr("required");
        } else {
            // Fill-in the materials
            asyncGET("/material", (result, status) => {
                let defaultId = 0;
                for (let material of result) {
                    materialSel.append(`<option value='${material.id}'>${material.name}</option>`);
                    if (material.name === "Paper") defaultId = material.id;
                }

                if (denomJSON)
                    materialSel.val(denomJSON.materialId);
                else
                    materialSel.val(defaultId);
            });
        }

        let noteUnitsSel = form.find("select[name='note-units']");;
        if (denomJSON) {

            form.data("banknote-id", denomJSON.id);

            // Show values in the form
            form.find("input[name='note-face-value']").val(denomJSON.faceValue || denomJSON.denomination);

            noteUnitsSel.append(`<option value='${denomJSON.unitId || 0}'>${denomJSON.unitName || currencyJSON.name}</option>`);
            $("#note-units-select").val(denomJSON.unitId || 0);

            form.find("input[name='note-width']").val(denomJSON.width);
            form.find("input[name='note-height']").val(denomJSON.height);
            form.find("textarea[name='note-obverse-tags']").val(denomJSON.obverseTags);
            form.find("textarea[name='note-reverse-tags']").val(denomJSON.reverseTags);
            form.find("textarea[name='note-obverse-desc']").val(denomJSON.obverseDescription);
            form.find("textarea[name='note-reverse-desc']").val(denomJSON.reverseDescription);
            form.find("textarea[name='note-desc']").val(denomJSON.description);
            // Disable key fields
            form.find("input[name='note-face-value']").attr("disabled", "");
            noteUnitsSel.attr("disabled", "");
        } else {
            // Fill in the units
            noteUnitsSel.append(`<option value='0'>${currencyJSON.name}</option>`);
            for (let unit of currencyJSON.units)
                noteUnitsSel.append(`<option value='${unit.id}'>${unit.name}</option>`);
            noteUnitsSel.val("0");
        }
    }


    static submit() {
        let form = ModalForm.getForm();

        // Retrieve the note fields in case of new note
        let seriesId = form.data("series-id");
        let banknote = {};
        let banknoteId = form.data("banknote-id");
        banknote.faceValue = parseFloat(form.find("input[name='note-face-value']").val());
        banknote.unitId = parseInt(form.find("select[name='note-units']").val());
        if (form.find("select[name='note-material']").val())
            banknote.materialId = parseInt(form.find("select[name='note-material']").val());
        if (form.find("input[name='note-width']").val() !== "")
            banknote.width = parseInt(form.find("input[name='note-width']").val());
        if (form.find("input[name='note-height']").val() !== "")
            banknote.height = parseInt(form.find("input[name='note-height']").val());
        if (form.find("textarea[name='note-obverse-tags']").val() !== "")
            banknote.obverseTags = form.find("textarea[name='note-obverse-tags']").val();
        if (form.find("textarea[name='note-reverse-tags']").val() !== "")
            banknote.reverseTags = form.find("textarea[name='note-reverse-tags']").val();
        if (form.find("textarea[name='note-obverse-desc']").val() !== "")
            banknote.obverseDescription = form.find("textarea[name='note-obverse-desc']").val();
        if (form.find("textarea[name='note-reverse-desc']").val() !== "")
            banknote.reverseDescription = form.find("textarea[name='note-reverse-desc']").val();
        if (form.find("textarea[name='note-desc']").val() !== "")
            banknote.description = form.find("textarea[name='note-desc']").val();

        if (!banknoteId) {
            // Insert new denomination
            asyncPUT(`/series/${seriesId}/denomination`, banknote, (result, status) => {
                // Close the window
                ModalForm.close();
                UpsertDenominationForm.onSubmitCallback(result.id);
            });
        } else {
            // Update denomination
            asyncPUT(`/denomination/${banknoteId}`, banknote, (result, status) => {
                // Close the window
                ModalForm.close();
                UpsertDenominationForm.onSubmitCallback();
            });
        }
    }
}