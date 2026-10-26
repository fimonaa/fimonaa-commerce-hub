import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { resolve } from 'node:path';
import request = require('supertest');
import { DataSource } from 'typeorm';
import { randomUUID } from 'node:crypto';

import { AppModule } from '../src/modules/app.module';
import { assertSafeTestDatabase } from './helpers/assert-safe-test-database';
import { createTestJwt } from './helpers/create-test-jwt';
import { cleanupHttpImportTestData } from './helpers/cleanup-http-import-test-data';

describe('HTTP authentication and authorization integration', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  beforeAll(async () => {
    const safeDatabaseUrl = assertSafeTestDatabase(
      process.env.TEST_DATABASE_URL,
    );

    if (process.env.DATABASE_URL !== safeDatabaseUrl) {
      throw new Error(
        'HTTP integration tests must use the isolated test database.',
      );
    }

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    );

    await app.init();

    dataSource = app.get(DataSource);

    const configuredWorkbook = app
      .get(ConfigService)
      .get<string>('FIMONAA_SKU_WORKBOOK_PATH');

    const expectedWorkbook = resolve(
      __dirname,
      'fixtures/opening-balance-test.xlsx',
    );

    if (configuredWorkbook !== expectedWorkbook) {
      throw new Error(
        'HTTP integration tests must use the synthetic workbook exclusively.',
      );
    }

    const databaseRows: Array<{ database_name: string }> =
      await dataSource.query('SELECT current_database() AS database_name');

    if (databaseRows[0].database_name !== 'fimonaa_commerce_import_test') {
      throw new Error('HTTP test application connected to an unsafe database.');
    }
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it('rejects requests without authentication', async () => {
    await request(app.getHttpServer())
      .post('/api/inventory-import/import-opening-balance')
      .expect(401);
  });

  it('rejects unauthenticated inventory requests', async () => {
    await request(app.getHttpServer())
      .get('/api/inventory')
      .expect(401);
  });

  it('isolates inventory responses between authenticated businesses', async () => {
    const userId = randomUUID();
    const businessAId = randomUUID();
    const businessBId = randomUUID();
    const sku = 'FIM-DRE-001-BLAC-ME';

    try {
      await dataSource.query(
        `INSERT INTO users (id, email, status)
         VALUES ($1, $2, 'active')`,
        [userId, `http-test-${userId}@example.invalid`],
      );

      await dataSource.query(
        `INSERT INTO businesses (id, name, slug, status)
         VALUES
           ($1, 'Inventory HTTP A', $3, 'active'),
           ($2, 'Inventory HTTP B', $4, 'active')`,
        [
          businessAId,
          businessBId,
          `http-test-${businessAId}`,
          `http-test-${businessBId}`,
        ],
      );

      await dataSource.query(
        `INSERT INTO business_memberships (business_id, user_id, role)
         VALUES ($1, $3, 'owner'), ($2, $3, 'owner')`,
        [businessAId, businessBId, userId],
      );

      await dataSource.query(
        `INSERT INTO inventory_skus (
          business_id, sku, product_name, initial_stock,
          available_stock, source_sheet, source_row
        )
        VALUES
          ($1, $3, 'Business A Dress', 10, 10, 'HTTP Test', 1),
          ($2, $3, 'Business B Dress', 25, 3, 'HTTP Test', 2)`,
        [businessAId, businessBId, sku],
      );

      await dataSource.query(
        `INSERT INTO inventory_skus (
          business_id, sku, product_name, initial_stock,
          available_stock, source_sheet, source_row
        )
        VALUES
          ($1, 'FIM-DRE-002-BLAC-ME', 'Business A Second Dress', 8, 8, 'HTTP Test', 3),
          ($1, 'FIM-DRE-003-BLAC-ME', 'Business A Third Dress', 6, 6, 'HTTP Test', 4)`,
        [businessAId],
      );

      const token = await createTestJwt(userId);

      const responseA = await request(app.getHttpServer())
        .get('/api/inventory')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Business-Id', businessAId)
        .expect(200);

      const responseB = await request(app.getHttpServer())
        .get('/api/inventory')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Business-Id', businessBId)
        .expect(200);

      expect(responseA.body.meta.totalItems).toBe(3);
      expect(responseB.body.meta.totalItems).toBe(1);
      expect(responseA.body.data).toHaveLength(3);
      expect(responseB.body.data).toHaveLength(1);

      expect(responseA.body.data).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            sku,
            productName: 'Business A Dress',
            availableStock: 10,
          }),
          expect.objectContaining({
            sku: 'FIM-DRE-002-BLAC-ME',
            productName: 'Business A Second Dress',
            availableStock: 8,
          }),
          expect.objectContaining({
            sku: 'FIM-DRE-003-BLAC-ME',
            productName: 'Business A Third Dress',
            availableStock: 6,
          }),
        ]),
      );

      expect(responseB.body.data[0]).toMatchObject({
        sku,
        productName: 'Business B Dress',
        availableStock: 3,
        stockStatus: 'low_stock',
      });

      const searchFromBusinessA = await request(app.getHttpServer())
        .get('/api/inventory')
        .query({ search: 'Business B Dress' })
        .set('Authorization', `Bearer ${token}`)
        .set('X-Business-Id', businessAId)
        .expect(200);

      expect(searchFromBusinessA.body.data).toEqual([]);
      expect(searchFromBusinessA.body.meta.totalItems).toBe(0);

      const searchFromBusinessB = await request(app.getHttpServer())
        .get('/api/inventory')
        .query({ search: 'Business B Dress' })
        .set('Authorization', `Bearer ${token}`)
        .set('X-Business-Id', businessBId)
        .expect(200);

      expect(searchFromBusinessB.body.meta.totalItems).toBe(1);
      expect(searchFromBusinessB.body.data).toHaveLength(1);
      expect(searchFromBusinessB.body.data[0]).toMatchObject({
        sku,
        productName: 'Business B Dress',
        availableStock: 3,
        stockStatus: 'low_stock',
      });

      for (const stockStatus of ['low_stock', 'out_of_stock']) {
        const filteredResponse = await request(app.getHttpServer())
          .get('/api/inventory')
          .query({ stockStatus })
          .set('Authorization', `Bearer ${token}`)
          .set('X-Business-Id', businessAId)
          .expect(200);

        expect(filteredResponse.body.data).toEqual([]);
        expect(filteredResponse.body.meta.totalItems).toBe(0);
      }

      const inStockResponse = await request(app.getHttpServer())
        .get('/api/inventory')
        .query({ stockStatus: 'in_stock' })
        .set('Authorization', `Bearer ${token}`)
        .set('X-Business-Id', businessAId)
        .expect(200);

      expect(inStockResponse.body.meta.totalItems).toBe(3);
      expect(inStockResponse.body.data).toHaveLength(3);
      expect(
        inStockResponse.body.data.every(
          (item: { stockStatus: string }) => item.stockStatus === 'in_stock',
        ),
      ).toBe(true);

      const pageTwoA = await request(app.getHttpServer())
        .get('/api/inventory')
        .query({ page: 2, limit: 1 })
        .set('Authorization', `Bearer ${token}`)
        .set('X-Business-Id', businessAId)
        .expect(200);

      expect(pageTwoA.body.meta).toMatchObject({
        page: 2,
        limit: 1,
        totalItems: 3,
        totalPages: 3,
      });
      expect(pageTwoA.body.data).toHaveLength(1);
      expect(pageTwoA.body.data[0].productName).toMatch(/^Business A /);

      const pageTwoB = await request(app.getHttpServer())
        .get('/api/inventory')
        .query({ page: 2, limit: 1 })
        .set('Authorization', `Bearer ${token}`)
        .set('X-Business-Id', businessBId)
        .expect(200);

      expect(pageTwoB.body.data).toEqual([]);
      expect(pageTwoB.body.meta).toMatchObject({
        page: 2,
        limit: 1,
        totalItems: 1,
        totalPages: 1,
      });

      const invalidQueries = [
        { page: 0 },
        { page: -1 },
        { page: 'abc' },
        { limit: 0 },
        { limit: 101 },
        { limit: 'abc' },
        { stockStatus: 'invalid_status' },
        { unknownParameter: 'value' },
      ];

      for (const invalidQuery of invalidQueries) {
        await request(app.getHttpServer())
          .get('/api/inventory')
          .query(invalidQuery)
          .set('Authorization', `Bearer ${token}`)
          .set('X-Business-Id', businessAId)
          .expect(400);
      }
    } finally {
      await dataSource.query(
        'DELETE FROM inventory_skus WHERE business_id IN ($1, $2)',
        [businessAId, businessBId],
      );
      await dataSource.query(
        'DELETE FROM business_memberships WHERE user_id = $1',
        [userId],
      );
      await dataSource.query('DELETE FROM users WHERE id = $1', [userId]);
      await dataSource.query(
        'DELETE FROM businesses WHERE id IN ($1, $2)',
        [businessAId, businessBId],
      );
    }
  });

  it('rejects valid JWTs without a business header', async () => {
    const token = await createTestJwt(randomUUID());

    await request(app.getHttpServer())
      .post('/api/inventory-import/import-opening-balance')
      .set('Authorization', `Bearer ${token}`)
      .expect(401);
  });

  it.each([
    'not-a-uuid',
    '12345',
    '00000000-0000-0000-0000-000000000000',
  ])('rejects invalid business header %s', async (businessId) => {
    const token = await createTestJwt(randomUUID());

    await request(app.getHttpServer())
      .post('/api/inventory-import/import-opening-balance')
      .set('Authorization', `Bearer ${token}`)
      .set('X-Business-Id', businessId)
      .expect(401);
  });

  it('rejects valid JWTs without business membership', async () => {
    const userId = randomUUID();
    const businessId = randomUUID();

    try {
      await dataSource.query(
        `INSERT INTO users (id, email, status)
         VALUES ($1, $2, 'active')`,
        [userId, `http-test-${userId}@example.invalid`],
      );

      await dataSource.query(
        `INSERT INTO businesses (id, name, slug, status)
         VALUES ($1, $2, $3, 'active')`,
        [businessId, 'HTTP Membership Test', `http-test-${businessId}`],
      );

      const token = await createTestJwt(userId);

      const response = await request(app.getHttpServer())
        .post('/api/inventory-import/import-opening-balance')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Business-Id', businessId)
        .expect(401);

      expect(response.body.message).toBe('Business membership required');
    } finally {
      await dataSource.query(
        'DELETE FROM business_memberships WHERE user_id = $1 AND business_id = $2',
        [userId, businessId],
      );
      await dataSource.query('DELETE FROM users WHERE id = $1', [userId]);
      await dataSource.query('DELETE FROM businesses WHERE id = $1', [businessId]);
    }
  });

  it.each([
    ['viewer', 'Insufficient permissions for this operation'],
    ['operator', 'Insufficient permissions for this operation'],
    ['owner', 'Opening-balance imports are temporarily disabled until business authorization is implemented.'],
    ['admin', 'Opening-balance imports are temporarily disabled until business authorization is implemented.'],
    ['inventory_manager', 'Opening-balance imports are temporarily disabled until business authorization is implemented.'],
  ])('enforces import authorization for %s', async (role, expectedMessage) => {
    const userId = randomUUID();
    const businessId = randomUUID();

    try {
      await dataSource.query(
        `INSERT INTO users (id, email, status)
         VALUES ($1, $2, 'active')`,
        [userId, `http-test-${userId}@example.invalid`],
      );

      await dataSource.query(
        `INSERT INTO businesses (id, name, slug, status)
         VALUES ($1, $2, $3, 'active')`,
        [businessId, 'HTTP Viewer Test', `http-test-${businessId}`],
      );

      await dataSource.query(
        `INSERT INTO business_memberships (business_id, user_id, role)
         VALUES ($1, $2, $3)`,
        [businessId, userId, role],
      );

      const token = await createTestJwt(userId);

      const response = await request(app.getHttpServer())
        .post('/api/inventory-import/import-opening-balance')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Business-Id', businessId)
        .expect(403);

      expect(response.body.message).toBe(expectedMessage);
    } finally {
      await dataSource.query(
        'DELETE FROM business_memberships WHERE user_id = $1 AND business_id = $2',
        [userId, businessId],
      );
      await dataSource.query('DELETE FROM users WHERE id = $1', [userId]);
      await dataSource.query('DELETE FROM businesses WHERE id = $1', [businessId]);
    }
  });

  it('keeps imports blocked when the feature flag is disabled', async () => {
    const userId = randomUUID();
    const businessId = randomUUID();
    const previousFlag = process.env.ENABLE_OPENING_BALANCE_IMPORT;

    try {
      await dataSource.query(
        `INSERT INTO users (id, email, status)
         VALUES ($1, $2, 'active')`,
        [userId, `http-test-${userId}@example.invalid`],
      );

      await dataSource.query(
        `INSERT INTO businesses (id, name, slug, status)
         VALUES ($1, $2, $3, 'active')`,
        [businessId, 'Import Flag HTTP Test', `http-test-${businessId}`],
      );

      await dataSource.query(
        `INSERT INTO business_memberships (business_id, user_id, role)
         VALUES ($1, $2, 'owner')`,
        [businessId, userId],
      );

      process.env.ENABLE_OPENING_BALANCE_IMPORT = 'false';

      const token = await createTestJwt(userId);

      const response = await request(app.getHttpServer())
        .post('/api/inventory-import/import-opening-balance')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Business-Id', businessId)
        .expect(403);

      expect(response.body.message).toBe(
        'Opening-balance imports are temporarily disabled until business authorization is implemented.',
      );

      const inventory: Array<{ count: number }> = await dataSource.query(
        'SELECT COUNT(*)::int AS count FROM inventory_skus WHERE business_id = $1',
        [businessId],
      );

      expect(inventory[0].count).toBe(0);
    } finally {
      if (previousFlag === undefined) {
        delete process.env.ENABLE_OPENING_BALANCE_IMPORT;
      } else {
        process.env.ENABLE_OPENING_BALANCE_IMPORT = previousFlag;
      }

      await dataSource.query(
        'DELETE FROM business_memberships WHERE user_id = $1 AND business_id = $2',
        [userId, businessId],
      );
      await dataSource.query('DELETE FROM users WHERE id = $1', [userId]);
      await dataSource.query(
        'DELETE FROM businesses WHERE id = $1',
        [businessId],
      );
    }
  });

  it('rejects disabled users despite valid JWTs and membership', async () => {
    const userId = randomUUID();
    const businessId = randomUUID();

    try {
      await dataSource.query(
        `INSERT INTO users (id, email, status)
         VALUES ($1, $2, 'disabled')`,
        [userId, `http-test-${userId}@example.invalid`],
      );

      await dataSource.query(
        `INSERT INTO businesses (id, name, slug, status)
         VALUES ($1, $2, $3, 'active')`,
        [businessId, 'Disabled User Test', `http-test-${businessId}`],
      );

      await dataSource.query(
        `INSERT INTO business_memberships (business_id, user_id, role)
         VALUES ($1, $2, 'owner')`,
        [businessId, userId],
      );

      const token = await createTestJwt(userId);

      const response = await request(app.getHttpServer())
        .post('/api/inventory-import/import-opening-balance')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Business-Id', businessId)
        .expect(401);

      expect(response.body.message).toBe('User is not active');
    } finally {
      await dataSource.query(
        'DELETE FROM business_memberships WHERE user_id = $1 AND business_id = $2',
        [userId, businessId],
      );
      await dataSource.query('DELETE FROM users WHERE id = $1', [userId]);
      await dataSource.query('DELETE FROM businesses WHERE id = $1', [businessId]);
    }
  });

  it('rejects suspended businesses despite valid owner membership', async () => {
    const userId = randomUUID();
    const businessId = randomUUID();

    try {
      await dataSource.query(
        `INSERT INTO users (id, email, status)
         VALUES ($1, $2, 'active')`,
        [userId, `http-test-${userId}@example.invalid`],
      );

      await dataSource.query(
        `INSERT INTO businesses (id, name, slug, status)
         VALUES ($1, $2, $3, 'suspended')`,
        [businessId, 'Suspended Business Test', `http-test-${businessId}`],
      );

      await dataSource.query(
        `INSERT INTO business_memberships (business_id, user_id, role)
         VALUES ($1, $2, 'owner')`,
        [businessId, userId],
      );

      const token = await createTestJwt(userId);

      const response = await request(app.getHttpServer())
        .post('/api/inventory-import/import-opening-balance')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Business-Id', businessId)
        .expect(401);

      expect(response.body.message).toBe('Business is not active');
    } finally {
      await dataSource.query(
        'DELETE FROM business_memberships WHERE user_id = $1 AND business_id = $2',
        [userId, businessId],
      );
      await dataSource.query('DELETE FROM users WHERE id = $1', [userId]);
      await dataSource.query('DELETE FROM businesses WHERE id = $1', [businessId]);
    }
  });

  it('rejects archived businesses despite valid owner membership', async () => {
    const userId = randomUUID();
    const businessId = randomUUID();

    try {
      await dataSource.query(
        `INSERT INTO users (id, email, status)
         VALUES ($1, $2, 'active')`,
        [userId, `http-test-${userId}@example.invalid`],
      );

      await dataSource.query(
        `INSERT INTO businesses (id, name, slug, status)
         VALUES ($1, $2, $3, 'archived')`,
        [businessId, 'Archived Business Test', `http-test-${businessId}`],
      );

      await dataSource.query(
        `INSERT INTO business_memberships (business_id, user_id, role)
         VALUES ($1, $2, 'owner')`,
        [businessId, userId],
      );

      const token = await createTestJwt(userId);

      const response = await request(app.getHttpServer())
        .post('/api/inventory-import/import-opening-balance')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Business-Id', businessId)
        .expect(401);

      expect(response.body.message).toBe('Business is not active');
    } finally {
      await dataSource.query(
        'DELETE FROM business_memberships WHERE user_id = $1 AND business_id = $2',
        [userId, businessId],
      );
      await dataSource.query('DELETE FROM users WHERE id = $1', [userId]);
      await dataSource.query('DELETE FROM businesses WHERE id = $1', [businessId]);
    }
  });

  it('prevents an owner of Business A from accessing Business B', async () => {
    const userId = randomUUID();
    const businessAId = randomUUID();
    const businessBId = randomUUID();

    try {
      await dataSource.query(
        `INSERT INTO users (id, email, status)
         VALUES ($1, $2, 'active')`,
        [userId, `http-test-${userId}@example.invalid`],
      );

      await dataSource.query(
        `INSERT INTO businesses (id, name, slug, status)
         VALUES
           ($1, 'HTTP Business A', $3, 'active'),
           ($2, 'HTTP Business B', $4, 'active')`,
        [
          businessAId,
          businessBId,
          `http-test-${businessAId}`,
          `http-test-${businessBId}`,
        ],
      );

      await dataSource.query(
        `INSERT INTO business_memberships (business_id, user_id, role)
         VALUES ($1, $2, 'owner')`,
        [businessAId, userId],
      );

      const token = await createTestJwt(userId);

      const authorizedResponse = await request(app.getHttpServer())
        .post('/api/inventory-import/import-opening-balance')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Business-Id', businessAId)
        .expect(403);

      expect(authorizedResponse.body.message).toBe(
        'Opening-balance imports are temporarily disabled until business authorization is implemented.',
      );

      const unauthorizedResponse = await request(app.getHttpServer())
        .post('/api/inventory-import/import-opening-balance')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Business-Id', businessBId)
        .expect(401);

      expect(unauthorizedResponse.body.message).toBe(
        'Business membership required',
      );
    } finally {
      await dataSource.query(
        'DELETE FROM business_memberships WHERE user_id = $1 AND business_id = $2',
        [userId, businessAId],
      );
      await dataSource.query('DELETE FROM users WHERE id = $1', [userId]);
      await dataSource.query(
        'DELETE FROM businesses WHERE id IN ($1, $2)',
        [businessAId, businessBId],
      );
    }
  });


  it('imports opening balances for an authenticated business owner', async () => {
    const userId = randomUUID();
    const businessId = randomUUID();
    const previousFlag = process.env.ENABLE_OPENING_BALANCE_IMPORT;

    try {
      await dataSource.query(
        `INSERT INTO users (id, email, status)
         VALUES ($1, $2, 'active')`,
        [userId, `http-test-${userId}@example.invalid`],
      );

      await dataSource.query(
        `INSERT INTO businesses (id, name, slug, status)
         VALUES ($1, $2, $3, 'active')`,
        [businessId, 'Authorized Import HTTP Test', `http-test-${businessId}`],
      );

      await dataSource.query(
        `INSERT INTO business_memberships (business_id, user_id, role)
         VALUES ($1, $2, 'owner')`,
        [businessId, userId],
      );

      process.env.ENABLE_OPENING_BALANCE_IMPORT = 'true';

      const token = await createTestJwt(userId);

      const response = await request(app.getHttpServer())
        .post('/api/inventory-import/import-opening-balance')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Business-Id', businessId)
        .expect(201);

      expect(response.body).toMatchObject({
        status: 'success',
        businessId,
        importedSkuCount: 2,
        totalAvailableStock: 15,
        movementRowsCreated: 2,
      });

      const counts: Array<{
        skus: number;
        movements: number;
        imports: number;
      }> = await dataSource.query(
        `SELECT
          (SELECT COUNT(*)::int FROM inventory_skus WHERE business_id = $1) AS skus,
          (SELECT COUNT(*)::int FROM inventory_movements WHERE business_id = $1) AS movements,
          (SELECT COUNT(*)::int FROM inventory_opening_balance_imports WHERE business_id = $1) AS imports`,
        [businessId],
      );

      expect(counts[0]).toEqual({
        skus: 2,
        movements: 2,
        imports: 1,
      });
    } finally {
      if (previousFlag === undefined) {
        delete process.env.ENABLE_OPENING_BALANCE_IMPORT;
      } else {
        process.env.ENABLE_OPENING_BALANCE_IMPORT = previousFlag;
      }

      await cleanupHttpImportTestData(dataSource, businessId, userId);
    }
  });

  it('prevents duplicate opening-balance imports over HTTP', async () => {
    const userId = randomUUID();
    const businessId = randomUUID();
    const previousFlag = process.env.ENABLE_OPENING_BALANCE_IMPORT;

    try {
      await dataSource.query(
        `INSERT INTO users (id, email, status)
         VALUES ($1, $2, 'active')`,
        [userId, `http-test-${userId}@example.invalid`],
      );

      await dataSource.query(
        `INSERT INTO businesses (id, name, slug, status)
         VALUES ($1, $2, $3, 'active')`,
        [businessId, 'Duplicate Import HTTP Test', `http-test-${businessId}`],
      );

      await dataSource.query(
        `INSERT INTO business_memberships (business_id, user_id, role)
         VALUES ($1, $2, 'owner')`,
        [businessId, userId],
      );

      process.env.ENABLE_OPENING_BALANCE_IMPORT = 'true';

      const token = await createTestJwt(userId);

      const firstResponse = await request(app.getHttpServer())
        .post('/api/inventory-import/import-opening-balance')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Business-Id', businessId)
        .expect(201);

      expect(firstResponse.body).toMatchObject({
        status: 'success',
        businessId,
        importedSkuCount: 2,
        totalAvailableStock: 15,
      });

      const secondResponse = await request(app.getHttpServer())
        .post('/api/inventory-import/import-opening-balance')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Business-Id', businessId)
        .expect(409);

      expect(secondResponse.body.message).toContain(
        'already contains inventory or an opening-balance import',
      );

      const counts: Array<{
        skus: number;
        movements: number;
        imports: number;
      }> = await dataSource.query(
        `SELECT
          (SELECT COUNT(*)::int FROM inventory_skus WHERE business_id = $1) AS skus,
          (SELECT COUNT(*)::int FROM inventory_movements WHERE business_id = $1) AS movements,
          (SELECT COUNT(*)::int FROM inventory_opening_balance_imports WHERE business_id = $1) AS imports`,
        [businessId],
      );

      expect(counts[0]).toEqual({
        skus: 2,
        movements: 2,
        imports: 1,
      });
    } finally {
      if (previousFlag === undefined) {
        delete process.env.ENABLE_OPENING_BALANCE_IMPORT;
      } else {
        process.env.ENABLE_OPENING_BALANCE_IMPORT = previousFlag;
      }

      await cleanupHttpImportTestData(dataSource, businessId, userId);
    }
  });

  it('isolates opening-balance imports between two businesses over HTTP', async () => {
    const userAId = randomUUID();
    const userBId = randomUUID();
    const businessAId = randomUUID();
    const businessBId = randomUUID();
    const previousFlag = process.env.ENABLE_OPENING_BALANCE_IMPORT;

    try {
      await dataSource.query(
        `INSERT INTO users (id, email, status)
         VALUES
           ($1, $3, 'active'),
           ($2, $4, 'active')`,
        [
          userAId,
          userBId,
          `http-test-${userAId}@example.invalid`,
          `http-test-${userBId}@example.invalid`,
        ],
      );

      await dataSource.query(
        `INSERT INTO businesses (id, name, slug, status)
         VALUES
           ($1, 'Import Isolation A', $3, 'active'),
           ($2, 'Import Isolation B', $4, 'active')`,
        [
          businessAId,
          businessBId,
          `http-test-${businessAId}`,
          `http-test-${businessBId}`,
        ],
      );

      await dataSource.query(
        `INSERT INTO business_memberships (business_id, user_id, role)
         VALUES
           ($1, $3, 'owner'),
           ($2, $4, 'owner')`,
        [businessAId, businessBId, userAId, userBId],
      );

      process.env.ENABLE_OPENING_BALANCE_IMPORT = 'true';

      const tokenA = await createTestJwt(userAId);
      const tokenB = await createTestJwt(userBId);

      const responseA = await request(app.getHttpServer())
        .post('/api/inventory-import/import-opening-balance')
        .set('Authorization', `Bearer ${tokenA}`)
        .set('X-Business-Id', businessAId)
        .expect(201);

      expect(responseA.body).toMatchObject({
        status: 'success',
        businessId: businessAId,
        importedSkuCount: 2,
        totalAvailableStock: 15,
        movementRowsCreated: 2,
      });

      const responseB = await request(app.getHttpServer())
        .post('/api/inventory-import/import-opening-balance')
        .set('Authorization', `Bearer ${tokenB}`)
        .set('X-Business-Id', businessBId)
        .expect(201);

      expect(responseB.body).toMatchObject({
        status: 'success',
        businessId: businessBId,
        importedSkuCount: 2,
        totalAvailableStock: 15,
        movementRowsCreated: 2,
      });

      await request(app.getHttpServer())
        .post('/api/inventory-import/import-opening-balance')
        .set('Authorization', `Bearer ${tokenA}`)
        .set('X-Business-Id', businessBId)
        .expect(401);

      const verifyBusinessInventory = async (businessId: string) => {
        const rows: Array<{
          skus: number;
          stock: number;
          movements: number;
        }> = await dataSource.query(
          `SELECT
             (SELECT COUNT(*)::int FROM inventory_skus
              WHERE business_id = $1) AS skus,
             (SELECT COALESCE(SUM(available_stock), 0)::int
              FROM inventory_skus WHERE business_id = $1) AS stock,
             (SELECT COUNT(*)::int FROM inventory_movements
              WHERE business_id = $1) AS movements`,
          [businessId],
        );

        expect(rows[0]).toEqual({
          skus: 2,
          stock: 15,
          movements: 2,
        });

        const imports: Array<{ count: number }> = await dataSource.query(
          `SELECT COUNT(*)::int AS count
           FROM inventory_opening_balance_imports
           WHERE business_id = $1`,
          [businessId],
        );

        expect(imports[0].count).toBe(1);
      };

      await verifyBusinessInventory(businessAId);
      await verifyBusinessInventory(businessBId);

      // A second import into Business A must be rejected.
      await request(app.getHttpServer())
        .post('/api/inventory-import/import-opening-balance')
        .set('Authorization', `Bearer ${tokenA}`)
        .set('X-Business-Id', businessAId)
        .expect(409);

      // Neither business should be affected by the rejected import.
      await verifyBusinessInventory(businessAId);
      await verifyBusinessInventory(businessBId);

    } finally {
      // Restore the original feature-flag value.
      if (previousFlag === undefined) {
        delete process.env.ENABLE_OPENING_BALANCE_IMPORT;
      } else {
        process.env.ENABLE_OPENING_BALANCE_IMPORT = previousFlag;
      }

      // Remove synthetic records from the isolated test database.
      await cleanupHttpImportTestData(
        dataSource,
        businessAId,
        userAId,
      );

      await cleanupHttpImportTestData(
        dataSource,
        businessBId,
        userBId,
      );
    }
  });


  it('rejects expired JWTs', async () => {
    const secret = process.env.JWT_SECRET;

    if (!secret || secret.length < 64) {
      throw new Error('Integration-test JWT secret is missing or invalid.');
    }

    const jwtService = new JwtService({
      secret,
      signOptions: { algorithm: 'HS256' },
    });

    const expiredToken = await jwtService.signAsync({
      sub: randomUUID(),
      iat: Math.floor(Date.now() / 1000) - 3600,
      exp: Math.floor(Date.now() / 1000) - 60,
    });

    await request(app.getHttpServer())
      .post('/api/inventory-import/import-opening-balance')
      .set('Authorization', `Bearer ${expiredToken}`)
      .set('X-Business-Id', randomUUID())
      .expect(401);
  });

  it('rejects invalid JWTs', async () => {
    await request(app.getHttpServer())
      .post('/api/inventory-import/import-opening-balance')
      .set('Authorization', 'Bearer invalid-test-token')
      .set('X-Business-Id', '00000000-0000-4000-8000-000000000001')
      .expect(401);
  });
});
