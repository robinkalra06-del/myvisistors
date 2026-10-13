import { Request, Response, NextFunction } from 'express';

export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction): void => {
  console.error('Unhandled server error:', err);

  const status = err.statusCode || err.status || 500;
  const message = err.message || 'Internal Server Error';

  res.status(status).json({
    status: 'error',
    message,
    ...(process.env.NODE_ENV === 'development' ? { stack: err.stack } : {}),
  });
};

export const notFoundHandler = (req: Request, res: Response): void => {
  res.status(404).json({ message: `Cannot ${req.method} ${req.originalUrl}` });
};
