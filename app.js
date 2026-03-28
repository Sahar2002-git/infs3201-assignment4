const express = require("express");
const { engine } = require("express-handlebars");
const { MongoClient } = require("mongodb");
const employeePersistence = require("./persistence/employeePersistence");

const app = express();

// Disable layouts (assignment requirement)
app.engine("handlebars", engine({ defaultLayout: false }));
app.set("view engine", "handlebars");
app.set("views", "./views");

app.use(express.urlencoded({ extended: true }));

// ===== MongoDB =====
const uri = "mongodb+srv://sahartahir2002_db_user:abc12345@cluster0.6wsyzfc.mongodb.net/infs3201_winter2026?retryWrites=true&w=majority";
const client = new MongoClient(uri);

let db;

/**
 * Connect database and start server
 */
async function start() {
    await client.connect();
    db = client.db("infs3201_winter2026");

    // give db to persistence layer
    employeePersistence.setDB(db);

    console.log("Connected to MongoDB");

    app.listen(3000, () =>
        console.log("Server running → http://localhost:3000")
    );
}

// ================= ROUTES =================

// Landing page - employee list
app.get("/", async (req, res) => {
    const employees = await employeePersistence.getAllEmployees();
    res.render("employees", { employees });
});

// Employee details
app.get("/employee/:id", async (req, res) => {
    const emp = await employeePersistence.getEmployeeById(req.params.id);

    if (!emp) return res.send("Employee not found");

    res.render("details", { emp });
});

// Edit page
app.get("/employee/:id/edit", async (req, res) => {
    const emp = await employeePersistence.getEmployeeById(req.params.id);

    if (!emp) return res.send("Employee not found");

    res.render("edit", { emp });
});

// Handle edit submission (SERVER VALIDATION + PRG)
app.post("/employee/:id/edit", async (req, res) => {

    let name = req.body.name ? req.body.name.trim() : "";
    let phone = req.body.phone ? req.body.phone.trim() : "";

    // Validation rules
    if (name.length === 0)
        return res.send("Name must not be empty");

    if (!/^\d{4}-\d{4}$/.test(phone))
        return res.send("Phone must be in format ####-####");

    await employeePersistence.updateEmployee(req.params.id, name, phone);

    // PRG pattern (required)
    res.redirect("/");
});

start();