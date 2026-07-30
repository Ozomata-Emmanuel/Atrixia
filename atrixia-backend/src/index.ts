import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import swaggerUi from 'swagger-ui-express';
import authRoutes from './routes/authRoutes';
import searchRoutes from './routes/searchRoutes';
import userRoutes from './routes/userRoutes';
import { errorHandler } from './middleware/errorHandler';
import { swaggerDocument } from './swagger';
import { db } from './db';

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

// Middleware Stack
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());

// Swagger UI — available at /api/docs
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument, {
  customSiteTitle: 'Atrixia API Docs',
}));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/user', userRoutes);

// Health check
app.get('/api/health', async (req, res) => {
  await db.execute('SELECT 1');
  res.status(200).json({ status: 'ok' });
});

app.use(errorHandler);

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);

  // Warm up the eBay OAuth token so the first user search doesn't pay
  // the ~1s token round-trip cost. Fire-and-forget — never blocks startup.
  import('./lib/ai/adapters/ebay').then(({ EbayAdapter }) => {
    const adapter = new EbayAdapter();
    adapter.warmupToken().then(() => {
      console.log('[Startup] eBay OAuth token pre-warmed.');
    }).catch(() => {/* silently ignored */});
  }).catch(() => {/* silently ignored */});
});
