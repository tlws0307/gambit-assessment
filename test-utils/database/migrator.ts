import { migrate } from "drizzle-orm/node-postgres/migrator";
import type { DrizzlePgDatabase } from "./client";

export function createPgMigrator(
	db: DrizzlePgDatabase,
	{ migrationsFolder }: { migrationsFolder: string },
) {
	return {
		migrate: async () => await migrate(db, { migrationsFolder }),
	};
}

export type DrizzlePgMigrator = ReturnType<typeof createPgMigrator>;
