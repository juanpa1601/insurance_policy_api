import { 
  Body, 
  Controller, 
  Get, 
  HttpCode, 
  Param, 
  Patch, 
  Post 
} from '@nestjs/common';
import { 
  ApiOperation, 
  ApiResponse, 
  ApiTags 
} from '@nestjs/swagger';
import { CreatePolicyUseCase } from '../../application/use-cases/create-policy.use-case';
import { ChangePolicyStatusUseCase } from '../../application/use-cases/change-policy-status.use-case';
import { GetPolicyUseCase } from '../../application/use-cases/get-policy.use-case';
import { GetPoliciesByCustomerUseCase } from '../../application/use-cases/get-policies-by-customer.use-case';
import { GetAllPoliciesUseCase } from '../../application/use-cases/get-all-policies.use-case';
import { CreatePolicyDto } from './dtos/create-policy.dto';
import { ChangeStatusDto } from './dtos/change-status.dto';

@ApiTags('policies')
@Controller('policies')
export class PoliciesController {
  constructor(
    private readonly createPolicy: CreatePolicyUseCase,
    private readonly changePolicyStatus: ChangePolicyStatusUseCase,
    private readonly getPolicy: GetPolicyUseCase,
    private readonly getPoliciesByCustomer: GetPoliciesByCustomerUseCase,
    private readonly getAllPolicies: GetAllPoliciesUseCase,
  ) {}

  @Post()
  @HttpCode(201)
  @ApiOperation({ summary: 'Cotizar/crear una póliza (Factory + Strategy + Builder → QUOTED)' })
  @ApiResponse({ status: 201, description: 'Póliza creada en estado QUOTED' })
  @ApiResponse({ status: 400, description: 'Ramo/estrategia no soportado o datos inválidos' })
  @ApiResponse({ status: 404, description: 'Cliente no encontrado o inactivo' })
  create(@Body() dto: CreatePolicyDto) {
    return this.createPolicy.execute({
      customerId: dto.customerId,
      branch: dto.branch,
      ratingStrategy: dto.ratingStrategy,
      riskProfile: dto.riskProfile ?? {},
    });
  }

  @Get()
  @ApiOperation({ summary: 'Listar todas las pólizas' })
  @ApiResponse({ status: 200, description: 'Lista de pólizas' })
  findAll() {
    return this.getAllPolicies.execute();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener póliza por ID' })
  @ApiResponse({ status: 200, description: 'Póliza encontrada' })
  @ApiResponse({ status: 404, description: 'Póliza no encontrada' })
  findById(@Param('id') id: string) {
    return this.getPolicy.execute(id);
  }

  @Get('customer/:customerId')
  @ApiOperation({ summary: 'Obtener todas las pólizas de un cliente' })
  findByCustomer(@Param('customerId') customerId: string) {
    return this.getPoliciesByCustomer.execute(customerId);
  }

  @Patch(':id/status')
  @HttpCode(200)
  @ApiOperation({ summary: 'Cambiar estado de la póliza (State + Observer)' })
  @ApiResponse({ status: 200, description: 'Estado actualizado y evento publicado' })
  @ApiResponse({ status: 400, description: 'Transición de estado inválida' })
  @ApiResponse({ status: 404, description: 'Póliza no encontrada' })
  changeStatus(@Param('id') id: string, @Body() dto: ChangeStatusDto) {
    return this.changePolicyStatus.execute(id, dto.targetStatus);
  }
}
