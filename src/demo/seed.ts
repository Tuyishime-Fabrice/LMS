/**
 * Sample academy for demo mode: three people you can sign in as, a handful
 * of learners, four courses, cohorts, sessions, submissions, payments,
 * messages and a certificate. Dates are relative to the moment the demo is
 * first opened, so deadlines and sessions always look current.
 */

export type Row = Record<string, unknown>;
export type Tables = Record<string, Row[]>;

const id = (n: number) => `d0000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

export const DEMO_IDS = {
  student: id(1),
  teacher: id(2),
  admin: id(3),
  teacher2: id(4),
  pendingTeacher: id(5),
};

export const DEMO_PASSWORD = "demo1234";

export const DEMO_ACCOUNTS = [
  { role: "student", email: "aline@dataplus-demo.test", name: "Aline Uwase", id: DEMO_IDS.student },
  { role: "teacher", email: "theo@dataplus-demo.test", name: "Théo Mugisha", id: DEMO_IDS.teacher },
  { role: "admin", email: "admin@dataplus-demo.test", name: "Grace Ingabire", id: DEMO_IDS.admin },
] as const;

export function createSeed(assetBase: string): Tables {
  const now = Date.now();
  const at = (days: number, hour?: number, minute = 0) => {
    const date = new Date(now + days * 86_400_000);
    if (hour !== undefined) date.setHours(hour, minute, 0, 0);
    return date.toISOString();
  };
  const asset = (path: string) => new URL(path, assetBase).href;
  const video = asset("videos/A_group_of_202511231942_dqqwc.mp4");
  const notesPdf = asset("demo/cleaning-data-notes.pdf");
  const avatar = (file: string) => asset(`images/avators/${file}`);

  /* People ------------------------------------------------------------ */
  const person = (n: number, full_name: string, email: string, role: string, extra: Row = {}): Row => ({
    id: id(n), full_name, email, role, avatar_url: null, phone: null,
    onboarding_completed: true, is_suspended: false, suspension_reason: null, pricing_tier: "standard",
    teacher_approved: role === "teacher" ? true : null, teacher_approval_status: role === "teacher" ? "approved" : null,
    teacher_approval_date: role === "teacher" ? at(-120) : null, teacher_approved_by: null, teacher_rejection_reason: null,
    industry: null, interests: null, job_role: null, organization: null,
    created_at: at(-140 + n), updated_at: at(-2), last_login: at(-1), last_activity: at(-(n % 6)),
    ...extra,
  });
  const learners = [
    person(10, "Jean-Paul Habimana", "jeanpaul@dataplus-demo.test", "student", { organization: "Bank teller, Huye" }),
    person(11, "Espérance Mukamana", "esperance@dataplus-demo.test", "student", { pricing_tier: "student" }),
    person(12, "Patrick Nshimiyimana", "patrick@dataplus-demo.test", "student"),
    person(13, "Amina Diallo", "amina@dataplus-demo.test", "student", { organization: "NGO, Dakar" , pricing_tier: "ngo" }),
    person(14, "Fatou Ndiaye", "fatou@dataplus-demo.test", "student"),
    person(15, "Koffi Agbodjan", "koffi@dataplus-demo.test", "student", { is_suspended: true, suspension_reason: "Shared course videos publicly" }),
    person(16, "Eric Niyonzima", "eric@dataplus-demo.test", "student"),
  ];
  const profiles: Row[] = [
    person(1, "Aline Uwase", "aline@dataplus-demo.test", "student", {
      phone: "+250788000101", avatar_url: avatar("woman.webp"), job_role: "Sales assistant", industry: "Retail",
      organization: "Nyabugogo market cooperative", interests: ["Data analysis", "Excel"],
    }),
    person(2, "Théo Mugisha", "theo@dataplus-demo.test", "teacher", { phone: "+250788000102" }),
    person(3, "Grace Ingabire", "admin@dataplus-demo.test", "admin"),
    person(4, "Mariam Uwera", "mariam@dataplus-demo.test", "teacher", { avatar_url: asset("images/uwera.webp") }),
    person(5, "Claudine Uwimana", "claudine@dataplus-demo.test", "teacher", {
      teacher_approved: false, teacher_approval_status: "pending", teacher_approval_date: null,
      organization: "University of Rwanda", job_role: "Statistics lecturer", created_at: at(-2),
    }),
    ...learners,
  ];

  /* Courses ------------------------------------------------------------ */
  const course = (n: number, extra: Row): Row => ({
    id: id(100 + n), thumbnail_url: null, approval_status: "approved", category: "Data & Analytics",
    currency: "RWF", is_featured: false, is_free: false, language: "en", level: "beginner", mode: "Online",
    duration: "8 weeks", requirements: null, scholarship_open: false, scholarship_slots_max: null, scholarship_slots_used: 0,
    early_bird_start: null, early_bird_end: null, early_bird_price: null, early_bird_max_seats: null, early_bird_seats_used: 0,
    pending_update: false, update_notes: null, update_submitted_at: null, last_approved_at: at(-90),
    welcome_video_url: null, whatsapp_group_link: null, whatsapp_link: null, created_at: at(-100 + n), updated_at: at(-3),
    ...extra,
  });
  const excel = course(1, {
    title: "Data Analysis with Excel and Power BI", teacher_id: DEMO_IDS.teacher, price: 50000, is_featured: true,
    summary: "From a messy spreadsheet to a dashboard your manager can read.",
    description: "Learn to clean data, summarise it with pivot tables and build a Power BI dashboard, using real datasets from shops, cooperatives and clinics.",
    learning_outcomes: ["Clean and structure raw data", "Summarise sales with pivot tables", "Build a dashboard that answers a business question"],
    thumbnail_url: asset("images/mainpagepicture.jpg"), whatsapp_group_link: "https://chat.whatsapp.com/",
    mode: "Hybrid (online + Kigali workshops)", scholarship_open: true, scholarship_slots_max: 10, scholarship_slots_used: 3,
  });
  const sql = course(2, {
    title: "SQL for Data Analysts", teacher_id: DEMO_IDS.teacher2, price: 80000, level: "intermediate", duration: "6 weeks",
    summary: "Ask your database the questions your spreadsheet cannot answer.",
    description: "Write SELECT queries, join tables, group and filter results, and turn them into reports.",
    learning_outcomes: ["Write SELECT queries with filters", "Join several tables", "Summarise with GROUP BY"],
    thumbnail_url: asset("images/students.webp"),
    early_bird_start: at(-5), early_bird_end: at(9), early_bird_price: 65000, early_bird_max_seats: 20, early_bird_seats_used: 8,
  });
  const literacy = course(3, {
    title: "Initiation à la culture des données", teacher_id: DEMO_IDS.teacher, price: 0, is_free: true, language: "fr",
    duration: "2 semaines", summary: "Comprendre les données avant de les analyser.",
    description: "Un cours gratuit, en français, pour lire un tableau, repérer une erreur et poser les bonnes questions.",
    learning_outcomes: ["Lire un tableau de données", "Repérer les valeurs manquantes", "Formuler une question d'analyse"],
    thumbnail_url: asset("images/illustration.jpg"),
  });
  const python = course(4, {
    title: "Python pour l'analyse de données", teacher_id: DEMO_IDS.teacher2, price: 90000, language: "fr", level: "intermediate",
    approval_status: "pending", last_approved_at: null, created_at: at(-3),
    summary: "pandas, graphiques et automatisation des rapports.",
    description: "Nouveau cours soumis pour validation : bases de Python, pandas et graphiques.",
  });
  const courses = [excel, sql, literacy, python];

  /* Modules and lessons ------------------------------------------------ */
  const chapters: Row[] = [];
  const lessons: Row[] = [];
  let lessonNo = 200;
  const chapter = (n: number, courseRow: Row, title: string, order: number, description: string | null = null) => {
    const row = { id: id(150 + n), course_id: courseRow.id, title, order_index: order, description, is_preview: order === 0, created_at: at(-90), updated_at: at(-10) };
    chapters.push(row);
    return row;
  };
  const lesson = (chapterRow: Row, title: string, content_type: string, order: number, extra: Row = {}) => {
    const row: Row = {
      id: id(lessonNo++), chapter_id: chapterRow.id, title, content_type, order_index: order,
      content_url: content_type === "video" ? video : content_type === "pdf" ? notesPdf : "",
      file_url: null, duration: content_type === "video" ? 14 : content_type === "pdf" ? 10 : 15,
      description: null, is_preview: false, is_mandatory: true, due_date: null, learning_objectives: null,
      created_at: at(-90), updated_at: at(-10), ...extra,
    };
    lessons.push(row);
    return row;
  };

  const ex1 = chapter(1, excel, "Module 1: Getting your data ready", 0);
  const l1 = lesson(ex1, "Welcome and how this course works", "video", 0, {
    description: "Meet your instructor, see the dashboard you will build, and learn how cohorts, live sessions and the capstone fit together.",
    is_preview: true,
  });
  const l2 = lesson(ex1, "Cleaning data: duplicates, blanks and wrong types", "pdf", 1, {
    description: "Most analysis mistakes come from dirty data. These notes walk through the five checks to run on any new dataset.",
    learning_objectives: ["Find and remove duplicate rows", "Decide what to do with blank cells", "Fix numbers stored as text"],
  });
  const l3 = lesson(ex1, "Quiz: spotting dirty data", "quiz", 2, { description: "Four questions. You need 60% to pass, and you can try again." });
  const l4 = lesson(ex1, "Exercise: clean the shop sales file", "assignment", 3, {
    description: "Download the Nyabugogo shop dataset, clean it using the five checks, and upload your cleaned workbook with a short note on what you changed.",
    due_date: at(-9, 23, 59),
  });
  const ex2 = chapter(2, excel, "Module 2: Summarising with pivot tables", 1);
  const l5 = lesson(ex2, "Pivot tables from scratch", "video", 0, {
    description: "Build a pivot table that shows sales by product and by month, then add filters and a percentage column.",
    learning_objectives: ["Create a pivot table", "Group dates by month", "Show values as % of total"],
  });
  const l6 = lesson(ex2, "Assignment: monthly sales summary", "assignment", 1, {
    description: "Using your cleaned file, produce a one-page summary: total sales per month, the top 5 products and one insight for the shop owner.",
    due_date: at(4, 23, 59),
  });
  const l7 = lesson(ex2, "Quiz: pivot tables", "quiz", 2);
  const ex3 = chapter(3, excel, "Module 3: Dashboards in Power BI", 2);
  const l8 = lesson(ex3, "Your first Power BI dashboard", "video", 0, {
    description: "Import your data, create three visuals and arrange them so the main question is answered at a glance.",
  });
  const l9 = lesson(ex3, "Assignment: dashboard draft", "assignment", 1, { due_date: at(12, 23, 59) });

  const sq1 = chapter(4, sql, "Module 1: Asking questions with SELECT", 0);
  const s1 = lesson(sq1, "SELECT, WHERE and ORDER BY", "video", 0, { is_preview: true });
  const s2 = lesson(sq1, "Quiz: your first queries", "quiz", 1);
  const sq2 = chapter(5, sql, "Module 2: Joining tables", 1);
  const s3 = lesson(sq2, "Joins explained with a clinic database", "pdf", 0);
  const s4 = lesson(sq2, "Assignment: patient visits report", "assignment", 1, { due_date: at(10, 23, 59) });

  const li1 = chapter(6, literacy, "Module 1 : Lire des données", 0);
  const f1 = lesson(li1, "Qu'est-ce qu'une donnée ?", "video", 0, { is_preview: true });
  const f2 = lesson(li1, "Repérer les erreurs dans un tableau", "pdf", 1);
  const f3 = lesson(li1, "Quiz : lire un tableau", "quiz", 2);

  const py1 = chapter(7, python, "Module 1 : Premiers pas", 0);
  lesson(py1, "Installer Python et Jupyter", "video", 0);

  /* Quizzes ------------------------------------------------------------ */
  const q = (n: number, lessonRow: Row, order: number, question_text: string, options: string[], correct: number, explanation: string): Row => ({
    id: id(300 + n), lesson_id: lessonRow.id, order_index: order, points: 1, question_text, explanation,
    options: options.map((text, i) => ({ id: "abcd"[i], text })), correct_answer: "abcd"[correct], created_at: at(-80),
  });
  const lesson_quiz_questions = [
    q(1, l3, 0, "A sales file lists the same receipt number twice with the same amount. What is it most likely to be?",
      ["A refund", "A duplicate row", "Two different customers", "A pivot table"], 1, "Same receipt, same amount: the row was entered twice. Remove one before you total sales."),
    q(2, l3, 1, "The 'Amount' column shows numbers aligned to the left and SUM returns 0. What is wrong?",
      ["The numbers are stored as text", "The column is too narrow", "SUM only works on dates", "Nothing, the total is 0"], 0, "Numbers stored as text are left-aligned and ignored by SUM. Convert them with VALUE or Text to Columns."),
    q(3, l3, 2, "A cell in 'Quantity' is blank. What should you do first?",
      ["Always type 0", "Delete the whole row", "Find out why it is blank", "Copy the value above"], 2, "Blank can mean zero, unknown or forgotten. Check the source before you decide."),
    q(4, l3, 3, "Which check should you run on every new dataset?",
      ["Change the font", "Count rows before and after cleaning", "Sort by colour", "Add a chart"], 1, "Counting rows before and after tells you exactly how much your cleaning changed."),
    q(5, l7, 0, "Which pivot setting shows each product's share of total sales?",
      ["Sum of values", "Show values as % of grand total", "Count of values", "Sort A to Z"], 1, "'% of grand total' divides each value by the total of the whole table."),
    q(6, l7, 1, "You want one column per month. Where do you put the date field?",
      ["Rows", "Values", "Columns", "Filters"], 2, "Fields in Columns spread across the top, one column per item."),
    q(7, s2, 0, "Which clause keeps only the rows you need?", ["SELECT", "WHERE", "ORDER BY", "FROM"], 1, "WHERE filters rows; SELECT chooses columns."),
    q(8, s2, 1, "How do you sort results from largest to smallest amount?", ["ORDER BY amount", "ORDER BY amount DESC", "SORT amount", "GROUP BY amount"], 1, "DESC means descending."),
    q(9, f3, 0, "Dans un tableau, une ligne représente généralement…", ["Une variable", "Une observation", "Un graphique", "Une formule"], 1, "Chaque ligne décrit une observation : une vente, un patient, une visite."),
    q(10, f3, 1, "Une cellule vide signifie toujours zéro.", ["Vrai", "Faux"], 1, "Une cellule vide peut signifier inconnu, oublié ou zéro : il faut vérifier."),
  ];

  /* Capstones ---------------------------------------------------------- */
  const capstone_projects = [
    {
      id: id(400), course_id: excel.id, title: "Capstone: Kigali retail sales dashboard",
      description: "Help a Kigali shop owner decide what to stock next quarter, using a year of sales data.",
      instructions: "Clean the dataset, analyse sales by product, month and branch, build a dashboard, and write a one-page recommendation. Follow the 5-step framework: problem, data, tools, analysis, recommendations.",
      requirements: ["Cleaned dataset", "Power BI dashboard", "One-page recommendation"], due_date: at(25, 23, 59), file_url: null,
      created_at: at(-80), updated_at: at(-10),
    },
    {
      id: id(401), course_id: literacy.id, title: "Projet final : analyser un tableau de la vie courante",
      description: "Choisissez un tableau (dépenses, ventes, présences) et présentez trois constats.",
      instructions: "Décrivez les colonnes, signalez les erreurs trouvées et formulez trois constats.", requirements: ["Tableau", "Trois constats"],
      due_date: at(-20), file_url: null, created_at: at(-60), updated_at: at(-30),
    },
    {
      id: id(402), course_id: sql.id, title: "Capstone: district health reporting", description: "Write the queries behind a monthly district health report.",
      instructions: "Use the clinic database to answer the five questions in the brief.", requirements: ["SQL file", "Report"], due_date: at(30), file_url: null,
      created_at: at(-40), updated_at: at(-10),
    },
  ];

  /* Cohorts and enrolments --------------------------------------------- */
  const cohorts = [
    {
      id: id(500), course_id: excel.id, teacher_id: DEMO_IDS.teacher, name: "Cohort 3: Evening, Kigali", description: "Tuesday and Thursday evenings, with two Saturday workshops.",
      start_date: at(-30), end_date: at(40), is_active: true, max_students: 30, price: 50000, currency: "RWF", requires_payment: true,
      instalment_enabled: true, instalment_count: 2, instalment_deposit_percent: 50, created_at: at(-60), updated_at: at(-30),
    },
    {
      id: id(501), course_id: sql.id, teacher_id: DEMO_IDS.teacher2, name: "Cohort 1: Weekend", description: "Saturday mornings, online.",
      start_date: at(14), end_date: at(56), is_active: true, max_students: 25, price: 80000, currency: "RWF", requires_payment: true,
      instalment_enabled: false, instalment_count: null, instalment_deposit_percent: null, created_at: at(-20), updated_at: at(-20),
    },
  ];
  const enrol = (n: number, student: string, courseRow: Row, extra: Row = {}): Row => ({
    id: id(600 + n), student_id: student, course_id: courseRow.id, enrolled_at: at(-30 + n), progress_percentage: 0, completed: false,
    completion_date: null, final_grade: null, cohort_name: null, cohort_id: null, last_lesson_id: null, last_activity_at: null, ...extra,
  });
  const inCohort = { cohort_id: id(500), cohort_name: "Cohort 3: Evening, Kigali" };
  const course_enrollments = [
    enrol(1, DEMO_IDS.student, excel, { ...inCohort, enrolled_at: at(-31), last_lesson_id: l5.id, last_activity_at: at(-1) }),
    enrol(2, DEMO_IDS.student, literacy, { enrolled_at: at(-60), completed: true, completion_date: at(-18), final_grade: "88", last_lesson_id: f3.id, last_activity_at: at(-18) }),
    enrol(3, id(10), excel, { ...inCohort, last_lesson_id: l6.id, last_activity_at: at(0) }),
    enrol(4, id(11), excel, { ...inCohort, last_lesson_id: l4.id, last_activity_at: at(-3) }),
    enrol(5, id(12), excel, { ...inCohort, last_lesson_id: l2.id, last_activity_at: at(-9) }),
    enrol(6, id(13), excel, { ...inCohort, last_lesson_id: l5.id, last_activity_at: at(-2) }),
    enrol(7, id(14), excel, { ...inCohort }),
    enrol(8, id(16), excel, { ...inCohort, last_lesson_id: l8.id, last_activity_at: at(-1) }),
    enrol(9, id(10), sql, { last_lesson_id: s1.id, last_activity_at: at(-4) }),
    enrol(10, id(13), sql, {}),
    enrol(11, id(11), literacy, { last_lesson_id: f2.id, last_activity_at: at(-5) }),
    enrol(12, id(16), literacy, { completed: true, completion_date: at(-25), last_lesson_id: f3.id }),
  ];

  /* Progress ----------------------------------------------------------- */
  let progressNo = 700;
  const student_lesson_progress: Row[] = [];
  const done = (student: string, lessonRows: Row[], daysAgo = 5) => lessonRows.forEach((row, i) => student_lesson_progress.push({
    id: id(progressNo++), student_id: student, lesson_id: row.id, is_completed: true, last_position: 0,
    started_at: at(-daysAgo - i - 1), completed_at: at(-daysAgo - i),
  }));
  done(DEMO_IDS.student, [l1, l2, l3, l4], 4);
  student_lesson_progress.push({ id: id(progressNo++), student_id: DEMO_IDS.student, lesson_id: l5.id, is_completed: false, last_position: 312, started_at: at(-1), completed_at: null });
  done(DEMO_IDS.student, [f1, f2, f3], 20);
  done(id(10), [l1, l2, l3, l4, l5], 2);
  done(id(11), [l1, l2, l3], 4);
  done(id(12), [l1], 10);
  done(id(13), [l1, l2, l3, l4], 3);
  done(id(16), [l1, l2, l3, l4, l5, l6, l7], 1);
  done(id(10), [s1], 4);
  done(id(11), [f1], 6);
  done(id(16), [f1, f2, f3], 26);

  const attempt = (n: number, student: string, lessonRow: Row, score: number, total: number, daysAgo: number, answers: Row = {}): Row => ({
    id: id(800 + n), student_id: student, lesson_id: lessonRow.id, score, total_points: total, passed: score >= Math.ceil(total * 0.6),
    answers, started_at: at(-daysAgo), submitted_at: at(-daysAgo),
  });
  const student_quiz_attempts = [
    attempt(1, DEMO_IDS.student, l3, 2, 4, 6, { [id(301)]: "b", [id(302)]: "c", [id(303)]: "a", [id(304)]: "b" }),
    attempt(2, DEMO_IDS.student, l3, 4, 4, 5, { [id(301)]: "b", [id(302)]: "a", [id(303)]: "c", [id(304)]: "b" }),
    attempt(3, DEMO_IDS.student, f3, 2, 2, 20, { [id(309)]: "b", [id(310)]: "b" }),
    attempt(4, id(10), l3, 3, 4, 3),
    attempt(5, id(11), l3, 3, 4, 4),
    attempt(6, id(13), l3, 4, 4, 3),
    attempt(7, id(16), l3, 4, 4, 2),
    attempt(8, id(16), l7, 2, 2, 1),
    attempt(9, id(10), s2, 1, 2, 4),
  ];

  /* Submissions -------------------------------------------------------- */
  const submission = (n: number, student: string, lessonRow: Row, daysAgo: number, grade: number | null, feedback: string | null, description: string | null): Row => ({
    id: id(900 + n), student_id: student, lesson_id: lessonRow.id, submitted_at: at(-daysAgo), created_at: at(-daysAgo), updated_at: at(-daysAgo),
    project_links: [`capstone-submissions/${lessonRow.id}/${student}/cleaned-sales.xlsx`], description, grade, feedback,
    graded_at: grade === null ? null : at(-daysAgo + 2),
  });
  const assignment_submissions = [
    submission(1, DEMO_IDS.student, l4, 10, 82, "Good work. You found all the duplicate receipts and fixed the text numbers. Next time, explain in your note why you kept the blank quantities instead of deleting them.", "Removed 14 duplicate rows and converted the Amount column to numbers."),
    submission(2, id(10), l4, 9, 91, "Excellent. Clear note, and you counted rows before and after.", null),
    submission(3, id(11), l4, 8, null, null, "I was not sure about the blank quantities, I left them."),
    submission(4, id(13), l4, 9, 74, "The duplicates are gone, but some amounts are still stored as text. Check column F.", null),
    submission(5, id(16), l4, 12, 95, "Very thorough.", null),
    submission(6, id(10), l6, 1, null, null, "Summary attached, top product is cooking oil."),
    submission(7, id(16), l6, 2, null, null, null),
  ];
  const capstone_submissions = [
    {
      id: id(950), capstone_project_id: id(401), student_id: DEMO_IDS.student, submitted_at: at(-22), grade: 88, graded_at: at(-18), graded_by: DEMO_IDS.teacher,
      feedback: "Très bon travail : constats clairs et bien justifiés.", description: "Tableau des dépenses de la coopérative.", file_url: null, project_links: ["capstone-submissions/demo/projet-final.xlsx"],
    },
    {
      id: id(951), capstone_project_id: id(400), student_id: id(16), submitted_at: at(-1), grade: null, graded_at: null, graded_by: null,
      feedback: null, description: "Dashboard and recommendation attached.", file_url: null, project_links: ["capstone-submissions/demo/dashboard.pbix"],
    },
  ];

  /* Certificates ------------------------------------------------------- */
  const certificates = [
    {
      id: id(1000), student_id: DEMO_IDS.student, course_id: literacy.id, status: "approved", certificate_number: "DPA-2026-000123",
      verification_code: "K7QX4M2P", issued_at: at(-18), approved_at: at(-18), approved_by: null, completion_date: at(-18), issue_source: "auto",
      capstone_grade: 88, grade: "88", certificate_url: null, notes: null, revoked_at: null, revoked_by: null, revoked_reason: null, created_at: at(-18), updated_at: at(-18),
    },
    {
      id: id(1001), student_id: id(16), course_id: literacy.id, status: "approved", certificate_number: "DPA-2026-000117",
      verification_code: "R3MW8TQA", issued_at: at(-25), approved_at: at(-25), approved_by: null, completion_date: at(-25), issue_source: "auto",
      capstone_grade: 92, grade: "92", certificate_url: null, notes: null, revoked_at: null, revoked_by: null, revoked_reason: null, created_at: at(-25), updated_at: at(-25),
    },
  ];
  const course_certificate_rules = [
    { course_id: excel.id, auto_issue: true, min_capstone_grade: 65, require_all_lessons: false, signatory_name: "Théo Mugisha", signatory_title: "Lead instructor", updated_at: at(-30), updated_by: DEMO_IDS.admin },
  ];

  /* Live sessions ------------------------------------------------------ */
  const session = (n: number, courseRow: Row, title: string, start: string, minutes: number, extra: Row = {}): Row => ({
    id: id(1100 + n), course_id: courseRow.id, teacher_id: courseRow.teacher_id, title, scheduled_time: start,
    end_time: new Date(new Date(start).getTime() + minutes * 60_000).toISOString(), description: null,
    meet_link: "https://meet.google.com/", modality: "online", location: null, status: "scheduled", cohort_id: null,
    created_at: at(-20), updated_at: at(-20), ...extra,
  });
  const scheduled_classes = [
    session(1, excel, "Live: cleaning data, your questions", at(-6, 18), 90, { cohort_id: id(500) }),
    session(2, excel, "Live: pivot tables walkthrough", at(1, 18), 90, { cohort_id: id(500), description: "Bring your cleaned shop file. We build the monthly summary together." }),
    session(3, excel, "Workshop: Power BI on your laptop", at(8, 9, 30), 180, {
      cohort_id: id(500), modality: "in_person", meet_link: null, location: "Kigali, Kimihurura (venue details in WhatsApp group)",
      description: "Hands-on workshop. Bring a laptop with Power BI Desktop installed.",
    }),
    session(4, excel, "Live: capstone briefing", at(15, 18), 60, { cohort_id: id(500), modality: "hybrid", location: "Kigali + online" }),
    session(5, sql, "Live: SQL kickoff", at(14, 9), 120, { cohort_id: id(501) }),
    session(6, excel, "Live: dashboards Q&A (moved)", at(3, 18), 60, { cohort_id: id(500), status: "cancelled" }),
  ];

  /* Announcements and notifications ------------------------------------ */
  const teacher_announcements = [
    { id: id(1200), teacher_id: DEMO_IDS.teacher, course_id: excel.id, title: "Module 2 is open", message: "Pivot tables are up. Watch the video before Thursday's live session and bring your cleaned file.", is_active: true, created_at: at(-2), updated_at: at(-2) },
    { id: id(1201), teacher_id: DEMO_IDS.teacher, course_id: excel.id, title: "Workshop venue confirmed", message: "Saturday's Power BI workshop is in Kimihurura. Details are in the WhatsApp group.", is_active: true, created_at: at(-1), updated_at: at(-1) },
    { id: id(1202), teacher_id: DEMO_IDS.teacher2, course_id: sql.id, title: "Welcome to SQL for Data Analysts", message: "Install DB Browser for SQLite before the kickoff.", is_active: true, created_at: at(-4), updated_at: at(-4) },
  ];
  const announcements = [
    { id: id(1300), title: "Scholarships open for the next cohorts", message: "Learners from NGOs and cooperatives can apply for up to 50% off. Apply from any course page.", target_audience: "all", is_active: true, created_by: DEMO_IDS.admin, created_at: at(-3), expires_at: null },
    { id: id(1301), title: "New: AI tutor in every lesson", message: "Open Help inside a lesson and ask the tutor, in English or French.", target_audience: "students", is_active: true, created_by: DEMO_IDS.admin, created_at: at(-1), expires_at: null },
    { id: id(1302), title: "Grading reminder", message: "Please grade submissions within 5 days.", target_audience: "teachers", is_active: true, created_by: DEMO_IDS.admin, created_at: at(-2), expires_at: null },
  ];
  const notification = (n: number, user_id: string, type: string, title: string, body: string, link: string, daysAgo: number, read = false): Row => ({
    id: id(1400 + n), user_id, type, title, body, link, data: {}, read_at: read ? at(-daysAgo) : null, email_status: null, email_sent_at: null, created_at: at(-daysAgo),
  });
  const notifications = [
    notification(1, DEMO_IDS.student, "submission_graded", "Your exercise was graded", "Exercise: clean the shop sales file: 82/100", "/student/assignments", 8),
    notification(2, DEMO_IDS.student, "session_scheduled", "New live session", "Live: pivot tables walkthrough, tomorrow at 18:00", "/student/schedule", 2),
    notification(3, DEMO_IDS.student, "certificate_issued", "Your certificate is ready", "Initiation à la culture des données", "/student/certificates", 18, true),
    notification(4, DEMO_IDS.teacher, "new_submission", "New submission", "Jean-Paul Habimana submitted Assignment: monthly sales summary", "/teacher/assignments", 1),
    notification(5, DEMO_IDS.teacher, "new_submission", "New capstone", "Eric Niyonzima submitted the capstone", "/teacher/assignments", 1),
  ];

  /* Messages ----------------------------------------------------------- */
  const conversations = [
    { id: id(1500), student_id: DEMO_IDS.student, teacher_id: DEMO_IDS.teacher, created_at: at(-12), updated_at: at(-1) },
    { id: id(1501), student_id: id(10), teacher_id: DEMO_IDS.teacher, created_at: at(-5), updated_at: at(-0.2) },
    { id: id(1502), student_id: id(11), teacher_id: DEMO_IDS.teacher, created_at: at(-4), updated_at: at(-3) },
  ];
  let messageNo = 1600;
  const message = (conversation: number, sender: string, text: string, daysAgo: number, read = true): Row => ({
    id: id(messageNo++), conversation_id: id(conversation), sender_id: sender, message_text: text, created_at: at(-daysAgo), is_read: read, is_edited: false, edited_at: null,
  });
  const direct_messages = [
    message(1500, DEMO_IDS.student, "Bonjour Théo, for the cleaning exercise, should I delete rows with a blank quantity?", 11),
    message(1500, DEMO_IDS.teacher, "Good question. Don't delete them yet: check the receipt first. If the sale happened, the quantity is missing, not zero.", 11),
    message(1500, DEMO_IDS.student, "[Data Analysis with Excel and Power BI › Pivot tables from scratch]\nCan I use the cleaned file from Module 1 for the pivot table?", 1.2),
    message(1500, DEMO_IDS.teacher, "Yes, that's the idea. Use your cleaned file so your totals are right. See you Thursday!", 1, false),
    message(1501, id(10), "I submitted the monthly summary. Is one insight enough?", 0.3, false),
    message(1501, id(10), "Also, the top product is cooking oil, by far.", 0.2, false),
    message(1502, id(11), "Sorry, my submission is late, I had no electricity at home this week.", 3),
    message(1502, DEMO_IDS.teacher, "No problem, it is accepted. Take care.", 3),
  ];

  /* Payments ----------------------------------------------------------- */
  const payment = (n: number, student: string, courseRow: Row | null, amount: number, status: string, daysAgo: number, extra: Row = {}): Row => ({
    id: id(1700 + n), student_id: student, course_id: courseRow?.id ?? null, bundle_id: null, amount, original_amount: amount, discount_amount: 0,
    currency: "RWF", status, payment_method: "MTN_MOMO_RWA", payment_provider: "xentripay", payment_track: "full",
    reference_id: `DP-DEMO-${String(4000 + n)}`, provider_ref_id: null, transaction_id: status === "success" ? `MP${9100000 + n}` : null,
    payer_email: null, payer_phone: "07880001" + String(n).padStart(2, "0"), coupon_id: null, cohort_id: null, callback_data: null,
    instalment_enrollment_id: null, instalment_schedule_id: null, created_at: at(-daysAgo), updated_at: at(-daysAgo),
    ...extra,
  });
  const payments = [
    payment(1, DEMO_IDS.student, excel, 25000, "success", 31, { payment_track: "instalment", cohort_id: id(500), instalment_enrollment_id: id(1800), instalment_schedule_id: id(1850) }),
    payment(2, id(10), excel, 50000, "success", 30, { cohort_id: id(500) }),
    payment(3, id(11), excel, 25000, "success", 29, { payment_track: "scholarship", original_amount: 50000, discount_amount: 25000 }),
    payment(4, id(12), excel, 45000, "success", 28, { coupon_id: id(1900), original_amount: 50000, discount_amount: 5000 }),
    payment(5, id(13), excel, 50000, "success", 27, { payment_method: "card_cc" }),
    payment(6, id(10), sql, 65000, "success", 4, { payment_track: "early_bird", original_amount: 80000, discount_amount: 15000 }),
    payment(7, id(12), sql, 80000, "pending", 0.1),
    payment(8, id(14), sql, 80000, "failed", 2),
    payment(9, id(13), sql, 65000, "success", 3, { payment_track: "early_bird", original_amount: 80000, discount_amount: 15000 }),
  ];
  const course_instalment_plans = [
    { id: id(1810), course_id: excel.id, instalment_count: 2, deposit_percent: 50, grace_days: 5, is_active: true, created_at: at(-60), updated_at: at(-60) },
  ];
  const student_instalment_enrollments = [
    { id: id(1800), student_id: DEMO_IDS.student, course_id: excel.id, cohort_id: id(500), plan_id: id(1810), total_amount: 50000, currency: "RWF", status: "active", created_at: at(-31), updated_at: at(-31) },
  ];
  const instalment_schedules = [
    { id: id(1850), enrollment_id: id(1800), instalment_number: 1, amount: 25000, due_date: at(-31), status: "paid", paid_at: at(-31), payment_id: id(1701), created_at: at(-31) },
    { id: id(1851), enrollment_id: id(1800), instalment_number: 2, amount: 25000, due_date: at(6), status: "pending", paid_at: null, payment_id: null, created_at: at(-31) },
  ];

  /* Catalogue extras --------------------------------------------------- */
  const course_bundles = [
    {
      id: id(1950), title: "Data Analyst Starter Pack", description: "Excel and Power BI plus SQL: the two skills employers ask for most.",
      bundle_price: 110000, original_price: 130000, currency: "RWF", is_active: true, thumbnail_url: asset("images/student.webp"),
      created_by: DEMO_IDS.admin, created_at: at(-40), updated_at: at(-40),
    },
  ];
  const bundle_courses = [
    { id: id(1960), bundle_id: id(1950), course_id: excel.id },
    { id: id(1961), bundle_id: id(1950), course_id: sql.id },
  ];
  const coupons = [
    {
      id: id(1900), code: "WELCOME5000", description: "Welcome discount", discount_type: "fixed", discount_value: 5000, currency: "RWF",
      coupon_type: "promo", applies_to: "all", course_id: null, bundle_id: null, is_active: true, max_uses: 100, max_uses_per_user: 1, uses_count: 14,
      min_purchase_amount: null, valid_from: at(-30), valid_until: at(30), created_by: DEMO_IDS.admin, created_at: at(-30), updated_at: at(-30),
    },
    {
      id: id(1901), code: "COOP20", description: "Cooperatives partner discount", discount_type: "percent", discount_value: 20, currency: "RWF",
      coupon_type: "partner", applies_to: "course", course_id: excel.id, bundle_id: null, is_active: true, max_uses: 40, max_uses_per_user: 1, uses_count: 6,
      min_purchase_amount: null, valid_from: at(-10), valid_until: null, created_by: DEMO_IDS.admin, created_at: at(-10), updated_at: at(-10),
    },
  ];
  const course_price_tiers = [
    { id: id(1970), course_id: excel.id, tier_code: "student", label: "Students", price: 35000, currency: "RWF", is_active: true, created_at: at(-50), updated_at: at(-50) },
    { id: id(1971), course_id: excel.id, tier_code: "ngo", label: "NGO staff", price: 40000, currency: "RWF", is_active: true, created_at: at(-50), updated_at: at(-50) },
  ];
  const scholarship_applications = [
    {
      id: id(1980), student_id: id(11), course_id: sql.id, full_name: "Espérance Mukamana", email: "esperance@dataplus-demo.test", phone: "+250788000111",
      organisation: "University student", income_band: "under_50k", motivation: "I want to analyse the health data from my internship at a district hospital.",
      document_url: null, status: "pending", scholarship_level: null, discount_percent: null, discount_fixed: null, generated_code: null, coupon_id: null,
      admin_notes: null, reviewed_at: null, reviewed_by: null, created_at: at(-2), updated_at: at(-2),
    },
    {
      id: id(1981), student_id: id(13), course_id: excel.id, full_name: "Amina Diallo", email: "amina@dataplus-demo.test", phone: "+221770000113",
      organisation: "NGO, Dakar", income_band: "50k_150k", motivation: "Our NGO tracks school attendance in spreadsheets and needs better reports.",
      document_url: null, status: "approved", scholarship_level: "partial", discount_percent: 50, discount_fixed: null, generated_code: "SCH-AMINA-50", coupon_id: null,
      admin_notes: "Strong case, NGO partner.", reviewed_at: at(-35), reviewed_by: DEMO_IDS.admin, created_at: at(-40), updated_at: at(-35),
    },
  ];
  const cohort_join_requests = [
    { id: id(1990), cohort_id: id(501), student_id: id(14), status: "pending", message: "I would like to join the weekend cohort.", payment_track: "full", created_at: at(-1), updated_at: at(-1) },
  ];
  const testimonials = [
    {
      id: id(2000), student_name: "Jean-Paul Habimana", profession: "Bank teller, Huye", course_name: "Data Analysis with Excel and Power BI",
      testimonial_text: "I now build the branch's weekly report myself. What took a day takes an hour.", career_impact: "Promoted to reporting officer",
      programs_participated: ["Data Analysis with Excel and Power BI"], rating: 5, student_image_url: avatar("1.webp"), is_featured: true, display_order: 1,
      created_by: DEMO_IDS.admin, created_at: at(-40), updated_at: at(-40),
    },
    {
      id: id(2001), student_name: "Amina Diallo", profession: "Programme officer, Dakar", course_name: "Data Analysis with Excel and Power BI",
      testimonial_text: "Les cours en français et les exemples africains font toute la différence.", career_impact: "Built our NGO's first dashboard",
      programs_participated: ["Data Analysis with Excel and Power BI"], rating: 5, student_image_url: avatar("5.webp"), is_featured: true, display_order: 2,
      created_by: DEMO_IDS.admin, created_at: at(-35), updated_at: at(-35),
    },
    {
      id: id(2002), student_name: "Eric Niyonzima", profession: "Data clerk, Musanze", course_name: "Initiation à la culture des données",
      testimonial_text: "The capstone forced me to work on real data. It is the project I show in interviews.", career_impact: "New job as data clerk",
      programs_participated: ["Initiation à la culture des données"], rating: 4, student_image_url: avatar("7.webp"), is_featured: true, display_order: 3,
      created_by: DEMO_IDS.admin, created_at: at(-30), updated_at: at(-30),
    },
  ];
  const exhibition_projects = [
    {
      id: id(2100), student_name: "Eric Niyonzima", project_title: "What should a Kigali shop stock next quarter?", course_name: "Data Analysis with Excel and Power BI",
      course_score: 95, project_description: "A dashboard of one year of sales across three branches, with a stocking recommendation.",
      problem_definition: "The owner restocks by habit and runs out of the best sellers every December.",
      data_evidence: "12 months of receipts, 3 branches, 18,000 rows after cleaning.", tools_methods: "Excel for cleaning, Power BI for the dashboard.",
      analysis: "Cooking oil and rice make 41% of sales; December demand is 1.8 times the monthly average.",
      recommendations: "Double December orders for the top 5 products and move slow sellers to the central branch.",
      technologies: ["Excel", "Power BI"], achievements: ["Adopted by the shop owner"], project_link: null, student_image_url: avatar("7.webp"),
      is_featured: true, display_order: 1, created_at: at(-20),
    },
    {
      id: id(2101), student_name: "Amina Diallo", project_title: "Suivi de l'assiduité scolaire", course_name: "Data Analysis with Excel and Power BI",
      course_score: 89, project_description: "Un tableau de bord de l'assiduité dans 12 écoles partenaires.",
      problem_definition: "L'ONG ne savait pas quelles écoles décrochaient avant la fin du trimestre.", data_evidence: "Registres de présence de 12 écoles, 2 trimestres.",
      tools_methods: "Excel, Power BI.", analysis: "Trois écoles concentrent 60 % des absences, surtout le lundi.",
      recommendations: "Visites ciblées le lundi dans les trois écoles concernées.", technologies: ["Excel", "Power BI"], achievements: [],
      project_link: null, student_image_url: avatar("5.webp"), is_featured: true, display_order: 2, created_at: at(-15),
    },
  ];
  const partner_requests = [
    { id: id(2200), name: "Jeanne Mukeshimana", email: "jeanne@coop-demo.test", phone: "+250788000300", organization: "Umurage farmers' cooperative", message: "We would like to train 20 members to manage harvest records.", status: "pending", admin_notes: null, reviewed_at: null, reviewed_by: null, created_at: at(-2), updated_at: at(-2) },
    { id: id(2201), name: "Moussa Traoré", email: "moussa@ong-demo.test", phone: "+223700000301", organization: "ONG Savoir Plus, Bamako", message: "Formation en français pour notre équipe de suivi-évaluation ?", status: "contacted", admin_notes: "Call scheduled.", reviewed_at: at(-5), reviewed_by: DEMO_IDS.admin, created_at: at(-9), updated_at: at(-5) },
  ];
  const activity_logs = [
    { id: id(2300), user_id: DEMO_IDS.admin, action: "teacher_approved", entity_type: "profile", entity_id: DEMO_IDS.teacher2, details: {}, ip_address: null, user_agent: null, created_at: at(-50) },
    { id: id(2301), user_id: DEMO_IDS.admin, action: "user_suspended", entity_type: "profile", entity_id: id(15), details: { reason: "Shared course videos publicly" }, ip_address: null, user_agent: null, created_at: at(-7) },
    { id: id(2302), user_id: DEMO_IDS.teacher, action: "course_updated", entity_type: "course", entity_id: excel.id, details: {}, ip_address: null, user_agent: null, created_at: at(-3) },
    { id: id(2303), user_id: DEMO_IDS.student, action: "login", entity_type: null, entity_id: null, details: {}, ip_address: null, user_agent: null, created_at: at(-1) },
  ];
  const system_settings = [
    { id: id(2400), key: "site_name", value: JSON.stringify("DataPlus Academy"), description: "Site name", updated_at: at(-30), updated_by: DEMO_IDS.admin },
    { id: id(2401), key: "require_teacher_approval", value: JSON.stringify(true), description: "", updated_at: at(-30), updated_by: DEMO_IDS.admin },
    { id: id(2402), key: "require_course_approval", value: JSON.stringify(true), description: "", updated_at: at(-30), updated_by: DEMO_IDS.admin },
    { id: id(2403), key: "maintenance_mode", value: JSON.stringify(false), description: "", updated_at: at(-30), updated_by: DEMO_IDS.admin },
  ];

  return {
    profiles, courses, course_chapters: chapters, course_lessons: lessons, lesson_quiz_questions, capstone_projects, cohorts,
    course_enrollments, student_lesson_progress, student_quiz_attempts, assignment_submissions, capstone_submissions,
    certificates, course_certificate_rules, scheduled_classes, teacher_announcements, announcements, announcement_reads: [],
    notifications, notification_preferences: [], conversations, direct_messages, payments, course_instalment_plans,
    student_instalment_enrollments, instalment_schedules, course_bundles, bundle_courses, coupons, coupon_redemptions: [],
    course_price_tiers, scholarship_applications, cohort_join_requests, testimonials, exhibition_projects, partner_requests,
    activity_logs, system_settings, tutor_messages: [], course_approvals: [], course_update_history: [], course_materials: [],
    group_chats: [], group_members: [], chat_messages: [], message_reactions: [], message_read_receipts: [],
  };
}
