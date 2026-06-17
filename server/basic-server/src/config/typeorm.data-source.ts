import { DataSource } from 'typeorm';

import { appEntities } from './typeorm.config';

const databaseUrl = process.env.DATABASE_URL;
const parsedDatabaseUrl = databaseUrl ? new URL(databaseUrl) : null;

export default new DataSource({
  type: 'postgres',
  host: parsedDatabaseUrl?.hostname ?? process.env.DB_HOST ?? 'localhost',
  port: Number(parsedDatabaseUrl?.port || process.env.DB_PORT || 5432),
  username:
    parsedDatabaseUrl ?
      decodeURIComponent(parsedDatabaseUrl.username)
      : process.env.DB_USERNAME ?? 'postgres',
  password:
    parsedDatabaseUrl ?
      decodeURIComponent(parsedDatabaseUrl.password)
      : process.env.DB_PASSWORD ?? 'postgres',
  database:
    parsedDatabaseUrl?.pathname.replace(/^\//, '')
    ?? process.env.DB_DATABASE
    ?? 'inquiry_rag',
  entities: appEntities,
  migrations: ['dist/migrations/*.js'],
  synchronize: false,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});
