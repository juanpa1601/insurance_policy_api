import { join } from 'node:path';
import { defineFeature, DefineStepFunction, loadFeature } from 'jest-cucumber';
import { activeCustomer } from '../support/in-memory-adapters';
import { PolicyWorld } from './world';

const feature = loadFeature(
  join(__dirname, 'features/rechazo-emision.feature'),
);

defineFeature(feature, (test) => {
  const world = new PolicyWorld();

  beforeEach(() => world.start());
  afterEach(() => world.stop());

  const whenQuoting = (when: DefineStepFunction): void => {
    when(
      /^cotizo una póliza del ramo (\w+) con la estrategia (\w+) y el perfil (.+)$/,
      (branch: string, strategy: string, profile: string) =>
        world.quote(branch, strategy, profile),
    );
  };

  const thenRejected = (then: DefineStepFunction, and: DefineStepFunction) => {
    then(
      /^la cotización se rechaza con el error "(.+)"$/,
      (message: string) => {
        expect(world.error?.message).toContain(message);
      },
    );

    and('no se guarda ninguna póliza', () => {
      expect(world.adapters.policies.saveCount).toBe(0);
    });
  };

  test('La estrategia exige datos del perfil de riesgo', ({
    given,
    when,
    then,
    and,
  }) => {
    given('un cliente activo', () => world.registerCustomer(world.customer));
    whenQuoting(when);
    thenRejected(then, and);
  });

  test('Un cliente inactivo no puede cotizar', ({ given, when, then, and }) => {
    given('un cliente inactivo', () =>
      world.registerCustomer(activeCustomer().deactivate()),
    );
    whenQuoting(when);
    thenRejected(then, and);
  });

  test('Un cliente inexistente no puede cotizar', ({
    given,
    when,
    then,
    and,
  }) => {
    given('que el cliente no existe', () => {
      // El cliente del contexto nunca se registra en el repositorio.
    });
    whenQuoting(when);
    thenRejected(then, and);
  });
});
