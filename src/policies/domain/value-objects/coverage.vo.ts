interface CoverageProps {
  coverageAmount: number;
  termMonths: number;
  deductible?: number;
  beneficiaryRequired?: boolean;
  copayRate?: number;
  waitingPeriodDays?: number;
}

export class Coverage {
  readonly coverageAmount: number;
  readonly termMonths: number;
  readonly deductible?: number;
  readonly beneficiaryRequired?: boolean;
  readonly copayRate?: number;
  readonly waitingPeriodDays?: number;

  constructor(props: CoverageProps) {
    this.coverageAmount = props.coverageAmount;
    this.termMonths = props.termMonths;
    this.deductible = props.deductible;
    this.beneficiaryRequired = props.beneficiaryRequired;
    this.copayRate = props.copayRate;
    this.waitingPeriodDays = props.waitingPeriodDays;
  }

  toPlainObject(): CoverageProps {
    return {
      coverageAmount: this.coverageAmount,
      termMonths: this.termMonths,
      ...(this.deductible !== undefined && { deductible: this.deductible }),
      ...(this.beneficiaryRequired !== undefined && { beneficiaryRequired: this.beneficiaryRequired }),
      ...(this.copayRate !== undefined && { copayRate: this.copayRate }),
      ...(this.waitingPeriodDays !== undefined && { waitingPeriodDays: this.waitingPeriodDays }),
    };
  }

  static fromPlainObject(plain: CoverageProps): Coverage {
    return new Coverage(plain);
  }
}
