import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

import { AppModule } from './modules/app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable requests from the local frontend development servers.
  // We can tighten these origins when the application is deployed.
  app.enableCors({
    origin: [
      'http://localhost:4200',
      'http://localhost:5173',
    ],
    credentials: true,
  });

  // Keep all API endpoints under a consistent /api prefix.
  app.setGlobalPrefix('api');

  // Validate incoming DTOs throughout the API.
  // Transform converts query strings such as "1" into numbers when
  // the DTO declares a numeric property.
  // Whitelist removes properties not declared in the DTO.
  // ForbidNonWhitelisted rejects unknown properties instead of
  // silently accepting misspelled or unsupported query parameters.
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  const port = Number(process.env.PORT ?? 3000);

  await app.listen(port);

  console.log(
    `Fimonaa Commerce Hub API listening on http://localhost:${port}/api`,
  );
}

bootstrap();
