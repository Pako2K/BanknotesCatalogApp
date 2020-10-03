function initializeUpsertCollection(seriesId, variantJSON, gradesJSON) {
    let dateStr = variantJSON.printedDate ? variantJSON.printedDate : "ND";
    if (dateStr.indexOf(variantJSON.issueYear) === -1)
        dateStr += ` (${variantJSON.issueYear})`;
    $("#upsert-collection-dialog>h4").text(`${variantJSON.denominationStr}, ${variantJSON.catalogueId}, ${dateStr}`);
    $("#upsert-collection-dialog").data("grades-list", gradesJSON);
    $("#upsert-collection-dialog").data("variant-id", variantJSON.id);
    // The series section will be re-loaded after saving the data (this is the easiest way, but not the most eficient...)
    $("#upsert-collection-dialog").data("series-id", seriesId);

    variantJSON.items.forEach(item => {
        let itemRow = ` <tr>
                            <td><input type="number" id="quantity" name="quantity" value="${item.quantity}" min="1" max="100" required></td>
                            <td>
                                <select id="grade-${item.id}" name="grade">`;
        gradesJSON.forEach(element => {
            itemRow += `            <option value="${element.grade}">${element.grade}</option>`;
        });
        itemRow += `             </select>
                            </td>
                            <td><input type="number" id="price" name="price" value="${item.price}" min="0" step=0.01 required></td>
                            <td><input type="date" id="date" name="date" value="${item.purchaseDate || ""}"></td>
                            <td><input type="text" id="seller" name="seller" placeholder="Seller" size=8 maxlength="20" autocomplete="on"></td>
                            <td rowspan="2"><img src="./forms/collection/delete.png" alt="delete item" onclick="deleteCollectionRow(this)"></td>
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

function closeUpsertCollection() {
    $("div.modal-form-placeholder").empty();
    $("div.modal-form-placeholder").hide();
}


function addCollectionRow() {
    let gradesJSON = $("#upsert-collection-dialog").data("grades-list");

    let itemRow = ` <tr>
                        <td><input type="number" id="quantity" name="quantity" value="1" min="1" max="100" required></td>
                        <td>
                            <select id="grade-NEW" name="grade">`;
    gradesJSON.forEach(element => {
        itemRow += `            <option value="${element.grade}">${element.grade}</option>`;
    });
    itemRow += `             </select>
                        </td>
                        <td><input type="number" id="price" name="price" value="0" min="0" step=0.01 required></td>
                        <td><input type="date" id="date" name="date"></td>
                        <td><input type="text" id="seller" name="seller" placeholder="Seller" size=8 maxlength="20" autocomplete="on"}"></td>
                        <td rowspan="2"><img src="./forms/collection/delete.png" alt="delete item" onclick="deleteCollectionRow(this)"></td>
                    </tr>
                    <tr>
                        <td colspan="5"><input type="text" id="description" name="description" placeholder="Item description" autocomplete="off" maxlength="40"></td>
                    </tr>`;
    $("#collection-items-table>tbody").append(itemRow);
}


function deleteCollectionRow(tdElem) {
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


function submitItems() {
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
            $.ajax({
                type: "POST",
                url: `/variant/${ $("#upsert-collection-dialog").data("variant-id")}/item`,
                contentType: "application/json",
                async: false,
                cache: false,
                data: JSON.stringify(itemJSON),
                timeout: 5000,
                dataType: 'json',

                success: function(result, status) {},

                error: function(xhr, status, error) {
                    switch (xhr.status) {
                        case 403:
                            alert("Your session is not valid or has expired.");
                            _clearSessionCookies();
                            location.reload();
                            break;
                        default:
                            alert(`Query failed. \n${status} - ${error}\nPlease contact the web site administrator.`);
                    }
                }
            });
        } else {
            if ($(row).hasClass("delete-item")) {
                // Delete this item
                $.ajax({
                    type: "DELETE",
                    url: `/item/${itemId}`,
                    async: false,
                    cache: false,
                    timeout: 5000,
                    dataType: 'json',

                    success: function(result, status) {},

                    error: function(xhr, status, error) {
                        switch (xhr.status) {
                            case 403:
                                alert("Your session is not valid or has expired.");
                                _clearSessionCookies();
                                location.reload();
                                break;
                            default:
                                alert(`Query failed. \n${status} - ${error}\nPlease contact the web site administrator.`);
                        }
                    }
                });
            } else {
                // Update this item
                itemJSON.id = parseInt(itemId);
                $.ajax({
                    type: "PUT",
                    url: `/item`,
                    contentType: "application/json",
                    async: false,
                    cache: false,
                    data: JSON.stringify(itemJSON),
                    timeout: 5000,
                    dataType: 'json',

                    success: function(result, status) {},

                    error: function(xhr, status, error) {
                        switch (xhr.status) {
                            case 403:
                                alert("Your session is not valid or has expired.");
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
    });

    let seriesId = $("#upsert-collection-dialog").data("series-id");
    let menuOpt = $("#currency-nav>p.selected-view").text();
    switch (menuOpt) {
        case "Timeline":
            initializeTimeline();
            break;
        case "List":
            initializeList();
            break;
        case "Details":
            loadSeriesDetails(seriesId);
            break;
        default:
    }
    // Close the window
    closeUpsertCollection();
}