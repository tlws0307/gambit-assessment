import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { getRandomTag } from "../get-random-tag";

const require = createRequire(import.meta.url);
const { generateDrizzleJson, generateMigration: generateDrizzleMigration } =
	require("drizzle-kit/api") as typeof import("drizzle-kit/api");

export const generateMigrations = async (
	schema: Record<string, any>,
	output: string,
) => {
	const migrationsDir = path.resolve(output);
	const metaDir = path.join(migrationsDir, "meta");
	const snapshot = generateDrizzleJson(
		schema,
		"00000000-0000-0000-0000-000000000000",
		undefined,
		"snake_case",
	);
	const sqlStatements = await generateDrizzleMigration(
		generateDrizzleJson({}),
		snapshot,
	);

	// remove all contents of the migrations directory
	await rm(migrationsDir, { recursive: true, force: true });

	// ensure the migrations and meta directories exist
	await mkdir(migrationsDir, { recursive: true });
	await mkdir(metaDir, { recursive: true });

	const date = new Date();
	const formattedDate = [
		date.getFullYear(),
		String(date.getMonth() + 1).padStart(2, "0"),
		String(date.getDate()).padStart(2, "0"),
		String(date.getHours()).padStart(2, "0"),
		String(date.getMinutes()).padStart(2, "0"),
		String(date.getSeconds()).padStart(2, "0"),
	].join("");

	const tag = [formattedDate, getRandomTag()].join("_");

	const hasMigrations = !!sqlStatements.length;

	await Promise.all([
		hasMigrations
			? writeMigrationSql(sqlStatements, tag, migrationsDir)
			: Promise.resolve(),
		hasMigrations
			? writeMigrationSnapshot(snapshot, tag, migrationsDir)
			: Promise.resolve(),
		hasMigrations
			? writeJournalEntry(tag, migrationsDir)
			: Promise.resolve(),
	]);
};

export const writeMigrationSql = async (
	sqlStatements: string[],
	tag: string,
	migrationsDir: string,
) => {
	await mkdir(migrationsDir, { recursive: true });
	const filePath = path.join(migrationsDir, `${tag}.sql`);
	await writeFile(filePath, sqlStatements.join("--> statement-breakpoint\n"));
};

const writeMigrationSnapshot = async (
	schemaSnapshot: Record<string, any>,
	tag: string,
	migrationsDir: string,
) => {
	const metaDir = path.join(migrationsDir, "meta");
	await mkdir(migrationsDir, { recursive: true });
	await mkdir(metaDir, { recursive: true });
	const timestamp = tag.split("_")[0];
	const filePath = path.join(metaDir, `${timestamp}_snapshot.json`);
	await writeFile(filePath, JSON.stringify(schemaSnapshot, null, "\t"));
};

export const writeJournalEntry = async (tag: string, migrationsDir: string) => {
	const metaDir = path.join(migrationsDir, "meta");
	await mkdir(metaDir, { recursive: true });
	const journalPath = path.join(metaDir, "_journal.json");

	let journal = {
		version: "7",
		dialect: "postgresql",
		entries: [] as {
			idx: number;
			version: string;
			when: number;
			tag: string;
			breakpoints: boolean;
		}[],
	};

	try {
		const data = await readFile(journalPath, "utf8");
		journal = JSON.parse(data);
	} catch {
		// file doesn't exist or can't be read, use default journal
	}

	const timestamp = Date.now();

	const newEntry = {
		idx: journal.entries.length,
		version: journal.version,
		when: timestamp,
		tag,
		breakpoints: true,
	};

	journal.entries.push(newEntry);

	await writeFile(journalPath, JSON.stringify(journal, null, "\t"));
};
