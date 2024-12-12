import express from "express";
import { type Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from 'express-rate-limit';
import { registerRoutes } from "./routes";
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Initialize express app
const app = express();

// Basic middleware setup
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false }));
app.use(cors({
  origin: process.env.NODE_ENV === 'production' ? process.env.CORS_ORIGIN : '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(helmet());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});

app.use('/api/', limiter);

// Request logging middleware with error handling
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    console.log(
      `[${new Date().toISOString()}] ${req.method} ${req.url} ${res.statusCode} - ${duration}ms`
    );
  });
  next();
});

// Error handling for JSON parsing
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof SyntaxError && 'status' in err && err.status === 400) {
    return res.status(400).json({ 
      success: false, 
      error: 'Invalid JSON'
    });
  }
  next(err);
});

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({ 
    status: 'healthy',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Register API routes
const server = registerRoutes(app);

// Global error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Server error:', err);
  res.status(500).json({
    error: process.env.NODE_ENV === 'production' 
      ? 'Internal server error'
      : err.message
  });
});

// Start server
const PORT = Number(process.env.PORT) || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;
