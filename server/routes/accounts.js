const express = require('express');
const { createHash, randomBytes } = require('node:crypto');
const { validPassword, hashPassword, verifyPassword } = require('../accounts/passwords');

const SESSION_MS = 12 * 60 * 60 * 1000;
const COOKIE = 'laam_session';
const RIDER_ROLES = ['Pickup Rider', 'Delivery Rider'];

function accountType(account) {
  if (account?.customer_id) return 'customer';
  if (RIDER_ROLES.includes(account?.role)) return 'rider';
  return null;
}

function validateIdentity({ username, email }) {
  return typeof username === 'string' && /^[A-Za-z0-9_.-]{3,40}$/.test(username) && typeof email === 'string' &&
    email.length <= 255 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function tokenHash(token) {
  return createHash('sha256').update(token).digest('hex');
}

function newSession() {
  const token = randomBytes(32).toString('base64url');
  return { token, hash: tokenHash(token), expiresAt: new Date(Date.now() + SESSION_MS) };
}

function createAccountRouter(accounts) {
  const router = express.Router();
  const cookie = req => ({ httpOnly: true, sameSite: 'lax', secure: req.secure ||
    process.env.NODE_ENV === 'production', path: '/' });
  const sessionHash = req => {
    const token = /(?:^|;\s*)laam_session=([A-Za-z0-9_-]{43})(?:;|$)/.exec(req.get('Cookie') || '')?.[1];
    return token && tokenHash(token);
  };
  const sessionAccount = async req => {
    const hash = sessionHash(req);
    return hash ? accounts.findSession(hash) : null;
  };
  const setSession = (req, res, session) => res.cookie(COOKIE, session.token,
    { ...cookie(req), expires: session.expiresAt });
  const route = handler => (req, res, next) => handler(req, res).catch(next);
  const rejectLogin = res => res.status(401).json({ error: 'Incorrect username, email, or password.' });
  const requireLogin = res => res.status(401).json({ error: 'Sign in to continue.' });
  const summary = account => ({
    username: account.username, email: account.email, type: accountType(account), role: account.role
  });

  const requests = new Map();
  function checkWrite(req, res, next) {
    const origin = req.get('Origin');
    const host = req.get('Host');
    if ((origin && origin !== `https://${host}` && origin !== `http://${host}`) ||
        !req.is('application/json')) {
      return res.status(403).json({ error: 'Request origin or content type is not allowed.' });
    }
    if (req.path === '/auth/logout') return next();
    const now = Date.now();
    for (const [key, bucket] of requests) {
      if (bucket.until <= now) requests.delete(key);
    }
    const key = `${req.ip}:${req.path}`;
    const bucket = requests.get(key) || { count: 0, until: now + 60_000 };
    if (bucket.count >= 10 || (!requests.has(key) && requests.size >= 10_000)) {
      return res.status(429).json({ error: 'Too many attempts. Try again in a minute.' });
    }
    bucket.count++;
    requests.set(key, bucket);
    next();
  }

  router.use('/auth', (req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
  });
  router.post('/auth/register', checkWrite, route(async (req, res) => {
    const { username, email, phone, password } = req.body || {};
    if (!validateIdentity({ username, email }) || typeof phone !== 'string' ||
        !/^\+?[0-9 ()-]{7,20}$/.test(phone) || phone.replace(/\D/g, '').length < 7 ||
        !validPassword(password)) {
      return res.status(400).json({ error: 'Check your username, email, phone number and password.' });
    }
    try {
      await accounts.register({ username, email: email.toLowerCase(), phone, passwordHash: await hashPassword(password) });
      res.status(201).json({ created: true });
    } catch (error) {
      if (error.code !== '23505') throw error;
      res.status(409).json({ error: 'This username or email is already in use.' });
    }
  }));

  router.post('/auth/login', checkWrite, route(async (req, res) => {
    const { identifier, password } = req.body || {};
    if (typeof identifier !== 'string' || identifier.length > 255 || !validPassword(password)) return rejectLogin(res);
    const account = await accounts.findAccount(identifier.trim().toLowerCase());
    const verified = await verifyPassword(password, account?.password_hash);
    if (!verified || !accountType(account)) return rejectLogin(res);
    const session = newSession();
    if (!await accounts.createSession(account, session.hash, session.expiresAt)) return rejectLogin(res);
    const previous = sessionHash(req);
    if (previous) await accounts.deleteSession(previous);
    setSession(req, res, session);
    res.json({ account: summary(account) });
  }));

  router.get('/auth/me', route(async (req, res) => {
    const account = await sessionAccount(req);
    res.json({ account: accountType(account) ? summary(account) : null });
  }));

  router.post('/auth/logout', checkWrite, route(async (req, res) => {
    const hash = sessionHash(req);
    if (hash) await accounts.deleteSession(hash);
    res.clearCookie(COOKIE, cookie(req)).json({ signedOut: true });
  }));

  router.post('/auth/password', checkWrite, route(async (req, res) => {
    const account = await sessionAccount(req);
    if (!accountType(account)) return requireLogin(res);
    const { currentPassword, password } = req.body || {};
    if (!validPassword(currentPassword) || !validPassword(password) || currentPassword === password) {
      return res.status(400).json({ error: 'Choose a different password with 8–128 characters.' });
    }
    if (!await verifyPassword(currentPassword, account.password_hash)) {
      return res.status(400).json({ error: 'The current password is incorrect.' });
    }
    const session = newSession();
    const updated = await accounts.changePassword(account, await hashPassword(password), session.hash, session.expiresAt);
    if (!updated) return requireLogin(res);
    setSession(req, res, session);
    res.json({ changed: true });
  }));

  router.get('/parcels/me', route(async (req, res) => {
    res.set('Cache-Control', 'no-store');
    const account = await sessionAccount(req);
    if (!accountType(account)) return requireLogin(res);
    if (accountType(account) !== 'customer') return res.status(403).json({ error: 'Customer access required.' });
    res.json({ parcels: await accounts.findParcels(account.customer_id) });
  }));

  return { router, sessionAccount };
}

module.exports = { createAccountRouter, validateIdentity, RIDER_ROLES };
