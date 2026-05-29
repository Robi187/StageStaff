require('dotenv').config();

const REQUIRED_ENV = ['JWT_SECRET', 'DATABASE_URL', 'FRONTEND_URL'];
const missing = REQUIRED_ENV.filter(k => !process.env[k]);
if (missing.length) {
  console.error('Missing required env vars:', missing.join(', '));
  process.exit(1);
}

const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const authRoutes       = require('./routes/auth');
const shiftRoutes      = require('./routes/shifts');
const occurrenceRoutes = require('./routes/occurrences');
const responseRoutes   = require('./routes/responses');
const dashboardRoutes  = require('./routes/dashboard');
const userRoutes       = require('./routes/users');

const app = express();

app.set('trust proxy', 1);
app.disable('x-powered-by');

app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true
}));

app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  next();
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Zu viele Anfragen. Bitte warte kurz.' }
});

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Zu viele Anfragen.' }
});

app.use('/api/auth', authLimiter);
app.use('/api', apiLimiter);

app.use(express.json());

app.use('/api/auth',        authRoutes);
app.use('/api/shifts',      shiftRoutes);
app.use('/api/occurrences', occurrenceRoutes);
app.use('/api/responses',   responseRoutes);
app.use('/api/dashboard',   dashboardRoutes);
app.use('/api/users',       userRoutes);

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({ error: 'Interner Fehler' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Stage Bar Backend running on http://localhost:${PORT}`);
});
