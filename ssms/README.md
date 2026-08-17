# SSMS — Student and Section Management System

A role-based web app built with **Node.js + Express** on the backend
(exposed as a **JSON API** under `/api/...`) and a **plain HTML/CSS/JS**
frontend (in `public/`) that calls that API with `fetch()` and renders
the page itself — no EJS, no templating engine, no build step, no
React/Vue/etc. Database is **MySQL via XAMPP/phpMyAdmin**.

Roles: **Admin**, **Teacher**, **Advisor**, **Student** — each sees only
their own dashboard and data.

---

## 1. Prerequisites

- [XAMPP](https://www.apachefriends.org/) installed, with **Apache** and **MySQL** running
- [Node.js](https://nodejs.org/) (v18+) installed
- This project folder, unzipped anywhere on your machine

---

## 2. Set up the database (phpMyAdmin)

1. Start XAMPP, launch **Apache** and **MySQL** from the control panel.
2. Open `http://localhost/phpmyadmin` in your browser.
3. Click **Import** (or open the **SQL** tab) and run the file
   `database/schema.sql` from this project. This creates the `ssms`
   database and all tables:
   - `departments`, `faculty`, `sections`, `students`, `courses`,
     `enrollments`, `users`
4. That's it — no manual table clicking needed, the whole schema is in
   that one file.

---

## 3. Configure the app

1. In the project folder, copy `.env.example` to `.env`:
   ```
   cp .env.example .env
   ```
   (On Windows, just duplicate the file and rename it.)
2. Open `.env` and make sure it matches your XAMPP MySQL settings.
   By default XAMPP's MySQL root user has **no password**, so the
   defaults usually work as-is:
   ```
   DB_HOST=localhost
   DB_PORT=3306
   DB_USER=root
   DB_PASSWORD=
   DB_NAME=ssms
   PORT=3000
   SESSION_SECRET=any_random_long_string
   ```

---

## 4. Install dependencies and seed sample data

From inside the project folder:

```bash
npm install
npm run seed
```

`npm run seed` inserts sample departments, faculty, sections, students,
courses, and enrollments, **and** creates one demo login for every role
so you can test immediately. Login is **ID + Email + Password** (no
username):

| Role    | ID          | Email                          | Password    |
|---------|-------------|---------------------------------|--------------|
| Admin   | A-001       | admin@diu.edu.bd               | password123 |
| Teacher | (printed by seed script) | (printed by seed script) | password123 |
| Advisor | (printed by seed script) | (printed by seed script) | password123 |
| Student | 242-15-065  | shuvo242-15-065@diu.edu.bd     | password123 |

Run `npm run seed` and read its console output — it prints the exact
teacher/advisor IDs and emails generated for your database.

(Re-running `npm run seed` wipes and re-inserts the sample data — don't
run it again once you have real data you want to keep.)

---

## 5. Run the app

```bash
npm start
```

Then open **http://localhost:3000** — you'll land on the login page.

For development with auto-restart on file changes:
```bash
npm run dev
```

---

## 6. What each role can do

- **Admin** — full CRUD on Departments, Faculty, Sections, Students,
  Courses, and Enrollments; dashboard with live stats; a **Users**
  page (Students/Teachers/Advisors/Admins tabs) to create logins;
  a **Registrations** page to approve or reject public sign-up
  requests; and an **ID Ranges** page to assign each advisor a
  student-ID range they're allowed to add students into.
- **Teacher** — sees only the courses assigned to them, and the list of
  students enrolled in each course.
- **Advisor** — sees only the section(s) they advise, with capacity
  utilization bars; can add new students but **only within their
  admin-assigned student-ID range**, and can enroll/unenroll their own
  students in courses. Advisors can view clearance status but **cannot
  change it** — that's admin-only.
- **Student** — sees only their own profile, section, faculty advisor,
  clearance status, and the courses they're enrolled in.

Access is enforced on the server: API routes are protected by
`middleware/auth.js`, so calling another role's endpoint directly
returns a `403 Access Denied` JSON response rather than exposing data
(the matching static HTML page also detects this and shows an
"Access Denied" message instead of the page content).

### Public registration & approval flow

Anyone can go to `/register` and submit a request (role, name, ID,
email, password + confirm password). Nothing is created yet — it sits
as **pending** in the database, hashed password and all, until an
admin reviews it on **Registrations**:
- **Approve** creates the real login immediately. For a *student* or
  *admin* request, the ID they typed is used as-is. For a *teacher* or
  *advisor* request, a new Faculty record is created and its
  **auto-generated Faculty ID becomes their real login ID** (faculty
  IDs are numeric and system-assigned, so the ID typed at registration
  is informational only for those two roles — this is shown to the
  admin at approval time).
- **Reject** just marks the request as rejected; nothing is created.

### Advisor ID ranges

On **ID Ranges**, admin assigns each advisor a student-ID range (e.g.
`242-15-065` to `252-15-115`). An advisor can only add a new student
whose ID falls inside one of their assigned ranges — attempting
anything outside it is rejected server-side. An advisor with no range
assigned yet cannot add students at all. Range comparison is a plain
string comparison, so **start and end must be the same length/format**
for it to sort correctly.

---

## 7. Project structure

```
ssms/
├── app.js                  # Express app entry point (serves /api/* + static public/)
├── config/db.js            # MySQL connection pool (XAMPP)
├── database/
│   ├── schema.sql          # Run this in phpMyAdmin
│   └── seed.js             # npm run seed — sample data + demo logins
├── middleware/auth.js       # Session/role guard middleware (returns JSON 401/403)
├── routes/                 # JSON API: auth.js, admin.js, teacher.js, advisor.js, student.js
│                              mounted at /api/auth, /api/admin, /api/teacher, /api/advisor, /api/student
└── public/                 # Plain HTML/CSS/JS frontend — no templating, no build step
    ├── css/style.css       # Vanilla CSS, unchanged
    ├── js/
    │   ├── common.js       # fetch() wrapper, navbar rendering, flash messages, auth guard
    │   └── ...              # one script per page, calls the JSON API and renders the DOM
    ├── login.html / register.html / error.html
    ├── admin/               # dashboard, departments, faculty, sections, students,
    │                          courses, enrollments, users, registrations, advisor-ranges
    ├── teacher/             # dashboard, course-students
    ├── advisor/             # dashboard
    └── student/             # dashboard
```

### How the frontend talks to the backend

Every page loads `/js/common.js` first, which exposes:
- `api(path, options)` — wraps `fetch('/api' + path, ...)`, sends the session
  cookie, parses JSON, and redirects to `/login.html` on a 401.
- `guardPage(roles)` — call at the top of a protected page; renders the
  navbar and redirects/shows "Access Denied" if the session doesn't match.
- `flash(type, message)` — shows a success/error banner (replaces the old
  `connect-flash` + redirect pattern; now it's just a DOM insert after a
  `fetch()` call resolves).

Each page's own script (e.g. `admin-departments.js`) then calls `api(...)`
to load data and builds the table/form HTML with template strings, and
re-fetches after every add/edit/delete so the page updates without a full
reload.

---

## 8. Adding new users for real students/faculty

As **admin**, go to the **Users** page — it's split into four tabs
(**Students / Teachers / Advisors / Admins**) so the (potentially huge)
student list never gets mixed in with staff accounts:
1. First add the person as a Student (under Students) or Faculty member
   (under Faculty) if they don't exist yet — this is where their real
   university ID (e.g. `242-15-065`) and email are set.
2. Then go to **Users**, pick the matching tab, select that student/
   faculty member from the dropdown, set a password, and submit. Their
   ID and email are pulled automatically from the record you just
   created, so login credentials can never drift out of sync.
3. Admin accounts are the one exception — since there's no separate
   "admins" table, you type the ID, name, email, and password directly
   on the Admins tab.

A faculty member can hold a Teacher login and an Advisor login at the
same time (they're separate rows in Users) if they both teach a course
and advise a section.
