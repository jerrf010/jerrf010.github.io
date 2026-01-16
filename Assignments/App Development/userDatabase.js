class UserDatabase {
    constructor() {
        this.key = 'heyday_users';
        this.currentUserKey = 'heyday_current_user';
        this.initDemoData();
    }

    // Initialize with demo users if none exist
    initDemoData() {
        let users = this.getAllUsers();

        if (users.length === 0) {
            const demoUsers = [
                {
                    id: 1,
                    username: 'demo_user',
                    email: 'test@example.com',
                    password: 'Demo123!', // In real app, this would be hashed
                    mood: 'happy',
                    createdAt: new Date().toISOString(),
                    name: 'Demo User'
                },
                {
                    id: 2,
                    username: 'joe_user',
                    email: 'joe@example.com',
                    password: 'Test123!',
                    mood: 'good',
                    createdAt: new Date().toISOString(),
                    name: 'Joe'
                }
            ];

            localStorage.setItem(this.key, JSON.stringify(demoUsers));
        }
    }

    // Get all users
    getAllUsers() {
        const users = localStorage.getItem(this.key);
        return users ? JSON.parse(users) : [];
    }

    // Save all users
    saveAllUsers(users) {
        localStorage.setItem(this.key, JSON.stringify(users));
    }

    // Find user by username or email
    findUser(identifier) {
        const users = this.getAllUsers();
        return users.find(user =>
            user.username.toLowerCase() === identifier.toLowerCase() ||
            user.email.toLowerCase() === identifier.toLowerCase()
        );
    }

    // Add new user (from joinUs.html)
    addUser(userData) {
        const users = this.getAllUsers();

        // Check if user already exists
        const existingUser = this.findUser(userData.username) || this.findUser(userData.email);
        if (existingUser) {
            return { success: false, message: 'User already exists' };
        }

        const newUser = {
            id: users.length + 1,
            ...userData,
            createdAt: new Date().toISOString()
        };
        users.push(newUser);
        this.saveAllUsers(users);
        return { success: true, user: newUser };
    }

    // Authenticate user
    authenticate(identifier, password) {
        const user = this.findUser(identifier);
        if (!user) {
            return { success: false, message: 'User not found' };
        }

        // In a real app, you would compare hashed passwords
        if (user.password !== password) {
            return { success: false, message: 'Incorrect password' };
        }

        return { success: true, user };
    }

    // Set current user
    setCurrentUser(user) {
        // Don't store password in session
        const { password, ...safeUser } = user;
        localStorage.setItem(this.currentUserKey, JSON.stringify(safeUser));
        localStorage.setItem('heyday_logged_in', 'true');
    }

    // Get current user
    getCurrentUser() {
        const user = localStorage.getItem(this.currentUserKey);
        return user ? JSON.parse(user) : null;
    }

    // Check if logged in
    isLoggedIn() {
        return localStorage.getItem('heyday_logged_in') === 'true';
    }

    // Logout
    logout() {
        localStorage.removeItem(this.currentUserKey);
        localStorage.removeItem('heyday_logged_in');
    }
    // NOTIFICATION MANAGEMENT METHODS

    // Get notifications for current user
    getNotifications(userId) {
        const users = this.getAllUsers();
        const user = users.find(u => u.id === userId);
        return user ? (user.notifications || {}) : {};
    }

    // Update notifications for a user
    updateNotifications(userId, newNotifications) {
        const users = this.getAllUsers();
        const userIndex = users.findIndex(u => u.id === userId);
        if (userIndex !== -1) {
            users[userIndex].notifications = newNotifications;
            this.saveAllUsers(users);

            // Also update current user in session
            const currentUser = this.getCurrentUser();
            if (currentUser && currentUser.id === userId) {
                currentUser.notifications = newNotifications;
                localStorage.setItem(this.currentUserKey, JSON.stringify(currentUser));
            }
        }
    }

    // Mark all notifications as read
    markAllNotificationsRead(userId) {
        const currentNotifications = this.getNotifications(userId);
        const updatedNotifications = {};

        // Set all counts to 0
        Object.keys(currentNotifications).forEach(key => {
            updatedNotifications[key] = 0;
        });

        this.updateNotifications(userId, updatedNotifications);
        return updatedNotifications;
    }

    // Mark specific notification type as read
    markNotificationTypeRead(userId, type) {
        const currentNotifications = this.getNotifications(userId);
        if (currentNotifications[type] !== undefined) {
            currentNotifications[type] = 0;
            this.updateNotifications(userId, currentNotifications);
        }
        return currentNotifications;
    }

    // Get total unread notifications
    getTotalUnreadNotifications(userId) {
        const notifications = this.getNotifications(userId);
        return Object.values(notifications).reduce((sum, count) => sum + count, 0);
    }
    // Update current user data (including avatar)
    updateCurrentUser(updatedData) {
        const currentUser = this.getCurrentUser();
        if (!currentUser) return false;

        // Update user data - ensure avatar is preserved if not being updated
        const updatedUser = { ...currentUser, ...updatedData };

        // Update all users array
        const users = this.getAllUsers();
        const userIndex = users.findIndex(u => u.id === currentUser.id);

        if (userIndex !== -1) {
            // Keep existing avatar if not being explicitly set to null or new value
            if (updatedData.avatar === undefined) {
                updatedData.avatar = users[userIndex].avatar;
            }
            users[userIndex] = { ...users[userIndex], ...updatedData };
            this.saveAllUsers(users);
        }

        // Update current user in session (without password)
        const { password, ...safeUser } = updatedUser;
        localStorage.setItem(this.currentUserKey, JSON.stringify(safeUser));

        return true;
    }
    // Get current user's avatar
    getCurrentAvatar() {
        const currentUser = this.getCurrentUser();
        return currentUser ? currentUser.avatar : null;
    }

    // Update user's avatar
    updateAvatar(userId, avatarDataUrl) {
        const users = this.getAllUsers();
        const userIndex = users.findIndex(u => u.id === userId);

        if (userIndex !== -1) {
            users[userIndex].avatar = avatarDataUrl;
            this.saveAllUsers(users);

            // Also update current user in session if it's the same user
            const currentUser = this.getCurrentUser();
            if (currentUser && currentUser.id === userId) {
                currentUser.avatar = avatarDataUrl;
                const { password, ...safeUser } = currentUser;
                localStorage.setItem(this.currentUserKey, JSON.stringify(safeUser));
            }

            return true;
        }
        return false;
    }

    // Remove user's avatar
    removeAvatar(userId) {
        const users = this.getAllUsers();
        const userIndex = users.findIndex(u => u.id === userId);

        if (userIndex !== -1) {
            delete users[userIndex].avatar;
            this.saveAllUsers(users);

            // Also update current user in session if it's the same user
            const currentUser = this.getCurrentUser();
            if (currentUser && currentUser.id === userId) {
                delete currentUser.avatar;
                const { password, ...safeUser } = currentUser;
                localStorage.setItem(this.currentUserKey, JSON.stringify(safeUser));
            }

            return true;
        }
        return false;
    }
    
    // Delete user account
    deleteUser(userId) {
        // Remove from all users
        const users = this.getAllUsers();
        const updatedUsers = users.filter(user => user.id !== userId);
        this.saveAllUsers(updatedUsers);

        // If deleting current user, also clear session
        const currentUser = this.getCurrentUser();
        if (currentUser && currentUser.id === userId) {
            this.logout();
        }

        // Remove Google connection if exists
        localStorage.removeItem('heyday_google_user');

        // Remove avatar backup
        localStorage.removeItem(`heyday_avatar_${userId}`);

        return true;
    }
}