"use strict"

/* DEPENDENCIES: 

    /shared/cookies.js
    /shared/constants.js

*/


class ContinentsFilter {

    static clicked(elem, callback) {
        if ($(elem).hasClass("selectedContinent")) {
            /* DE-SELECT CLICKED ELEMENT */
            $(elem).removeClass("selectedContinent");
            $("p.deselectedContinent").removeClass("deselectedContinent");
            setCookie(_COOKIE_FILTER_CONT_PATH, "");
        } else {
            $(".selectedContinent").removeClass("selectedContinent");
            $(elem).removeClass("deselectedContinent");
            $(elem).addClass("selectedContinent");
            $("#continents-filter-html-container p:not(.selectedContinent)").addClass("deselectedContinent");
            let contId = $(elem).attr("id").split("-")[1];
            setCookie(_COOKIE_FILTER_CONT_PATH, contId);
        }

        // Call the callback for the page
        let contId = $(".selectedContinent").attr("id") || 0;
        let contName = "";
        if (contId) {
            contId = parseInt(contId.split("-")[1]);
            contName = $(".selectedContinent").text();
        };
        callback(contId, contName);
    }

    constructor(parentElement, onChangeCallback) {
        // $("head").append('<link rel="stylesheet" type="text/css" href="/_shared/continents-filter-class/continents-filter.css">');
        parentElement.append('<div class="super-container"><div id="continents-filter-html-container"></div><div>');
        // Load continents from db and assign on click function, synchronously!
        syncGET(`/continents`, (result, status) => {
            let container = $("#continents-filter-html-container");
            for (let cont of result) {
                container.append(`<div><p id="continentID-${cont.id}">${cont.name}</p><div>`);
                container.find("p").last().click(() => {
                    ContinentsFilter.clicked($(`#continentID-${cont.id}`), onChangeCallback);
                });
            }

            // Read cookie for selected continent
            let selectedId = getCookie(_COOKIE_FILTER_CONT_PATH);
            $(`#continentID-${selectedId}`).click();
        });
    }

    static getSelectedId() {
        let contId = $(".selectedContinent").attr("id") || "-0";

        return parseInt(contId.split("-")[1]);
    }

    static getSelectedName() {
        return $(".selectedContinent").text() || "";
    }
}