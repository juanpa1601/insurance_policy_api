import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { configureHttpApp } from '../../src/app.setup';
import {
  createAdapters,
  createTestingModule,
  TestAdapters,
} from '../support/testing-module';

interface CustomerBody {
  id: string;
  email: string;
  isActive: boolean;
}

interface PolicyBody {
  id: string;
  policyNumber: string;
  customerId: string;
  status: string;
  monthlyPremium: number;
  coverage: Record<string, unknown>;
}

interface ErrorBody {
  statusCode: number;
  error: string;
  message: string | string[];
}

describe('API HTTP (e2e con supertest y adaptadores en memoria)', () => {
  let app: INestApplication<App>;
  let adapters: TestAdapters;

  const http = () => request(app.getHttpServer());

  const createCustomer = async (email = 'ana@example.com') =>
    (
      await http()
        .post('/api/customers')
        .send({ name: 'Ana Torres', email })
        .expect(201)
    ).body as CustomerBody;

  const createPolicy = async (customerId: string, body: object = {}) =>
    (
      await http()
        .post('/api/policies')
        .send({
          customerId,
          branch: 'AUTO',
          ratingStrategy: 'STANDARD',
          ...body,
        })
        .expect(201)
    ).body as PolicyBody;

  beforeEach(async () => {
    adapters = createAdapters();
    const moduleRef = await createTestingModule(adapters, {
      withControllers: true,
    });
    app = configureHttpApp(moduleRef.createNestApplication());
    await app.init();
  });

  afterEach(() => app.close());

  describe('/api/customers', () => {
    it('POST crea un cliente (201)', async () => {
      const customer = await createCustomer();

      expect(customer).toMatchObject({
        email: 'ana@example.com',
        isActive: true,
      });
    });

    it('POST rechaza un email inválido (400)', async () => {
      const res = await http()
        .post('/api/customers')
        .send({ name: 'Ana', email: 'no-es-email' })
        .expect(400);

      expect((res.body as ErrorBody).message).toContain(
        'email must be an email',
      );
    });

    it('POST rechaza campos no permitidos (400)', async () => {
      await http()
        .post('/api/customers')
        .send({ name: 'Ana', email: 'ana@example.com', isActive: false })
        .expect(400);
    });

    it('POST rechaza un email duplicado (409) con el formato de error de dominio', async () => {
      await createCustomer();

      const res = await http()
        .post('/api/customers')
        .send({ name: 'Otra', email: 'ana@example.com' })
        .expect(409);

      expect(res.body).toEqual({
        statusCode: 409,
        error: 'EmailAlreadyExistsException',
        message: "Email 'ana@example.com' is already registered",
      });
    });

    it('GET lista y consulta por id; 404 si no existe', async () => {
      const customer = await createCustomer();

      const list = await http().get('/api/customers').expect(200);
      expect(list.body).toHaveLength(1);

      const one = await http().get(`/api/customers/${customer.id}`).expect(200);
      expect((one.body as CustomerBody).id).toBe(customer.id);

      await http().get('/api/customers/no-existe').expect(404);
    });
  });

  describe('/api/policies', () => {
    it('POST emite una póliza RISK_BASED en QUOTED con la prima calculada (201)', async () => {
      const { id: customerId } = await createCustomer();

      const policy = await createPolicy(customerId, {
        ratingStrategy: 'RISK_BASED',
        riskProfile: { riskScore: 40 },
      });

      expect(policy).toMatchObject({
        customerId,
        status: 'QUOTED',
        monthlyPremium: 168_000,
        coverage: { coverageAmount: 80_000_000, termMonths: 12 },
      });
      expect(policy.policyNumber).toMatch(/^POL-\d{4}-000001$/);
    });

    it('POST sin riskProfile usa un perfil vacío (STANDARD)', async () => {
      const { id } = await createCustomer();

      const policy = await createPolicy(id, { branch: 'TRAVEL' });

      expect(policy.monthlyPremium).toBe(65_000);
    });

    it.each([
      ['customerId que no es UUID', { customerId: 'abc' }],
      ['ramo desconocido', { branch: 'MARINE' }],
      ['estrategia desconocida', { ratingStrategy: 'PROMO' }],
      ['riskScore fuera de rango', { riskProfile: { riskScore: 150 } }],
    ])('POST rechaza %s (400 por validación del DTO)', async (_case, body) => {
      const { id } = await createCustomer();

      await http()
        .post('/api/policies')
        .send({
          customerId: id,
          branch: 'AUTO',
          ratingStrategy: 'STANDARD',
          ...body,
        })
        .expect(400);
    });

    it('POST RISK_BASED sin riskScore responde 400 desde el dominio', async () => {
      const { id } = await createCustomer();

      const res = await http()
        .post('/api/policies')
        .send({ customerId: id, branch: 'AUTO', ratingStrategy: 'RISK_BASED' })
        .expect(400);

      expect((res.body as ErrorBody).error).toBe(
        'InvalidRatingStrategyDataException',
      );
    });

    it('POST con un cliente inexistente responde 404', async () => {
      await http()
        .post('/api/policies')
        .send({
          customerId: '6f1c2b8e-1d2a-4c3b-9e4f-5a6b7c8d9e0f',
          branch: 'AUTO',
          ratingStrategy: 'STANDARD',
        })
        .expect(404);
    });

    it('GET lista, consulta por id y por cliente; 404 si no existe', async () => {
      const ana = await createCustomer();
      const luis = await createCustomer('luis@example.com');
      const policy = await createPolicy(ana.id);
      await createPolicy(luis.id);

      const all = await http().get('/api/policies').expect(200);
      expect(all.body).toHaveLength(2);

      const one = await http().get(`/api/policies/${policy.id}`).expect(200);
      expect((one.body as PolicyBody).id).toBe(policy.id);

      const byCustomer = await http()
        .get(`/api/policies/customer/${ana.id}`)
        .expect(200);
      expect(
        (byCustomer.body as PolicyBody[]).map((p) => p.customerId),
      ).toEqual([ana.id]);

      await http().get('/api/policies/no-existe').expect(404);
    });

    it('PATCH :id/status aplica la transición (200) y publica el evento', async () => {
      const { id: customerId } = await createCustomer();
      const policy = await createPolicy(customerId);

      const res = await http()
        .patch(`/api/policies/${policy.id}/status`)
        .send({ targetStatus: 'ISSUED' })
        .expect(200);

      expect((res.body as PolicyBody).status).toBe('ISSUED');
      expect(adapters.events.topics()).toEqual(['policy.issued']);
    });

    it('PATCH rechaza una transición no permitida (400) sin publicar', async () => {
      const { id: customerId } = await createCustomer();
      const policy = await createPolicy(customerId);

      const res = await http()
        .patch(`/api/policies/${policy.id}/status`)
        .send({ targetStatus: 'ACTIVE' })
        .expect(400);

      expect(res.body).toEqual({
        statusCode: 400,
        error: 'InvalidStateTransitionException',
        message: "Transition from 'QUOTED' to 'ACTIVE' is not allowed",
      });
      expect(adapters.events.published).toHaveLength(0);
    });

    it('PATCH rechaza un estado inexistente (400) y una póliza inexistente (404)', async () => {
      const { id: customerId } = await createCustomer();
      const policy = await createPolicy(customerId);

      await http()
        .patch(`/api/policies/${policy.id}/status`)
        .send({ targetStatus: 'EXPIRED' })
        .expect(400);

      await http()
        .patch('/api/policies/no-existe/status')
        .send({ targetStatus: 'ISSUED' })
        .expect(404);
    });
  });
});
