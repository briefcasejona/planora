// The few Node.js functions the unit tests use (the app itself never runs on Node).
declare module 'node:fs' {
  export function mkdtempSync(prefix: string): string;
  export function writeFileSync(file: string, data: string): void;
}
declare module 'node:os' {
  export function tmpdir(): string;
}
declare module 'node:path' {
  export function join(...parts: string[]): string;
}
