import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const users = [
    { username: "magnus", email: "magnus@example.com", rating: 2850 },
    { username: "hikaru", email: "hikaru@example.com", rating: 2780 },
    { username: "alice", email: "alice@example.com", rating: 1450 },
    { username: "bob", email: "bob@example.com", rating: 1320 },
  ];

  for (const u of users) {
    await prisma.user.upsert({
      where: { username: u.username },
      update: {},
      create: {
        username: u.username,
        email: u.email,
        rating: u.rating,
        passwordHash: await bcrypt.hash("password123", 10),
      },
    });
  }
  console.log("Seeded demo users (password: password123)");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
