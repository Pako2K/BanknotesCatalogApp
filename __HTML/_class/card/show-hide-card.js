/*
    DEPENDENCIES
    
    card.css
*/

class ShowHideCard {

    _thisCard;
    constructor(id, parent, title) {
        parent.append(`
            <div class="show-hide-card">
                <div class="card-title">
                    <p class="title">${title}</p>
                    <div class="show-hide">
                        <span class="disabled" onclick="ShowHideCard.toggleBlock(this,'show')">Show</span>
                        <span onclick="ShowHideCard.toggleBlock(this,'hide')">Hide</span>
                    </div>
                </div>
                <div class="card-content">
                </div>
            </div>`);

        this._thisCard = parent.children("div.show-hide-card");
        this._thisCard.attr("id", "show-hide-card-" + id);
        if (localStorage.getItem("show-hide-card-" + id) === "")
            this._thisCard.find("div.show-hide span:last-of-type").click();
    }

    setContent(contentHTML) {
        this._thisCard.children().eq(1).empty().append(contentHTML);
    }

    show() {
        this._thisCard.find("p.show-hide span:first-of-type").click();
    }

    hide() {
        this._thisCard.find("p.show-hide span:last-of-type").click();
    }

    static toggleBlock(elem, action) {
        if (!$(elem).hasClass("disabled")) {
            $(elem).parents(".show-hide-card").eq(0).toggleClass("hidden");
            $(elem).siblings(".disabled").removeClass("disabled");
            $(elem).addClass("disabled");
        }
        if (action === "show")
            localStorage.removeItem($(elem).parents("div.show-hide-card").eq(0).attr("id"));
        else
            localStorage.setItem($(elem).parents("div.show-hide-card").eq(0).attr("id"), "");
    }
}