import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt.strategy';
import { CurrentUser } from '../auth/current-user.decorator';
import { TrailsService } from './trails.service';

@Controller('trails')
@UseGuards(JwtAuthGuard)
export class TrailsController {
  constructor(private svc: TrailsService) {}

  // Mentor (criação)
  @Get()
  list(@CurrentUser() u: any) {
    if (u.role === 'mentor' || u.role === 'super_admin') return this.svc.listForMentor(u.id);
    return this.svc.listForMentorado(u.id, u.mentorId);
  }

  @Get(':id')
  one(@CurrentUser() u: any, @Param('id') id: string) {
    if (u.role === 'mentor' || u.role === 'super_admin') return this.svc.getOne(u.id, id);
    return this.svc.getForMentorado(u.id, id);
  }

  @Post()
  create(@CurrentUser() u: any, @Body() body: any) { return this.svc.create(u.id, body); }

  @Patch(':id')
  update(@CurrentUser() u: any, @Param('id') id: string, @Body() body: any) {
    return this.svc.update(u.id, id, body);
  }

  @Delete(':id')
  remove(@CurrentUser() u: any, @Param('id') id: string) { return this.svc.remove(u.id, id); }

  // Modules
  @Post(':id/modules')
  createModule(@CurrentUser() u: any, @Param('id') id: string, @Body() body: any) {
    return this.svc.createModule(u.id, id, body);
  }
  @Patch('modules/:id')
  updateModule(@CurrentUser() u: any, @Param('id') id: string, @Body() body: any) {
    return this.svc.updateModule(u.id, id, body);
  }
  @Delete('modules/:id')
  removeModule(@CurrentUser() u: any, @Param('id') id: string) {
    return this.svc.removeModule(u.id, id);
  }

  // Lessons
  @Post('modules/:id/lessons')
  createLesson(@CurrentUser() u: any, @Param('id') id: string, @Body() body: any) {
    return this.svc.createLesson(u.id, id, body);
  }
  @Patch('lessons/:id')
  updateLesson(@CurrentUser() u: any, @Param('id') id: string, @Body() body: any) {
    return this.svc.updateLesson(u.id, id, body);
  }
  @Delete('lessons/:id')
  removeLesson(@CurrentUser() u: any, @Param('id') id: string) {
    return this.svc.removeLesson(u.id, id);
  }

  // Progress (mentorado)
  @Post('lessons/:id/complete')
  complete(@CurrentUser() u: any, @Param('id') id: string, @Body() body: { percent?: number }) {
    return this.svc.markLessonCompleted(u.id, id, body.percent ?? 100);
  }

  @Get(':id/certificate')
  certificate(@CurrentUser() u: any, @Param('id') id: string) {
    return this.svc.getCertificate(u.id, id);
  }
}
