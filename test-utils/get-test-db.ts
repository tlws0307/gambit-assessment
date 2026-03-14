import {
	PostgreSqlContainer,
	type StartedPostgreSqlContainer,
} from "@testcontainers/postgresql";
import { drizzle as drizzlePgLite } from "drizzle-orm/pglite";
import { afterAll } from "vitest";
import { createPgClient, DrizzlePgPool, type DrizzlePgClient } from "./database/client";
import { createPgMigrator } from "./database/migrator";
import { createPgSeeder, type SeedConfig } from "./database/seed";

type TestDBConfig = {
	migrationsDir?: string;
	/**
	 * The type of database instance to create.
	 *
	 * Defaults to `"pglite"`.
	 *
	 * - `"pglite"`: Starts up instantly, a Postgres-compatible instance that uses emphimeral in-memory storage.
	 * - `"postgres"`: Starts up a real Postgres instance and connects to it.
	 *
	 * @note
	 * `"pglite"` (default) uses a single-user mode similar to a real Postgres single-user mode.
	 * This means that it does not support multiple concurrent connections, and is not suitable
	 * for testing scenarios that require multiple connections or advanced Postgres features.
	 * If your tests require a more realistic Postgres environment, consider using the `"postgres"` option,
	 * which starts a real Postgres instance in a Docker container.
	 */
	instance?: "pglite" | "postgres" | "remote";
	seedConfig?: SeedConfig;
	name?: string;
};

export async function getClient(config: TestDBConfig = {}) {
	let db: DrizzlePgClient;
	let pgContainer: StartedPostgreSqlContainer | undefined;

	db = createPgClient("client", {
		pg: {
			host: "13.251.188.218",
			port: 5432,
			user: "tommy",
			password: "CWwePAZx1hhFaK8vSIy1",
			database: "mydb",
			ssl: false,	
		},
		casing: "snake_case",
	});

	await db.$client.connect();
	return db;
}

/**
 * Creates and returns a test database client with optional seeding.
 */
export async function getTestDB(config: TestDBConfig = {}) {
	let db: DrizzlePgClient | DrizzlePgPool;
	let pgContainer: StartedPostgreSqlContainer | undefined;

	if (config.instance === "remote") {
		db = createPgClient("client", {
			pg: {
				host: "13.251.188.218",
				port: 5432,
				user: "tommy",
				password: "CWwePAZx1hhFaK8vSIy1",
				database: "mydb",
				ssl: false,	
				// max: 200,
				// min: 1,
			},
			casing: "snake_case",
		});
		await db.$client.connect();
	} else if (config.instance === "postgres") {
		pgContainer = await new PostgreSqlContainer(
			"postgres:18-alpine",
		).start();

		db = createPgClient("client", {
			pg: {
				connectionString: pgContainer.getConnectionUri(),
				ssl: false,
			},
			casing: "snake_case",
		});

		await db.$client.connect();
	} else {
		db = drizzlePgLite({
			casing: "snake_case",
		}) as any;
	}

	if (config.instance !== 'remote') {
		const migrator = createPgMigrator(db, {
			migrationsFolder: config.migrationsDir ?? "./migrations",
		});
		await migrator.migrate();

		if (config.seedConfig) {
			const seeder = createPgSeeder(config.seedConfig);
			await seeder.run(db, {
				seedTests: true,
			});
		}
	}

	afterAll(async () => {
		// close the db connection
		if (pgContainer) {
			await db.$client.end().catch(() => {
				/* ignore */
			});
		}
		// stop the postgres container
		await pgContainer?.stop().catch(() => {
			/* ignore */
		});
	});

	return { $db: db };
}
