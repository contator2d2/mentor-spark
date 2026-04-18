import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TestAssignment } from '../../entities/test-assignment.entity';
import { TestTemplate } from '../../entities/test-template.entity';
import { User } from '../../entities/user.entity';
import { Auth } from '../auth/auth.decorators';
import { CurrentUser, TenantId } from '../auth/current-user.decorator';

@Controller('test-assignments')
export class TestAssignmentsController {
  constructor(
    @InjectRepository(TestAssignment) private assigns: Repository<TestAssignment>,
    @InjectRepository(TestTemplate) private templates: Repository<TestTemplate>,
    @InjectRepository(User) private users: Repository<User>,
  ) {}

  @Auth('mentor', 'super_admin')
  @Get('lead/:leadId')
  byLead(@TenantId() mentorId: string, @Param('leadId') leadId: string) {
    return this.assigns.find({ where: { mentorId, leadId }, order: { createdAt: 'DESC' } });
  }

  @Auth('mentor', 'super_admin')
  @Post()
  create(@TenantId() mentorId: string, @Body() dto: { templateId: string; leadId: string; dueDate?: string }) {
    return this.assigns.save(this.assigns.create({ mentorId, templateId: dto.templateId, leadId: dto.leadId, dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined }));
  }

  @Auth('mentor', 'super_admin')
  @Delete(':id')
  async remove(@TenantId() mentorId: string, @Param('id') id: string) {
    await this.assigns.delete({ id, mentorId } as any);
    return { ok: true };
  }

  /** Mentorado: lista os testes designados a ele (busca leadId pelo userId) */
  @Auth('mentorado', 'prospect')
  @Get('me')
  async me(@CurrentUser() u: any) {
    // Lista assignments cujo leadId pertence a um lead com userId=u.sub
    const list = await this.assigns
      .createQueryBuilder('a')
      .innerJoin('leads', 'l', 'l.id = a.leadId')
      .where('l.userId = :userId', { userId: u.sub })
      .orderBy('a.createdAt', 'DESC')
      .getMany();

    if (!list.length) return [];

    // Hidrata templates
    const templateIds = Array.from(new Set(list.map((a) => a.templateId)));
    const tps = templateIds.length
      ? await this.templates.find({ where: templateIds.map((id) => ({ id })) as any })
      : [];
    const templateMap = new Map(
      tps.map((t) => [t.id, { id: t.id, title: t.title, description: t.description, category: t.category }]),
    );

    // Hidrata mentores (para slug)
    const mentorIds = Array.from(new Set(list.map((a) => a.mentorId)));
    const mentors = mentorIds.length
      ? await this.users.find({ where: mentorIds.map((id) => ({ id })) as any })
      : [];
    const mentorMap = new Map(mentors.map((m) => [m.id, { slug: m.slug, brandName: m.brandName }]));

    return list.map((a) => ({
      ...a,
      template: templateMap.get(a.templateId),
      mentorSlug: mentorMap.get(a.mentorId)?.slug || null,
      mentorBrandName: mentorMap.get(a.mentorId)?.brandName || null,
    }));
  }
}
