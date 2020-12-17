"use strict"

let countryId;

$(document).ready(function() {
    countryId = window.location.search.substr("?countryId=".length);

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

    // Load results table for the selected navigation option
    $("#country-views>p:first-of-type").click();

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
    }
});


function toggleDescription(elem) {
    $(elem).toggleClass("button-pushed");
    $("#country-desc").slideToggle(500);
}



function selectView(option) {
    if (!$(option).hasClass(".selected-view")) {
        $("#country-views>p.selected-view").removeClass("selected-view");
        $(option).addClass("selected-view");
        switch ($(option).text()) {
            case "Currencies":
                $("#grades-coding").hide();
                showCurrencies();
                break;
            case "Statistics":
                $("#grades-coding").hide();
                showStatistics();
                break;
            case "Banknotes":
                if (Session.getUsername())
                    $("#grades-coding").show();
                else
                    $("#grades-coding").hide();
                $("#results-section").empty();
                $("#results-section").append('<div class="card"></div>');
                $("#results-section>div").load("./_list/table.html", () => {
                    loadListTable(countryId, currenciesTable.getData());
                });
                break;
        }
    }
}