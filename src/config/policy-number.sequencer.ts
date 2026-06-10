import { Injectable } from '@nestjs/common';

// Singleton gestionado por NestJS DI. Garantiza que un unico contador
// en memoria asigne numeros de poliza consecutivos sin colisiones
// durante la vida del proceso.
@Injectable()
export class PolicyNumberSequencer {
  private counter: number = 0;

  // Debe llamarse al iniciar la app para sincronizar con el ultimo registro en BD.
  initialize(lastSequence: number): void {
    this.counter = lastSequence;
  }

  next(): string {
    this.counter++;
    const year: number = new Date().getFullYear();
    const sequence: string = String(this.counter).padStart(6, '0');
    return `POL-${year}-${sequence}`;
  }
}
