"use strict"

/* DEPENDENCIES: 

    /shared/cookies.js
    /shared/constants.js
    /shared/utils.js

*/

class NotesListTable {

    /* 
         catCols = [{name, JSONfield, align, isSortable, optionalShow}]
         colCols = [{name, JSONfield, align, isSortable, optionalShow}]
     */
    constructor(parentElement, catCols, colCols) {}

    /*
        param recordsJSON: should have at least the fields, "JSONfield", described in the constructor.
                            The collection fields should be part of an array. The value f each field is the 
                            html to be inserted in each table cell.
        param sortCols: array of column names to be used for sorting

    */
    loadData(recordsJSON, sortCols) {
        // Clean previous data
    }

    show() {}

    hide() {}
}