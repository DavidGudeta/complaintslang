const crypto = require('crypto');
const hashes = [
  '64052a8de056f870d9739dbf6358feb03629ba29',
  '9ad371a406f8787ccb696e03533758410f3dc4b1',
  'da39a3ee5e6b4b0d3255bfef95601890afd80709',
  'f773b11fcc6392cb70888a78fef8ba22967aa271',
  'e772b353087657575eb27c00a5d31339b588ce7d'
];
const candidates = ['password','12345','admin','123456','admin123','welcome','qwerty','abc123','letmein','111111','test','secret','pass123','password123','123456789','Password1','Aa123456','P@ssw0rd','1234','teamleader','director','officer'];
for (const h of hashes) {
  const found = candidates.find(c => crypto.createHash('sha1').update(c).digest('hex') === h);
  console.log(h, '=>', found || 'NOT_FOUND');
}
