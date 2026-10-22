const http = require('http');

async function testLogin() {
  console.log("--- POST /api/auth/login ---");
  const data = JSON.stringify({ identifier: 'admin', password: 'admin123' });
  const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/auth/login',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(data)
    }
  };

  const req = http.request(options, (res) => {
    console.log(`Status: ${res.statusCode}`);
    console.log(`Set-Cookie:`, res.headers['set-cookie']);
    let body = '';
    res.on('data', (chunk) => body += chunk);
    res.on('end', async () => {
      console.log(`Body: ${body}`);
      const cookie = res.headers['set-cookie']?.[0];
      if (cookie) {
        const parsedCookie = cookie.split(';')[0];
        console.log(`Extracted Cookie: ${parsedCookie}`);
        
        // Follow redirect to /admin
        console.log("\n--- GET /admin ---");
        const getOptions = {
          hostname: 'localhost',
          port: 3000,
          path: '/admin',
          method: 'GET',
          headers: {
            'Cookie': parsedCookie
          }
        };
        const getReq = http.request(getOptions, (getRes) => {
          console.log(`Status: ${getRes.statusCode}`);
          console.log(`Location: ${getRes.headers['location']}`);
        });
        getReq.end();
      }
    });
  });

  req.write(data);
  req.end();
}

testLogin();
