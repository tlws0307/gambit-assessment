import type { Simplify } from "drizzle-orm";
import { and, asc, eq, gt, ne, sql, inArray } from "drizzle-orm";
import type { DrizzlePgClient, DrizzlePgPool } from "../../test-utils/database/client";
import * as $schema from "./internal/schema";
import { error } from "node:console";
import { timestamp } from "drizzle-orm/gel-core";
import { PgTransaction } from "drizzle-orm/pg-core";
import { text } from "node:stream/consumers";

export const createQueriesFactory = ($db: DrizzlePgClient | DrizzlePgPool) => {
	async function createAccount(
		data: typeof $schema.account.$inferInsert = {},
	): Promise<typeof $schema.account.$inferSelect> {
		const [record] = await $db
			.insert($schema.account)
			.values(data)
			.returning();

		if (!record) throw new Error("Failed to create account");
		// await endConnection();
		return record;
	}

	async function getAccount(
		accountId: number,
	): Promise<typeof $schema.account.$inferSelect> {
		const [record] = await $db
			.select()
			.from($schema.account)
			.where(eq($schema.account.id, accountId));

		if (!record) throw new Error("Account not found");
		// await endConnection();
		return record;
	}

	async function getTransaction(
		transactionId: number,
	): Promise<typeof $schema.trx.$inferSelect> {
		const [record] = await $db
			.select()
			.from($schema.trx)
			.where(eq($schema.trx.id, transactionId));

		if (!record) throw new Error("Transaction not found");
		return record;
	}

	async function recomputeTrxs(tx: Parameters<Parameters<typeof $db.transaction>[0]>[0], transactionId: typeof $schema.trx.$inferSelect.id | null, accountId: typeof $schema.trx.$inferSelect.accountId) 
	: Promise<typeof $schema.trx.$inferSelect | null | undefined> {
		const trxs = await tx
			.select()
			.from($schema.trx)
			.where(eq($schema.trx.accountId, accountId))
			.for('update')
			.orderBy(asc($schema.trx.timestamp));
		
		let runningBal = 0;
		for (let trx of trxs) {
			const { amount } = trx;
			trx.beforeBalance = runningBal;
			runningBal += amount;
		}
		const cases = trxs.map(
			(x) => sql`when ${$schema.trx.id} = ${x.id} then ${x.beforeBalance}`
		);

		const updatedTrx = await tx
		.update($schema.trx)
			.set({
				beforeBalance: sql`case ${sql.join(cases, sql.raw(' '))} else ${$schema.trx.beforeBalance} end`,
			})
			.where(inArray($schema.trx.id, trxs.map((x) => x.id))).returning();

		if (updatedTrx?.length > 0) {
			const latestTrx = trxs[trxs.length -1];
			const latestBalance = updatedTrx.find((x) => x.id === latestTrx?.id)?.afterBalance;
			await tx
				.update($schema.account)
				.set({ balance: latestBalance})
				.where(eq($schema.account.id, accountId))
		}

		return transactionId ? updatedTrx.find((x) => x.id === transactionId) : null;
	}

	async function addTransaction(
		data: Simplify<Omit<typeof $schema.trx.$inferInsert, "beforeBalance">>,
	): Promise<typeof $schema.trx.$inferSelect> {
		// TASK 1: Implement this function to add a transaction for an account.
		const { accountId, amount, timestamp } = data;
		try {
			return await $db.transaction(async (tx) => {
				const [account] =  await tx
					.update($schema.account)
					.set({
						balance: sql`${$schema.account.balance} + ${amount}`,
					})
					.where(eq($schema.account.id, accountId)).returning();

				// console.log(`${Date.now()} - hit1`);
				// await new Promise((resolve) => setTimeout(resolve, 1000));
				// console.log(`${Date.now()} - hit2`);
				// const [account] = await tx
				// 	.select()
				// 	.from($schema.account)
				// 	.where(eq($schema.account.id, accountId))
				// 	.for('update');

				if (!account) throw new Error('Account not found');
				const beforeBalance: number = account.balance - amount;
				// let afterBalance: number = account.balance;
				
				// if (afterBalance < 0) throw new Error('Insufficient balance');

				const [trxRow] = await tx
					.insert($schema.trx)
					.values({
						accountId,
						beforeBalance,
						amount,
						timestamp
					})
					.returning();
				
				if (!trxRow) throw new Error('Failed to insert transaction');
				const result = await recomputeTrxs(tx, trxRow.id, accountId);
				if (!result) throw new Error('Failed to insert transaction');
				// await tx
				// 	.update($schema.account)
				// 	.set({ balance: afterBalance })
				// 	.where(eq($schema.account.id, accountId));

				return result;
			});
		} catch(error) {
			throw error;
		} finally {
			// await endConnection();
		}
	}

	async function recomputeBeforeBalance() {

	}

	async function updateTransaction(
		transactionId: number,
		data: Simplify<
			Partial<
				Omit<
					typeof $schema.trx.$inferSelect,
					"beforeBalance" | "afterBalance" | "accountId"
				>
			>
		>,
	): Promise<typeof $schema.trx.$inferSelect> {
		// TASK 2: Implement this function to update a transaction.
		const { amount: newAmount, timestamp: newTimestamp } = data;

		return await $db.transaction(async (tx) => {
			// getting amount before update
			// const [targetTrx] = await tx
			// 	.select()
			// 	.from($schema.trx)
			// 	.where(eq($schema.trx.id, transactionId))
			// 	.for('update');

			const [updatedTrx] = await tx
				.update($schema.trx)
				.set({
					...(newAmount ? { amount: newAmount } : {} ),
					...(newTimestamp ? { timestamp: newTimestamp } : {} ),
				})
				.where(eq($schema.trx.id, transactionId))
				.returning();
			if (!updatedTrx) throw new Error('Failed to update transaction');	
			const { accountId } = updatedTrx;

			// if (!targetTrx) throw new Error('Transaction not found');
			
			// const { amount: oldAmount, accountId } = targetTrx;
			
			// if amount adjustment present, perform update account balance
			// if (newAmount) {
			// 	const diff = newAmount - oldAmount;
			// 	const [updatedAcc] = await tx
			// 		.update($schema.account)
			// 		.set({
			// 			balance: sql`${$schema.account.balance} + ${diff}`,
			// 		})
			// 		.where(eq($schema.account.id, accountId)).returning();
			// 	if (!updatedAcc) throw new Error('Fail to update account balance');
			// }
			const result = await recomputeTrxs(tx, updatedTrx.id, accountId);
			if (!result) throw new Error('Failed to get updated transaction');
			return result;
		})
	}

	async function deleteTransaction(
		transactionId: number,
	): Promise<typeof $schema.trx.$inferSelect> {
		// TASK 3: Implement this function to delete a transaction.
		return $db.transaction(async (tx) => {
			const [deletedTrx] = await tx
				.delete($schema.trx)
				.where(eq($schema.trx.id, transactionId))
				.returning();
			if (!deletedTrx) throw new Error('Failed to delete transaction');
			await recomputeTrxs(tx, null, deletedTrx.accountId);
			return deletedTrx;
		});
	}

	async function endConnection(

	): Promise<void> {
		await $db.$client.end();
	}

	return {
		createAccount,
		getAccount,
		getTransaction,
		addTransaction,
		updateTransaction,
		deleteTransaction,
		endConnection,
	};
};
