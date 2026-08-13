const http = require('http');
const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/notifications',
  method: 'GET',
  headers: {
    Authorization: 'Bearer demo-token',
    'X-User-Context': JSON.stringify({ id: 1, role: 'ADMIN' }),
  },
};

const req = http.request(options, (res) => {
  console.log('STATUS', res.statusCode);
  console.log('HEADERS', res.headers);
  let body = '';
  res.on('data', (chunk) => body += chunk);
  res.on('end', () => {
    console.log('BODY', body);
  });
});
req.on('error', (err) => {
  console.error('REQUEST ERROR', err);
});
req.end();
