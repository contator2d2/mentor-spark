/**
 * Configuração unificada do PostgreSQL.
 * Aceita DATABASE_URL (padrão EasyPanel/Heroku/Render) OU variáveis separadas DB_*.
 */
import { DataSourceOptions } from 'typeorm';

function parseSslMode(url?: string): boolean | { rejectUnauthorized: boolean } {
  if (!url) return false;
  try {
    const u = new URL(url);
    const ssl = u.searchParams.get('sslmode');
    if (ssl === 'disable' || ssl === null) return false;
    if (ssl === 'require' || ssl === 'verify-ca' || ssl === 'verify-full') {
      return { rejectUnauthorized: false };
    }
  } catch {}
  return false;
}

export function buildPgOptions(): Partial<DataSourceOptions> & { type: 'postgres' } {
  const databaseUrl = process.env.DATABASE_URL;

  if (databaseUrl) {
    return {
      type: 'postgres',
      url: databaseUrl,
      ssl: parseSslMode(databaseUrl),
    };
  }

  return {
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: +(process.env.DB_PORT || 5432),
    username: process.env.DB_USER || 'mentorflow',
    password: process.env.DB_PASSWORD || 'mentorflow',
    database: process.env.DB_NAME || 'mentorflow',
  };
}
