import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt.strategy';
import { CurrentUser } from '../auth/current-user.decorator';
import { TrailsService } from './trails.service';
import { FeatureGuard, RequireFeature } from '../plans/feature.guard';
import { userId, mentorIdOf } from '../auth/user-id.util';

@Controller('trails')
@UseGuards(JwtAuthGuard, FeatureGuard)
@RequireFeature('allowTrails')
export class TrailsController {
  constructor(private svc: TrailsService) {}

  // Mentor (criação)
  @Get()
  list(@CurrentUser() u: any) {
    if (u.role === 'mentor' || u.role === 'super_admin') return this.svc.listForMentor(userId(u));
    return this.svc.listForMentorado(userId(u), mentorIdOf(u));
  }

  @Get(':id')
  one(@CurrentUser() u: any, @Param('id') id: string) {
    if (u.role === 'mentor' || u.role === 'super_admin') return this.svc.getOne(userId(u), id);
    return this.svc.getForMentorado(userId(u), id);
  }

  @Post()
  create(@CurrentUser() u: any, @Body() body: any) { return this.svc.create(userId(u), body); }

  @Patch(':id')
  update(@CurrentUser() u: any, @Param('id') id: string, @Body() body: any) {
    return this.svc.update(userId(u), id, body);
  }

  @Delete(':id')
  remove(@CurrentUser() u: any, @Param('id') id: string) { return this.svc.remove(userId(u), id); }

  // Modules
  @Post(':id/modules')
  createModule(@CurrentUser() u: any, @Param('id') id: string, @Body() body: any) {
    return this.svc.createModule(userId(u), id, body);
  }
  @Patch('modules/:id')
  updateModule(@CurrentUser() u: any, @Param('id') id: string, @Body() body: any) {
    return this.svc.updateModule(userId(u), id, body);
  }
  @Delete('modules/:id')
  removeModule(@CurrentUser() u: any, @Param('id') id: string) {
    return this.svc.removeModule(userId(u), id);
  }

  // Lessons
  @Post('modules/:id/lessons')
  createLesson(@CurrentUser() u: any, @Param('id') id: string, @Body() body: any) {
    return this.svc.createLesson(userId(u), id, body);
  }
  @Patch('lessons/:id')
  updateLesson(@CurrentUser() u: any, @Param('id') id: string, @Body() body: any) {
    return this.svc.updateLesson(userId(u), id, body);
  }
  @Delete('lessons/:id')
  removeLesson(@CurrentUser() u: any, @Param('id') id: string) {
    return this.svc.removeLesson(userId(u), id);
  }

  // Progress (mentorado)
  @Post('lessons/:id/complete')
  complete(@CurrentUser() u: any, @Param('id') id: string, @Body() body: { percent?: number }) {
    return this.svc.markLessonCompleted(userId(u), id, body.percent ?? 100);
  }

  @Get(':id/certificate')
  certificate(@CurrentUser() u: any, @Param('id') id: string) {
    return this.svc.getCertificate(userId(u), id);
  }
}
