import http from 'http';

const send = (path, method, body) => {
  const data = JSON.stringify(body);
  const options = {
    hostname: 'localhost',
    port: 3000,
    path,
    method,
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(data),
      Authorization: 'Bearer demo-token',
      'X-User-Context': JSON.stringify({ id: 1, role: 'ADMIN' }),
    },
  };

  const req = http.request(options, (res) => {
    let response = '';
    res.on('data', (chunk) => (response += chunk));
    res.on('end', () => {
      console.log(path, method, 'STATUS', res.statusCode);
      console.log(response);
      console.log('---');
    });
  });

  req.on('error', (err) => {
    console.error(path, 'ERR', err.message);
  });

  req.write(data);
  req.end();
};

send('/api/admin/statuses', 'POST', { name: 'Test Status' });
send('/api/admin/categories', 'POST', { name: 'Test Category' });
send('/api/admin/categories', 'POST', { name: 'Test Subcategory', parent_id: 22 });
