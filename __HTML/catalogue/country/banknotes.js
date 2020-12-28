let banknotesTable;

function showBanknotes() {
    $("#results-section").empty();

    let listCard = new SimpleCard($('#results-section'), "List of Banknotes", "");
    listCard.setContent(`<div id="results-table"></div>`);

    banknotesTable = new NotesListTable($("#results-table"), "TER");

    // Get banknotes info for all the currencies
    let notesArray = [];
    let numReplies = 0;
    for (let idx in currenciesJSON) {
        let variantsUri;
        let itemsUri;
        if (Session.getUsername())
            itemsUri = `/currency/${currenciesJSON[idx].id}/items?territoryId=${countryId}`;
        else
            variantsUri = `/currency/${currenciesJSON[idx].id}/variants?territoryId=${countryId}`;

        notesArray.push({});

        asyncGET(variantsUri || itemsUri, (notesJSON, status) => {
            numReplies++;
            notesArray[idx] = notesJSON;
            notesArray[idx].currencyId = currenciesJSON[idx].id;
            notesArray[idx].currencyName = currenciesJSON[idx].name + (currenciesJSON[idx].iso3 ? ` (${currenciesJSON[idx].iso3})` : "");
            if (numReplies === currenciesJSON.length) {
                // Create a flat JSON array 
                let notesList = [];
                for (let currency of notesArray) {
                    for (let denomination of currency) {
                        for (let variant of denomination.variants) {
                            let record = {};
                            record.id = variant.id;
                            record.seriesId = denomination.seriesId;
                            record.catalogueId = variant.catalogueId;
                            record.currencyId = currency.currencyId;
                            record.currencyName = currency.currencyName;
                            record.denomination = denomination.denomination;
                            record.printedDate = variant.printedDate;
                            record.issueYear = variant.issueYear;
                            record.notIssued = variant.notIssued;
                            record.printer = variant.printerName;
                            record.width = denomination.width;
                            record.height = denomination.height;
                            record.description = variant.variantDescription;
                            record.items = variant.items || [];

                            notesList.push(record);
                        }
                    }
                }

                banknotesTable.addData(notesList);
            }
        });
    }

}