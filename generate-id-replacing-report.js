const { prisma } = require("./db");
const { isJsonString, convertExcelToJson } = require("./functions");
const ExcelJS = require("exceljs");

const baseTables = [
  // ["exercise_template_day", "templateId"],
  // ["exercise_day", "programId"],
  ["corrective_template_day", "templateId"],
  // ["corrective_day", "programId"],
];

let records = {};
let excelData = [];
let exercises = [];
let exercisesMap;

const startTime = Date.now();

async function loadRecords() {
  excelData = await convertExcelToJson("generate-id-replacing-report.xlsx");
  //console.log(excelData);
  exercises = await prisma.exercise.findMany();
  exercisesMap = new Map(exercises.map((x) => [x.id, x]));

  for (let table of baseTables) {
    records[table[0]] = [];
    console.log("table", table[0]);
    let recs = await prisma[table[0]].findMany({
      orderBy: { id: "asc" },
      select: {
        [table[1]]: true,
        data: true,
      },
    });

    for (let i = 0; i < recs.length; i++) {
      if (isJsonString(recs[i].data)) {
        recs[i].data = JSON.parse(recs[i].data);
      }
      records[table[0]].push(recs[i]);
    }

    console.log(`table ${table[0]} records ${records[table[0]].length}`);
  }
}
async function main() {
  try {
    let results = [];
    for (let row of excelData) {
      const oldIdTotalUsage = await prisma.exercise_usage_report.findUnique({
        where: { exercise_id: row.oldId },
      });
      let sum =
        oldIdTotalUsage.corrective_day_count +
        oldIdTotalUsage.corrective_template_day_count +
        oldIdTotalUsage.exercise_day_count +
        oldIdTotalUsage.exercise_template_day_count;
      let result = {
        oldId: row.oldId,
        oldName: exercisesMap.get(row.oldId)?.title,
        newId: row.newId,
        newName: exercisesMap.get(row.newId)?.title,
        oldIdTotalUsage: sum,
      };
      results.push(result);
    }

    convertJsonToExcel(results, "generate-id-replacing-report-results.xlsx");
  } catch (error) {
    console.log(error);
    process.exit(1);
  } finally {
    // main();
  }
}

async function convertJsonToExcel(jsonData, outputExcelPath) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Sheet1");

  // Define a stable header mapping
  const headerMap = [
    { key: "oldId", label: "حرکت غلط" },
    { key: "oldName", label: "نام حرکت غلط" },
    { key: "newId", label: "حرکت صحیح" },
    { key: "newName", label: "نام حرکت صحیح" },
    { key: "oldIdTotalUsage", label: "جمع کل تعداد حرکت غلط" },
  ];

  // Add headers to the worksheet
  worksheet.addRow(headerMap.map((header) => header.label));

  // Add data rows
  jsonData.forEach((obj) => {
    worksheet.addRow(headerMap.map((header) => obj[header.key]));
  });

  await workbook.xlsx.writeFile(outputExcelPath);
  console.log(`Excel file saved to ${outputExcelPath}`);
}

loadRecords().then(() => {
  main();
});
