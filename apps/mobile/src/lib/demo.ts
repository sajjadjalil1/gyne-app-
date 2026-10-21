/** Demo mode exists only in the web preview build (demo.web.ts); phone builds always talk to the server. */
export const DEMO = false;
export const DEMO_PHONES: { phone: string; label: string }[] = [];
export async function demoApi(_path: string, _init: RequestInit & { json?: unknown }): Promise<unknown> {
  throw new Error("demo mode is web only");
}
