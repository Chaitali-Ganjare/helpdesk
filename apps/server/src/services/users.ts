import { hashPassword } from "better-auth/crypto";
import { createUserSchema, type CreateUserInput } from "@helpdesk/core/schemas/users";
import { prisma } from "../lib/prisma";

export { createUserSchema, type CreateUserInput };

const userListFields = { id: true, name: true, email: true, role: true, createdAt: true } as const;

export function listUsers() {
  return prisma.user.findMany({
    select: userListFields,
    orderBy: { name: "asc" },
  });
}

export async function emailExists(email: string) {
  const existing = await prisma.user.findUnique({ where: { email } });
  return existing !== null;
}

export async function createUser(input: CreateUserInput) {
  const hashed = await hashPassword(input.password);

  return prisma.user.create({
    data: {
      name: input.name,
      email: input.email,
      emailVerified: true,
      accounts: {
        create: {
          accountId: input.email,
          providerId: "credential",
          password: hashed,
        },
      },
    },
    select: userListFields,
  });
}
