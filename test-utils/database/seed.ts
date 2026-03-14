import type { DrizzlePgClient, DrizzlePgTransaction } from "./client";

export interface SeedModule {
	run: (
		db: DrizzlePgClient,
		{ seedTests }: { seedTests?: boolean },
	) => Promise<void>;
}

export interface SeedStep {
	name?: string;
	seed: (tx: DrizzlePgTransaction) => Promise<void> | void;
	continueOnError?: boolean;
}

export function defineStep(
	fn: SeedStep["seed"],
	config?: { name?: string; continueOnError?: boolean },
) {
	return {
		seed: fn,
		name: config?.name,
		continueOnError: config?.continueOnError,
	} as SeedStep;
}

export interface Job {
	steps: SeedStep[];
	dependsOn?: string[];
	continueOnError?: boolean;
}

export function defineJob(
	steps: SeedStep[],
	config?: { dependsOn?: string[]; continueOnError?: boolean },
) {
	return {
		steps,
		dependsOn: config?.dependsOn,
		continueOnError: config?.continueOnError,
	} as Job;
}

export type SeedRunner = {
	jobs?: Record<string, Job>;
	tests?: Record<string, Job>;
};

export type SeedConfig = {
	includeTest?: boolean;
	resetVersion?: number;
	seed: SeedRunner;
};

export function defineSeedConfig(config: SeedConfig): SeedConfig {
	return config;
}

export class Seed implements SeedModule {
	private jobLogs: Record<string, boolean> = {};
	private testLogs: Record<string, boolean> = {};

	constructor(private config: SeedConfig) {}

	private async runSteps(tx: DrizzlePgTransaction, steps: SeedStep[]) {
		for (const step of steps) {
			try {
				await step.seed(tx);
			} catch (error) {
				if (!step.continueOnError) {
					throw error;
				}
				console.error(
					`Error in step${step?.name ? ` ${step.name}` : ""}:`,
					error,
				);
				console.error("Ignoring error and continuing...");
			}
		}
	}

	private async runJob(
		tx: DrizzlePgTransaction,
		jobId: string,
		continueOnError?: boolean,
	) {
		if (this.jobLogs[jobId]) {
			return;
		}

		console.info(`Running job: ${jobId}`);

		const job = this.config.seed.jobs![jobId];

		if (job?.dependsOn) {
			for (const dependency of job.dependsOn) {
				const dependedJob = this.config.seed.jobs![dependency];
				try {
					await this.runJob(tx, dependency, job.continueOnError);
				} catch (error) {
					if (
						!dependedJob?.continueOnError &&
						!job.continueOnError &&
						!continueOnError
					) {
						throw error;
					}

					console.error(`Error in job ${dependency}:`, error);
					console.error("Ignoring error and continuing...");
				}
			}
		}

		try {
			await this.runSteps(tx, job!.steps);
		} catch (error) {
			if (!job?.continueOnError) {
				throw error;
			}
			console.error(`Error in job ${jobId}:`, error);
			console.error("Ignoring error and continuing...");
		} finally {
			this.jobLogs[jobId] = true;
		}
		console.info("");
	}

	private async runTest(
		tx: DrizzlePgTransaction,
		testId: string,
		continueOnError?: boolean,
	) {
		if (this.testLogs[testId]) {
			return;
		}

		console.info(`Running test: ${testId}`);

		const test = this.config.seed.tests![testId];

		if (test?.dependsOn) {
			for (const dependency of test.dependsOn) {
				const dependedTest = this.config.seed.tests![dependency];
				try {
					await this.runTest(tx, dependency, test.continueOnError);
				} catch (error) {
					if (
						!dependedTest?.continueOnError &&
						!test.continueOnError &&
						!continueOnError
					) {
						throw error;
					}
					console.error(`Error in test ${dependency}:`, error);
					console.error("Ignoring error and continuing...");
				}
			}
		}

		try {
			await this.runSteps(tx, test!.steps);
		} catch (error) {
			if (!test?.continueOnError) {
				throw error;
			}
			console.error(`Error in test ${testId}:`, error);
			console.error("Ignoring error and continuing...");
		} finally {
			this.testLogs[testId] = true;
		}
	}

	async run(db: DrizzlePgClient, { seedTests }: { seedTests?: boolean }) {
		await db.transaction(async (tx) => {
			if (this.config.seed.jobs) {
				for (const jobId in this.config.seed.jobs) {
					await this.runJob(
						tx,
						jobId,
						this.config.seed.jobs?.[jobId]?.continueOnError,
					);
				}
			}

			if (seedTests === true) {
				for (const testId in this.config.seed.tests) {
					await this.runTest(
						tx,
						testId,
						this.config.seed.tests?.[testId]?.continueOnError,
					);
				}
			}
		});
	}
}

export function createPgSeeder(config: SeedConfig) {
	return new Seed(config);
}
