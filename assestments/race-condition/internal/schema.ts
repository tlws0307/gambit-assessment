import { type SQL, sql } from "drizzle-orm";
import { pgTable } from "drizzle-orm/pg-core";

export const account = pgTable("account", (t) => ({
	id: t.integer().primaryKey().generatedAlwaysAsIdentity(),
	balance: t.numeric({ mode: "number", scale: 2 }).notNull().default(0),
}));

export const trx = pgTable("transaction", (t) => ({
	id: t.integer().primaryKey().generatedAlwaysAsIdentity(),
	timestamp: t.timestamp({ withTimezone: true }).notNull().defaultNow(),
	accountId: t
		.integer()
		.notNull()
		.references(() => account.id),
	/**
	 * The balance before the account's balance is updated.
	 */
	beforeBalance: t.numeric({ mode: "number" }).notNull(),
	amount: t.numeric({ mode: "number" }).notNull(),
	/**
	 * The balance after the account's balance is updated.
	 */
	afterBalance: t
		.numeric({ mode: "number", scale: 2 })
		.generatedAlwaysAs((): SQL => sql`${trx.beforeBalance} + ${trx.amount}`)
		.notNull(),
}));
