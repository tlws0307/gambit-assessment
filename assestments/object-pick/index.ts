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
export const objectPick = <
  T extends object,
  const P extends readonly string[]
>(
  obj: T,
  paths: P,
): any => {

	let result = {};
	const combined = combinePaths(paths)
	for (const p of combined) {
		const picked = pickOne(obj, p.split(".")) ?? {};
		console.log(JSON.stringify(picked));
		result = deepMerge(result, picked);
	}
	return result as any;
};

function deepMerge(a: any, b: any): any {
  // array + array → concatenate
  if (Array.isArray(a) && Array.isArray(b)) {
    return [...a, ...b];
  }

  // object + object → merge keys
  if (
    a &&
    b &&
    typeof a === 'object' &&
    typeof b === 'object'
  ) {
    const result: any = { ...a };

    for (const key of Object.keys(b)) {
      if (key in result) {
        result[key] = deepMerge(result[key], b[key]);
      } else {
        result[key] = b[key];
      }
    }

    return result;
  }

  // fallback → overwrite
  return b;
}

function combinePaths(paths: readonly string[]): string[] {
  const groups = new Map<string, string[]>();
  const singles: string[] = [];

  for (const path of paths) {
    const parts = path.split(".");

    if (parts.length === 1) {
      singles.push(path);
      continue;
    }

    const prefix = parts.slice(0, -1).join(".");
    const leaf = parts[parts.length - 1];

    if (!groups.has(prefix)) {
      groups.set(prefix, []);
    }
    groups.get(prefix)!.push(leaf);
  }

  const combined = Array.from(groups.entries()).map(([prefix, leaves]) => {
    const uniqueLeaves = Array.from(new Set(leaves));
    return `${prefix}.${uniqueLeaves.join("|")}`;
  });

  return [...combined, ...singles];
}

function pickOne(source: any, path: string[]): any{
	if (!path.length) return source;

	const [head, ...rest] = path;
	if (!head) return;

	if (head === "*") {
		if (Array.isArray(source)) return source.map((x) => pickOne(x, rest));
		return Object.keys(source).reduce((acc, key) => {
			acc = {...acc, ...{ [key]: pickOne(source[key], rest)}};
			return acc;
		}, {});
	} 
	else if(!Number.isNaN(Number(head))) {
		if (!Array.isArray(source) || !(source.length >= Number(head))) return;
		return [pickOne(source[Number(head)], rest)];
	}

	if (head.includes("|") && rest.length === 0){
		return head.split("|").reduce((acc, key) => {
			acc = {...acc, ...{ [key]: pickOne(source[key], rest) }}
			return acc;
		}, {});
	}

	const targetObj = source[head];
	if (!targetObj) return;
	let foundObj =  rest.length > 0 ? pickOne(targetObj, rest) : targetObj;

	return {
		...(!foundObj ? {} : typeof targetObj === 'object' && !(Object.keys(foundObj).length > 0) ? {} : { [head]: foundObj }),
	};
}