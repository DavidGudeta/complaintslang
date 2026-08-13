import jwt from 'jsonwebtoken';
const token = jwt.sign({ id: 1, email: 'dawitg@gmail.com', role: 'ADMIN' }, 'your_secret_key_here', { expiresIn: '24h' });
console.log(token);
