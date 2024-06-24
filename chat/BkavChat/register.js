document.getElementById("loginTab").addEventListener("click", function () {
    window.location.href = "login.html";
});

document.getElementById("togglePassword").addEventListener("click", function () {
    var passwordField = document.getElementById("password");
    if (passwordField.type === "password") {
        passwordField.type = "text";
    } else {
        passwordField.type = "password";
    }
});

document.getElementById("toggleComfirmPassword").addEventListener("click", function () {
    var passwordField = document.getElementById("confirmPassword");
    if (passwordField.type === "password") {
        passwordField.type = "text";
    } else {
        passwordField.type = "password";
    }
});

document.getElementById("clearUsername").addEventListener("click", function () {
    var usernameField = document.getElementById("username");
    usernameField.value = "";
});

document.getElementById("registrationButton").addEventListener("click", function () {
    validateForm();
});

function validateForm() {
    var username = document.getElementById("username").value;
    var password = document.getElementById("password").value;
    var confirmPassword = document.getElementById("confirmPassword").value;
    var errorText = document.getElementById("errorText");

    if (username.trim() === "") {
        errorText.textContent = "Vui lòng nhập tên đăng ký.";
        return;
    }
    else if (password.trim() === "") {
        errorText.textContent = "Vui lòng nhập mật khẩu.";
        return;
    }
    else if (password !== confirmPassword) {
        errorText.textContent = "Mật khẩu nhập lại không khớp.";
        return;
    }
    else {
        registerUser(username, password);
    }
}

function registerUser(username, password) {
    fetch('http://10.2.44.52:8888/api/auth/register', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            Username: username,
            Password: password,
            FullName: "quan"
        })
    })
        .then(response => response.json())
        .then(data => {
            if (data.status === 1) {
                errorText.textContent = "Đăng ký thành công"
                setTimeout(() => {
                    window.location.href = 'login.html';
                }, 2000);
            }
            else {
                errorText.textContent = "Đăng ký không thành công, vui lòng thử lại!"
            }
        })
        .catch(error => {
            console.error('Error:', error);
            errorText.textContent = "Có lỗi xãy ra, vui lòng thử lại sau!"
        });
}