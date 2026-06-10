import { ApiProperty } from '@nestjs/swagger';
import { 
  IsEnum, 
  IsNotEmpty 
} from 'class-validator';
import { PolicyStatus } from '../../../domain/enums/policy-status.enum';

export class ChangeStatusDto {
  @ApiProperty({ enum: PolicyStatus, example: PolicyStatus.ISSUED })
  @IsEnum(PolicyStatus)
  @IsNotEmpty()
  targetStatus!: PolicyStatus;
}
