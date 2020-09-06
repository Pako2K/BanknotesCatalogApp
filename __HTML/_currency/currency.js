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
    $.ajax({
        type: "GET",
        url: `/currency/${currencyId}${territoryIdQueryParam}`,
        async: true,
        cache: false,
        timeout: 5000,
        dataType: 'json',
        success: function(result, status) {
            setHeaders(result);
        },
        error: function(xhr, status, error) {
            alert(`Query failed. \n${status} - ${error}\nPlease contact the web site administrator.`);
        }
    });

    // Get basic data and stats for the currency series
    $.ajax({
        type: "GET",
        url: `/currency/${currencyId}/series${territoryIdQueryParam}`,
        async: true,
        cache: false,
        timeout: 5000,
        dataType: 'json',

        success: function(result, status) {
            // Store the data in the currency main page
            $(document).data("series-summary", JSON.stringify(result));

            // Load default navigation option
            $('#currency-nav>p').eq(0).data("series-id", seriesId);
            $('#currency-nav>p').eq(0).data("denomination", denomination);
            $("#view-section").load("./details/__details.html", initializeDetails);
        },

        error: function(xhr, status, error) {
            alert(`Query failed. \n${status} - ${error}\nPlease contact the web site administrator.`);
        }
    });

    if (getCookie("banknotes.ODB.username")) {
        // Load grades from DB
        $.ajax({
            type: "GET",
            url: `/grades`,
            async: true,
            cache: true,
            timeout: 5000,
            dataType: 'json',

            success: function(grades, status) {
                // store info so it can be reused in the upsert-collection form
                $("#grades-div").data("grades", grades);

                let gradesHTML = "";
                for (let grade of grades) {
                    gradesHTML += `<p class="${grade.grade}-grade" title="${grade.description}">${grade.name}</p>`;
                }
                $("#grades-div>div").append(gradesHTML);
            },

            error: function(xhr, status, error) {
                alert(`Query failed. \n${status} - ${error}\nPlease contact the web site administrator.`);
            }
        });
    } else {
        $("#grades-div").hide();
    }
});



function setHeaders(currencyJSON) {
    // Load country info into page
    $("#continent-div>img").attr("src", "/_shared/continents-filter/img/" + currencyJSON.territory.continentName.replace(" ", "").toLowerCase() + ".svg");
    $("#continent-div>p").text(currencyJSON.territory.continentName);

    $("#flag-div>a").attr("href", "/_country/index.html?countryId=" + currencyJSON.territory.id);
    $("#flag-div>a>img").attr("src", flagFileName(currencyJSON.territory));
    $("#country-data").data("territory-id", currencyJSON.territory.id);
    $("#country-data #name").text(currencyJSON.territory.name);
    $("#country-data>a").attr("href", "/_country/index.html?countryId=" + currencyJSON.territory.id);
    if (currencyJSON.territory.iso3)
        $("#country-data #iso3").text(currencyJSON.territory.iso3);
    else
        $("#country-data #name").next().hide();


    // Load currency info into page
    if (currencyJSON.symbol)
        $("#currency-symbol").text(currencyJSON.symbol);
    else
        $("#currency-symbol").hide();

    $("#currency-name").text(currencyJSON.name);
    $("#currency-name").data("plural", currencyJSON.namePlural);
    if (currencyJSON.iso3)
        $("#currency-iso3").text(currencyJSON.iso3);
    else
        $("#currency-name").next().hide();

    let period = "From " + currencyJSON.start.replace("-", ".").replace("-", ".");
    if (currencyJSON.end)
        period += " to " + currencyJSON.end.replace("-", ".").replace("-", ".");
    period += "";
    $("#currency-period").text(period);

    if (currencyJSON.units.length) {
        let subunits = "";
        for (let unit of currencyJSON.units) {
            if (unit.value > 1)
                subunits += "1 " + (currencyJSON.iso3 || currencyJSON.name) + " = " + unit.value + " " + unit.namePlural || unit.name;
            else
                subunits += 1 / unit.value + " " + (currencyJSON.iso3 || currencyJSON.namePlural || currencyJSON.name) + " = 1 " + unit.name;
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
        $("#currency-data>div img").hide();

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

    if (currencyJSON.predecessor) {
        $("#currency-predecessor").attr("href", "/_currency/index.html?currencyId=" + currencyJSON.predecessor.id);
        let name = currencyJSON.predecessor.name;
        if (currencyJSON.predecessor.iso3)
            name += " (" + currencyJSON.predecessor.iso3 + ")";
        $("#currency-predecessor").text(name)
        $("#predecessorRate").text("1 " + (currencyJSON.iso3 || currencyJSON.name) + " = " + currencyJSON.predecessor.rate.toLocaleString("de-DE") + " " + (currencyJSON.predecessor.iso3 || currencyJSON.predecessor.name));
    } else {
        $("#currency-predecessor").parent().hide();
    }

    if (currencyJSON.successor) {
        $("#currency-successor").attr("href", "/_currency/index.html?currencyId=" + currencyJSON.successor.id);
        let name = currencyJSON.successor.name;
        if (currencyJSON.successor.iso3)
            name += " (" + currencyJSON.successor.iso3 + ")";
        $("#currency-successor").text(name);
        $("#successorRate").text("1 " + (currencyJSON.successor.iso3 || name) + " = " + currencyJSON.successor.rate.toLocaleString("de-DE") + " " + (currencyJSON.iso3 || currencyJSON.name));
    } else {
        $("#currency-successor").parent().hide();
    }
}


function flagFileName(territory) {
    let path = "/data/_flags_/";
    if (territory.iso3)
        return path + territory.iso3.toLowerCase() + ".png";
    else {
        // Remove spaces and commas
        return path + territory.name.replace(/,|\s/g, "").toLowerCase() + ".png";
    }
}

function showDescription() {
    $("#currency-desc").parent().slideToggle(600);
}


function selectView(optionElem) {
    if ($(optionElem).hasClass('selected-view')) return;

    let option = $(optionElem).text().toLowerCase();
    $(".selected-view").removeClass('selected-view');
    $(optionElem).addClass('selected-view');
    switch (option) {
        case "summary":
            $("#view-section").load(`./${option}/__${option}.html`, initializeSummary);
            break;
        case "details":
            $("#view-section").load(`./${option}/__${option}.html`, initializeDetails);
            break;
        case "stats":
            $("#view-section").load(`./${option}/__${option}.html`, initializeStats);
            break;
    }

    resetExpiration();
}


function createCountryLink(territory) {
    let flagFile = flagFileName(territory);
    return `<a href="/_country/index.html?countryId=${territory.id}" target="_self"><img src="${flagFile}" alt="" /></a>  
            <a class="country-link" href="/_country/index.html?countryId=${territory.id}" target="_self">${territory.name}</a>`;
}