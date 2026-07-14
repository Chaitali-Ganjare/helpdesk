import { PrismaClient } from "../src/generated/prisma";

const prisma = new PrismaClient();

const admin = await prisma.user.findFirst({ where: { role: "ADMIN", deletedAt: null } });
if (!admin) {
  console.error("No admin user found — run scripts/seed-user.ts first");
  process.exit(1);
}

const daysAgo = (n: number) => new Date(Date.now() - n * 24 * 60 * 60 * 1000);

const tickets = [
  {
    subject: "Cannot log into my account",
    body: "I've tried resetting my password twice but I'm still locked out. Can someone help?",
    fromEmail: "priya.sharma@example.com",
    fromName: "Priya Sharma",
    status: "OPEN",
    category: "ACCOUNT",
    priority: "HIGH",
    createdAt: daysAgo(1),
  },
  {
    subject: "Invoice #4521 shows wrong amount",
    body: "The invoice I received today charges me for two seats but we only have one active user.",
    fromEmail: "raj.mehta@example.com",
    fromName: "Raj Mehta",
    status: "OPEN",
    category: "BILLING",
    priority: "MEDIUM",
    createdAt: daysAgo(2),
  },
  {
    subject: "App crashes when uploading a file over 10MB",
    body: "Every time I try to attach a large PDF, the page freezes and then shows a 500 error.",
    fromEmail: "john.doe@example.com",
    fromName: "John Doe",
    status: "OPEN",
    category: "TECHNICAL",
    priority: "URGENT",
    createdAt: daysAgo(0),
  },
  {
    subject: "How do I change my billing address?",
    body: "I moved recently and need to update the address on file for invoices.",
    fromEmail: "aisha.khan@example.com",
    fromName: "Aisha Khan",
    status: "RESOLVED",
    category: "BILLING",
    priority: "LOW",
    assignedToAI: true,
    createdAt: daysAgo(5),
    reply: "You can update your billing address under Account Settings > Billing. Let us know if you run into any trouble!",
  },
  {
    subject: "Feature request: dark mode",
    body: "Would love to see a dark mode option in the dashboard.",
    fromEmail: "sam.wilson@example.com",
    fromName: "Sam Wilson",
    status: "CLOSED",
    category: "GENERAL",
    priority: "LOW",
    createdAt: daysAgo(10),
    reply: "Thanks for the suggestion! We've logged this as a feature request for a future release.",
  },
  {
    subject: "Two-factor authentication not sending codes",
    body: "I never receive the SMS code when I try to log in with 2FA enabled.",
    fromEmail: "priya.sharma@example.com",
    fromName: "Priya Sharma",
    status: "OPEN",
    category: "TECHNICAL",
    priority: "HIGH",
    assignedToId: admin.id,
    createdAt: daysAgo(3),
  },
  {
    subject: "Refund request for duplicate charge",
    body: "I was charged twice for last month's subscription. Please refund the duplicate.",
    fromEmail: "raj.mehta@example.com",
    fromName: "Raj Mehta",
    status: "RESOLVED",
    category: "BILLING",
    priority: "MEDIUM",
    assignedToAI: true,
    createdAt: daysAgo(7),
    reply: "We've confirmed the duplicate charge and issued a full refund. It should appear in 3-5 business days.",
  },
  {
    subject: "General question about API rate limits",
    body: "What's the current rate limit for the public API, and can it be increased?",
    fromEmail: "dev@example.com",
    fromName: "Dev Team",
    status: "OPEN",
    category: "GENERAL",
    priority: "LOW",
    createdAt: daysAgo(1),
  },
];

for (const { reply, ...ticket } of tickets) {
  const created = await prisma.ticket.create({ data: ticket });
  if (reply) {
    await prisma.reply.create({
      data: {
        ticketId: created.id,
        body: reply,
        authorId: admin.id,
        senderType: "AGENT",
      },
    });
  }
  console.log(`Created ticket: ${created.subject}`);
}

console.log(`Done — created ${tickets.length} sample tickets.`);

await prisma.$disconnect();
