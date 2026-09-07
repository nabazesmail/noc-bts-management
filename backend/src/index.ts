import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

dotenv.config();

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// Basic health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Backend is running' });
});

// Sites API Example
app.get('/api/sites', async (req, res) => {
  try {
    const sites = await prisma.site.findMany({
      include: {
        Incidents: true
      }
    });
    res.json(sites);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch sites' });
  }
});

app.post('/api/sites', async (req, res) => {
  try {
    const newSite = await prisma.site.create({
      data: req.body
    });
    res.json(newSite);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create site' });
  }
});

// Catch-all errors
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
