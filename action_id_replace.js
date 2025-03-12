const { prisma } = require("./db");
const _ = require("lodash");
const { isJsonString, isIterable } = require("./functions");
// let lastId = 0;

const baseTables = [
  // ["exercise_template_day", "templateId"],
  ["exercise_day", "programId"],
  // ["corrective_template_day", "templateId"],
  // ["corrective_day", "programId"],
];

let records = {};
let exercises = [];
let exercisesMap;
let replacingLists = [];
let replacingMap;
// let replacingIdx = 0;
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
    // const replacingList = replacingLists[replacingIdx];

    // if (replacingIdx > replacingLists.length - 1) {
    //   console.log("Done", Date.now() - startTime);
    //   process.exit(1);
    // }

    for (let table of baseTables) {
      //   let templatesFound = [];
      // load records from the tables
      let rowNumber = 0;
      for (let row of records[table[0]]) {
        const newData = [];
        if (!isIterable(row.data)) {
          console.log("no array", row.data);
          newData.push(row.data);
          process.exit(1);
        } else {
          for (let row_data of row.data) {
            // console.log("for begin");

            let newMovementList = [];
            //   console.log("r", r);
            if (typeof row_data.movement_list == "undefined") {
              console.log("movement is undefiend");
              continue;
            }
            for (let movement of row_data.movement_list) {
              // const replaceable = replacingLists.find(
              //   (x) => x.oldId == movement.action_id
              // );
              if (movement.action_id == 1197) {
                console.log("bug row");
              }
              const replaceable = replacingMap.get(movement.action_id);
              if (replaceable) {
                // if (movement.action_id == replacingList.oldId) {
                // console.log("found", movement.action_id);

                // const newMovement = exercises.find(
                //   (x) => x.id == replaceable.newId
                // );
                // const time = Date.now();

                const newMovement = exercisesMap.get(replaceable.newId);
                // console.log(Date.now() - time);
                // process.exit(1);

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
                // console.log(obj);
                newMovementList.push(obj);
              } else {
                // if (JSON.stringify(movement).includes(":2055,")) {
                //   console.log("movement", movement);
                // }
                // console.log("not found");

                newMovementList.push(movement);
              }
            }
            // console.log("after for");

            //   console.log("record", record);
            // console.log("table[1]", table[0], table[1]);
            // console.log("record[table[1]]", record[table[1]]);
            // console.log("newMovementList", newMovementList.length);
            // delete r.movement_list;
            newData.push({
              ...row_data,
              movement_list: newMovementList,
            });
            newMovementList;
            // console.log(newData);
            // console.log("out");

            //   await prisma[table[0]].update({
            //     where: { id: record.id },
            //     data: {
            //       data: JSON.stringify({
            //         ...r,
            //         movement_list: newMovementList,
            //       }),
            //     },
            //   });
          }
        }

        // const dbTime = Date.now();
        let json = JSON.stringify(newData);

        // const recdb = await prisma.exercise_template_day.findUnique({
        //   where: { id: record.id },
        // });
        // console.log("recdb", recdb);
        // if (!recdb) {
        //   console.log("record not found");
        // }
        // console.log();
        // if (json.includes(":2055,")) {
        //   console.log("json", json);
        // }
        await prisma[table[0]].update({
          where: { id: row.id },
          data: {
            data: json,
          },
        });
        rowNumber++;

        if (rowNumber % 50 == 0) console.log(`Row ${rowNumber} id ${row.id}`);
        // console.log("Update Db", Date.now() - dbTime, json == record.data);
        // record.data.forEach((item) => {
        //   item.movement_list.forEach((movement) => {
        //     if (movement.action_id == replacingList.oldId) {
        //       //   templatesFound.push(record[table[1]].toString());
        //       new movement = await prisma.exercise.findUnique({where:{id:replacingList.newId}})
        //     }
        //   });
        // });
      }
      // console.log("for table");
    }

    // lastId = .id;

    // console.log(
    //   `exercise ${exercise.id} templatesFound: ${templatesFound.toString()}`
    // );
    console.log("Time", (Date.now() - startTime) / 1000);
  } catch (error) {
    console.log(error);
    process.exit(1);
  } finally {
    // console.log("finally");
    // replacingIdx++;
    // main();
  }
}

const startTime = Date.now();

loadRecords().then(() => {
  main();
});
