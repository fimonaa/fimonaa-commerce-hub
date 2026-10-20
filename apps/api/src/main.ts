import { NestFactory } from '@nestjs/core';
import { AppModule } from './modules/app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: [
      'http://localhost:4200',
      'http://localhost:5173',
    ],
    credentials: true,
  });

  app.setGlobalPrefix('api');

  const port = Number(process.env.PORT ?? 3000);

  await app.listen(port);

  console.log(
    `Fimonaa Commerce Hub API listening on http://localhost:${port}/api`,
  );
}

bootstrap();
