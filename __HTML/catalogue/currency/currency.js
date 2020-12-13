$(document).ready(function() {
    let searchStrArr = window.location.search.substr(1).split("&");
    let searchParam = searchStrArr[0].split("=");
    let currencyId = searchParam[0] === "currencyId" ? searchParam[1] : "";

    // Optional parameters
    let seriesId = "";
    let denomination = "";
    let territoryIdQueryParam = "";
    if (searchStrArr[1]) {
        searchParam = searchStrArr[1].split("=");
        seriesId = searchParam[0] === "seriesId" ? searchParam[1] : "";
        territoryIdQueryParam = searchParam[0] === "territoryId" ? `?territoryId=${searchParam[1]}` : "";

        if (searchStrArr[2]) {
            searchParam = searchStrArr[2].split("=");
            denomination = searchParam[0] === "denomination" ? searchParam[1] : "";
        }
    }

    // Get data for the country and currency header
    asyncGET(`/currency/${currencyId}${territoryIdQueryParam}`, (currencyJSON, status) => {
        // Load country info into page
        $("#country-data a").attr("href", "/catalogue/country/index.html?countryId=" + currencyJSON.territory.id);
        $("#country-flag img").attr("src", flagFileName(currencyJSON.territory));
        $("#country-data").data("territory-id", currencyJSON.territory.id);
        $("#country-name a").text(currencyJSON.territory.name);

        // Load currency info into page
        if (currencyJSON.symbol)
            $("#currency-symbol").text(currencyJSON.symbol);
        else
            $("#currency-symbol").hide();

        $("#currency-name").text(currencyJSON.name);
        $("#currency-name").data("plural", currencyJSON.namePlural);
        if (currencyJSON.iso3)
            $("#currency-iso3").append(currencyJSON.iso3);
        else
            $("#currency-iso3").hide();

        if (currencyJSON.fullName)
            $("#currency-full-name").text(currencyJSON.fullName);

        $("#currency-start").append(currencyJSON.start.replace("-", ".").replace("-", "."));
        if (currencyJSON.end)
            $("#currency-end").append(currencyJSON.end.replace("-", ".").replace("-", "."));
        else
            $("#currency-end").hide();

        if (currencyJSON.units.length) {
            let subunits = "";
            for (let unit of currencyJSON.units) {
                if (unit.value > 1)
                    subunits += "1 " + (currencyJSON.symbol || currencyJSON.name) + " = " + unit.value.toLocaleString("de-DE") + " " + unit.namePlural || unit.name;
                else
                    subunits += (1 / unit.value).toLocaleString("de-DE") + " " + (currencyJSON.symbol || currencyJSON.namePlural || currencyJSON.name) + " = 1 " + unit.name;
                if (unit.abbreviation)
                    subunits += " (" + unit.abbreviation + ")";
                subunits += "<br>";
            }
            $("#currency-subunit").html(subunits);
            $("#currency-subunit").data("units", currencyJSON.units);
        }

        if (currencyJSON.description)
            $("#currency-desc").html(currencyJSON.description);
        else
            $("#currency-data div.info-button").hide();

        if (currencyJSON.predecessor) {
            $("#currency-predecessor a").attr("href", "/catalogue/currency/index.html?currencyId=" + currencyJSON.predecessor.id);
            let name = currencyJSON.predecessor.name;
            if (currencyJSON.predecessor.iso3)
                name += " (" + currencyJSON.predecessor.iso3 + ")";
            $("#currency-predecessor a").text(name)
            if (currencyJSON.predecessor.rate)
                $("#predecessorRate").text("1 " + (currencyJSON.iso3 || currencyJSON.name) + " = " + currencyJSON.predecessor.rate.toLocaleString("de-DE") + " " + (currencyJSON.predecessor.iso3 || currencyJSON.predecessor.name));
        } else {
            $("#currency-predecessor").hide();
        }

        if (currencyJSON.successor) {
            $("#currency-successor a").attr("href", "/catalogue/currency/index.html?currencyId=" + currencyJSON.successor.id);
            let name = currencyJSON.successor.name;
            if (currencyJSON.successor.iso3)
                name += " (" + currencyJSON.successor.iso3 + ")";
            $("#currency-successor a").text(name);
            if (currencyJSON.successor.rate)
                $("#successorRate").text("1 " + (currencyJSON.successor.iso3 || name) + " = " + currencyJSON.successor.rate.toLocaleString("de-DE") + " " + (currencyJSON.iso3 || currencyJSON.name));
        } else {
            $("#currency-successor").hide();
        }

        if (currencyJSON.currencyType === "OWNED" && currencyJSON.sharedBy) {
            $("#sharing-country").show();
            for (let territory of currencyJSON.sharedBy)
                $("#sharing-country").append(createCountryLink(territory));
        }
        if (currencyJSON.currencyType === "SHARED") {
            $("#owning-country").show();
            $("#owning-country").append(createCountryLink(currencyJSON.ownedBy));
            if (currencyJSON.sharedBy) {
                $("#sharing-country").show();
                for (let territory of currencyJSON.sharedBy) {
                    if (territory.id !== currencyJSON.territory.id)
                        $("#sharing-country").append(createCountryLink(territory));
                }
            }
        }

        // Add currency to bookmarks
        Header.updateBookmarks(window.location.pathname + window.location.search, currencyJSON.territory.name, currencyJSON.name + `${currencyJSON.iso3?' - ' + currencyJSON.iso3:""}`);
    });

    // Get basic data and stats for the currency series
    asyncGET(`/currency/${currencyId}/series${territoryIdQueryParam}`, (result, status) => {
        // Store the data in the currency main page
        $(document).data("series-summary", JSON.stringify(result));

        // Load default navigation option
        $('#currency-views>p').eq(0).data("series-id", seriesId);
        $('#currency-views>p').eq(0).data("denomination", denomination);
        $('#currency-views>p').eq(0).click();
    });

    if (Session.getUsername()) {
        // Load grades from DB
        asyncGET("/grades", (grades, status) => {
            // store info so it can be reused in the upsert-collection form
            $("#grades-coding").data("grades", grades);

            let gradesHTML = "";
            for (let grade of grades) {
                gradesHTML += `<p class="${grade.grade}-grade" title="${grade.description}">${grade.name}</p>`;
            }
            $("#grades-coding>div").append(gradesHTML);
        });
    } else {
        $("#grades-coding").hide();
    }
});


function showDescription() {
    $("#currency-desc").parent().slideToggle(600);
}


function selectView(optionElem) {
    if ($(optionElem).hasClass('selected-view')) return;

    let option = $(optionElem).text().toLowerCase();
    $(".selected-view").removeClass('selected-view');
    $(optionElem).addClass('selected-view');
    switch (option) {
        case "details":
            $("#view-section").load(`./${option}/__${option}.html`, initializeDetails);
            break;
        case "timeline":
            $("#view-section").load(`./${option}/__${option}.html`, initializeTimeline);
            break;
        case "list":
            $("#view-section").load(`./${option}/__${option}.html`, initializeList);
            break;
        case "statistics":
            $("#view-section").load(`./${option}/__${option}.html`, initializeStats);
            break;
    }
}


function toggleDescription(elem) {
    $(elem).toggleClass("button-pushed");
    $("#currency-desc").slideToggle(500);
}