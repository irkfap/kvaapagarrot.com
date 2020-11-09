import {FastifyRequest} from 'fastify';

export const getUserIp = function (
  request: FastifyRequest,
): string | undefined {
  let ip: string | undefined;

  ip = request.headers['cf-connecting-ip'] as string;

  if (!ip) {
    // "x-forwarded-for": "188.65.245.45, 169.254.1.1",
    const ips = request.headers['x-forwarded-for'] as string;
    if (ips) {
      ips.split(',').map((v) => v.trim());
      ip = ips.length ? ips[0] : '';
    }
  }

  if (!ip) {
    ip = request.headers['x-appengine-user-ip'] as string;
  }

  return ip;
};

export const getUserCountry = function (
  request: FastifyRequest,
): string | undefined {
  const country = request.headers['cf-ipcountry']
    ? (request.headers['cf-ipcountry'] as string)
    : (request.headers['x-appengine-country'] as string);
  return country ? country.toLowerCase() : undefined;
};
