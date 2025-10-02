// Main application logic will go here.
window.addEventListener('DOMContentLoaded', router);
window.addEventListener('hashchange', router);
window.addEventListener('popstate', router);

// Simple SHA256 hashing function for password security (matching the one in seed.js)
function sha256(str) {
    // Simple implementation - matches the one in seed.js for consistency
    return str.split('').map(c => c.charCodeAt(0).toString(16).padStart(2, '0')).join('');
}

// Simple router
function router() {
    const session = DB.getData('session');
    
    // Check for hash-based routing (works for local file access)
    const hash = window.location.hash;
    
    // If user is logged in, show their dashboard regardless of path
    if (session && session.role === 'admin') {
        renderAdminDashboard();
        return;
    } else if (session && session.role === 'instructor') {
        renderInstructorDashboard();
        return;
    }
    
    // If user is not logged in, check the hash
    if (hash === '#login') {
        renderLoginView();
    } else {
        // For all other paths, show student view
        renderStudentView();
    }
}

// --- LOGIN & LOGOUT ---
function renderLoginView() {
    const app = document.getElementById('app');
    app.innerHTML = `
        <div class="login-container">
            <h2>تسجيل الدخول الآمن</h2>
            <form id="login-form">
                <div class="form-group">
                    <label for="username">اسم المستخدم</label>
                    <input type="text" id="username" required placeholder="أدخل اسم المستخدم">
                </div>
                <div class="form-group">
                    <label for="password">كلمة المرور</label>
                    <input type="password" id="password" required placeholder="أدخل كلمة المرور">
                </div>
                <button type="submit">دخول آمن</button>
                <p id="login-error" class="error-message" style="display: none;"></p>
            </form>
            <a href="#" onclick="event.preventDefault(); window.location.hash=''; renderStudentView()">العودة إلى بوابة الطالب</a>
        </div>
    `;

    document.getElementById('login-form').addEventListener('submit', handleLogin);
}

function handleLogin(event) {
    event.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const users = DB.getData(DB_KEYS.USERS) || [];

    // Hash the password for comparison
    const hashedPassword = sha256(password);
    const user = users.find(u => u.username === username && u.password === hashedPassword);

    if (user) {
        // Create a session
        DB.setData('session', { userId: user.id, username: user.username, role: user.role, name: user.name });
        
        // Redirect based on user role
        window.location.hash = '';
        if (user.role === 'admin') {
            renderAdminDashboard();
        } else if (user.role === 'instructor') {
            renderInstructorDashboard();
        }
    } else {
        const errorEl = document.getElementById('login-error');
        errorEl.textContent = 'اسم المستخدم أو كلمة المرور غير صحيحة. حاول مرة أخرى.';
        errorEl.style.display = 'block';
        
        // Add animation effect
        errorEl.style.animation = 'none';
        setTimeout(() => {
            errorEl.style.animation = 'shake 0.5s';
        }, 10);
    }
}

function logout() {
    if (confirm('هل أنت متأكد أنك تريد تسجيل الخروج؟')) {
        DB.removeData('session');
        window.location.hash = '';
        renderStudentView();
    }
    // Prevent default behavior if called from a link
    event && event.preventDefault && event.preventDefault();
}

// --- ADMIN DASHBOARD ---
function renderAdminDashboard() {
    const session = DB.getData('session');
    const app = document.getElementById('app');

    app.innerHTML = `
        <div class="admin-dashboard">
            <aside class="sidebar">
                <h3>لوحة تحكم المدير</h3>
                <p>مرحباً، ${session.name}</p>
                <nav>
                    <ul>
                        <li><a href="#" onclick="event.preventDefault(); renderAdminSection('stages')" id="nav-stages">إدارة المراحل</a></li>
                        <li><a href="#" onclick="event.preventDefault(); renderAdminSection('schedules')" id="nav-schedules">إدارة الجداول</a></li>
                        <li><a href="#" onclick="event.preventDefault(); renderAdminSection('students')" id="nav-students">إدارة الطلبة</a></li>
                        <li><a href="#" onclick="event.preventDefault(); renderAdminSection('instructors')" id="nav-instructors">إدارة التدريسيين</a></li>
                        <li><a href="#" onclick="event.preventDefault(); renderAdminSection('reports')" id="nav-reports">التقارير والإحصائيات</a></li>
                    </ul>
                </nav>
                <button onclick="logout()">تسجيل الخروج</button>
            </aside>
            <main id="admin-content">
                <h2>أهلاً بك في لوحة التحكم</h2>
                <p>اختر قسماً من القائمة الجانبية للبدء.</p>
            </main>
        </div>
    `;

    // Default view
    renderAdminSection('stages');
}

function renderAdminSection(section) {
    // Update active navigation
    document.querySelectorAll('.sidebar nav a').forEach(link => {
        link.classList.remove('active');
    });
    document.getElementById(`nav-${section}`).classList.add('active');
    
    const content = document.getElementById('admin-content');
    switch (section) {
        case 'stages':
            renderManageStages(content);
            break;
        case 'schedules':
            renderManageSchedules(content);
            break;
        case 'students':
            renderManageStudents(content);
            break;
        case 'instructors':
            renderManageInstructors(content);
            break;
        case 'reports':
            renderReportsSection(content);
            break;
        // Add other cases later
        default:
            content.innerHTML = '<h2>مرحباً</h2>';
    }
}

// --- Reports and Statistics ---
function renderReportsSection(container) {
    const attendance = DB.getData(DB_KEYS.ATTENDANCE) || [];
    const students = DB.getData(DB_KEYS.STUDENTS) || [];
    const stages = DB.getData(DB_KEYS.STAGES) || [];

    if (attendance.length === 0) {
        container.innerHTML = '<h2>التقارير والإحصائيات</h2><p>لا توجد بيانات حضور مسجلة لعرض الإحصائيات.</p>';
        return;
    }

    // 1. Attendance percentage per stage
    let stageStats = stages.map(stage => {
        const stageStudents = students.filter(s => s.stageId === stage.id);
        const stageAttendance = attendance.filter(a => a.stageId === stage.id);
        const totalPossibleAttendances = stageStudents.length * stageAttendance.length;
        const totalActualAttendances = stageAttendance.reduce((sum, record) => sum + record.presentStudentIds.length, 0);
        const percentage = totalPossibleAttendances > 0 ? (totalActualAttendances / totalPossibleAttendances) * 100 : 0;
        return { name: stage.name, percentage: percentage.toFixed(2) };
    });

    // 2. Subject with most absences
    const absenceBySubject = {};
    attendance.forEach(record => {
        if (!absenceBySubject[record.subject]) {
            absenceBySubject[record.subject] = 0;
        }
        absenceBySubject[record.subject] += record.absentStudentIds.length;
    });
    const mostAbsentSubject = Object.keys(absenceBySubject).reduce((a, b) => absenceBySubject[a] > absenceBySubject[b] ? a : b, 'N/A');

    // 3. Day with most absences
    const absenceByDay = {};
    attendance.forEach(record => {
        if (!absenceByDay[record.day]) {
            absenceByDay[record.day] = 0;
        }
        absenceByDay[record.day] += record.absentStudentIds.length;
    });
    const mostAbsentDay = Object.keys(absenceByDay).reduce((a, b) => absenceByDay[a] > absenceByDay[b] ? a : b, 'N/A');

    // HTML Rendering
    let stageStatsHtml = stageStats.map(stat => `<li>${stat.name}: ${stat.percentage}%</li>`).join('');

    container.innerHTML = `
        <h2>التقارير والإحصائيات</h2>
        <div class="reports-grid">
            <div class="stat-card">
                <h3>نسبة الحضور لكل مرحلة</h3>
                <ul>${stageStatsHtml}</ul>
            </div>
            <div class="stat-card">
                <h3>المادة الأكثر غياباً</h3>
                <p>${mostAbsentSubject}</p>
            </div>
            <div class="stat-card">
                <h3>اليوم الأكثر غياباً</h3>
                <p>${mostAbsentDay}</p>
            </div>
        </div>
        <div class="export-section">
            <h3>تصدير البيانات</h3>
            <button onclick="exportAttendanceToCSV()">تصدير سجل الحضور (CSV)</button>
        </div>
    `;
}

function exportAttendanceToCSV() {
    const attendance = DB.getData(DB_KEYS.ATTENDANCE) || [];
    if (attendance.length === 0) {
        alert('لا توجد بيانات لتصديرها.');
        return;
    }

    const students = DB.getData(DB_KEYS.STUDENTS) || [];
    const stages = DB.getData(DB_KEYS.STAGES) || [];

    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "التاريخ,المرحلة,المادة,اسم الطالب,الحالة\n";

    attendance.forEach(record => {
        const stage = stages.find(s => s.id === record.stageId);

        // Present students
        record.presentStudentIds.forEach(studentId => {
            const student = students.find(s => s.id === studentId);
            if (student) {
                csvContent += `${record.date},${stage.name},${record.subject},${student.name},حاضر\n`;
            }
        });

        // Absent students
        record.absentStudentIds.forEach(studentId => {
            const student = students.find(s => s.id === studentId);
            if (student) {
                csvContent += `${record.date},${stage.name},${record.subject},${student.name},غائب\n`;
            }
        });
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "attendance_report.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Show success message
    alert('تم تصدير البيانات بنجاح!');
}

function renderManageStages(container) {
    const stages = DB.getData(DB_KEYS.STAGES) || [];

    let stagesHtml = stages.map(stage => `
        <div class="list-item">
            <span>${stage.name}</span>
            <button class="delete-btn" onclick="deleteStage(${stage.id})">حذف</button>
        </div>
    `).join('');

    container.innerHTML = `
        <h2>إدارة المراحل الدراسية</h2>
        <div class="management-container">
            <div class="item-list">
                ${stagesHtml || '<p>لا توجد مراحل دراسية حالياً.</p>'}
            </div>
            <div class="add-form">
                <h3>إضافة مرحلة جديدة</h3>
                <form id="add-stage-form">
                    <input type="text" id="new-stage-name" placeholder="اسم المرحلة" required>
                    <button type="submit">إضافة</button>
                </form>
            </div>
        </div>
    `;

    document.getElementById('add-stage-form').addEventListener('submit', addStage);
}

function addStage(event) {
    event.preventDefault();
    const input = document.getElementById('new-stage-name');
    const newStageName = input.value.trim();

    if (newStageName) {
        const stages = DB.getData(DB_KEYS.STAGES) || [];
        const newStage = {
            id: Date.now(), // simple unique ID
            name: newStageName
        };
        stages.push(newStage);
        DB.setData(DB_KEYS.STAGES, stages);
        input.value = '';
        renderAdminSection('stages'); // Re-render the section
        
        // Show success message
        alert('تمت إضافة المرحلة بنجاح!');
    }
}

function deleteStage(stageId) {
    if (confirm('هل أنت متأكد من حذف هذه المرحلة؟')) {
        let stages = DB.getData(DB_KEYS.STAGES) || [];
        stages = stages.filter(stage => stage.id !== stageId);
        DB.setData(DB_KEYS.STAGES, stages);
        renderAdminSection('stages'); // Re-render
        
        // Show success message
        alert('تم حذف المرحلة بنجاح!');
    }
}

// --- Manage Schedules (Admin) ---
function renderManageSchedules(container) {
    const stages = DB.getData(DB_KEYS.STAGES) || [];
    let stagesOptions = stages.map(stage => `<option value="${stage.id}">${stage.name}</option>`).join('');

    container.innerHTML = `
        <h2>إدارة الجداول الدراسية</h2>
        <div class="stage-selector">
            <label for="admin-stage-select">اختر المرحلة لعرض أو تعديل جدولها:</label>
            <select id="admin-stage-select">
                <option value="">-- اختر المرحلة --</option>
                ${stagesOptions}
            </select>
        </div>
        <div id="admin-schedule-view"></div>
    `;

    document.getElementById('admin-stage-select').addEventListener('change', (e) => {
        const stageId = parseInt(e.target.value);
        if (stageId) {
            displayScheduleForAdmin(stageId);
        } else {
            document.getElementById('admin-schedule-view').innerHTML = '';
        }
    });
}

function displayScheduleForAdmin(stageId) {
    const view = document.getElementById('admin-schedule-view');
    const allSchedules = DB.getData(DB_KEYS.SCHEDULES) || [];
    const instructors = DB.getData(DB_KEYS.INSTRUCTORS) || [];
    const config = DB.getData(DB_KEYS.CONFIG);
    const workingDays = config.workingDays;

    let scheduleHtml = '';

    workingDays.forEach(day => {
        let daySchedule = allSchedules.find(s => s.stageId === stageId && s.day === day);

        scheduleHtml += `<div class="day-schedule-admin"><h3>${day}</h3>`;

        if (daySchedule && daySchedule.lectures.length > 0) {
            daySchedule.lectures.forEach(lecture => {
                const instructor = instructors.find(i => i.id === lecture.instructorId);
                scheduleHtml += `
                    <div class="lecture-admin-item">
                        <span><strong>${lecture.subject}</strong> (${instructor ? instructor.name : 'N/A'}) - ${lecture.time}</span>
                        <button onclick="deleteLecture(${stageId}, '${day}', '${lecture.subject}')">حذف</button>
                    </div>
                `;
            });
        } else {
            scheduleHtml += '<p>لا توجد محاضرات في هذا اليوم.</p>';
        }

        scheduleHtml += `<button class="add-lecture-btn" onclick="showAddLectureForm(${stageId}, '${day}')">إضافة محاضرة</button></div>`;
    });

    view.innerHTML = scheduleHtml;
}

function showAddLectureForm(stageId, day) {
    const instructors = DB.getData(DB_KEYS.INSTRUCTORS) || [];
    let instructorOptions = instructors.map(i => `<option value="${i.id}">${i.name}</option>`).join('');

    const formHtml = `
        <div class="modal" id="add-lecture-modal">
            <div class="modal-content">
                <span class="close-btn" onclick="closeModal('add-lecture-modal')">&times;</span>
                <h3>إضافة محاضرة ليوم ${day}</h3>
                <form id="add-lecture-form-admin">
                    <input type="text" id="subject-name" placeholder="اسم المادة" required>
                    <select id="instructor-id" required>${instructorOptions}</select>
                    <input type="text" id="lecture-time" placeholder="الوقت (مثال: 08:30 - 10:30)" required>
                    <button type="submit">إضافة</button>
                </form>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', formHtml);

    document.getElementById('add-lecture-form-admin').addEventListener('submit', (e) => {
        e.preventDefault();
        addLecture(stageId, day);
    });
}

function addLecture(stageId, day) {
    const subject = document.getElementById('subject-name').value;
    const instructorId = parseInt(document.getElementById('instructor-id').value);
    const time = document.getElementById('lecture-time').value;

    const newLecture = { subject, instructorId, time, nextTopic: '' };

    let allSchedules = DB.getData(DB_KEYS.SCHEDULES) || [];
    let daySchedule = allSchedules.find(s => s.stageId === stageId && s.day === day);

    if (daySchedule) {
        daySchedule.lectures.push(newLecture);
    } else {
        const newDaySchedule = {
            id: Date.now(),
            stageId: stageId,
            day: day,
            lectures: [newLecture]
        };
        allSchedules.push(newDaySchedule);
    }

    DB.setData(DB_KEYS.SCHEDULES, allSchedules);
    closeModal('add-lecture-modal');
    displayScheduleForAdmin(stageId);
    
    // Show success message
    alert('تمت إضافة المحاضرة بنجاح!');
}

function deleteLecture(stageId, day, subject) {
    if (!confirm(`هل أنت متأكد من حذف محاضرة "${subject}"؟`)) return;

    let allSchedules = DB.getData(DB_KEYS.SCHEDULES) || [];
    let daySchedule = allSchedules.find(s => s.stageId === stageId && s.day === day);

    if (daySchedule) {
        daySchedule.lectures = daySchedule.lectures.filter(l => l.subject !== subject);
        DB.setData(DB_KEYS.SCHEDULES, allSchedules);
        displayScheduleForAdmin(stageId);
        
        // Show success message
        alert('تم حذف المحاضرة بنجاح!');
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.remove();
    }
}

// --- Manage Students (Admin) ---
function renderManageStudents(container) {
    const students = DB.getData(DB_KEYS.STUDENTS) || [];
    const stages = DB.getData(DB_KEYS.STAGES) || [];

    let studentsHtml = students.map(student => {
        const stage = stages.find(s => s.id === student.stageId);
        return `
            <div class="list-item">
                <span>${student.name} (الرقم الجامعي: ${student.universityId}) - ${stage ? stage.name : 'غير محدد'}</span>
                <button class="delete-btn" onclick="deleteStudent(${student.id})">حذف</button>
            </div>
        `;
    }).join('');

    let stageOptions = stages.map(s => `<option value="${s.id}">${s.name}</option>`).join('');

    container.innerHTML = `
        <h2>إدارة الطلبة</h2>
        <div class="management-container">
            <div class="item-list">
                ${studentsHtml.length > 0 ? studentsHtml : '<p>لا يوجد طلبة حالياً.</p>'}
            </div>
            <div class="add-form">
                <h3>إضافة طالب جديد</h3>
                <form id="add-student-form">
                    <input type="text" id="new-student-name" placeholder="اسم الطالب الكامل" required>
                    <input type="text" id="new-student-uid" placeholder="الرقم الجامعي" required>
                    <select id="new-student-stage" required>
                        <option value="">اختر المرحلة</option>
                        ${stageOptions}
                    </select>
                    <button type="submit">إضافة طالب</button>
                </form>
            </div>
        </div>
    `;

    document.getElementById('add-student-form').addEventListener('submit', addStudent);
}

function addStudent(event) {
    event.preventDefault();
    const name = document.getElementById('new-student-name').value.trim();
    const universityId = document.getElementById('new-student-uid').value.trim();
    const stageId = parseInt(document.getElementById('new-student-stage').value);

    if (name && universityId && stageId) {
        const students = DB.getData(DB_KEYS.STUDENTS) || [];
        const newStudent = {
            id: Date.now(),
            name,
            universityId,
            stageId,
            section: 'A' // Default section for now
        };
        students.push(newStudent);
        DB.setData(DB_KEYS.STUDENTS, students);
        renderAdminSection('students'); // Re-render the section
        
        // Show success message
        alert('تمت إضافة الطالب بنجاح!');
    }
}

function deleteStudent(studentId) {
    if (confirm('هل أنت متأكد من حذف هذا الطالب؟')) {
        let students = DB.getData(DB_KEYS.STUDENTS) || [];
        students = students.filter(s => s.id !== studentId);
        DB.setData(DB_KEYS.STUDENTS, students);
        renderAdminSection('students');
        
        // Show success message
        alert('تم حذف الطالب بنجاح!');
    }
}

// --- Manage Instructors (Admin) ---
function renderManageInstructors(container) {
    const instructors = DB.getData(DB_KEYS.INSTRUCTORS) || [];

    let instructorsHtml = instructors.map(instructor => `
        <div class="list-item">
            <span>${instructor.name} (القسم: ${instructor.department || 'غير محدد'})</span>
            <button class="delete-btn" onclick="deleteInstructor(${instructor.id})">حذف</button>
        </div>
    `).join('');

    container.innerHTML = `
        <h2>إدارة التدريسيين</h2>
        <div class="management-container">
            <div class="item-list">
                ${instructorsHtml.length > 0 ? instructorsHtml : '<p>لا يوجد تدريسيون حالياً.</p>'}
            </div>
            <div class="add-form">
                <h3>إضافة تدريسي جديد</h3>
                <form id="add-instructor-form">
                    <input type="text" id="new-instructor-name" placeholder="اسم التدريسي الكامل" required>
                    <input type="text" id="new-instructor-dept" placeholder="القسم" required>
                    <input type="text" id="new-instructor-username" placeholder="اسم المستخدم للحساب" required>
                    <input type="password" id="new-instructor-password" placeholder="كلمة المرور" required>
                    <button type="submit">إضافة تدريسي</button>
                </form>
            </div>
        </div>
    `;

    document.getElementById('add-instructor-form').addEventListener('submit', addInstructor);
}

function addInstructor(event) {
    event.preventDefault();
    const name = document.getElementById('new-instructor-name').value.trim();
    const department = document.getElementById('new-instructor-dept').value.trim();
    const username = document.getElementById('new-instructor-username').value.trim();
    const password = document.getElementById('new-instructor-password').value.trim();

    if (name && department && username && password) {
        const users = DB.getData(DB_KEYS.USERS) || [];
        const instructors = DB.getData(DB_KEYS.INSTRUCTORS) || [];

        // Check if username already exists
        if (users.some(u => u.username === username)) {
            alert('اسم المستخدم موجود بالفعل. يرجى اختيار اسم آخر.');
            return;
        }

        // Hash the password before storing
        const hashedPassword = sha256(password);

        // Create user account first
        const newUserId = Date.now();
        const newUser = {
            id: newUserId,
            username,
            password: hashedPassword,
            role: 'instructor',
            name: name
        };
        users.push(newUser);
        DB.setData(DB_KEYS.USERS, users);

        // Create instructor profile
        const newInstructor = {
            id: Date.now() + 1, // Ensure unique ID
            userId: newUserId,
            name,
            department
        };
        instructors.push(newInstructor);
        DB.setData(DB_KEYS.INSTRUCTORS, instructors);

        renderAdminSection('instructors'); // Re-render
        
        // Show success message
        alert('تمت إضافة التدريسي بنجاح!');
    }
}

function deleteInstructor(instructorId) {
    if (confirm('هل أنت متأكد من حذف هذا التدريسي؟ سيتم حذف حسابه أيضاً.')) {
        let instructors = DB.getData(DB_KEYS.INSTRUCTORS) || [];
        const instructorToDelete = instructors.find(i => i.id === instructorId);

        if (instructorToDelete) {
            // Remove user account
            let users = DB.getData(DB_KEYS.USERS) || [];
            users = users.filter(u => u.id !== instructorToDelete.userId);
            DB.setData(DB_KEYS.USERS, users);

            // Remove instructor profile
            instructors = instructors.filter(i => i.id !== instructorId);
            DB.setData(DB_KEYS.INSTRUCTORS, instructors);

            renderAdminSection('instructors');
            
            // Show success message
            alert('تم حذف التدريسي بنجاح!');
        }
    }
}

// --- INSTRUCTOR DASHBOARD ---
function renderInstructorDashboard() {
    const session = DB.getData('session');
    const app = document.getElementById('app');
    const allSchedules = DB.getData(DB_KEYS.SCHEDULES) || [];
    const instructors = DB.getData(DB_KEYS.INSTRUCTORS) || [];
    const stages = DB.getData(DB_KEYS.STAGES) || [];
    const config = DB.getData(DB_KEYS.CONFIG);

    const instructorProfile = instructors.find(i => i.userId === session.userId);
    if (!instructorProfile) {
        app.innerHTML = `<p>Error: Instructor profile not found.</p><button onclick="logout()">Logout</button>`;
        return;
    }

    let instructorScheduleHtml = `
        <div class="instructor-dashboard">
            <header>
                <div>
                    <h1>لوحة تحكم التدريسي</h1>
                    <p>مرحباً، ${session.name}</p>
                </div>
                <button onclick="logout()">تسجيل الخروج</button>
            </header>
            <main>
                <h2>جدولك الدراسي</h2>
    `;

    config.workingDays.forEach(day => {
        let dailyLectures = [];
        allSchedules.forEach(schedule => {
            schedule.lectures.forEach(lecture => {
                if (lecture.instructorId === instructorProfile.id && schedule.day === day) {
                    const stage = stages.find(s => s.id === schedule.stageId);
                    dailyLectures.push({ ...lecture, stageName: stage ? stage.name : 'N/A', stageId: schedule.stageId, day: day });
                }
            });
        });

        if (dailyLectures.length > 0) {
            instructorScheduleHtml += `<div class="day-schedule"><h3>${day}</h3>`;
            dailyLectures.forEach(lecture => {
                instructorScheduleHtml += `
                    <div class="lecture-card-instructor">
                        <h4>${lecture.subject} - ${lecture.stageName}</h4>
                        <p><strong>الوقت:</strong> ${lecture.time}</p>
                        <div class="lecture-actions">
                             <input type="text" id="next-topic-${lecture.stageId}-${lecture.subject}" placeholder="الموضوع القادم" value="${lecture.nextTopic || ''}">
                             <button onclick="updateNextTopic(${lecture.stageId}, '${lecture.day}', '${lecture.subject}')">حفظ الموضوع</button>
                             <button onclick="showAttendanceForm(${lecture.stageId}, '${lecture.day}', '${lecture.subject}')">تسجيل الحضور</button>
                        </div>
                    </div>
                `;
            });
            instructorScheduleHtml += `</div>`;
        }
    });

    instructorScheduleHtml += `</main></div>`;
    app.innerHTML = instructorScheduleHtml;
}

function updateNextTopic(stageId, day, subject) {
    const input = document.getElementById(`next-topic-${stageId}-${subject}`);
    const newTopic = input.value.trim();

    let allSchedules = DB.getData(DB_KEYS.SCHEDULES);
    const scheduleToUpdate = allSchedules
        .find(s => s.stageId === stageId && s.day === day);

    if (scheduleToUpdate) {
        const lectureToUpdate = scheduleToUpdate.lectures.find(l => l.subject === subject);
        if (lectureToUpdate) {
            lectureToUpdate.nextTopic = newTopic;
            DB.setData(DB_KEYS.SCHEDULES, allSchedules);
            alert('تم تحديث الموضوع بنجاح!');
        }
    }
}

function showAttendanceForm(stageId, day, subject) {
    const students = DB.getData(DB_KEYS.STUDENTS).filter(s => s.stageId === stageId);

    if (students.length === 0) {
        alert('لا يوجد طلبة مسجلون في هذه المرحلة.');
        return;
    }

    let studentCheckboxes = students.map(student => `
        <div class="student-checkbox">
            <input type="checkbox" id="student-${student.id}" value="${student.id}" checked>
            <label for="student-${student.id}">${student.name}</label>
        </div>
    `).join('');

    const formHtml = `
        <div class="modal" id="attendance-modal">
            <div class="modal-content">
                <span class="close-btn" onclick="closeModal('attendance-modal')">&times;</span>
                <h3>تسجيل حضور محاضرة: ${subject}</h3>
                <p>المرحلة: ${DB.getData(DB_KEYS.STAGES).find(s=>s.id === stageId).name} | التاريخ: ${new Date().toLocaleDateString('ar-EG')}</p>
                <form id="attendance-form">
                    <div class="student-list-attendance">
                        ${studentCheckboxes}
                    </div>
                    <button type="submit">حفظ الحضور</button>
                </form>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', formHtml);

    document.getElementById('attendance-form').addEventListener('submit', (e) => {
        e.preventDefault();
        saveAttendance(stageId, day, subject);
    });
}

function saveAttendance(stageId, day, subject) {
    const students = DB.getData(DB_KEYS.STUDENTS).filter(s => s.stageId === stageId);
    const attendanceRecords = DB.getData(DB_KEYS.ATTENDANCE) || [];

    const presentStudentIds = [];
    students.forEach(student => {
        const checkbox = document.getElementById(`student-${student.id}`);
        if (checkbox.checked) {
            presentStudentIds.push(student.id);
        }
    });

    const newAttendanceRecord = {
        id: Date.now(),
        date: new Date().toISOString().split('T')[0],
        stageId,
        day,
        subject,
        presentStudentIds,
        absentStudentIds: students.filter(s => !presentStudentIds.includes(s.id)).map(s => s.id)
    };

    // Avoid duplicate records for the same lecture on the same day
    const existingRecordIndex = attendanceRecords.findIndex(rec =>
        rec.date === newAttendanceRecord.date &&
        rec.stageId === stageId &&
        rec.subject === subject
    );

    if (existingRecordIndex > -1) {
        attendanceRecords[existingRecordIndex] = newAttendanceRecord;
    } else {
        attendanceRecords.push(newAttendanceRecord);
    }

    DB.setData(DB_KEYS.ATTENDANCE, attendanceRecords);
    alert('تم تسجيل الحضور بنجاح!');
    closeModal('attendance-modal');
}


// --- STUDENT VIEW ---
function renderStudentView() {
    // Navigate back to the main page if they are on #login
    if (window.location.hash === '#login') {
        window.location.hash = '';
    }
    const app = document.getElementById('app');

    // Get stages from DB
    const stages = DB.getData(DB_KEYS.STAGES) || [];

    let stagesOptions = stages.map(stage => `<option value="${stage.id}">${stage.name}</option>`).join('');

    app.innerHTML = `
        <header>
            <h1>بوابة الطالب</h1>
            <p>اختر مرحلتك الدراسية لعرض جدول المحاضرات.</p>
        </header>
        <main>
            <div class="stage-selector">
                <label for="stage-select">المرحلة الدراسية:</label>
                <select id="stage-select">
                    <option value="">-- اختر المرحلة --</option>
                    ${stagesOptions}
                </select>
            </div>
            <div id="schedule-container">
                <!-- Schedule will be rendered here -->
            </div>
        </main>
    `;

    // Add event listener for the select element
    const stageSelect = document.getElementById('stage-select');
    stageSelect.addEventListener('change', (event) => {
        const stageId = parseInt(event.target.value);
        if (stageId) {
            renderScheduleForStage(stageId);
        } else {
            document.getElementById('schedule-container').innerHTML = '';
        }
    });
}

function renderScheduleForStage(stageId) {
    const container = document.getElementById('schedule-container');

    const allSchedules = DB.getData(DB_KEYS.SCHEDULES) || [];
    const stageSchedules = allSchedules.filter(s => s.stageId === stageId);
    const instructors = DB.getData(DB_KEYS.INSTRUCTORS) || [];

    if (stageSchedules.length === 0) {
        container.innerHTML = '<p>لا يوجد جدول دراسي لهذه المرحلة.</p>';
        return;
    }

    let scheduleHtml = '<h2>الجدول الأسبوعي</h2>';

    // Group lectures by day
    const days = DB.getData(DB_KEYS.CONFIG).workingDays;
    days.forEach(day => {
        const daySchedule = stageSchedules.find(s => s.day === day);
        if (daySchedule && daySchedule.lectures.length > 0) {
            scheduleHtml += `
                <div class="day-schedule">
                    <h3>${day}</h3>
                    <div class="lectures-grid">
            `;
            daySchedule.lectures.forEach(lecture => {
                const instructor = instructors.find(i => i.id === lecture.instructorId);
                scheduleHtml += `
                    <div class="lecture-card" onclick="showLectureDetails(this)">
                        <h4>${lecture.subject}</h4>
                        <p><strong>التدريسي:</strong> ${instructor ? instructor.name : 'غير محدد'}</p>
                        <p><strong>الوقت:</strong> ${lecture.time}</p>
                        <div class="lecture-details" style="display: none;">
                            <p><strong>الموضوع القادم:</strong> ${lecture.nextTopic || 'لم يحدد بعد'}</p>
                        </div>
                    </div>
                `;
            });
            scheduleHtml += `</div></div>`;
        }
    });

    container.innerHTML = scheduleHtml;
}

function showLectureDetails(cardElement) {
    const details = cardElement.querySelector('.lecture-details');
    if (details.style.display === 'none') {
        details.style.display = 'block';
    } else {
        details.style.display = 'none';
    }
}
