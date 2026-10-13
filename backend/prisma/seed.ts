import { PrismaClient, UserRole, UserStatus, MeetingStatus, ParticipantRole, ParticipantStatus, RecordingStatus, SubscriptionStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting PulseMeet database seed...');

  // 1. Create or update Subscription Plans
  const plans = [
    {
      name: 'Free Plan',
      code: 'FREE',
      priceMonthly: 0,
      priceYearly: 0,
      maxDurationMinutes: 45,
      maxParticipants: 100,
      cloudRecording: false,
      maxStorageMB: 500,
      featuresJson: JSON.stringify([
        'Up to 100 participants',
        '45-minute group meeting limit',
        'HD video & audio',
        'Screen sharing & live chat',
        'WebRTC real-time encryption',
        'Reactions & hand raising'
      ]),
      isActive: true,
    },
    {
      name: 'Pro Plan',
      code: 'PRO',
      priceMonthly: 1200, // $12.00
      priceYearly: 12000, // $120.00
      maxDurationMinutes: 300, // 5 hours
      maxParticipants: 250,
      cloudRecording: true,
      maxStorageMB: 10240, // 10 GB
      featuresJson: JSON.stringify([
        'Up to 250 participants',
        'Up to 5 hours meeting duration',
        'Cloud recording & MP4 export',
        'Waiting room & host moderation',
        'Live speech-to-text captions',
        '10 GB cloud storage',
        'Priority email support'
      ]),
      isActive: true,
    },
    {
      name: 'Business Plan',
      code: 'BUSINESS',
      priceMonthly: 2400, // $24.00
      priceYearly: 24000, // $240.00
      maxDurationMinutes: 1440, // 24 hours
      maxParticipants: 500,
      cloudRecording: true,
      maxStorageMB: 102400, // 100 GB
      featuresJson: JSON.stringify([
        'Up to 500 participants',
        'Unlimited meeting duration (24h)',
        'Unlimited cloud recordings',
        'Organization & team management',
        'Admin audit logs & analytics',
        '100 GB cloud storage',
        'Custom branding & personal vanity URLs',
        '24/7 dedicated support'
      ]),
      isActive: true,
    },
  ];

  for (const plan of plans) {
    await prisma.subscriptionPlan.upsert({
      where: { code: plan.code },
      update: plan,
      create: plan,
    });
  }
  console.log('✅ Subscription plans seeded');

  const proPlan = await prisma.subscriptionPlan.findUnique({ where: { code: 'PRO' } });
  const businessPlan = await prisma.subscriptionPlan.findUnique({ where: { code: 'BUSINESS' } });

  // 2. Hash passwords
  const adminPasswordHash = await bcrypt.hash('Admin123!', 10);
  const userPasswordHash = await bcrypt.hash('Password123!', 10);

  // 3. Create Admin User
  const admin = await prisma.user.upsert({
    where: { email: 'admin@pulsemeet.io' },
    update: {},
    create: {
      email: 'admin@pulsemeet.io',
      password: adminPasswordHash,
      fullName: 'Alex Morgan (Admin)',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
      isVerified: true,
      personalMeetingCode: 'meet-adm-999',
    },
  });

  if (businessPlan) {
    await prisma.userSubscription.upsert({
      where: { id: 'admin-sub' },
      update: {},
      create: {
        id: 'admin-sub',
        userId: admin.id,
        planId: businessPlan.id,
        status: SubscriptionStatus.ACTIVE,
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      },
    });
  }

  // 4. Create Demo Host User
  const host = await prisma.user.upsert({
    where: { email: 'sarah.host@pulsemeet.io' },
    update: {},
    create: {
      email: 'sarah.host@pulsemeet.io',
      password: userPasswordHash,
      fullName: 'Dr. Sarah Jenkins',
      avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
      role: UserRole.USER,
      status: UserStatus.ACTIVE,
      isVerified: true,
      personalMeetingCode: 'meet-sar-101',
    },
  });

  if (proPlan) {
    await prisma.userSubscription.upsert({
      where: { id: 'host-sub' },
      update: {},
      create: {
        id: 'host-sub',
        userId: host.id,
        planId: proPlan.id,
        status: SubscriptionStatus.ACTIVE,
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });
  }

  // 5. Create Demo Participant User
  const participant = await prisma.user.upsert({
    where: { email: 'john.dev@pulsemeet.io' },
    update: {},
    create: {
      email: 'john.dev@pulsemeet.io',
      password: userPasswordHash,
      fullName: 'John Doe',
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
      role: UserRole.USER,
      status: UserStatus.ACTIVE,
      isVerified: true,
      personalMeetingCode: 'meet-joh-202',
    },
  });

  console.log('✅ Demo users seeded (admin, host, participant)');

  // 6. Seed Scheduled Meetings
  const now = new Date();
  const scheduledMeeting1 = await prisma.meeting.upsert({
    where: { code: 'prd-sprt-rev' },
    update: {},
    create: {
      code: 'prd-sprt-rev',
      title: 'Weekly Product Sprint Review',
      description: 'Reviewing v2.0 roadmap, sprint goals, and client feedback.',
      hostId: host.id,
      scheduledAt: new Date(now.getTime() + 2 * 60 * 60 * 1000), // in 2 hours
      durationMinutes: 60,
      passcode: '123456',
      isWaitingRoom: true,
      status: MeetingStatus.SCHEDULED,
    },
  });

  const scheduledMeeting2 = await prisma.meeting.upsert({
    where: { code: 'des-sync-888' },
    update: {},
    create: {
      code: 'des-sync-888',
      title: 'Design System & UI Sync',
      description: 'Refining typography, component library and dark mode accessibility.',
      hostId: admin.id,
      scheduledAt: new Date(now.getTime() + 24 * 60 * 60 * 1000), // tomorrow
      durationMinutes: 45,
      passcode: '',
      isWaitingRoom: false,
      status: MeetingStatus.SCHEDULED,
    },
  });

  // 7. Seed a Past Meeting with Recording
  const pastMeeting = await prisma.meeting.upsert({
    where: { code: 'arc-team-777' },
    update: {},
    create: {
      code: 'arc-team-777',
      title: 'Q3 Enterprise Architecture Planning',
      description: 'Deep dive into microservices scalability and WebRTC SFU topologies.',
      hostId: host.id,
      scheduledAt: new Date(now.getTime() - 48 * 60 * 60 * 1000),
      durationMinutes: 75,
      status: MeetingStatus.ENDED,
      startedAt: new Date(now.getTime() - 48 * 60 * 60 * 1000),
      endedAt: new Date(now.getTime() - 48 * 60 * 60 * 1000 + 75 * 60 * 1000),
    },
  });

  await prisma.recording.upsert({
    where: { id: 'rec-sample-01' },
    update: {},
    create: {
      id: 'rec-sample-01',
      meetingId: pastMeeting.id,
      hostId: host.id,
      title: 'Architecture Planning Session - Recording',
      fileUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
      fileSize: BigInt(45000000), // ~45 MB
      durationSeconds: 4500,
      status: RecordingStatus.READY,
    },
  });

  // 8. Seed Audit Log
  await prisma.auditLog.create({
    data: {
      userId: admin.id,
      action: 'SYSTEM_INITIALIZATION',
      resourceType: 'SYSTEM',
      ipAddress: '127.0.0.1',
      detailsJson: JSON.stringify({ message: 'PulseMeet platform initialized successfully.' }),
    },
  });

  console.log('✅ Scheduled meetings, recordings & audit logs seeded');
  console.log('🎉 Database seeding complete!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
