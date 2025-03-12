const { prisma } = require("./db");
const _ = require("lodash");
const { isJsonString } = require("./functions");

const baseTables = [
  ["exercise_template_day", "templateId"],
  ["exercise_day", "programId"],
  ["corrective_template_day", "templateId"],
  ["corrective_day", "programId"],
];

let records = {};
let exercises = [];
let exercisesMap;

const startTime = Date.now();

async function loadRecords() {
  for (let table of baseTables) {
    records[table[0]] = [];
    // records[table[0]] = await prisma[table[0]].findMany({
    let recs = await prisma[table[0]].findMany({
      orderBy: { id: "asc" },
      select: {
        id: true,
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

  exercises = await prisma.exercise.findMany();
  exercisesMap = new Map(exercises.map((x) => [x.id, x]));
}
async function main() {
  try {
    for (let table of baseTables) {
      let orphanActionIdList = [];
      for (let record of records[table[0]]) {
        record.data.forEach((item) => {
          item.movement_list.forEach((movement) => {
            if (!exercisesMap.get(movement.action_id)) {
              let obj = {
                templateId: record[table[1]],
                id_in_table: record.id,
                action_id: movement.action_id,
                tableName: table[0],
              };
              orphanActionIdList.push(obj);
            }
          });
        });
      }
      console.log(`table ${table[0]} orphans`, orphanActionIdList.length);
      // process.exit(1);

      await prisma.orphan_movement_list.createMany({
        data: orphanActionIdList,
        skipDuplicates: true,
      });
    }
    console.log("Time", (Date.now() - startTime) / 1000);
  } catch (error) {
    console.log(error);
    process.exit(1);
  } finally {
  }
}

loadRecords().then(() => {
  main();
});
