class UpsertIssueForm extends ModalForm {
    static FORM_HTML = `
        <div>
            <p class="field-title required-input">Name</p>
            <input name="series-name" type="text" size="36" maxlength="50" autocomplete="off" required/>
        </div>
        <div class="inline-fields">
            <div>
                <p class="field-title required-input">Start year</p>
                <input name="series-start" type="number" style="width: 6em" required/>
            </div>
            <div>
                <p class="field-title">End year</p>
                <input name="series-end" type="number" style="width: 6em" />
            </div>
        </div>
        <div>
            <p class="field-title">Issued By</p>
            <input name="series-issuer" list="issuers" style="width: 24em" required>
            <datalist id="issuers">
            </datalist>
        </div>
        <div class="flag-fields">
            <div>
                <input type="checkbox" name="is-overstamped" value="1">
                <span>OVERSTAMPED ISSUE</span>
            </div>
        </div>
        <div>
            <p class="field-title">Law Date or Decree</p>
            <input name="series-law-date" type="text" size="36" maxlength="50" autocomplete="off" />
        </div>
        <div>
            <p class="field-title">Description</p>
            <textarea name="series-description" rows="3" cols="36"></textarea>
        </div>`;

    static onSubmitCallback;

    constructor(currencyJSON, seriesJSON, onSubmitCallback) {
        let title = "Add new Issue";
        let subtitle = currencyJSON.name;
        if (seriesJSON) {
            title = "Update Issue";
            subtitle += ` - ${seriesJSON.name}`;
        }
        super("upsert-issue-form", title, subtitle, UpsertIssueForm.FORM_HTML, UpsertIssueForm.submit);

        UpsertIssueForm.onSubmitCallback = onSubmitCallback;

        ModalForm.show();
        let form = ModalForm.getForm();

        // Store values neede for the submit
        form.data("currency-id", currencyJSON.id);
        form.data("territory-id", currencyJSON.territoryId);

        form.find("input[name='series-name']").focus();

        // Fill-in the issuers
        asyncGET(`/territory/${currencyJSON.territoryId}/issuer`, (result, status) => {
            for (let issuer of result) {
                $("#issuers").append(`<option value='${issuer.name}' data-id='${issuer.id}'>`);
                if (seriesJSON && !seriesJSON.issuerName && seriesJSON.issuerId === issuer.id)
                    seriesJSON.issuerName = issuer.name;
            }

            if (seriesJSON)
                form.find("input[name='series-issuer']").val(seriesJSON.issuerName);
        });

        if (seriesJSON) {
            form.data("series-id", seriesJSON.id);

            // Show values in the form
            form.find("input[name='series-name']").val(seriesJSON.name);
            form.find("input[name='series-start']").val(seriesJSON.start);
            form.find("input[name='series-end']").val(seriesJSON.end);
            form.find("input[name='is-overstamped']").prop("checked", seriesJSON.isOverstamped);
            form.find("input[name='series-law-date']").val(seriesJSON.lawDate);
            form.find("textarea[name='series-description']").val(seriesJSON.description);
        }
    }

    static submit() {
        let form = ModalForm.getForm();

        // Retrieve the series fields 
        let series = {};
        if (form.data("series-id"))
            series.id = parseInt(form.data("series-id"));
        let currencyId = form.data("currency-id");
        series.name = form.find("input[name='series-name']").val();
        series.start = parseInt(form.find("input[name='series-start']").val());
        if (form.find("input[name='series-end']").val() !== "")
            series.end = parseInt(form.find("input[name='series-end']").val());

        let issuerName = form.find("input[name='series-issuer']").val();
        if (issuerName) {
            // Get list of options
            let datalistId = form.find("input[name='series-issuer']").attr("list");
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

            asyncPUT(`/issuer`, { name: issuerName, territoryId: form.data("territory-id") },
                (result, status) => {
                    series.issuerId = result.id;
                });
        }

        series.isOverstamped = form.find("input[name='is-overstamped']").prop("checked");
        if (form.find("input[name='series-law-date']").val() !== "")
            series.lawDate = form.find("input[name='series-law-date']").val();
        if (form.find("textarea[name='series-description']").val() !== "")
            series.description = form.find("textarea[name='series-description']").val();

        if (!series.id) {
            // Insert new series
            series.id = 0;
            asyncPUT(`/currency/${currencyId}/series`, series, (result, status) => {
                // Close the window
                ModalForm.close();
                series.id = result.id
                UpsertIssueForm.onSubmitCallback(series);
            });
        } else {
            // Update series
            asyncPUT(`/series/${series.id}`, series, (result, status) => {
                // Close the window
                ModalForm.close();
                UpsertIssueForm.onSubmitCallback(series);
            });
        }
    }
}