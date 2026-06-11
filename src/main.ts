import { NestFactory } from '@nestjs/core';
import { 
  INestApplication, 
  ValidationPipe 
} from '@nestjs/common';
import {
  DocumentBuilder,
  SwaggerModule,
  OpenAPIObject
} from '@nestjs/swagger';
import { AppModule } from './app.module';
import { DomainExceptionFilter } from './shared/http/domain-exception.filter';

async function bootstrap(): Promise<void> {
  const app: INestApplication = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');

  app.useGlobalFilters(new DomainExceptionFilter());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true
    }),
  );

  const swaggerConfig: Omit<OpenAPIObject, 'paths'> = new DocumentBuilder()
    .setTitle('Insurance Policy API')
    .setDescription('API para gestión de pólizas de seguros')
    .setVersion('1.0')
    .build();

  const document: OpenAPIObject = SwaggerModule.createDocument(
    app,
    swaggerConfig
  );
  SwaggerModule.setup(
    'api/docs', 
    app, 
    document
  );

  const port: string | number = process.env.APP_PORT ?? 3000;
  await app.listen(port);
  console.log(`Application running on http://localhost:${port}/api`);
  console.log(`Swagger docs at http://localhost:${port}/api/docs`);
}

bootstrap();
