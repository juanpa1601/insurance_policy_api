import { PolicyStatus } from '../enums/policy-status.enum';
import { InvalidStateTransitionException } from '../exceptions/invalid-state-transition.exception';
import { ActiveState } from './active.state';
import { CancelledState } from './cancelled.state';
import { IssuedState } from './issued.state';
import { PolicyStatePort } from './policy-state.port';
import { QuotedState } from './quoted.state';
import { SuspendedState } from './suspended.state';

const STATES: Record<PolicyStatus, PolicyStatePort> = {
  [PolicyStatus.QUOTED]: new QuotedState(),
  [PolicyStatus.ISSUED]: new IssuedState(),
  [PolicyStatus.ACTIVE]: new ActiveState(),
  [PolicyStatus.SUSPENDED]: new SuspendedState(),
  [PolicyStatus.CANCELLED]: new CancelledState(),
};

// Transiciones de negocio permitidas (sin contar la idempotente al mismo estado).
const ALLOWED: Record<PolicyStatus, PolicyStatus[]> = {
  [PolicyStatus.QUOTED]: [PolicyStatus.ISSUED, PolicyStatus.CANCELLED],
  [PolicyStatus.ISSUED]: [PolicyStatus.ACTIVE, PolicyStatus.CANCELLED],
  [PolicyStatus.ACTIVE]: [PolicyStatus.SUSPENDED, PolicyStatus.CANCELLED],
  [PolicyStatus.SUSPENDED]: [PolicyStatus.ACTIVE, PolicyStatus.CANCELLED],
  [PolicyStatus.CANCELLED]: [],
};

const ALL: PolicyStatus[] = Object.values(PolicyStatus);
const pairs = ALL.flatMap((from) => ALL.map((to) => [from, to] as const));

const validPairs = pairs.filter(([from, to]) => ALLOWED[from].includes(to));
const invalidPairs = pairs.filter(
  ([from, to]) => from !== to && !ALLOWED[from].includes(to),
);
const nonTerminal = ALL.filter((s) => s !== PolicyStatus.CANCELLED);

describe('Máquina de estados de la póliza (State)', () => {
  it.each(ALL)('%s reporta su propio estado', (status) => {
    expect(STATES[status].getStatus()).toBe(status);
  });

  it.each(validPairs)('permite %s → %s', (from, to) => {
    expect(STATES[from].transitionTo(to)).toBe(to);
  });

  it.each(invalidPairs)('rechaza %s → %s', (from, to) => {
    expect(() => STATES[from].transitionTo(to)).toThrow(
      new InvalidStateTransitionException(from, to),
    );
  });

  it.each(nonTerminal)('%s → mismo estado es idempotente', (status) => {
    expect(STATES[status].transitionTo(status)).toBe(status);
  });

  it('CANCELLED es terminal: ni siquiera admite CANCELLED → CANCELLED', () => {
    expect(() =>
      STATES[PolicyStatus.CANCELLED].transitionTo(PolicyStatus.CANCELLED),
    ).toThrow(InvalidStateTransitionException);
  });

  it('la excepción responde HTTP 400', () => {
    const error = new InvalidStateTransitionException(
      PolicyStatus.CANCELLED,
      PolicyStatus.ACTIVE,
    );
    expect(error.statusCode).toBe(400);
    expect(error.message).toBe(
      "Transition from 'CANCELLED' to 'ACTIVE' is not allowed",
    );
  });
});
