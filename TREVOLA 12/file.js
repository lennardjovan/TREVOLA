import { generateSalt, hashPassword, verifyPassword, checkPasswordAndMigrate } from "./passwordUtils.js";
import { sendVerificationEmail } from "./emailVerification.js";

console.log("JS LOADED");

// Toggle between User and Host login tabs
function switchAuthTab(type) {
    const userForm = document.getElementById('userform');
    const hostForm = document.getElementById('hostform');
    const userTabBtn = document.getElementById('userTabBtn');
    const hostTabBtn = document.getElementById('hostTabBtn');

    if (type === 'host') {
        userForm.style.display = 'none';
        hostForm.style.display = 'block';
        userTabBtn.classList.remove('active');
        hostTabBtn.classList.add('active');
    } else {
        hostForm.style.display = 'none';
        userForm.style.display = 'block';
        hostTabBtn.classList.remove('active');
        userTabBtn.classList.add('active');
    }
}
window.switchAuthTab = switchAuthTab;

// Safe Host Login
// ==========================================
const hostLoginForm = document.getElementById('hostform');
if (hostLoginForm) {
    hostLoginForm.addEventListener("submit", async function(event) {
        event.preventDefault();

        const usernameEl = document.getElementById('hostUsername');
        const passwordEl = document.getElementById('hostPassword');

        // Stop if inputs are missing from the HTML
        if (!usernameEl || !passwordEl) {
            console.error("Missing hostUsername or hostPassword input in HTML!");
            return;
        }

        const username = usernameEl.value.trim();
        const password = passwordEl.value;

        const users = JSON.parse(localStorage.getItem('users')) || [];

        const host = users.find(
            h => h.username === username &&
            h.role === 'host'
        );

        const passwordOk = host
            ? await checkPasswordAndMigrate(host, password, users)
            : false;

        if (!host || !passwordOk) {
            const errorEl = document.getElementById('hostLoginMessage');
            if (errorEl) {
                errorEl.textContent = "Invalid username or password!";
                errorEl.style.color = "red";
            }
            return;
        }

        // emailVerified === false means they registered after this feature
        // shipped and haven't confirmed their email yet. Accounts created
        // before this feature existed simply won't have the field at all,
        // so they're treated as already verified rather than locked out.
        if (host.emailVerified === false) {
            const errorEl = document.getElementById('hostLoginMessage');
            if (errorEl) {
                errorEl.innerHTML = `Please verify your email first. <a href="verify-email.html?username=${encodeURIComponent(host.username)}">Verify now</a>`;
                errorEl.style.color = "red";
            }
            return;
        }

        // Never keep the hash/salt around in the active session record
        const { passwordHash, salt, ...safeHost } = host;
        localStorage.setItem('loggedInUser', JSON.stringify(safeHost));
        window.location.href = "manage-listings.html";

    });
}

//User Login
const userLoginForm = document.getElementById('userform');
if (userLoginForm) {
    userLoginForm.addEventListener("submit", async function(event) {
        event.preventDefault();

        const usernameEl = document.getElementById('userUsername');
        const passwordEl = document.getElementById('userPassword');

        // Stop if inputs are missing from the HTML
        if (!usernameEl || !passwordEl) {
            console.error("Missing userUsername or userPassword input in HTML!");
            return;
        }

        const username = usernameEl.value.trim();
        const password = passwordEl.value;

        const users = JSON.parse(localStorage.getItem('users')) || [];

        const user = users.find(
            u => u.username === username &&
            u.role === 'user'
        );

        const passwordOk = user
            ? await checkPasswordAndMigrate(user, password, users)
            : false;

        if (!user || !passwordOk) {
            const errorEl = document.getElementById('userLoginMessage');
            if (errorEl) {
                errorEl.textContent = "Invalid username or password!";
                errorEl.style.color = "red";
            }
            return;
        }

        if (user.emailVerified === false) {
            const errorEl = document.getElementById('userLoginMessage');
            if (errorEl) {
                errorEl.innerHTML = `Please verify your email first. <a href="verify-email.html?username=${encodeURIComponent(user.username)}">Verify now</a>`;
                errorEl.style.color = "red";
            }
            return;
        }

        const { passwordHash, salt, ...safeUser } = user;
        localStorage.setItem('loggedInUser', JSON.stringify(safeUser));

        const successEl = document.getElementById('userLoginMessage');
        if (successEl) {
            successEl.textContent = "User login successful!";
            successEl.style.color = "#059669";
        }
        window.location.href = "listings.html";
    });
}

// Registration button for host
const hostRegisterBtn = document.getElementById('hostRegisterBtn');
if (hostRegisterBtn) {
    hostRegisterBtn.addEventListener("click", function() {
        // Redirect to host registration page
        window.location.href = "host-register.html";
    });
}
const backToLoginBtn = document.getElementById('backToLoginBtn');
if (backToLoginBtn) {
    backToLoginBtn.addEventListener("click", function() {
        // Redirect to login page
        window.location.href = "index.html";
    });
}

// Registration button for user
const registerBtn = document.getElementById('registerBtn');
if (registerBtn) {
    registerBtn.addEventListener("click", function() {
        // Redirect to user registration page
        window.location.href = "user-register.html";
    });
}

// User back to login page
const backBtn = document.getElementById('backBtn');
if (backBtn) {
    backBtn.addEventListener("click", function() {
        // Redirect to login page
        window.location.href = "index.html";
    });
}


// Host registration form submission
const hostForm = document.getElementById('hostRegistrationForm');
if (hostForm) {
    hostForm.addEventListener("submit", async function(event) {
        event.preventDefault();

        // get password and confirm password values
        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        const messageEl = document.getElementById('message');

        // validate password and confirm password
        if (password !== confirmPassword) {
            if (messageEl) {
                messageEl.textContent = "Passwords do not match!";
                messageEl.style.color = "red";
            }
            return;
        }

        if (password.length < 8) {
            if (messageEl) {
                messageEl.textContent = "Password must be at least 8 characters.";
                messageEl.style.color = "red";
            }
            return;
        }

        // get users from local storage
        const users = JSON.parse(localStorage.getItem('users')) || [];

        if (users.some((u) => u.username === username)) {
            if (messageEl) {
                messageEl.textContent = "That username is already taken.";
                messageEl.style.color = "red";
            }
            return;
        }

        const emailInput = document.getElementById('email');
        const email = emailInput ? emailInput.value.trim() : "";

        if (!email) {
            if (messageEl) {
                messageEl.textContent = "An email address is required.";
                messageEl.style.color = "red";
            }
            return;
        }

        if (users.some((u) => u.email && u.email.toLowerCase() === email.toLowerCase())) {
            if (messageEl) {
                messageEl.textContent = "An account with that email already exists.";
                messageEl.style.color = "red";
            }
            return;
        }

        const salt = generateSalt();
        const passwordHash = await hashPassword(password, salt);

        const newHost = {
            id: Date.now(),
            username,
            email,
            passwordHash,
            salt,
            role: 'host',
            emailVerified: false,
        };

        // add new host to users array
        users.push(newHost);
        localStorage.setItem('users', JSON.stringify(users));

        if (messageEl) {
            messageEl.textContent = "Account created — sending your verification code...";
            messageEl.style.color = "#059669";
        }

        try {
            await sendVerificationEmail(newHost);
            window.location.href = `verify-email.html?username=${encodeURIComponent(username)}`;
        } catch (err) {
            if (messageEl) {
                messageEl.textContent = err.message || "Account created, but the verification email failed to send. You can request a new code from the verify page.";
                messageEl.style.color = "red";
            }
            setTimeout(() => {
                window.location.href = `verify-email.html?username=${encodeURIComponent(username)}`;
            }, 2500);
        }

    });
}


// User registration form

const userForm = document.getElementById('userRegistrationForm');
if (userForm) {
    userForm.addEventListener("submit", async function(event) {
        event.preventDefault();

        // get password and confirm password values
        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value.trim();
        const confirmPassword = document.getElementById('confirmPassword').value.trim();
        const messageEl = document.getElementById('message');

        // validate password and confirm password
        if (password !== confirmPassword) {
            if (messageEl) {
                messageEl.textContent = "Passwords do not match!";
                messageEl.style.color = "red";
            }
            return;
        }

        if (password.length < 8) {
            if (messageEl) {
                messageEl.textContent = "Password must be at least 8 characters.";
                messageEl.style.color = "red";
            }
            return;
        }

        // get users from local storage
        const users = JSON.parse(localStorage.getItem('users')) || [];

        if (users.some((u) => u.username === username)) {
            if (messageEl) {
                messageEl.textContent = "That username is already taken.";
                messageEl.style.color = "red";
            }
            return;
        }

        const emailInput = document.getElementById('email');
        const email = emailInput ? emailInput.value.trim() : "";

        if (!email) {
            if (messageEl) {
                messageEl.textContent = "An email address is required.";
                messageEl.style.color = "red";
            }
            return;
        }

        if (users.some((u) => u.email && u.email.toLowerCase() === email.toLowerCase())) {
            if (messageEl) {
                messageEl.textContent = "An account with that email already exists.";
                messageEl.style.color = "red";
            }
            return;
        }

        const salt = generateSalt();
        const passwordHash = await hashPassword(password, salt);

        const newUser = {
            id: Date.now(),
            username,
            email,
            passwordHash,
            salt,
            role: 'user',
            emailVerified: false,
        };
        users.push(newUser);
        localStorage.setItem('users', JSON.stringify(users));

        if (messageEl) {
            messageEl.textContent = "Account created — sending your verification code...";
            messageEl.style.color = "#059669";
        }

        try {
            await sendVerificationEmail(newUser);
            window.location.href = `verify-email.html?username=${encodeURIComponent(username)}`;
        } catch (err) {
            if (messageEl) {
                messageEl.textContent = err.message || "Account created, but the verification email failed to send. You can request a new code from the verify page.";
                messageEl.style.color = "red";
            }
            setTimeout(() => {
                window.location.href = `verify-email.html?username=${encodeURIComponent(username)}`;
            }, 2500);
        }

    });
}
