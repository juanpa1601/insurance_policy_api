import { Branch } from '../enums/branch.enum';
import { Coverage } from '../value-objects/coverage.vo';

// Contrato del patron Factory Method.
// Cada ramo implementa este port para proveer su cobertura por defecto y prima base.
export interface PolicyFactoryPort {
  getBranch(): Branch;
  createDefaultCoverage(): Coverage;
  getBasePremium(): number;
}
