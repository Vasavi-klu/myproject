/* ---------------- Shared storage ---------------- */
const DATA_KEY = "peerco_data"; // assignments, submissions, reviews, grades
const USERS_KEY = "peerco_users";
const CURRENT_USER_KEY = "peerco_current_user";

function getData() {
  return JSON.parse(localStorage.getItem(DATA_KEY)) || {
    assignments: [],      // {id, title, subDate, revDate, criteria, status}
    submissions: [],      // {id, assignmentId, student, content, status, createdAt}
    reviews: [],          // {id, submissionId, assignmentId, reviewer, clarity, technical, feedback, critical}
    grades: []            // {id, assignmentId, student, peerAvg, adminScore, finalGrade}
  };
}
function setData(data) { localStorage.setItem(DATA_KEY, JSON.stringify(data)); }
function getUsers() { return JSON.parse(localStorage.getItem(USERS_KEY)) || []; }
function setUsers(users) { localStorage.setItem(USERS_KEY, JSON.stringify(users)); }
function getCurrentUser() { return JSON.parse(localStorage.getItem(CURRENT_USER_KEY)); }
function setCurrentUser(user) { localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user)); }

/* ---------------- ID helper ---------------- */
function uid(prefix="id") { return `${prefix}_${Math.random().toString(36).slice(2,9)}`; }

/* ---------------- DOM Ready ---------------- */
document.addEventListener('DOMContentLoaded', () => {
  // Auth navigation
  document.getElementById('go-login').addEventListener('click', (e) => { e.preventDefault(); showOnly('login-page'); });
  document.getElementById('go-signup').addEventListener('click', (e) => { e.preventDefault(); showOnly('signup-page'); });

  // Auth handlers
  document.getElementById('signup-form').addEventListener('submit', handleSignup);
  document.getElementById('login-form').addEventListener('submit', handleLogin);
  document.querySelectorAll('.logout-btn').forEach(btn => btn.addEventListener('click', handleLogout));

  // Global nav links
  const navLinks = document.querySelectorAll('.nav-link, .clickable-stat, .nav-action-btn');
  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const targetPageId = e.currentTarget.getAttribute('data-page-id');
      if (!targetPageId) return;
      showPage(targetPageId);
      renderAll(); // refresh views on navigation
    });
  });

  // Assignment create
  const assignmentForm = document.getElementById('assignment-form');
  if (assignmentForm) {
    assignmentForm.addEventListener('submit', (e) => {
      e.preventDefault();
      clearAssignmentErrors();
      const error = validateAssignmentForm();
      if (error) {
        document.getElementById('assignment-form-error').textContent = error;
        return;
      }
      createAssignment();
    });
  }

  // Project actions
  const saveBtn = document.getElementById('save-progress-btn');
  const submitBtn = document.getElementById('submit-project-btn');
  if (saveBtn) saveBtn.addEventListener('click', handleSave);
  if (submitBtn) submitBtn.addEventListener('click', handleProjectSubmit);

  // Peer review form
  const peerReviewForm = document.getElementById('peer-review-form');
  if (peerReviewForm) {
    peerReviewForm.addEventListener('submit', (e) => {
      e.preventDefault();
      clearPeerReviewErrors();
      const error = validateReviewForm();
      if (error) {
        document.getElementById('peer-review-form-error').textContent = error;
        return;
      }
      submitPeerReview();
    });
  }

  // Initial UI state
  const current = getCurrentUser();
  if (current) {
    showOnly('app-container');
    const target = current.role === 'admin' ? 'admin-dashboard-page' : 'student-dashboard-page';
    showPage(target);
  } else {
    showOnly('landing-page');
  }

  // Render initial state
  renderAll();
});

/* ---------------- UI helpers ---------------- */
function showOnly(sectionId) {
  ['signup-page','login-page','app-container'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });
  const el = document.getElementById(sectionId);
  if (el) el.style.display = sectionId === 'app-container' ? 'flex' : 'flex';
}

function showPage(targetId) {
  document.querySelectorAll('.page-content').forEach(page => page.classList.remove('active'));
  const targetPage = document.getElementById(targetId);
  if (targetPage) targetPage.classList.add('active');
}

/* ---------------- Auth: Signup & Login ---------------- */
// Username: 8–10 characters, must include at least one special character.
function validateUsername(username) {
  const len = username.length;
  const hasSpecial = /[^A-Za-z0-9]/.test(username);
  if (len < 8 || len > 10) return "Username must be 8–10 characters.";
  if (!hasSpecial) return "Username must include at least one special character.";
  return null;
}
// Password: minimum 6 chars, must include at least one letter and one number.
function validatePassword(password) {
  if (password.length < 6) return "Password must be at least 6 characters.";
  if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
    return "Password must include at least one letter and one number.";
  }
  return null;
}

function clearSignupErrors() {
  ['signup-username-error','signup-password-error','signup-role-error','signup-error']
    .forEach(id => { const el = document.getElementById(id); if (el) el.textContent=''; });
}
function clearLoginErrors() {
  ['login-username-error','login-password-error','login-error']
    .forEach(id => { const el = document.getElementById(id); if (el) el.textContent=''; });
}

function handleSignup(e) {
  e.preventDefault();
  const username = document.getElementById('signup-username').value.trim();
  const password = document.getElementById('signup-password').value.trim();
  const role = document.getElementById('signup-role').value;
  clearSignupErrors();

  const uErr = validateUsername(username);
  if (uErr) { document.getElementById('signup-username-error').textContent = uErr; return; }
  const pErr = validatePassword(password);
  if (pErr) { document.getElementById('signup-password-error').textContent = pErr; return; }
  if (!role) { document.getElementById('signup-role-error').textContent = "Please select a role."; return; }

  const users = getUsers();
  if (users.find(u => u.username.toLowerCase() === username.toLowerCase())) {
    document.getElementById('signup-error').textContent = "Username already exists.";
    return;
  }
  users.push({ id: uid('usr'), username, password, role });
  setUsers(users);

  alert("Signup successful! Please log in.");
  showOnly('login-page');
}

function handleLogin(e) {
  e.preventDefault();
  const username = document.getElementById('login-username').value.trim();
  const password = document.getElementById('login-password').value.trim();
  clearLoginErrors();

  if (!username) { document.getElementById('login-username-error').textContent = "Username is required."; return; }
  if (!password) { document.getElementById('login-password-error').textContent = "Password is required."; return; }

  const users = getUsers();
  const user = users.find(u => u.username.toLowerCase() === username.toLowerCase() && u.password === password);
  if (!user) { document.getElementById('login-error').textContent = "Invalid username or password."; return; }

  setCurrentUser(user);
  showOnly('app-container');
  const dash = user.role === 'admin' ? 'admin-dashboard-page' : 'student-dashboard-page';
  showPage(dash);
  renderAll();
}

function handleLogout() {
  localStorage.removeItem(CURRENT_USER_KEY);
  showOnly('login-page');
  ['login-username','login-password'].forEach(id => { const el = document.getElementById(id); if (el) el.value=''; });
}

/* ---------------- Assignment creation ---------------- */
function clearAssignmentErrors() {
  ['assignment-title-error','submission-deadline-error','review-deadline-error','review-criteria-error','assignment-form-error']
    .forEach(id => { const el = document.getElementById(id); if (el) el.textContent=''; });
}
function validateAssignmentForm() {
  const title = document.getElementById('assignment-title').value.trim();
  const subDate = document.getElementById('submission-deadline').value;
  const revDate = document.getElementById('review-deadline').value;
  const criteria = document.getElementById('review-criteria').value;

  if (title.length < 5) { document.getElementById('assignment-title-error').textContent = "Title must be at least 5 characters."; return "Please fix the errors above."; }
  if (!subDate) { document.getElementById('submission-deadline-error').textContent = "Submission deadline is required."; return "Please fix the errors above."; }
  if (!revDate) { document.getElementById('review-deadline-error').textContent = "Review deadline is required."; return "Please fix the errors above."; }
  if (new Date(subDate) >= new Date(revDate)) { document.getElementById('review-deadline-error').textContent = "Review deadline must be after submission deadline."; return "Please fix the errors above."; }
  if (!criteria) { document.getElementById('review-criteria-error').textContent = "Please select review criteria."; return "Please fix the errors above."; }
  return null;
}
function createAssignment() {
  const data = getData();
  const assignment = {
    id: uid('asmt'),
    title: document.getElementById('assignment-title').value.trim(),
    subDate: document.getElementById('submission-deadline').value,
    revDate: document.getElementById('review-deadline').value,
    criteria: document.getElementById('review-criteria').value,
    status: "Open"
  };
  data.assignments.push(assignment);
  setData(data);
  alert("Assignment created and published to students.");
  showPage('admin-dashboard-page');
  renderAll();
}

/* ---------------- Project save/submit ---------------- */
function handleSave(e) {
  e.preventDefault();
  const code = document.getElementById('code-editor').value;
  alert(`Progress Saved! ${code.length} characters of work secured.`);
}
function handleProjectSubmit(e) {
  e.preventDefault();
  const assignmentId = document.getElementById('project-assignment-select').value;
  const content = document.getElementById('code-editor').value.trim();
  document.getElementById('project-assignment-error').textContent = '';
  document.getElementById('project-content-error').textContent = '';

  if (!assignmentId) { document.getElementById('project-assignment-error').textContent = "Please select an assignment."; return; }
  if (content.length < 20) { document.getElementById('project-content-error').textContent = "Project content must have at least 20 characters."; return; }

  const user = getCurrentUser();
  const data = getData();
  const submission = {
    id: uid('sub'),
    assignmentId,
    student: user.username,
    content,
    status: "Submitted",
    createdAt: new Date().toISOString()
  };
  data.submissions.push(submission);
  setData(data);

  document.getElementById('current-submission-status').innerHTML = 'Submitted and awaiting peer review.';
  alert("Project submitted! Admin and peers can now see it.");
  renderAll();
  showPage('student-my-projects-page');
}

/* ---------------- Peer review ---------------- */
function clearPeerReviewErrors() {
  ['rating-clarity-error','rating-technical-error','overall-feedback-error','critical-suggestions-error','peer-review-form-error']
    .forEach(id => { const el = document.getElementById(id); if (el) el.textContent=''; });
}
function validateReviewForm() {
  const clarity = document.getElementById('rating-clarity').value;
  const technical = document.getElementById('rating-technical').value;
  const feedback = document.getElementById('overall-feedback').value.trim();
  const suggestions = document.getElementById('critical-suggestions').value.trim();

  let hasError = false;
  if (!clarity) { document.getElementById('rating-clarity-error').textContent = "Please select clarity rating."; hasError = true; }
  if (!technical) { document.getElementById('rating-technical-error').textContent = "Please select technical rating."; hasError = true; }
  if (feedback.length < 10) { document.getElementById('overall-feedback-error').textContent = "Feedback must be at least 10 characters."; hasError = true; }
  if (clarity === "1" && suggestions.length < 5) { document.getElementById('critical-suggestions-error').textContent = "Critical suggestions are mandatory for score 1."; hasError = true; }
  return hasError ? "Please fix the errors above." : null;
}
function submitPeerReview() {
  const currentReviewContext = JSON.parse(localStorage.getItem('peerco_review_context'));
  if (!currentReviewContext) { alert("No review context found."); return; }

  const user = getCurrentUser();
  const data = getData();
  const review = {
    id: uid('rev'),
    submissionId: currentReviewContext.submissionId,
    assignmentId: currentReviewContext.assignmentId,
    reviewer: user.username,
    clarity: Number(document.getElementById('rating-clarity').value),
    technical: Number(document.getElementById('rating-technical').value),
    feedback: document.getElementById('overall-feedback').value.trim(),
    critical: document.getElementById('critical-suggestions').value.trim()
  };
  data.reviews.push(review);
  setData(data);

  alert("Review submitted! Admin can now see your review.");
  renderAll();
  showPage('student-pending-review-page');
}

/* ---------------- Review page setup + critical toggle ---------------- */
function checkCriticalReview() {
  const dropdown = document.getElementById('rating-clarity');
  const suggestionBox = document.getElementById('critical-suggestion-box');
  suggestionBox.style.display = (dropdown.value === '1') ? 'block' : 'none';
}

/* ---------------- Rendering functions (connectivity) ---------------- */
function renderAll() {
  renderAdminDashboard();
  renderAdminSubmissionsTable();
  renderAdminReviewsTable();
  renderAdminGradingTable();

  renderStudentDashboard();
  renderStudentAssignmentsTable();
  renderProjectAssignmentSelect();
  renderStudentPendingReviews();
  renderStudentGradesTable();
}

/* Admin renders */
function renderAdminDashboard() {
  const data = getData();
  const listEl = document.getElementById('admin-assignment-list');
  const subEl = document.getElementById('admin-recent-submissions');
  const revEl = document.getElementById('admin-recent-reviews');
  if (!listEl || !subEl || !revEl) return;

  listEl.innerHTML = data.assignments.length
    ? data.assignments.map(a => `<li><strong>${a.title}</strong> — Sub: ${a.subDate} | Rev: ${a.revDate}</li>`).join('')
    : '<li>No assignments yet.</li>';

  const recentSubs = [...data.submissions].slice(-5).reverse();
  subEl.innerHTML = recentSubs.length
    ? recentSubs.map(s => `<li>${s.student} submitted for ${getAssignmentTitle(s.assignmentId)} (${new Date(s.createdAt).toLocaleString()})</li>`).join('')
    : '<li>No submissions yet.</li>';

  const recentRevs = [...data.reviews].slice(-5).reverse();
  revEl.innerHTML = recentRevs.length
    ? recentRevs.map(r => `<li>${r.reviewer} reviewed ${getSubmissionStudent(r.submissionId)} (${getAssignmentTitle(r.assignmentId)})</li>`).join('')
    : '<li>No reviews yet.</li>';
}

function renderAdminSubmissionsTable() {
  const data = getData();
  const tbody = document.getElementById('admin-submissions-table');
  if (!tbody) return;
  tbody.innerHTML = '';

  const rows = data.submissions.map(s => `
    <tr>
      <td>${s.student}</td>
      <td>${getAssignmentTitle(s.assignmentId)}</td>
      <td>${s.status}</td>
      <td>
        <button class="action-btn secondary" onclick="openGradingFor('${s.student}','${s.assignmentId}')">Grade</button>
      </td>
    </tr>
  `);
  tbody.innerHTML = rows.length ? rows.join('') : `<tr><td colspan="4">No submissions yet.</td></tr>`;
}

function renderAdminReviewsTable() {
  const data = getData();
  const tbody = document.getElementById('admin-reviews-table');
  if (!tbody) return;
  tbody.innerHTML = '';

  const rows = data.reviews.map(r => `
    <tr>
      <td>${r.reviewer}</td>
      <td>${getSubmissionStudent(r.submissionId)}</td>
      <td>${getAssignmentTitle(r.assignmentId)}</td>
      <td>${r.clarity}</td>
      <td>${r.technical}</td>
      <td>${escapeHTML(r.feedback)}</td>
    </tr>
  `);
  tbody.innerHTML = rows.length ? rows.join('') : `<tr><td colspan="6">No reviews yet.</td></tr>`;
}

function renderAdminGradingTable() {
  const data = getData();
  const tbody = document.getElementById('admin-grading-table');
  if (!tbody) return;
  tbody.innerHTML = '';

  // Compute peer averages per (student, assignment)
  const groups = {}; // key: student|assignmentId -> {scores:[], assignmentId, student}
  data.reviews.forEach(r => {
    const student = getSubmissionStudent(r.submissionId);
    const key = `${student}|${r.assignmentId}`;
    const avgScore = (Number(r.clarity) + Number(r.technical)) / 2;
    if (!groups[key]) groups[key] = { assignmentId: r.assignmentId, student, scores: [] };
    groups[key].scores.push(avgScore);
  });

  const rows = Object.values(groups).map(g => {
    const peerAvg = g.scores.length ? (g.scores.reduce((a,b)=>a+b,0) / g.scores.length).toFixed(2) : 'N/A';
    const existingGrade = getGradeRecord(g.student, g.assignmentId);
    const adminScore = existingGrade ? existingGrade.adminScore : '';
    const finalGrade = existingGrade ? existingGrade.finalGrade : '';
    return `
      <tr>
        <td>${g.student}</td>
        <td>${getAssignmentTitle(g.assignmentId)}</td>
        <td>${peerAvg}</td>
        <td><input type="number" min="0" max="100" value="${adminScore}" id="grade-admin-${g.student}-${g.assignmentId}" style="width: 80px;" /></td>
        <td><input type="text" value="${finalGrade}" id="grade-final-${g.student}-${g.assignmentId}" placeholder="A/B/C..." style="width: 80px;" /></td>
        <td><button class="action-btn primary" onclick="saveGrade('${g.student}','${g.assignmentId}')">Save</button></td>
      </tr>
    `;
  });

  tbody.innerHTML = rows.length ? rows.join('') : `<tr><td colspan="6">No peer reviews yet.</td></tr>`;
}

/* Student renders */
function renderStudentDashboard() {
  const data = getData();
  const current = getCurrentUser();
  const assignEl = document.getElementById('student-active-assignments');
  const subEl = document.getElementById('student-recent-submissions');
  const gradeEl = document.getElementById('student-recent-grades');
  if (!assignEl || !subEl || !gradeEl) return;

  assignEl.innerHTML = data.assignments.length
    ? data.assignments.map(a => `<li><strong>${a.title}</strong> — Sub: ${a.subDate} | Rev: ${a.revDate}</li>`).join('')
    : '<li>No assignments yet.</li>';

  const mySubs = data.submissions.filter(s => s.student === current?.username).slice(-5).reverse();
  subEl.innerHTML = mySubs.length
    ? mySubs.map(s => `<li>Submitted for ${getAssignmentTitle(s.assignmentId)} (${new Date(s.createdAt).toLocaleString()})</li>`).join('')
    : '<li>No submissions yet.</li>';

  const myGrades = data.grades.filter(g => g.student === current?.username).slice(-5).reverse();
  gradeEl.innerHTML = myGrades.length
    ? myGrades.map(g => `<li>${getAssignmentTitle(g.assignmentId)} — Final Grade: <strong>${g.finalGrade || 'Pending'}</strong></li>`).join('')
    : '<li>No grades yet.</li>';
}

function renderStudentAssignmentsTable() {
  const data = getData();
  const tbody = document.getElementById('student-assignments-table');
  if (!tbody) return;
  tbody.innerHTML = '';

  const rows = data.assignments.map(a => `<tr><td>${a.title}</td><td>${a.subDate}</td><td>${a.revDate}</td><td>${a.status}</td></tr>`);
  tbody.innerHTML = rows.length ? rows.join('') : `<tr><td colspan="4">No assignments yet.</td></tr>`;
}

function renderProjectAssignmentSelect() {
  const data = getData();
  const select = document.getElementById('project-assignment-select');
  if (!select) return;
  select.innerHTML = '<option value="">-- Choose Assignment --</option>' + data.assignments.map(a => `<option value="${a.id}">${a.title}</option>`).join('');
}

function renderStudentPendingReviews() {
  const data = getData();
  const current = getCurrentUser();
  const list = document.getElementById('student-pending-reviews');
  if (!list) return;
  list.innerHTML = '';

  // A student should review others' submissions on same assignments (simple rule: show all except their own)
  const othersSubs = data.submissions.filter(s => s.student !== current?.username);
  if (!othersSubs.length) { list.innerHTML = '<li>No pending reviews.</li>'; return; }

  list.innerHTML = othersSubs.map(s => `
    <li style="padding:8px 0; border-bottom:1px solid #eee;">
      <strong>${s.student}</strong> — ${getAssignmentTitle(s.assignmentId)}
      <button class="action-btn secondary" onclick="openReview('${s.id}')">Start Review</button>
    </li>
  `).join('');
}

function renderStudentGradesTable() {
  const data = getData();
  const current = getCurrentUser();
  const tbody = document.getElementById('student-grades-table');
  if (!tbody) return;
  tbody.innerHTML = '';

  const mySubs = data.submissions.filter(s => s.student === current?.username);
  const rows = mySubs.map(s => {
    const grade = getGradeRecord(s.student, s.assignmentId);
    const peerAvg = computePeerAvgFor(s.student, s.assignmentId);
    return `
      <tr>
        <td>${getAssignmentTitle(s.assignmentId)}</td>
        <td>${s.status}</td>
        <td>${peerAvg ?? 'N/A'}</td>
        <td>${grade?.adminScore ?? 'Pending'}</td>
        <td><strong>${grade?.finalGrade ?? 'Pending'}</strong></td>
      </tr>
    `;
  });
  tbody.innerHTML = rows.length ? rows.join('') : `<tr><td colspan="5">No submissions yet.</td></tr>`;
}

/* ---------------- Actions used by admin pages ---------------- */
function openGradingFor(student, assignmentId) {
  showPage('admin-grading-page');
  renderAdminGradingTable();
  // Focus inputs for quick grading
  const adminInput = document.getElementById(`grade-admin-${student}-${assignmentId}`);
  if (adminInput) adminInput.focus();
}

function saveGrade(student, assignmentId) {
  const adminScoreEl = document.getElementById(`grade-admin-${student}-${assignmentId}`);
  const finalGradeEl = document.getElementById(`grade-final-${student}-${assignmentId}`);
  const adminScore = Number(adminScoreEl?.value || 0);
  const finalGrade = (finalGradeEl?.value || '').trim();

  if (isNaN(adminScore) || adminScore < 0 || adminScore > 100) { alert("Admin score must be between 0 and 100."); return; }
  if (!finalGrade) { alert("Please enter a final grade (A/B/C...)."); return; }

  const data = getData();
  const peerAvg = computePeerAvgFor(student, assignmentId);

  // upsert grade record
  const existing = data.grades.find(g => g.student === student && g.assignmentId === assignmentId);
  if (existing) {
    existing.adminScore = adminScore;
    existing.finalGrade = finalGrade;
    existing.peerAvg = peerAvg;
  } else {
    data.grades.push({
      id: uid('grd'),
      student, assignmentId,
      adminScore, finalGrade, peerAvg
    });
  }
  setData(data);
  alert("Grade saved! Student can now see it.");
  renderAll();
}

/* ---------------- Navigation helpers for review ---------------- */
function openReview(submissionId) {
  const data = getData();
  const sub = data.submissions.find(s => s.id === submissionId);
  if (!sub) { alert("Submission not found."); return; }

  // Store context
  localStorage.setItem('peerco_review_context', JSON.stringify({
    submissionId,
    assignmentId: sub.assignmentId,
    student: sub.student
  }));

  // Populate UI
  document.getElementById('review-project-title').textContent =
    `Review: ${getAssignmentTitle(sub.assignmentId)} for ${sub.student}`;
  document.getElementById('review-project-content').textContent = sub.content;

  // Reset form fields
  document.getElementById('rating-clarity').value = '5';
  document.getElementById('rating-technical').value = '5';
  document.getElementById('overall-feedback').value = '';
  document.getElementById('critical-suggestions').value = '';
  document.getElementById('critical-suggestion-box').style.display = 'none';
  clearPeerReviewErrors();

  showPage('student-review-page');
}

/* ---------------- Utility functions ---------------- */
function getAssignmentTitle(assignmentId) {
  const data = getData();
  return data.assignments.find(a => a.id === assignmentId)?.title || 'Unknown';
}
function getSubmissionStudent(submissionId) {
  const data = getData();
  return data.submissions.find(s => s.id === submissionId)?.student || 'Unknown';
}
function computePeerAvgFor(student, assignmentId) {
  const data = getData();
  const related = data.reviews.filter(r => getSubmissionStudent(r.submissionId) === student && r.assignmentId === assignmentId);
  if (!related.length) return null;
  const avg = related.reduce((sum, r) => sum + (Number(r.clarity) + Number(r.technical)) / 2, 0) / related.length;
  return Number(avg.toFixed(2));
}
function getGradeRecord(student, assignmentId) {
  const data = getData();
  return data.grades.find(g => g.student === student && g.assignmentId === assignmentId);
}
function escapeHTML(str) {
  return (str || '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}
