import knex from 'knex';
import { logger } from '../utils/logger';

const db = knex({
  client: 'pg',
  connection: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'fretagru',
  },
  pool: {
    min: 2,
    max: 10,
  },
  migrations: {
    directory: './src/database/migrations',
    tableName: 'knex_migrations',
  },
  seeds: {
    directory: './src/database/seeds',
  },
});

// Testar conexão
db.raw('SELECT 1')
  .then(() => {
    logger.info('✅ Conexão com PostgreSQL estabelecida');
  })
  .catch((error) => {
    logger.error('❌ Erro na conexão com PostgreSQL:', error);
  });

export default db;
