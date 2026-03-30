const emailSystem = require("./emailSystem");
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


// ===== SECURITY ACCESS LOG MIDDLEWARE =====

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
        req.path === "/logout" ||
        req.path === "/2fa"
    ) {
        return next();
    }

    if (!req.cookies.user) {

        return res.redirect("/login");

    }

    next();

});


// ===== LOGIN PAGE =====

app.get("/login", (req, res) => {

    res.render("login");

});


// ===== LOGIN STEP 1 (PASSWORD CHECK ONLY) =====

app.post("/login", async (req, res) => {

    const { username, password } = req.body;

    const user = await db.collection("users").findOne({ username });

    if (!user) {

        return res.render("login", { error: true });

    }

    // block if account locked

    if (user.locked) {

        return res.render("login", { error: "Account locked" });

    }

    // wrong password attempt

    if (user.password !== password) {

        const newAttempts = (user.failedAttempts || 0) + 1;

        await db.collection("users").updateOne(

            { username },

            { $set: { failedAttempts: newAttempts } }

        );

        // send suspicious activity email after 3 failed attempts

        if (newAttempts === 3) {

            emailSystem.sendSuspiciousActivityEmail(username);

        }

        return res.render("login", { error: true });

    }

    // correct password → reset failed attempts

    await db.collection("users").updateOne(

        { username },

        { $set: { failedAttempts: 0 } }

    );

    // generate 6-digit 2FA code

    const code = Math.floor(100000 + Math.random() * 900000).toString();

    res.cookie("twofa_user", username);

    res.cookie("twofa_code", code);

    res.cookie("twofa_expiry", (Date.now() + (3 * 60 * 1000)).toString());

    // simulate sending email

    emailSystem.send2FACode(username, code);

    res.redirect("/2fa");

});


// ===== 2FA PAGE =====

app.get("/2fa", (req, res) => {

    res.render("2fa");

});


// ===== 2FA VERIFICATION =====

app.post("/2fa", async (req, res) => {

    const enteredCode = req.body.code;

    const storedCode = req.cookies.twofa_code;

    const expiry = req.cookies.twofa_expiry;

    const username = req.cookies.twofa_user;

    if (!storedCode || !expiry || Date.now() > expiry) {

        return res.render("2fa", { error: true });

    }

    if (enteredCode !== storedCode) {

        return res.render("2fa", { error: true });

    }

    // start session ONLY after successful 2FA

    res.cookie("user", username, {

        maxAge: 5 * 60 * 1000

    });

    // clear temporary cookies

    res.clearCookie("twofa_user");
    res.clearCookie("twofa_code");
    res.clearCookie("twofa_expiry");

    res.redirect("/");

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