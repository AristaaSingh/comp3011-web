export function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function parseLineSeparated(id) {
  const element = document.getElementById(id);
  return (element?.value || "")
    .split("\n")
    .map((value) => value.trim())
    .filter(Boolean);
}
