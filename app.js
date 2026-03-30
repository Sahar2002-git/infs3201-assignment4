const emailSystem = require("./emailSystem");
const express = require("express");
const { engine } = require("express-handlebars");
const { MongoClient, ObjectId } = require("mongodb");
const cookieParser = require("cookie-parser");
const multer = require("multer");
const path = require("path");

const app = express();

app.engine("handlebars", engine({ defaultLayout: false }));
app.set("view engine", "handlebars");
app.set("views", "./views");

app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());


// ================= MULTER CONFIG =================

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, "uploads/"),
    filename: (req, file, cb) =>
        cb(null, Date.now() + "-" + file.originalname)
});

const upload = multer({
    storage,
    limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
    fileFilter: (req, file, cb) => {

        if (path.extname(file.originalname) !== ".pdf")
            return cb(new Error("Only PDF files allowed"));

        cb(null, true);

    }
});


// ================= DATABASE CONNECTION =================

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


// ================= SECURITY LOGGING =================

app.use(async (req, res, next) => {

    if (!db) return next();

    await db.collection("security_log").insertOne({

        timestamp: new Date(),
        username: req.cookies.user || "guest",
        url: req.originalUrl,
        method: req.method

    });

    next();

});


// ================= AUTH MIDDLEWARE =================

app.use((req, res, next) => {

    if (
        req.path === "/login" ||
        req.path === "/logout" ||
        req.path === "/2fa"
    ) return next();

    if (!req.cookies.user)
        return res.redirect("/login");

    next();

});


// ================= LOGIN PAGE =================

app.get("/login", (req, res) => {

    res.render("login");

});


// ================= LOGIN PASSWORD STEP =================

app.post("/login", async (req, res) => {

    const { username, password } = req.body;

    const user = await db.collection("users").findOne({ username });

    if (!user)
        return res.render("login", { error: true });

    if (user.locked)
        return res.render("login", { error: "Account locked" });

    if (user.password !== password) {

        const newAttempts = user.failedAttempts + 1;

        await db.collection("users").updateOne(
            { username },
            { $set: { failedAttempts: newAttempts } }
        );

        if (newAttempts === 3)
            emailSystem.sendSuspiciousActivityEmail(username);

        if (newAttempts >= 10) {

            await db.collection("users").updateOne(
                { username },
                { $set: { locked: true } }
            );

            emailSystem.sendAccountLockedEmail(username);

            return res.render("login", {
                error: "Account locked after too many failed attempts"
            });

        }

        return res.render("login", { error: true });

    }

    await db.collection("users").updateOne(
        { username },
        { $set: { failedAttempts: 0 } }
    );

    const code =
        Math.floor(100000 + Math.random() * 900000).toString();

    res.cookie("twofa_user", username);
    res.cookie("twofa_code", code);
    res.cookie("twofa_expiry", (Date.now() + 180000).toString());

    emailSystem.send2FACode(username, code);

    res.redirect("/2fa");

});


// ================= 2FA PAGE =================

app.get("/2fa", (req, res) => {

    res.render("2fa");

});


// ================= 2FA VERIFY =================

app.post("/2fa", (req, res) => {

    const entered = req.body.code;
    const stored = req.cookies.twofa_code;
    const expiry = req.cookies.twofa_expiry;
    const username = req.cookies.twofa_user;

    if (!stored || Date.now() > expiry)
        return res.render("2fa", { error: true });

    if (entered !== stored)
        return res.render("2fa", { error: true });

    res.cookie("user", username, {
        maxAge: 5 * 60 * 1000
    });

    res.clearCookie("twofa_user");
    res.clearCookie("twofa_code");
    res.clearCookie("twofa_expiry");

    res.redirect("/");

});


// ================= LOGOUT =================

app.get("/logout", (req, res) => {

    res.clearCookie("user");

    res.redirect("/login");

});


// ================= EMPLOYEE LIST =================

app.get("/", async (req, res) => {

    const employees =
        await db.collection("employees").find().toArray();

    res.render("employees", { employees });

});


// ================= EMPLOYEE DETAILS =================

app.get("/employee/:id", async (req, res) => {

    const employee =
        await db.collection("employees").findOne({
            _id: new ObjectId(req.params.id)
        });

    res.render("details", { employee });

});


// ================= EDIT EMPLOYEE =================

app.get("/edit/:id", async (req, res) => {

    const employee =
        await db.collection("employees").findOne({
            _id: new ObjectId(req.params.id)
        });

    res.render("edit", { employee });

});


app.post("/edit/:id", async (req, res) => {

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

});


// ================= DOCUMENT UPLOAD ROUTE =================

app.post("/upload/:id", upload.single("document"), async (req, res) => {

    const employeeId = req.params.id;

    const employee =
        await db.collection("employees").findOne({
            _id: new ObjectId(employeeId)
        });

    if (!employee.documents)
        employee.documents = [];

    if (employee.documents.length >= 5)
        return res.send("Maximum 5 documents allowed");

    await db.collection("employees").updateOne(
        { _id: new ObjectId(employeeId) },
        {
            $push: {
                documents: req.file.filename
            }
        }
    );

    res.redirect("/employee/" + employeeId);

});
// ===== SECURE DOCUMENT DOWNLOAD ROUTE =====

app.get("/document/:filename", (req, res) => {

    const filePath = path.join(__dirname, "uploads", req.params.filename);

    res.download(filePath);

});

// ================= START SERVER =================

app.listen(3000, () =>
    console.log("Server running on http://localhost:3000")
);