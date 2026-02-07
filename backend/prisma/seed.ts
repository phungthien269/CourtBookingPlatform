import { PrismaClient, UserRole, UserStatus, VenueStatus, BookingStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Seeding database...');

    // Clear existing data in correct order (respect FK constraints)
    await prisma.auditLog.deleteMany();
    await prisma.chatMessage.deleteMany();
    await prisma.chatThread.deleteMany();
    await prisma.review.deleteMany();
    await prisma.payment.deleteMany();
    await prisma.booking.deleteMany();
    await prisma.courtBlackout.deleteMany();  // Phase 2
    await prisma.holiday.deleteMany();
    await prisma.schedule.deleteMany();
    await prisma.venueImage.deleteMany();
    await prisma.court.deleteMany();
    await prisma.venueSportType.deleteMany();
    await prisma.venue.deleteMany();
    await prisma.manager.deleteMany();
    await prisma.otpVerification.deleteMany();
    await prisma.user.deleteMany();
    await prisma.sportType.deleteMany();

    // ==================== SPORT TYPES ====================
    console.log('🏸 Creating sport types...');

    const sportTypes = await Promise.all([
        prisma.sportType.create({ data: { code: 'BADMINTON', name: 'Cầu lông' } }),
        prisma.sportType.create({ data: { code: 'PICKLEBALL', name: 'Pickleball' } }),
        prisma.sportType.create({ data: { code: 'TENNIS', name: 'Tennis' } }),
        prisma.sportType.create({ data: { code: 'TABLE_TENNIS', name: 'Bóng bàn' } }),
        prisma.sportType.create({ data: { code: 'FOOTBALL', name: 'Bóng đá mini' } }),
    ]);

    const [badminton, pickleball, tennis, tableTennis, football] = sportTypes;
    console.log('✅ Sport types: BADMINTON, PICKLEBALL, TENNIS, TABLE_TENNIS, FOOTBALL');

    // ==================== USERS ====================
    console.log('👥 Creating users...');

    const adminPassword = await bcrypt.hash('Admin@123', 12);
    const admin = await prisma.user.create({
        data: {
            email: 'admin@courtbooking.vn',
            passwordHash: adminPassword,
            name: 'Admin',
            role: UserRole.ADMIN,
            isEmailVerified: true,
            status: UserStatus.ACTIVE,
        },
    });
    console.log('✅ Admin: admin@courtbooking.vn / Admin@123');

    // Create 4 managers for 4 venues
    const managerPassword = await bcrypt.hash('Manager@123', 12);

    const manager1User = await prisma.user.create({
        data: {
            email: 'manager1@courtbooking.vn',
            passwordHash: managerPassword,
            name: 'Nguyễn Văn Manager',
            role: UserRole.MANAGER,
            isEmailVerified: true,
            status: UserStatus.ACTIVE,
        },
    });

    const manager2User = await prisma.user.create({
        data: {
            email: 'manager2@courtbooking.vn',
            passwordHash: managerPassword,
            name: 'Trần Thị Manager',
            role: UserRole.MANAGER,
            isEmailVerified: true,
            status: UserStatus.ACTIVE,
        },
    });

    const manager3User = await prisma.user.create({
        data: {
            email: 'manager3@courtbooking.vn',
            passwordHash: managerPassword,
            name: 'Lê Văn Manager',
            role: UserRole.MANAGER,
            isEmailVerified: true,
            status: UserStatus.ACTIVE,
        },
    });

    const manager4User = await prisma.user.create({
        data: {
            email: 'manager4@courtbooking.vn',
            passwordHash: managerPassword,
            name: 'Phạm Thị Manager',
            role: UserRole.MANAGER,
            isEmailVerified: true,
            status: UserStatus.ACTIVE,
        },
    });

    console.log('✅ Managers: manager1-4@courtbooking.vn / Manager@123');

    // Create Manager profiles
    const manager1 = await prisma.manager.create({
        data: {
            userId: manager1User.id,
            displayName: 'Sân Phú Nhuận Sport',
            subscriptionExpiresAt: new Date('2026-12-31'),
        },
    });

    const manager2 = await prisma.manager.create({
        data: {
            userId: manager2User.id,
            displayName: 'Quận 7 Badminton Center',
            subscriptionExpiresAt: new Date('2026-12-31'),
        },
    });

    const manager3 = await prisma.manager.create({
        data: {
            userId: manager3User.id,
            displayName: 'Thủ Đức Tennis Club',
            subscriptionExpiresAt: new Date('2026-12-31'),
        },
    });

    const manager4 = await prisma.manager.create({
        data: {
            userId: manager4User.id,
            displayName: 'Tân Bình Sports Hub',
            subscriptionExpiresAt: new Date('2026-12-31'),
        },
    });

    // ==================== VENUES ====================
    console.log('🏟️ Creating venues...');

    // Venue 1: Phú Nhuận - Badminton + Pickleball
    const venue1 = await prisma.venue.create({
        data: {
            managerId: manager1.id,
            name: 'Sân Phú Nhuận Sport',
            address: '123 Phan Xích Long, Phường 2',
            district: 'Phú Nhuận',
            city: 'TP.HCM',
            lat: 10.8012,
            lng: 106.6802,
            description: 'Sân cầu lông và pickleball chất lượng cao, có điều hòa, sàn gỗ cao cấp. Phục vụ từ 6h sáng đến 22h tối.',
            contactPhone: '0901234567',
            status: VenueStatus.ACTIVE,
        },
    });

    // Venue 2: Quận 7 - Badminton only
    const venue2 = await prisma.venue.create({
        data: {
            managerId: manager2.id,
            name: 'Quận 7 Badminton Center',
            address: '456 Nguyễn Thị Thập, Phường Tân Phú',
            district: 'Quận 7',
            city: 'TP.HCM',
            lat: 10.7374,
            lng: 106.7210,
            description: 'Trung tâm cầu lông lớn nhất Quận 7. 8 sân tiêu chuẩn quốc tế, hệ thống ánh sáng LED cao cấp.',
            contactPhone: '0902345678',
            status: VenueStatus.ACTIVE,
        },
    });

    // Venue 3: Thủ Đức - Tennis + Badminton
    const venue3 = await prisma.venue.create({
        data: {
            managerId: manager3.id,
            name: 'Thủ Đức Tennis Club',
            address: '789 Võ Văn Ngân, Phường Linh Chiểu',
            district: 'Thủ Đức',
            city: 'TP.HCM',
            lat: 10.8544,
            lng: 106.7535,
            description: 'Câu lạc bộ tennis cao cấp với sân đất nện và sân cứng. Có huấn luyện viên chuyên nghiệp.',
            contactPhone: '0903456789',
            status: VenueStatus.ACTIVE,
        },
    });

    // Venue 4: Tân Bình - Multi-sport
    const venue4 = await prisma.venue.create({
        data: {
            managerId: manager4.id,
            name: 'Tân Bình Sports Hub',
            address: '321 Cộng Hòa, Phường 13',
            district: 'Tân Bình',
            city: 'TP.HCM',
            lat: 10.8012,
            lng: 106.6502,
            description: 'Tổ hợp thể thao đa năng: cầu lông, bóng bàn, bóng đá mini. Có canteen và chỗ đậu xe rộng rãi.',
            contactPhone: '0904567890',
            status: VenueStatus.ACTIVE,
        },
    });

    console.log('✅ Venues: Phú Nhuận, Quận 7, Thủ Đức, Tân Bình');

    // ==================== VENUE SPORT TYPES ====================
    await prisma.venueSportType.createMany({
        data: [
            // Venue 1: Badminton + Pickleball
            { venueId: venue1.id, sportTypeId: badminton.id },
            { venueId: venue1.id, sportTypeId: pickleball.id },
            // Venue 2: Badminton only
            { venueId: venue2.id, sportTypeId: badminton.id },
            // Venue 3: Tennis + Badminton
            { venueId: venue3.id, sportTypeId: tennis.id },
            { venueId: venue3.id, sportTypeId: badminton.id },
            // Venue 4: Badminton + Table Tennis + Football
            { venueId: venue4.id, sportTypeId: badminton.id },
            { venueId: venue4.id, sportTypeId: tableTennis.id },
            { venueId: venue4.id, sportTypeId: football.id },
        ],
    });

    // ==================== COURTS ====================
    console.log('🎾 Creating courts...');

    // Venue 1 courts
    await prisma.court.createMany({
        data: [
            { venueId: venue1.id, sportTypeId: badminton.id, name: 'Sân 1', pricePerHour: 120000 },
            { venueId: venue1.id, sportTypeId: badminton.id, name: 'Sân 2', pricePerHour: 120000 },
            { venueId: venue1.id, sportTypeId: pickleball.id, name: 'Sân 3 (Pickleball)', pricePerHour: 150000 },
        ],
    });

    // Venue 2 courts
    await prisma.court.createMany({
        data: [
            { venueId: venue2.id, sportTypeId: badminton.id, name: 'Sân A', pricePerHour: 100000 },
            { venueId: venue2.id, sportTypeId: badminton.id, name: 'Sân B', pricePerHour: 100000 },
            { venueId: venue2.id, sportTypeId: badminton.id, name: 'Sân C', pricePerHour: 130000 },
            { venueId: venue2.id, sportTypeId: badminton.id, name: 'Sân VIP', pricePerHour: 180000 },
        ],
    });

    // Venue 3 courts
    await prisma.court.createMany({
        data: [
            { venueId: venue3.id, sportTypeId: tennis.id, name: 'Tennis Court 1', pricePerHour: 250000 },
            { venueId: venue3.id, sportTypeId: tennis.id, name: 'Tennis Court 2', pricePerHour: 250000 },
            { venueId: venue3.id, sportTypeId: badminton.id, name: 'Badminton 1', pricePerHour: 130000 },
        ],
    });

    // Venue 4 courts
    await prisma.court.createMany({
        data: [
            { venueId: venue4.id, sportTypeId: badminton.id, name: 'Sân cầu lông 1', pricePerHour: 90000 },
            { venueId: venue4.id, sportTypeId: badminton.id, name: 'Sân cầu lông 2', pricePerHour: 90000 },
            { venueId: venue4.id, sportTypeId: tableTennis.id, name: 'Bàn bóng 1', pricePerHour: 50000 },
            { venueId: venue4.id, sportTypeId: tableTennis.id, name: 'Bàn bóng 2', pricePerHour: 50000 },
            { venueId: venue4.id, sportTypeId: football.id, name: 'Sân mini 5 người', pricePerHour: 400000 },
        ],
    });

    console.log('✅ Courts created for all venues');

    // ==================== SCHEDULES ====================
    console.log('📅 Creating schedules...');

    // Helper function for schedule creation
    const createWeekdaySchedules = async (venueId: string, shifts: { openTime: string; closeTime: string }[]) => {
        for (let day = 1; day <= 5; day++) {
            for (const shift of shifts) {
                await prisma.schedule.create({
                    data: { venueId, dayOfWeek: day, ...shift },
                });
            }
        }
    };

    const createWeekendSchedules = async (venueId: string, shift: { openTime: string; closeTime: string }) => {
        for (const day of [0, 6]) {
            await prisma.schedule.create({
                data: { venueId, dayOfWeek: day, ...shift },
            });
        }
    };

    // Venue 1: Mon-Fri 6-11, 14-22; Sat-Sun 6-22
    await createWeekdaySchedules(venue1.id, [
        { openTime: '06:00', closeTime: '11:00' },
        { openTime: '14:00', closeTime: '22:00' },
    ]);
    await createWeekendSchedules(venue1.id, { openTime: '06:00', closeTime: '22:00' });

    // Venue 2: Mon-Fri 7-22; Sat-Sun 7-23
    await createWeekdaySchedules(venue2.id, [{ openTime: '07:00', closeTime: '22:00' }]);
    await createWeekendSchedules(venue2.id, { openTime: '07:00', closeTime: '23:00' });

    // Venue 3: Mon-Fri 6-12, 16-21; Sat-Sun 6-21
    await createWeekdaySchedules(venue3.id, [
        { openTime: '06:00', closeTime: '12:00' },
        { openTime: '16:00', closeTime: '21:00' },
    ]);
    await createWeekendSchedules(venue3.id, { openTime: '06:00', closeTime: '21:00' });

    // Venue 4: Full day 8-22 every day
    for (let day = 0; day <= 6; day++) {
        await prisma.schedule.create({
            data: { venueId: venue4.id, dayOfWeek: day, openTime: '08:00', closeTime: '22:00' },
        });
    }

    console.log('✅ Schedules created for all venues');

    // ==================== HOLIDAYS ====================
    console.log('🎌 Creating holidays...');

    await prisma.holiday.createMany({
        data: [
            { venueId: venue1.id, date: new Date('2026-02-10'), note: 'Nghỉ Tết Nguyên Đán' },
            { venueId: venue1.id, date: new Date('2026-02-11'), note: 'Nghỉ Tết Nguyên Đán' },
            { venueId: venue2.id, date: new Date('2026-02-10'), note: 'Nghỉ Tết' },
            { venueId: venue3.id, date: new Date('2026-02-10'), note: 'Nghỉ Tết' },
            { venueId: venue4.id, date: new Date('2026-02-10'), note: 'Nghỉ Tết' },
        ],
    });

    console.log('✅ Holidays created');

    // ==================== VENUE IMAGES ====================
    console.log('🖼️ Creating venue images...');

    await prisma.venueImage.createMany({
        data: [
            // Venue 1
            { venueId: venue1.id, url: 'https://placehold.co/800x600/22c55e/white?text=Phu+Nhuan+Sport', isCover: true },
            { venueId: venue1.id, url: 'https://placehold.co/800x600/16a34a/white?text=San+1', isCover: false },
            { venueId: venue1.id, url: 'https://placehold.co/800x600/15803d/white?text=San+2', isCover: false },
            // Venue 2
            { venueId: venue2.id, url: 'https://placehold.co/800x600/3b82f6/white?text=Quan+7+Center', isCover: true },
            { venueId: venue2.id, url: 'https://placehold.co/800x600/2563eb/white?text=San+A', isCover: false },
            // Venue 3
            { venueId: venue3.id, url: 'https://placehold.co/800x600/f59e0b/white?text=Thu+Duc+Tennis', isCover: true },
            { venueId: venue3.id, url: 'https://placehold.co/800x600/d97706/white?text=Tennis+Court', isCover: false },
            // Venue 4
            { venueId: venue4.id, url: 'https://placehold.co/800x600/ef4444/white?text=Tan+Binh+Hub', isCover: true },
            { venueId: venue4.id, url: 'https://placehold.co/800x600/dc2626/white?text=Football', isCover: false },
            { venueId: venue4.id, url: 'https://placehold.co/800x600/b91c1c/white?text=Table+Tennis', isCover: false },
        ],
    });

    console.log('✅ Venue images created');

    // ==================== USER ====================
    const userPassword = await bcrypt.hash('User@123', 12);
    const testUser = await prisma.user.create({
        data: {
            email: 'user@courtbooking.vn',
            passwordHash: userPassword,
            name: 'Trần Văn User',
            role: UserRole.USER,
            isEmailVerified: true,
            status: UserStatus.ACTIVE,
        },
    });
    console.log('✅ User: user@courtbooking.vn / User@123');

    // ==================== PHASE 2: CONFIRMED BOOKINGS ====================
    console.log('📅 Creating confirmed bookings for availability testing...');

    // Get courts for booking
    const venue1Courts = await prisma.court.findMany({ where: { venueId: venue1.id } });
    const venue2Courts = await prisma.court.findMany({ where: { venueId: venue2.id } });

    // Booking 1: Venue 1, Court 1, tomorrow 18:00-20:00
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    await prisma.booking.create({
        data: {
            courtId: venue1Courts[0].id,
            userId: testUser.id,
            date: tomorrow,
            startTime: '18:00',
            endTime: '20:00',
            durationHours: 2,
            totalPrice: venue1Courts[0].pricePerHour * 2,
            status: BookingStatus.CONFIRMED,
        },
    });

    // Booking 2: Venue 1, Court 1, tomorrow 08:00-09:00
    await prisma.booking.create({
        data: {
            courtId: venue1Courts[0].id,
            userId: testUser.id,
            date: tomorrow,
            startTime: '08:00',
            endTime: '09:00',
            durationHours: 1,
            totalPrice: venue1Courts[0].pricePerHour,
            status: BookingStatus.CONFIRMED,
        },
    });

    // Booking 3: Venue 2, Court A, tomorrow 19:00-21:00
    await prisma.booking.create({
        data: {
            courtId: venue2Courts[0].id,
            userId: testUser.id,
            date: tomorrow,
            startTime: '19:00',
            endTime: '21:00',
            durationHours: 2,
            totalPrice: venue2Courts[0].pricePerHour * 2,
            status: BookingStatus.CONFIRMED,
        },
    });

    console.log('✅ CONFIRMED bookings created for testing');

    // ==================== PHASE 2: COURT BLACKOUTS ====================
    console.log('🔒 Creating court blackouts for testing...');

    // Blackout 1: Venue 1, Court 2, tomorrow 14:00-16:00 (manager locked)
    await prisma.courtBlackout.create({
        data: {
            courtId: venue1Courts[1].id,
            date: tomorrow,
            startTime: '14:00',
            endTime: '16:00',
            reason: 'Bảo trì sân',
        },
    });

    // Blackout 2: Venue 2, Court VIP, tomorrow 10:00-12:00 (private event)
    await prisma.courtBlackout.create({
        data: {
            courtId: venue2Courts[3].id,  // VIP court
            date: tomorrow,
            startTime: '10:00',
            endTime: '12:00',
            reason: 'Sự kiện riêng',
        },
    });

    console.log('✅ Court blackouts created for testing');

    // ==================== SUMMARY ====================
    console.log('\n🎉 Seeding completed!');
    console.log('📊 Summary:');
    console.log('   - Sport Types: 5 (Badminton, Pickleball, Tennis, Table Tennis, Football)');
    console.log('   - Venues: 4 (Phú Nhuận, Quận 7, Thủ Đức, Tân Bình)');
    console.log('   - Courts: 15 total');
    console.log('   - Users: 1 admin, 4 managers, 1 user');
    console.log('   - CONFIRMED Bookings: 3 (for availability testing)');
    console.log('   - Court Blackouts: 2 (for availability testing)');
    console.log('\n📝 Demo credentials:');
    console.log('   Admin: admin@courtbooking.vn / Admin@123');
    console.log('   Managers: manager1-4@courtbooking.vn / Manager@123');
    console.log('   User: user@courtbooking.vn / User@123');
}

main()
    .catch((e) => {
        console.error('❌ Seeding failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
