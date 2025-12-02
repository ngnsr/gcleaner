import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
    }),
  );

  const configService = app.get(ConfigService);

  const API_DOCS_ENABLED =
    configService.getOrThrow<boolean>('API_DOCS_ENABLED');
  if (API_DOCS_ENABLED) {
    const config = new DocumentBuilder()
      .setTitle('Gmail Cleaner')
      .setDescription('API for smart Gmail cleanup with AI')
      .setVersion('1.0')
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api-docs', app, document);
  }

  await app.listen(configService.getOrThrow<number>('PORT'));
}
bootstrap();
