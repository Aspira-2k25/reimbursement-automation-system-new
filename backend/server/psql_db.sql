CREATE TABLE users (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    moodle_id VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    department VARCHAR(100),
    role VARCHAR(50)
);

select *from users

INSERT INTO users (moodle_id, name, department, role)
VALUES
('23104022', 'Apoorva Puranik', 'Information Technology', 'Student'),
('23104158', 'Nirmala Patole', 'Information Technology', 'Student'),
('23104011', 'Alok Kumar Sahoo', 'Information Technology', 'Student'),
('23104007', 'Vaibhavi Naik', 'Information Technology', 'Student');


-- Add password and authentication fields to your existing users table
ALTER TABLE users ADD COLUMN password_hash VARCHAR(255);
ALTER TABLE users ADD COLUMN email VARCHAR(100) UNIQUE;
ALTER TABLE users ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE users ADD COLUMN last_login TIMESTAMP;
ALTER TABLE users ADD COLUMN is_active BOOLEAN DEFAULT TRUE;

-- Add some test users with passwords (you'll hash these later)
UPDATE users SET
  password_hash = '$2a$10$example_hash_here',
  email = moodle_id || '@university.edu',
  is_active = TRUE
WHERE password_hash IS NULL;