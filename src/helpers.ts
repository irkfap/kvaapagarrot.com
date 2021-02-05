import {FastifyRequest} from 'fastify';

export const getUserIp = function (
  request: FastifyRequest,
): string | undefined {
  const ip = request.headers['cf-connecting-ip'] as string;
  if (ip) return ip;

  // "x-forwarded-for": "188.65.245.45, 169.254.1.1",
  const ips = request.headers['x-forwarded-for'] as string;
  if (ips) {
    return ips.split(',')[0].trim();
  }

  return (
    (request.headers['x-appengine-user-ip'] as string) ||
    request.connection.remoteAddress
  );
};

export const getUserCountry = function (
  request: FastifyRequest,
): string | undefined {
  const country = request.headers['cf-ipcountry']
    ? (request.headers['cf-ipcountry'] as string)
    : (request.headers['x-appengine-country'] as string);
  return country ? country.toLowerCase() : undefined;
};

// https://www.cloudflare.com/ips-v4
// https://www.cloudflare.com/ips-v6
const CLOUDFLARE_IP_RANGES = `
173.245.48.0/20
103.21.244.0/22
103.22.200.0/22
103.31.4.0/22
141.101.64.0/18
108.162.192.0/18
190.93.240.0/20
188.114.96.0/20
197.234.240.0/22
198.41.128.0/17
162.158.0.0/15
104.16.0.0/12
172.64.0.0/13
131.0.72.0/22
2400:cb00::/32
2606:4700::/32
2803:f800::/32
2405:b500::/32
2405:8100::/32
2a06:98c0::/29
2c0f:f248::/32
`;

export const trustedProxies = [
  '127.0.0.1',
  '::1',
  '169.254.0.0/16',
  ...CLOUDFLARE_IP_RANGES.split('\n').filter(Boolean),
];
