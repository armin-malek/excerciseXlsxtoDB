const { prisma } = require("./db");
const _ = require("lodash");
const { isJsonString } = require("./functions");
let lastId = 0;

const baseTables = [
  ["exercise_template_day", "templateId"],
  ["exercise_day", "programId"],
  ["corrective_template_day", "templateId"],
  ["corrective_day", "programId"],
];

let records = {};

const startTime = Date.now();

async function loadRecords() {
  for (let table of baseTables) {
    records[table[0]] = [];
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
    const exercise = await prisma.exercise.findFirst({
      select: { id: true, title: true, video: true, image: true },
      where: { id: { gt: lastId } },
      // where: { id: 2031 },
      orderBy: { id: "asc" },
    });

    if (!exercise) {
      console.log("Done", Date.now() - startTime);
      process.exit(1);
    }

    for (let table of baseTables) {
      // await Promise.map(
      //   baseTables,
      //   async (table) => {
      //   console.log(`starting table ${table[0]}`);
      let templatesFound = [];
      for (let record of records[table[0]]) {
        // console.log(record);
        // if (isJsonString(record.data)) {

        //   record.data = JSON.parse(record.data);
        // }
        record.data.forEach((item) => {
          item.movement_list.forEach((movement) => {
            if (movement.action_id == exercise.id) {
              // console.log("push");
              templatesFound.push(record[table[1]].toString());
            }
          });
        });
      }
      // console.log("templatesFound", templatesFound);

      // if (templatesFound.length == 0) {
      //   return;
      // }
      const existingReport = await prisma.exercise_usage_report.findUnique({
        where: {
          exercise_id: exercise.id,
        },
      });
      // console.log("existingReport", existingReport);

      if (existingReport) {
        let templatesList = _.uniq([
          // ...existingReport[`${table[0]}_list`].split(","),
          ...templatesFound,
        ]);
        if (templatesList.length == 1 && templatesList[0] == "")
          templatesList = [];

        // if (templatesList.length < 5) {
        //   console.log("templatesFound 1", templatesList.length, templatesList);
        // }

        await prisma.exercise_usage_report.update({
          where: { id: existingReport.id },
          data: {
            [`${table[0]}_list`]: arrayToCommaSpread(templatesList),
            [`${table[0]}_count`]: templatesList.length,
          },
        });
      } else {
        const templatesList = _.uniq(templatesFound);

        // if (templatesList.length < 5) {
        //   console.log("templatesFound 2", templatesList.length, templatesList);
        // }
        await prisma.exercise_usage_report.create({
          data: {
            exercise_id: exercise.id,
            [`${table[0]}_list`]: arrayToCommaSpread(templatesList),
            [`${table[0]}_count`]: templatesList.length,
            title: exercise.title,
            image: "http://storage.morabiha.com" + exercise.image,
            video: "http://storage.morabiha.com" + exercise.video,
          },
        });
      }
      //   },
      //   { concurrency: baseTables.length }
      // );
    }

    lastId = exercise.id;

    // console.log(
    //   `exercise ${exercise.id} templatesFound: ${templatesFound.toString()}`
    // );
  } catch (error) {
    console.log(error);
    process.exit(1);
  } finally {
    main();
  }
}

function arrayToCommaSpread(input) {
  //   const arr = _.uniq(input);
  const arr = _.uniq(input);
  //   console.log("input", arr);
  let str = "";
  arr.forEach((element, idx) => {
    if (element && element.length > 0) {
      if (idx < arr.length - 1) str += element + ",";
      else str += element;
    }
  });
  return str;
}

loadRecords().then(() => {
  main();
});
