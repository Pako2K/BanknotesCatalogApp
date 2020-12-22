/*
    DEPENDENCIES
    
    card.css
*/

class SimpleCard {

    _thisCard;
    constructor(parent, title, subtitle) {
        parent.append(`
            <div class="simple-card">
                <div class="card-title">
                    <p class="title">${title}</p>
                    <p class="subtitle">${subtitle}</p>
                </div>
                <div>
                </div>
            </div>`);

        this._thisCard = parent.children("div.simple-card").last();
    }

    setContent(contentHTML) {
        this._thisCard.children().eq(1).empty().append(contentHTML);
    }

    setSubtitle(subtitle) {
        this._thisCard.find("p.subtitle").html(subtitle);
    }
}