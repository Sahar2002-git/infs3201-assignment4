const { MongoClient, ObjectId } = require("mongodb");

const uri = "mongodb://sahartahir2002_db_user:Ss20022002@ac-3sikkgg-shard-00-00.6wsyzfc.mongodb.net:27017,ac-3sikkgg-shard-00-01.6wsyzfc.mongodb.net:27017,ac-3sikkgg-shard-00-02.6wsyzfc.mongodb.net:27017/?ssl=true&replicaSet=atlas-jfs94n-shard-0&authSource=admin&appName=Cluster0";

const client = new MongoClient(uri);

async function addEmployeesArrayToShifts(db) {

    const shifts = db.collection("shifts");

    await shifts.updateMany(
        {},
        { $set: { employees: [] } }
    );

    console.log("Added employees array to shifts");

}

async function embedEmployeesIntoShifts(db) {

    const assignments = db.collection("assignments");
    const employees = db.collection("employees");
    const shifts = db.collection("shifts");

    const assignmentList = await assignments.find({}).toArray();

    for (let i = 0; i < assignmentList.length; i++) {

        let assignment = assignmentList[i];

        let employee = await employees.findOne({
            employeeId: assignment.employeeId
        });

        if (employee) {

            await shifts.updateOne(
                { shiftId: assignment.shiftId },
                {
                    $push: {
                        employees: employee._id
                    }
                }
            );

        }

    }

    console.log("Embedded employees into shifts");

}

async function removeOldFields(db) {

    await db.collection("employees").updateMany(
        {},
        { $unset: { employeeId: "" } }
    );

    await db.collection("shifts").updateMany(
        {},
        { $unset: { shiftId: "" } }
    );

    await db.collection("assignments").drop();

    console.log("Removed old fields and deleted assignments collection");

}

async function runMigration() {

    try {

        await client.connect();

        const db = client.db("infs3201_winter2026");

        await addEmployeesArrayToShifts(db);

        await embedEmployeesIntoShifts(db);

        await removeOldFields(db);

        console.log("Migration complete");

    } catch (error) {

        console.error(error);

    } finally {

        await client.close();

    }

}

runMigration();