import fs from 'fs';
import path from 'path';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { env } from './config/env';
import { enforceComplianceConstraints } from './middleware/validate.middleware';
import { globalErrorHandler, notFoundHandler } from './middleware/error.middleware';
import authRouter from './modules/auth/auth.routes';
import facilitiesRouter from './modules/facilities/facilities.routes';
import membershipsRouter from './modules/memberships/memberships.routes';
import bookingsRouter from './modules/bookings/bookings.routes';
import paymentsRouter from './modules/payments/payments.routes';
import gateRouter from './modules/gate/gate.routes';
import adminRouter from './modules/admin/admin.routes';

const app = express();

const allowedOrigins = Array.from(
  new Set([
    env.ALLOWED_ORIGIN,
    'http://localhost:4000',
    'http://127.0.0.1:4000',
    'http://localhost:5173',
    'http://127.0.0.1:5173',
  ])
);

const frontendDistDir = fs.existsSync(path.resolve(__dirname, '..', 'frontend', 'dist'))
  ? path.resolve(__dirname, '..', 'frontend', 'dist')
  : path.resolve(process.cwd(), 'frontend', 'dist');
const frontendIndexPath = path.join(frontendDistDir, 'index.html');

// 1. On-Premise Hardened HTTP Security Headers
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  })
);

// 2. Intranet / Portal CORS with HTTP-Only Cookie Support
app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  })
);

// 3. Body & Cookie Parsers
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

// 4. Strict Proposal Compliance Guard:
//    Blocks any request payload or query containing mobile numbers, SMS/OTP, or Aadhaar/Govt ID numbers.
app.use(enforceComplianceConstraints);

// 5. Health Check Endpoint (On-Premise Linux Systemd / Nginx Probe)
app.get('/api/health', (_req, res) => {
  res.status(200).json({
    success: true,
    service: 'Kannur City Police Sports Facilities Management System',
    deploymentMode: 'ON_PREMISE_LINUX',
    timestamp: new Date().toISOString(),
  });
});

// 6. Step 1 API Routes: Authentication & Session Management
app.use('/api/auth', authRouter);

// 7. Step 2 & Step 3 API Routes: Facilities, Memberships, Bookings, Payments, Gate Verification & Officer Admin Controls
app.use('/api/facilities', facilitiesRouter);
app.use('/api/memberships', membershipsRouter);
app.use('/api/bookings', bookingsRouter);
app.use('/api/payments', paymentsRouter);
app.use('/api/gate', gateRouter);
app.use('/api/admin', adminRouter);

// 8. Unified Frontend Static Bundle & SPA Fallback (when frontend/dist exists)
if (fs.existsSync(frontendIndexPath)) {
  app.use(express.static(frontendDistDir));
  app.get('*', (req, res, next) => {
    if (req.path === '/api' || req.path.startsWith('/api/')) {
      return next();
    }
    res.sendFile(frontendIndexPath);
  });
}

// 9. 404 & Centralized Error Handling
app.use(notFoundHandler);
app.use(globalErrorHandler);

export default app;
