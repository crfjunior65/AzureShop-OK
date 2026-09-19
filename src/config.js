const path = require('node:path');
require('dotenv').config();

const root = path.resolve(__dirname, '..');
const dbProvider = process.env.DB_PROVIDER || 'sqlite';
const sql = {
  server: process.env.AZURE_SQL_SERVER,
  database: process.env.AZURE_SQL_DATABASE,
  user: process.env.AZURE_SQL_USER,
  password: process.env.AZURE_SQL_PASSWORD,
  auth: process.env.AZURE_SQL_AUTH || 'sql'
};

if (dbProvider === 'sqlserver') {
  const required = ['server', 'database'];
  if (sql.auth !== 'managedIdentity') required.push('user', 'password');
  const missing = required.filter((key) => !sql[key]);
  if (missing.length) {
    throw new Error(`Configuração SQL incompleta: ${missing.map((key) => `AZURE_SQL_${key.toUpperCase()}`).join(', ')}`);
  }
}

module.exports = {
  port: Number(process.env.PORT || 3000),
  environment: process.env.APP_ENV || 'development',
  dbProvider,
  sqlitePath: path.resolve(root, process.env.SQLITE_PATH || './data/loja.db'),
  sql,
  aiEnabled: process.env.AI_ENABLED === 'true',
  ai: {
    endpoint: process.env.AZURE_OPENAI_ENDPOINT,
    apiKey: process.env.AZURE_OPENAI_API_KEY,
    deployment: process.env.AZURE_OPENAI_DEPLOYMENT,
    apiVersion: process.env.AZURE_OPENAI_API_VERSION || '2024-10-21'
  }
};
