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

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Backend is running' });
});

app.get('/api/seed', async (req, res) => {
  try {
    const admin = await prisma.profile.upsert({
      where: { email: 'admin@noc.com' },
      update: {},
      create: {
        email: 'admin@noc.com',
        name: 'Admin User',
        role: 'admin'
      }
    });
    res.json({ success: true, message: 'Admin user created!', user: admin });
  } catch (error) {
    res.status(500).json({ error: 'Failed to seed admin user', details: error });
  }
});


// Helper to create basic CRUD routes for a model
const generateCrudRoutes = (modelName: string, prismaModel: any, idType: 'int' | 'string' = 'int') => {
  const route = `/api/${modelName}`;
  const parseId = (idStr: string) => idType === 'int' ? parseInt(idStr) : idStr;
  
  app.get(route, async (req, res) => {
    try {
      const data = await prismaModel.findMany();
      res.json(data);
    } catch (error) {
      console.error(`Error fetching ${modelName}:`, error);
      res.status(500).json({ error: `Failed to fetch ${modelName}` });
    }
  });

  app.get(`${route}/:id`, async (req, res) => {
    try {
      const data = await prismaModel.findUnique({
        where: { id: parseId(req.params.id) }
      });
      res.json(data);
    } catch (error) {
      console.error(`Error fetching ${modelName}:`, error);
      res.status(500).json({ error: `Failed to fetch ${modelName}` });
    }
  });

  app.post(route, async (req, res) => {
    try {
      const data = await prismaModel.create({ data: req.body });
      const userEmail = req.header('X-User-Email') || 'System';
      if (modelName !== 'global_audit_logs') {
        await prisma.globalAuditLog.create({
          data: {
            user_email: userEmail,
            record_type: modelName,
            record_id: String(data.id),
            record_name: String(data.site_code || data.name || data.site_code_dc || data.id),
            action: 'INSERT',
            new_value: JSON.stringify(data).substring(0, 500)
          }
        });
      }
      res.json(data);
    } catch (error) {
      console.error(`Error creating ${modelName}:`, error);
      res.status(500).json({ error: `Failed to create ${modelName}` });
    }
  });

  app.put(`${route}/:id`, async (req, res) => {
    try {
      const id = parseId(req.params.id);
      const oldData = await prismaModel.findUnique({ where: { id } });
      const data = await prismaModel.update({
        where: { id },
        data: req.body
      });
      
      const userEmail = req.header('X-User-Email') || 'System';
      if (modelName !== 'global_audit_logs' && oldData) {
        for (const key in req.body) {
           if (oldData[key] !== req.body[key] && key !== 'id') {
             await prisma.globalAuditLog.create({
               data: {
                 user_email: userEmail,
                 record_type: modelName,
                 record_id: String(id),
                 record_name: String(data.site_code || data.name || data.site_code_dc || id),
                 action: 'UPDATE',
                 field_name: key,
                 old_value: String(oldData[key]).substring(0, 500),
                 new_value: String(req.body[key]).substring(0, 500)
               }
             }).catch(console.error); // don't fail the request if audit fails
           }
        }
      }
      res.json(data);
    } catch (error) {
      console.error(`Error updating ${modelName}:`, error);
      res.status(500).json({ error: `Failed to update ${modelName}` });
    }
  });

  app.delete(`${route}/:id`, async (req, res) => {
    try {
      const id = parseId(req.params.id);
      const oldData = await prismaModel.findUnique({ where: { id } });
      await prismaModel.delete({
        where: { id }
      });
      
      const userEmail = req.header('X-User-Email') || 'System';
      if (modelName !== 'global_audit_logs' && oldData) {
        await prisma.globalAuditLog.create({
          data: {
            user_email: userEmail,
            record_type: modelName,
            record_id: String(id),
            record_name: String(oldData.site_code || oldData.name || oldData.site_code_dc || id),
            action: 'DELETE',
            old_value: JSON.stringify(oldData).substring(0, 500)
          }
        });
      }
      res.json({ success: true });
    } catch (error) {
      console.error(`Error deleting ${modelName}:`, error);
      res.status(500).json({ error: `Failed to delete ${modelName}` });
    }
  });
};

// Generate CRUD routes for all tables
generateCrudRoutes('sites', prisma.site);
generateCrudRoutes('site_locations', prisma.siteLocation);
generateCrudRoutes('slatracking', prisma.slaTracking);
generateCrudRoutes('incidents', prisma.incident);
generateCrudRoutes('fiber_cuts', prisma.fiberCut);
generateCrudRoutes('global_audit_logs', prisma.globalAuditLog);
generateCrudRoutes('tickets', prisma.ticket);
generateCrudRoutes('profiles', prisma.profile, 'string');

// Lookup tables
generateCrudRoutes('cities', prisma.city);
generateCrudRoutes('users', prisma.user);
generateCrudRoutes('power_sources', prisma.powerSource);
generateCrudRoutes('sla_technical_areas', prisma.slaTechnicalArea);
generateCrudRoutes('sla_reasons', prisma.slaReason);
generateCrudRoutes('sla_departments', prisma.slaDepartment);
generateCrudRoutes('fiber_cut_reasons', prisma.fiberCutReason);
generateCrudRoutes('fiber_cut_locations', prisma.fiberCutLocation);

app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
