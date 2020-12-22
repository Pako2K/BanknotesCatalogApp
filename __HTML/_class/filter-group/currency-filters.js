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



const CUR_FILTER_FOUNDED_FROM = "-founded-from";
const CUR_FILTER_FOUNDED_TO = "-founded-to";
const CUR_FILTER_EXTINCT_FROM = "-extinct-from";
const CUR_FILTER_EXTINCT_TO = "-extinct-to";
const CUR_FILTER_CUR_TYPES_DISABLED = "-disabled-types";
const CUR_FILTER_EXISTING = "-is-exsiting";
const CUR_FILTER_EXTINCT = "-is-extinct";
const CUR_FILTER_EXISTING_IN_YEAR = "-existing-in";


class CurrencyFilters extends ShowHideCard {

    _thisContent;
    _changeCallback;
    _CONTENT_ID;

    /* currencyTypes = [String] */
    constructor(id, parentElem, currencyTypes, changeCallback) {
        super(id, parentElem, "Currency Filters");

        this._changeCallback = changeCallback;

        this._CONTENT_ID = `currency-filters-${id}`;

        this.setContent(`
            <div class="currency-filters" id='${this._CONTENT_ID}'>
                <div class="years-filter">
                    <div>
                    </div>
                    <div>
                    </div>
                </div>
                <div class="types-filter">
                    <p>Currency Type</p>
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
                        <p>Already Replaced</p>
                    </div>
                </div>
                <div class="existing-year-filter">
                    <p>Existing in</p>
                    <input type="number" onkeyup="if (event.which === 13) this.blur()">
                </div>
            </div>`);

        this._thisContent = $(`#${this._CONTENT_ID}`);
        let foundedFilter = new FromToFilter(this._thisContent.find("div.years-filter>div:first-of-type"), "Created", this._yearFilterChanged);
        let extinctFilter = new FromToFilter(this._thisContent.find("div.years-filter>div:last-of-type"), "Replaced", this._yearFilterChanged);

        foundedFilter.initFrom(localStorage.getItem(this._CONTENT_ID + CUR_FILTER_FOUNDED_FROM));
        foundedFilter.initTo(localStorage.getItem(this._CONTENT_ID + CUR_FILTER_FOUNDED_TO));
        extinctFilter.initFrom(localStorage.getItem(this._CONTENT_ID + CUR_FILTER_EXTINCT_FROM));
        extinctFilter.initTo(localStorage.getItem(this._CONTENT_ID + CUR_FILTER_EXTINCT_TO));

        // Load Currency types
        let disabledCurTypes = [];
        let cookie = localStorage.getItem(this._CONTENT_ID + CUR_FILTER_CUR_TYPES_DISABLED);
        if (cookie)
            disabledCurTypes = cookie.split("#");

        currencyTypes.forEach(element => {
            this._thisContent.find("div.types-filter>ul").append(`<li><div id="cur-type-${element}"></div>${element}</li>`);

            let initState = (disabledCurTypes.indexOf(element) === -1);

            new SlideButton($(`#cur-type-${element}`), 24, 13, initState, this._curTypeFilterChanged);
        });

        // Add slide buttons
        let stateFilters = this._thisContent.find("div.state-filter>div");
        stateFilters.eq(0).children("div").eq(0).attr("id", this._CONTENT_ID + "-existing-button");
        stateFilters.eq(1).children("div").eq(0).attr("id", this._CONTENT_ID + "-extinct-button");
        let initState = !(localStorage.getItem(this._CONTENT_ID + CUR_FILTER_EXISTING) === "false");
        new SlideButton(stateFilters.eq(0).children("div").eq(0), 30, 16, initState, this._stateFilterChanged);
        initState = !(localStorage.getItem(this._CONTENT_ID + CUR_FILTER_EXTINCT) === "false");
        new SlideButton(stateFilters.eq(1).children("div").eq(0), 30, 16, initState, this._stateFilterChanged);

        this._thisContent.find("div.existing-year-filter>input").on("blur", this._existingYearFilterChanged);

        let existingInYear = localStorage.getItem(this._CONTENT_ID + CUR_FILTER_EXISTING_IN_YEAR);
        if (existingInYear)
            this._thisContent.find("div.existing-year-filter>input").val(existingInYear);
    }


    getFilters() {
        let curTypes = localStorage.getItem(this._CONTENT_ID + CUR_FILTER_CUR_TYPES_DISABLED);
        let curTypesArray = [];
        if (curTypes) {
            curTypesArray = curTypes.split('#');
        }

        return {
            founded: {
                from: localStorage.getItem(this._CONTENT_ID + CUR_FILTER_FOUNDED_FROM),
                to: localStorage.getItem(this._CONTENT_ID + CUR_FILTER_FOUNDED_TO)
            },
            extinct: {
                from: localStorage.getItem(this._CONTENT_ID + CUR_FILTER_EXTINCT_FROM),
                to: localStorage.getItem(this._CONTENT_ID + CUR_FILTER_EXTINCT_TO)
            },
            disabledCurTypes: curTypesArray,
            isExisting: localStorage.getItem(this._CONTENT_ID + CUR_FILTER_EXISTING),
            isExtinct: localStorage.getItem(this._CONTENT_ID + CUR_FILTER_EXTINCT),
            existingInYear: localStorage.getItem(this._CONTENT_ID + CUR_FILTER_EXISTING_IN_YEAR)
        };
    }


    _yearFilterChanged = (filterName, from, to) => {
        if (filterName === "Created") {
            localStorage.setItem(this._CONTENT_ID + CUR_FILTER_FOUNDED_FROM, from);
            localStorage.setItem(this._CONTENT_ID + CUR_FILTER_FOUNDED_TO, to);
        } else {
            localStorage.setItem(this._CONTENT_ID + CUR_FILTER_EXTINCT_FROM, from);
            localStorage.setItem(this._CONTENT_ID + CUR_FILTER_EXTINCT_TO, to);
        }
        this._changeCallback();
    }

    _curTypeFilterChanged = (id, state) => {
        let curTypeId = id.split("-")[2];
        let disabledCurTypes = [];
        let cookie = localStorage.getItem(this._CONTENT_ID + CUR_FILTER_CUR_TYPES_DISABLED);
        if (cookie)
            disabledCurTypes = cookie.split("#");

        if (!state) {
            // Add to Cookie
            if (disabledCurTypes.indexOf(curTypeId) === -1)
                disabledCurTypes.push(curTypeId);
        } else {
            // Update Cookie
            let pos = disabledCurTypes.indexOf(curTypeId);
            if (pos !== -1)
                disabledCurTypes.splice(pos, 1);
        }
        localStorage.setItem(this._CONTENT_ID + CUR_FILTER_CUR_TYPES_DISABLED, disabledCurTypes.join("#"));

        this._changeCallback();
    }

    _stateFilterChanged = (id, state) => {
        if (id === this._CONTENT_ID + "-existing-button") {
            localStorage.setItem(this._CONTENT_ID + CUR_FILTER_EXISTING, state);
        } else {
            localStorage.setItem(this._CONTENT_ID + CUR_FILTER_EXTINCT, state);
        }

        this._changeCallback();
    }

    _existingYearFilterChanged = () => {
        let input = this._thisContent.find("div.existing-year-filter>input");

        if (input.data("init-value") !== input.val()) {
            localStorage.setItem(this._CONTENT_ID + CUR_FILTER_EXISTING_IN_YEAR, input.val());

            input.data("init-value", input.val());
            this._changeCallback();
        }
    }
}