import { createDevelopmentInventoryFixtures } from '../development-inventory.fixtures';

describe('Development inventory fixtures', () => {
  const fixtures = createDevelopmentInventoryFixtures();

  it('generates exactly 45 synthetic inventory records', () => {
    expect(fixtures).toHaveLength(45);
  });

  it('assigns the expected number of records to each business', () => {
    const demoA = fixtures.filter(
      (item) => item.businessSlug === 'commerce-demo-a',
    );

    const demoB = fixtures.filter(
      (item) => item.businessSlug === 'commerce-demo-b',
    );

    expect(demoA).toHaveLength(35);
    expect(demoB).toHaveLength(10);
  });

  it.each([
    ['commerce-demo-a', 22, 8, 5],
    ['commerce-demo-b', 6, 2, 2],
  ])(
    'generates the correct stock distribution for %s',
    (businessSlug, expectedInStock, expectedLowStock, expectedOutOfStock) => {
      const records = fixtures.filter(
        (item) => item.businessSlug === businessSlug,
      );

      expect(records.filter((item) => item.availableStock > 5)).toHaveLength(
        expectedInStock,
      );

      expect(
        records.filter(
          (item) => item.availableStock >= 1 && item.availableStock <= 5,
        ),
      ).toHaveLength(expectedLowStock);

      expect(records.filter((item) => item.availableStock === 0)).toHaveLength(
        expectedOutOfStock,
      );
    },
  );

  it('does not generate duplicate SKUs within a business', () => {
    const identifiers = fixtures.map(
      (item) => `${item.businessSlug}:${item.sku}`,
    );

    expect(new Set(identifiers).size).toBe(fixtures.length);
  });

  it('allows identical SKU codes across different businesses', () => {
    const matchingRecords = fixtures.filter(
      (item) => item.sku === 'DEMO-SKU-001',
    );

    expect(matchingRecords).toHaveLength(2);

    expect(
      new Set(matchingRecords.map((item) => item.businessSlug)).size,
    ).toBe(2);
  });

  it('generates valid nonnegative stock quantities', () => {
    for (const item of fixtures) {
      expect(item.availableStock).toBeGreaterThanOrEqual(0);
      expect(item.initialStock).toBeGreaterThanOrEqual(
        item.availableStock,
      );
    }
  });

  it('uses clearly identified development fixture metadata', () => {
    for (const item of fixtures) {
      expect(item.sku).toMatch(/^DEMO-SKU-\d{3}$/);
      expect(item.productName).toMatch(/^Demo [AB] Product \d{3}$/);
      expect(item.sourceSheet).toBe('Development Fixture');
      expect(item.sourceRow).toBeGreaterThan(0);
    }
  });

  it('produces the same records on repeated calls', () => {
    expect(createDevelopmentInventoryFixtures()).toEqual(
      createDevelopmentInventoryFixtures(),
    );
  });
});
