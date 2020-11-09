"use strict"

// Load continents from db and assign on click function, synchronously!
$.ajax({
    type: "GET",
    url: `/continents`,
    async: false,
    cache: true,
    timeout: TIMEOUT,
    dataType: 'json',

    success: function(result, status) {
        let contsHTML = '';
        for (let cont of result) {
            contsHTML += `<p id="contId-${cont.id}">${cont.name}</p>`;
        }
        $("#continents-filter").append(contsHTML);

        // Add click event and callback
        $("#continents-filter>p").click(continentClicked);

        // Read cookie for selected continent
        let selectedId = getCookie("banknotes.ODB.selectedContinent");
        if (selectedId) {
            $("#contId-" + selectedId).addClass("selectedContinent");
        }
    },
    error: function(xhr, status, error) {
        alert(`Query failed. \n${status} - ${error}\nPlease contact the web site administrator.`);
        window.location.pathname = "/";
    }
});


function continentClicked() {
    if ($(this).hasClass("selectedContinent")) {
        /* DE-SELECT CLICKED ELEMENT */
        $(this).removeClass("selectedContinent");
        setCookie("banknotes.ODB.selectedContinent", "");
    } else {
        $(".selectedContinent").removeClass("selectedContinent");
        $(this).addClass("selectedContinent");
        let contId = $(this).attr("id").split("-")[1];
        setCookie("banknotes.ODB.selectedContinent", contId);
    }

    // Call the callback for the page
    let contId = $(".selectedContinent").attr("id") || "0";
    if (contId !== "0") {
        contId = contId.split("-")[1];
    };
    continentFilterUpdated(contId);
}


// Get the path to the picture of the selected continent
function getSelectedImg() {
    let contName = $(".selectedContinent").text();
    // Upload icon
    if (contName)
        return "/_shared/continents-filter/img/" + contName.replace(" ", "").toLowerCase() + ".svg";
    else
        return "/_shared/continents-filter/img/world.svg";
}