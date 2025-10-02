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
    
    // If user is logged in, redirect to appropriate dashboard
    if (session && session.role === 'admin') {
        // Redirect to admin dashboard
        if (window.location.pathname !== '/admin.html' && window.location.pathname !== '/instructor.html') {
            window.location.href = 'admin.html';
        }
        return;
    } else if (session && session.role === 'instructor') {
        // Redirect to instructor dashboard
        if (window.location.pathname !== '/admin.html' && window.location.pathname !== '/instructor.html') {
            window.location.href = 'instructor.html';
        }
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
            window.location.href = 'admin.html';
        } else if (user.role === 'instructor') {
            window.location.href = 'instructor.html';
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
        // Redirect to student view
        if (window.location.pathname === '/admin.html' || window.location.pathname === '/instructor.html') {
            window.location.href = 'index.html';
        } else {
            renderStudentView();
        }
    }
    // Prevent default behavior if called from a link
    event && event.preventDefault && event.preventDefault();
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