import "dotenv/config";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Seeding database...");

  // 1. Ensure organizer user exists
  let organizer = await prisma.user.findFirst({
    where: { role: "ORGANIZER" },
  });

  if (!organizer) {
    organizer = await prisma.user.create({
      data: {
        name: "Campus Lead",
        email: "organizer@forte-arena.edu",
        role: "ORGANIZER",
      },
    });
  }

  // 2. Upsert sample events
  const codeSprint = await prisma.event.upsert({
    where: { slug: "code-sprint-2026" },
    update: {},
    create: {
      slug: "code-sprint-2026",
      title: "CodeSprint Algorithmic Battle 2026",
      summary: "Speed programming and algorithmic problem solving championship.",
      description: "CodeSprint tests your speed, problem-solving prowess, and algorithmic mastery. Participants face a curated set of challenging computational problems across dynamic programming, graph theory, and mathematical optimization.",
      rules: "1. Individual participation only.\n2. Languages allowed: C++, Python, Java, Rust.\n3. Plagiarism results in instant disqualification.",
      eligibility: "Open to all currently enrolled undergraduate and graduate students.",
      prizes: "1st Place: 50,000 PKR + Trophy\n2nd Place: 30,000 PKR\n3rd Place: 15,000 PKR",
      venue: "Computer Science Lab 3 & Online Arena",
      category: "TECHNICAL",
      status: "PUBLISHED",
      participationType: "INDIVIDUAL",
      minTeamSize: 1,
      maxTeamSize: 1,
      maxParticipants: 100,
      startsAt: new Date(Date.now() + 7 * 24 * 3600 * 1000),
      endsAt: new Date(Date.now() + 8 * 24 * 3600 * 1000),
      registrationDeadline: new Date(Date.now() + 5 * 24 * 3600 * 1000),
      createdById: organizer.id,
    },
  });

  const futsal = await prisma.event.upsert({
    where: { slug: "futsal-frenzy-2026" },
    update: {},
    create: {
      slug: "futsal-frenzy-2026",
      title: "Futsal Frenzy Cup 2026",
      summary: "High-octane indoor futsal knockout tournament.",
      description: "Gather your best squad and compete on the turf under the floodlights in the annual Forté Arena Futsal Frenzy championship.",
      rules: "1. 5 players on pitch + 3 substitutes.\n2. 20-minute halves with rolling substitutions.\n3. Referee decisions are final.",
      eligibility: "Enrolled college students with valid student IDs.",
      prizes: "Champions: 80,000 PKR + Gold Medals\nRunners Up: 40,000 PKR + Silver Medals",
      venue: "Main Campus Sports Complex - Arena A",
      category: "SPORTS",
      status: "PUBLISHED",
      participationType: "TEAM",
      minTeamSize: 5,
      maxTeamSize: 8,
      maxParticipants: 16,
      startsAt: new Date(Date.now() + 10 * 24 * 3600 * 1000),
      endsAt: new Date(Date.now() + 12 * 24 * 3600 * 1000),
      registrationDeadline: new Date(Date.now() + 7 * 24 * 3600 * 1000),
      createdById: organizer.id,
    },
  });

  const valorant = await prisma.event.upsert({
    where: { slug: "valorant-clash-2026" },
    update: {},
    create: {
      slug: "valorant-clash-2026",
      title: "Valorant Campus Clash 2026",
      summary: "5v5 tactical shooter tournament with broadcast finals.",
      description: "Battle through competitive brackets on dedicated 128-tick servers with live caster commentary in the auditorium.",
      rules: "Standard esports tournament rules. Double elimination bracket.",
      eligibility: "All collegiate players.",
      prizes: "1st: 60,000 PKR + Gaming Gear\n2nd: 30,000 PKR",
      venue: "Esports Lounge & Main Auditorium Stage",
      category: "GAMING",
      status: "PUBLISHED",
      participationType: "TEAM",
      minTeamSize: 5,
      maxTeamSize: 6,
      maxParticipants: 32,
      startsAt: new Date(Date.now() + 14 * 24 * 3600 * 1000),
      endsAt: new Date(Date.now() + 16 * 24 * 3600 * 1000),
      registrationDeadline: new Date(Date.now() + 9 * 24 * 3600 * 1000),
      createdById: organizer.id,
    },
  });

  console.log(`Seeded events: ${codeSprint.slug}, ${futsal.slug}, ${valorant.slug}`);
}

main()
  .catch((e) => {
    console.error("Seeding error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
