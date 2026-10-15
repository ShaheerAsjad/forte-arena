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

  // 2. Demo Students (8 students for team & individual results)
  const demoStudents = [
    {
      email: "demo1@demo.forte-arena.edu",
      name: "Ahmad Raza",
      rollNumber: "CS-2023-014",
      department: "Computer Science",
      phone: "+92 300 1234567",
    },
    {
      email: "demo2@demo.forte-arena.edu",
      name: "Fatima Noor",
      rollNumber: "EE-2023-088",
      department: "Electrical Engineering",
      phone: "+92 301 2345678",
    },
    {
      email: "demo3@demo.forte-arena.edu",
      name: "Bilal Hassan",
      rollNumber: "SE-2022-042",
      department: "Software Engineering",
      phone: "+92 302 3456789",
    },
    {
      email: "demo4@demo.forte-arena.edu",
      name: "Zainab Tariq",
      rollNumber: "CS-2024-105",
      department: "Computer Science",
      phone: "+92 303 4567890",
    },
    {
      email: "demo5@demo.forte-arena.edu",
      name: "Hamza Ali",
      rollNumber: "ME-2023-019",
      department: "Mechanical Engineering",
      phone: "+92 304 5678901",
    },
    {
      email: "demo6@demo.forte-arena.edu",
      name: "Ayesha Siddiqua",
      rollNumber: "AI-2023-073",
      department: "Artificial Intelligence",
      phone: "+92 305 6789012",
    },
    {
      email: "demo7@demo.forte-arena.edu",
      name: "Usman Ghani",
      rollNumber: "BBA-2022-031",
      department: "Business Administration",
      phone: "+92 306 7890123",
    },
    {
      email: "demo8@demo.forte-arena.edu",
      name: "Hania Imran",
      rollNumber: "SE-2023-094",
      department: "Software Engineering",
      phone: "+92 307 8901234",
    },
  ];

  const studentMap = new Map<string, { id: string; name: string }>();
  for (const s of demoStudents) {
    const student = await prisma.user.upsert({
      where: { email: s.email },
      update: {
        name: s.name,
        rollNumber: s.rollNumber,
        department: s.department,
        phone: s.phone,
      },
      create: {
        email: s.email,
        name: s.name,
        rollNumber: s.rollNumber,
        department: s.department,
        phone: s.phone,
        role: "STUDENT",
      },
    });
    studentMap.set(s.email, student);
  }

  // 3. Events (6 total with varied states and categories)

  // Event 1: Registration Open (> 48h deadline) - TECHNICAL / INDIVIDUAL
  await prisma.event.upsert({
    where: { slug: "code-sprint-2026" },
    update: {
      status: "PUBLISHED",
      startsAt: new Date(Date.now() + 7 * 24 * 3600 * 1000),
      endsAt: new Date(Date.now() + 8 * 24 * 3600 * 1000),
      registrationDeadline: new Date(Date.now() + 5 * 24 * 3600 * 1000),
    },
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

  // Event 2: Registration Open (> 48h deadline) - SPORTS / TEAM
  await prisma.event.upsert({
    where: { slug: "futsal-frenzy-2026" },
    update: {
      status: "PUBLISHED",
      startsAt: new Date(Date.now() + 10 * 24 * 3600 * 1000),
      endsAt: new Date(Date.now() + 12 * 24 * 3600 * 1000),
      registrationDeadline: new Date(Date.now() + 7 * 24 * 3600 * 1000),
    },
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

  // Event 3: Closing Soon (deadline within 48 hours) - GAMING / TEAM
  await prisma.event.upsert({
    where: { slug: "valorant-clash-2026" },
    update: {
      status: "PUBLISHED",
      startsAt: new Date(Date.now() + 44 * 3600 * 1000),
      endsAt: new Date(Date.now() + 68 * 3600 * 1000),
      registrationDeadline: new Date(Date.now() + 28 * 3600 * 1000), // ~28 hours from now
    },
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
      startsAt: new Date(Date.now() + 44 * 3600 * 1000),
      endsAt: new Date(Date.now() + 68 * 3600 * 1000),
      registrationDeadline: new Date(Date.now() + 28 * 3600 * 1000),
      createdById: organizer.id,
    },
  });

  // Event 4: Upcoming (registration opens later / DRAFT) - CULTURAL / TEAM
  await prisma.event.upsert({
    where: { slug: "battle-of-the-bands-2026" },
    update: {
      status: "DRAFT",
      startsAt: new Date(Date.now() + 30 * 24 * 3600 * 1000),
      endsAt: new Date(Date.now() + 31 * 24 * 3600 * 1000),
      registrationDeadline: new Date(Date.now() + 25 * 24 * 3600 * 1000),
    },
    create: {
      slug: "battle-of-the-bands-2026",
      title: "Battle of the Bands: Rock & Fusion 2026",
      summary: "Live acoustic and electric band showdown on the open-air amphitheater stage.",
      description: "Showcase your group's musical synergy, vocal harmony, and stage charisma before a live audience of over 2,000 students and celebrity industry judges.",
      rules: "1. 3 to 6 members per band.\n2. 15 minutes stage performance (soundcheck included).\n3. Original compositions earn bonus scoring.",
      eligibility: "Student musical bands from affiliated regional colleges and universities.",
      prizes: "Grand Prize: 100,000 PKR + Studio Recording Contract\nBest Vocalist: 25,000 PKR",
      venue: "Open-Air Campus Amphitheater",
      category: "CULTURAL",
      status: "DRAFT",
      participationType: "TEAM",
      minTeamSize: 3,
      maxTeamSize: 6,
      maxParticipants: 12,
      startsAt: new Date(Date.now() + 30 * 24 * 3600 * 1000),
      endsAt: new Date(Date.now() + 31 * 24 * 3600 * 1000),
      registrationDeadline: new Date(Date.now() + 25 * 24 * 3600 * 1000),
      createdById: organizer.id,
    },
  });

  // Event 5: Completed (past date, published results) - ACADEMIC / INDIVIDUAL
  const speedChess = await prisma.event.upsert({
    where: { slug: "speed-chess-championship-2026" },
    update: {
      status: "COMPLETED",
      resultsPublished: true,
      startsAt: new Date("2026-10-05T09:00:00.000Z"),
      endsAt: new Date("2026-10-05T18:00:00.000Z"),
      registrationDeadline: new Date("2026-10-03T23:59:59.000Z"),
    },
    create: {
      slug: "speed-chess-championship-2026",
      title: "Inter-Varsity Blitz Chess Championship 2026",
      summary: "FIDE-rated blitz chess tournament with 7 rounds Swiss system.",
      description: "High-concentration tactical battle testing rapid decision making under 3+2 blitz time control.",
      rules: "FIDE Blitz Rules. 3 minutes + 2 seconds increment. Touch-move strictly enforced.",
      eligibility: "Open to all verified college and university students.",
      prizes: "1st: 35,000 PKR + Gold Medal\n2nd: 20,000 PKR\n3rd: 10,000 PKR",
      venue: "Central Student Hall B",
      category: "ACADEMIC",
      status: "COMPLETED",
      participationType: "INDIVIDUAL",
      minTeamSize: 1,
      maxTeamSize: 1,
      maxParticipants: 64,
      startsAt: new Date("2026-10-05T09:00:00.000Z"),
      endsAt: new Date("2026-10-05T18:00:00.000Z"),
      registrationDeadline: new Date("2026-10-03T23:59:59.000Z"),
      resultsPublished: true,
      createdById: organizer.id,
    },
  });

  // Event 6: Completed (past date, published results) - TECHNICAL / TEAM
  const roboWars = await prisma.event.upsert({
    where: { slug: "robowars-arena-clash-2026" },
    update: {
      status: "COMPLETED",
      resultsPublished: true,
      startsAt: new Date("2026-10-08T10:00:00.000Z"),
      endsAt: new Date("2026-10-09T17:00:00.000Z"),
      registrationDeadline: new Date("2026-10-06T23:59:59.000Z"),
    },
    create: {
      slug: "robowars-arena-clash-2026",
      title: "RoboWars: 15kg Combat Robot Championship",
      summary: "Armor-plated combat robotics in an enclosed polycarbonate cage.",
      description: "Custom-engineered combat robots engage in head-to-head tactical combat. Mechanical durability, weapon power, and driver reflex decide the ultimate arena champion.",
      rules: "15kg weight limit. Active weapon required. Enclosed safety box matches. 3-minute bouts.",
      eligibility: "Engineering and computing student design teams.",
      prizes: "1st: 75,000 PKR + Championship Belt\n2nd: 35,000 PKR\n3rd: 15,000 PKR",
      venue: "Engineering Pavilion Arena Cage",
      category: "TECHNICAL",
      status: "COMPLETED",
      participationType: "TEAM",
      minTeamSize: 2,
      maxTeamSize: 4,
      maxParticipants: 16,
      startsAt: new Date("2026-10-08T10:00:00.000Z"),
      endsAt: new Date("2026-10-09T17:00:00.000Z"),
      registrationDeadline: new Date("2026-10-06T23:59:59.000Z"),
      resultsPublished: true,
      createdById: organizer.id,
    },
  });

  // 4. Registrations & Results for Completed Event 1: speed-chess-championship-2026 (Individual)
  const chessRanks = [
    {
      studentEmail: "demo1@demo.forte-arena.edu",
      position: 1,
      award: "Grandmaster Champion & Gold Medal",
      remarks: "Undefeated across all 7 rounds",
      certificateUrl: "https://certificates.forte-arena.edu/chess-2026/ahmad-raza.pdf",
    },
    {
      studentEmail: "demo2@demo.forte-arena.edu",
      position: 2,
      award: "Silver Medal",
      remarks: "Narrowly finished 2nd after blitz tie-break",
      certificateUrl: "https://certificates.forte-arena.edu/chess-2026/fatima-noor.pdf",
    },
    {
      studentEmail: "demo3@demo.forte-arena.edu",
      position: 3,
      award: "Bronze Medal",
      remarks: "Secured podium with tactical endgame play",
      certificateUrl: "https://certificates.forte-arena.edu/chess-2026/bilal-hassan.pdf",
    },
    {
      studentEmail: "demo4@demo.forte-arena.edu",
      position: 4,
      award: "Top Junior Trophy",
      remarks: "Highest rated under-20 collegiate competitor",
      certificateUrl: "https://certificates.forte-arena.edu/chess-2026/zainab-tariq.pdf",
    },
  ];

  for (const cr of chessRanks) {
    const student = studentMap.get(cr.studentEmail)!;
    const reg = await prisma.registration.upsert({
      where: {
        eventId_userId: {
          eventId: speedChess.id,
          userId: student.id,
        },
      },
      update: { status: "APPROVED" },
      create: {
        eventId: speedChess.id,
        userId: student.id,
        status: "APPROVED",
        reviewedById: organizer.id,
        reviewedAt: new Date("2026-10-04T12:00:00.000Z"),
      },
    });

    await prisma.result.upsert({
      where: {
        registrationId: reg.id,
      },
      update: {
        position: cr.position,
        award: cr.award,
        certificateUrl: cr.certificateUrl,
        remarks: cr.remarks,
      },
      create: {
        eventId: speedChess.id,
        registrationId: reg.id,
        position: cr.position,
        award: cr.award,
        certificateUrl: cr.certificateUrl,
        remarks: cr.remarks,
      },
    });
  }

  // 5. Registrations & Results for Completed Event 2: robowars-arena-clash-2026 (Team)
  const roboTeamsData = [
    {
      teamName: "MechaTitans",
      leaderEmail: "demo5@demo.forte-arena.edu",
      memberEmails: ["demo5@demo.forte-arena.edu", "demo6@demo.forte-arena.edu"],
      position: 1,
      award: "Arena Heavyweight Champion Trophy",
      remarks: "Pneumatic flipper robot undefeated throughout bracket",
      certificateUrl: "https://certificates.forte-arena.edu/robowars-2026/mechatitans.pdf",
    },
    {
      teamName: "CyberVipers",
      leaderEmail: "demo7@demo.forte-arena.edu",
      memberEmails: ["demo7@demo.forte-arena.edu", "demo8@demo.forte-arena.edu"],
      position: 2,
      award: "Runner-Up Silver Trophy",
      remarks: "High-RPM vertical spinner finalist",
      certificateUrl: "https://certificates.forte-arena.edu/robowars-2026/cybervipers.pdf",
    },
    {
      teamName: "CircuitBreakers",
      leaderEmail: "demo1@demo.forte-arena.edu",
      memberEmails: ["demo1@demo.forte-arena.edu", "demo2@demo.forte-arena.edu"],
      position: 3,
      award: "Bronze Trophy",
      remarks: "Fast wedge bot with exceptional arena control",
      certificateUrl: "https://certificates.forte-arena.edu/robowars-2026/circuitbreakers.pdf",
    },
  ];

  for (const rt of roboTeamsData) {
    const leader = studentMap.get(rt.leaderEmail)!;
    const team = await prisma.team.upsert({
      where: {
        eventId_name: {
          eventId: roboWars.id,
          name: rt.teamName,
        },
      },
      update: {
        leaderId: leader.id,
      },
      create: {
        eventId: roboWars.id,
        name: rt.teamName,
        leaderId: leader.id,
      },
    });

    // Add team members if not already created
    for (const mEmail of rt.memberEmails) {
      const existingMember = await prisma.teamMember.findFirst({
        where: {
          teamId: team.id,
          rollNumber: demoStudents.find((d) => d.email === mEmail)!.rollNumber,
        },
      });
      if (!existingMember) {
        const studentInfo = demoStudents.find((d) => d.email === mEmail)!;
        await prisma.teamMember.create({
          data: {
            teamId: team.id,
            fullName: studentInfo.name,
            rollNumber: studentInfo.rollNumber,
            email: studentInfo.email,
            phone: studentInfo.phone,
          },
        });
      }
    }

    const reg = await prisma.registration.upsert({
      where: {
        eventId_userId: {
          eventId: roboWars.id,
          userId: leader.id,
        },
      },
      update: {
        teamId: team.id,
        status: "APPROVED",
      },
      create: {
        eventId: roboWars.id,
        userId: leader.id,
        teamId: team.id,
        status: "APPROVED",
        reviewedById: organizer.id,
        reviewedAt: new Date("2026-10-07T14:00:00.000Z"),
      },
    });

    await prisma.result.upsert({
      where: {
        registrationId: reg.id,
      },
      update: {
        position: rt.position,
        award: rt.award,
        certificateUrl: rt.certificateUrl,
        remarks: rt.remarks,
      },
      create: {
        eventId: roboWars.id,
        registrationId: reg.id,
        position: rt.position,
        award: rt.award,
        certificateUrl: rt.certificateUrl,
        remarks: rt.remarks,
      },
    });
  }

  // 6. Announcements (3 certificate-related bulletins)
  const certificateAnnouncements = [
    {
      title: "Certificates for Completed Events Issued to Winners and Participants",
      body: "Official digital merit and participation certificates for all completed events (including Blitz Chess and RoboWars) will be issued directly to verified winners and participants. Physical certificates and trophies may also be collected from the campus lead office.",
      pinned: true,
      publishedAt: new Date("2026-10-14T09:00:00.000Z"),
    },
    {
      title: "How to Download Your Certificate from the Results Page",
      body: "Students can now download their verifiable digital certificates directly from the Results page. Navigate to Results, locate your completed competition, and click 'Download Certificate' beside your team or individual placement.",
      pinned: false,
      publishedAt: new Date("2026-10-14T11:00:00.000Z"),
    },
    {
      title: "Certificate Policy: Issued Only to Approved Participants Matching Registration Name",
      body: "Certificates are issued strictly to approved participants whose names exactly match their verified registration credentials and institutional ID. In case of any name discrepancies or corrections, please reach out to the organizing desk.",
      pinned: false,
      publishedAt: new Date("2026-10-14T13:00:00.000Z"),
    },
  ];

  // Remove any legacy announcements that are not in the new 3
  await prisma.announcement.deleteMany({
    where: {
      title: { notIn: certificateAnnouncements.map((a) => a.title) },
    },
  });

  for (const a of certificateAnnouncements) {
    const existing = await prisma.announcement.findFirst({
      where: { title: a.title },
    });
    if (existing) {
      await prisma.announcement.update({
        where: { id: existing.id },
        data: {
          body: a.body,
          pinned: a.pinned,
          publishedAt: a.publishedAt,
        },
      });
    } else {
      await prisma.announcement.create({
        data: {
          title: a.title,
          body: a.body,
          pinned: a.pinned,
          publishedAt: a.publishedAt,
          createdById: organizer.id,
        },
      });
    }
  }

  const announcementCount = await prisma.announcement.count();
  console.log(`Announcements verified: ${announcementCount} rows.`);
  console.log("Seeding complete: 6 events, 8 students, 7 registrations, 7 results, 3 announcements.");
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
