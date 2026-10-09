// Types for oauth.cjs, so the unit tests can use it.
export function createGoogleWaiter(now?: () => number): {
  wait(state: string): Promise<string>;
  receive(body: string): number;
};
