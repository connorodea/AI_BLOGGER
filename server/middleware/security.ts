
import helmet from 'helmet';
import cors from 'cors';
import { rateLimit } from 'express-rate-limit';
import { Express } from 'express';

export const configureSecurityMiddleware = (app: Express) => {
  app.use(helmet());
  
  app.use(cors({
    origin: process.env.NODE_ENV === 'production' 
      ? process.env.CORS_ORIGIN 
      : true
  }));

  app.use(rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
  }));
};
