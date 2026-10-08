import { join } from 'node:path';
import { defineFeature, loadFeature } from 'jest-cucumber';
import { PolicyStatus } from '../../src/policies/domain/enums/policy-status.enum';
import { PolicyWorld } from './world';

const feature = loadFeature(join(__dirname, 'features/emision-poliza.feature'));

defineFeature(feature, (test) => {
  const world = new PolicyWorld();

  beforeEach(() => world.start());
  afterEach(() => world.stop());

  test('La prima depende de la estrategia de tarificación', ({
    given,
    when,
    then,
    and,
  }) => {
    given('un cliente activo', () => world.registerCustomer(world.customer));

    when(
      /^cotizo una póliza del ramo (\w+) con la estrategia (\w+) y el perfil (.+)$/,
      (branch: string, strategy: string, profile: string) =>
        world.quote(branch, strategy, profile),
    );

    then('la póliza queda en estado QUOTED', () => {
      expect(world.error).toBeUndefined();
      expect(world.lastPolicy.status).toBe(PolicyStatus.QUOTED);
    });

    and(/^la prima mensual es (\d+)$/, (premium: string) => {
      expect(world.lastPolicy.monthlyPremium).toBeCloseTo(Number(premium));
    });
  });

  test('Las pólizas reciben números consecutivos', ({ given, when, then }) => {
    given('un cliente activo', () => world.registerCustomer(world.customer));

    when('cotizo dos pólizas seguidas', async () => {
      await world.quote('AUTO', 'STANDARD', 'sin datos');
      await world.quote('LIFE', 'STANDARD', 'sin datos');
    });

    then('los números de póliza terminan en 000001 y 000002', () => {
      expect(world.policies.map((p) => p.policyNumber.slice(-6))).toEqual([
        '000001',
        '000002',
      ]);
    });
  });
});
