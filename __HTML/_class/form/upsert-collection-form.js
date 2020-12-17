class UpsertCollectionForm extends ModalForm {
    static FORM_HTML = `
        <table id="collection-items-table">
            <thead>
                <tr>
                    <th>Quantity</th>
                    <th>Grade</th>
                    <th>Price (€)</th>
                    <th>Purchase Date</th>
                    <th>Seller</th>
                    <th></th>
                </tr>
            </thead>
            <tbody>
              
            </tbody>
            <tfoot>
                <tr>
                    <td colspan="6">
                        <p onclick="UpsertCollectionForm.addCollectionRow()">Add...</p>
                    </td>
                </tr>
            </tfoot>
        </table>`;

    static onSubmitCallback;

    constructor(variantJSON, gradesJSON, onSubmitCallback) {
        let dateStr = variantJSON.printedDate ? variantJSON.printedDate : "ND";
        if (dateStr.indexOf(variantJSON.issueYear) === -1)
            dateStr += ` (${variantJSON.issueYear})`;

        super("upsert-collection-form", "Update Collection", `${variantJSON.denominationStr}, ${variantJSON.catalogueId}, ${dateStr}`, UpsertCollectionForm.FORM_HTML, UpsertCollectionForm.submit);

        UpsertCollectionForm.onSubmitCallback = onSubmitCallback;

        ModalForm.show();
        let form = ModalForm.getForm();

        form.find("button").focus();

        form.data("grades-list", gradesJSON);
        form.data("variant-id", variantJSON.id);

        variantJSON.items.forEach(item => {
            let itemRow = ` <tr>
                            <td><input type="number" id="quantity" name="quantity" value="${item.quantity}" min="1" max="100" required></td>
                            <td>
                                <select id="grade-${item.id}" name="grade">`;
            gradesJSON.forEach(element => {
                itemRow += `        <option value="${element.grade}">${element.grade}</option>`;
            });
            itemRow += `        </select>
                            </td>
                            <td><input type="number" id="price" name="price" value="${item.price}" min="0" step=0.01 required></td>
                            <td><input type="date" id="date" name="date" value="${item.purchaseDate || ""}"></td>
                            <td><input type="text" id="seller" name="seller" placeholder="Seller" size=8 maxlength="25" autocomplete="on"></td>
                            <td rowspan="2"><img src="/_class/form/delete.png" alt="delete item" onclick="UpsertCollectionForm.deleteCollectionRow(this)"></td>
                        </tr>
                        <tr>
                            <td colspan="5"><input type="text" id="description" name="description" placeholder="Item description" autocomplete="off" maxlength="40"></td>
                        </tr>`;
            $("#collection-items-table>tbody").append(itemRow);
            // To avoid problems with the quotes!
            $("#collection-items-table>tbody input[name='seller']").last().val(item.seller || "");
            $("#collection-items-table>tbody input[name='description']").last().val(item.description || "");
            $(`#grade-${item.id}`).val(item.grade);
        });
    }

    static deleteCollectionRow(tdElem) {
        let rowElem = $(tdElem).parent().parent();

        if ($(rowElem).find("select").attr("id") === "grade-NEW") {
            $(rowElem).next().remove();
            $(rowElem).remove();
        } else {
            // Mark for deletion
            $(rowElem).addClass("delete-item");
            $(rowElem).next().addClass("delete-item");
        }
    }


    static addCollectionRow() {
        let form = ModalForm.getForm();
        let gradesJSON = form.data("grades-list");

        let itemRow = ` <tr>
                        <td><input type="number" id="quantity" name="quantity" value="1" min="1" max="100" required></td>
                        <td>
                            <select id="grade-NEW" name="grade">`;
        gradesJSON.forEach(element => {
            itemRow += `         <option value="${element.grade}">${element.grade}</option>`;
        });
        itemRow += `        </select>
                        </td>
                        <td><input type="number" id="price" name="price" value="0" min="0" step=0.01 required></td>
                        <td><input type="date" id="date" name="date"></td>
                        <td><input type="text" id="seller" name="seller" placeholder="Seller" size=8 maxlength="25" autocomplete="on"}"></td>
                        <td rowspan="2"><img src="/_class/form/delete.png" alt="delete item" onclick="UpsertCollectionForm.deleteCollectionRow(this)"></td>
                    </tr>
                    <tr>
                        <td colspan="5"><input type="text" id="description" name="description" placeholder="Item description" autocomplete="off" maxlength="40"></td>
                    </tr>`;
        $("#collection-items-table>tbody").append(itemRow);
        form.find("#price").focus();
    }


    static submit() {
        // Store the data in each item row (2 rows per item)
        $("#collection-items-table>tbody>tr:nth-of-type(odd)").each((i, row) => {
            let itemId = $(row).find("select").attr("id").substring("grade-".length);
            let t = $(row).find("select");
            let tt = $(row).find("#price");
            let itemJSON = {
                "id": 0, // Will be set for updates
                "grade": $(row).find("select").val(),
                "price": parseFloat(($(row).find("#price").val())),
                "quantity": parseInt($(row).find("#quantity").val())
            };
            let seller = $(row).find("#seller").val();
            if (seller.length) itemJSON.seller = seller;
            let purchaseDate = $(row).find("#date").val();
            if (purchaseDate.length) itemJSON.purchaseDate = purchaseDate;
            let description = $(row).next().find("#description").val();
            if (description.length) itemJSON.description = description;

            if (itemId === "NEW") {
                // Insert new item
                asyncPOST(`/variant/${ ModalForm.getForm().data("variant-id")}/item`, itemJSON, (result, status) => {});
            } else {
                if ($(row).hasClass("delete-item")) {
                    // Delete this item
                    asyncDELETE(`/item/${itemId}`, (result, status) => {});
                } else {
                    // Update this item
                    itemJSON.id = parseInt(itemId);
                    asyncPUT(`/item`, itemJSON, (result, status) => {});
                }
            }
        });

        // Close the window
        ModalForm.close();

        UpsertCollectionForm.onSubmitCallback();
    }
}