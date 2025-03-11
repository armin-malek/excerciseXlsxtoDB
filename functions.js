const ExcelJS = require("exceljs");

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
function isJsonString(str) {
  try {
    JSON.parse(str);
  } catch (e) {
    return false;
  }
  return true;
}

function isIterable(obj) {
  // checks for null and undefined
  if (obj == null) {
    return false;
  }
  return typeof obj[Symbol.iterator] === "function";
}

async function convertExcelToJson(filePath) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);
  const worksheet = workbook.worksheets[0]; // Get the first sheet

  let jsonData = [];
  let headers = [];

  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) {
      headers = row.values.slice(1); // Get headers from the first row
    } else {
      let rowData = {};
      row.values.slice(1).forEach((cell, colIndex) => {
        rowData[headers[colIndex]] = cell;
      });
      jsonData.push(rowData);
    }
  });

  return jsonData;
}

module.exports = {
  toSnakeCase,
  hyperLinkToFileName,
  arrayToCommaSpread,
  isJsonString,
  isIterable,
  convertExcelToJson,
};
