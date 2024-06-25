document.getElementById("registerTab").addEventListener("click", function () {
    window.location.href = "register.html";
});

document.getElementById("togglePassword").addEventListener("click", function () {
    const passwordField = document.getElementById("password");
    if (passwordField.type === "password") {
        passwordField.type = "text";
    } else {
        passwordField.type = "password";
    }
});

document.getElementById("clearUsername").addEventListener("click", function () {
    const usernameField = document.getElementById("username");
    usernameField.value = "";
});

document.getElementById("loginButton").addEventListener("click", function () {
    validateForm();
});

function validateForm() {
    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;
    var errorText = document.getElementById("errorText");

    if (username.trim() === "") {
        errorText.textContent = "Vui lòng nhập tên đăng nhập";
        return;
    }
    else if (password.trim() === "") {
        errorText.textContent = "Vui lòng nhập mật khẩu";
        return;
    }
    else {
        loginUser(username, password);
    }

}

async function loginUser(username, password) {
    fetch('http://localhost:8888/api/auth/login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            Username: username,
            Password: password
        })
    })
    .then(response => response.json())
    .then(async data => {
        console.log(data.status);
        if (data.status === 1) {
            localStorage.setItem('token', data.data.token);
            localStorage.setItem('fullname', data.data.FullName);
            localStorage.setItem('avatar', data.data.Avatar);
            sessionStorage.setItem('password', password);
            window.location.href = 'chat.html';
        } else {
            errorText.textContent = "Đăng nhập không thành công, vui lòng thử lại!"
        }
    })
    .catch(error => {
        console.error('Error:', error);
        errorText.textContent = 'Có lỗi xảy ra, vui lòng thử lại sau';
    });
};




