$(document).ready(function() {
    let currencyId = window.location.search.substr("?currencyId=".length);

    // Get data for the country and currency header
    $.ajax({
        type: "GET",
        url: `/currency/${currencyId}`,
        async: true,
        cache: false,
        timeout: 5000,
        dataType: 'json',
        success: function(result, status) {
            setHeaders(result);

            // Load results table for the selected navigation option
            let option = $(".selected-view").text();
            loadTable(option);
        },
        error: function(xhr, status, error) {
            alert(`Query failed. \n${status} - ${error}\nPlease contact the web site administrator.`);
        }
    });
});



function setHeaders(currencyData) {
    // Load country info into page
    $("#continent-div>img").attr("src", "/_shared/continents-filter/img/" + currencyData.territory.continentName.replace(" ", "").toLowerCase() + ".svg");
    $("#continent-div>p").text(currencyData.territory.continentName);

    $("#flag-div>a").attr("href", "/_country/index.html?countryId=" + currencyData.territory.id);
    $("#flag-div>a>img").attr("src", flagFileName(currencyData.territory));
    $("#country-data #name").text(currencyData.territory.name);
    $("#country-data>a").attr("href", "/_country/index.html?countryId=" + currencyData.territory.id);
    if (currencyData.territory.iso3)
        $("#country-data #iso3").text(currencyData.territory.iso3);
    else
        $("#country-data #name").next().hide();


    // Load currency info into page
    if (currencyData.symbol)
        $("#currency-symbol").text(currencyData.symbol);
    else
        $("#currency-symbol").hide();

    $("#currency-name").text(currencyData.name);
    if (currencyData.iso3)
        $("#currency-iso3").text(currencyData.iso3);
    else
        $("#currency-name").next().hide();

    let period = "From " + currencyData.start.replace("-", ".").replace("-", ".");
    if (currencyData.end)
        period += " to " + currencyData.end.replace("-", ".").replace("-", ".");
    period += "";
    $("#currency-period").text(period);

    if (currencyData.units.length) {
        let subunits = "";
        for (let unit of currencyData.units) {
            subunits += "1 " + (currencyData.iso3 || currencyData.name) + " = " + unit.value + " " + unit.name;
            if (unit.abbreviation)
                subunits += " (" + unit.abbreviation + ")";
            subunits += "<br>";
        }
        $("#currency-subunit").html(subunits);
    }

    if (currencyData.description)
        $("#currency-desc").html(currencyData.description);
    else
        $("#currency-data>div img").hide();



    if (currencyData.predecessor) {
        $("#currency-predecessor").attr("href", "/_currency/index.html?currencyId=" + currencyData.predecessor.id);
        let name = currencyData.predecessor.name;
        if (currencyData.predecessor.iso3)
            name += " (" + currencyData.predecessor.iso3 + ")";
        $("#currency-predecessor").text(name)
        $("#predecessorRate").text("1 " + currencyData.iso3 + " = " + currencyData.predecessor.rate.toLocaleString("de-DE") + " " + currencyData.predecessor.iso3);
    } else {
        $("#currency-predecessor").parent().hide();
    }

    if (currencyData.successor) {
        $("#currency-successor").attr("href", "/_currency/index.html?currencyId=" + currencyData.successor.id);
        let name = currencyData.successor.name;
        if (currencyData.successor.iso3)
            name += " (" + currencyData.successor.iso3 + ")";
        $("#currency-successor").text(name);
        $("#successorRate").text("1 " + currencyData.successor.iso3 + " = " + currencyData.successor.rate.toLocaleString("de-DE") + " " + currencyData.iso3);
    } else {
        $("#currency-successor").parent().hide();
    }




    // let endDate = "";
    // if (currencyData.end != null) {
    //     endDate = " - " + currencyData.end;
    // }

    // $("#full-name").text(currencyData.fullName + ", " + currencyData.start + endDate);
    // if (currencyData.description && currencyData.description.length > 0)
    //     $("#country-desc").html(currencyData.description);
    // else
    //     $("#country-data img").remove();
    // let countryType = currencyData.territoryType.name;
    // let relation = "";
    // if (countryType === "Not Recognized State")
    //     relation = "Claimed by:";
    // if (countryType === "Territory")
    //     relation = "Belongs to:";
    // if (relation !== "") {
    //     $("#parent-country").show();
    //     $("#parent-country>p").text(relation);
    //     $("#parent-country>a").attr("href", "/_country/index.html?countryId=" + currencyData.parent.id);
    //     $("#parent-country>a>img").attr("src", flagFileName(currencyData.parent));
    //     $("#parent-country>a>span").text(currencyData.parent.name);
    // }
    // if (currencyData.successors.length) {
    //     $("#successors").show();
    //     for (let suc of currencyData.successors) {
    //         $("#successors").append(createCountryLink(suc));
    //     }
    // }

    // if (currencyData.predecessors.length) {
    //     $("#predecessors").show();
    //     for (let pred of currencyData.predecessors) {
    //         $("#predecessors").append(createCountryLink(pred));
    //     }
    // }
}


function flagFileName(territory) {
    let path = "/_countries/img/flags/";
    if (territory.iso3)
        return path + territory.iso3.toLowerCase() + ".png";
    else
        return path + territory.name.split(" ").join("").toLowerCase() + ".png";
}


function showDescription() {
    $("#currency-desc").parent().slideToggle(600);
}


function loadTable(option) {

}