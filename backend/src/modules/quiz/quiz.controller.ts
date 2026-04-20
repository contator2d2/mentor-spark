import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Auth } from '../auth/auth.decorators';
import { TenantId } from '../auth/current-user.decorator';
import { QuizService } from './quiz.service';

@ApiTags('quiz')
@Controller('quiz')
export class QuizController {
  constructor(private svc: QuizService) {}

  @ApiBearerAuth()
  @Auth('mentor', 'super_admin', 'mentor_team')
  @Post('sessions')
  create(@TenantId() mentorId: string, @Body() dto: { templateId: string; eventId?: string; questionTimeLimit?: number; title?: string }) {
    return this.svc.createSession(mentorId, dto);
  }

  @ApiBearerAuth()
  @Auth('mentor', 'super_admin', 'mentor_team')
  @Post('templates/manual')
  createManualTemplate(
    @TenantId() mentorId: string,
    @Body() dto: { title: string; description?: string; questions: Array<{ text: string; options: Array<{ label: string; correct?: boolean }> }> },
  ) {
    return this.svc.createManualQuizTemplate(mentorId, dto);
  }

  @ApiBearerAuth()
  @Auth('mentor', 'super_admin', 'mentor_team')
  @Post('templates/generate-ai')
  generateAiTemplate(
    @TenantId() mentorId: string,
    @Body() dto: { topic: string; content?: string; numQuestions?: number; numOptions?: number; difficulty?: 'easy' | 'medium' | 'hard'; language?: string },
  ) {
    return this.svc.generateQuizTemplateWithAI(mentorId, dto);
  }

  @ApiBearerAuth()
  @Auth('mentor', 'super_admin', 'mentor_team')
  @Get('sessions')
  list(@TenantId() mentorId: string) {
    return this.svc.listForMentor(mentorId);
  }

  @ApiBearerAuth()
  @Auth('mentor', 'super_admin', 'mentor_team')
  @Get('sessions/:id')
  detail(@Param('id') id: string) {
    return this.svc.getPublicState(id);
  }

  // ===== ROTAS PÚBLICAS PARA O JOGADOR / TELÃO =====
  // Pública (sem @Auth)
  @Get('public/by-pin/:pin')
  byPin(@Param('pin') pin: string) {
    return this.svc.getByPin(pin).then((s) => ({
      id: s.id, pin: s.pin, title: s.title, status: s.status,
      totalQuestions: s.questionsSnapshot?.length || 0,
    }));
  }

  // Pública
  @Get('public/state/:id')
  publicState(@Param('id') id: string) {
    return this.svc.getPublicState(id);
  }
}
