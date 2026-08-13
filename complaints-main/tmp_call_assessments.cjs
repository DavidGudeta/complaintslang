const jwt = require('jsonwebtoken');
const axios = require('axios');

(async () => {
  const token = jwt.sign({
    id: 141,
    email: 'director@gmail.com',
    role: 'DIRECTOR',
    tax_center_id: null,
    tax_center_name: 'ADDIS ABABA LTO',
    login_name: 'director'
  }, 'your_secret_key_here', { expiresIn: '24h' });

  const client = axios.create({
    baseURL: 'http://localhost:3000/api',
    headers: { Authorization: `Bearer ${token}` }
  });

  try {
    const res = await client.get('/internal/complaints/assessments');
    console.log('STATUS', res.status);
    console.log('COUNT', Array.isArray(res.data?.data) ? res.data.data.length : 'NO_ARRAY');
    console.log(JSON.stringify(res.data, null, 2).slice(0, 5000));
  } catch (e) {
    console.error('ERR', e.response?.status, e.response?.data || e.message);
  }
})();
