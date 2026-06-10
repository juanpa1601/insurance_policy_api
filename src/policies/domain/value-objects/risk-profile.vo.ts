interface RiskProfileProps {
  riskScore?: number;       // requerido por RISK_BASED: valor entre 0 y 100
  customerSince?: number;   // requerido por LOYALTY: año desde que es cliente
}

export class RiskProfile {
  readonly riskScore?: number;
  readonly customerSince?: number;

  constructor(props: RiskProfileProps) {
    this.riskScore = props.riskScore;
    this.customerSince = props.customerSince;
  }

  toPlainObject(): RiskProfileProps {
    return {
      ...(this.riskScore !== undefined && { riskScore: this.riskScore }),
      ...(this.customerSince !== undefined && { customerSince: this.customerSince }),
    };
  }

  static fromPlainObject(plain: RiskProfileProps): RiskProfile {
    return new RiskProfile(plain);
  }
}
