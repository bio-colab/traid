// Admin dashboard functions

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