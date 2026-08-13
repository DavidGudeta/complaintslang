import fetch from 'node-fetch';
const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwiZW1haWwiOiJkYXdpdGdAZ21haWwuY29tIiwicm9sZSI6IkFETUlOIiwiaWF0IjoxNzc5MDkyMTczLCJleHAiOjE3NzkxNzg1NzN9.Dg8XU3bnUjgQODPOKetiokzHNjjJ5q1uJYwXycvQpPY';
const res = await fetch('http://localhost:3000/api/admin/tax-centers', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
  body: JSON.stringify({ name: 'TEST TAX CENTER FIX', location: 'Nowhere' })
});
const data = await res.text();
console.log(res.status, data);
