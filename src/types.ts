import {ValidationResult} from "fastify-error";

export const symbolTimerStart = Symbol('timerStart');

declare module 'fastify' {
  interface FastifyRequest {
    [symbolTimerStart]: bigint;
  }
}

export interface ErrorPayload {
  statusCode: number,
  message: string,
  error?: string,
  stack?: string,
  validation?: ValidationResult[],
}
