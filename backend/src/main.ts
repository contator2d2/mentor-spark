import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { cors: false });
  const logger = new Logger('Bootstrap');

  app.use(helmet());

  // CORS robusto: aceita lista CSV, ignora barras finais/espaços, libera *.easypanel.host
  const allowList = (process.env.CORS_ORIGIN || 'http://localhost:8080,http://localhost:5173')
    .split(',')
    .map((s) => s.trim().replace(/\/+$/, ''))
    .filter(Boolean);

  app.enableCors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true); // curl/healthchecks
      const clean = origin.replace(/\/+$/, '');
      const ok =
        allowList.includes('*') ||
        allowList.includes(clean) ||
        /\.easypanel\.host$/i.test(new URL(clean).hostname) ||
        /^http:\/\/localhost(:\d+)?$/i.test(clean);
      cb(ok ? null : new Error(`CORS bloqueado para origem: ${origin}`), ok);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With'],
  });

  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: false }));

  const config = new DocumentBuilder()
    .setTitle('MentorFlow API')
    .setDescription('SaaS de Mentoria Inteligente Multi-Tenant')
    .setVersion('0.1.0')
    .addBearerAuth()
    .build();
  const doc = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, doc);

  const port = +(process.env.PORT || 3001);
  await app.listen(port);
  logger.log(`MentorFlow API on http://localhost:${port}/api`);
  logger.log(`Swagger docs on http://localhost:${port}/api/docs`);
}
bootstrap();
