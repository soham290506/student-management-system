const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");

const PORT = 3101;
const BASE_URL = `http://localhost:${PORT}`;

let server;

before(async () => {
    server = spawn(process.execPath, ["server.js"], {
        env: { ...process.env, PORT: String(PORT) },
        stdio: "ignore"
    });

    let ready = false;

    for (let i = 0; i < 40; i++) {
        if (server.exitCode !== null) {
            throw new Error("Server failed to start.");
        }

        try {
            const response = await fetch(`${BASE_URL}/api/health`);
            if (response.ok) {
                ready = true;
                break;
            }
        } catch (error) {
            // Server is still starting.
        }

        await new Promise(resolve => setTimeout(resolve, 250));
    }

    if (!ready) {
        throw new Error("Server did not start in time.");
    }
});

after(() => {
    if (server && server.exitCode === null) {
        server.kill();
    }
});

test("Student Management API works correctly", async () => {
    // Test 1: Server health
    const health = await fetch(`${BASE_URL}/api/health`);
    assert.equal(health.status, 200);

    // Test 2: Get students
    const initial = await fetch(`${BASE_URL}/api/students`);
    assert.equal(initial.status, 200);
    assert.ok(Array.isArray(await initial.json()));

    const rollNumber = `TEST-${Date.now()}`;

    // Test 3: Add a student
    const created = await fetch(`${BASE_URL}/api/students`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            name: "Test Student",
            rollNumber,
            department: "Computer Science",
            email: "test@example.com"
        })
    });

    assert.equal(created.status, 201);
    const student = await created.json();
    assert.equal(student.rollNumber, rollNumber);

    // Test 4: Reject duplicate roll numbers
    const duplicate = await fetch(`${BASE_URL}/api/students`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            name: "Duplicate Student",
            rollNumber,
            department: "Computer Science",
            email: "duplicate@example.com"
        })
    });

    assert.equal(duplicate.status, 409);

    // Test 5: Update student
    const updated = await fetch(
        `${BASE_URL}/api/students/${student.id}`,
        {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                name: "Updated Student",
                rollNumber,
                department: "Information Technology",
                email: "updated@example.com"
            })
        }
    );

    assert.equal(updated.status, 200);
    assert.equal((await updated.json()).name, "Updated Student");

    // Test 6: Delete student
    const deleted = await fetch(
        `${BASE_URL}/api/students/${student.id}`,
        { method: "DELETE" }
    );

    assert.equal(deleted.status, 200);
});