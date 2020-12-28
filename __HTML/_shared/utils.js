"use strict"

// Main sorting field is a path to the field (up to level 2). Ex.: field1.field2
// Optional additional sorting fields must be at the first level of the Json tree
function sortJSON(jsonArray, sortingFields, sortingAsc) {
    // Parse main sorting field
    let sortFieldTokens = sortingFields[0].split('.');
    let numSortFields = sortingFields.length;

    if (sortFieldTokens.length === 1) {
        // Re-sort based on the sorting field names
        jsonArray.sort((a, b) => {
            // Compare in case the values are null
            let idx = 0;
            let result = 0;
            while (!result && idx < numSortFields) {
                if (idx > 0 && !sortingAsc)
                    result = compareValues(b[sortingFields[idx]], a[sortingFields[idx]]);
                else
                    result = compareValues(a[sortingFields[idx]], b[sortingFields[idx]]);
                idx++;
            }
            return result;
        });
    } else {
        // Re-sort based on the sorting field names
        jsonArray.sort((a, b) => {
            // Compare in case the values are null
            let idx = 0;
            let result = 0;
            let a_value = a[sortFieldTokens[0]][sortFieldTokens[1]];
            let b_value = b[sortFieldTokens[0]][sortFieldTokens[1]];
            while (!result && idx < numSortFields) {
                if (idx > 0 && !sortingAsc)
                    result = compareValues(b_value, a_value);
                else
                    result = compareValues(a_value, b_value);
                idx++;
                a_value = a[sortingFields[idx]];
                b_value = b[sortingFields[idx]];
            }
            return result;
        });
    }

    if (!sortingAsc)
        jsonArray.reverse();

    return jsonArray;
}


// Returns a negative number if v2 > v1, or positive number if v1> v2, or 0 if v1===v2
function compareValues(v1, v2) {
    if (v1 == null && v2 == null) return 0;
    if (v2 == null) return 1;
    if (v1 == null) return -1;

    if (typeof v1 === "string")
        return v1.localeCompare(v2);
    else
        return v1 - v2;
}


function flagFileName(territory) {
    let path = "/data/_flags_/";
    if (territory.iso3)
        return path + territory.iso3.toLowerCase() + ".png";
    else {
        // Remove spaces and commas
        return path + territory.name.replace(/,|\s/g, "").toLowerCase() + ".png";
    }
}


function createCountryLink(territory) {
    let flagFile = flagFileName(territory);
    return `<div class="country-link">
                <img src="${flagFile}" alt="" />
                <a href="/catalogue/country/index.html?countryId=${territory.id}" target="_self">${territory.name}</a>
            </div>`;
}