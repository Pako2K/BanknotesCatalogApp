"use strict"

$(document).ready(function() {
    let user = getCookie("banknotes.ODB.username");
    if (user !== undefined && user !== "") {
        $(".user-input-section").hide();
    }
});

function toggleInfo(elem) {
    $(elem).siblings("p").slideToggle(400);
}

function showRegisterForm() {
    $("#register-form-usr").val("");
    $("#register-form-pwd").val("");
    $("#register-form-pwd-rep").val("");
    $("#register-form-mail").val("");
    $("#register-form-conf-code").val("");

    $("form[name='login-form']").hide(300);
    $("form[name='register-form']").slideToggle(400);
}

function showLoginForm() {
    $("#form-usr").val("");
    $("#form-pwd").val("");

    $("form[name='register-form']").slideUp(200);
    $("form[name='confirm-form']").slideUp(200);
    $("form[name='reset-pwd-form']").slideUp(200);
    $("form[name='login-form']").show(400);
}

function showConfirmationForm(type) {
    $("#confirm-form-conf-code").val("");
    let email;
    if (type === "user") {
        email = $("#register-form-mail").val();
        $("form[name='confirm-form']").data("type", "user");
        $("form[name='register-form']").hide(300);
        $("form[name='confirm-form'] p.pwd-change").hide();
        $("form[name='confirm-form'] p.registration").show();
    } else if (type === "password") {
        email = $("#reset-pwd-form-mail").val();
        $("form[name='confirm-form']").data("type", "password");
        $("form[name='reset-pwd-form']").hide(300);
        $("form[name='confirm-form'] p.registration").hide();
        $("form[name='confirm-form'] p.pwd-change").show();
    }
    $("#conf-email").text(email);

    $("form[name='confirm-form']").slideToggle(400);
}

function showResetPasswordForm(type) {
    if (type === "change") {
        $("#input-password").show();
        $("#input-email").hide();
        $("#reset-pwd-form-pwd").attr("required", "true");
        $("#reset-pwd-form-mail").removeAttr("required");
    } else {
        $("#input-password").hide();
        $("#input-email").show();
        $("#reset-pwd-form-pwd").removeAttr("required");
        $("#reset-pwd-form-mail").attr("required", "true");
    }
    $("#reset-pwd-form-usr").val("");
    $("#reset-pwd-form-pwd").val("");
    $("#reset-pwd-form-new-pwd").val("");
    $("#reset-pwd-form-new-pwd-rep").val("");
    $("#reset-pwd-form-mail").val("");

    $("form[name='login-form']").hide(300);
    $("form[name='reset-pwd-form']").slideDown(400);
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
        timeout: TIMEOUT,
        dataType: 'text',

        success: function(result, status) {
            showConfirmationForm("user");
        },

        error: function(xhr, status, error) {
            let exception = JSON.parse(xhr.responseText);
            switch (xhr.status) {
                case 400:
                case 403:
                case 500:
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
        timeout: TIMEOUT,
        dataType: 'json',

        success: function(result, status) {
            $("#username").text(usr);
            setCookie("banknotes.ODB.username", usr, 24 * 60 * 60);
            setCookie("banknotes.ODB.isAdmin", result.isAdmin, 24 * 60 * 60);
            setCookie("banknotes.ODB.lastConnection", result.lastConnection || "", 24 * 60 * 60);
            $("#_countries")[0].click();
        },

        error: function(xhr, status, error) {
            switch (xhr.status) {
                case 401:
                    alert(`Login failed.\n${xhr.responseJSON.code}: ${xhr.responseJSON.description}`);
                    break;
                case 500:
                    if (xhr.responseJSON)
                        alert(`Login failed.\n${xhr.responseJSON.code}: ${xhr.responseJSON.description}.\nContact the web site administrator.`);
                    else
                        alert(`Login failed.\n${status}: ${error}.\nContact the web site administrator.`);
                    break;
                default:
                    alert(`Login failed.\n${xhr.status}: ${error}\nPlease try again or contact the web site administrator.`);
            }
        }
    });
}


function confirm() {

    let code = $("#confirm-form-conf-code").val();
    let type = $("form[name='confirm-form']").data("type");

    let usr;
    if (type === "user")
        usr = $("#register-form-usr").val();
    else
        usr = $("#reset-pwd-form-usr").val();

    $.ajax({
        type: "POST",
        url: `/user/validation?type=${type}`,
        contentType: "application/json",
        async: false,
        cache: false,
        data: JSON.stringify({ "username": usr, "validationCode": code }),
        timeout: TIMEOUT,
        dataType: 'json',

        success: function(result, status) {
            if (type === "user")
                alert(`You are successfully registered. Enjoy!`);
            else
                alert(`Your password has been changed.`);
            showLoginForm();
        },

        error: function(xhr, status, error) {
            $("#register-form-conf-code").val("");
            switch (xhr.status) {
                case 400:
                case 403:
                case 500:
                    alert(`Confirmation failed. ${xhr.responseJSON.code}: ${error}. ${xhr.responseJSON.description}`);
                    if (xhr.responseJSON.code === "VAL-02" || xhr.responseJSON.code === "VAL-03" || xhr.responseJSON.code === "VAL-05")
                        showLoginForm();
                    break;
                default:
                    alert(`Confirmation failed. \n${xhr.status} - ${error}\nPlease try again or contact the web site administrator.`);
            }
        }
    });
}


function resetPwd() {
    // Validate fields
    let usr = $("#reset-pwd-form-usr").val();
    let pwd = $("#reset-pwd-form-pwd").val();
    let email = $("#reset-pwd-form-mail").val();
    let newPwd = $("#reset-pwd-form-new-pwd").val();
    let newPwdRep = $("#reset-pwd-form-new-pwd-rep").val();

    let authentication = {};
    // The email must be valid xxx@yyy.zzz, if it is provided
    if (email !== "") {
        if (email.match(/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/gi) == null) {
            alert("Mail address is not valid");
            $("#reset-pwd-form-mail").select();
            return;
        }
        authentication.email = email;
    } else {
        if (pwd === "") {
            alert("User password or e-mail address must be provided");
            $("#reset-pwd-form-pwd").select();
            return;
        }
        authentication.password = btoa(pwd);
    }

    // Password must have at least 8 characters
    if (newPwd.length < 8) {
        alert("New password is too short (minimun length is 8 characters)");
        $("#reset-pwd-form-new-pwd").select();
        return;
    }

    // Passwords must match
    if (newPwd !== newPwdRep) {
        alert("New passwords do not match!");
        $("#reset-pwd-form-new-pwd-rep").select();
        return;
    }

    $.ajax({
        type: "POST",
        url: "/user/password",
        contentType: "application/json",
        async: false,
        cache: false,
        data: JSON.stringify({ "username": usr, "authentication": authentication, "newPassword": btoa(newPwd) }),
        timeout: TIMEOUT,
        dataType: 'text',

        success: function(result, status) {
            if (authentication.email) {
                showConfirmationForm("password");
            } else {
                alert("Your password is changed. A confirmation was sent to your email.")
                showLoginForm();
            }
        },

        error: function(xhr, status, error) {
            let exception = JSON.parse(xhr.responseText);
            switch (xhr.status) {
                case 400:
                case 401:
                case 500:
                    alert(`Registration failed. ${exception.code}: ${error}. ${exception.description}`);
                    break;
                default:
                    alert(`Registration failed. \n${xhr.status} - ${error}\nPlease try again or contact the web site administrator.`);
            }
        }
    });
}