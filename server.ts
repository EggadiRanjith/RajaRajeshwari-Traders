import express from 'express';
import path from 'path';
import { tradersRouter } from './server/routes';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use('/api/traders', tradersRouter);

// Serve static frontend
const distPath = path.resolve(process.cwd(), 'dist');
app.use(express.static(distPath));

app.get('*', (_req, res) => {
  res.sendFile(path.resolve(distPath, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`RajaRajeshwari Traders server running on http://localhost:${PORT}`);
});
