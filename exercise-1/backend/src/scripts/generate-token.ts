import HapiJwt from '@hapi/jwt';
import { loadConfig } from '../config/env';

const ONE_HOUR_IN_SECONDS = 3600;

/** Development helper. A real deployment would get tokens from an identity provider. */
const { jwt } = loadConfig();
const token = HapiJwt.token.generate(
  { aud: jwt.audience, iss: jwt.issuer, sub: 'dev-client' },
  { key: jwt.secret, algorithm: 'HS256' },
  { ttlSec: ONE_HOUR_IN_SECONDS },
);
console.log(token);
