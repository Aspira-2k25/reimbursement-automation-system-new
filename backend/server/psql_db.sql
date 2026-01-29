-- PostgreSQL Database Setup for Reimbursement System
-- Database: reimburse

-- Create Staff Table (Faculty, HOD, Coordinator, Principal)
CREATE TABLE staff (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) NOT NULL,
    password VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    role VARCHAR(50),
    name VARCHAR(100),
    department VARCHAR(50),
    employee_id VARCHAR(50),
    is_active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- View all staff
SELECT * FROM staff;

-- Insert test staff data (Development/Testing Only)
-- NOTE: These are plain text passwords for local development. 
-- In production, passwords should be hashed using bcrypt via the application.
INSERT INTO staff (username, password, email, role, name, department, is_active) VALUES
('Nirmala123', 'nimm1234', 'nimm@gmail.com', 'coordinator', 'Nirmala Patole', 'IT', TRUE),
('Apoorva', 'ap1234', 'app@gmail.com', 'HOD', 'Apoorva Puranik', 'IT', TRUE),
('Alok', 'alok1234', 'alok@gmail.com', 'Faculty', 'Alok Sahoo', 'IT', TRUE),
('Gourish', 'gouri1234', 'Gouri@gmail.com', 'Faculty', 'Gourish Pednekar', 'IT', TRUE),
('Vaibhavi', 'Vai1234', 'vaibhavi@gmail.com', 'Principal', 'Vaibhavi Naik', 'Comps', TRUE),
('AccountJagan', 'jagan1234', 'jagan@apsit.edu.in', 'Accounts', 'Jagan Sahoo', 'Accounts', TRUE);