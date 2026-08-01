import { NextFunction, Request, RequestHandler, Response } from "express";

/**
 * Wraps an async route handler so unhandled rejections are forwarded to
 * Express error middleware via next(error). Required in Express 4, which
 * does not automatically catch async errors.
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>
): RequestHandler {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
}
