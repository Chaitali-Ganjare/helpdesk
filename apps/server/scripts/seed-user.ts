import { hashPassword } from "better-auth/crypto";
import { PrismaClient, Role } from "../src/generated/prisma";

const prisma = new PrismaClient();

const email = process.env.SEED_EMAIL;
const password = process.env.SEED_PASSWORD;
const name = process.env.SEED_NAME ?? "Admin";
const roleArg = (process.env.SEED_ROLE ?? Role.ADMIN).toUpperCase();

if (!email || !password) {
  console.error("Missing required env vars: SEED_EMAIL, SEED_PASSWORD");
  process.exit(1);
}

if (!(roleArg in Role)) {
  console.error(`SEED_ROLE must be one of: ${Object.values(Role).join(", ")}`);
  process.exit(1);
}

const role = Role[roleArg as keyof typeof Role];

const existing = await prisma.user.findUnique({ where: { email } });
if (existing) {
  console.error(`User with email ${email} already exists`);
  process.exit(1);
}

const hashed = await hashPassword(password);

const user = await prisma.user.create({
  data: {
    name,
    email,
    emailVerified: true,
    role,
    accounts: {
      create: {
        accountId: email,
        providerId: "credential",
        password: hashed,
      },
    },
  },
});

console.log(`Created ${role} user: ${user.name} <${user.email}> (id: ${user.id})`);

await prisma.$disconnect();
