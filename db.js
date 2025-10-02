// Database layer using localStorage with enhanced error handling
const DB = {
    getData: function(key) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : null;
        } catch (e) {
            console.error(`Error getting data for key: ${key}`, e);
            // Show user-friendly error message
            this.showError(`حدث خطأ أثناء قراءة البيانات: ${key}`);
            return null;
        }
    },
    setData: function(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (e) {
            console.error(`Error setting data for key: ${key}`, e);
            // Show user-friendly error message
            this.showError(`حدث خطأ أثناء حفظ البيانات: ${key}`);
            return false;
        }
    },
    removeData: function(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (e) {
            console.error(`Error removing data for key: ${key}`, e);
            this.showError(`حدث خطأ أثناء حذف البيانات: ${key}`);
            return false;
        }
    },
    clear: function() {
        try {
            localStorage.clear();
            return true;
        } catch (e) {
            console.error('Error clearing all data', e);
            this.showError('حدث خطأ أثناء مسح جميع البيانات');
            return false;
        }
    },
    showError: function(message) {
        // Create error notification element
        const errorEl = document.createElement('div');
        errorEl.style.cssText = `
            position: fixed;
            top: 20px;
            left: 20px;
            right: 20px;
            background: #e74c3c;
            color: white;
            padding: 15px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 10000;
            text-align: center;
            font-weight: 500;
        `;
        errorEl.textContent = message;
        
        // Add to document
        document.body.appendChild(errorEl);
        
        // Remove after 5 seconds
        setTimeout(() => {
            if (errorEl.parentNode) {
                errorEl.parentNode.removeChild(errorEl);
            }
        }, 5000);
    }
};

// Define keys for our data
const DB_KEYS = {
    STAGES: 'stages',
    SCHEDULES: 'schedules',
    STUDENTS: 'students',
    INSTRUCTORS: 'instructors',
    ATTENDANCE: 'attendance',
    EXAMS: 'exams',
    USERS: 'users', // For storing login credentials
    CONFIG: 'config'
};