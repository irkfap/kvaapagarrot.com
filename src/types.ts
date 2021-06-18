import {ValidationResult} from 'fastify';

interface Locals {
  isDev: boolean;
}

declare module 'fastify' {
  interface FastifyRequest {
    timerStart: bigint;
  }

  interface FastifyReply {
    // @ts-ignore FIXME: Remove ts-ignore after this change will be released https://github.com/fastify/point-of-view/pull/239
    locals?: Partial<Locals>;
  }

  interface FastifyInstance {
    isDev: boolean;
  }
}

export interface ErrorPayload {
  statusCode: number;
  message: string;
  error?: string;
  stack?: string;
  validation?: ValidationResult[];
}
