/*
    DEPENDENCIES

    show-hide-card.css
    show-hide-card.js

    from-to-filter.css
    from-to-filter.js

    slide-buton.css
    slide-buton.js

    filter-group.css
*/

if (!$("head>script[src='/_class/card/show-hide-card.js']").length) {
    $("head").append(`
        <link rel="stylesheet" type="text/css" href="/_class/card/card.css">
        <script src="/_class/card/show-hide-card.js"></script>`);
}
if (!$("head>script[src='/_class/from-to-filter/from-to-filter.js']").length) {
    $("head").append(`
        <link rel="stylesheet" type="text/css" href="/_class/from-to-filter/from-to-filter.css">
        <script src="/_class/from-to-filter/from-to-filter.js"></script>
`);
}
if (!$("head>script[src='/_class/slide-button/slide-button.js']").length) {
    $("head").append(`
        <link rel="stylesheet" type="text/css" href="/_class/slide-button/slide-button.css">
        <script src="/_class/slide-button/slide-button.js"></script>`);
}



const FILTER_FOUNDED_FROM = "-founded-from";
const FILTER_FOUNDED_TO = "-founded-to";
const FILTER_EXTINCT_FROM = "-extinct-from";
const FILTER_EXTINCT_TO = "-extinct-to";
const FILTER_TER_TYPES_DISABLED = "-disabled-types";
const FILTER_EXISTING = "-is-exsiting";
const FILTER_EXTINCT = "-is-extinct";
const FILTER_EXISTING_IN_YEAR = "-existing-in";


class TerritoryFilters extends ShowHideCard {

    _thisContent;
    _changeCallback;
    _CONTENT_ID;

    /* territoryTypes = [{id, name}] */
    constructor(id, parentElem, territoryTypes, changeCallback) {
        super(id, parentElem, "Territory Filters");

        this._changeCallback = changeCallback;

        this._CONTENT_ID = `territory-filters-${id}`;

        this.setContent(`
            <div class="territory-filters" id='${this._CONTENT_ID}'>
                <div class="years-filter">
                    <div>
                    </div>
                    <div>
                    </div>
                </div>
                <div class="types-filter">
                    <p>Territory Type</p>
                    <ul>
                    </ul>
                </div>
                <div class="state-filter">
                    <div>
                        <div></div>
                        <p>Currently Existing</p>
                    </div>
                    <div>
                        <div></div>
                        <p>Already Extinct</p>
                    </div>
                </div>
                <div class="existing-year-filter">
                    <p>Existing in</p>
                    <input type="number" onkeyup="if (event.which === 13) this.blur()">
                </div>
            </div>`);

        this._thisContent = $(`#${this._CONTENT_ID}`);
        let foundedFilter = new FromToFilter(this._thisContent.find("div.years-filter>div:first-of-type"), "Founded", this._yearFilterChanged);
        let extinctFilter = new FromToFilter(this._thisContent.find("div.years-filter>div:last-of-type"), "Extinct", this._yearFilterChanged);

        foundedFilter.initFrom(localStorage.getItem(this._CONTENT_ID + FILTER_FOUNDED_FROM));
        foundedFilter.initTo(localStorage.getItem(this._CONTENT_ID + FILTER_FOUNDED_TO));
        extinctFilter.initFrom(localStorage.getItem(this._CONTENT_ID + FILTER_EXTINCT_FROM));
        extinctFilter.initTo(localStorage.getItem(this._CONTENT_ID + FILTER_EXTINCT_TO));

        // Load Country types
        let disabledTerTypes = [];
        let cookie = localStorage.getItem(this._CONTENT_ID + FILTER_TER_TYPES_DISABLED);
        if (cookie)
            disabledTerTypes = cookie.split("#");

        territoryTypes.forEach(element => {
            this._thisContent.find("div.types-filter>ul").append(`<li><div id="ter-type-${element.id}"></div>${element.name}</li>`);

            let initState = (disabledTerTypes.indexOf(element.id.toString()) === -1);

            new SlideButton($(`#ter-type-${element.id}`), 24, 13, initState, this._terTypeFilterChanged);
        });

        // Add slide buttons
        let stateFilters = this._thisContent.find("div.state-filter>div");
        stateFilters.eq(0).children("div").eq(0).attr("id", this._CONTENT_ID + "-existing-button");
        stateFilters.eq(1).children("div").eq(0).attr("id", this._CONTENT_ID + "-extinct-button");
        let initState = !(localStorage.getItem(this._CONTENT_ID + FILTER_EXISTING) === "false");
        new SlideButton(stateFilters.eq(0).children("div").eq(0), 30, 16, initState, this._stateFilterChanged);
        initState = !(localStorage.getItem(this._CONTENT_ID + FILTER_EXTINCT) === "false");
        new SlideButton(stateFilters.eq(1).children("div").eq(0), 30, 16, initState, this._stateFilterChanged);

        this._thisContent.find("div.existing-year-filter>input").on("blur", this._existingYearFilterChanged);

        let existingInYear = localStorage.getItem(this._CONTENT_ID + FILTER_EXISTING_IN_YEAR);
        if (existingInYear)
            this._thisContent.find("div.existing-year-filter>input").val(existingInYear);
    }


    getFilters() {
        let terTypes = localStorage.getItem(this._CONTENT_ID + FILTER_TER_TYPES_DISABLED);
        let terTypesArray = [];
        if (terTypes) {
            terTypesArray = terTypes.split('#');
        }

        return {
            founded: {
                from: localStorage.getItem(this._CONTENT_ID + FILTER_FOUNDED_FROM),
                to: localStorage.getItem(this._CONTENT_ID + FILTER_FOUNDED_TO)
            },
            extinct: {
                from: localStorage.getItem(this._CONTENT_ID + FILTER_EXTINCT_FROM),
                to: localStorage.getItem(this._CONTENT_ID + FILTER_EXTINCT_TO)
            },
            disabledTerTypes: terTypesArray,
            isExisting: localStorage.getItem(this._CONTENT_ID + FILTER_EXISTING),
            isExtinct: localStorage.getItem(this._CONTENT_ID + FILTER_EXTINCT),
            existingInYear: localStorage.getItem(this._CONTENT_ID + FILTER_EXISTING_IN_YEAR)
        };
    }


    _yearFilterChanged = (filterName, from, to) => {
        if (filterName === "Founded") {
            localStorage.setItem(this._CONTENT_ID + FILTER_FOUNDED_FROM, from);
            localStorage.setItem(this._CONTENT_ID + FILTER_FOUNDED_TO, to);
        } else {
            localStorage.setItem(this._CONTENT_ID + FILTER_EXTINCT_FROM, from);
            localStorage.setItem(this._CONTENT_ID + FILTER_EXTINCT_TO, to);
        }
        this._changeCallback();
    }

    _terTypeFilterChanged = (id, state) => {
        let terTypeId = id.split("-")[2];
        let disabledTerTypes = [];
        let cookie = localStorage.getItem(this._CONTENT_ID + FILTER_TER_TYPES_DISABLED);
        if (cookie)
            disabledTerTypes = cookie.split("#");

        if (!state) {
            // Add to Cookie
            if (disabledTerTypes.indexOf(terTypeId) === -1)
                disabledTerTypes.push(terTypeId);
        } else {
            // Update Cookie
            let pos = disabledTerTypes.indexOf(terTypeId);
            if (pos !== -1)
                disabledTerTypes.splice(pos, 1);
        }
        localStorage.setItem(this._CONTENT_ID + FILTER_TER_TYPES_DISABLED, disabledTerTypes.join("#"));

        this._changeCallback();
    }

    _stateFilterChanged = (id, state) => {
        if (id === this._CONTENT_ID + "-existing-button") {
            localStorage.setItem(this._CONTENT_ID + FILTER_EXISTING, state);
        } else {
            localStorage.setItem(this._CONTENT_ID + FILTER_EXTINCT, state);
        }

        this._changeCallback();
    }

    _existingYearFilterChanged = () => {
        let input = this._thisContent.find("div.existing-year-filter>input");

        if (input.data("init-value") !== input.val()) {
            localStorage.setItem(this._CONTENT_ID + FILTER_EXISTING_IN_YEAR, input.val());

            input.data("init-value", input.val());
            this._changeCallback();
        }
    }
}