/**
 * Create a new subset object by picking given key paths(s), supporting nested properties using dot notation.
 *
 * @example
 * // Picks the nested 'bar' property
 * const obj = { foo: { bar: 123, baz: 456 } };
 * const result = objectPick(obj, ['foo.bar']); // { foo: { bar: 123 } }
 *
 * @example
 * // Picks multiple properties
 * const obj = { a: 1, b: 2, foo: { bar: 123, baz: 456 } };
 * const result = objectPick(obj, ['a', 'foo.bar']); // { a: 1, foo: { bar: 123 } }
 *
 * @example
 * // Picks specific array element by index
 * const obj = { items: [{ id: 1, name: "Item 1" }, { id: 2, name: "Item 2" }] };
 * const result = objectPick(obj, ['items.1.name']); // { items: [{ name: "Item 2" }] }
 *
 * @example
 * // Uses wildcard (*) to pick property from all array elements
 * const obj = { items: [{ id: 1, name: "Clayton" }, { id: 2, name: "Chung Han" }] };
 * const result = objectPick(obj, ['items.*.name']); // { items: [{ name: "Clayton" }, { name: "Chung Han" }] }
 *
 * @example
 * // Uses wildcard (*) to pick property from all object properties
 * const obj = { users: { user1: { name: "Clayton" }, user2: { name: "Chung Han" } } };
 * const result = objectPick(obj, ['users.*.name']); // { users: { user1: { name: "Clayton" }, user2: { name: "Chung Han" } } }
 *
 * @param obj - The source object to pick properties from
 * @param paths - Array of strings representing property paths to pick, with nested properties
 *               separated by dots (e.g., 'parent.child.grandchild'). Use '*' as a wildcard
 *               to pick properties from all elements in arrays or all properties in objects (e.g., 'items.*.name')
 * @returns A new object with only the specified properties
 */
export const objectPick = <T extends object, P extends string = string>(
	obj: T,
	paths: P[],
) => {
	// TASK 1: Implement this function
};
