
// Simulate PROD environment (no .env loading)
process.env.NODE_ENV = 'production';
delete process.env.SUPABASE_URL;
delete process.env.SUPABASE_KEY;
delete process.env.SUPABASE_ANON_KEY;
delete process.env.SUPABASE_SERVICE_ROLE_KEY;
delete process.env.MASTER_PASSWORD;

const apiHandler = require('./api/manage-institutions.js');

// Mock Request and Response
const mockReq = {
    method: 'POST',
    body: {
        action: 'verify_password',
        master_password: 'admin'
    }
};

const mockRes = {
    statusCode: 200,
    headers: {},
    setHeader: (key, val) => { mockRes.headers[key] = val; },
    status: (code) => {
        this.statusCode = code;
        return {
            json: (data) => {
                console.log('RESPONSE JSON:', data);
                console.log('STATUS:', code);
                return this;
            },
            end: () => console.log('RESPONSE END')
        };
    },
    json: (data) => {
        console.log('RESPONSE JSON:', data);
        console.log('STATUS:', mockRes.statusCode);
        return mockRes;
    },
    end: () => {
        console.log('RESPONSE END');
    }
};

console.log('Running API Handler in simulated PROD mode with NO ENV VARS...');
apiHandler(mockReq, mockRes).catch(err => {
    console.error('CRASHED:', err);
});
