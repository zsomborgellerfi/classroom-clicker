import { Request, Response, NextFunction } from 'express';

class ErrorService {
  static handleError(error: Error, req: Request, res: Response, next: NextFunction) {
    console.error(error);

    if (error.name === 'ValidationError') {
      return res.status(400).json({
        error: error.message
      });
    }

    if (error.name === 'UnauthorizedError') {
      return res.status(401).json({
        error: 'Invalid token'
      });
    }

    return res.status(500).json({
      error: 'Internal server error'
    });
  }
}

export default ErrorService; 