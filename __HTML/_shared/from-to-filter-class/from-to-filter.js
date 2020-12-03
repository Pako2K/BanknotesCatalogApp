class FromToFilter {
    constructor(parentDiv, filterName, callback, lowLimitLbl = "From", upLimitLbl = "To", isHorizontal = true) {
        if (!parentDiv || !filterName || filterName === "")
            throw "addFromToFilter: Invalid parameters";

        $("head").append('<link rel="stylesheet" type="text/css" href="/_shared/from-to-filter-class/from-to-filter.css">');

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

        parentDiv.find("input").focusin(function() {
            $(this).parents(".from-to-filter").addClass("input-focus");
            $(this).parents(".input-field").addClass("input-focus");
            $(this).data("init-value", $(this).val());
        });

        let thisInst = this;
        parentDiv.find("input").focusout(function() {
            $(this).parents(".from-to-filter").removeClass("input-focus");
            $(this).parents(".input-field").removeClass("input-focus");

            // If something changed... validate values, call callback and set css classes
            if ($(this).data("init-value") !== $(this).val()) {
                if (thisInst.validate()) {
                    let from = thisInst.parentDiv.find("input[name='from-filter']").val();
                    let to = thisInst.parentDiv.find("input[name='to-filter'").val();
                    callback(filterName, from, to);
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

    initFrom(value) {
        this.parentDiv.find("input[name='from-filter']").val(value);
        this.validate();
    }

    initTo(value) {
        this.parentDiv.find("input[name='to-filter']").val(value);
        this.validate();
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

    // setSize(size) {
    //     this.parentDiv.children("p").css("font-size", size);
    //     this.parentDiv.find("input").css("font-size", size);
    //     this.parentDiv.find(".input-field").css("font-size", size);
    //     this.parentDiv.find(".input-field").css("border-top-left-radius", size + " 50%");
    //     this.parentDiv.find(".input-field").css("border-bottom-left-radius", size + " 50%");
    // }

    setColor(color) {
        this.parentDiv.children("p").css("color", color);
    }


    validate() {
        let from = this.parentDiv.find("input[name='from-filter']").val();
        let to = this.parentDiv.find("input[name='to-filter'").val();

        // Validate input fields
        if (from === "" || to === "" || Number(from) <= Number(to)) {
            this.parentDiv.removeClass("not-valid");

            if (from === "" && to === "") {
                this.parentDiv.removeClass("filled-ok");
            } else {
                this.parentDiv.addClass("filled-ok");
            }
            return true;
        } else {
            this.parentDiv.removeClass("filled-ok");
            this.parentDiv.addClass("not-valid");
            return false;
        }
    }
}