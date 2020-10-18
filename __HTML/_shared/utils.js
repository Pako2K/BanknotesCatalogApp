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



function parseCatalogueId(catalogueId) {
    let record = {};
    record.catalogueIdPreffix = "";
    record.catalogueIdInt = 0;
    record.catalogueIdSuffix = "";

    for (let i = 0; i < catalogueId.length; i++) {
        let char = catalogueId[i];
        let integer = parseInt(char);
        if (isNaN(integer))
            record.catalogueIdPreffix += char;
        else {
            record.catalogueIdInt = parseInt(catalogueId.slice(i));
            record.catalogueIdSuffix = catalogueId.slice(i + record.catalogueIdInt.toString().length)
            break;
        }
    }

    return record;
}