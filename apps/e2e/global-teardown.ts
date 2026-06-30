// Database cleanup is handled at the start of each run in global-setup.ts
// (prisma migrate reset --force). Nothing to do here.
export default async function globalTeardown() {}
