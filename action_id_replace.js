const { prisma } = require("./db");
const _ = require("lodash");
const { isJsonString, isIterable } = require("./functions");
let lastId = 0;

const baseTables = [
  ["exercise_template_day", "templateId"],
  ["exercise_day", "programId"],
  ["corrective_template_day", "templateId"],
  ["corrective_day", "programId"],
];

let records = {};

async function loadRecords() {
  for (let table of baseTables) {
    records[table[0]] = await prisma[table[0]].findMany({
      orderBy: { id: "asc" },
      select: {
        id: true,
        [table[1]]: true,
        data: true,
      },
    });
    console.log(`table ${table[0]} records ${records[table[0]].length}`);
  }
}
async function main() {
  try {
    const replacingList = await prisma.action_id_replace_table.findFirst({
      where: { id: { gt: lastId } },
      //   where: { id: 1663 },
      orderBy: { id: "asc" },
    });

    if (!replacingList) {
      console.log("Done", Date.now() - startTime);
      process.exit(1);
    }

    for (let table of baseTables) {
      //   let templatesFound = [];
      // load records from the tables
      for (let record of records[table[0]]) {
        // console.log(record);
        if (isJsonString(record.data)) {
          //   console.log(record);
          //   continue;
          record.data = JSON.parse(record.data);
        }
        let newData = [];
        if (!isIterable(record.data)) {
          console.log("no array", record.data);
          newData.push(record.data);
          process.exit(1);
        } else {
          for (let r of record.data) {
            let newMovementList = [];
            //   console.log("r", r);
            if (typeof r.movement_list == "undefined") continue;
            for (let movement of r.movement_list) {
              if (movement.action_id == replacingList.oldId) {
                console.log("found", movement.action_id);
                //   templatesFound.push(record[table[1]].toString());
                const newMovement = await prisma.exercise.findUnique({
                  where: { id: replacingList.newId },
                });
                if (!newMovement) {
                  console.log(`exercise ${replacingList.newId} doesnt exists`);
                  continue;
                }

                newMovementList.push({
                  ...movement,
                  action_title: newMovement.title,
                  action_id: newMovement.id,
                  action_video_ur: newMovement.video,
                  action_pic_url: newMovement.image,
                });
              } else {
                newMovementList.push(movement);
              }
            }
            //   console.log("record", record);
            // console.log("table[1]", table[0], table[1]);
            // console.log("record[table[1]]", record[table[1]]);
            // console.log("newMovementList", newMovementList.length);
            newData.push({
              ...r,
              movement_list: newMovementList,
            });
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

        await prisma[table[0]].update({
          where: { id: record.id },
          data: {
            data: JSON.stringify(newData),
          },
        });
        // record.data.forEach((item) => {
        //   item.movement_list.forEach((movement) => {
        //     if (movement.action_id == replacingList.oldId) {
        //       //   templatesFound.push(record[table[1]].toString());
        //       new movement = await prisma.exercise.findUnique({where:{id:replacingList.newId}})
        //     }
        //   });
        // });
      }
    }

    lastId = replacingList.id;

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

const startTime = Date.now();

loadRecords().then(() => {
  main();
});
