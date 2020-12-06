"use strict"

const TIMEOUT = 15000;

const _COOKIE_FILTER_CONT_PATH = "BOC.filter.continent";
const _COOKIE_USERNAME = "BOC.user.name";
const _COOKIE_IS_ADMIN = "BOC.user.isAdmin";
const _COOKIE_LAST_CONNECTION = "BOC.user.lastConnection";
const _COOKIE_BOOKMARKS = "BOC.bookmarks";

const _COOKIE_COUNTRY_FILTERS_HIDE = "BOC.territory.filters.hide";
const _COOKIE_COUNTRY_STATS_HIDE = "BOC.territory.stats.hide";

const _COOKIE_COUNTRY_FILTER_FOUNDED_FROM = "BOC.territory.filter.founded.from";
const _COOKIE_COUNTRY_FILTER_FOUNDED_TO = "BOC.territory.filter.founded.to";
const _COOKIE_COUNTRY_FILTER_EXTINCT_FROM = "BOC.territory.filter.extinct.from";
const _COOKIE_COUNTRY_FILTER_EXTINCT_TO = "BOC.territory.filter.extinct.to";
const _COOKIE_COUNTRY_FILTER_TER_TYPES_DISABLED = "BOC.territory.filter.disabled-types";
const _COOKIE_COUNTRY_FILTER_EXISTING = "BOC.territory.filter.is-exsiting";
const _COOKIE_COUNTRY_FILTER_EXTINCT = "BOC.territory.filter.is-extinct";
const _COOKIE_COUNTRY_FILTER_EXISTING_IN_YEAR = "BOC.territory.filter.existing-in";

const _COOKIE_CURRENCY_FILTERS_HIDE = "BOC.currency.filters.hide";
const _COOKIE_CURRENCY_STATS_HIDE = "BOC.currency.stats.hide";

const _COOKIE_CURRENCY_FILTER_FOUNDED_FROM = "BOC.currency.filter.founded.from";
const _COOKIE_CURRENCY_FILTER_FOUNDED_TO = "BOC.currency.filter.founded.to";
const _COOKIE_CURRENCY_FILTER_EXTINCT_FROM = "BOC.currency.filter.extinct.from";
const _COOKIE_CURRENCY_FILTER_EXTINCT_TO = "BOC.currency.filter.extinct.to";
const _COOKIE_CURRENCY_FILTER_CUR_TYPES_DISABLED = "BOC.currency.filter.disabled-types";
const _COOKIE_CURRENCY_FILTER_EXISTING = "BOC.currency.filter.is-exsiting";
const _COOKIE_CURRENCY_FILTER_EXTINCT = "BOC.currency.filter.is-extinct";
const _COOKIE_CURRENCY_FILTER_EXISTING_IN_YEAR = "BOC.currency.filter.existing-in";

const _COOKIE_DENOMINATIONS_FILTERS_HIDE = "BOC.denominations.filters.hide";
const _COOKIE_DENOMINATIONS_FILTER_ISSUED_FROM = "BOC.denominations.filter.issued.from";
const _COOKIE_DENOMINATIONS_FILTER_ISSUED_TO = "BOC.denominations.filter.issued.to";

const _COOKIE_YEARS_FILTERS_HIDE = "BOC.years.filters.hide";
const _COOKIE_YEARS_FILTER_ISSUED_FROM = "BOC.years.filter.issued.from";
const _COOKIE_YEARS_FILTER_ISSUED_TO = "BOC.years.filter.issued.to";

const _COOKIE_COLLECTION_FILTERS_HIDE = "BOC.years.filters.hide";
const _COOKIE_COLLECTION_FILTER_ONLY_DUPLICATES = "BOC.collection.filters.only-duplicates";
const _COOKIE_COLLECTION_FILTER_NO_DUPLICATES = "BOC.collection.filters.no-duplicates";