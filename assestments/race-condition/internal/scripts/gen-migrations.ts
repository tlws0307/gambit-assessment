import path from "node:path";
import { fileURLToPath } from "node:url";
import { generateMigrations } from "../../../../test-utils/database/generate-migrations";
import * as schema from "../schema";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationsDir = path.resolve(__dirname, "../migrations");

const main = async () => {
	await generateMigrations(schema, migrationsDir);
};

main().catch((err) => {
	console.error("Error generating migrations:", err);
	process.exit(1);
});
