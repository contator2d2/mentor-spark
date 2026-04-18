import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AppSetting } from '../../entities/app-setting.entity';

@Injectable()
export class AppSettingsService {
  constructor(@InjectRepository(AppSetting) private repo: Repository<AppSetting>) {}

  async get(key: string): Promise<string | null> {
    const row = await this.repo
      .createQueryBuilder('s')
      .addSelect('s.value')
      .where('s.key = :key', { key })
      .getOne();
    return row?.value || null;
  }

  async set(key: string, value: string | null, description?: string) {
    const existing = await this.repo.findOne({ where: { key } });
    if (existing) {
      await this.repo.update(existing.id, { value: value ?? undefined, description });
      return;
    }
    await this.repo.save(this.repo.create({ key, value: value ?? undefined, description }));
  }

  async listKeys(prefix?: string) {
    const all = await this.repo.find();
    return all
      .filter((r) => !prefix || r.key.startsWith(prefix))
      .map((r) => ({ key: r.key, description: r.description, configured: true, updatedAt: r.updatedAt }));
  }
}
