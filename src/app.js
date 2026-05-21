import cookieParser from 'cookie-parser';
import express from 'express';
import morgan from 'morgan';
import { applySecurity } from './middleware/security.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';
import authRoutes from './routes/authRoutes.js';
import labRoutes from './routes/labRoutes.js';
import submissionRoutes from './routes/submissionRoutes.js';
import publicRoutes from './routes/publicRoutes.js';
import adminRoutes from './routes/adminRoutes.js';

const app = express();

applySecurity(app);

app.use(express.json({ limit: '20kb' }));
app.use(express.urlencoded({ extended: true, limit: '20kb' }));
app.use(cookieParser());

if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'github-leaderboard-api' });
});

app.use('/api/auth', authRoutes);
app.use('/api/labs', labRoutes);
app.use('/api/submissions', submissionRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api', publicRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;
