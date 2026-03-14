import type { DrizzleConfig, Simplify } from "drizzle-orm";
import type {
	NodePgDatabase,
	NodePgTransaction,
} from "drizzle-orm/node-postgres";
import { drizzle } from "drizzle-orm/node-postgres";
import type { Client, ClientConfig, Pool, PoolConfig } from "pg";
import pg from "pg";

export type DrizzlePgPool = NodePgDatabase<any> & { $client: Pool };
export type DrizzlePgClient = NodePgDatabase<any> & { $client: Client };

export type DrizzlePgDatabase = DrizzlePgPool | DrizzlePgClient;
export type DrizzlePgTransaction = NodePgTransaction<any, any>;

export const createPgClient = <T extends "client" | "pool">(
	type: T,
	config: Simplify<
		DrizzleConfig &
			(T extends "client" ? { pg: ClientConfig } : { pg: PoolConfig })
	>,
): T extends "client"
	? NodePgDatabase<any> & { $client: Client }
	: NodePgDatabase<any> & { $client: Pool } => {
	if (type === "client") {
		const client = new pg.Client(config.pg);
		return drizzle(client, {
			casing: "camelCase",
			...config,
			pg: undefined,
		}) as any;
	}
	const client = new pg.Pool(config.pg);
	return drizzle(client, {
		casing: "camelCase",
		...config,
		pg: undefined,
	}) as any;
};
