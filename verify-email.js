import { verifyCode, resendVerificationEmail } from "./emailVerification.js";

document.addEventListener("DOMContentLoaded", () => {
  const urlParams = new URLSearchParams(window.location.search);
  const username = urlParams.get("username");

  const messageEl = document.getElementById("verifyMessage");
  const form = document.getElementById("verifyForm");
  const resendBtn = document.getElementById("resendBtn");

  if (!username) {
    if (messageEl) {
      messageEl.textContent = "No account specified. Please register or log in again.";
      messageEl.style.color = "red";
    }
    if (form) form.style.display = "none";
    if (resendBtn) resendBtn.style.display = "none";
    return;
  }

  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();

      const code = document.getElementById("codeInput").value.trim();
      const result = verifyCode(username, code);

      if (messageEl) {
        messageEl.textContent = result.message;
        messageEl.style.color = result.success ? "#059669" : "red";
      }

      if (result.success) {
        setTimeout(() => {
          window.location.href = "index.html#login";
        }, 1500);
      }
    });
  }

  if (resendBtn) {
    resendBtn.addEventListener("click", async () => {
      const users = JSON.parse(localStorage.getItem("users")) || [];
      const user = users.find((u) => u.username === username);

      if (!user) {
        if (messageEl) {
          messageEl.textContent = "Account not found.";
          messageEl.style.color = "red";
        }
        return;
      }

      resendBtn.disabled = true;
      resendBtn.textContent = "Sending...";

      try {
        await resendVerificationEmail(user);
        if (messageEl) {
          messageEl.textContent = "A new code has been sent to your email.";
          messageEl.style.color = "#059669";
        }
      } catch (err) {
        if (messageEl) {
          messageEl.textContent = err.message || "Couldn't resend the code. Please try again shortly.";
          messageEl.style.color = "red";
        }
      } finally {
        resendBtn.disabled = false;
        resendBtn.textContent = "Resend Code";
      }
    });
  }
});
