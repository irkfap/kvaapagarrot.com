import {ValidationResult} from 'fastify';

export const symbolTimerStart = Symbol.for('timerStart');

interface Locals {
  isDev: boolean;
}

declare module 'fastify' {
  interface FastifyRequest {
    [symbolTimerStart]: bigint;
  }

  interface FastifyReply {
    // @ts-ignore FIXME: Remove ts-ignore after this change will be released https://github.com/fastify/point-of-view/pull/239
    locals?: Partial<Locals>;
  }

  export const isDev: boolean;
}

export interface ErrorPayload {
  statusCode: number;
  message: string;
  error?: string;
  stack?: string;
  validation?: ValidationResult[];
}
