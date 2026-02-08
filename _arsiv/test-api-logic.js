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
    await api({
        method: 'POST',
        body: { action: 'verify_password', master_password: 'admin123' } // fallback password
    }, mockRes());

    console.log("\n--- TEST 2: login (Institution Login - Correct Password) ---");
    // We can't mock Supabase easily here without mocking the library.
    // But we can check if it CRASHES before reaching Supabase.
    // If it reaches "Supabase client is null" (500) or fails with 401, that's expected locally.
    // We want to verify it doesn't THROW ReferenceError.

    try {
        await api({
            method: 'POST',
            body: {
                action: 'login',
                payload: { slug: 'test-inst', password: 'wrong' }
            }
        }, mockRes());
    } catch (e) {
        console.error("CRASHED:", e);
    }
}

test();
