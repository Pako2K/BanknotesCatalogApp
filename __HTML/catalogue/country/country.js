"use strict"

let countryId;
let currenciesJSON;

$(document).ready(function() {
    countryId = window.location.search.split("&")[0].substr("?countryId=".length);

    // Get data for the country header
    asyncGET(`/territory/${countryId}`, (countryData, status) => {
        // Load country info into page
        $("#country-cont>img").attr("src", "/_shared/continents-filter-class/img/" + countryData.continent.name.replace(" ", "").toLowerCase() + ".svg");
        $("#country-cont>p").text(countryData.continent.name);

        $("#country-flag>img").attr("src", flagFileName(countryData));

        $("#short-name").prepend(countryData.name);

        if (countryData.iso3)
            $("#iso3").append(countryData.iso3);
        else
            $("#iso3").hide();

        $("#full-name").prepend(countryData.officialName);
        $("#start-date").text(countryData.start);
        if (countryData.end != null)
            $("#end-date").append(countryData.end);
        else
            $("#end-date").hide();

        if (countryData.description && countryData.description.length > 0)
            $("#country-desc").html(countryData.description);
        else
            $("#country-name div.info-button").hide();

        let countryType = countryData.territoryType.name;
        let relation = "";
        if (countryType === "Not Recognized State")
            relation = "Claimed by:";
        if (countryType === "Territory")
            relation = "Belongs to:";
        if (relation !== "") {
            $("#country-parent").show();
            $("#country-parent>p").text(relation);
            $("#country-parent a").attr("href", "/catalogue/country/index.html?countryId=" + countryData.parent.id);
            $("#country-parent img").attr("src", flagFileName(countryData.parent));
            $("#country-parent a").text(countryData.parent.name);
        }

        if (countryData.predecessors && countryData.predecessors.length) {
            $("#country-pred").show();
            for (let pred of countryData.predecessors) {
                $("#country-pred").append(createCountryLink(pred));
            }
        }

        if (countryData.successors && countryData.successors.length) {
            $("#country-suc").show();
            for (let suc of countryData.successors) {
                $("#country-suc").append(createCountryLink(suc));
            }
        }

        // Add country to bookmarks
        Header.updateBookmarks(window.location.pathname + window.location.search, countryData.name);
    });

    // Retrieve and store currencies info
    let variantsUri;
    let itemsUri;
    if (Session.getUsername())
        itemsUri = `/territory/${countryId}/currencies/items/stats`;
    else
        variantsUri = `/territory/${countryId}/currencies/variants/stats`;

    asyncGET(variantsUri || itemsUri, (results, status) => {
        if (variantsUri) {
            // Add null collectionStats
            for (let row of results) {
                row.start = parseInt(row.start.slice(0, 4));
                if (row.end) row.end = parseInt(row.end.slice(0, 4));
                row.collectionStats = {};
                row.collectionStats.numCurrencies = 0;
                row.collectionStats.numSeries = 0;
                row.collectionStats.numDenominations = 0;
                row.collectionStats.numNotes = 0;
                row.collectionStats.numVariants = 0;
                row.collectionStats.price = 0;
            }
        } else {
            for (let row of results) {
                row.start = parseInt(row.start.slice(0, 4));
                if (row.end) row.end = parseInt(row.end.slice(0, 4));
            }
        }
        currenciesJSON = results;

        // Load results table for the selected navigation option
        let optionId = sessionStorage.getItem("Country.Option");
        if (optionId)
            $(`#${optionId}`).click();
        else
            $(`#country-views>p:first-of-type`).click();
    });
});


function toggleDescription(elem) {
    $(elem).toggleClass("button-pushed");
    $("#country-desc").slideToggle(500);
}



function selectView(option) {
    if (!$(option).hasClass(".selected-view")) {
        $("#country-views>p.selected-view").removeClass("selected-view");
        $(option).addClass("selected-view");
        sessionStorage.setItem("Country.Option", $(option).attr("id"));
        switch ($(option).text()) {
            case "Currencies":
                showCurrencies();
                break;
            case "Statistics":
                showStatistics();
                break;
            case "Banknotes":
                showBanknotes();
                break;
        }
    }
}