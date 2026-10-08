import { NestFactory } from '@nestjs/core';
import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { DocumentBuilder, SwaggerModule, OpenAPIObject } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { configureHttpApp } from './app.setup';

async function bootstrap(): Promise<void> {
  const app: INestApplication = await NestFactory.create(AppModule);
  const config: ConfigService = app.get(ConfigService);

  // Observer: conecta el servidor Kafka para que los @EventPattern de
  // NotificationsConsumer y AuditConsumer reciban los eventos publicados.
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.KAFKA,
    options: {
      client: {
        brokers: [config.get<string>('KAFKA_BROKER', 'localhost:9092')],
      },
      consumer: {
        groupId: config.get<string>('KAFKA_GROUP_ID', 'insurance-group'),
      },
    },
  });

  configureHttpApp(app);

  const swaggerConfig: Omit<OpenAPIObject, 'paths'> = new DocumentBuilder()
    .setTitle('Insurance Policy API')
    .setDescription('API para gestión de pólizas de seguros')
    .setVersion('1.0')
    .build();

  const document: OpenAPIObject = SwaggerModule.createDocument(
    app,
    swaggerConfig,
  );
  SwaggerModule.setup('api/docs', app, document);

  await app.startAllMicroservices();

  const port: string | number = process.env.APP_PORT ?? 3000;
  await app.listen(port);
  console.log(`Application running on http://localhost:${port}/api`);
  console.log(`Swagger docs at http://localhost:${port}/api/docs`);
}

void bootstrap();
