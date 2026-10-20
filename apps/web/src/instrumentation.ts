/** Runs once when the server starts (not during build). */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { bootstrapIfEmpty } = await import("./lib/bootstrap");
  await bootstrapIfEmpty().catch((e) => console.error("[bootstrap] skipped:", e instanceof Error ? e.message : e));
}
