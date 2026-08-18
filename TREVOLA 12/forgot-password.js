import { sendPasswordResetCode, resetPasswordWithCode } from "./emailVerification.js";

document.addEventListener("DOMContentLoaded", () => {
  const requestStep = document.getElementById("requestStep");
  const resetStep = document.getElementById("resetStep");
  const requestForm = document.getElementById("requestForm");
  const resetForm = document.getElementById("resetForm");
  const requestMessage = document.getElementById("requestMessage");
  const resetMessage = document.getElementById("resetMessage");
  const resendResetBtn = document.getElementById("resendResetBtn");

  let currentUsername = null;

  function findUser(username) {
    const users = JSON.parse(localStorage.getItem("users")) || [];
    return users.find((u) => u.username === username);
  }

  requestForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    requestMessage.textContent = "";

    const username = document.getElementById("usernameInput").value.trim();
    const user = findUser(username);

    // Deliberately vague if the account doesn't exist — avoids leaking
    // which usernames are registered to someone probing the form.
    if (!user) {
      requestMessage.style.color = "red";
      requestMessage.textContent = "If that account exists, a reset code has been sent to its email.";
      return;
    }

    const submitBtn = requestForm.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = "Sending...";

    try {
      await sendPasswordResetCode(user);
      currentUsername = username;
      requestStep.style.display = "none";
      resetStep.style.display = "block";
    } catch (err) {
      requestMessage.style.color = "red";
      requestMessage.textContent = err.message || "Couldn't send the reset code. Please try again.";
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "Send Reset Code";
    }
  });

  resetForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    resetMessage.textContent = "";

    const code = document.getElementById("codeInput").value.trim();
    const newPassword = document.getElementById("newPasswordInput").value;
    const confirmPassword = document.getElementById("confirmPasswordInput").value;

    if (newPassword !== confirmPassword) {
      resetMessage.style.color = "red";
      resetMessage.textContent = "Passwords do not match.";
      return;
    }

    if (newPassword.length < 8) {
      resetMessage.style.color = "red";
      resetMessage.textContent = "Password must be at least 8 characters.";
      return;
    }

    const result = await resetPasswordWithCode(currentUsername, code, newPassword);
    resetMessage.style.color = result.success ? "#059669" : "red";
    resetMessage.textContent = result.message;

    if (result.success) {
      setTimeout(() => {
        window.location.href = "index.html#login";
      }, 1500);
    }
  });

  resendResetBtn.addEventListener("click", async () => {
    const user = findUser(currentUsername);
    if (!user) return;

    resendResetBtn.disabled = true;
    resendResetBtn.textContent = "Sending...";

    try {
      await sendPasswordResetCode(user);
      resetMessage.style.color = "#059669";
      resetMessage.textContent = "A new code has been sent.";
    } catch (err) {
      resetMessage.style.color = "red";
      resetMessage.textContent = err.message || "Couldn't resend the code.";
    } finally {
      resendResetBtn.disabled = false;
      resendResetBtn.textContent = "Resend Code";
    }
  });
});
