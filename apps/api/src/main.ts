import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { buildValidationPipe } from './shared/validation.pipe';
import { env } from './shared/env';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api/v1');
  app.enableCors({ origin: env.corsOrigin, credentials: true });
  app.useGlobalPipes(buildValidationPipe());
  await app.listen(env.port);
}

void bootstrap();
