import { createTestDataSource } from './helpers/create-test-data-source';

describe('PostgreSQL integration-test connection', () => {
  it('connects exclusively to the designated test database', async () => {
    const dataSource = createTestDataSource();

    try {
      await dataSource.initialize();

      const rows: Array<{
        database_name: string;
        database_user: string;
      }> = await dataSource.query(
        'SELECT current_database() AS database_name, current_user AS database_user',
      );

      expect(rows).toHaveLength(1);
      expect(rows[0].database_name).toBe(
        'fimonaa_commerce_import_test',
      );
      expect(rows[0].database_user).toBe('fimonaa');
    } finally {
      if (dataSource.isInitialized) {
        await dataSource.destroy();
      }
    }
  });
});
