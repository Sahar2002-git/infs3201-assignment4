/**
 * Employee persistence layer
 * Handles database operations for employees collection
 */
let db;

/**
 * Sets database instance
 */
function setDB(database) {
    db = database;
}

/**
 * Get all employees
 */
async function getAllEmployees() {
    return await db.collection("employees").find().toArray();
}

/**
 * Get employee by id
 */
async function getEmployeeById(id) {
    return await db.collection("employees").findOne({ id: id });
}

/**
 * Update employee
 */
async function updateEmployee(id, name, phone) {
    await db.collection("employees").updateOne(
        { id: id },
        { $set: { name: name, phone: phone } }
    );
}

module.exports = {
    setDB,
    getAllEmployees,
    getEmployeeById,
    updateEmployee
};