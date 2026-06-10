import { 
  ArgumentsHost, 
  Catch, 
  ExceptionFilter 
} from '@nestjs/common';
import { Response } from 'express';
import { DomainException } from '../domain/domain.exception';

@Catch(DomainException)
export class DomainExceptionFilter implements ExceptionFilter {
  catch(exception: DomainException, host: ArgumentsHost) {
    const response: Response = host.switchToHttp().getResponse<Response>();
    response.status(exception.statusCode).json({
      statusCode: exception.statusCode,
      error: exception.name,
      message: exception.message
    });
  }
}
