let banknotesTable;

function showList() {
    $("#view-section").empty();

    let listCard = new SimpleCard($('#view-section'), "List of Banknotes", "");
    if (seriesJSON.length === 0) {
        listCard.setContent(`<p>There is no data for this currency</p>`);
        return;
    }

    listCard.setContent(`<div id="view-table"></div>`);
    banknotesTable = new NotesListTable($("#view-table"), "CUR");

    // Get banknotes info for all the series
    let notesArray = [];
    let numReplies = 0;
    for (let idx in seriesJSON) {
        let variantsUri;
        let itemsUri;
        if (Session.getUsername())
            itemsUri = `/series/${seriesJSON[idx].id}/items`;
        else
            variantsUri = `/series/${seriesJSON[idx].id}/variants`;

        notesArray.push({});

        asyncGET(variantsUri || itemsUri, (notesJSON, status) => {
            numReplies++;
            notesArray[idx] = notesJSON;
            notesArray[idx].seriesId = seriesJSON[idx].id
            notesArray[idx].seriesName = seriesJSON[idx].name
            if (numReplies === seriesJSON.length) {
                // Create a flat JSON array 
                let notesList = [];
                for (let series of notesArray) {
                    for (let denomination of series) {
                        for (let variant of denomination.variants) {
                            let record = {};
                            record.currencyId = currencyId;
                            record.id = variant.id;
                            record.catalogueId = variant.catalogueId;
                            record.denomination = denomination.denomination;
                            record.printedDate = variant.printedDate;
                            record.issueYear = variant.issueYear;
                            record.seriesId = series.seriesId;
                            record.seriesName = series.seriesName;
                            record.notIssued = variant.notIssued;
                            record.width = denomination.width;
                            record.height = denomination.height;
                            record.printer = variant.printerName;
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
};