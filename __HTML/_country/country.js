$(document).ready(function() {
    let countryId = window.location.search.substr("?countryId=".length);

    // Get data for the country header
    $.ajax({
        type: "GET",
        url: `/territory/${countryId}`,
        async: true,
        cache: false,
        timeout: 5000,
        dataType: 'json',
        success: function(result, status) {
            setCountryHeader(result);

            // Load results table for the selected navigation option
            let option = $(".selected-view").text();
            loadTable(option);
        },
        error: function(xhr, status, error) {
            alert(`Query failed. \n${status} - ${error}\nPlease contact the web site administrator.`);
        }
    });
});


function setCountryHeader(countryData) {
    // Load country info into page
    $("#continent-div>img").attr("src", "/_shared/continents-filter/img/" + countryData.continent.name.replace(" ", "").toLowerCase() + ".svg");
    $("#continent-div>p").text(countryData.continent.name);

    $("#name").text(countryData.name);
    $("#name").data("id", countryData.id);

    $("#flag-div>img").attr("src", flagFileName(countryData));
    if (countryData.iso3)
        $("#iso3").text(countryData.iso3);
    else
        $("#name").next().hide();

    let endDate = "";
    if (countryData.end != null) {
        endDate = " - " + countryData.end;
    }

    $("#full-name").text(countryData.officialName + ", " + countryData.start + endDate);
    if (countryData.description && countryData.description.length > 0)
        $("#country-desc").html(countryData.description);
    else
        $("#country-data img").remove();
    let countryType = countryData.territoryType.name;
    let relation = "";
    if (countryType === "Not Recognized State")
        relation = "Claimed by:";
    if (countryType === "Territory")
        relation = "Belongs to:";
    if (relation !== "") {
        $("#parent-country").show();
        $("#parent-country>p").text(relation);
        $("#parent-country>a").attr("href", "/_country/index.html?countryId=" + countryData.parent.id);
        $("#parent-country>a>img").attr("src", flagFileName(countryData.parent));
        $("#parent-country>a>span").text(countryData.parent.name);
    }
    if (countryData.successors && countryData.successors.length) {
        $("#successors").show();
        for (let suc of countryData.successors) {
            $("#successors").append(createCountryLink(suc));
        }
    }

    if (countryData.predecessors && countryData.predecessors.length) {
        $("#predecessors").show();
        for (let pred of countryData.predecessors) {
            $("#predecessors").append(createCountryLink(pred));
        }
    }
}

function showDescription() {
    $("#country-desc").parent().slideToggle(600);
}

function flagFileName(territory) {
    let path = "/data/_flags_/";
    if (territory.iso3)
        return path + territory.iso3.toLowerCase() + ".png";
    else
        return path + territory.name.split(" ").join("").toLowerCase() + ".png";
}

function createCountryLink(territory) {
    let flagFile = flagFileName(territory);
    return `<a class="country-link" href="/_country/index.html?countryId=${territory.id}" target="_self">
                <img src="${flagFile}" alt="" />
                <span>${territory.name}</span>
            </a>`;
}


function loadTable(option) {
    $("#results-table").empty();
    let countryId = $("#name").data("id");
    switch (option) {
        case "Currencies":
            $("#results-table").load("./_currencies/table.html", (responseTxt, statusTxt, xhr) => {
                if (statusTxt == "success")
                    loadCurrenciesTable(countryId);
            });
            break;
        case "Series":
            $("#results-table").load("./_series/table.html", (responseTxt, statusTxt, xhr) => {
                if (statusTxt == "success")
                    loadSeriesTable(countryId);
            });
            break;
        case "Denominations":
            $("#results-table").load("./_denominations/table.html", (responseTxt, statusTxt, xhr) => {
                if (statusTxt == "success")
                    loadDenominationsTable(countryId);
            });
            break;
        case "Years":
            $("#results-table").load("./_years/table.html", (responseTxt, statusTxt, xhr) => {
                if (statusTxt == "success")
                    loadYearsTable(countryId);
            });
            break;
    }
}


function selectView(option) {
    if (!$(option).hasClass(".selected-view")) {
        $("#country-nav>p.selected-view").removeClass("selected-view");
        $(option).addClass("selected-view");
        loadTable($(option).text());
    }

}