// Email verification is sent via EmailJS (emailjs.com) — a service built
// for sending real emails straight from client-side JavaScript, so this
// works without deploying any backend server.
//
// SETUP (takes about 5 minutes, free tier is fine for testing):
//   1. Create a free account at https://www.emailjs.com
//   2. Add an Email Service (e.g. connect your Gmail) — note its "Service ID"
//   3. Create an Email Template with these variable placeholders in the body:
//        {{to_name}}, {{to_email}}, {{verification_code}}
//      Example template body:
//        "Hi {{to_name}}, your Trevola verification code is {{verification_code}}."
//      Note its "Template ID"
//   4. Account → General → copy your "Public Key"
//   5. Paste all three below.
//   6. Recommended: in EmailJS Account settings, restrict allowed domains
//      to your actual site's domain, since this key is visible in your
//      site's public JavaScript (this is normal for EmailJS, not a bug —
//      the domain restriction is what keeps it from being abused).

export const EMAILJS_SERVICE_ID = "service_fzhel24";
export const EMAILJS_TEMPLATE_ID = "template_utzodwo";
export const EMAILJS_PUBLIC_KEY = "zjvdfwDdqM41ItCNW";
