"use strict"

class ModalForm {
    static id;

    constructor(id, title, subtitle, formHtml, submitFn) {
        ModalForm.submit = submitFn;
        if ($("div.modal-form").length)
            throw "A modal form is already open";

        ModalForm.id = id;
        $("body").append(`
            <div class="modal-form">
                <div id="${id}" class="modal-container">
                    <h3>${title}</h3>
                    <h4>${subtitle}</h4>
                    <form name="${id}-form" action="javascript:ModalForm.submit()">
                    </form>
                </div>
            </div>`);

        $("body").css("overflow", "hidden");

        $("div.modal-container>form").append(formHtml).append(`
                <div class="buttons-div">
                    <button type="button" class="button-style" onclick="ModalForm.close()">Cancel</button>
                    <input type="submit" class="button-style" value="Save">
                </div>`);
    }

    static getForm() {
        return $(`#${ModalForm.id}>form`);
    }

    static show() {
        $("body>div.modal-form").fadeIn(500);
    }

    static close() {
        $("body").css("overflow", "auto");
        $("body>div.modal-form").remove();
    }
}