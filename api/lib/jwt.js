import { SignJWT, jwtVerify } from 'jose';

const ISSUER = 'tretramdot';
const AUDIENCE = 'admin';
const TTL = '8h';

function getSecret() {
  const secret = process.env.ADMIN_JWT_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error('ADMIN_JWT_SECRET must be set (min 16 chars)');
  }
  return new TextEncoder().encode(secret);
}

/**
 * @param {{ username: string }} payload
 */
export async function signAdminToken(payload) {
  return new SignJWT({ username: payload.username })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setExpirationTime(TTL)
    .sign(getSecret());
}

/**
 * @param {string} token
 */
export async function verifyAdminToken(token) {
  const { payload } = await jwtVerify(token, getSecret(), {
    issuer: ISSUER,
    audience: AUDIENCE,
  });
  const username = payload.username;
  if (typeof username !== 'string' || !username) {
    throw new Error('invalid payload');
  }
  return { username };
}
