import { config } from './environment';

export const authConfig = {
  jwt: {
    secret: config.jwt.secret,
    expiresIn: config.jwt.expiresIn,
    refreshExpiresIn: config.jwt.refreshExpiresIn || '7d',
    issuer: 'cycling-crm-api',
    audience: 'cycling-crm-users',
  },
  bcrypt: {
    saltRounds: 12,
  },
  session: {
    maxAge: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
  },
  passwordReset: {
    tokenExpiresIn: 60 * 60 * 1000, // 1 hour in milliseconds
  },
  emailVerification: {
    tokenExpiresIn: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
  },
};