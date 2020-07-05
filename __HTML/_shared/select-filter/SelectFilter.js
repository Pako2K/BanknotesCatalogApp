class SelectFilter {
    /**
     * @param values    [{id, value}]   The values to be shown + their uid
     * @param parentDiv string          DOM element to be used as a SelectFilter
     */
    constructor(parentDiv, filterName, callback, values = [], fontSize = "14px") {
        if (!parentDiv || !filterName || filterName === "")
            throw "addFromToFilter: Invalid parameters";


        this.parentDiv = parentDiv;
        this.callback = callback;

        parentDiv.addClass("select-filter");
        parentDiv.attr("tabindex", 0);

        let html = `<p><span>${filterName}</span></p>
                    <div class="input-box">
                        <div class="delete-value">
                            <span>X</span>
                        </div>
                        <div class="selected-value"></div>
                        <div class="drop-down-arrow"></div>
                    </div>
                    <div class="options-list">`;
        this.maxLength = 3;
        values.forEach((item) => {
            this.maxLength = Math.max(this.maxLength, item.value.length);
            html += `<div data-id="${item.id}">${item.value}</div>`;
        });
        html += `</div>`;

        parentDiv.append(html);

        parentDiv.find("div.selected-value").css("width", (this.maxLength - 3) * 0.7 + "em");

        this.setSize(fontSize);

        parentDiv.find("div.selected-value").click(function() {
            parentDiv.addClass("input-focus");
            parentDiv.children("div.options-list").slideToggle(500);
        });

        parentDiv.find("div.drop-down-arrow").click(function() {
            parentDiv.addClass("input-focus");
            parentDiv.children("div.options-list").slideToggle(500);
        });

        let thisAlias = this;
        parentDiv.find(".options-list>div").click(function() {
            thisAlias.selectOption($(this).data("id"));
            $(this).parent().slideUp(500);
        });

        parentDiv.find("div.delete-value>span").click(function() {
            parentDiv.find("div.selected-value").text("");
            $(this).parents(".selected").removeClass("selected");
            parentDiv.find("div.options-list").children(".selected").removeClass("selected");
            parentDiv.find("div.options-list").slideUp(500);
            callback(parentDiv.children("p").children("span").text(), "", "");
        });

        parentDiv.keyup(function(ev) {
            // Upper case pressed character
            let code = ev.keyCode || ev.which;
            let char = String.fromCharCode(code).toUpperCase();

            switch (code) {
                case 46: // delete
                case 8: // backspace
                    if (code === 46 || code === 8 && $(this).hasClass("selected"))
                        $(this).find("div.delete-value>span").click();
                    break;
                case 13: // enter
                    $(this).find("div.drop-down-arrow").click();
                    break;
                case 38: // up arrow
                    if ($(this).hasClass("selected")) {
                        let optId = $(this).find("div.options-list>div.selected").prev().data("id");
                        if (optId)
                            thisAlias.selectOption(optId);
                    }
                    break;
                case 40: // down arrow
                    if ($(this).hasClass("selected")) {
                        let optId = $(this).find("div.options-list>div.selected").next().data("id");
                        if (optId)
                            thisAlias.selectOption(optId);
                    } else {
                        let optId = $(this).find(".options-list>div").eq(0).data("id");
                        if (optId)
                            thisAlias.selectOption(optId);
                    }
                    break;
                default:
                    // Select the next option which starts with that letter
                    let allOptions = $(this).find(".options-list>div:not(.selected)");
                    for (let i = 0; i < allOptions.length; i++) {
                        if (allOptions.eq(i).text()[0].toUpperCase() === char) {
                            allOptions.eq(i).click();
                            break;
                        }
                    }
            }
        });

        $(".select-filter").focusin(function() {
            $(this).addClass("input-focus");
        });

        $(".select-filter").focusout(function() {
            $(this).removeClass("input-focus");
            $(this).find(".options-list").hide();
        });

    }

    // Only for internal use!!
    selectOption(optionId) {
        let option = this.parentDiv.find(`div.options-list>div[data-id=${optionId}]`);
        let newValue = $(option).text();
        this.parentDiv.find("div.selected-value").text(newValue);
        this.parentDiv.addClass("selected");

        option.siblings(".selected").removeClass("selected");
        option.addClass("selected");
        this.callback(this.parentDiv.children("p").children("span").text(), optionId, newValue);
    };

    getValue() {
        return this.parentDiv.find("div.selected-value").text();
    }

    setValue(value) {
        // Find the option with that value
        let optList = this.parentDiv.find(".options-list>div");

        for (let option of optList) {
            if ($(option).text() === value) {
                $(option).click();
                break;
            }
        }
    }

    setValueById(id) {
        let opt = this.parentDiv.find(`.options-list>div[data-id='${id}']`);
        if (opt)
            $(opt).click();
    }

    setSize(size) {
        this.parentDiv.css("font-size", size);
    }

    setColor(color) {
        this.parentDiv.children("p").css("color", color);
    }

    addOption(id, value) {
        let html = `<div data-id="${id}">${value}</div>`;

        this.maxLength = Math.max(this.maxLength, value.length);
        this.parentDiv.find("div.selected-value").css("width", (this.maxLength - 3) * 0.7 + "em");

        this.parentDiv.find("div.options-list").append(html);
        let thisAlias = this;
        this.parentDiv.find("div.options-list>div").last().click(function() {
            thisAlias.selectOption($(this).data("id"));
            $(this).parent().slideUp(500);
        });
    }

    removeOption(value) {
        // Find the option with that value
        let optList = this.parentDiv.find(".options-list>div");

        for (let option of optList) {
            if ($(option).text() === value) {
                $(option).remove();
                break;
            }
        }
    }

    removeOptionById(id) {
        let opt = this.parentDiv.find(`.options-list>div[data-id='${id}']`);
        if (opt)
            $(opt).remove();
    }

    sortOptions(reverse = false) {
        let optList = this.parentDiv.find(".options-list>div");
        let selectedOpt = this.parentDiv.find(".options-list>div.selected");

        optList.sort((a, b) => {
            return $(a).text().localeCompare($(b).text());
        });

        // Remove all the divs and add them again
        this.parentDiv.find(".options-list>div").remove();
        for (let opt of optList) {
            let id = $(opt).data("id");
            let value = $(opt).text();
            let optClass = "";
            if ($(opt).hasClass("selected"))
                optClass = "class='selected'";

            this.parentDiv.find(".options-list").append(`<div data-id="${id}" ${optClass}>${value}</div>`);
        }

        let thisAlias = this;
        this.parentDiv.find(".options-list>div").click(function() {
            thisAlias.selectOption($(this).data("id"));
            $(this).parent().slideUp(500);
        });
    }
}