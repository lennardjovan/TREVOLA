// Escapes user-supplied text before it's inserted into innerHTML template
// literals, so a listing title/description containing HTML or script
// content displays as plain text instead of being interpreted as markup.
export function escapeHtml(value) {
  if (value === null || value === undefined) return "";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
