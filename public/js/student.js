// Student Panel JS
let currentUser = null;
let currentSection = 'courses';
let unreadCount = 0;

document.addEventListener('DOMContentLoaded', init);

async function init() {
  const token = getToken();
  const user = getUser();
  if (!token || !user || user.role !== 'STUDENT') {
    window.location.href = '/login.html';
    return;
  }
  currentUser = user;
  // Refresh user data
  try {
    const me = await api('/auth/me');
    currentUser = me;
    setUser({ id: me._id, name: me.name, email: me.email, role: me.role, groups: me.groups });
  } catch (e) {}

  renderSidebar();
  renderTopbar();
  await loadSection('courses');
  loadUnreadCount();
}

function renderSidebar() {
  const sb = document.getElementById('sidebar');
  sb.innerHTML = `
    <div class="sidebar-header">
      <div class="logo">
        <div class="logo-icon">🎓</div>
        <span class="logo-text">LMS</span>
      </div>
    </div>
    <nav class="sidebar-nav">
      <div class="sidebar-section">
        <div class="sidebar-section-title">Обучение</div>
        <div class="nav-item active" data-section="courses">
          <span class="nav-icon">📚</span><span class="nav-text">Мои курсы</span>
        </div>
        <div class="nav-item" data-section="assignments">
          <span class="nav-icon">📝</span><span class="nav-text">Задания</span>
        </div>
        <div class="nav-item" data-section="grades">
          <span class="nav-icon">📋</span><span class="nav-text">Мои оценки</span>
        </div>
      </div>
    </nav>
    <div class="sidebar-footer">
      <div class="sidebar-user">
        <div class="avatar">${currentUser.name.charAt(0).toUpperCase()}</div>
        <div class="user-info">
          <div class="user-name">${escapeHtml(currentUser.name)}</div>
          <div class="user-role">Студент</div>
        </div>
      </div>
      <button class="logout-btn" onclick="logout()">
        <span class="nav-icon">🚪</span><span class="nav-text">Выйти</span>
      </button>
    </div>`;

  sb.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => loadSection(item.dataset.section));
  });
}

function renderTopbar() {
  const titles = {
    courses: { title: 'Мои курсы', sub: 'Ваши учебные курсы' },
    assignments: { title: 'Задания', sub: 'Текущие задания и тесты' },
    grades: { title: 'Мои оценки', sub: 'Результаты обучения' }
  };
  const t = titles[currentSection] || titles.courses;
  document.getElementById('topbar').innerHTML = `
    <div class="topbar-left">
      <h2>${t.title}</h2>
      <p>${t.sub}</p>
    </div>
    <div class="topbar-right">
      <div style="position:relative">
        <button class="notification-btn" onclick="toggleNotifications()">
          🔔 ${unreadCount > 0 ? `<span class="badge">${unreadCount}</span>` : ''}
        </button>
        <div class="notification-dropdown" id="notifDropdown"></div>
      </div>
    </div>`;
}

async function loadSection(section) {
  currentSection = section;
  document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
  const active = document.querySelector(`.nav-item[data-section="${section}"]`);
  if (active) active.classList.add('active');
  renderTopbar();

  const content = document.getElementById('content');
  content.innerHTML = '<div class="loading"><div class="spinner"></div></div>';

  switch (section) {
    case 'courses': await renderCourses(); break;
    case 'assignments': await renderAssignments(); break;
    case 'grades': await renderGrades(); break;
  }
}

// ===== COURSES =====
async function renderCourses() {
  try {
    const courses = await api('/courses');
    document.getElementById('content').innerHTML = courses.length
      ? `<div class="course-grid">${courses.map(c => `
          <div class="course-card" onclick="openCourse('${c._id}', '${escapeHtml(c.title)}')">
            <div class="course-card-header">
              <h3>${escapeHtml(c.title)}</h3>
              <p>${escapeHtml(c.description || 'Без описания')}</p>
            </div>
            <div class="course-card-body">
              <div class="course-card-stats">
                <div class="course-card-stat"><div class="num">${c.themeCount || 0}</div><div class="label">Тем</div></div>
                <div class="course-card-stat"><div class="num">${c.groupCount || 0}</div><div class="label">Групп</div></div>
              </div>
            </div>
          </div>
        `).join('')}</div>`
      : '<div class="empty-state"><div class="icon">📚</div><h4>Нет доступных курсов</h4><p>Обратитесь к администратору</p></div>';
  } catch (e) {}
}

async function openCourse(courseId, title) {
  const themes = await api('/themes/course/' + courseId);
  document.getElementById('content').innerHTML = `
    <div class="mb-16">
      <button class="btn btn-secondary btn-sm" onclick="renderCourses()">← Назад к курсам</button>
    </div>
    <h2 class="mb-24">${escapeHtml(title)}</h2>
    ${themes.length ? themes.map(t => `
      <div class="card mb-16">
        <div class="card-header" style="cursor:pointer;" onclick="toggleTheme('${t._id}')">
          <h3>${escapeHtml(t.title)}</h3>
          <span class="badge badge-secondary">${t.assignmentCount || 0} заданий</span>
        </div>
        <div class="card-body" id="theme-${t._id}" style="display:none;">
          <div class="loading"><div class="spinner"></div></div>
        </div>
      </div>
    `).join('') : '<div class="empty-state"><p>В этом курсе пока нет тем</p></div>'}`;
}

async function toggleTheme(themeId) {
  const el = document.getElementById('theme-' + themeId);
  if (el.style.display === 'none') {
    el.style.display = 'block';
    const assignments = await api('/assignments?theme=' + themeId);
    const subs = await api('/submissions');

    el.innerHTML = assignments.length ? `<table>
      <thead><tr><th>Задание</th><th>Тип</th><th>Категория</th><th>Дедлайн</th><th>Статус</th><th>Оценка</th><th></th></tr></thead>
      <tbody>
        ${assignments.map(a => {
          const sub = subs.find(s => s.assignment?._id === a._id);
          const status = getAssignmentStatus(a, sub);
          return `<tr>
            <td><strong>${escapeHtml(a.title)}</strong></td>
            <td>${typeBadge(a.type)}</td>
            <td>${escapeHtml(a.category?.name || '—')}</td>
            <td>${isDeadlineSoon(a.deadline) ? '<span class="badge badge-danger">' + formatDateTime(a.deadline) + '</span>' : formatDateTime(a.deadline)}</td>
            <td>${statusBadge(status)}</td>
            <td>${sub?.score !== null && sub?.score !== undefined ? sub.score + '/100' : '—'}</td>
            <td>
              ${canSubmit(a, sub) ? `
                ${a.type === 'TEST'
                  ? `<button class="btn btn-sm btn-primary" onclick="startTest('${a._id}')">Пройти тест</button>`
                  : `<button class="btn btn-sm btn-primary" onclick="showDocSubmit('${a._id}')">Загрузить ответ</button>`
                }` : ''}
              ${a.type === 'DOCUMENT' && a.file ? `<a href="${a.file}" target="_blank" class="btn btn-sm btn-secondary">📎 Файл задания</a>` : ''}
            </td>
          </tr>`;
        }).join('')}
      </tbody>
    </table>` : '<div class="empty-state"><p>Нет заданий в этой теме</p></div>';
  } else {
    el.style.display = 'none';
  }
}

function getAssignmentStatus(assignment, submission) {
  if (submission) return submission.status;
  if (isOverdue(assignment.deadline)) return 'OVERDUE';
  return 'NOT_STARTED';
}

function canSubmit(assignment, submission) {
  if (submission?.status === 'COMPLETED') return false;
  if (submission?.status === 'RETRY') return true;
  if (isOverdue(assignment.deadline) && submission?.status !== 'RETRY') return false;
  return true;
}

// ===== ASSIGNMENTS (all) =====
async function renderAssignments() {
  try {
    const assignments = await api('/assignments');
    const subs = await api('/submissions');

    document.getElementById('content').innerHTML = assignments.length ? `
      <div class="card">
        <div class="card-body no-padding">
          <table>
            <thead><tr><th>Задание</th><th>Тип</th><th>Группа</th><th>Дедлайн</th><th>Статус</th><th>Оценка</th><th></th></tr></thead>
            <tbody>
              ${assignments.map(a => {
                const sub = subs.find(s => s.assignment?._id === a._id);
                const status = getAssignmentStatus(a, sub);
                return `<tr>
                  <td><strong>${escapeHtml(a.title)}</strong></td>
                  <td>${typeBadge(a.type)}</td>
                  <td>${escapeHtml(a.group?.name || '—')}</td>
                  <td>${isOverdue(a.deadline) ? '<span class="badge badge-danger">' + formatDateTime(a.deadline) + '</span>' : isDeadlineSoon(a.deadline) ? '<span class="badge badge-warning">' + formatDateTime(a.deadline) + '</span>' : formatDateTime(a.deadline)}</td>
                  <td>${statusBadge(status)}</td>
                  <td>${sub?.score !== null && sub?.score !== undefined ? sub.score + '/100' : '—'}</td>
                  <td>
                    ${canSubmit(a, sub) ? (a.type === 'TEST'
                      ? `<button class="btn btn-sm btn-primary" onclick="startTest('${a._id}')">Пройти</button>`
                      : `<button class="btn btn-sm btn-primary" onclick="showDocSubmit('${a._id}')">Загрузить</button>`)
                    : ''}
                    ${a.type === 'DOCUMENT' && a.file ? `<a href="${a.file}" target="_blank" class="btn btn-sm btn-secondary">📎</a>` : ''}
                  </td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>` : '<div class="empty-state"><div class="icon">📝</div><h4>Нет доступных заданий</h4></div>';
  } catch (e) {}
}

// ===== GRADES =====
async function renderGrades() {
  try {
    const subs = await api('/submissions');
    const completed = subs.filter(s => s.score !== null);
    const avg = completed.length > 0
      ? Math.round(completed.reduce((s, sub) => s + sub.score, 0) / completed.length)
      : 0;

    document.getElementById('content').innerHTML = `
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon info">⭐</div>
          <div class="stat-details"><h3>${avg}</h3><p>Средний балл</p></div>
        </div>
        <div class="stat-card">
          <div class="stat-icon success">✅</div>
          <div class="stat-details"><h3>${subs.filter(s => s.status === 'COMPLETED').length}</h3><p>Выполнено</p></div>
        </div>
        <div class="stat-card">
          <div class="stat-icon warning">⏳</div>
          <div class="stat-details"><h3>${subs.filter(s => s.status === 'IN_PROGRESS' || s.status === 'RETRY').length}</h3><p>В процессе</p></div>
        </div>
      </div>
      <div class="card">
        <div class="card-header"><h3>Все оценки</h3></div>
        <div class="card-body no-padding">
          ${subs.length ? `<table>
            <thead><tr><th>Задание</th><th>Тип</th><th>Категория</th><th>Статус</th><th>Оценка</th><th>Дата сдачи</th></tr></thead>
            <tbody>
              ${subs.map(s => `<tr>
                <td><strong>${escapeHtml(s.assignment?.title || '—')}</strong></td>
                <td>${typeBadge(s.assignment?.type)}</td>
                <td>${escapeHtml(s.assignment?.category?.name || '—')}</td>
                <td>${statusBadge(s.status)}</td>
                <td>${s.score !== null ? `<span class="badge ${s.score >= 70 ? 'badge-success' : s.score >= 40 ? 'badge-warning' : 'badge-danger'}">${s.score}/100</span>` : '—'}</td>
                <td>${formatDateTime(s.submittedAt)}</td>
              </tr>`).join('')}
            </tbody>
          </table>` : '<div class="empty-state"><p>Пока нет оценок</p></div>'}
        </div>
      </div>`;
  } catch (e) {}
}

// ===== TEST TAKING =====
let testData = null;
let currentQuestion = 0;
let selectedAnswers = {};

async function startTest(assignmentId) {
  try {
    const data = await api('/tests/assignment/' + assignmentId);
    if (!data.questions.length) {
      showToast('В тесте нет вопросов', 'warning');
      return;
    }
    testData = { ...data, assignmentId };
    currentQuestion = 0;
    selectedAnswers = {};
    renderTestQuestion();
  } catch (e) {}
}

function renderTestQuestion() {
  const q = testData.questions[currentQuestion];
  const total = testData.questions.length;
  const progress = Math.round(((currentQuestion + 1) / total) * 100);
  const selected = selectedAnswers[q._id] || [];

  document.getElementById('content').innerHTML = `
    <div class="test-container">
      <div class="test-header">
        <h2>Тестирование</h2>
      </div>
      <div class="test-progress">
        <span>Вопрос ${currentQuestion + 1} из ${total}</span>
        <div class="progress flex-1"><div class="progress-bar" style="width:${progress}%"></div></div>
        <span>${progress}%</span>
      </div>
      <div class="question-card">
        <div class="question-number">Вопрос ${currentQuestion + 1}</div>
        <div class="question-text">${escapeHtml(q.text)}</div>
        ${q.image ? `<img src="${q.image}" class="question-image" alt="">` : ''}
        <div class="question-hint">${q.multiple ? 'Выберите один или несколько ответов' : 'Выберите один ответ'}</div>
        <div class="answers">
          ${q.answers.map(a => {
            const isSelected = selected.includes(a._id);
            return `
              <div class="answer-option ${isSelected ? 'selected' : ''}" onclick="selectAnswer('${q._id}', '${a._id}', ${q.multiple})">
                <div class="check ${q.multiple ? 'checkbox' : ''}">${isSelected ? '✓' : ''}</div>
                <span>${escapeHtml(a.text)}</span>
              </div>`;
          }).join('')}
        </div>
      </div>
      <div class="test-nav">
        <button class="btn btn-secondary" ${currentQuestion === 0 ? 'disabled' : ''} onclick="prevQuestion()">← Назад</button>
        <span class="text-secondary">${Object.keys(selectedAnswers).length} из ${total} отвечено</span>
        ${currentQuestion < total - 1
          ? `<button class="btn btn-primary" onclick="nextQuestion()">Далее →</button>`
          : `<button class="btn btn-success" onclick="submitTest()">Завершить тест</button>`
        }
      </div>
    </div>`;
}

function selectAnswer(questionId, answerId, multiple) {
  if (!selectedAnswers[questionId]) selectedAnswers[questionId] = [];

  if (multiple) {
    const idx = selectedAnswers[questionId].indexOf(answerId);
    if (idx >= 0) {
      selectedAnswers[questionId].splice(idx, 1);
    } else {
      selectedAnswers[questionId].push(answerId);
    }
  } else {
    selectedAnswers[questionId] = [answerId];
  }
  renderTestQuestion();
}

function nextQuestion() {
  if (currentQuestion < testData.questions.length - 1) {
    currentQuestion++;
    renderTestQuestion();
  }
}

function prevQuestion() {
  if (currentQuestion > 0) {
    currentQuestion--;
    renderTestQuestion();
  }
}

async function submitTest() {
  const answered = Object.keys(selectedAnswers).length;
  const total = testData.questions.length;

  if (answered < total) {
    if (!confirm(`Вы ответили на ${answered} из ${total} вопросов. Завершить тест?`)) return;
  }

  const answers = testData.questions.map(q => ({
    question: q._id,
    selected: selectedAnswers[q._id] || []
  }));

  try {
    const result = await api('/submissions/test', {
      method: 'POST',
      body: { assignmentId: testData.assignmentId, answers }
    });

    const scoreClass = result.score >= 70 ? 'good' : result.score >= 40 ? 'ok' : 'bad';

    document.getElementById('content').innerHTML = `
      <div class="test-container">
        <div class="card">
          <div class="card-body">
            <div class="test-result">
              <div class="score-circle ${scoreClass}">
                <div class="number">${result.score}</div>
                <div class="label">баллов</div>
              </div>
              <h2>Тест завершён!</h2>
              <p class="text-secondary mt-8">Правильных ответов: ${result.correct} из ${result.total}</p>
              <div class="mt-24">
                <button class="btn btn-primary" onclick="loadSection('assignments')">К заданиям</button>
                <button class="btn btn-secondary" onclick="loadSection('grades')">Мои оценки</button>
              </div>
            </div>
          </div>
        </div>
      </div>`;
  } catch (e) {}
}

// ===== DOCUMENT SUBMIT =====
function showDocSubmit(assignmentId) {
  openModal('Загрузить ответ', `
    <form id="docSubmitForm">
      <div class="form-group">
        <div class="file-upload" onclick="document.getElementById('subFile').click()">
          <div class="icon">📎</div>
          <p>Нажмите для выбора файла</p>
          <div class="small">PDF, DOC, XLS, PPT (макс. 50 МБ)</div>
          <input type="file" id="subFile" name="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx" required onchange="showFileName(this)">
        </div>
        <div id="selectedFileName"></div>
      </div>
    </form>
  `, async () => {
    const file = document.getElementById('subFile').files[0];
    if (!file) { showToast('Выберите файл', 'warning'); return; }
    const formData = new FormData();
    formData.append('assignmentId', assignmentId);
    formData.append('file', file);

    await api('/submissions/document', { method: 'POST', body: formData });
    showToast('Ответ загружен!', 'success');
    closeModal();
    loadSection(currentSection);
  });
}

function showFileName(input) {
  const div = document.getElementById('selectedFileName');
  if (input.files[0]) {
    div.innerHTML = `<div class="file-name mt-8">📄 ${escapeHtml(input.files[0].name)}</div>`;
  }
}

// ===== NOTIFICATIONS =====
async function loadUnreadCount() {
  try {
    const data = await api('/notifications/unread-count');
    unreadCount = data.count;
    renderTopbar();
  } catch (e) {}
}

async function toggleNotifications() {
  const dd = document.getElementById('notifDropdown');
  if (dd.classList.contains('show')) { dd.classList.remove('show'); return; }
  const notifications = await api('/notifications');
  dd.innerHTML = `
    <div class="notification-dropdown-header">
      <h4>Уведомления</h4>
      <button class="btn btn-sm btn-secondary" onclick="markAllRead()">Прочитать все</button>
    </div>
    ${notifications.length ? notifications.map(n => `
      <div class="notification-item ${n.read ? '' : 'unread'}" onclick="markRead('${n._id}')">
        <div class="title">${escapeHtml(n.title)}</div>
        <div class="message">${escapeHtml(n.message)}</div>
        <div class="time">${timeAgo(n.createdAt)}</div>
      </div>
    `).join('') : '<div class="empty-state" style="padding:24px;"><p>Нет уведомлений</p></div>'}`;
  dd.classList.add('show');
}

async function markRead(id) {
  await api('/notifications/' + id + '/read', { method: 'PUT' });
  loadUnreadCount();
}

async function markAllRead() {
  await api('/notifications/read-all', { method: 'PUT' });
  unreadCount = 0;
  renderTopbar();
  showToast('Все уведомления прочитаны', 'success');
}

// ===== MODAL =====
function openModal(title, content, onSave) {
  const overlay = document.getElementById('modalOverlay');
  const modal = document.getElementById('modal');
  modal.className = 'modal';
  modal.innerHTML = `
    <div class="modal-header">
      <h3>${title}</h3>
      <button class="modal-close" onclick="closeModal()">&times;</button>
    </div>
    <div class="modal-body">${content}</div>
    ${onSave ? `<div class="modal-footer">
      <button class="btn btn-secondary" onclick="closeModal()">Отмена</button>
      <button class="btn btn-primary" id="modalSaveBtn">Отправить</button>
    </div>` : `<div class="modal-footer"><button class="btn btn-secondary" onclick="closeModal()">Закрыть</button></div>`}`;
  overlay.classList.add('active');

  if (onSave) {
    document.getElementById('modalSaveBtn').addEventListener('click', async () => {
      const btn = document.getElementById('modalSaveBtn');
      btn.disabled = true;
      btn.textContent = 'Отправка...';
      try { await onSave(); } catch (e) {
        btn.disabled = false;
        btn.textContent = 'Отправить';
      }
    });
  }
}

function closeModal() {
  document.getElementById('modalOverlay').classList.remove('active');
}

document.getElementById('modalOverlay').addEventListener('click', (e) => {
  if (e.target === e.currentTarget) closeModal();
});

document.addEventListener('click', (e) => {
  const dd = document.getElementById('notifDropdown');
  if (dd && !e.target.closest('.notification-btn') && !e.target.closest('.notification-dropdown')) {
    dd.classList.remove('show');
  }
});

function logout() {
  removeToken();
  window.location.href = '/login.html';
}
