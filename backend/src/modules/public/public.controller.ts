import { Body, Controller, Get, NotFoundException, Param, Post } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserStatus } from '../../entities/user.entity';
import { LeadsService } from '../leads/leads.service';
import { ApiTags } from '@nestjs/swagger';
import * as QRCode from 'qrcode';

@ApiTags('public')
@Controller('public')
export class PublicController {
  constructor(
    @InjectRepository(User) private users: Repository<User>,
    private leadsService: LeadsService,
  ) {}

  /** Página pública de captação por slug do mentor */
  @Get('mentor/:slug')
  async getMentorBySlug(@Param('slug') slug: string) {
    const m = await this.users.findOne({ where: { slug, status: UserStatus.ACTIVE } });
    if (!m) throw new NotFoundException('Mentor não encontrado');
    return { id: m.id, name: m.name, brandName: m.brandName || m.name, brandLogoUrl: m.brandLogoUrl, slug: m.slug };
  }

  @Get('mentor/:slug/qrcode')
  async getQrCode(@Param('slug') slug: string) {
    const url = `${process.env.APP_URL || 'http://localhost:8080'}/c/${slug}`;
    const dataUrl = await QRCode.toDataURL(url, { width: 512, margin: 2 });
    return { url, qr: dataUrl };
  }

  /** Submissão pública de lead */
  @Post('mentor/:slug/lead')
  async createLead(
    @Param('slug') slug: string,
    @Body() body: { name: string; email: string; phone?: string; company?: string; revenue?: number; source?: string },
  ) {
    const mentor = await this.users.findOne({ where: { slug, status: UserStatus.ACTIVE } });
    if (!mentor) throw new NotFoundException('Mentor não encontrado');
    const result = await this.leadsService.createFromCapture({
      mentorId: mentor.id,
      mentorBrand: mentor.brandName || mentor.name,
      ...body,
    });
    return { ok: true, leadId: result.lead.id, accountCreated: result.accountCreated };
  }
}
