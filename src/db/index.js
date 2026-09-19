const config = require('../config');

async function createRepository() {
  if (config.dbProvider === 'sqlserver') {
    const { createSqlServerRepository } = require('./sqlserver');
    return createSqlServerRepository(config.sql);
  }
  const { createSqliteRepository } = require('./sqlite');
  return createSqliteRepository(config.sqlitePath);
}

module.exports = { createRepository };
