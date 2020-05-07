"use strict"

function setCookie(cname, cvalue, expSecs = 0, path = "/") {
    var expires = "";
    if (expSecs > 0) {
        var d = new Date();
        d.setTime(d.getTime() + (expSecs * 1000));
        expires = "expires=" + d.toUTCString() + ";";
    }
    document.cookie = cname + "=" + cvalue + "; " + expires + "path=" + path + "; ";
}


function getCookie(cname) {
    let cookie = document.cookie;
    let ccs = cookie.split(';');
    let found;
    for (let cc of ccs) {
        let i = 0;
        while (cc.charAt(i) === ' ') i++;
        if (cc.indexOf(cname + "=") === i) {
            found = cc.substring(i + cname.length + 1, cc.length);
            break;
        }
    }
    return found;
}

function deleteCookie(cname, path = "/") {
    var d = new Date();
    d.setTime(d.getTime() - 1);
    document.cookie = cname + "=; expires=" + d.toUTCString() + "; path=" + path + ";";
}