// structuredClone is available in Node 17+ and all modern browsers
// but TypeScript's ES2022 lib doesn't include it
declare function structuredClone<T>(value: T): T;
