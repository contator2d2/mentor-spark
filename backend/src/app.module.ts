import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
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
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { buildPgOptions } from './db.config';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot({
      ...buildPgOptions(),
      autoLoadEntities: true,
      synchronize: process.env.DB_SYNCHRONIZE === 'true',
      logging: process.env.DB_LOGGING === 'true',
    }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),
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
    DashboardModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
