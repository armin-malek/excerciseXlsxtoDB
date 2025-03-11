const { prisma } = require("./db");
const { isJsonString, isIterable } = require("./functions");
const {
  Worker,
  isMainThread,
  parentPort,
  workerData,
} = require("worker_threads");
const os = require("os");

const baseTables = [["exercise_template_day", "templateId"]];

async function loadRecords() {
  let records = {};
  for (let table of baseTables) {
    records[table[0]] = await prisma[table[0]].findMany({
      orderBy: { id: "asc" },
      select: { id: true, [table[1]]: true, data: true },
    });
  }

  let exercises = await prisma.exercise.findMany();
  let replacingLists = await prisma.action_id_replace_table.findMany({
    orderBy: { id: "asc" },
  });

  return { records, exercises, replacingLists };
}

if (isMainThread) {
  async function main() {
    const { records, exercises, replacingLists } = await loadRecords();
    // const numThreads = os.cpus().length;
    const numThreads = 6;
    const workerPool = [];
    let activeWorkers = 0;

    for (let table of baseTables) {
      for (let row of records[table[0]]) {
        while (activeWorkers >= numThreads) {
          await new Promise((resolve) => setTimeout(resolve, 50));
        }

        const worker = new Worker(__filename, {
          workerData: { row, exercises, replacingLists, tableName: table[0] },
        });
        activeWorkers++;

        workerPool.push(
          new Promise((resolve, reject) => {
            worker.on("message", () => {
              activeWorkers--;
              resolve();
            });
            worker.on("error", reject);
          })
        );
      }
    }

    await Promise.all(workerPool);
    console.log("All records processed.");
  }

  main();
} else {
  async function processRow(row, exercises, replacingLists, tableName) {
    let newData = [];
    if (!isIterable(row.data)) {
      console.log("no array", row.data);
      return;
    }

    for (let row_data of row.data) {
      let newMovementList = [];

      if (!row_data.movement_list) {
        continue;
      }
      for (let movement of row_data.movement_list) {
        const replaceable = replacingLists.find(
          (x) => x.oldId === movement.action_id
        );
        if (replaceable) {
          const newMovement = exercises.find((x) => x.id === replaceable.newId);
          if (!newMovement) continue;

          newMovementList.push({
            ...movement,
            action_title: newMovement.title,
            action_id: newMovement.id,
            action_video_url: newMovement.video,
            action_pic_url: newMovement.image,
          });
        } else {
          newMovementList.push(movement);
        }
      }

      newData.push({ ...row_data, movement_list: newMovementList });
    }

    await prisma[tableName].update({
      where: { id: row.id },
      data: { data: JSON.stringify(newData) },
    });
  }

  processRow(
    workerData.row,
    workerData.exercises,
    workerData.replacingLists,
    workerData.tableName
  ).then(() => {
    parentPort.postMessage("done");
  });
}
