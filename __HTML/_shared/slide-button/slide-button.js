"use strict"

function addSlideButton(id, isOn, aCallback) {
    let elem = $("#" + id);
    let elemW = elem.css("width").split("px")[0];
    let elemH = elem.css("height").split("px")[0];

    // Add class and set sizes
    let intRadFactor = 1;
    let extRadFactor = 1;
    if (elemW <= 50 || elemH <= 50) {
        elem.addClass("__small-slide-button__");
        extRadFactor = 4;
        intRadFactor = 6;
    } else {
        elem.addClass("__slide-button__");
    }

    // Add sliding button with the initial state
    elem.append("<div></div>");
    elem.css("border-radius", 5 * extRadFactor + "% / " + 5 * extRadFactor * elemW / elemH + "%");
    elem.children("div").css("border-radius", 6 * intRadFactor + "% / " + 6 * intRadFactor * elemW / 2 / elemH + "%");
    if (isOn) {
        elem.addClass("__slide-button-on__");
    }

    // Add click event
    elem.on("click", () => {
        elem.toggleClass("__slide-button-on__");

        // Call the client callback
        aCallback(id, elem.hasClass("__slide-button-on__"));
    });
}


function isSlideButtonSelected(id) {
    let elem = $("#" + id);
    return elem.hasClass("__slide-button-on__");
}