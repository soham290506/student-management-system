const express = require("express");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// Create storage folder and file
const dataDir = path.join(__dirname, "data");
const dataFile = path.join(dataDir, "students.json");

if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir);
}

if (!fs.existsSync(dataFile)) {
    fs.writeFileSync(dataFile, "[]");
}

// Read and save student records
function readStudents() {
    return JSON.parse(fs.readFileSync(dataFile, "utf8"));
}

function saveStudents(students) {
    fs.writeFileSync(dataFile, JSON.stringify(students, null, 2));
}

// Health check
app.get("/api/health", (req, res) => {
    res.json({ status: "success", message: "Server is running!" });
});

// Get all students
app.get("/api/students", (req, res) => {
    res.json(readStudents());
});

// Add a student
app.post("/api/students", (req, res) => {
    const { name, rollNumber, department, email } = req.body;

    if (!name || !rollNumber || !department || !email) {
        return res.status(400).json({
            error: "Please fill in all fields."
        });
    }

    const students = readStudents();

    if (students.some(s => s.rollNumber === rollNumber.trim())) {
        return res.status(409).json({
            error: "Roll number already exists."
        });
    }

    const newStudent = {
        id: crypto.randomUUID(),
        name: name.trim(),
        rollNumber: rollNumber.trim(),
        department: department.trim(),
        email: email.trim()
    };

    students.push(newStudent);
    saveStudents(students);

    res.status(201).json(newStudent);
});

// Update a student
app.put("/api/students/:id", (req, res) => {
    const students = readStudents();
    const index = students.findIndex(s => s.id === req.params.id);

    if (index === -1) {
        return res.status(404).json({ error: "Student not found." });
    }

    const { name, rollNumber, department, email } = req.body;

    if (!name || !rollNumber || !department || !email) {
        return res.status(400).json({ error: "All fields are required." });
    }

    const duplicate = students.some(
        (s, i) => i !== index && s.rollNumber === rollNumber.trim()
    );

    if (duplicate) {
        return res.status(409).json({ error: "Roll number already exists." });
    }

    students[index] = {
        ...students[index],
        name: name.trim(),
        rollNumber: rollNumber.trim(),
        department: department.trim(),
        email: email.trim()
    };

    saveStudents(students);
    res.json(students[index]);
});

// Delete a student
app.delete("/api/students/:id", (req, res) => {
    const students = readStudents();
    const updated = students.filter(s => s.id !== req.params.id);

    if (updated.length === students.length) {
        return res.status(404).json({ error: "Student not found." });
    }

    saveStudents(updated);
    res.json({ message: "Student deleted successfully." });
});

// Start server
app.listen(PORT, "0.0.0.0", () => {
    console.log(`Student Management System running at http://localhost:${PORT}`);
});