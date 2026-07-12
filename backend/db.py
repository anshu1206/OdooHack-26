import os
import datetime
import pymysql
from werkzeug.security import generate_password_hash
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

DB_HOST = os.getenv("DB_HOST", "localhost")
DB_USER = os.getenv("DB_USER", "root")
DB_PASSWORD = os.getenv("DB_PASSWORD", "")
DB_PORT = int(os.getenv("DB_PORT", 3306))
DB_NAME = os.getenv("DB_NAME", "transitops_db")

def get_connection(include_db=True):
    """Establishes connection to MySQL server."""
    return pymysql.connect(
        host=DB_HOST,
        user=DB_USER,
        password=DB_PASSWORD,
        port=DB_PORT,
        database=DB_NAME if include_db else None,
        cursorclass=pymysql.cursors.DictCursor
    )

def init_db():
    """Initializes the database, tables, and seeds initial data."""
    # Step 1: Connect to server without DB and create DB if not exists
    conn = pymysql.connect(
        host=DB_HOST,
        user=DB_USER,
        password=DB_PASSWORD,
        port=DB_PORT,
        cursorclass=pymysql.cursors.DictCursor
    )
    try:
        with conn.cursor() as cursor:
            cursor.execute(f"CREATE DATABASE IF NOT EXISTS {DB_NAME}")
            print(f"Database '{DB_NAME}' verified/created.")
    finally:
        conn.close()

    # Step 2: Connect to the database and create tables
    conn = get_connection(include_db=True)
    try:
        with conn.cursor() as cursor:
            # Users Table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS users (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    email VARCHAR(150) UNIQUE NOT NULL,
                    password_hash VARCHAR(255) NOT NULL,
                    role VARCHAR(50) NOT NULL,
                    failed_attempts INT DEFAULT 0,
                    locked_until DATETIME DEFAULT NULL
                )
            """)

            # Fleet Table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS fleet (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    vehicle_name VARCHAR(100) NOT NULL,
                    status VARCHAR(50) NOT NULL,
                    fuel_level INT NOT NULL,
                    last_service DATE NOT NULL,
                    mileage INT NOT NULL
                )
            """)

            # Trips Table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS trips (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    trip_id VARCHAR(50) NOT NULL,
                    driver_name VARCHAR(100) NOT NULL,
                    vehicle_name VARCHAR(100) NOT NULL,
                    destination VARCHAR(150) NOT NULL,
                    status VARCHAR(50) NOT NULL,
                    eta VARCHAR(50) NOT NULL
                )
            """)

            # Drivers Table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS drivers (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    driver_name VARCHAR(100) NOT NULL,
                    license_number VARCHAR(50) NOT NULL,
                    safety_score INT NOT NULL,
                    status VARCHAR(50) NOT NULL,
                    compliance_check VARCHAR(50) NOT NULL
                )
            """)

            # Expenses Table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS expenses (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    category VARCHAR(100) NOT NULL,
                    amount DECIMAL(10, 2) NOT NULL,
                    date DATE NOT NULL,
                    description VARCHAR(200) NOT NULL
                )
            """)

            conn.commit()
            print("Tables verified/created successfully.")

            # Step 3: Seed Initial Data
            # Seed Users
            cursor.execute("SELECT COUNT(*) as count FROM users")
            if cursor.fetchone()['count'] == 0:
                users_data = [
                    ('manager@transitops.in', generate_password_hash('manager123'), 'Fleet Manager'),
                    ('dispatcher@transitops.in', generate_password_hash('dispatcher123'), 'Dispatcher'),
                    ('safety@transitops.in', generate_password_hash('safety123'), 'Safety Officer'),
                    ('finance@transitops.in', generate_password_hash('finance123'), 'Financial Analyst')
                ]
                cursor.executemany(
                    "INSERT INTO users (email, password_hash, role) VALUES (%s, %s, %s)",
                    users_data
                )
                print("Seeded default users.")

            # Seed Fleet
            cursor.execute("SELECT COUNT(*) as count FROM fleet")
            if cursor.fetchone()['count'] == 0:
                fleet_data = [
                    ('Truck-01 (Freightliner)', 'Active', 78, '2026-06-15', 45200),
                    ('Truck-02 (Volvo VNL)', 'Maintenance', 12, '2026-07-01', 89100),
                    ('Van-05 (Ford Transit)', 'Active', 95, '2026-06-28', 12400),
                    ('Truck-04 (Peterbilt)', 'Active', 45, '2026-05-20', 105600),
                    ('Van-12 (Mercedes Sprinter)', 'Out of Service', 0, '2026-04-12', 67000)
                ]
                cursor.executemany(
                    "INSERT INTO fleet (vehicle_name, status, fuel_level, last_service, mileage) VALUES (%s, %s, %s, %s, %s)",
                    fleet_data
                )
                print("Seeded fleet data.")

            # Seed Trips
            cursor.execute("SELECT COUNT(*) as count FROM trips")
            if cursor.fetchone()['count'] == 0:
                trips_data = [
                    ('TRIP-9904', 'Alexander Smith', 'Truck-01', 'Chicago, IL', 'In Transit', '2h 15m'),
                    ('TRIP-9905', 'Sarah Jenkins', 'Van-05', 'Detroit, MI', 'Scheduled', 'Tomorrow 08:00 AM'),
                    ('TRIP-9902', 'Marcus Vance', 'Truck-04', 'Los Angeles, CA', 'Completed', 'Arrived'),
                    ('TRIP-9906', 'David Miller', 'Truck-01', 'Dallas, TX', 'In Transit', '5h 40m')
                ]
                cursor.executemany(
                    "INSERT INTO trips (trip_id, driver_name, vehicle_name, destination, status, eta) VALUES (%s, %s, %s, %s, %s, %s)",
                    trips_data
                )
                print("Seeded trips data.")

            # Seed Drivers
            cursor.execute("SELECT COUNT(*) as count FROM drivers")
            if cursor.fetchone()['count'] == 0:
                drivers_data = [
                    ('Alexander Smith', 'DL-TX884920', 94, 'Active', 'Passed'),
                    ('Sarah Jenkins', 'DL-MI339485', 88, 'Active', 'Passed'),
                    ('Marcus Vance', 'DL-CA100293', 75, 'Active', 'Due'),
                    ('David Miller', 'DL-NY773829', 97, 'Active', 'Passed'),
                    ('Robert Cooper', 'DL-IL992031', 42, 'Pending Review', 'Failed')
                ]
                cursor.executemany(
                    "INSERT INTO drivers (driver_name, license_number, safety_score, status, compliance_check) VALUES (%s, %s, %s, %s, %s)",
                    drivers_data
                )
                print("Seeded drivers data.")

            # Seed Expenses
            cursor.execute("SELECT COUNT(*) as count FROM expenses")
            if cursor.fetchone()['count'] == 0:
                expenses_data = [
                    ('Fuel', 14500.00, '2026-07-10', 'Weekly bulk diesel purchase'),
                    ('Maintenance', 3200.00, '2026-07-08', 'Truck-02 engine diagnostic and repair'),
                    ('Insurance', 8900.00, '2026-07-01', 'Monthly fleet liability coverage'),
                    ('Salaries', 28500.00, '2026-06-30', 'Driver and dispatcher payroll'),
                    ('Fuel', 12100.00, '2026-07-03', 'Weekly bulk diesel purchase')
                ]
                cursor.executemany(
                    "INSERT INTO expenses (category, amount, date, description) VALUES (%s, %s, %s, %s)",
                    expenses_data
                )
                print("Seeded expenses data.")

            conn.commit()
            print("Database initialization and seeding complete.")
    except Exception as e:
        print(f"Error initializing database: {e}")
        raise e
    finally:
        conn.close()

if __name__ == "__main__":
    init_db()
