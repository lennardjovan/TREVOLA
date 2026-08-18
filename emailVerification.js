import { EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, EMAILJS_PUBLIC_KEY } from "./emailConfig.js";
import { generateSalt as generateSalt2, hashPassword as hashPassword2 } from "./passwordUtils.js";

// How long a verification code stays valid for
const CODE_VALID_MS = 30 * 60 * 1000; // 30 minutes
// Minimum time between resend requests, to avoid spamming the inbox / EmailJS quota
const RESEND_COOLDOWN_MS = 60 * 1000; // 60 seconds

function generateVerificationCode() {
  return String(Math.floor(100000 + Math.random() * 900000)); // 6 digits
}

function ensureEmailjsLoaded() {
  if (typeof window.emailjs === "undefined") {
    throw new Error(
      "EmailJS hasn't loaded. Make sure the EmailJS <script> tag is included on this page.",
    );
  }
}

// Generates a fresh code, stores it on the user record (in the `users`
// array in localStorage), and emails it via EmailJS. Returns the updated
// user object.
export async function sendVerificationEmail(user) {
  ensureEmailjsLoaded();

  if (
    EMAILJS_SERVICE_ID === "YOUR_SERVICE_ID" ||
    EMAILJS_TEMPLATE_ID === "YOUR_TEMPLATE_ID" ||
    EMAILJS_PUBLIC_KEY === "YOUR_PUBLIC_KEY"
  ) {
    throw new Error(
      "Email verification isn't configured yet — set up EmailJS and fill in emailConfig.js.",
    );
  }

  const code = generateVerificationCode();
  const users = JSON.parse(localStorage.getItem("users")) || [];
  const index = users.findIndex((u) => u.id === user.id);
  if (index === -1) throw new Error("User not found.");

  users[index].verificationCode = code;
  users[index].verificationCodeExpires = Date.now() + CODE_VALID_MS;
  users[index].emailVerified = false;
  localStorage.setItem("users", JSON.stringify(users));

  const expiresAt = new Date(users[index].verificationCodeExpires);
  const formattedExpiry = expiresAt.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  // These variable names (email / passcode / time) match the "One-Time
  // Password" template created in the EmailJS dashboard — if the template
  // is ever rebuilt with different placeholder names, update this object
  // to match.
  try {
    await window.emailjs.send(
      EMAILJS_SERVICE_ID,
      EMAILJS_TEMPLATE_ID,
      {
        email: user.email,
        passcode: code,
        time: formattedExpiry,
      },
      { publicKey: EMAILJS_PUBLIC_KEY },
    );
  } catch (err) {
    // EmailJS rejects with an object like { status, text }, not a normal
    // Error — surface that real reason instead of a generic message so
    // it's actually possible to diagnose what went wrong.
    const detail = err?.text || err?.message || JSON.stringify(err);
    throw new Error(`EmailJS error (${err?.status || "unknown"}): ${detail}`);
  }

  // Only start the resend cooldown once we know the send actually
  // succeeded — previously this was set beforehand, so a failed send
  // still blocked retries for 60 seconds with no way to try again sooner.
  users[index].lastVerificationSentAt = Date.now();
  localStorage.setItem("users", JSON.stringify(users));

  return users[index];
}

// Same as sendVerificationEmail, but enforces a cooldown so a "Resend
// code" button can't be spam-clicked.
export async function resendVerificationEmail(user) {
  const users = JSON.parse(localStorage.getItem("users")) || [];
  const current = users.find((u) => u.id === user.id);

  if (current?.lastVerificationSentAt) {
    const elapsed = Date.now() - current.lastVerificationSentAt;
    if (elapsed < RESEND_COOLDOWN_MS) {
      const waitSeconds = Math.ceil((RESEND_COOLDOWN_MS - elapsed) / 1000);
      throw new Error(`Please wait ${waitSeconds}s before requesting another code.`);
    }
  }

  return sendVerificationEmail(user);
}

// Same code system as email verification, reused for "forgot password".
// Generates a reset code, stores it (separately from the signup
// verification code, so the two flows never collide), and emails it via
// the same EmailJS template.
export async function sendPasswordResetCode(user) {
  ensureEmailjsLoaded();

  const code = generateVerificationCode();
  const users = JSON.parse(localStorage.getItem("users")) || [];
  const index = users.findIndex((u) => u.id === user.id);
  if (index === -1) throw new Error("User not found.");

  users[index].passwordResetCode = code;
  users[index].passwordResetCodeExpires = Date.now() + CODE_VALID_MS;
  localStorage.setItem("users", JSON.stringify(users));

  const expiresAt = new Date(users[index].passwordResetCodeExpires);
  const formattedExpiry = expiresAt.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  try {
    await window.emailjs.send(
      EMAILJS_SERVICE_ID,
      EMAILJS_TEMPLATE_ID,
      {
        email: user.email,
        passcode: code,
        time: formattedExpiry,
      },
      { publicKey: EMAILJS_PUBLIC_KEY },
    );
  } catch (err) {
    const detail = err?.text || err?.message || JSON.stringify(err);
    throw new Error(`EmailJS error (${err?.status || "unknown"}): ${detail}`);
  }
}

// Verifies a password reset code and, if correct, sets the new password.
export async function resetPasswordWithCode(username, enteredCode, newPassword) {
  const users = JSON.parse(localStorage.getItem("users")) || [];
  const index = users.findIndex((u) => u.username === username);

  if (index === -1) return { success: false, message: "Account not found." };

  const user = users[index];

  if (!user.passwordResetCode) {
    return { success: false, message: "No reset code pending. Request a new one." };
  }

  if (Date.now() > (user.passwordResetCodeExpires || 0)) {
    return { success: false, message: "That code has expired. Request a new one." };
  }

  if (String(enteredCode).trim() !== user.passwordResetCode) {
    return { success: false, message: "Incorrect code. Please try again." };
  }

  const salt = generateSalt2();
  const passwordHash = await hashPassword2(newPassword, salt);

  users[index].salt = salt;
  users[index].passwordHash = passwordHash;
  delete users[index].passwordResetCode;
  delete users[index].passwordResetCodeExpires;
  localStorage.setItem("users", JSON.stringify(users));

  return { success: true, message: "Password reset! You can now log in." };
}

// Checks an entered code against what's stored for this user. On success,
// marks the account verified and clears the code.
export function verifyCode(username, enteredCode) {
  const users = JSON.parse(localStorage.getItem("users")) || [];
  const index = users.findIndex((u) => u.username === username);

  if (index === -1) {
    return { success: false, message: "Account not found." };
  }

  const user = users[index];

  if (user.emailVerified) {
    return { success: true, message: "Already verified." };
  }

  if (!user.verificationCode) {
    return { success: false, message: "No verification code pending. Request a new one." };
  }

  if (Date.now() > (user.verificationCodeExpires || 0)) {
    return { success: false, message: "That code has expired. Request a new one." };
  }

  if (String(enteredCode).trim() !== user.verificationCode) {
    return { success: false, message: "Incorrect code. Please try again." };
  }

  users[index].emailVerified = true;
  delete users[index].verificationCode;
  delete users[index].verificationCodeExpires;
  localStorage.setItem("users", JSON.stringify(users));

  return { success: true, message: "Email verified!" };
}
