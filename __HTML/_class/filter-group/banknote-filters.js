/*
    DEPENDENCIES

    show-hide-card.css
    show-hide-card.js

    from-to-filter.css
    from-to-filter.js

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


const BAN_FILTER_ISSUED_FROM = "-issue-from";
const BAN_FILTER_ISSUED_TO = "-issue-to";
const BAN_FILTER_DENOM_FROM = "-denom-from";
const BAN_FILTER_DENOM_TO = "-denom-to";


class BanknoteFilters extends ShowHideCard {

    _thisContent;
    _changeCallback;
    _CONTENT_ID;


    constructor(id, parentElem, changeCallback) {
        super(id, parentElem, "Banknote Filters");

        this._changeCallback = changeCallback;

        this._CONTENT_ID = `banknote-filters-${id}`;

        this.setContent(`
            <div class="banknote-filters" id='${this._CONTENT_ID}'>
                <div class="years-filter">
                    <div>
                    </div>
                </div>
                <div class="denom-filter">
                    <div>
                    </div>
                </div>
            </div>`);

        this._thisContent = $(`#${this._CONTENT_ID}`);
        this.issuedFilter = new FromToFilter(this._thisContent.find("div.years-filter>div"), "Issued", this._issuedFilterChanged);
        this.denomFilter = new FromToFilter(this._thisContent.find("div.denom-filter>div"), "Denomination", this._denomFilterChanged);

        this.issuedFilter.initFrom(localStorage.getItem(this._CONTENT_ID + BAN_FILTER_ISSUED_FROM));
        this.issuedFilter.initTo(localStorage.getItem(this._CONTENT_ID + BAN_FILTER_ISSUED_TO));
        this.denomFilter.initFrom(localStorage.getItem(this._CONTENT_ID + BAN_FILTER_DENOM_FROM));
        this.denomFilter.initTo(localStorage.getItem(this._CONTENT_ID + BAN_FILTER_DENOM_TO));
    }


    getFilters() {
        return {
            issued: {
                from: localStorage.getItem(this._CONTENT_ID + BAN_FILTER_ISSUED_FROM),
                to: localStorage.getItem(this._CONTENT_ID + BAN_FILTER_ISSUED_TO)
            },
            denom: {
                from: localStorage.getItem(this._CONTENT_ID + BAN_FILTER_DENOM_FROM),
                to: localStorage.getItem(this._CONTENT_ID + BAN_FILTER_DENOM_TO)
            },
        };
    }

    setDenomFrom(denom) {
        this.denomFilter.initFrom(denom);
        localStorage.setItem(this._CONTENT_ID + BAN_FILTER_DENOM_FROM, denom);
    }

    setDenomTo(denom) {
        this.denomFilter.initTo(denom);
        localStorage.setItem(this._CONTENT_ID + BAN_FILTER_DENOM_TO, denom);
    }

    setIssuedFrom(year) {
        this.issuedFilter.initFrom(year);
        localStorage.setItem(this._CONTENT_ID + BAN_FILTER_ISSUED_FROM, year);
    }

    setIssuedTo(year) {
        this.issuedFilter.initTo(year);
        localStorage.setItem(this._CONTENT_ID + BAN_FILTER_ISSUED_TO, year);
    }

    _issuedFilterChanged = (filterName, from, to) => {
        localStorage.setItem(this._CONTENT_ID + BAN_FILTER_ISSUED_FROM, from);
        localStorage.setItem(this._CONTENT_ID + BAN_FILTER_ISSUED_TO, to);
        this._changeCallback();
    }

    _denomFilterChanged = (filterName, from, to) => {
        localStorage.setItem(this._CONTENT_ID + BAN_FILTER_DENOM_FROM, from);
        localStorage.setItem(this._CONTENT_ID + BAN_FILTER_DENOM_TO, to);
        this._changeCallback();
    }
}