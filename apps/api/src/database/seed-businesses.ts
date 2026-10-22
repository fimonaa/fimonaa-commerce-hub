import dataSource from './data-source';

/**
 * Creates the initial business workspaces.
 *
 * This is deliberately separate from database migrations:
 * migrations define the schema, while this seed creates initial data.
 *
 * Existing business records are not overwritten. This makes the script
 * safe to rerun without silently changing business names or statuses.
 */
async function seedBusinesses(): Promise<void> {
  await dataSource.initialize();

  try {
    await dataSource.transaction(async (manager) => {
      const businesses = [
        {
          name: 'Fimonaa India',
          slug: 'fimonaa-india',
        },
        {
          name: 'Fimonaa Finland',
          slug: 'fimonaa-finland',
        },
      ];

      for (const business of businesses) {
        // A stable slug identifies a business across repeated seed runs.
        // DO NOTHING prevents accidental overwrites of existing records.
        await manager.query(
          `
            INSERT INTO businesses (name, slug)
            VALUES ($1, $2)
            ON CONFLICT (slug) DO NOTHING
          `,
          [business.name, business.slug],
        );
      }

      // Verify that the expected slugs exist with the correct names.
      // If a conflicting record has unexpected details, fail instead of
      // silently accepting a potentially incorrect business configuration.
      for (const business of businesses) {
        const rows: Array<{ name: string; slug: string }> =
          await manager.query(
            `
              SELECT name, slug
              FROM businesses
              WHERE slug = $1
            `,
            [business.slug],
          );

        if (
          rows.length !== 1 ||
          rows[0].name !== business.name
        ) {
          throw new Error(
            `Business seed verification failed for "${business.slug}". ` +
              'Inspect the existing record before retrying.',
          );
        }
      }
    });

    console.log(
      'Business seed completed. Both expected business records are present.',
    );
  } finally {
    // Close the connection even if seeding or verification fails.
    await dataSource.destroy();
  }
}

seedBusinesses().catch((error: unknown) => {
  console.error('Business seed failed:', error);
  process.exitCode = 1;
});