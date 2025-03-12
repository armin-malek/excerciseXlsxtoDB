const { prisma } = require("./db");
const { isJsonString, isIterable } = require("./functions");

const baseTables = [
  // ["exercise_template_day", "templateId"],
  // ["exercise_day", "programId"],
  // ["corrective_template_day", "templateId"],
  ["corrective_day", "programId"],
];

let records = {};
let exercises = [];
let exercisesMap;
let replacingLists = [];
let replacingMap;
async function loadRecords() {
  for (let table of baseTables) {
    records[table[0]] = [];
    let recs = await prisma[table[0]].findMany({
      orderBy: { id: "asc" },
      select: {
        id: true,
        [table[1]]: true,
        data: true,
      },
    });
    console.log(`table ${table[0]} records ${recs.length}`);

    for (let i = 0; i < recs.length; i++) {
      if (isJsonString(recs[i].data)) {
        recs[i].data = JSON.parse(recs[i].data);
      }
      records[table[0]].push(recs[i]);
    }
  }

  exercises = await prisma.exercise.findMany();
  exercisesMap = new Map(exercises.map((x) => [x.id, x]));

  replacingLists = await prisma.action_id_replace_table.findMany({
    // where: { id: { gt: lastId } },
    // where: { oldId: 2031 },
    orderBy: { id: "asc" },
  });
  replacingMap = new Map(replacingLists.map((x) => [x.oldId, x]));

  console.log("Data loaded");
}
async function main() {
  try {
    for (let table of baseTables) {
      let rowNumber = 0;
      for (let row of records[table[0]]) {
        const newData = [];
        if (!isIterable(row.data)) {
          console.log("no array", row.data);
          newData.push(row.data);
          process.exit(1);
        } else {
          for (let row_data of row.data) {
            let newMovementList = [];
            if (typeof row_data.movement_list == "undefined") {
              console.log("movement is undefiend");
              continue;
            }
            for (let movement of row_data.movement_list) {
              const replaceable = replacingMap.get(movement.action_id);
              if (replaceable) {
                const newMovement = exercisesMap.get(replaceable.newId);

                if (!newMovement) {
                  console.log(`exercise ${replaceable.newId} doesnt exists`);
                  continue;
                }

                let obj = {
                  ...movement,
                  action_title: newMovement.title,
                  action_id: newMovement.id,
                  action_video_ur: newMovement.video,
                  action_pic_url: newMovement.image,
                };
                newMovementList.push(obj);
              } else {
                newMovementList.push(movement);
              }
            }

            newData.push({
              ...row_data,
              movement_list: newMovementList,
            });
            newMovementList;
          }
        }

        let json = JSON.stringify(newData);

        await prisma[table[0]].update({
          where: { id: row.id },
          data: {
            data: json,
          },
        });
        rowNumber++;

        if (rowNumber % 50 == 0) console.log(`Row ${rowNumber} id ${row.id}`);
      }
    }

    console.log("Time", (Date.now() - startTime) / 1000);
  } catch (error) {
    console.log(error);
    process.exit(1);
  } finally {
  }
}

const startTime = Date.now();

loadRecords().then(() => {
  main();
});
