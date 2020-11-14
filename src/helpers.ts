import {FastifyRequest} from 'fastify';

export const getUserIp = function (
  request: FastifyRequest,
): string | undefined {
  const ip = request.headers['cf-connecting-ip'] as string;
  if (ip) return ip;

  // "x-forwarded-for": "188.65.245.45, 169.254.1.1",
  const ips = request.headers['x-forwarded-for'] as string;
  if (ips) {
    return ips.split(',').map((v) => v.trim())[0];
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
