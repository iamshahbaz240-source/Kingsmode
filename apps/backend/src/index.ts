import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { setupDatabase } from './config/database';
import authRoutes from './routes/auth.routes';
import sessionRoutes from './routes/sessions.routes';
import taskRoutes from './routes/tasks.routes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // needed for Apple's form_post callback

app.use('/api/auth', authRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/tasks', taskRoutes);

app.get('/health', (_, res) => {
  res.json({ status: 'ok', message: '🚀 Kingsmode API is running!' });
});

const start = async () => {
  await setupDatabase();
  app.listen(PORT, () => {
    console.log(`🚀 Kingsmode backend running on http://localhost:${PORT}`);
    console.log(`📡 Health check: http://localhost:${PORT}/health`);
  });
};

start().catch(console.error);
