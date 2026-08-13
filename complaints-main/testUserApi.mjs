import axios from 'axios';
import jwt from 'jsonwebtoken';

const token = jwt.sign({ id: 1, email: 'dawitg@gmail.com', role: 'ADMIN' }, 'your_secret_key_here', { expiresIn: '24h' });
const client = axios.create({ baseURL: 'http://localhost:3000/api', headers: { Authorization: `Bearer ${token}` } });

async function run() {
  try {
    const u = await client.get('/admin/users');
    console.log('GET /admin/users', u.status, Array.isArray(u.data.data) ? u.data.data.length : u.data.length, JSON.stringify(u.data).slice(0, 200));
  } catch (e) {
    console.error('GET error', e.response ? e.response.data : e.message);
  }

  try {
    const res = await client.post('/admin/users', { name: 'TEST USER', email: `testuser${Date.now()}@example.com`, password: 'password', role: 'OFFICER', tax_center_id: null });
    console.log('POST /admin/users', res.status, res.data);
  } catch (e) {
    console.error('POST error', e.response ? e.response.data : e.message);
  }
}

run().catch((err) => { console.error('RUN error', err); });
