import 'reflect-metadata';
import * as dotenv from 'dotenv';
import * as bcrypt from 'bcryptjs';
import { AppDataSource } from '../data-source';
import { User, UserRole, UserStatus } from '../entities/user.entity';

dotenv.config();

async function run() {
  await AppDataSource.initialize();
  const repo = AppDataSource.getRepository(User);
  const email = (process.env.SUPER_ADMIN_EMAIL || 'admin@mentorflow.com').toLowerCase();
  const existing = await repo.findOne({ where: { email } });
  if (existing) {
    console.log('Super admin já existe:', email);
  } else {
    const password = process.env.SUPER_ADMIN_PASSWORD || 'ChangeMe123!';
    const u = repo.create({
      email,
      name: 'Super Admin',
      passwordHash: await bcrypt.hash(password, 10),
      role: UserRole.SUPER_ADMIN,
      status: UserStatus.ACTIVE,
    });
    await repo.save(u);
    console.log('Super admin criado:', email, '/ senha:', password);
  }
  await AppDataSource.destroy();
}
run().catch((e) => {
  console.error(e);
  process.exit(1);
});
