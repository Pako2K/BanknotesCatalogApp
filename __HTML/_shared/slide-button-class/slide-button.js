"use strict"

/* DEPENDENCIES: 

*/

class SlideButton {

    /* 
        parentElement must be an empty block element with an id
        width and height to be set as pixels
     */
    constructor(parentElement, width, height, state, callback) {
        $("head").append('<link rel="stylesheet" type="text/css" href="/_shared/slide-button-class/slide-button.css">');

        this._id = parentElement.attr("id");

        if (!this._id || this._id === "")
            throw "Parent Element must have an id";

        // Create button
        parentElement.append("<div></div>");

        let button = parentElement.children("div");

        // Add class and set sizes
        let intRadFactor = 1;
        let extRadFactor = 1;
        if (width <= 50 || height <= 50) {
            parentElement.addClass("__small-slide-button__");
            extRadFactor = 4;
            intRadFactor = 6;
        } else {
            parentElement.addClass("__slide-button__");
        }

        // Add sliding button with the initial state
        parentElement.css("border-radius", 5 * extRadFactor + "% / " + 5 * extRadFactor * width / height + "%");
        $("head").append(`<style type="text/css">

            #${this._id}{
                width: ${width}px;
                height: ${height}px;
            }

            @media screen and (max-width: 1000px) {
                #${this._id}{
                    width: ${width*0.9}px;
                    height: ${height*0.9}px;
                };
            }
            
            @media screen and (max-width: 800px) {
                #${this._id}{
                    width: ${width*0.85}px;
                    height: ${height*0.85}px;
                };
            }
            
            @media screen and (max-width: 600px) {
                #${this._id}{
                    width: ${width*0.75}px;
                    height: ${height*0.75}px;
                };            
            }
            
            @media screen and (max-width: 400px) {
                #${this._id}{
                    width: ${width*0.7}px;
                    height: ${height*0.7}px;
                };            
            }
         </style>`);
        button.css("border-radius", 6 * intRadFactor + "% / " + 6 * intRadFactor * width / 2 / height + "%");
        if (state) {
            parentElement.addClass("__slide-button-on__");
        }

        // Add click event
        parentElement.on("click", () => {
            parentElement.toggleClass("__slide-button-on__");

            // Call the client callback
            callback(this._id, parentElement.hasClass("__slide-button-on__"));
        });
    }

    isActive() {
        let elem = $("#" + this._id);
        return elem.hasClass("__slide-button-on__");
    }

    click() {
        $("#" + this._id).click();
    }
}