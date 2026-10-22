import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

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

  /**
 * Configure Swagger/OpenAPI documentation.
 *
 * Swagger is enabled only outside production to avoid exposing
 * interactive API documentation publicly by default.
 *
 * The documentation will grow alongside our business-scoped APIs,
 * authentication, inventory, orders, returns, and integrations.
 */
  if (process.env.NODE_ENV !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Fimonaa Commerce Hub API')
      .setDescription(
        'REST API for Fimonaa Commerce Hub, supporting multiple business ' +
        'workspaces, inventory management, orders, returns, and integrations.',
      )
      .setVersion('0.1.0')
      .build();

    const swaggerDocument = SwaggerModule.createDocument(
      app,
      swaggerConfig,
    );

    // The application already uses /api as its global prefix.
    // Swagger UI is exposed at /api/docs.
    SwaggerModule.setup('api/docs', app, swaggerDocument);
  }

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
