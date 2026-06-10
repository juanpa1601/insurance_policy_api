import { 
  ApiProperty, 
  ApiPropertyOptional 
} from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsUUID,
  Max,
  Min,
  ValidateNested
} from 'class-validator';
import { Type } from 'class-transformer';
import { Branch } from '../../../domain/enums/branch.enum';
import { RatingStrategyType } from '../../../domain/enums/rating-strategy-type.enum';

class RiskProfileDto {
  @ApiPropertyOptional({ description: 'Requerido para RISK_BASED (0-100)', example: 50 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  riskScore?: number;

  @ApiPropertyOptional({ description: 'Año desde que es cliente. Requerido para LOYALTY', example: 2020 })
  @IsOptional()
  @IsNumber()
  customerSince?: number;
}

export class CreatePolicyDto {
  @ApiProperty({ example: 'uuid-del-cliente' })
  @IsUUID()
  @IsNotEmpty()
  customerId!: string;

  @ApiProperty({ enum: Branch, example: Branch.AUTO })
  @IsEnum(Branch)
  branch!: Branch;

  @ApiProperty({ enum: RatingStrategyType, example: RatingStrategyType.STANDARD })
  @IsEnum(RatingStrategyType)
  ratingStrategy!: RatingStrategyType;

  @ApiPropertyOptional({ type: RiskProfileDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => RiskProfileDto)
  riskProfile?: RiskProfileDto;
}
