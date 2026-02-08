
// Simulate PROD environment (no .env loading)
process.env.NODE_ENV = 'production';
delete process.env.SUPABASE_URL;

const apiHandler = require('./api/manage-institutions.js');

// Mock Request 
const mockReq = {
    method: 'POST',
    body: {
        action: 'verify_password',
        master_password: 'admin'
    }
};

// Mock Response WITHOUT Express methods (Native Node.js style)
const mockRes = {
    statusCode: 200,
    headers: {},
    setHeader: (key, val) => {
        console.log(`HEADER SET: ${key}=${val}`);
        mockRes.headers[key] = val;
    },
    end: (content) => {
        console.log('RESPONSE END (Native):', content);
    }
};

console.log('Running API Handler with NATIVE Response object...');
apiHandler(mockReq, mockRes).catch(err => {
    console.error('CRASHED:', err);
});
