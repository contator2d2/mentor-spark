import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { Auth } from '../auth/auth.decorators';
import { TenantId, CurrentUser } from '../auth/current-user.decorator';
import { TasksService } from './tasks.service';
import { TaskStatus } from '../../entities/task.entity';

@Controller('tasks')
export class TasksController {
  constructor(private tasksService: TasksService) {}

  @Auth('mentor', 'super_admin', 'mentorado', 'prospect')
  @Get()
  list(
    @TenantId() mentorId: string,
    @CurrentUser() user: any,
    @Query('leadId') leadId?: string,
    @Query('assignedUserId') assignedUserId?: string,
    @Query('status') status?: TaskStatus,
    @Query('mine') mine?: string,
  ) {
    // Mentorado/prospect só vê o que está atribuído a ele
    const isMentor = user.role === 'mentor' || user.role === 'super_admin';
    return this.tasksService.list(mentorId, {
      leadId,
      assignedUserId,
      status,
      mineUserId: !isMentor ? user.userId || user.id : mine === 'true' ? user.userId || user.id : undefined,
    });
  }

  @Auth('mentor', 'super_admin')
  @Post()
  create(@TenantId() mentorId: string, @CurrentUser() user: any, @Body() dto: any) {
    return this.tasksService.create(mentorId, dto, user.userId || user.id);
  }

  @Auth('mentor', 'super_admin', 'mentorado')
  @Patch(':id')
  update(@TenantId() mentorId: string, @Param('id') id: string, @Body() dto: any) {
    return this.tasksService.update(mentorId, id, dto);
  }

  /** Mentorado marca a própria tarefa como concluída. */
  @Auth('mentor', 'super_admin', 'mentorado', 'prospect')
  @Post(':id/complete')
  complete(@TenantId() mentorId: string, @CurrentUser() user: any, @Param('id') id: string) {
    return this.tasksService.markDone(mentorId, id, user.userId || user.id);
  }

  /** Mentor força envio do lembrete agora. */
  @Auth('mentor', 'super_admin')
  @Post(':id/remind')
  remindNow(@TenantId() mentorId: string, @Param('id') id: string) {
    return this.tasksService.sendReminderNow(mentorId, id);
  }

  @Auth('mentor', 'super_admin')
  @Delete(':id')
  delete(@TenantId() mentorId: string, @Param('id') id: string) {
    return this.tasksService.remove(mentorId, id);
  }
}
