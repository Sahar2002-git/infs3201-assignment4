const express = require("express");
const { engine } = require("express-handlebars");
const { MongoClient, ObjectId } = require("mongodb");
const cookieParser = require("cookie-parser");

const app = express();

app.engine("handlebars", engine({ defaultLayout: false }));
app.set("view engine", "handlebars");
app.set("views", "./views");

app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());


// ===== MongoDB connection =====

const uri =
"mongodb://sahartahir2002_db_user:Ss20022002@ac-3sikkgg-shard-00-00.6wsyzfc.mongodb.net:27017,ac-3sikkgg-shard-00-01.6wsyzfc.mongodb.net:27017,ac-3sikkgg-shard-00-02.6wsyzfc.mongodb.net:27017/?ssl=true&replicaSet=atlas-jfs94n-shard-0&authSource=admin&appName=Cluster0";

const client = new MongoClient(uri);

let db;

async function connectDB() {

    await client.connect();

    db = client.db("infs3201_winter2026");

    console.log("Connected to MongoDB");

}

connectDB();


// ===== SECURITY ACCESS LOG MIDDLEWARE (Assignment requirement) =====

app.use(async (req, res, next) => {

    try {

        if (!db) return next();

        await db.collection("security_log").insertOne({

            timestamp: new Date(),
            username: req.cookies.user || "guest",
            url: req.originalUrl,
            method: req.method

        });

    } catch (error) {

        console.log("Security log error:", error);

    }

    next();

});


// ===== GLOBAL AUTHENTICATION MIDDLEWARE =====

app.use((req, res, next) => {

    if (
        req.path === "/login" ||
        req.path === "/logout"
    ) {
        return next();
    }

    if (!req.cookies.user) {

        return res.redirect("/login");

    }

    next();

});


// ===== LOGIN ROUTES =====

app.get("/login", (req, res) => {

    res.render("login");

});


app.post("/login", async (req, res) => {

    const { username, password } = req.body;

    const user = await db.collection("users").findOne({

        username: username,
        password: password

    });

    if (user) {

        res.cookie("user", username, {

            maxAge: 5 * 60 * 1000

        });

        return res.redirect("/");

    }

    res.render("login", { error: true });

});


// ===== LOGOUT ROUTE =====

app.get("/logout", (req, res) => {

    res.clearCookie("user");

    res.redirect("/login");

});


// ===== EMPLOYEE LIST PAGE =====

app.get("/", async (req, res) => {

    const employees = await db.collection("employees").find({}).toArray();

    res.render("employees", { employees });

});


// ===== EMPLOYEE DETAILS PAGE =====

app.get("/employee/:id", async (req, res) => {

    try {

        const employee = await db.collection("employees").findOne({

            _id: new ObjectId(req.params.id)

        });

        if (!employee) {

            return res.send("Employee not found");

        }

        res.render("details", { employee });

    } catch (error) {

        console.log(error);

        res.send("Invalid employee ID");

    }

});


// ===== EDIT EMPLOYEE PAGE =====

app.get("/edit/:id", async (req, res) => {

    try {

        const employee = await db.collection("employees").findOne({

            _id: new ObjectId(req.params.id)

        });

        res.render("edit", { employee });

    } catch (error) {

        console.log(error);

        res.send("Invalid employee ID");

    }

});


app.post("/edit/:id", async (req, res) => {

    try {

        await db.collection("employees").updateOne(

            { _id: new ObjectId(req.params.id) },

            {

                $set: {

                    name: req.body.name,
                    phone: req.body.phone

                }

            }

        );

        res.redirect("/");

    } catch (error) {

        console.log(error);

        res.send("Update failed");

    }

});


// ===== START SERVER =====

app.listen(3000, () => {

    console.log("Server running on http://localhost:3000");

});