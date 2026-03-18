function getElementValue(id) {
  const element = document.getElementById(id);
  return element ? element.value : "";
}

export function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function parseCommaSeparated(id) {
  return getElementValue(id)
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

export function parseLineSeparated(id) {
  return getElementValue(id)
    .split("\n")
    .map((value) => value.trim())
    .filter(Boolean);
}

export function parseOptionalNumber(id) {
  const value = getElementValue(id).trim();
  return value === "" ? null : parseFloat(value);
}
