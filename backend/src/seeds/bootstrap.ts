/**
 * Bootstrap de inicialização do container:
 * 1. Aguarda Postgres aceitar conexão
 * 2. Sincroniza schema (cria tabelas a partir das entities) OU roda migrations se existirem
 * 3. Cria/atualiza super admin a partir das envs SUPER_ADMIN_EMAIL / SUPER_ADMIN_PASSWORD
 *
 * Idempotente: pode rodar a cada boot sem efeitos colaterais.
 */
import 'reflect-metadata';
import * as dotenv from 'dotenv';
import * as bcrypt from 'bcryptjs';
import { DataSource, DataSourceOptions } from 'typeorm';
import { buildPgOptions } from '../db.config';
import { User, UserRole, UserStatus } from '../entities/user.entity';

dotenv.config();

async function waitForDb(opts: DataSourceOptions, maxTries = 30, delayMs = 2000) {
  for (let i = 1; i <= maxTries; i++) {
    const probe = new DataSource(opts);
    try {
      await probe.initialize();
      await probe.destroy();
      console.log(`[bootstrap] Postgres pronto (tentativa ${i})`);
      return;
    } catch (e: any) {
      console.log(`[bootstrap] Postgres indisponível (${i}/${maxTries}): ${e.code || e.message}`);
      try { await probe.destroy(); } catch {}
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  throw new Error('[bootstrap] Postgres não respondeu a tempo');
}

async function run() {
  const baseOpts = {
    ...(buildPgOptions() as DataSourceOptions),
    entities: [__dirname + '/../entities/*.entity{.ts,.js}'],
    migrations: [__dirname + '/../migrations/*{.ts,.js}'],
    logging: process.env.DB_LOGGING === 'true',
  } as DataSourceOptions;

  await waitForDb(baseOpts);

  // Sincroniza schema (cria tabelas se não existirem). Se você preferir migrations,
  // setar DB_SYNCHRONIZE=false e adicionar migrations em src/migrations/*
  const useSync = process.env.DB_SYNCHRONIZE !== 'false';
  const ds = new DataSource({ ...baseOpts, synchronize: useSync });
  await ds.initialize();
  console.log(`[bootstrap] DataSource inicializado (synchronize=${useSync})`);

  // Roda migrations se existirem (não falha se não houver)
  try {
    const pending = await ds.showMigrations();
    if (pending) {
      console.log('[bootstrap] Rodando migrations pendentes...');
      await ds.runMigrations();
    }
  } catch (e: any) {
    console.log('[bootstrap] Migrations puladas:', e.message);
  }

  // Seed do super admin (idempotente, atualiza senha sempre que envs mudam)
  const repo = ds.getRepository(User);
  const email = (process.env.SUPER_ADMIN_EMAIL || 'admin@mentorflow.com').toLowerCase();
  const password = process.env.SUPER_ADMIN_PASSWORD || 'ChangeMe123!';
  const name = process.env.SUPER_ADMIN_NAME || 'Super Admin';

  const existing = await repo
    .createQueryBuilder('u')
    .addSelect('u.passwordHash')
    .where('u.email = :email', { email })
    .getOne();

  const passwordHash = await bcrypt.hash(password, 10);

  if (!existing) {
    const u = repo.create({
      email,
      name,
      passwordHash,
      role: UserRole.SUPER_ADMIN,
      status: UserStatus.ACTIVE,
    });
    await repo.save(u);
    console.log(`[bootstrap] Super admin CRIADO: ${email}`);
  } else {
    // Garante role/status corretos e ressincroniza a senha com a env (útil em prod)
    await repo.update(existing.id, {
      passwordHash,
      role: UserRole.SUPER_ADMIN,
      status: UserStatus.ACTIVE,
      name: existing.name || name,
    });
    console.log(`[bootstrap] Super admin ATUALIZADO: ${email}`);
  }

  await ds.destroy();
  console.log('[bootstrap] Concluído com sucesso');
}

run().catch((e) => {
  console.error('[bootstrap] FALHA:', e);
  process.exit(1);
});
