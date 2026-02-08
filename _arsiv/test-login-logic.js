const api = require('./api/manage-institutions.js');

// Mock req/res
const mockRes = () => {
    const res = {};
    res.status = (code) => {
        res.statusCode = code;
        return res;
    };
    res.json = (data) => {
        console.log(`[${res.statusCode}] JSON:`, JSON.stringify(data, null, 2));
        return res;
    };
    res.setHeader = () => { };
    res.end = () => { };
    return res;
};

async function test() {
    console.log("--- TEST 1: verify_password (Super Admin Login) ---");
    // Emulate what admin.html sends:
    // body: JSON.stringify({ action: 'verify_password', password: val })
    await api({
        method: 'POST',
        body: { action: 'verify_password', password: 'admin123' }
    }, mockRes());

    console.log("\n--- TEST 2: list (Super Admin Dashboard Load) ---");
    // Emulate what admin.html likely sends after login or during?
    await api({
        method: 'POST',
        body: { action: 'list', password: 'admin123' }
    }, mockRes());
}

test();
