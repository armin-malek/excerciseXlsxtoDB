const ExcelJS = require("exceljs");
const fs = require("fs");
const { prisma } = require("./db");
const inputFile = "input.xlsx";

if (!fs.existsSync(inputFile)) {
  console.log(`${inputFile} does not exists!`);
  process.exit(0);
}

// progress store file
const ProgFile = "exercise-prog.txt";
let progIdx = 0;
if (fs.existsSync(ProgFile)) {
  let progIdx = parseInt(fs.readFileSync(ProgFile).toString());
  if (!progIdx) progIdx = 0;
}
console.log("Progress Index", progIdx);

let rows = [];
async function main() {
  try {
    if (progIdx > rows.length - 1) {
      console.log("Done");
      process.exit(1);
    }
    const row = rows[progIdx];

    const dbRow = await prisma.exercise.findUnique({
      where: { id: row.our_system_id },
    });
    if (!dbRow) {
      console.log("system id not found", row.our_system_id);
      progIdx++;
      return;
    }

    await prisma.exercise.update({
      where: {
        id: row.our_system_id,
      },
      data: {
        eng_title: row.name,
        image: hyperLinkToUrl(row.image_name, "/files/exercise/images/"),
        video: hyperLinkToUrl(row.video_file, "/files/exercise/videos/"),
        primaryMuscles: arrayToCommaSpread(row.targetMuscles),
        secondaryMuscles: arrayToCommaSpread(row.synergistMuscles),
        equipment: arrayToCommaSpread(row.equipment),
      },
    });
    console.log("Done", progIdx);
    progIdx++;
    fs.writeFileSync(ProgFile, progIdx.toString());
  } catch (error) {
    console.log(error);
  } finally {
    main();
  }
}

// start the script
loadExcel().then(() => {
  main();
});

async function loadExcel() {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(inputFile);

  // Get the first worksheet
  const worksheet = workbook.worksheets[0];
  let jsonData = [];

  // Convert rows to JSON
  worksheet.eachRow((row, rowIndex) => {
    if (rowIndex === 1) return; // Skip header row
    const rowData = {};
    row.eachCell((cell, colIndex) => {
      const header = worksheet.getRow(1).getCell(colIndex).value;
      rowData[header] = cell.value;
    });
    jsonData.push(rowData);
  });

  console.log(jsonData.length);
  console.log(jsonData[0]);

  // filterout rows with out system id
  jsonData = jsonData.filter((x) => x.our_system_id > 0);
  console.log(jsonData.length);
  console.log(jsonData[0]);

  rows = jsonData;
}

function arrayToCommaSpread(input) {
  const arr = JSON.parse(input);
  let str = "";
  arr.forEach((element, idx) => {
    if (element && element.length > 0) {
      if (idx < arr.length - 1) str += element + ",";
      else str += element;
    }
  });
  return str;
}

function hyperLinkToUrl(input, prefix) {
  if (!input) return undefined;

  if (typeof input == "object") {
    return `${prefix}${input.text.split("/").pop()}`;
  }
  if (typeof input == "string") {
    return `${prefix}${input.split("/").pop()}`;
  }
  return undefined;
}
