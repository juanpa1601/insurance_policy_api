import { join } from 'node:path';
import { defineFeature, DefineStepFunction, loadFeature } from 'jest-cucumber';
import { PolicyStatus } from '../../src/policies/domain/enums/policy-status.enum';
import { InvalidStateTransitionException } from '../../src/policies/domain/exceptions/invalid-state-transition.exception';
import { PolicyWorld } from './world';

const feature = loadFeature(
  join(__dirname, 'features/ciclo-de-vida-poliza.feature'),
);

defineFeature(feature, (test) => {
  const world = new PolicyWorld();

  beforeEach(() => world.start());
  afterEach(() => world.stop());

  const givenPolicyIn = (given: DefineStepFunction): void => {
    given(/^una póliza en estado (\w+)$/, (status: string) =>
      world.policyIn(status as PolicyStatus),
    );
  };

  const whenChangingTo = (when: DefineStepFunction): void => {
    when(/^solicito cambiarla a (\w+)$/, (status: string) =>
      world.changeStatus(status as PolicyStatus),
    );
  };

  const thenStatusIs = (then: DefineStepFunction): void => {
    then(/^la póliza queda en estado (\w+)$/, async (status: string) => {
      expect(world.error).toBeUndefined();
      await expect(world.storedStatus()).resolves.toBe(status);
    });
  };

  const noEventPublished = (and: DefineStepFunction): void => {
    and('no se publica ningún evento', () => {
      expect(world.adapters.events.published).toHaveLength(0);
    });
  };

  test('Transiciones permitidas publican su evento', ({
    given,
    when,
    then,
    and,
  }) => {
    givenPolicyIn(given);
    whenChangingTo(when);
    thenStatusIs(then);
    and(/^se publica el evento "(.+)"$/, (topic: string) => {
      expect(world.adapters.events.topics()).toEqual([topic]);
    });
  });

  test('Transiciones no permitidas se rechazan sin efectos', ({
    given,
    when,
    then,
    and,
  }) => {
    givenPolicyIn(given);
    whenChangingTo(when);
    then('la solicitud se rechaza por transición no permitida', () => {
      expect(world.error).toBeInstanceOf(InvalidStateTransitionException);
    });
    and(/^la póliza sigue en estado (\w+)$/, async (status: string) => {
      await expect(world.storedStatus()).resolves.toBe(status);
    });
    noEventPublished(and);
  });

  test('Repetir el estado actual es idempotente', ({
    given,
    when,
    then,
    and,
  }) => {
    givenPolicyIn(given);
    whenChangingTo(when);
    thenStatusIs(then);
    noEventPublished(and);
  });
});
