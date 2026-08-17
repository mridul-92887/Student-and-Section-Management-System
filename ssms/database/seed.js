
require('dotenv').config();
const bcrypt = require('bcryptjs');
const pool = require('../config/db');

const DEMO_PASSWORD = 'password123';

async function seed() {
  const conn = await pool.getConnection();
  try {
    console.log('Clearing existing data...');
    await conn.query('SET FOREIGN_KEY_CHECKS = 0');
    for (const t of ['advisor_id_ranges', 'registration_requests', 'users', 'enrollments', 'courses', 'students', 'sections', 'faculty', 'departments']) {
      await conn.query(`TRUNCATE TABLE ${t}`);
    }
    await conn.query('SET FOREIGN_KEY_CHECKS = 1');

    // =========================================================
    // DEPARTMENTS - 10 RECORDS
    // =========================================================
    console.log('Inserting departments...');

    const departments = [
      ['Computer Science & Engineering', 'Building A, Room 301'],
      ['Electrical & Electronic Engineering', 'Building B, Room 210'],
      ['Software Engineering', 'Building A, Room 305'],
      ['Information Technology & Management', 'Building C, Room 201'],
      ['Civil Engineering', 'Building D, Room 110'],
      ['Textile Engineering', 'Building E, Room 205'],
      ['Business Administration', 'Building F, Room 301'],
      ['English', 'Building G, Room 202'],
      ['Law', 'Building H, Room 105'],
      ['Architecture', 'Building I, Room 304']
    ];

    const deptIds = [];

    for (const dept of departments) {
      const [result] = await conn.query(
        `INSERT INTO departments (department_name, office_location) VALUES (?, ?)`,
        dept
      );
      deptIds.push(result.insertId);
    }

    // =========================================================
    // FACULTY - 10 RECORDS
    // =========================================================
    console.log('Inserting faculty...');

    const facultyData = [
      ['Lamia Rukhsara', 'lamia.rukhsara@diu.edu.bd', 'Senior Lecturer', deptIds[0]],
      ['Kamal Hossain', 'kamal.hossain@diu.edu.bd', 'Assistant Professor', deptIds[0]],
      ['Nusrat Jahan', 'nusrat.jahan@diu.edu.bd', 'Lecturer', deptIds[1]],
      ['Tanvir Ahmed', 'tanvir.ahmed@diu.edu.bd', 'Assistant Professor', deptIds[2]],
      ['Farhana Yasmin', 'farhana.yasmin@diu.edu.bd', 'Lecturer', deptIds[3]],
      ['Md. Saiful Islam', 'saiful.islam@diu.edu.bd', 'Associate Professor', deptIds[4]],
      ['Sadia Afrin', 'sadia.afrin@diu.edu.bd', 'Senior Lecturer', deptIds[5]],
      ['Arif Rahman', 'arif.rahman@diu.edu.bd', 'Assistant Professor', deptIds[6]],
      ['Moumita Sultana', 'moumita.sultana@diu.edu.bd', 'Lecturer', deptIds[7]],
      ['Imran Kabir', 'imran.kabir@diu.edu.bd', 'Assistant Professor', deptIds[8]]
    ];

    const facultyIds = [];

    for (const faculty of facultyData) {
      const [result] = await conn.query(
        `INSERT INTO faculty (faculty_name, email, designation, department_id)
         VALUES (?, ?, ?, ?)`,
        faculty
      );
      facultyIds.push(result.insertId);
    }

    // =========================================================
    // SECTIONS - 10 RECORDS
    // =========================================================
    console.log('Inserting sections...');

    const sections = [
      ['CSE-61-A', 40, deptIds[0], facultyIds[0]],
      ['CSE-61-B', 40, deptIds[0], facultyIds[1]],
      ['EEE-61-A', 40, deptIds[1], facultyIds[2]],
      ['SWE-61-A', 35, deptIds[2], facultyIds[3]],
      ['ITM-61-A', 35, deptIds[3], facultyIds[4]],
      ['CE-61-A', 40, deptIds[4], facultyIds[5]],
      ['TE-61-A', 35, deptIds[5], facultyIds[6]],
      ['BBA-61-A', 45, deptIds[6], facultyIds[7]],
      ['ENG-61-A', 30, deptIds[7], facultyIds[8]],
      ['LAW-61-A', 30, deptIds[8], facultyIds[9]]
    ];

    const sectionIds = [];

    for (const section of sections) {
      const [result] = await conn.query(
        `INSERT INTO sections
         (section_name, capacity, department_id, faculty_id)
         VALUES (?, ?, ?, ?)`,
        section
      );
      sectionIds.push(result.insertId);
    }

    // =========================================================
    // STUDENTS - 10 RECORDS
    // =========================================================
    console.log('Inserting students...');

    const students = [
      ['242-15-065','Sadman Hafiz Shuvo','shuvo242-15-065@diu.edu.bd',3,'Pending',sectionIds[0]],
      ['242-15-365','Atikul Hasan Mridul','atikul242-15-365@diu.edu.bd',3,'Pending',sectionIds[0]],
      ['242-15-467','Jannatul Ferdous Alma','alma242-15-467@diu.edu.bd',3,'Cleared',sectionIds[1]],
      ['242-15-569','Mukta Majumder','mukta242-15-569@diu.edu.bd',3,'Pending',sectionIds[2]],
      ['242-15-610','Towmim','towmim242-15-610@diu.edu.bd',3,'Cleared',sectionIds[3]],
      ['242-15-009', 'Rafiul Islam', 'rafiul242-15-065@diu.edu.bd', 3, 'Pending', sectionIds[0]],
      ['242-15-089', 'Farzana Akter', 'farzana242-15-089@diu.edu.bd', 3, 'Cleared', sectionIds[0]],
      ['221-15-312', 'Tanvir Ahmed', 'tanvir221-15-312@diu.edu.bd', 2, 'Pending', sectionIds[1]],
      ['242-11-101', 'Nusrat Jahan', 'nusrat242-11-101@diu.edu.bd', 3, 'Cleared', sectionIds[2]],
      ['242-14-115', 'Mehedi Hasan', 'mehedi242-14-115@diu.edu.bd', 3, 'Pending', sectionIds[3]],
      ['231-16-203', 'Jannatul Ferdous', 'jannatul231-16-203@diu.edu.bd', 2, 'Cleared', sectionIds[4]],
      ['231-17-227', 'Sakib Hossain', 'sakib231-17-227@diu.edu.bd', 2, 'Pending', sectionIds[5]],
      ['242-66-318', 'Tasnim Ara', 'tasnim242-66-318@diu.edu.bd', 3, 'Cleared', sectionIds[6]],
      ['231-18-421', 'Mahmudul Hasan', 'mahmudul231-18-421@diu.edu.bd', 2, 'Pending', sectionIds[7]],
      ['221-19-512', 'Sumaiya Rahman', 'sumaiya221-19-512@diu.edu.bd', 4, 'Cleared', sectionIds[8]]
    ];

    const studentIds = [];

    for (const student of students) {
      await conn.query(
        `INSERT INTO students
         (student_id, student_name, email, academic_year, clearance_status, section_id)
         VALUES (?, ?, ?, ?, ?, ?)`,
        student
      );

      studentIds.push(student[0]);
    }

    // =========================================================
    // COURSES - 10 RECORDS
    // =========================================================
    console.log('Inserting courses...');

    const courses = [
      ['CSE-415', 'Database Management System', 3.0, deptIds[0], facultyIds[1]],
      ['CSE-421', 'Web Engineering', 3.0, deptIds[0], facultyIds[1]],
      ['CSE-311', 'Data Structures and Algorithms', 3.0, deptIds[0], facultyIds[0]],
      ['EEE-211', 'Digital Electronics', 3.0, deptIds[1], facultyIds[2]],
      ['SWE-301', 'Software Requirements Engineering', 3.0, deptIds[2], facultyIds[3]],
      ['ITM-305', 'Information Systems Management', 3.0, deptIds[3], facultyIds[4]],
      ['CE-201', 'Structural Mechanics', 3.0, deptIds[4], facultyIds[5]],
      ['TE-301', 'Textile Manufacturing', 3.0, deptIds[5], facultyIds[6]],
      ['BBA-205', 'Principles of Marketing', 3.0, deptIds[6], facultyIds[7]],
      ['ENG-301', 'Advanced English Composition', 3.0, deptIds[7], facultyIds[8]]
    ];

    const courseIds = [];

    for (const course of courses) {
      const [result] = await conn.query(
        `INSERT INTO courses
         (course_code, course_title, credit, department_id, faculty_id)
         VALUES (?, ?, ?, ?, ?)`,
        course
      );

      courseIds.push(result.insertId);
    }

    // =========================================================
    // ENROLLMENTS - 10 RECORDS
    // =========================================================
    console.log('Inserting enrollments...');

    const enrollments = [
      [studentIds[0], courseIds[0], 'Spring', 2026],
      [studentIds[0], courseIds[1], 'Spring', 2026],
      [studentIds[1], courseIds[0], 'Spring', 2026],
      [studentIds[1], courseIds[2], 'Spring', 2026],
      [studentIds[2], courseIds[0], 'Spring', 2026],
      [studentIds[2], courseIds[1], 'Spring', 2026],
      [studentIds[3], courseIds[3], 'Spring', 2026],
      [studentIds[4], courseIds[4], 'Spring', 2026],
      [studentIds[5], courseIds[5], 'Spring', 2026],
      [studentIds[6], courseIds[6], 'Spring', 2026]
    ];

    for (const enrollment of enrollments) {
      await conn.query(
        `INSERT INTO enrollments
         (student_id, course_id, semester, academic_year)
         VALUES (?, ?, ?, ?)`,
        enrollment
      );
    }

    // =========================================================
    // DEMO USERS
    // =========================================================
    console.log(
      '\nCreating demo login accounts (all passwords: ' +
      DEMO_PASSWORD +
      ')...'
    );

    const hash = await bcrypt.hash(DEMO_PASSWORD, 10);

    // Admin account
    await conn.query(
      `INSERT INTO users
       (login_id, email, password, role, display_name)
       VALUES ('A-001', 'admin@diu.edu.bd', ?, 'admin', 'System Admin')`,
      [hash]
    );

    // Faculty accounts
    for (let i = 0; i < facultyIds.length; i++) {
      await conn.query(
        `INSERT INTO users
         (login_id, email, password, role, faculty_id)
         VALUES (?, ?, ?, ?, ?)`,
        [
          String(facultyIds[i]),
          facultyData[i][1],
          hash,
          i === 0 ? 'advisor' : 'teacher',
          facultyIds[i]
        ]
      );
    }

    // =========================================================
    // ADVISOR ID RANGES - 10 RECORDS
    // =========================================================
    console.log('Assigning advisor ID ranges...');

    const advisorRanges = [
      [facultyIds[0], '242-15-000', '242-15-999'],
      [facultyIds[1], '241-15-000', '241-15-999'],
      [facultyIds[2], '242-11-000', '242-11-999'],
      [facultyIds[3], '242-14-000', '242-14-999'],
      [facultyIds[4], '242-16-000', '242-16-999'],
      [facultyIds[5], '231-16-000', '231-16-999'],
      [facultyIds[6], '231-17-000', '231-17-999'],
      [facultyIds[7], '242-66-000', '242-66-999'],
      [facultyIds[8], '231-18-000', '231-18-999'],
      [facultyIds[9], '221-19-000', '221-19-999']
    ];

    for (const range of advisorRanges) {
      await conn.query(
        `INSERT INTO advisor_id_ranges
         (faculty_id, range_start, range_end)
         VALUES (?, ?, ?)`,
        range
      );
    }

    // =========================================================
    // STUDENT USERS - 10 RECORDS
    // =========================================================
    console.log('Creating student login accounts...');

    for (let i = 0; i < students.length; i++) {
      await conn.query(
        `INSERT INTO users
         (login_id, email, password, role, student_id)
         VALUES (?, ?, ?, 'student', ?)`,
        [
          students[i][0],
          students[i][2],
          hash,
          students[i][0]
        ]
      );
    }

    // =========================================================
    // REGISTRATION REQUESTS
    // =========================================================
    // No records are inserted here because the original project
    // seed did not show the column structure of this table.
    // This prevents accidentally inserting invalid column data.

    console.log('\nSeed complete!');
    console.log(
      'Demo accounts (password for all: ' +
      DEMO_PASSWORD +
      '):'
    );

    console.log(
      '  Admin    -> ID: A-001 | Email: admin@diu.edu.bd'
    );

    for (let i = 0; i < facultyIds.length; i++) {
      console.log(
        `  Faculty  -> ID: ${facultyIds[i]} | Email: ${facultyData[i][1]} | Role: ${i === 0 ? 'advisor' : 'teacher'}`
      );
    }

    for (let i = 0; i < students.length; i++) {
      console.log(
        `  Student  -> ID: ${students[i][0]} | Email: ${students[i][2]}`
      );
    }

  } catch (err) {
    console.error('Seed failed:', err);
  } finally {
    conn.release();
    await pool.end();
  }
}

seed();
