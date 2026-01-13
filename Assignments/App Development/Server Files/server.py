from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
import sqlite3
import hashlib
import secrets
import re
from datetime import datetime
import os

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Database initialization
def init_db():
    conn = sqlite3.connect('users.db')
    cursor = conn.cursor()
    
    # Create users table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            password_salt TEXT NOT NULL,
            mood TEXT,
            agreed_to_terms BOOLEAN DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            last_login TIMESTAMP
        )
    ''')
    
    # Create login attempts table for security
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS login_attempts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT NOT NULL,
            attempt_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            success BOOLEAN DEFAULT 0,
            ip_address TEXT
        )
    ''')
    
    conn.commit()
    conn.close()

# Password hashing function
def hash_password(password, salt=None):
    if salt is None:
        salt = secrets.token_hex(16)
    password_hash = hashlib.pbkdf2_hmac(
        'sha256',
        password.encode('utf-8'),
        salt.encode('utf-8'),
        100000
    ).hex()
    return password_hash, salt

# Validation functions
def validate_username(username):
    if len(username) < 3 or len(username) > 20:
        return False, "Username must be 3-20 characters"
    if not re.match(r'^[a-zA-Z0-9_]+$', username):
        return False, "Username can only contain letters, numbers, and underscores"
    return True, ""

def validate_email(email):
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    if not re.match(pattern, email):
        return False, "Invalid email format"
    return True, ""

def validate_password(password):
    if len(password) < 8:
        return False, "Password must be at least 8 characters"
    if not re.search(r'[A-Z]', password):
        return False, "Password must contain at least one uppercase letter"
    if not re.search(r'[a-z]', password):
        return False, "Password must contain at least one lowercase letter"
    if not re.search(r'[0-9]', password):
        return False, "Password must contain at least one number"
    if not re.search(r'[^A-Za-z0-9]', password):
        return False, "Password must contain at least one special character"
    return True, ""

# API Routes
@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/signup', methods=['POST'])
def signup():
    try:
        data = request.json
        
        # Validate required fields
        required_fields = ['username', 'email', 'password', 'mood']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'Missing field: {field}'}), 400
        
        # Validate username
        username_valid, username_msg = validate_username(data['username'])
        if not username_valid:
            return jsonify({'error': username_msg}), 400
        
        # Validate email
        email_valid, email_msg = validate_email(data['email'])
        if not email_valid:
            return jsonify({'error': email_msg}), 400
        
        # Validate password
        password_valid, password_msg = validate_password(data['password'])
        if not password_valid:
            return jsonify({'error': password_msg}), 400
        
        # Check if terms are agreed
        if not data.get('agreed_to_terms'):
            return jsonify({'error': 'You must agree to the terms and conditions'}), 400
        
        # Check if user already exists
        conn = sqlite3.connect('users.db')
        cursor = conn.cursor()
        
        # Check username
        cursor.execute('SELECT id FROM users WHERE username = ?', (data['username'],))
        if cursor.fetchone():
            conn.close()
            return jsonify({'error': 'Username already exists'}), 409
        
        # Check email
        cursor.execute('SELECT id FROM users WHERE email = ?', (data['email'],))
        if cursor.fetchone():
            conn.close()
            return jsonify({'error': 'Email already registered'}), 409
        
        # Hash password
        password_hash, salt = hash_password(data['password'])
        
        # Insert new user
        cursor.execute('''
            INSERT INTO users (username, email, password_hash, password_salt, mood, agreed_to_terms)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (
            data['username'],
            data['email'],
            password_hash,
            salt,
            data['mood'],
            True
        ))
        
        conn.commit()
        user_id = cursor.lastrowid
        
        # Get created user data
        cursor.execute('''
            SELECT id, username, email, mood, created_at 
            FROM users 
            WHERE id = ?
        ''', (user_id,))
        
        user = cursor.fetchone()
        conn.close()
        
        return jsonify({
            'success': True,
            'message': 'User registered successfully',
            'user': {
                'id': user[0],
                'username': user[1],
                'email': user[2],
                'mood': user[3],
                'created_at': user[4]
            }
        }), 201
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/users', methods=['GET'])
def get_users():
    try:
        conn = sqlite3.connect('users.db')
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT id, username, email, mood, created_at 
            FROM users 
            ORDER BY created_at DESC
        ''')
        
        users = cursor.fetchall()
        conn.close()
        
        users_list = []
        for user in users:
            users_list.append({
                'id': user[0],
                'username': user[1],
                'email': user[2],
                'mood': user[3],
                'created_at': user[4]
            })
        
        return jsonify({'users': users_list, 'count': len(users_list)})
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/verify', methods=['POST'])
def verify_login():
    try:
        data = request.json
        
        if 'email' not in data or 'password' not in data:
            return jsonify({'error': 'Missing email or password'}), 400
        
        conn = sqlite3.connect('users.db')
        cursor = conn.cursor()
        
        # Get user by email
        cursor.execute('''
            SELECT id, username, email, password_hash, password_salt 
            FROM users 
            WHERE email = ?
        ''', (data['email'],))
        
        user = cursor.fetchone()
        
        if not user:
            conn.close()
            return jsonify({'error': 'User not found'}), 404
        
        # Verify password
        stored_hash = user[3]
        salt = user[4]
        input_hash, _ = hash_password(data['password'], salt)
        
        if input_hash != stored_hash:
            conn.close()
            return jsonify({'error': 'Invalid password'}), 401
        
        # Update last login
        cursor.execute('''
            UPDATE users 
            SET last_login = CURRENT_TIMESTAMP 
            WHERE id = ?
        ''', (user[0],))
        
        conn.commit()
        conn.close()
        
        return jsonify({
            'success': True,
            'message': 'Login successful',
            'user': {
                'id': user[0],
                'username': user[1],
                'email': user[2]
            }
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/stats', methods=['GET'])
def get_stats():
    try:
        conn = sqlite3.connect('users.db')
        cursor = conn.cursor()
        
        # Get total users
        cursor.execute('SELECT COUNT(*) FROM users')
        total_users = cursor.fetchone()[0]
        
        # Get mood distribution
        cursor.execute('''
            SELECT mood, COUNT(*) as count 
            FROM users 
            WHERE mood IS NOT NULL 
            GROUP BY mood 
            ORDER BY count DESC
        ''')
        
        mood_stats = cursor.fetchall()
        
        # Get recent signups (last 7 days)
        cursor.execute('''
            SELECT COUNT(*) 
            FROM users 
            WHERE date(created_at) >= date('now', '-7 days')
        ''')
        
        recent_signups = cursor.fetchone()[0]
        
        conn.close()
        
        return jsonify({
            'total_users': total_users,
            'recent_signups': recent_signups,
            'mood_distribution': {mood: count for mood, count in mood_stats}
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Admin routes (optional)
@app.route('/admin')
def admin_dashboard():
    return '''
    <html>
        <head>
            <title>User Management Dashboard</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 40px; }
                table { border-collapse: collapse; width: 100%; }
                th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
                th { background-color: #f2f2f2; }
                .stats { display: flex; gap: 20px; margin-bottom: 30px; }
                .stat-box { padding: 20px; background: #f5f5f5; border-radius: 5px; }
            </style>
        </head>
        <body>
            <h1>User Management Dashboard</h1>
            <div class="stats">
                <div class="stat-box">
                    <h3>Total Users: <span id="totalUsers">0</span></h3>
                </div>
                <div class="stat-box">
                    <h3>Recent Signups: <span id="recentSignups">0</span></h3>
                </div>
            </div>
            <table id="usersTable">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Username</th>
                        <th>Email</th>
                        <th>Mood</th>
                        <th>Created At</th>
                    </tr>
                </thead>
                <tbody></tbody>
            </table>
            
            <script>
                async function loadData() {
                    try {
                        // Load stats
                        const statsRes = await fetch('/api/stats');
                        const stats = await statsRes.json();
                        document.getElementById('totalUsers').textContent = stats.total_users;
                        document.getElementById('recentSignups').textContent = stats.recent_signups;
                        
                        // Load users
                        const usersRes = await fetch('/api/users');
                        const data = await usersRes.json();
                        const tbody = document.querySelector('#usersTable tbody');
                        tbody.innerHTML = '';
                        
                        data.users.forEach(user => {
                            const row = tbody.insertRow();
                            row.innerHTML = `
                                <td>${user.id}</td>
                                <td>${user.username}</td>
                                <td>${user.email}</td>
                                <td>${user.mood || 'N/A'}</td>
                                <td>${new Date(user.created_at).toLocaleString()}</td>
                            `;
                        });
                    } catch (error) {
                        console.error('Error loading data:', error);
                    }
                }
                
                // Load data on page load
                loadData();
                
                // Refresh every 30 seconds
                setInterval(loadData, 30000);
            </script>
        </body>
    </html>
    '''

if __name__ == '__main__':
    # Initialize database
    init_db()
    print("Database initialized successfully")
    
    # Check if database file was created
    if os.path.exists('users.db'):
        print("Database file created at:", os.path.abspath('users.db'))
    
    # Run server
    print("Starting server on http://localhost:5000")
    print("API Endpoints:")
    print("  GET  /api/users     - List all users")
    print("  POST /api/signup    - Register new user")
    print("  POST /api/verify    - Verify login")
    print("  GET  /api/stats     - Get statistics")
    print("  GET  /admin         - Admin dashboard")
    
    app.run(debug=True, port=5000)