// Instructor dashboard functions

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

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.remove();
    }
}