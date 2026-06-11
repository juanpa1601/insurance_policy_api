import { 
  Body, 
  Controller, 
  Get, 
  HttpCode, 
  Param, 
  Post 
} from '@nestjs/common';
import { 
  ApiOperation, 
  ApiResponse, 
  ApiTags 
} from '@nestjs/swagger';
import { CreateCustomerUseCase } from '../../application/use-cases/create-customer.use-case';
import { GetCustomerUseCase } from '../../application/use-cases/get-customer.use-case';
import { GetAllCustomersUseCase } from '../../application/use-cases/get-all-customers.use-case';
import { CreateCustomerDto } from './dtos/create-customer.dto';
import { Customer } from '../../domain/customer.entity';

@ApiTags('customers')
@Controller('customers')
export class CustomersController {
  constructor(
    private readonly createCustomer: CreateCustomerUseCase,
    private readonly getCustomer: GetCustomerUseCase,
    private readonly getAllCustomers: GetAllCustomersUseCase,
  ) {}

  @Post()
  @HttpCode(201)
  @ApiOperation({ summary: 'Crear un nuevo cliente' })
  @ApiResponse({ status: 201, description: 'Cliente creado exitosamente' })
  @ApiResponse({ status: 400, description: 'Datos de entrada inválidos' })
  @ApiResponse({ status: 409, description: 'El email ya está registrado' })
  create(@Body() dto: CreateCustomerDto): Promise<Customer> {
    return this.createCustomer.execute({ name: dto.name, email: dto.email });
  }

  @Get()
  @ApiOperation({ summary: 'Listar todos los clientes' })
  @ApiResponse({ status: 200, description: 'Lista de clientes' })
  findAll(): Promise<Customer[]> {
    return this.getAllCustomers.execute();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener cliente por ID' })
  @ApiResponse({ status: 200, description: 'Cliente encontrado' })
  @ApiResponse({ status: 404, description: 'Cliente no encontrado' })
  findById(@Param('id') id: string): Promise<Customer> {
    return this.getCustomer.execute(id);
  }
}
