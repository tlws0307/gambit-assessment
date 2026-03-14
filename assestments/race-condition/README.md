# Race Condition Assessment

## Overview

This assessment evaluates your ability to handle **race conditions** in a concurrent database environment. You will implement functions that manage financial transactions for accounts, ensuring data consistency when multiple operations occur simultaneously.

## Problem Description

You are building a transaction management system for financial accounts. The system must:

1. Track account balances
2. Record transactions with timestamps
3. Maintain transaction history with `beforeBalance` and `afterBalance` snapshots
4. Handle concurrent operations without data corruption

### Database Schema

**Account Table:**
- `id`: Primary key (auto-generated)
- `balance`: Current account balance (numeric, 2 decimal places)

**Transaction Table:**
- `id`: Primary key (auto-generated)
- `timestamp`: When the transaction occurred
- `accountId`: Reference to the account
- `beforeBalance`: Account balance before this transaction
- `amount`: Transaction amount (positive for credits, negative for debits)
- `afterBalance`: Computed as `beforeBalance + amount`

### Critical Requirements

When a transaction is added, updated, or deleted:

1. **Account balance** must reflect the sum of all transaction amounts
2. **Transaction ordering** is determined by `timestamp`
3. **Balance snapshots** (`beforeBalance`, `afterBalance`) must be consistent across all transactions
4. **Concurrent operations** must not cause race conditions or data inconsistencies
5. **Targeted updates only**: Your solution MUST only update records that are explicitly affected by the operation. Think algorithmically about which transactions need to be updated, rather than recomputing the entire history.

## Your Tasks

Implement the following three functions in `index.ts`:

### Task 1: `addTransaction()`

Add a new transaction to an account. This function must:
- Insert the transaction with the correct `beforeBalance` based on prior transactions
- Update the `beforeBalance` of all subsequent transactions (those with later timestamps)
- Update the account's total balance

### Task 2: `updateTransaction()`

Update an existing transaction. This function must:
- Modify the transaction's `amount` and/or `timestamp`
- Recalculate `beforeBalance` for affected transactions
- Update the account's total balance accordingly
- **Special case:** If the timestamp changes, the transaction may need to be repositioned in the timeline

### Task 3: `deleteTransaction()`

Remove a transaction from an account. This function must:
- Delete the transaction record
- Adjust the `beforeBalance` of all subsequent transactions
- Update the account's total balance

## Testing

Run the test suite using:

```bash
pnpm test assestments/race-condition/index.spec.ts
```

The test suite includes:
- Basic CRUD operations
- Concurrent transaction creation (100 simultaneous operations)
- Concurrent updates with random amounts
- Timestamp modifications
- Concurrent deletions
- Validation of balance consistency across all transactions

**All tests must pass** for your solution to be considered complete.

## Constraints & Considerations

- **Concurrency:** Your solution must handle multiple simultaneous operations without race conditions
- **Atomicity:** Each operation must be atomic (all-or-nothing)
- **Consistency:** Transaction balances must always be correct, even during high concurrency
- **Database:** You're using PostgreSQL with Drizzle ORM
- **No skeleton code:** The function bodies are currently empty - you must implement them from scratch
- **DO NOT CHANGE THE TESTS** Trust that the tests are valid
- **DO NOT CHANGE THE INTERNALS** You do not need to change anything in the `./internals` directory

## Evaluation Criteria

### Required (Must Pass All Tests):
- ✅ All test cases pass
- ✅ No race conditions under concurrent load
- ✅ Correct balance calculations
- ✅ Proper handling of transaction ordering by timestamp

### Bonus Points:
- ⭐ **Implementing without explicit mutex locks** - solving race conditions purely through database-level mechanisms
- ⭐ Performance optimization for high-concurrency scenarios
- ⭐ Clean, readable, and well-structured code

## Getting Started

1. Open `index.ts`
2. Locate the three functions marked with `// TASK X: Implement this function...`
3. Implement each function to satisfy the requirements
4. Run the tests frequently to verify your progress
5. Ensure all tests pass before submitting

## Submission

When you're ready to submit:
1. Ensure all tests pass: `pnpm test assestments/race-condition/index.spec.ts`
2. Review your code for clarity and correctness
3. Commit your completed `index.ts` file
4. Push to your **private** repo

---

**Good luck! This assessment tests your understanding of concurrent programming, database transactions, and race condition prevention.**
