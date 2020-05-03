class FromToFilter {
    constructor(parentDiv, filterName, callback, lowLimitLbl = "From", upLimitLbl = "To", fontSize = "14px", isHorizontal = true) {
        if (!parentDiv || !filterName || filterName === "")
            throw "addFromToFilter: Invalid parameters";

        this.parentDiv = parentDiv;

        parentDiv.addClass("from-to-filter");

        let divider = "";
        if (!isHorizontal)
            divider = "<p></p>";

        let html = `<p><span>${filterName}<span></p>
                    <div class="input-field">
                        <p>${lowLimitLbl}:</p>
                        <div>
                            <input name="from-filter" type="number">
                        </div>
                    </div>
                    ${divider}
                    <div class="input-field">
                        <p>${upLimitLbl}:</p>
                        <div>
                            <input name="to-filter" type="number">
                        </div>
                    </div>`;

        parentDiv.append(html);

        this.setSize(fontSize);

        parentDiv.find("input").focusin(function() {
            $(this).parents(".from-to-filter").addClass("input-focus");
            $(this).parents(".input-field").addClass("input-focus");
            $(this).data("init-value", $(this).val());
        });

        parentDiv.find("input").focusout(function() {
            $(this).parents(".from-to-filter").removeClass("input-focus");
            $(this).parents(".input-field").removeClass("input-focus");

            // If something changed... validate values, call callback and set css classes
            if ($(this).data("init-value") !== $(this).val()) {
                let from = $(this).parent().parent().parent().find("input[name='from-filter'").val();
                let to = $(this).parent().parent().parent().find("input[name='to-filter'").val();

                // Validate input fields
                if (from === "" || to === "" || Number(from) <= Number(to)) {
                    $(this).parents(".from-to-filter").removeClass("not-valid");

                    if (from === "" && to === "") {
                        $(this).parents(".from-to-filter").removeClass("filled-ok");
                    } else {
                        $(this).parents(".from-to-filter").addClass("filled-ok");
                    }

                    callback(filterName, from, to);
                } else {
                    $(this).parents(".from-to-filter").removeClass("filled-ok");
                    $(this).parents(".from-to-filter").addClass("not-valid");
                }
            }
        });

        parentDiv.find("input").keyup(function() {
            if (event.which === 13)
                $(this).blur();
        });

    }

    getFrom() {
        return this.parentDiv.find("input[name='from-filter']").val();
    }

    getTo() {
        return this.parentDiv.find("input[name='to-filter']").val();
    }

    setFrom(value) {
        this.parentDiv.find("input[name='from-filter']").focusin();
        this.parentDiv.find("input[name='from-filter']").val(value);
        this.parentDiv.find("input[name='from-filter']").focusout();
    }

    setTo(value) {
        this.parentDiv.find("input[name='to-filter']").focusin();
        this.parentDiv.find("input[name='to-filter']").val(value);
        this.parentDiv.find("input[name='to-filter']").focusout();
    }

    setSize(size) {
        this.parentDiv.children("p").css("font-size", size);
        this.parentDiv.find("input").css("font-size", size);
        this.parentDiv.find(".input-field").css("font-size", size);
        this.parentDiv.find(".input-field").css("border-top-left-radius", size + " 50%");
        this.parentDiv.find(".input-field").css("border-bottom-left-radius", size + " 50%");
    }

    setColor(color) {
        this.parentDiv.children("p").css("color", color);
    }

}