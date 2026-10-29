// Next.js only inlines NEXT_PUBLIC_ variables into the client bundle when they are read as
// `process.env.X` from the global `process`; importing `node:process` would break that.
// biome-ignore lint/correctness/noProcessGlobal: must use the global process for Next.js env inlining
// biome-ignore lint/style/noProcessEnv: moved from ScheduleComponent, which already read this env var directly
const configuredInterval = process.env.NEXT_PUBLIC_AVAILABILITY_SCHEDULE_INTERVAL;

export const AVAILABILITY_SLOT_INTERVAL_MINUTES = Number(configuredInterval) || 15;
