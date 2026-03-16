import express from 'express';
import cors from 'cors';
import db from './database/db';

import fornecedoresRoutes from './routes/fornecedores';
import veiculosRoutes from './routes/veiculos';
import locaisRoutes from './routes/locais';
import produtosRoutes from './routes/produtos';
import precosRoutes from './routes/precos';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

app.use('/api/fornecedores', fornecedoresRoutes);
app.use('/api/veiculos', veiculosRoutes);
app.use('/api/locais', locaisRoutes);
app.use('/api/produtos', produtosRoutes);
app.use('/api/precos', precosRoutes);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'OK', service: 'FretAgru', timestamp: new Date().toISOString() });
});

async function start() {
  await db.ready();
  app.listen(PORT, () => {
    console.log(`\n🚜 FretAgru Backend rodando em http://localhost:${PORT}`);
    console.log(`📋 API disponivel em http://localhost:${PORT}/api\n`);
  });
}

start().catch(console.error);
