const ExcelJS = require("exceljs");
const fs = require("fs");
const { prisma } = require("./db");
const { hyperLinkToFileName, arrayToCommaSpread } = require("./functions");
const path = require("path");
const inputFile = "input.xlsx";

if (!fs.existsSync(inputFile)) {
  console.log(`${inputFile} does not exists!`);
  process.exit(0);
}

if (!fs.existsSync("./source_files")) {
  console.log("./source_files directory not found");
  process.exit(1);
}

if (!fs.existsSync("./result_files")) {
  fs.mkdirSync("./result_files");
  if (!fs.existsSync("./result_files/photos")) {
    fs.mkdirSync("./result_files/photos");
  }
  if (!fs.existsSync("./result_files/videos")) {
    fs.mkdirSync("./result_files/videos");
  }
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

    const imageFileName = hyperLinkToFileName(row.image_name);
    const videoFileName = hyperLinkToFileName(row.video_file);

    await prisma.exercise.update({
      where: {
        id: row.our_system_id,
      },
      data: {
        eng_title: row.name,
        image: handleMedia(imageFileName, row.our_system_id, "photo"),
        video: handleMedia(videoFileName, row.our_system_id, "video"),
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
  console.log("rows", rows.length);
  // main();
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

  // console.log(jsonData.length);
  // console.log(jsonData[0]);

  // filterout rows with out system id
  jsonData = jsonData.filter((x) => x.our_system_id > 0);
  // console.log(jsonData.length);
  // console.log(jsonData[0]);

  rows = jsonData;
}

function handleMedia(fileName, id, type) {
  let prefix = "";
  let subFolder = "";
  if (type == "photo") {
    prefix = "/files/exercise/images/";
    subFolder = "photos";
  }
  if (type == "video") {
    prefix = "/files/exercise/videos/";
    subFolder = "videos";
  }
  if (fs.existsSync(path.join("source_files", fileName))) {
    const newFileName = `${id}.${fileName.split(".").pop()}`;
    fs.cpSync(
      path.join("source_files", fileName),
      path.join("result_files", subFolder, newFileName)
    );
    return prefix + newFileName;
  } else {
    return null;
  }
}
