-- =========================================================
-- Student and Section Management System (SSMS) - Schema
-- Import this in phpMyAdmin (XAMPP) or run via MySQL CLI.
-- =========================================================

CREATE DATABASE IF NOT EXISTS ssms;
USE ssms;

-- ---------------------------------------------------------
-- 1. Departments
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS departments (
  department_id INT AUTO_INCREMENT PRIMARY KEY,
  department_name VARCHAR(100) NOT NULL UNIQUE,
  office_location VARCHAR(100)
) ENGINE=InnoDB;

-- ---------------------------------------------------------
-- 2. Faculty  (also used for Teacher & Advisor roles)
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS faculty (
  faculty_id INT AUTO_INCREMENT PRIMARY KEY,
  faculty_name VARCHAR(100) NOT NULL,
  email VARCHAR(100) NOT NULL UNIQUE,
  designation VARCHAR(100),
  department_id INT,
  FOREIGN KEY (department_id) REFERENCES departments(department_id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ---------------------------------------------------------
-- 3. Sections  (each section has one Faculty Advisor)
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS sections (
  section_id INT AUTO_INCREMENT PRIMARY KEY,
  section_name VARCHAR(50) NOT NULL,
  capacity INT NOT NULL DEFAULT 40,
  department_id INT,
  faculty_id INT, -- advisor assigned to this section
  FOREIGN KEY (department_id) REFERENCES departments(department_id) ON DELETE SET NULL,
  FOREIGN KEY (faculty_id) REFERENCES faculty(faculty_id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ---------------------------------------------------------
-- 4. Students
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS students (
  student_id VARCHAR(20) PRIMARY KEY, -- university ID, e.g. '242-15-065' (set by admin, not auto)
  student_name VARCHAR(100) NOT NULL,
  email VARCHAR(100) NOT NULL UNIQUE,
  academic_year INT,
  clearance_status ENUM('Cleared','Pending') NOT NULL DEFAULT 'Pending',
  section_id INT,
  FOREIGN KEY (section_id) REFERENCES sections(section_id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ---------------------------------------------------------
-- 5. Courses  (each course has one assigned Teacher)
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS courses (
  course_id INT AUTO_INCREMENT PRIMARY KEY,
  course_code VARCHAR(20) NOT NULL UNIQUE,
  course_title VARCHAR(150) NOT NULL,
  credit DECIMAL(3,1) NOT NULL,
  department_id INT,
  faculty_id INT, -- teacher assigned to this course
  FOREIGN KEY (department_id) REFERENCES departments(department_id) ON DELETE SET NULL,
  FOREIGN KEY (faculty_id) REFERENCES faculty(faculty_id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ---------------------------------------------------------
-- 6. Enrollments  (Student <-> Course, M:N)
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS enrollments (
  enrollment_id INT AUTO_INCREMENT PRIMARY KEY,
  student_id VARCHAR(20) NOT NULL,
  course_id INT NOT NULL,
  semester VARCHAR(20),
  academic_year INT,
  FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE,
  FOREIGN KEY (course_id) REFERENCES courses(course_id) ON DELETE CASCADE,
  UNIQUE KEY unique_enrollment (student_id, course_id, semester, academic_year)
) ENGINE=InnoDB;

-- ---------------------------------------------------------
-- 7. Users  (login accounts - role based access)
--    Login is done with login_id + email + password (no username).
--    - student login:  login_id = students.student_id  (e.g. 242-15-065)
--    - teacher/advisor login: login_id = faculty.faculty_id
--    - admin login: login_id is freely chosen by whoever creates the admin account
--    email must match the linked student/faculty record's email
--    (for admin accounts there is no linked record, so email is stored directly).
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  user_id INT AUTO_INCREMENT PRIMARY KEY,
  login_id VARCHAR(30) NOT NULL,      -- the ID typed at login (student ID / faculty ID / admin ID)
  email VARCHAR(100) NOT NULL,        -- must match linked record's email (student/faculty), or is the admin's own email
  password VARCHAR(255) NOT NULL,     -- bcrypt hash
  role ENUM('student','teacher','advisor','admin') NOT NULL,
  student_id VARCHAR(20) NULL,        -- set when role = 'student'
  faculty_id INT NULL,                -- set when role = 'teacher' or 'advisor'
  display_name VARCHAR(100) NULL,     -- only used for role = 'admin' (no separate admin entity table)
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_login (login_id, email),
  FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE,
  FOREIGN KEY (faculty_id) REFERENCES faculty(faculty_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ---------------------------------------------------------
-- 8. Registration Requests
--    Public self-registration lands here as 'pending'. An admin
--    reviews it on the Registrations page and approves or rejects it.
--    Approving a student/admin request uses login_id as-is; approving
--    a teacher/advisor request creates a new faculty record and that
--    record's auto-generated faculty_id becomes the real login ID
--    (kept consistent with how faculty logins already work).
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS registration_requests (
  request_id INT AUTO_INCREMENT PRIMARY KEY,
  role ENUM('student','teacher','advisor','admin') NOT NULL,
  login_id VARCHAR(30) NOT NULL,   -- desired ID; authoritative for student/admin, informational for teacher/advisor
  full_name VARCHAR(100) NOT NULL,
  email VARCHAR(100) NOT NULL,
  password VARCHAR(255) NOT NULL,  -- bcrypt hash, generated at signup time
  status ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  reviewed_at TIMESTAMP NULL
) ENGINE=InnoDB;

-- ---------------------------------------------------------
-- 9. Advisor ID Ranges
--    The student-ID range an advisor is allowed to add new students
--    into. An advisor with no range on file cannot add students at all.
--    Range comparison is a plain string BETWEEN, so it only works
--    correctly when every ID in play has the same fixed format/length
--    (e.g. '242-15-065'..'252-15-115').
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS advisor_id_ranges (
  range_id INT AUTO_INCREMENT PRIMARY KEY,
  faculty_id INT NOT NULL,
  range_start VARCHAR(20) NOT NULL,
  range_end VARCHAR(20) NOT NULL,
  FOREIGN KEY (faculty_id) REFERENCES faculty(faculty_id) ON DELETE CASCADE
) ENGINE=InnoDB;
