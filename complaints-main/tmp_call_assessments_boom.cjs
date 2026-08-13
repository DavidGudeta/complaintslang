const jwt = require('jsonwebtoken');
const axios = require('axios');

(async () => {
  const token = jwt.sign({
    id: 228,
    email: 'boom@gmail.com',
    role: 'TEAM_LEADER',
    tax_center_id: 91,
    tax_center_name: null,
    login_name: 'boom@gmail.com'
  }, 'your_secret_key_here', { expiresIn: '24h' });

  const client = axios.create({
    baseURL: 'http://localhost:3000/api',
    headers: { Authorization: `Bearer ${token}` }
  });

  try {
    const res = await client.get('/internal/complaints/assessments');
    console.log('STATUS', res.status);
    console.log('COUNT', Array.isArray(res.data?.data) ? res.data.data.length : 'NO_ARRAY');
    console.log('MATCHES', JSON.stringify(res.data?.data?.filter(x => x.tracking_code === 'CMP-C1IMBH'), null, 2));
  } catch (e) {
    console.error('ERR', e.response?.status, e.response?.data || e.message);
  }
})();
