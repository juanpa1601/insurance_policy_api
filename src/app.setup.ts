import { INestApplication, ValidationPipe } from '@nestjs/common';
import { DomainExceptionFilter } from './shared/http/domain-exception.filter';

// Configuración HTTP global compartida por main.ts y las pruebas e2e,
// para que ambas validen y mapeen errores exactamente igual.
export function configureHttpApp<T extends INestApplication>(app: T): T {
  app.setGlobalPrefix('api');

  app.useGlobalFilters(new DomainExceptionFilter());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  return app;
}
