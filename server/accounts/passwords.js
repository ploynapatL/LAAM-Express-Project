const { randomBytes, scrypt, timingSafeEqual } = require('node:crypto');
const { promisify } = require('node:util');

const derive = promisify(scrypt);
const options = { N: 32768, r: 8, p: 3, maxmem: 64 * 1024 * 1024 };
const dummyHash = '0'.repeat(32) + ':' + '0'.repeat(128);

function validPassword(value) {
  return typeof value === 'string' && value.length >= 8 && value.length <= 128;
}

async function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  return salt + ':' + (await derive(password, salt, 64, options)).toString('hex');
}

async function verifyPassword(password, stored = dummyHash) {
  const [salt, digest] = stored.split(':');
  const expected = Buffer.from(digest, 'hex');
  return timingSafeEqual(await derive(password, salt, expected.length, options), expected);
}

module.exports = { validPassword, hashPassword, verifyPassword };
