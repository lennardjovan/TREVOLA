// Hashes passwords using the browser's native Web Crypto API instead of
// storing them in plain text. Each user gets their own random salt so two
// people with the same password don't produce the same stored hash.
//
// Worth being upfront about the limits here: without a real backend, any
// hashing scheme still runs in the browser and the hash is still stored
// alongside the account data — so this protects against someone glancing
// at localStorage, but it isn't equivalent to server-side authentication.
// It's a genuine improvement over plain text, not a guarantee of security.

function bufferToHex(buffer) {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function generateSalt() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return bufferToHex(bytes);
}

export async function hashPassword(password, salt) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + salt);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return bufferToHex(hashBuffer);
}

export async function verifyPassword(password, salt, expectedHash) {
  const hash = await hashPassword(password, salt);
  return hash === expectedHash;
}

// Checks a login attempt against a user record that may be in either the
// old plain-text format (a "password" field, from before hashing was
// added) or the new hashed format ("salt" + "passwordHash"). If the old
// format matches, it silently upgrades that stored record to the new
// hashed format so accounts created before this update keep working
// without anyone needing to re-register.
export async function checkPasswordAndMigrate(user, password, allUsers) {
  if (user.salt && user.passwordHash) {
    return verifyPassword(password, user.salt, user.passwordHash);
  }

  // Old plain-text account
  if (user.password !== undefined) {
    if (user.password !== password) return false;

    const salt = generateSalt();
    const passwordHash = await hashPassword(password, salt);

    const index = allUsers.findIndex((u) => u.id === user.id);
    if (index !== -1) {
      delete allUsers[index].password;
      allUsers[index].salt = salt;
      allUsers[index].passwordHash = passwordHash;
      localStorage.setItem("users", JSON.stringify(allUsers));

      // Keep the in-memory object consistent with what we just saved
      delete user.password;
      user.salt = salt;
      user.passwordHash = passwordHash;
    }

    return true;
  }

  return false;
}
