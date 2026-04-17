import { Body, Controller, Get, Param, Post, Put } from '@nestjs/common';
import { Auth } from '../auth/auth.decorators';
import { TenantId } from '../auth/current-user.decorator';
import { AiService } from './ai.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Prompt } from '../../entities/prompt.entity';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

@ApiTags('ai')
@ApiBearerAuth()
@Controller('ai')
export class AiController {
  constructor(
    private ai: AiService,
    @InjectRepository(Prompt) private prompts: Repository<Prompt>,
  ) {}

  @Auth('mentor', 'super_admin')
  @Get('config')
  getConfig(@TenantId() mentorId: string) {
    return this.ai.getMentorConfig(mentorId);
  }

  @Auth('mentor', 'super_admin')
  @Put('config')
  updateConfig(@TenantId() mentorId: string, @Body() dto: any) {
    return this.ai.updateMentorConfig(mentorId, dto);
  }

  @Auth('mentor', 'super_admin')
  @Post('chat')
  chat(@TenantId() mentorId: string, @Body() body: { message: string; leadId?: string }) {
    return this.ai.assistantChat(mentorId, body.message, body.leadId).then((reply) => ({ reply }));
  }

  @Auth('mentor', 'super_admin')
  @Get('prompts')
  listPrompts(@TenantId() mentorId: string) {
    return this.prompts.find({ where: { mentorId }, order: { createdAt: 'DESC' } });
  }

  @Auth('mentor', 'super_admin')
  @Post('prompts')
  createPrompt(@TenantId() mentorId: string, @Body() dto: { title: string; body: string; category?: string }) {
    return this.prompts.save(this.prompts.create({ ...dto, mentorId }));
  }
}
