import os
import datetime
from flask import Flask, request, jsonify, session, send_from_directory
from flask_cors import CORS
from werkzeug.security import check_password_hash
from dotenv import load_dotenv

from db import init_db, get_connection

# Load environment variables
load_dotenv()

app = Flask(__name__, static_folder='../frontend', static_url_path='')
app.secret_key = os.getenv("SECRET_KEY", "transitops_default_fallback_secret_key_9876")

# Enable CORS for local testing/development
CORS(app, supports_credentials=True)

# Run database setup and seeding on startup
try:
    init_db()
except Exception as e:
    print(f"\n==========================================")
    print(f"WARNING: Could not connect or initialize MySQL.")
    print(f"Please make sure WampServer is running or MySQL is started on port {os.getenv('DB_PORT', 3306)}.")
    print(f"Error: {e}")
    print(f"==========================================\n")

@app.route('/')
def serve_index():
    """Serves the main HTML entry point."""
    return app.send_static_file('index.html')

@app.route('/<path:path>')
def serve_static(path):
    """Serves static assets like CSS, JS, and images."""
    return send_from_directory(app.static_folder, path)

@app.route('/api/auth/status', methods=['GET'])
def auth_status():
    """Checks if the user is authenticated in the current session."""
    if 'user_id' in session:
        return jsonify({
            "authenticated": True,
            "user": {
                "email": session['email'],
                "role": session['role']
            }
        })
    return jsonify({"authenticated": False})

@app.route('/api/auth/login', methods=['POST'])
def login():
    """Handles authentication, RBAC verification, and rate-limiting lockout."""
    data = request.get_json() or {}
    email = data.get('email', '').strip()
    password = data.get('password', '')
    requested_role = data.get('role', '')

    if not email or not password or not requested_role:
        return jsonify({"message": "Please fill in all credentials."}), 400

    conn = None
    try:
        conn = get_connection()
        with conn.cursor() as cursor:
            # Query the user
            cursor.execute("SELECT * FROM users WHERE email = %s", (email,))
            user = cursor.fetchone()

            if not user:
                return jsonify({"message": "Invalid credentials."}), 401

            # Check Lockout State
            now = datetime.datetime.now()
            if user['locked_until'] is not None:
                if user['locked_until'] > now:
                    # Locked out
                    return jsonify({
                        "message": "Invalid credentials. Account locked after 5 failed attempts."
                    }), 403
                else:
                    # Lock expired, reset failed attempts
                    cursor.execute(
                        "UPDATE users SET failed_attempts = 0, locked_until = NULL WHERE id = %s",
                        (user['id'],)
                    )
                    conn.commit()
                    user['failed_attempts'] = 0

            # Verify Password
            if check_password_hash(user['password_hash'], password):
                # Verify Role
                if user['role'] != requested_role:
                    # Update failed attempts even for role mismatches to prevent brute forcing roles
                    new_attempts = user['failed_attempts'] + 1
                    locked_until = None
                    if new_attempts >= 5:
                        locked_until = now + datetime.timedelta(minutes=5)
                        msg = "Invalid credentials. Account locked after 5 failed attempts."
                    else:
                        msg = f"Invalid credentials."

                    cursor.execute(
                        "UPDATE users SET failed_attempts = %s, locked_until = %s WHERE id = %s",
                        (new_attempts, locked_until, user['id'])
                    )
                    conn.commit()
                    return jsonify({"message": msg}), 401

                # Correct credentials & role -> Reset attempts and store session
                cursor.execute(
                    "UPDATE users SET failed_attempts = 0, locked_until = NULL WHERE id = %s",
                    (user['id'],)
                )
                conn.commit()

                session['user_id'] = user['id']
                session['email'] = user['email']
                session['role'] = user['role']

                return jsonify({
                    "success": True,
                    "user": {
                        "email": user['email'],
                        "role": user['role']
                    }
                })

            else:
                # Incorrect password
                new_attempts = user['failed_attempts'] + 1
                locked_until = None
                if new_attempts >= 5:
                    locked_until = now + datetime.timedelta(minutes=5)
                    msg = "Invalid credentials. Account locked after 5 failed attempts."
                else:
                    msg = f"Invalid credentials."

                cursor.execute(
                    "UPDATE users SET failed_attempts = %s, locked_until = %s WHERE id = %s",
                    (new_attempts, locked_until, user['id'])
                )
                conn.commit()
                return jsonify({"message": msg}), (403 if new_attempts >= 5 else 401)

    except Exception as e:
        print(f"Login error: {e}")
        return jsonify({"message": f"Database error. Please make sure MySQL is running."}), 500
    finally:
        if conn:
            conn.close()

@app.route('/api/auth/logout', methods=['POST'])
def logout():
    """Logs out the user and clears the session."""
    session.clear()
    return jsonify({"success": True})

@app.route('/api/dashboard/data', methods=['GET'])
def get_dashboard_data():
    """Returns role-scoped dashboard data and summary stats from the MySQL database."""
    if 'user_id' not in session:
        return jsonify({"message": "Unauthorized access. Please log in."}), 401

    role = session['role']
    conn = None
    try:
        conn = get_connection()
        with conn.cursor() as cursor:
            if role == 'Fleet Manager':
                # Fetch all fleet vehicles
                cursor.execute("SELECT * FROM fleet")
                vehicles = cursor.fetchall()

                # Calculate stats
                total = len(vehicles)
                active = sum(1 for v in vehicles if v['status'] == 'Active')
                maintenance = sum(1 for v in vehicles if v['status'] == 'Maintenance')
                avg_fuel = int(sum(v['fuel_level'] for v in vehicles) / total) if total > 0 else 0

                return jsonify({
                    "role": role,
                    "stats": {
                        "total_vehicles": total,
                        "active_vehicles": active,
                        "in_maintenance": maintenance,
                        "avg_fuel_level": f"{avg_fuel}%"
                    },
                    "data": vehicles
                })

            elif role == 'Dispatcher':
                # Fetch all trips
                cursor.execute("SELECT * FROM trips")
                trips = cursor.fetchall()

                # Calculate stats
                total = len(trips)
                in_transit = sum(1 for t in trips if t['status'] == 'In Transit')
                scheduled = sum(1 for t in trips if t['status'] == 'Scheduled')
                completed = sum(1 for t in trips if t['status'] == 'Completed')

                return jsonify({
                    "role": role,
                    "stats": {
                        "total_trips": total,
                        "in_transit": in_transit,
                        "scheduled": scheduled,
                        "completed": completed
                    },
                    "data": trips
                })

            elif role == 'Safety Officer':
                # Fetch all drivers
                cursor.execute("SELECT * FROM drivers")
                drivers = cursor.fetchall()

                # Calculate stats
                total = len(drivers)
                avg_safety = int(sum(d['safety_score'] for d in drivers) / total) if total > 0 else 0
                active = sum(1 for d in drivers if d['status'] == 'Active')
                compliance_passed = sum(1 for d in drivers if d['compliance_check'] == 'Passed')

                return jsonify({
                    "role": role,
                    "stats": {
                        "total_drivers": total,
                        "avg_safety_score": f"{avg_safety}/100",
                        "active_drivers": active,
                        "compliance_passed": compliance_passed
                    },
                    "data": drivers
                })

            elif role == 'Financial Analyst':
                # Fetch all expenses
                cursor.execute("SELECT * FROM expenses")
                expenses = cursor.fetchall()

                # Calculate stats
                total_amount = float(sum(e['amount'] for e in expenses))
                fuel_cost = float(sum(e['amount'] for e in expenses if e['category'] == 'Fuel'))
                maint_cost = float(sum(e['amount'] for e in expenses if e['category'] == 'Maintenance'))
                salaries_cost = float(sum(e['amount'] for e in expenses if e['category'] == 'Salaries'))

                # Standard python decimals need to be float to serialize to JSON
                for exp in expenses:
                    exp['amount'] = float(exp['amount'])
                    if isinstance(exp['date'], datetime.date):
                        exp['date'] = exp['date'].strftime('%Y-%m-%d')

                return jsonify({
                    "role": role,
                    "stats": {
                        "total_expenses": f"${total_amount:,.2f}",
                        "fuel_costs": f"${fuel_cost:,.2f}",
                        "maintenance_costs": f"${maint_cost:,.2f}",
                        "payroll_costs": f"${salaries_cost:,.2f}"
                    },
                    "data": expenses
                })

            else:
                return jsonify({"message": "Invalid user role."}), 400

    except Exception as e:
        print(f"Error fetching dashboard data: {e}")
        return jsonify({"message": "Database error while fetching dashboard statistics."}), 500
    finally:
        if conn:
            conn.close()

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
