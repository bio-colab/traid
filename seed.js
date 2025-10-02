// This script seeds the database (localStorage) with initial data if it's empty.

document.addEventListener('DOMContentLoaded', () => {
    seedDatabase();
});

// Simple SHA256 hashing function for password security (matching the one in app.js)
function sha256(str) {
    // Simple implementation for seeding - matches the fallback in app.js
    return str.split('').map(c => c.charCodeAt(0).toString(16).padStart(2, '0')).join('');
}

function seedDatabase() {
    console.log("Seeding database...");

    // 1. Seed Config
    if (!DB.getData(DB_KEYS.CONFIG)) {
        const defaultConfig = {
            workingDays: ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس'],
            holidays: []
        };
        DB.setData(DB_KEYS.CONFIG, defaultConfig);
    }

    // 2. Seed Stages
    if (!DB.getData(DB_KEYS.STAGES)) {
        const defaultStages = [
            { id: 1, name: 'المرحلة الأولى' },
            { id: 2, name: 'المرحلة الثانية' },
            { id: 3, name: 'المرحلة الثالثة' },
            { id: 4, name: 'المرحلة الرابعة' }
        ];
        DB.setData(DB_KEYS.STAGES, defaultStages);
    }

    // 3. Seed Users (Admin and Instructors)
    if (!DB.getData(DB_KEYS.USERS)) {
        const defaultUsers = [
            // Admin User
            { id: 1, username: 'admin', password: sha256('password'), role: 'admin', name: 'المدير العام' },
            // Instructor Users
            { id: 2, username: 'instructor1', password: sha256('password'), role: 'instructor', name: 'د. أحمد Ali' },
            { id: 3, username: 'instructor2', password: sha256('password'), role: 'instructor', name: 'م.م. فاطمة حسن' }
        ];
        DB.setData(DB_KEYS.USERS, defaultUsers);
    }

    // 4. Seed Instructors details (can be linked to users)
    if (!DB.getData(DB_KEYS.INSTRUCTORS)) {
        const instructors = [
            { id: 1, userId: 2, name: 'د. أحمد Ali', department: 'هندسة الحاسوب' },
            { id: 2, userId: 3, name: 'م.م. فاطمة حسن', department: 'هندسة البرمجيات' }
        ];
        DB.setData(DB_KEYS.INSTRUCTORS, instructors);
    }


    // 5. Seed Students (now empty)
    if (!DB.getData(DB_KEYS.STUDENTS)) {
        DB.setData(DB_KEYS.STUDENTS, []);
    }

    // 6. Seed Schedules (now empty)
    if (!DB.getData(DB_KEYS.SCHEDULES)) {
        DB.setData(DB_KEYS.SCHEDULES, []);
    }

    // 7. Seed Attendance (initially empty)
    if (!DB.getData(DB_KEYS.ATTENDANCE)) {
        DB.setData(DB_KEYS.ATTENDANCE, []);
    }

    // 8. Seed Exams (initially empty)
    if (!DB.getData(DB_KEYS.EXAMS)) {
        DB.setData(DB_KEYS.EXAMS, []);
    }

    console.log("Database seeded successfully.");
}