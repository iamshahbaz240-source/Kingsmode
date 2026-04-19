import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool } from '../config/database';

const generateTokens = (userId: string) => {
  const token = jwt.sign({ userId }, process.env.JWT_SECRET!, { expiresIn: '7d' });
  const refreshToken = jwt.sign({ userId }, process.env.JWT_REFRESH_SECRET!, { expiresIn: '30d' });
  return { token, refreshToken };
};

// ── Find or create an OAuth user, return JWT ────────────────
const findOrCreateOAuthUser = async (
  provider: string,
  providerId: string,
  email: string,
  name: string,
): Promise<{ token: string; user: any }> => {
  // 1. Look up by provider + provider_id
  let user = (await pool.query(
    'SELECT id, name, email, xp, level, streak FROM users WHERE provider = $1 AND provider_id = $2',
    [provider, providerId],
  )).rows[0];

  if (!user) {
    // 2. Email match → link OAuth to existing account
    const existing = (await pool.query(
      'SELECT id, name, email, xp, level, streak FROM users WHERE email = $1',
      [email],
    )).rows[0];

    if (existing) {
      await pool.query(
        'UPDATE users SET provider = $1, provider_id = $2, updated_at = NOW() WHERE id = $3',
        [provider, providerId, existing.id],
      );
      user = existing;
    } else {
      // 3. Brand-new user (no password)
      user = (await pool.query(
        `INSERT INTO users (name, email, provider, provider_id)
         VALUES ($1, $2, $3, $4)
         RETURNING id, name, email, xp, level, streak`,
        [name || email.split('@')[0], email, provider, providerId],
      )).rows[0];
    }
  }

  const { token } = generateTokens(user.id);
  return { token, user };
};

// ── Google OAuth ────────────────────────────────────────────
export const googleAuth = (_req: Request, res: Response) => {
  if (!process.env.GOOGLE_CLIENT_ID) {
    return res.status(503).json({ error: 'Google OAuth not configured' });
  }
  const params = new URLSearchParams({
    client_id:     process.env.GOOGLE_CLIENT_ID!,
    redirect_uri:  process.env.GOOGLE_CALLBACK_URL!,
    response_type: 'code',
    scope:         'openid email profile',
    access_type:   'offline',
    prompt:        'select_account',
  });
  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
};

export const googleCallback = async (req: Request, res: Response) => {
  const frontendUrl = process.env.CLIENT_URL || 'http://localhost:3000';
  const { code, error } = req.query as Record<string, string>;

  if (error || !code) {
    return res.redirect(`${frontendUrl}/auth/callback?error=access_denied`);
  }

  try {
    // Exchange code for access token
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id:     process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        redirect_uri:  process.env.GOOGLE_CALLBACK_URL!,
        grant_type:    'authorization_code',
      }),
    });
    const tokenData = await tokenRes.json() as any;
    if (!tokenData.access_token) throw new Error('No access token from Google');

    // Fetch Google profile
    const profileRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const { sub, email, name } = await profileRes.json() as any;

    const { token, user } = await findOrCreateOAuthUser('google', sub, email, name);
    res.redirect(`${frontendUrl}/auth/callback?token=${token}&name=${encodeURIComponent(user.name)}`);
  } catch (err) {
    console.error('Google OAuth error:', err);
    res.redirect(`${frontendUrl}/auth/callback?error=oauth_failed`);
  }
};

// ── Apple Sign In ───────────────────────────────────────────
export const appleAuth = (_req: Request, res: Response) => {
  if (!process.env.APPLE_SERVICE_ID) {
    return res.status(503).json({ error: 'Apple Sign In not configured' });
  }
  const params = new URLSearchParams({
    client_id:     process.env.APPLE_SERVICE_ID!,
    redirect_uri:  process.env.APPLE_CALLBACK_URL!,
    response_type: 'code id_token',
    response_mode: 'form_post',
    scope:         'name email',
  });
  res.redirect(`https://appleid.apple.com/auth/authorize?${params}`);
};

const makeAppleClientSecret = () => {
  const privateKey = (process.env.APPLE_PRIVATE_KEY || '').replace(/\\n/g, '\n');
  return jwt.sign({}, privateKey, {
    algorithm:  'ES256',
    expiresIn:  '180d',
    audience:   'https://appleid.apple.com',
    issuer:     process.env.APPLE_TEAM_ID!,
    subject:    process.env.APPLE_SERVICE_ID!,
    keyid:      process.env.APPLE_KEY_ID!,
  } as any);
};

export const appleCallback = async (req: Request, res: Response) => {
  const frontendUrl = process.env.CLIENT_URL || 'http://localhost:3000';
  const { code, user: userJson, error } = req.body;

  if (error || !code) {
    return res.redirect(`${frontendUrl}/auth/callback?error=access_denied`);
  }

  try {
    const clientSecret = makeAppleClientSecret();

    // Exchange code for tokens
    const tokenRes = await fetch('https://appleid.apple.com/auth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id:     process.env.APPLE_SERVICE_ID!,
        client_secret: clientSecret,
        code,
        grant_type:    'authorization_code',
        redirect_uri:  process.env.APPLE_CALLBACK_URL!,
      }),
    });
    const tokenData = await tokenRes.json() as any;
    if (!tokenData.id_token) throw new Error('No id_token from Apple');

    // Decode id_token (sub = Apple user ID)
    const decoded = jwt.decode(tokenData.id_token) as any;
    const appleId  = decoded?.sub;
    const email    = decoded?.email || '';

    // Apple only sends name on first login
    let name = email.split('@')[0];
    if (userJson) {
      try {
        const u = JSON.parse(userJson);
        const fn = u?.name?.firstName || '';
        const ln = u?.name?.lastName  || '';
        if (fn || ln) name = `${fn} ${ln}`.trim();
      } catch { /**/ }
    }

    const { token, user } = await findOrCreateOAuthUser('apple', appleId, email, name);
    res.redirect(`${frontendUrl}/auth/callback?token=${token}&name=${encodeURIComponent(user.name)}`);
  } catch (err) {
    console.error('Apple OAuth error:', err);
    res.redirect(`${frontendUrl}/auth/callback?error=oauth_failed`);
  }
};

export const register = async (req: Request, res: Response) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, error: 'All fields are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ success: false, error: 'Password must be at least 6 characters' });
    }

    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ success: false, error: 'Email already registered' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const result = await pool.query(
      'INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id, name, email, xp, level, streak, created_at',
      [name, email, passwordHash]
    );

    const user = result.rows[0];
    const { token, refreshToken } = generateTokens(user.id);

    res.status(201).json({ success: true, data: { user, token, refreshToken } });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email and password are required' });
    }

    const result = await pool.query(
      'SELECT id, name, email, password_hash, xp, level, streak, created_at FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ success: false, error: 'Invalid email or password' });
    }

    const user = result.rows[0];
    const validPassword = await bcrypt.compare(password, user.password_hash);

    if (!validPassword) {
      return res.status(401).json({ success: false, error: 'Invalid email or password' });
    }

    const { password_hash, ...userWithoutPassword } = user;
    const { token, refreshToken } = generateTokens(user.id);

    res.json({ success: true, data: { user: userWithoutPassword, token, refreshToken } });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

export const updateProfile = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { name, email } = req.body;
    if (!name?.trim() && !email?.trim()) return res.status(400).json({ error: 'Nothing to update' });

    if (email?.trim()) {
      const existing = await pool.query('SELECT id FROM users WHERE email = $1 AND id != $2', [email.trim(), userId]);
      if (existing.rows.length > 0) return res.status(400).json({ error: 'Email already in use' });
    }

    const result = await pool.query(
      `UPDATE users
       SET name       = COALESCE($1, name),
           email      = COALESCE($2, email),
           updated_at = NOW()
       WHERE id = $3
       RETURNING id, name, email, xp, level, streak`,
      [name?.trim() || null, email?.trim() || null, userId]
    );
    res.json({ user: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

export const changePassword = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) return res.status(400).json({ error: 'Both passwords required' });
    if (newPassword.length < 6) return res.status(400).json({ error: 'New password must be at least 6 characters' });

    const result = await pool.query('SELECT password_hash FROM users WHERE id = $1', [userId]);
    const valid  = await bcrypt.compare(currentPassword, result.rows[0].password_hash);
    if (!valid) return res.status(400).json({ error: 'Current password is incorrect' });

    const hash = await bcrypt.hash(newPassword, 12);
    await pool.query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [hash, userId]);
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
};

export const deleteAccount = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { password } = req.body;
    if (!password) return res.status(400).json({ error: 'Password required' });

    const result = await pool.query('SELECT password_hash FROM users WHERE id = $1', [userId]);
    const valid  = await bcrypt.compare(password, result.rows[0].password_hash);
    if (!valid) return res.status(400).json({ error: 'Incorrect password' });

    await pool.query('DELETE FROM users WHERE id = $1', [userId]);
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
};

export const getMe = async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      'SELECT id, name, email, xp, level, streak, created_at FROM users WHERE id = $1',
      [(req as any).userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    res.json({ success: true, data: { user: result.rows[0] } });
  } catch (error) {
    console.error('GetMe error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};
