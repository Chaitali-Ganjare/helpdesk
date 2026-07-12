import { hashPassword } from "better-auth/crypto";
import {
  createUserSchema,
  editUserSchema,
  type CreateUserInput,
  type EditUserInput,
} from "@helpdesk/core/schemas/users";
import { prisma } from "../lib/prisma";

export { createUserSchema, editUserSchema, type CreateUserInput, type EditUserInput };

const userListFields = { id: true, name: true, email: true, role: true, createdAt: true } as const;

export function listUsers() {
  return prisma.user.findMany({
    where: { deletedAt: null },
    select: userListFields,
    orderBy: { name: "asc" },
  });
}

// Minimal user list for the ticket-assignment dropdown — open to any
// authenticated user (unlike listUsers, which is admin-only), so it only
// exposes id/name rather than the full admin-facing user record.
export function listAssignableUsers() {
  return prisma.user.findMany({
    where: { deletedAt: null },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
}

// Soft-deleted users are treated as gone: not found for edit/delete purposes.
export function getUserById(id: string) {
  return prisma.user.findFirst({ where: { id, deletedAt: null }, select: userListFields });
}

// Excludes `excludeUserId` from the check so a user can save an edit without
// changing their own email and not be flagged as colliding with themselves.
export async function emailExists(email: string, excludeUserId?: string) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (!existing) return false;
  return existing.id !== excludeUserId;
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

// Soft delete: keep the row (and its history) but mark it deleted, drop any
// active sessions, and remove the credential account so the user can no
// longer sign in — a fresh sign-in attempt has no account to check against.
export async function deleteUser(id: string) {
  await prisma.$transaction([
    prisma.session.deleteMany({ where: { userId: id } }),
    prisma.account.deleteMany({ where: { userId: id, providerId: "credential" } }),
    prisma.user.update({ where: { id }, data: { deletedAt: new Date() } }),
  ]);
}

export async function updateUser(id: string, input: EditUserInput) {
  return prisma.user.update({
    where: { id },
    data: {
      name: input.name,
      email: input.email,
      ...(input.password && {
        accounts: {
          updateMany: {
            where: { providerId: "credential" },
            data: { password: await hashPassword(input.password) },
          },
        },
      }),
    },
    select: userListFields,
  });
}
