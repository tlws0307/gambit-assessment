# Object Pick Assessment

## Overview

This assessment evaluates your ability to implement a utility function with **advanced TypeScript type safety**. You will create an `objectPick` function that extracts specified properties from an object using dot notation paths, with full end-to-end type inference.

## Problem Description

Implement a function `objectPick` that creates a new object by picking specified properties from a source object. The function must support:

1. **Top-level properties**: Pick simple properties directly from the object
2. **Nested properties**: Use dot notation (e.g., `"user.name"`) to pick deeply nested values
3. **Array indexing**: Access array elements by index (e.g., `"items.0.name"`)
4. **Wildcard pattern**: Use `*` to pick properties from all elements in arrays or objects (e.g., `"items.*.name"`)
5. **Type safety**: Return type must be accurately inferred based on the picked paths

## Function Signature

```typescript
export const objectPick = <T extends object, P extends string = string>(
  obj: T,
  paths: P[],
) => {
  // Your implementation here
};
```

## Examples

### Example 1: Top-level properties
```typescript
const obj = { a: 1, b: 2, c: 3 };
const result = objectPick(obj, ['a', 'c']);
// Result: { a: 1, c: 3 }
// Type: { a: number; c: number }
```

### Example 2: Nested properties
```typescript
const obj = {
  user: {
    name: "John",
    details: {
      age: 30,
      email: "john@example.com"
    }
  }
};
const result = objectPick(obj, ['user.details.email']);
// Result: { user: { details: { email: "john@example.com" } } }
// Type: { user: { details: { email: string } } }
```

### Example 3: Array indexing
```typescript
const obj = {
  items: [
    { id: 1, name: "Item 1" },
    { id: 2, name: "Item 2" }
  ]
};
const result = objectPick(obj, ['items.1.name']);
// Result: { items: [{ name: "Item 2" }] }
// Type: { items: { name: string }[] }
```

### Example 4: Wildcard pattern with arrays
```typescript
const obj = {
  items: [
    { id: 1, name: "Clayton", email: "clayton@email.com" },
    { id: 2, name: "Chung Han", email: "chunhang@email.com" }
  ]
};
const result = objectPick(obj, ['items.*.name', 'items.*.email']);
// Result: { items: [{ name: "Clayton", email: "clayton@email.com" }, { name: "Chung Han", email: "chunhang@email.com" }] }
// Type: { items: { name: string; email: string }[] }
```

### Example 5: Wildcard pattern with objects
```typescript
const obj = {
  users: {
    user1: { name: "Clayton", role: "admin" },
    user2: { name: "Chung Han", role: "user" }
  }
};
const result = objectPick(obj, ['users.*.name']);
// Result: { users: { user1: { name: "Clayton" }, user2: { name: "Chung Han" } } }
// Type: { users: { [key: string]: { name: string } } }
```

## Your Task

Implement the `objectPick` function in `index.ts` to satisfy all test cases. Your implementation must:

1. **Runtime behavior**: Correctly extract and reconstruct objects based on the provided paths
2. **Type safety**: Provide accurate TypeScript type inference for the return value
3. **Immutability**: Do not modify the original object
4. **Edge cases**: Handle non-existent properties, empty paths, and edge cases gracefully

## Testing

### Runtime Tests

Run the test suite using:

```bash
pnpm test assestments/object-pick/index.spec.ts
```

This validates **runtime behavior** using `expect()` assertions.

### Type-Level Correctness

**Important:** Due to TypeScript limitations, the test runner cannot validate type-level correctness at runtime. The `expectTypeOf()` assertions in the test file only works with a typescript compiler.

To verify **type-level correctness**, ensure that:

1. **No TypeScript diagnostic errors** appear in the test file (`index.spec.ts`)
2. Your IDE/editor shows no type errors in the test cases
3. Run TypeScript compiler to check for errors:
   ```bash
   pnpm tsc --noEmit --skipLibCheck assestments/object-pick/index.spec.ts
   ```

**Both runtime tests AND type-level correctness (no diagnostic errors) must pass** for your solution to be considered complete.

## Requirements

### Must Implement:
- Pick top-level properties
- Pick nested properties using dot notation (e.g., `"a.b.c"`)
- Pick array elements by index (e.g., `"items.0"`)
- Pick properties from all elements in arrays or objects using wildcard `*` (e.g., `"items.*.name"`)
- Handle non-existent properties without errors
- Handle empty path arrays
- Return a new object (do not mutate the original)

### Type Safety Requirements:
- Return type must be precisely inferred from the picked paths
- Invalid paths should not cause type errors but should be handled gracefully at runtime
- The function should work with any object type

## Evaluation Criteria

### Required:
- ✅ All runtime tests pass
- ✅ No TypeScript diagnostic errors in the test file
- ✅ Correct handling of all path patterns (top-level, nested, array index, wildcard)
- ✅ Proper edge case handling

### Bonus Points:
- ⭐ Elegant and readable code structure
- ⭐ Efficient implementation

## Hints

- Consider using recursion for nested property access
- TypeScript's template literal types and mapped types will be useful for type inference
- Think about how to reconstruct the object structure while maintaining type information
- The wildcard `*` should match all elements in arrays and all properties in objects
- Handle edge cases like accessing properties on `null` or `undefined`

## Getting Started

1. Open `index.ts`
2. Locate the `objectPick` function marked with `// TASK 1: Implement this function`
3. Implement both the runtime logic and TypeScript types
4. Run tests frequently to verify both runtime and type correctness
5. Ensure all tests pass before submitting

## Submission

When you're ready to submit:
1. Ensure all runtime tests pass: `pnpm test assestments/object-pick/index.spec.ts`
2. Verify no TypeScript diagnostic errors exist in `index.spec.ts` (check your IDE/editor)
3. Verify that TypeScript compiles without errors: `pnpm tsc --noEmit --skipLibCheck assestments/object-pick/index.spec.ts`
4. Review your code for clarity and correctness
5. Commit your completed `index.ts` file
6. Push to your **private** repo

---

**Good luck! This assessment tests your TypeScript expertise, type-level programming skills, and ability to create type-safe utility functions.**
