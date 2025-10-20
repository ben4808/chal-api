const fs = require('fs');
const { execSync } = require('child_process');

// Generate self-signed certificate using Node.js crypto
const crypto = require('crypto');

// Generate a private key
const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 4096,
  publicKeyEncoding: {
    type: 'spki',
    format: 'pem'
  },
  privateKeyEncoding: {
    type: 'pkcs8',
    format: 'pem'
  }
});

// Create a self-signed certificate
const cert = crypto.createCertificate({
  key: privateKey,
  subject: {
    C: 'US',
    ST: 'State',
    L: 'City',
    O: 'Organization',
    CN: 'localhost'
  },
  issuer: {
    C: 'US',
    ST: 'State',
    L: 'City',
    O: 'Organization',
    CN: 'localhost'
  },
  serialNumber: '01',
  notBefore: new Date(),
  notAfter: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
  publicKey: publicKey
});

// Write the files
fs.writeFileSync('server.key', privateKey);
fs.writeFileSync('server.crt', cert.toString());

console.log('SSL certificates generated successfully!');
console.log('server.key - Private key');
console.log('server.crt - Certificate');

