import path from "node:path";
import { fileURLToPath } from "node:url";
import { and, asc, eq, gt, ne } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { getTestDB } from "../../test-utils/get-test-db";
import { createQueriesFactory } from ".";
import * as $schema from "./internal/schema";

describe("race condition", async () => {
	const __dirname = path.dirname(fileURLToPath(import.meta.url));
	const migrationsDir = path.resolve(__dirname, "./internal/migrations");

	const { $db } = await getTestDB({ instance: "postgres", migrationsDir });
	const queries = createQueriesFactory($db);

	let _timestamp = Date.now();
	// utility to generate unique timestamps for transactions to avoid conflicts in tests
	const getTimestampIncr = () => {
		_timestamp += 1;
		return new Date(_timestamp);
	};

	it("should be able to add a new transaction to an account", async () => {
		const acc = await queries.createAccount();
		const trx = await queries.addTransaction({
			accountId: acc.id,
			amount: 100,
		});

		expect(trx.amount).toBe(100);
		expect(trx.beforeBalance).toBe(acc.balance);

		const updatedAcc = await queries.getAccount(acc.id);
		expect(updatedAcc.balance).toBe(acc.balance + trx.amount);
	});

	it("should atomically create multiple transaction concurrently without race conditions", async () => {
		const acc = await queries.createAccount();

		const trxs = Array.from({ length: 100 }, (_) => {
			const isNegative = Math.random() < 0.2; // 20% chance of being negative
			const amount = Math.floor(Math.random() * 100) + 1; // Random amount between 1 and 100
			return {
				accountId: acc.id,
				amount: isNegative ? -amount : amount,
				timestamp: getTimestampIncr(),
			};
		});
		const sum = trxs.reduce((acc, trx) => acc + trx.amount, 0);
		const records = (
			await Promise.all(trxs.map((trx) => queries.addTransaction(trx)))
		).sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

		// check race condition on account balance
		const updatedAcc = await queries.getAccount(acc.id);
		expect(updatedAcc.balance).toBe(sum);

		// check race condition on transaction before and after balances
		let runningBalance = 0;
		for (const trx of records) {
			expect(trx.beforeBalance).toBe(runningBalance);
			runningBalance = runningBalance + trx.amount;
			expect(trx.afterBalance).toBe(runningBalance);
		}
		expect(runningBalance).toBe(sum);
	});

	it("should atomically update an existing transaction", async () => {
		const acc = await queries.createAccount();

		const trxs = Array.from({ length: 100 }, (_) => {
			const isNegative = Math.random() < 0.2; // 20% chance of being negative
			const amount = Math.floor(Math.random() * 100) + 1; // Random amount between 1 and 100
			return {
				accountId: acc.id,
				amount: isNegative ? -amount : amount,
				timestamp: getTimestampIncr(),
			};
		});
		const sum = trxs.reduce((acc, trx) => acc + trx.amount, 0);
		const records = (
			await Promise.all(trxs.map((trx) => queries.addTransaction(trx)))
		).sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

		const sampleTrx = records[50];
		const amountChange = sampleTrx!.amount * 1.1; // increase amount by 10%
		const diff = amountChange - sampleTrx!.amount;

		const updatedTrx = await queries.updateTransaction(sampleTrx!.id, {
			amount: amountChange,
		});
		expect(updatedTrx.amount).toBe(amountChange);

		const preceedingTrxs = await $db
			.select()
			.from($schema.trx)
			.where(
				and(
					eq($schema.trx.accountId, acc.id),
					gt($schema.trx.timestamp, sampleTrx!.timestamp),
					ne($schema.trx.id, sampleTrx!.id),
				),
			)
			.orderBy(asc($schema.trx.timestamp));

		let runningBalance = updatedTrx.afterBalance;
		for (const trx of preceedingTrxs) {
			expect(trx.beforeBalance).toBe(runningBalance);
			runningBalance = runningBalance + trx.amount;
			expect(trx.afterBalance).toBe(runningBalance);
		}

		const updatedAcc = await queries.getAccount(acc.id);
		expect(updatedAcc.balance).toBe(sum + diff);
	});

	it("should atomically remove an existing transaction", async () => {
		const acc = await queries.createAccount();

		const trxs = Array.from({ length: 100 }, (_) => {
			const isNegative = Math.random() < 0.2; // 20% chance of being negative
			const amount = Math.floor(Math.random() * 100) + 1; // Random amount between 1 and 100
			return {
				accountId: acc.id,
				amount: isNegative ? -amount : amount,
				timestamp: getTimestampIncr(),
			};
		});
		const sum = trxs.reduce((acc, trx) => acc + trx.amount, 0);
		const records = (
			await Promise.all(trxs.map((trx) => queries.addTransaction(trx)))
		).sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

		const sampleTrx = records[50];
		const deletedTrx = await queries.deleteTransaction(sampleTrx!.id);
		expect(deletedTrx).toEqual(sampleTrx);

		await expect(queries.getTransaction(deletedTrx.id)).rejects.toThrow();

		const preceedingTrxs = await $db
			.select()
			.from($schema.trx)
			.where(
				and(
					eq($schema.trx.accountId, acc.id),
					gt($schema.trx.timestamp, sampleTrx!.timestamp),
				),
			)
			.orderBy(asc($schema.trx.timestamp));

		let runningBalance = deletedTrx.beforeBalance;
		for (const trx of preceedingTrxs) {
			expect(trx.beforeBalance).toBe(runningBalance);
			runningBalance = runningBalance + trx.amount;
			expect(trx.afterBalance).toBe(runningBalance);
		}

		const updatedAcc = await queries.getAccount(acc.id);
		expect(updatedAcc.balance).toBe(sum - deletedTrx.amount);
	});

	it("should handle adding a single transaction in between prior transactions", async () => {
		const acc = await queries.createAccount();

		const trxs = Array.from({ length: 100 }, (_) => {
			const isNegative = Math.random() < 0.2; // 20% chance of being negative
			const amount = Math.floor(Math.random() * 100) + 1; // Random amount between 1 and 100
			return {
				accountId: acc.id,
				amount: isNegative ? -amount : amount,
				timestamp: getTimestampIncr(),
			};
		});
		const records = (
			await Promise.all(trxs.map((trx) => queries.addTransaction(trx)))
		).sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

		const sampleTrx = records[50];

		const preceedingTrxs = await $db
			.select()
			.from($schema.trx)
			.where(
				and(
					eq($schema.trx.accountId, acc.id),
					gt($schema.trx.timestamp, sampleTrx!.timestamp),
					ne($schema.trx.id, sampleTrx!.id),
				),
			)
			.orderBy(asc($schema.trx.timestamp));

		// strategy for this test is to remove a transaction in the middle of the list,
		// then add a new transaction with a timestamp in between the removed transaction
		// and the next transaction. This will test if the balances are correctly updated
		// for all subsequent transactions.
		await queries.deleteTransaction(sampleTrx!.id);

		const reAddedTrx = await queries.addTransaction({
			timestamp: sampleTrx!.timestamp,
			amount: sampleTrx!.amount,
			accountId: acc.id,
		});
		expect(reAddedTrx.amount).toEqual(sampleTrx!.amount);
		expect(reAddedTrx.timestamp).toEqual(sampleTrx!.timestamp);
		expect(reAddedTrx.accountId).toEqual(sampleTrx!.accountId);

		const changedPreceedingTrx = await $db
			.select()
			.from($schema.trx)
			.where(
				and(
					eq($schema.trx.accountId, acc.id),
					gt($schema.trx.timestamp, sampleTrx!.timestamp),
					ne($schema.trx.id, sampleTrx!.id),
				),
			)
			.orderBy(asc($schema.trx.timestamp));

		let runningBalance = reAddedTrx.afterBalance;
		for (let i = 0; i < preceedingTrxs.length; i++) {
			const before = preceedingTrxs[i]!.beforeBalance;
			const after = preceedingTrxs[i]!.afterBalance;
			const amount = preceedingTrxs[i]!.amount;

			const changedBefore = changedPreceedingTrx[i]!.beforeBalance;
			const changedAfter = changedPreceedingTrx[i]!.afterBalance;
			const changedAmount = changedPreceedingTrx[i]!.amount;

			expect(before).toBe(changedBefore);
			expect(after).toBe(changedAfter);
			expect(amount).toBe(changedAmount);

			expect(changedBefore).toBe(runningBalance);
			runningBalance = runningBalance + changedAmount;
		}

		const updatedAcc = await queries.getAccount(acc.id);
		expect(updatedAcc.balance).toBe(runningBalance);
	});

	it("should atomically update multiple transactions concurrently without race conditions", async () => {
		const acc = await queries.createAccount();

		const trxs = Array.from({ length: 100 }, (_) => {
			const isNegative = Math.random() < 0.2; // 20% chance of being negative
			const amount = Math.floor(Math.random() * 100) + 1; // Random amount between 1 and 100
			return {
				accountId: acc.id,
				amount: isNegative ? -amount : amount,
				timestamp: getTimestampIncr(),
			};
		});
		const records = (
			await Promise.all(trxs.map((trx) => queries.addTransaction(trx)))
		).sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

		const updatePromises = trxs.map((_, i) => {
			const isNegative = Math.random() < 0.2; // 20% chance of being negative
			const newAmount = Math.floor(Math.random() * 100) + 1; // Random amount between 1 and 100
			return queries.updateTransaction(records[i]!.id, {
				amount: isNegative ? -newAmount : newAmount,
			});
		});

		const updatedTrxs = await Promise.all(updatePromises);
		expect(updatedTrxs).toHaveLength(trxs.length);

		const allTrxs = await $db
			.select()
			.from($schema.trx)
			.where(eq($schema.trx.accountId, acc.id))
			.orderBy(asc($schema.trx.timestamp));

		let runningBalance = 0;
		for (const trx of allTrxs) {
			expect(trx.beforeBalance).toBe(runningBalance);
			runningBalance = runningBalance + trx.amount;
			expect(trx.afterBalance).toBe(runningBalance);
		}

		const updatedAcc = await queries.getAccount(acc.id);
		expect(updatedAcc.balance).toBe(runningBalance);
	});

	it("should atomically update timestamp of a transaction", async () => {
		const acc = await queries.createAccount();

		const trxs = Array.from({ length: 100 }, (_) => {
			const isNegative = Math.random() < 0.2; // 20% chance of being negative
			const amount = Math.floor(Math.random() * 100) + 1; // Random amount between 1 and 100
			return {
				accountId: acc.id,
				amount: isNegative ? -amount : amount,
				timestamp: getTimestampIncr(),
			};
		});
		const records = (
			await Promise.all(trxs.map((trx) => queries.addTransaction(trx)))
		).sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

		const sampleTrx = records[50];
		const newTimestamp = getTimestampIncr();

		const updatedTrx = await queries.updateTransaction(sampleTrx!.id, {
			timestamp: newTimestamp,
		});
		expect(updatedTrx.timestamp).toEqual(newTimestamp);

		const allTrxs = await $db
			.select()
			.from($schema.trx)
			.where(eq($schema.trx.accountId, acc.id))
			.orderBy(asc($schema.trx.timestamp));

		let runningBalance = 0;
		for (const trx of allTrxs) {
			expect(trx.beforeBalance).toBe(runningBalance);
			runningBalance = runningBalance + trx.amount;
			expect(trx.afterBalance).toBe(runningBalance);
		}

		const updatedAcc = await queries.getAccount(acc.id);
		expect(updatedAcc.balance).toBe(runningBalance);
	});

	it("should atomically update timestamp of multiple transactions concurrently without race conditions", async () => {
		let acc = await queries.createAccount();

		const trxs = Array.from({ length: 100 }, (_) => {
			const isNegative = Math.random() < 0.2; // 20% chance of being negative
			const amount = Math.floor(Math.random() * 100) + 1; // Random amount between 1 and 100
			return {
				accountId: acc.id,
				amount: isNegative ? -amount : amount,
				timestamp: getTimestampIncr(),
			};
		});
		const records = (
			await Promise.all(trxs.map((trx) => queries.addTransaction(trx)))
		).sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
		acc = await queries.getAccount(acc.id);

		const updatedTrxs = (
			await Promise.all(
				shuffle(records.slice()).map((trx) =>
					queries.updateTransaction(trx.id, {
						timestamp: getTimestampIncr(),
					}),
				),
			)
		).sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
		expect(updatedTrxs).toHaveLength(trxs.length);

		const updatedAcc = await queries.getAccount(acc.id);
		expect(updatedAcc.balance).toBe(acc.balance); // balance should not change since we are only updating timestamps
		expect(at(updatedTrxs, -1)!.afterBalance).toBe(updatedAcc.balance); // the after balance of the last transaction should equal the account balance

		const finalTrxs = await $db
			.select()
			.from($schema.trx)
			.where(eq($schema.trx.accountId, acc.id))
			.orderBy(asc($schema.trx.timestamp));

		let runningBalance = 0;
		for (const trx of finalTrxs) {
			expect(trx.beforeBalance).toBe(runningBalance);
			runningBalance = runningBalance + trx.amount;
			expect(trx.afterBalance).toBe(runningBalance);
		}

		expect(runningBalance).toBe(updatedAcc.balance);
	});

	it("should atomically update timestamps and amount of multiple transactions concurrently without race conditions", async () => {
		let acc = await queries.createAccount();

		const trxs = Array.from({ length: 100 }, (_) => {
			const isNegative = Math.random() < 0.2; // 20% chance of being negative
			const amount = Math.floor(Math.random() * 100) + 1; // Random amount between 1 and 100
			return {
				accountId: acc.id,
				amount: isNegative ? -amount : amount,
				timestamp: getTimestampIncr(),
			};
		});
		const records = (
			await Promise.all(trxs.map((trx) => queries.addTransaction(trx)))
		).sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
		acc = await queries.getAccount(acc.id);

		const updatedTrxs = (
			await Promise.all(
				shuffle(records.slice()).map((trx) =>
					queries.updateTransaction(trx.id, {
						timestamp: getTimestampIncr(),
						// randomly change amount by +/- 10%
						amount: Math.round(
							trx.amount * (Math.random() < 0.2 ? -1 : 1) * 1.1,
						),
					}),
				),
			)
		).sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
		expect(updatedTrxs).toHaveLength(trxs.length);

		const updatedAcc = await queries.getAccount(acc.id);
		expect(at(updatedTrxs, -1)!.afterBalance).toBe(updatedAcc.balance); // the after balance of the last transaction should equal the account balance

		const finalTrxs = await $db
			.select()
			.from($schema.trx)
			.where(eq($schema.trx.accountId, acc.id))
			.orderBy(asc($schema.trx.timestamp));

		let runningBalance = 0;
		for (const trx of finalTrxs) {
			expect(trx.beforeBalance).toBe(runningBalance);
			runningBalance = runningBalance + trx.amount;
			expect(trx.afterBalance).toBe(runningBalance);
		}

		expect(runningBalance).toBe(updatedAcc.balance);
	});

	it("should atomically remove multiple transactions concurrently without race conditions", async () => {
		let acc = await queries.createAccount();

		const trxs = Array.from({ length: 100 }, (_) => {
			const isNegative = Math.random() < 0.2; // 20% chance of being negative
			const amount = Math.floor(Math.random() * 100) + 1; // Random amount between 1 and 100
			return {
				accountId: acc.id,
				amount: isNegative ? -amount : amount,
				timestamp: getTimestampIncr(),
			};
		});
		const sum = trxs.reduce((acc, trx) => acc + trx.amount, 0);
		const records = (
			await Promise.all(trxs.map((trx) => queries.addTransaction(trx)))
		).sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
		acc = await queries.getAccount(acc.id);

		const trxsToDelete = [
			...records.slice(2, 5), // remove positions 3-5
			...records.slice(12, 18), // remove positions 13-18
			...records.slice(24, 30), // remove positions 25-30
		];

		expect(trxsToDelete).toHaveLength(15);

		const removePromises = trxsToDelete.map((trx) =>
			queries.deleteTransaction(trx.id),
		);
		const removedTrxs = await Promise.all(removePromises);

		for (const removedTrx of trxsToDelete) {
			await expect(
				queries.getTransaction(removedTrx.id),
			).rejects.toThrow();
		}

		const totalRemoved = removedTrxs.reduce(
			(acc, trx) => acc + trx.amount,
			0,
		);
		const remainingTrxs = await $db
			.select()
			.from($schema.trx)
			.where(eq($schema.trx.accountId, acc.id))
			.orderBy(asc($schema.trx.timestamp));

		expect(remainingTrxs).toHaveLength(
			records.length - trxsToDelete.length,
		);

		let runningBalance = 0;
		for (const trx of remainingTrxs) {
			expect(trx.beforeBalance).toBe(runningBalance);
			runningBalance = runningBalance + trx.amount;
			expect(trx.afterBalance).toBe(runningBalance);
		}

		const updatedAcc = await queries.getAccount(acc.id);
		expect(updatedAcc.balance).toBe(sum - totalRemoved);
	});
});

function shuffle<T>(array: T[]): T[] {
	for (let i = array.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		// biome-ignore lint/suspicious/noTsIgnore: as intended
		// @ts-ignore as intended
		[array[i], array[j]] = [array[j], array[i]];
	}
	return array;
}

function at<T>(array: readonly T[] | [], index: number): T | undefined {
	const len = array.length;
	if (!len) return undefined;

	if (index < 0) index += len;

	return array[index];
}