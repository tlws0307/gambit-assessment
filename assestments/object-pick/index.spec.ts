import { describe, expect, expectTypeOf, it } from "vitest";
import { objectPick } from ".";

describe("objectPick", () => {
	it("should pick a top-level property", () => {
		const obj = { a: 1, b: 2, c: 3 };
		const result = objectPick(obj, ["b"]);

		expect(result).toEqual({ b: 2 });
		expectTypeOf(result).toEqualTypeOf<{ b: number }>();

		// ensure original object wasn't modified
		expect(obj).toEqual({ a: 1, b: 2, c: 3 });
	});

	it("should pick multiple top-level properties", () => {
		const obj = { a: 1, b: 2, c: 3, d: 4 };
		const result = objectPick(obj, ["a", "c"]);

		expect(result).toEqual({ a: 1, c: 3 });
		expectTypeOf(result).toEqualTypeOf<{ a: number; c: number }>();
	});

	it("should pick a nested property using dot notation", () => {
		const obj = {
			user: {
				name: "John",
				details: {
					age: 30,
					email: "john@example.com",
				},
			},
			settings: { theme: "dark" },
		};

		const result = objectPick(obj, ["user.details.email"]);
		expectTypeOf(result).toEqualTypeOf<{
			user: { details: { email: string } };
		}>();

		expect(result).toEqual({
			user: {
				details: {
					email: "john@example.com",
				},
			},
		});
	});

	it("should pick multiple nested properties", () => {
		const obj = {
			a: {
				b: { c: 1, d: 2 },
				e: 3,
			},
			f: 4,
		};

		const result = objectPick(obj, ["a.b.c", "a.b.d", "f"]);
		expectTypeOf(result).toEqualTypeOf<{
			a: { b: { c: number; d: number } };
			f: number;
		}>();

		expect(result).toEqual({
			a: {
				b: { c: 1, d: 2 },
			},
			f: 4,
		});
	});

	it("should union if picked conflicted nested properties", () => {
		const obj = {
			a: {
				b: { c: 1, d: 2 },
				e: 3,
			},
			f: 4,
		};

		const result = objectPick(obj, ["a.b", "a.b.d"]);
		expectTypeOf(result).toEqualTypeOf<{
			a: { b: { c: number; d: number } };
		}>();

		expect(result).toEqual({
			a: {
				b: { c: 1, d: 2 },
			},
		});
	});

	it("should handle non-existent properties gracefully", () => {
		const obj = { a: 1, b: { c: 2 } };
		const result = objectPick(obj, ["d", "b.x", "b.c.d"]);

		// should return an empty object since none of the paths exist
		expect(result).toEqual({});
		expectTypeOf(result).toEqualTypeOf<{}>();
	});

	it("should handle empty keys array", () => {
		const obj = { a: 1, b: 2 };
		const result = objectPick(obj, []);

		// should return a clone of an empty object
		expect(result).toEqual({});
		expectTypeOf(result).toEqualTypeOf<{}>();

		expect(result).not.toBe(obj);
	});

	it("should handle nested arrays correctly", () => {
		const obj = {
			items: [
				{ id: 1, name: "Item 1" },
				{ id: 2, name: "Item 2" },
			],
		};

		// pick the name property from the second item
		const result = objectPick(obj, ["items.1.name"]);
		expectTypeOf(result).toEqualTypeOf<{ items: { name: string }[] }>();

		expect(result).toEqual({
			items: [{ name: "Item 2" }],
		});
	});

	it("should handle multiple nested arrays correctly", () => {
		const obj = {
			items: [
				{ id: 1, name: "Item 1" },
				{ id: 2, name: "Item 2" },
			],
		};

		// pick the name property from the second item
		const result = objectPick(obj, ["items.0.id", "items.1.name"]);
		expectTypeOf(result).toMatchTypeOf<{
			items: ({ id: number } | { name: string })[];
		}>();

		expect(result).toEqual({
			items: [{ id: 1 }, { name: "Item 2" }],
		});
	});

	it("should match asterisk (*) pattern to pick specific property in array or object correctly", () => {
		const obj = {
			items: [
				{ id: 1, name: "Clayton", email: "clayton@email.com" },
				{ id: 2, name: "Chung Han", email: "chunghan@email.com" },
			],
		};

		// pick the name property from the second item
		const result = objectPick(obj, ["items.*.name"]);
		expectTypeOf(result).toMatchTypeOf<{ items: { name: string }[] }>();

		expect(result).toEqual({
			items: [{ name: "Clayton" }, { name: "Chung Han" }],
		});
	});

	it("should match asterisk (*) pattern to pick multiple properties array or object correctly", () => {
		const obj = {
			items: [
				{ id: 1, name: "Clayton", email: "clayton@email.com" },
				{ id: 2, name: "Chung Han", email: "chunghan@email.com" },
			],
		};

		// pick the name property from the second item
		const result = objectPick(obj, ["items.*.name", "items.*.email"]);
		expectTypeOf(result).toMatchTypeOf<{
			items: { name: string; email: string }[];
		}>();

		expect(result).toEqual({
			items: [
				{ name: "Clayton", email: "clayton@email.com" },
				{ name: "Chung Han", email: "chunghan@email.com" },
			],
		});
	});
});
