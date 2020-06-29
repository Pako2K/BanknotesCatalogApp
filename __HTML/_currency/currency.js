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
        },
        error: function(xhr, status, error) {
            alert(`Query failed. \n${status} - ${error}\nPlease contact the web site administrator.`);
        }
    });

    // Get basic data and stats for the currency series
    $.ajax({
        type: "GET",
        url: `/currency/${currencyId}/series`,
        async: true,
        cache: false,
        timeout: 5000,
        dataType: 'json',

        success: function(result, status) {
            // Store the data in the currency main page
            $(document).data("series-summary", JSON.stringify(result));

            // Load default navigation option
            $("#view-section").load("./summary/__summary.html", initializeSummary);
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
        $("#predecessorRate").text("1 " + currencyData.iso3 + " = " + currencyData.predecessor.rate.toLocaleString("de-DE") + " " + (currencyData.predecessor.iso3 || currencyData.predecessor.name));
    } else {
        $("#currency-predecessor").parent().hide();
    }

    if (currencyData.successor) {
        $("#currency-successor").attr("href", "/_currency/index.html?currencyId=" + currencyData.successor.id);
        let name = currencyData.successor.name;
        if (currencyData.successor.iso3)
            name += " (" + currencyData.successor.iso3 + ")";
        $("#currency-successor").text(name);
        $("#successorRate").text("1 " + currencyData.successor.iso3 + " = " + currencyData.successor.rate.toLocaleString("de-DE") + " " + (currencyData.iso3 || currencyData.name));
    } else {
        $("#currency-successor").parent().hide();
    }
}


function flagFileName(territory) {
    let path = "/data/_flags_/";
    if (territory.iso3)
        return path + territory.iso3.toLowerCase() + ".png";
    else
        return path + territory.name.split(" ").join("").toLowerCase() + ".png";
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
            $("#view-section").load(`./${option}/__${option}.html`);
            break;
        case "stats":
            $("#view-section").load(`./${option}/__${option}.html`, initializeStats);
            break;
    }

}




// function addSeries(){
//     let newSeries = {
//         "currencyId": $("#currency-name").data("id"),
//         "name": $("input[name='series-name']").val(),
//         "issuer": $("input[name='series-issuer']").val(),
//         "start": $("input[name='series-start']").val(),
//         "end": $("input[name='series-end']").val(),
//         "lawDate": $("input[name='series-law']").val(),
//         "description": $("textarea").val()
//     };

//     var xhttp = new XMLHttpRequest();
//     xhttp.onreadystatechange = function() {
//         if (this.readyState === 4){
//             if(this.status === 200){
//                 alert("Series created / updated");
//                 cleanSeriesForm();
//                 initializeSeriesSummary(newSeries.currencyId);
//             }
//             else if (this.status === 403){
//                 alert("Insertion / Update failed (ERR = " + this.status + ", " + this.responseText + ").");
//             }
//             else{
//                 alert("Insertion / Update failed (ERR = " + this.status + ", " + this.responseText + "). Please try again");
//             }
//         }
//     };

//     console.log("New Series: " + JSON.stringify(newSeries));

//     if ($("#series-id").text() === ""){
//         xhttp.open("POST", "/currency/series", true);
//     }
//     else{
//         newSeries.id = $("#series-id").text();
//         xhttp.open("PUT", "/series", true);
//     }
//     xhttp.setRequestHeader("Content-type", "application/json");
//     xhttp.send(payload = JSON.stringify(newSeries));
// }


// function prepareSeriesEdit(seriesId){
//     let allSeries = JSON.parse($("#series-data").text());

//     // Search in the array
//     let series = allSeries.find((elem) => {return elem.id == seriesId;});


//     $("#series-id").text(seriesId);
//     $("input[name='series-name']").val(series.name);
//     $("input[name='series-issuer']").val(series.issuer);
//     $("input[name='series-start']").val(series.start);
//     $("input[name='series-end']").val(series.end);
//     $("input[name='series-law']").val(series.lawDate);
//     $("textarea[name='series-description']").val(series.description);
//     $('#add-series-dialog').show();
// }


// function cleanSeriesForm(){
//     $('#add-series-dialog').hide();

//     $("#series-id").text("");
//     $("input[name='series-name']").val("");
//     $("input[name='series-issuer']").val("");
//     $("input[name='series-start']").val("");
//     $("input[name='series-end']").val("");
//     $("input[name='series-law']").val("");
//     $("textarea[name='series-description']").val("");
// }