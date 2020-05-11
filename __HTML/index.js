"use strict"

$(document).ready(function() {
    let user = getCookie("banknotes.ODB.username");
    if (user !== undefined && user !== "") {
        $(".user-input-section").hide();
    }
});


function showRegisterForm() {
    $("#form-usr").val("");
    $("#form-pwd").val("");

    $("form[name='login-form']").hide(300);
    $("form[name='register-form']").slideToggle(400);
}

function showLoginForm() {
    $("#register-form-usr").val("");
    $("#register-form-pwd").val("");
    $("#register-form-pwd-rep").val("");
    $("#register-form-mail").val("");

    $("form[name='register-form']").slideToggle(200);
    $("form[name='login-form']").show(400);
}

function register() {
    let usr = $("#register-form-usr").val();
    let pwd = $("#register-form-pwd").val();
    let pwdRep = $("#register-form-pwd-rep").val();
    let email = $("#register-form-mail").val();

    // Validate user info in the body 
    // User name must have at least 3 characters
    if (usr.length < 3) {
        alert("User name is too short (minimun length is 3 characters)");
        $("#register-form-usr").select();
        return;
    }

    // Mail must be valid xxx@yyy.zzz
    if (email.match(/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/gi) == null) {
        alert("Mail address is not valid");
        $("#register-form-mail").select();
        return;
    }

    // Password must have at least 8 characters
    if (pwd.length < 8) {
        alert("Password is too short (minimun length is 8 characters)");
        $("#register-form-pwd").select();
        return;
    }

    // Passwords must match
    if (pwd !== pwdRep) {
        alert("Passwords do not match!");
        $("#register-form-pwd-rep").select();
        return;
    }

    $.ajax({
        type: "PUT",
        url: "/user",
        contentType: "application/json",
        async: false,
        cache: false,
        data: JSON.stringify({ "username": usr, "password": btoa(pwd), "email": email }),
        timeout: 5000,
        dataType: 'text',

        success: function(result, status) {
            alert(`You are successfully registered. Have fun!`);
            showLoginForm();
        },

        error: function(xhr, status, error) {
            let exception;
            switch (xhr.status) {
                case 400:
                case 403:
                case 500:
                    exception = JSON.parse(xhr.responseText);
                    alert(`Registration failed. ${exception.code}: ${error}. ${exception.description}`);
                    break;
                default:
                    alert(`Registration failed. \n${xhr.status} - ${error}\nPlease try again or contact the web site administrator.`);
            }
        }
    });
}



function login() {
    let usr = $("#form-usr").val();
    let pwd = $("#form-pwd").val();

    $.ajax({
        type: "GET",
        url: "/user/session",
        async: false,
        cache: false,
        headers: {
            "authorization": "Basic " + btoa(usr + ":" + pwd)
        },
        timeout: 5000,
        dataType: 'json',

        success: function(result, status) {
            $("#username").text(usr);
            setCookie("banknotes.ODB.username", usr, 24 * 60 * 60);
            setCookie("banknotes.ODB.isAdmin", result.isAdmin, 24 * 60 * 60);
            setCookie("banknotes.ODB.lastConnection", result.lastConnection, 24 * 60 * 60);
            $("#_countries")[0].click();
        },

        error: function(xhr, status, error) {
            switch (xhr.status) {
                case 401:
                    alert(error + ": User name or password is not valid.");
                    break;
                case 500:
                    alert(`Login failed. \n${error}\nContact the web site administrator.`);
                    break;
                default:
                    alert(`Login failed. \n${xhr.status} - ${error}\nPlease try again or contact the web site administrator.`);
            }
        }
    });
}