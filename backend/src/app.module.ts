import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { APP_GUARD } from '@nestjs/core';

import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { LeadsModule } from './modules/leads/leads.module';
import { TestsModule } from './modules/tests/tests.module';
import { MeetingsModule } from './modules/meetings/meetings.module';
import { TasksModule } from './modules/tasks/tasks.module';
import { ContentsModule } from './modules/contents/contents.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { AiModule } from './modules/ai/ai.module';
import { PublicModule } from './modules/public/public.module';
import { AdminModule } from './modules/admin/admin.module';
import { MentorModule } from './modules/mentor/mentor.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { PlansModule } from './modules/plans/plans.module';
import { IntegrationsModule } from './modules/integrations/integrations.module';
import { DossierModule } from './modules/dossier/dossier.module';
import { PromptsModule } from './modules/prompts/prompts.module';
import { BillingModule } from './modules/billing/billing.module';
import { PushModule } from './modules/push/push.module';
import { GamificationModule } from './modules/gamification/gamification.module';
import { LandingModule } from './modules/landing/landing.module';
import { TestAssignmentsModule } from './modules/test-assignments/test-assignments.module';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { buildPgOptions } from './db.config';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot({
      ...buildPgOptions(),
      autoLoadEntities: true,
      // synchronize cria/atualiza tabelas automaticamente no boot.
      // Default: TRUE (até termos migrations). Para desligar: DB_SYNCHRONIZE=false
      synchronize: process.env.DB_SYNCHRONIZE !== 'false',
      logging: process.env.DB_LOGGING === 'true',
    }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),
    ScheduleModule.forRoot(),
    AuthModule,
    UsersModule,
    LeadsModule,
    TestsModule,
    MeetingsModule,
    TasksModule,
    ContentsModule,
    NotificationsModule,
    AiModule,
    PublicModule,
    AdminModule,
    MentorModule,
    DashboardModule,
    PlansModule,
    IntegrationsModule,
    DossierModule,
    PromptsModule,
    BillingModule,
    PushModule,
    GamificationModule,
    LandingModule,
    TestAssignmentsModule,
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'uploads'),
      serveRoot: '/uploads',
    }),
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
