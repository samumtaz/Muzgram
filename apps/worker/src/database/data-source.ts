import 'reflect-metadata';

import { DataSource } from 'typeorm';

// Worker uses the direct (non-pooled) connection — it runs migrations and long-lived queries
export const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_DIRECT_URL ?? process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  entities: [__dirname + '/entities/*.entity{.ts,.js}'],
  migrations: [],
  synchronize: false,
  logging: process.env.NODE_ENV !== 'production',
  extra: {
    max: 5, // worker needs far fewer connections than the API
  },
});
