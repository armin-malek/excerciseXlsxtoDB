function toSnakeCase(str) {
  return str
    .trim() // Remove extra spaces
    .replace(/[\s-]+/g, "_") // Replace spaces and dashes with underscores
    .replace(/([a-z])([A-Z])/g, "$1_$2") // Add underscore between camelCase words
    .toLowerCase(); // Convert to lowercase
}

// some excel cells that contain a url turn into hyperlkinks (blue color) this handles that
function hyperLinkToFileName(input) {
  if (!input) return undefined;

  if (typeof input == "object") {
    return `${input.text.split("/").pop()}`;
  }
  if (typeof input == "string") {
    return `${input.split("/").pop()}`;
  }
  return undefined;
}

function arrayToCommaSpread(input) {
  console.log("input", input);
  const arr = JSON.parse(input);
  let str = "";
  arr.forEach((element, idx) => {
    if (element && element.length > 0) {
      if (idx < arr.length - 1) str += toSnakeCase(element) + ",";
      else str += toSnakeCase(element);
    }
  });
  return str;
}

module.exports = { toSnakeCase, hyperLinkToFileName, arrayToCommaSpread };
