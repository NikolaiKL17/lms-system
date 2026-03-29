// Admin Panel JS
let currentUser = null;
let currentSection = 'dashboard';
let unreadCount = 0;

// Cache
let coursesCache = [];
let categoriesCache = [];
let groupsCache = [];

document.addEventListener('DOMContentLoaded', init);

async function init() {
  const token = getToken();
  const user = getUser();
  if (!token || !user || user.role !== 'ADMIN') {
    window.location.href = '/login.html';
    return;
  }
  currentUser = user;
  renderSidebar();
  renderTopbar();
  await loadSection('dashboard');
  loadUnreadCount();
}

function renderSidebar() {
  const sb = document.getElementById('sidebar');
  sb.innerHTML = `
    <div class="sidebar-header">
      <div class="logo">
        <div class="logo-icon">🎓</div>
        <span class="logo-text">LMS Admin</span>
      </div>
    </div>
    <nav class="sidebar-nav">
      <div class="sidebar-section">
        <div class="sidebar-section-title">Главное</div>
        <div class="nav-item active" data-section="dashboard">
          <span class="nav-icon">📊</span><span class="nav-text">Дашборд</span>
        </div>
      </div>
      <div class="sidebar-section">
        <div class="sidebar-section-title">Обучение</div>
        <div class="nav-item" data-section="courses">
          <span class="nav-icon">📚</span><span class="nav-text">Курсы</span>
        </div>
        <div class="nav-item" data-section="themes">
          <span class="nav-icon">📖</span><span class="nav-text">Темы</span>
        </div>
        <div class="nav-item" data-section="assignments">
          <span class="nav-icon">📝</span><span class="nav-text">Задания</span>
        </div>
        <div class="nav-item" data-section="categories">
          <span class="nav-icon">🏷️</span><span class="nav-text">Категории</span>
        </div>
      </div>
      <div class="sidebar-section">
        <div class="sidebar-section-title">Участники</div>
        <div class="nav-item" data-section="groups">
          <span class="nav-icon">👥</span><span class="nav-text">Группы</span>
        </div>
        <div class="nav-item" data-section="students">
          <span class="nav-icon">🎓</span><span class="nav-text">Студенты</span>
        </div>
      </div>
      <div class="sidebar-section">
        <div class="sidebar-section-title">Оценки</div>
        <div class="nav-item" data-section="grades">
          <span class="nav-icon">📋</span><span class="nav-text">Оценки</span>
        </div>
      </div>
    </nav>
    <div class="sidebar-footer">
      <div class="sidebar-user">
        <div class="avatar">${currentUser.name.charAt(0).toUpperCase()}</div>
        <div class="user-info">
          <div class="user-name">${escapeHtml(currentUser.name)}</div>
          <div class="user-role">Администратор</div>
        </div>
      </div>
      <button class="logout-btn" onclick="logout()">
        <span class="nav-icon">🚪</span><span class="nav-text">Выйти</span>
      </button>
    </div>`;

  sb.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => {
      const section = item.dataset.section;
      loadSection(section);
    });
  });
}

function renderTopbar() {
  const titles = {
    dashboard: { title: 'Дашборд', sub: 'Общая статистика системы' },
    courses: { title: 'Курсы', sub: 'Управление учебными курсами' },
    themes: { title: 'Темы', sub: 'Темы курсов' },
    assignments: { title: 'Задания', sub: 'Управление заданиями и тестами' },
    categories: { title: 'Категории', sub: 'Типы заданий' },
    groups: { title: 'Группы', sub: 'Учебные группы' },
    students: { title: 'Студенты', sub: 'Управление студентами' },
    grades: { title: 'Оценки', sub: 'Просмотр и изменение оценок' }
  };
  const t = titles[currentSection] || titles.dashboard;
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
    case 'dashboard': await renderDashboard(); break;
    case 'courses': await renderCourses(); break;
    case 'themes': await renderThemes(); break;
    case 'assignments': await renderAssignments(); break;
    case 'categories': await renderCategories(); break;
    case 'groups': await renderGroups(); break;
    case 'students': await renderStudents(); break;
    case 'grades': await renderGrades(); break;
  }
}

// ===== DASHBOARD =====
async function renderDashboard() {
  try {
    const stats = await api('/dashboard/stats');
    document.getElementById('content').innerHTML = `
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon primary">👨‍🎓</div>
          <div class="stat-details"><h3>${stats.totalStudents}</h3><p>Студентов</p></div>
        </div>
        <div class="stat-card">
          <div class="stat-icon success">📚</div>
          <div class="stat-details"><h3>${stats.totalCourses}</h3><p>Курсов</p></div>
        </div>
        <div class="stat-card">
          <div class="stat-icon warning">📝</div>
          <div class="stat-details"><h3>${stats.totalAssignments}</h3><p>Заданий</p></div>
        </div>
        <div class="stat-card">
          <div class="stat-icon info">⭐</div>
          <div class="stat-details"><h3>${stats.avgScore}</h3><p>Средний балл</p></div>
        </div>
      </div>
      <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 20px;">
        <div class="card">
          <div class="card-header"><h3>Последние работы</h3></div>
          <div class="card-body no-padding">
            ${stats.recentSubmissions.length ? `
            <table>
              <thead><tr><th>Студент</th><th>Задание</th><th>Оценка</th><th>Когда</th></tr></thead>
              <tbody>
                ${stats.recentSubmissions.map(s => `<tr>
                  <td>${escapeHtml(s.student?.name || '—')}</td>
                  <td>${escapeHtml(s.assignment?.title || '—')}</td>
                  <td>${s.score !== null ? s.score + '/100' : '—'}</td>
                  <td>${timeAgo(s.submittedAt)}</td>
                </tr>`).join('')}
              </tbody>
            </table>` : '<div class="empty-state"><p>Нет работ</p></div>'}
          </div>
        </div>
        <div class="card">
          <div class="card-header"><h3>Ближайшие дедлайны</h3></div>
          <div class="card-body no-padding">
            ${stats.upcomingDeadlines.length ? `
            <table>
              <thead><tr><th>Задание</th><th>Группа</th><th>Дедлайн</th></tr></thead>
              <tbody>
                ${stats.upcomingDeadlines.map(a => `<tr>
                  <td>${escapeHtml(a.title || '')}</td>
                  <td>${escapeHtml(a.group?.name || '—')}</td>
                  <td>${isDeadlineSoon(a.deadline) ? '<span class="badge badge-danger">' + formatDateTime(a.deadline) + '</span>' : formatDateTime(a.deadline)}</td>
                </tr>`).join('')}
              </tbody>
            </table>` : '<div class="empty-state"><p>Нет активных дедлайнов</p></div>'}
          </div>
        </div>
      </div>`;
  } catch (e) {
    document.getElementById('content').innerHTML = '<div class="alert alert-danger">Ошибка загрузки дашборда</div>';
  }
}

// ===== COURSES =====
async function renderCourses() {
  try {
    const courses = await api('/courses');
    coursesCache = courses;
    document.getElementById('content').innerHTML = `
      <div class="card">
        <div class="card-header">
          <h3>Все курсы (${courses.length})</h3>
          <button class="btn btn-primary" onclick="showCourseModal()">+ Добавить курс</button>
        </div>
        <div class="card-body no-padding">
          ${courses.length ? `<div class="table-wrapper"><table>
            <thead><tr><th>Название</th><th>Описание</th><th>Групп</th><th>Тем</th><th>Создан</th><th>Действия</th></tr></thead>
            <tbody>
              ${courses.map(c => `<tr>
                <td><strong>${escapeHtml(c.title)}</strong></td>
                <td class="text-secondary truncate" style="max-width:250px">${escapeHtml(c.description || '—')}</td>
                <td>${c.groupCount || 0}</td>
                <td>${c.themeCount || 0}</td>
                <td>${formatDate(c.createdAt)}</td>
                <td>
                  <div class="btn-group">
                    <button class="btn btn-sm btn-secondary" onclick="showCourseModal('${c._id}')">✏️</button>
                    <button class="btn btn-sm btn-danger" onclick="deleteCourse('${c._id}')">🗑️</button>
                  </div>
                </td>
              </tr>`).join('')}
            </tbody>
          </table></div>` : '<div class="empty-state"><div class="icon">📚</div><h4>Нет курсов</h4><p>Создайте первый курс</p></div>'}
        </div>
      </div>`;
  } catch (e) {}
}

function showCourseModal(id) {
  const course = id ? coursesCache.find(c => c._id === id) : null;
  openModal(course ? 'Редактировать курс' : 'Новый курс', `
    <form id="courseForm">
      <div class="form-group">
        <label>Название курса *</label>
        <input type="text" class="form-control" name="title" value="${escapeHtml(course?.title || '')}" required>
      </div>
      <div class="form-group">
        <label>Описание</label>
        <textarea class="form-control" name="description">${escapeHtml(course?.description || '')}</textarea>
      </div>
    </form>
  `, async () => {
    const form = document.getElementById('courseForm');
    const data = { title: form.title.value, description: form.description.value };
    if (id) {
      await api('/courses/' + id, { method: 'PUT', body: data });
      showToast('Курс обновлён', 'success');
    } else {
      await api('/courses', { method: 'POST', body: data });
      showToast('Курс создан', 'success');
    }
    closeModal();
    renderCourses();
  });
}

async function deleteCourse(id) {
  if (!confirm('Удалить курс и все его данные?')) return;
  await api('/courses/' + id, { method: 'DELETE' });
  showToast('Курс удалён', 'success');
  renderCourses();
}

// ===== THEMES =====
async function renderThemes() {
  if (!coursesCache.length) coursesCache = await api('/courses');
  const content = document.getElementById('content');
  
  content.innerHTML = `
    <div class="filter-bar">
      <select class="form-control" id="themeCourseFilter" onchange="loadThemesForCourse()">
        <option value="">— Выберите курс —</option>
        ${coursesCache.map(c => `<option value="${c._id}">${escapeHtml(c.title)}</option>`).join('')}
      </select>
      <button class="btn btn-primary" onclick="showThemeModal()" id="addThemeBtn" disabled>+ Добавить тему</button>
    </div>
    <div id="themesContent"><div class="empty-state"><div class="icon">📖</div><h4>Выберите курс</h4></div></div>`;
}

async function loadThemesForCourse() {
  const courseId = document.getElementById('themeCourseFilter').value;
  const btn = document.getElementById('addThemeBtn');
  if (!courseId) {
    btn.disabled = true;
    document.getElementById('themesContent').innerHTML = '<div class="empty-state"><div class="icon">📖</div><h4>Выберите курс</h4></div>';
    return;
  }
  btn.disabled = false;
  const themes = await api('/themes/course/' + courseId);
  document.getElementById('themesContent').innerHTML = `
    <div class="card">
      <div class="card-body no-padding">
        ${themes.length ? `<table>
          <thead><tr><th>Название</th><th>Описание</th><th>Заданий</th><th>Действия</th></tr></thead>
          <tbody>
            ${themes.map(t => `<tr>
              <td><strong>${escapeHtml(t.title)}</strong></td>
              <td class="text-secondary">${escapeHtml(t.description || '—')}</td>
              <td>${t.assignmentCount || 0}</td>
              <td>
                <div class="btn-group">
                  <button class="btn btn-sm btn-secondary" onclick="showThemeModal('${t._id}', '${escapeHtml(t.title)}', '${escapeHtml(t.description || '')}')">✏️</button>
                  <button class="btn btn-sm btn-danger" onclick="deleteTheme('${t._id}')">🗑️</button>
                </div>
              </td>
            </tr>`).join('')}
          </tbody>
        </table>` : '<div class="empty-state"><p>Нет тем в этом курсе</p></div>'}
      </div>
    </div>`;
}

function showThemeModal(id, title, desc) {
  const courseId = document.getElementById('themeCourseFilter')?.value;
  openModal(id ? 'Редактировать тему' : 'Новая тема', `
    <form id="themeForm">
      <div class="form-group">
        <label>Название темы *</label>
        <input type="text" class="form-control" name="title" value="${escapeHtml(title || '')}" required>
      </div>
      <div class="form-group">
        <label>Описание</label>
        <textarea class="form-control" name="description">${escapeHtml(desc || '')}</textarea>
      </div>
    </form>
  `, async () => {
    const form = document.getElementById('themeForm');
    const data = { title: form.title.value, description: form.description.value, course: courseId };
    if (id) {
      await api('/themes/' + id, { method: 'PUT', body: data });
      showToast('Тема обновлена', 'success');
    } else {
      await api('/themes', { method: 'POST', body: data });
      showToast('Тема создана', 'success');
    }
    closeModal();
    loadThemesForCourse();
  });
}

async function deleteTheme(id) {
  if (!confirm('Удалить тему и все задания?')) return;
  await api('/themes/' + id, { method: 'DELETE' });
  showToast('Тема удалена', 'success');
  loadThemesForCourse();
}

// ===== CATEGORIES =====
async function renderCategories() {
  const categories = await api('/categories');
  categoriesCache = categories;
  document.getElementById('content').innerHTML = `
    <div class="card">
      <div class="card-header">
        <h3>Категории заданий (${categories.length})</h3>
        <button class="btn btn-primary" onclick="showCategoryModal()">+ Добавить</button>
      </div>
      <div class="card-body no-padding">
        ${categories.length ? `<table>
          <thead><tr><th>Название</th><th>Действия</th></tr></thead>
          <tbody>
            ${categories.map(c => `<tr>
              <td><strong>${escapeHtml(c.name)}</strong></td>
              <td>
                <div class="btn-group">
                  <button class="btn btn-sm btn-secondary" onclick="showCategoryModal('${c._id}', '${escapeHtml(c.name)}')">✏️</button>
                  <button class="btn btn-sm btn-danger" onclick="deleteCategory('${c._id}')">🗑️</button>
                </div>
              </td>
            </tr>`).join('')}
          </tbody>
        </table>` : '<div class="empty-state"><div class="icon">🏷️</div><h4>Нет категорий</h4><p>Создайте категории: Экзамен, Лабораторная, Практическая и т.д.</p></div>'}
      </div>
    </div>`;
}

function showCategoryModal(id, name) {
  openModal(id ? 'Редактировать категорию' : 'Новая категория', `
    <form id="catForm">
      <div class="form-group">
        <label>Название *</label>
        <input type="text" class="form-control" name="name" value="${escapeHtml(name || '')}" placeholder="Напр.: Экзамен, Лабораторная" required>
      </div>
    </form>
  `, async () => {
    const data = { name: document.getElementById('catForm').name.value };
    if (id) {
      await api('/categories/' + id, { method: 'PUT', body: data });
    } else {
      await api('/categories', { method: 'POST', body: data });
    }
    showToast(id ? 'Категория обновлена' : 'Категория создана', 'success');
    closeModal();
    renderCategories();
  });
}

async function deleteCategory(id) {
  if (!confirm('Удалить категорию?')) return;
  await api('/categories/' + id, { method: 'DELETE' });
  showToast('Категория удалена', 'success');
  renderCategories();
}

// ===== GROUPS =====
async function renderGroups() {
  if (!coursesCache.length) coursesCache = await api('/courses');
  const groups = await api('/groups');
  groupsCache = groups;
  document.getElementById('content').innerHTML = `
    <div class="card">
      <div class="card-header">
        <h3>Учебные группы (${groups.length})</h3>
        <button class="btn btn-primary" onclick="showGroupModal()">+ Создать группу</button>
      </div>
      <div class="card-body no-padding">
        ${groups.length ? `<table>
          <thead><tr><th>Название</th><th>Курс</th><th>Студентов</th><th>Действия</th></tr></thead>
          <tbody>
            ${groups.map(g => `<tr>
              <td><strong>${escapeHtml(g.name)}</strong></td>
              <td>${escapeHtml(g.course?.title || '—')}</td>
              <td>${g.studentCount || 0}</td>
              <td>
                <div class="btn-group">
                  <button class="btn btn-sm btn-primary" onclick="showGroupStudents('${g._id}', '${escapeHtml(g.name)}')">👥</button>
                  <button class="btn btn-sm btn-secondary" onclick="showGroupModal('${g._id}')">✏️</button>
                  <button class="btn btn-sm btn-danger" onclick="deleteGroup('${g._id}')">🗑️</button>
                </div>
              </td>
            </tr>`).join('')}
          </tbody>
        </table>` : '<div class="empty-state"><div class="icon">👥</div><h4>Нет групп</h4></div>'}
      </div>
    </div>`;
}

function showGroupModal(id) {
  const group = id ? groupsCache.find(g => g._id === id) : null;
  openModal(id ? 'Редактировать группу' : 'Новая группа', `
    <form id="groupForm">
      <div class="form-group">
        <label>Название группы *</label>
        <input type="text" class="form-control" name="name" value="${escapeHtml(group?.name || '')}" required>
      </div>
      <div class="form-group">
        <label>Курс *</label>
        <select class="form-control" name="course" required>
          <option value="">— Выберите курс —</option>
          ${coursesCache.map(c => `<option value="${c._id}" ${group?.course?._id === c._id ? 'selected' : ''}>${escapeHtml(c.title)}</option>`).join('')}
        </select>
      </div>
    </form>
  `, async () => {
    const form = document.getElementById('groupForm');
    const data = { name: form.name.value, course: form.course.value };
    if (id) {
      await api('/groups/' + id, { method: 'PUT', body: data });
    } else {
      await api('/groups', { method: 'POST', body: data });
    }
    showToast(id ? 'Группа обновлена' : 'Группа создана', 'success');
    closeModal();
    renderGroups();
  });
}

async function showGroupStudents(groupId, groupName) {
  const students = await api('/groups/' + groupId + '/students');
  const allStudents = await api('/auth/users?role=STUDENT');
  const inGroup = students.map(s => s._id);
  const available = allStudents.filter(s => !inGroup.includes(s._id));

  openModal('Студенты группы: ' + groupName, `
    <div class="mb-16">
      <div class="d-flex gap-8 mb-16">
        <select class="form-control flex-1" id="addStudentSelect">
          <option value="">— Добавить студента —</option>
          ${available.map(s => `<option value="${s._id}">${escapeHtml(s.name)} (${escapeHtml(s.email)})</option>`).join('')}
        </select>
        <button class="btn btn-primary btn-sm" onclick="addStudentToGroup('${groupId}', '${escapeHtml(groupName)}')">Добавить</button>
      </div>
    </div>
    ${students.length ? `<table>
      <thead><tr><th>Имя</th><th>Email</th><th></th></tr></thead>
      <tbody>
        ${students.map(s => `<tr>
          <td>${escapeHtml(s.name)}</td>
          <td>${escapeHtml(s.email)}</td>
          <td><button class="btn btn-sm btn-danger" onclick="removeStudentFromGroup('${groupId}', '${s._id}', '${escapeHtml(groupName)}')">Убрать</button></td>
        </tr>`).join('')}
      </tbody>
    </table>` : '<div class="empty-state"><p>В группе нет студентов</p></div>'}
  `, null, 'modal-lg');
}

async function addStudentToGroup(groupId, groupName) {
  const sel = document.getElementById('addStudentSelect');
  if (!sel.value) return;
  await api('/groups/' + groupId + '/students', { method: 'POST', body: { studentId: sel.value } });
  showToast('Студент добавлен', 'success');
  showGroupStudents(groupId, groupName);
}

async function removeStudentFromGroup(groupId, studentId, groupName) {
  await api('/groups/' + groupId + '/students/' + studentId, { method: 'DELETE' });
  showToast('Студент удалён из группы', 'success');
  showGroupStudents(groupId, groupName);
}

async function deleteGroup(id) {
  if (!confirm('Удалить группу?')) return;
  await api('/groups/' + id, { method: 'DELETE' });
  showToast('Группа удалена', 'success');
  renderGroups();
}

// ===== ASSIGNMENTS =====
async function renderAssignments() {
  if (!coursesCache.length) coursesCache = await api('/courses');
  if (!categoriesCache.length) categoriesCache = await api('/categories');
  if (!groupsCache.length) groupsCache = await api('/groups');

  const assignments = await api('/assignments');
  document.getElementById('content').innerHTML = `
    <div class="card">
      <div class="card-header">
        <h3>Задания (${assignments.length})</h3>
        <button class="btn btn-primary" onclick="showAssignmentModal()">+ Создать задание</button>
      </div>
      <div class="card-body no-padding">
        ${assignments.length ? `<div class="table-wrapper"><table>
          <thead><tr><th>Название</th><th>Тип</th><th>Категория</th><th>Группа</th><th>Дедлайн</th><th>Действия</th></tr></thead>
          <tbody>
            ${assignments.map(a => `<tr>
              <td><strong>${escapeHtml(a.title)}</strong></td>
              <td>${typeBadge(a.type)}</td>
              <td>${escapeHtml(a.category?.name || '—')}</td>
              <td>${escapeHtml(a.group?.name || '—')}</td>
              <td>${isOverdue(a.deadline) ? '<span class="badge badge-danger">' + formatDateTime(a.deadline) + '</span>' : formatDateTime(a.deadline)}</td>
              <td>
                <div class="btn-group">
                  ${a.type === 'TEST' ? `<button class="btn btn-sm btn-primary" onclick="showTestBuilder('${a._id}')">🧪 Тест</button>` : ''}
                  <button class="btn btn-sm btn-secondary" onclick="showAssignmentModal('${a._id}')">✏️</button>
                  <button class="btn btn-sm btn-danger" onclick="deleteAssignment('${a._id}')">🗑️</button>
                </div>
              </td>
            </tr>`).join('')}
          </tbody>
        </table></div>` : '<div class="empty-state"><div class="icon">📝</div><h4>Нет заданий</h4></div>'}
      </div>
    </div>`;
}

async function showAssignmentModal(id) {
  let assignment = null;
  if (id) {
    assignment = await api('/assignments/' + id);
  }
  // Load themes for all courses
  let allThemes = [];
  for (const c of coursesCache) {
    const t = await api('/themes/course/' + c._id);
    allThemes = allThemes.concat(t.map(th => ({ ...th, courseName: c.title })));
  }

  openModal(id ? 'Редактировать задание' : 'Новое задание', `
    <form id="assignmentForm" enctype="multipart/form-data">
      <div class="form-group">
        <label>Название *</label>
        <input type="text" class="form-control" name="title" value="${escapeHtml(assignment?.title || '')}" required>
      </div>
      <div class="form-group">
        <label>Описание</label>
        <textarea class="form-control" name="description">${escapeHtml(assignment?.description || '')}</textarea>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Тип *</label>
          <select class="form-control" name="type" required ${id ? 'disabled' : ''}>
            <option value="TEST" ${assignment?.type === 'TEST' ? 'selected' : ''}>Тест</option>
            <option value="DOCUMENT" ${assignment?.type === 'DOCUMENT' ? 'selected' : ''}>Документ</option>
          </select>
        </div>
        <div class="form-group">
          <label>Категория</label>
          <select class="form-control" name="category">
            <option value="">— Без категории —</option>
            ${categoriesCache.map(c => `<option value="${c._id}" ${assignment?.category?._id === c._id ? 'selected' : ''}>${escapeHtml(c.name)}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Тема *</label>
          <select class="form-control" name="theme" required>
            <option value="">— Выберите тему —</option>
            ${allThemes.map(t => `<option value="${t._id}" ${assignment?.theme?._id === t._id ? 'selected' : ''}>[${escapeHtml(t.courseName)}] ${escapeHtml(t.title)}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label>Группа *</label>
          <select class="form-control" name="group" required>
            <option value="">— Выберите группу —</option>
            ${groupsCache.map(g => `<option value="${g._id}" ${assignment?.group?._id === g._id ? 'selected' : ''}>${escapeHtml(g.name)}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Дата начала</label>
          <input type="datetime-local" class="form-control" name="startDate" value="${assignment?.startDate ? new Date(assignment.startDate).toISOString().slice(0, 16) : ''}">
        </div>
        <div class="form-group">
          <label>Дедлайн *</label>
          <input type="datetime-local" class="form-control" name="deadline" value="${assignment?.deadline ? new Date(assignment.deadline).toISOString().slice(0, 16) : ''}" required>
        </div>
      </div>
      <div class="form-group">
        <label>Макс. оценка</label>
        <input type="number" class="form-control" name="maxScore" value="${assignment?.maxScore || 100}" min="1" max="100">
      </div>
      <div class="form-group" id="fileUploadGroup">
        <label>Файл задания (PDF, DOC, XLS, PPT)</label>
        <input type="file" class="form-control" name="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx">
        ${assignment?.file ? `<div class="file-name mt-8">📎 Текущий файл: ${assignment.file.split('/').pop()}</div>` : ''}
      </div>
    </form>
  `, async () => {
    const form = document.getElementById('assignmentForm');
    const formData = new FormData(form);
    if (!id) formData.set('type', form.type.value);
    
    if (id) {
      await api('/assignments/' + id, { method: 'PUT', body: formData });
      showToast('Задание обновлено', 'success');
    } else {
      await api('/assignments', { method: 'POST', body: formData });
      showToast('Задание создано', 'success');
    }
    closeModal();
    renderAssignments();
  }, 'modal-lg');
}

async function deleteAssignment(id) {
  if (!confirm('Удалить задание?')) return;
  await api('/assignments/' + id, { method: 'DELETE' });
  showToast('Задание удалено', 'success');
  renderAssignments();
}

// ===== TEST BUILDER =====
async function showTestBuilder(assignmentId) {
  const data = await api('/tests/assignment/' + assignmentId);
  const { test, questions } = data;

  openModal('Конструктор теста', `
    <div id="testBuilderContent">
      <div class="mb-16 d-flex justify-between align-center">
        <strong>Вопросов: ${questions.length}</strong>
        <button class="btn btn-primary btn-sm" onclick="addQuestion('${test._id}', '${assignmentId}')">+ Добавить вопрос</button>
      </div>
      ${questions.length ? questions.map((q, i) => `
        <div class="question-builder">
          <div class="question-header">
            <strong>Вопрос ${i + 1}: ${escapeHtml(q.text)}</strong>
            <div class="btn-group">
              <button class="btn btn-sm btn-secondary" onclick="editQuestion('${q._id}', '${test._id}', '${assignmentId}')">✏️</button>
              <button class="btn btn-sm btn-danger" onclick="deleteQuestion('${q._id}', '${assignmentId}')">🗑️</button>
            </div>
          </div>
          ${q.image ? `<img src="${q.image}" style="max-width:200px; border-radius:8px; margin:8px 0;">` : ''}
          <div class="fs-12 text-secondary mb-8">${q.multiple ? 'Несколько ответов' : 'Один ответ'}</div>
          ${q.answers.map(a => `
            <div style="padding:4px 8px; display:flex; gap:8px; align-items:center;">
              ${a.isCorrect ? '✅' : '⬜'} ${escapeHtml(a.text)}
            </div>
          `).join('')}
        </div>
      `).join('') : '<div class="empty-state"><p>Добавьте вопросы к тесту</p></div>'}
    </div>
  `, null, 'modal-lg');
}

function addQuestion(testId, assignmentId) {
  closeModal();
  let answerCount = 2;
  openModal('Новый вопрос', `
    <form id="questionForm">
      <div class="form-group">
        <label>Текст вопроса *</label>
        <textarea class="form-control" name="text" required></textarea>
      </div>
      <div class="form-group">
        <label>Изображение (опционально)</label>
        <input type="file" class="form-control" name="image" accept="image/*">
      </div>
      <div class="form-group">
        <label class="form-check"><input type="checkbox" name="multiple"> Несколько правильных ответов</label>
      </div>
      <div class="form-group">
        <label>Ответы</label>
        <div id="answersContainer">
          <div class="answer-builder">
            <input type="checkbox" class="correct-check" title="Правильный">
            <input type="text" class="form-control" placeholder="Вариант ответа 1" required>
          </div>
          <div class="answer-builder">
            <input type="checkbox" class="correct-check" title="Правильный">
            <input type="text" class="form-control" placeholder="Вариант ответа 2" required>
          </div>
        </div>
        <button type="button" class="btn btn-sm btn-secondary mt-8" onclick="addAnswerField()">+ Добавить вариант</button>
      </div>
    </form>
  `, async () => {
    const form = document.getElementById('questionForm');
    const answersDiv = document.querySelectorAll('.answer-builder');
    const answers = [];
    answersDiv.forEach(div => {
      const text = div.querySelector('input[type=text]').value;
      const isCorrect = div.querySelector('.correct-check').checked;
      if (text.trim()) answers.push({ text, isCorrect });
    });

    const formData = new FormData();
    formData.append('text', form.text.value);
    formData.append('multiple', form.multiple.checked);
    formData.append('answers', JSON.stringify(answers));
    if (form.image.files[0]) formData.append('image', form.image.files[0]);

    await api('/tests/' + testId + '/questions', { method: 'POST', body: formData });
    showToast('Вопрос добавлен', 'success');
    closeModal();
    showTestBuilder(assignmentId);
  });
}

function addAnswerField() {
  const container = document.getElementById('answersContainer');
  const num = container.children.length + 1;
  const div = document.createElement('div');
  div.className = 'answer-builder';
  div.innerHTML = `
    <input type="checkbox" class="correct-check" title="Правильный">
    <input type="text" class="form-control" placeholder="Вариант ответа ${num}" required>
    <button type="button" class="btn btn-sm btn-danger btn-icon" onclick="this.parentElement.remove()">✕</button>`;
  container.appendChild(div);
}

async function editQuestion(qId, testId, assignmentId) {
  const data = await api('/tests/assignment/' + assignmentId);
  const question = data.questions.find(q => q._id === qId);
  if (!question) return;

  closeModal();
  openModal('Редактировать вопрос', `
    <form id="questionForm">
      <div class="form-group">
        <label>Текст вопроса *</label>
        <textarea class="form-control" name="text" required>${escapeHtml(question.text)}</textarea>
      </div>
      <div class="form-group">
        <label>Изображение</label>
        <input type="file" class="form-control" name="image" accept="image/*">
        ${question.image ? `<div class="file-name mt-8">Текущее: ${question.image.split('/').pop()}</div>` : ''}
      </div>
      <div class="form-group">
        <label class="form-check"><input type="checkbox" name="multiple" ${question.multiple ? 'checked' : ''}> Несколько правильных ответов</label>
      </div>
      <div class="form-group">
        <label>Ответы</label>
        <div id="answersContainer">
          ${question.answers.map((a, i) => `
            <div class="answer-builder">
              <input type="checkbox" class="correct-check" title="Правильный" ${a.isCorrect ? 'checked' : ''}>
              <input type="text" class="form-control" value="${escapeHtml(a.text)}" required>
              ${i > 1 ? '<button type="button" class="btn btn-sm btn-danger btn-icon" onclick="this.parentElement.remove()">✕</button>' : ''}
            </div>
          `).join('')}
        </div>
        <button type="button" class="btn btn-sm btn-secondary mt-8" onclick="addAnswerField()">+ Добавить вариант</button>
      </div>
    </form>
  `, async () => {
    const form = document.getElementById('questionForm');
    const answersDiv = document.querySelectorAll('.answer-builder');
    const answers = [];
    answersDiv.forEach(div => {
      const text = div.querySelector('input[type=text]').value;
      const isCorrect = div.querySelector('.correct-check').checked;
      if (text.trim()) answers.push({ text, isCorrect });
    });
    const formData = new FormData();
    formData.append('text', form.text.value);
    formData.append('multiple', form.multiple.checked);
    formData.append('answers', JSON.stringify(answers));
    if (form.image.files[0]) formData.append('image', form.image.files[0]);

    await api('/tests/questions/' + qId, { method: 'PUT', body: formData });
    showToast('Вопрос обновлён', 'success');
    closeModal();
    showTestBuilder(assignmentId);
  });
}

async function deleteQuestion(qId, assignmentId) {
  if (!confirm('Удалить вопрос?')) return;
  await api('/tests/questions/' + qId, { method: 'DELETE' });
  showToast('Вопрос удалён', 'success');
  showTestBuilder(assignmentId);
}

// ===== STUDENTS =====
async function renderStudents() {
  const students = await api('/auth/users?role=STUDENT');
  document.getElementById('content').innerHTML = `
    <div class="card">
      <div class="card-header">
        <h3>Студенты (${students.length})</h3>
        <button class="btn btn-primary" onclick="showStudentModal()">+ Добавить студента</button>
      </div>
      <div class="card-body no-padding">
        ${students.length ? `<table>
          <thead><tr><th>Имя</th><th>Email</th><th>Группы</th><th>Последний вход</th><th>Действия</th></tr></thead>
          <tbody>
            ${students.map(s => `<tr>
              <td><strong>${escapeHtml(s.name)}</strong></td>
              <td>${escapeHtml(s.email)}</td>
              <td>${s.groups?.map(g => `<span class="badge badge-primary">${escapeHtml(g.name)}</span>`).join(' ') || '—'}</td>
              <td>${timeAgo(s.lastLogin)}</td>
              <td>
                <div class="btn-group">
                  <button class="btn btn-sm btn-info" onclick="showStudentDetail('${s._id}')">📊</button>
                  <button class="btn btn-sm btn-secondary" onclick="showStudentModal('${s._id}')">✏️</button>
                  <button class="btn btn-sm btn-danger" onclick="deleteStudent('${s._id}')">🗑️</button>
                </div>
              </td>
            </tr>`).join('')}
          </tbody>
        </table>` : '<div class="empty-state"><div class="icon">🎓</div><h4>Нет студентов</h4></div>'}
      </div>
    </div>`;
}

async function showStudentModal(id) {
  let student = null;
  if (id) {
    const users = await api('/auth/users?role=STUDENT');
    student = users.find(u => u._id === id);
  }
  if (!groupsCache.length) groupsCache = await api('/groups');

  openModal(id ? 'Редактировать студента' : 'Новый студент', `
    <form id="studentForm">
      <div class="form-group">
        <label>Имя *</label>
        <input type="text" class="form-control" name="name" value="${escapeHtml(student?.name || '')}" required>
      </div>
      <div class="form-group">
        <label>Email *</label>
        <input type="email" class="form-control" name="email" value="${escapeHtml(student?.email || '')}" required>
      </div>
      <div class="form-group">
        <label>Пароль ${id ? '(оставьте пустым)' : '*'}</label>
        <input type="password" class="form-control" name="password" ${id ? '' : 'required'} minlength="6">
      </div>
      <div class="form-group">
        <label>Группы</label>
        <div style="max-height:200px; overflow-y:auto; border:1px solid var(--border); border-radius:8px; padding:8px;">
          ${groupsCache.map(g => `
            <label class="form-check" style="padding:6px 0;">
              <input type="checkbox" name="groups" value="${g._id}" ${student?.groups?.some(sg => sg._id === g._id) ? 'checked' : ''}>
              ${escapeHtml(g.name)} (${escapeHtml(g.course?.title || '')})
            </label>
          `).join('')}
        </div>
      </div>
    </form>
  `, async () => {
    const form = document.getElementById('studentForm');
    const groups = Array.from(form.querySelectorAll('input[name=groups]:checked')).map(i => i.value);
    const data = {
      name: form.name.value,
      email: form.email.value,
      role: 'STUDENT',
      groups
    };
    if (form.password.value) data.password = form.password.value;

    if (id) {
      await api('/auth/users/' + id, { method: 'PUT', body: data });
      showToast('Студент обновлён', 'success');
    } else {
      data.password = form.password.value;
      await api('/auth/register', { method: 'POST', body: data });
      showToast('Студент создан', 'success');
    }
    closeModal();
    renderStudents();
  });
}

async function showStudentDetail(studentId) {
  const data = await api('/dashboard/student/' + studentId);
  openModal('Статистика: ' + data.student.name, `
    <div class="stats-grid" style="margin-bottom:16px;">
      <div class="stat-card">
        <div class="stat-icon info">📊</div>
        <div class="stat-details"><h3>${data.avgScore}</h3><p>Средний балл</p></div>
      </div>
      <div class="stat-card">
        <div class="stat-icon success">✅</div>
        <div class="stat-details"><h3>${data.submissions.filter(s => s.status === 'COMPLETED').length}</h3><p>Выполнено</p></div>
      </div>
    </div>
    <div class="mb-8"><strong>Последний вход:</strong> ${formatDateTime(data.student.lastLogin)}</div>
    <div class="mb-16"><strong>Группы:</strong> ${data.student.groups?.map(g => escapeHtml(g.name)).join(', ') || '—'}</div>
    ${data.submissions.length ? `<table>
      <thead><tr><th>Задание</th><th>Статус</th><th>Оценка</th><th>Дата</th></tr></thead>
      <tbody>
        ${data.submissions.map(s => `<tr>
          <td>${escapeHtml(s.assignment?.title || '—')}</td>
          <td>${statusBadge(s.status)}</td>
          <td>${s.score !== null ? s.score + '/100' : '—'}</td>
          <td>${formatDateTime(s.submittedAt)}</td>
        </tr>`).join('')}
      </tbody>
    </table>` : '<div class="empty-state"><p>Нет работ</p></div>'}
  `, null, 'modal-lg');
}

async function deleteStudent(id) {
  if (!confirm('Удалить студента?')) return;
  await api('/auth/users/' + id, { method: 'DELETE' });
  showToast('Студент удалён', 'success');
  renderStudents();
}

// ===== GRADES =====
async function renderGrades() {
  if (!groupsCache.length) groupsCache = await api('/groups');

  document.getElementById('content').innerHTML = `
    <div class="filter-bar">
      <select class="form-control" id="gradeGroupFilter" onchange="loadGrades()">
        <option value="">— Выберите группу —</option>
        ${groupsCache.map(g => `<option value="${g._id}">${escapeHtml(g.name)}</option>`).join('')}
      </select>
      <button class="btn btn-success" id="exportBtn" onclick="exportGrades()" disabled>📥 Экспорт в Excel</button>
    </div>
    <div id="gradesContent"><div class="empty-state"><div class="icon">📋</div><h4>Выберите группу</h4></div></div>`;
}

async function loadGrades() {
  const groupId = document.getElementById('gradeGroupFilter').value;
  const exportBtn = document.getElementById('exportBtn');
  if (!groupId) {
    exportBtn.disabled = true;
    document.getElementById('gradesContent').innerHTML = '<div class="empty-state"><div class="icon">📋</div><h4>Выберите группу</h4></div>';
    return;
  }
  exportBtn.disabled = false;

  const data = await api('/dashboard/group/' + groupId);
  document.getElementById('gradesContent').innerHTML = `
    <div class="mb-16"><strong>Средний балл группы: ${data.groupAvg}/100</strong></div>
    <div class="card">
      <div class="card-body no-padding">
        ${data.studentStats.length ? `<table>
          <thead><tr><th>Студент</th><th>Выполнено</th><th>Всего</th><th>Средний балл</th><th>Последний вход</th></tr></thead>
          <tbody>
            ${data.studentStats.map(s => `<tr>
              <td><strong>${escapeHtml(s.student.name)}</strong></td>
              <td>${s.completedCount}</td>
              <td>${s.totalAssignments}</td>
              <td><span class="badge ${s.avgScore >= 70 ? 'badge-success' : s.avgScore >= 40 ? 'badge-warning' : 'badge-danger'}">${s.avgScore}/100</span></td>
              <td>${timeAgo(s.student.lastLogin)}</td>
            </tr>`).join('')}
          </tbody>
        </table>` : '<div class="empty-state"><p>Нет студентов</p></div>'}
      </div>
    </div>
    ${data.assignments.length ? `
    <h3 class="mt-24 mb-16">Все работы</h3>
    <div id="assignmentGrades"></div>` : ''}`;

  // Load submissions for each assignment
  if (data.assignments.length) {
    let html = '';
    for (const a of data.assignments) {
      const subs = await api('/submissions/assignment/' + a._id);
      html += `
        <div class="card mb-16">
          <div class="card-header">
            <h3>${escapeHtml(a.title)} ${typeBadge(a.type)}</h3>
            <span class="text-secondary">${formatDateTime(a.deadline)}</span>
          </div>
          <div class="card-body no-padding">
            ${subs.length ? `<table>
              <thead><tr><th>Студент</th><th>Статус</th><th>Оценка</th><th>Файл</th><th>Дата</th><th>Действия</th></tr></thead>
              <tbody>
                ${subs.map(s => `<tr>
                  <td>${escapeHtml(s.student?.name || '—')}</td>
                  <td>${statusBadge(s.status)}</td>
                  <td>
                    <input type="number" class="form-control" style="width:80px;padding:4px 8px;" 
                      value="${s.score !== null ? s.score : ''}" min="0" max="100"
                      onchange="updateGrade('${s._id}', this.value)">
                  </td>
                  <td>${s.file ? `<a href="${s.file}" target="_blank">📎 Скачать</a>` : '—'}</td>
                  <td>${formatDateTime(s.submittedAt)}</td>
                  <td>
                    <button class="btn btn-sm btn-warning" onclick="retryAssignment('${a._id}', '${s.student?._id}')">🔄 Повторно</button>
                  </td>
                </tr>`).join('')}
              </tbody>
            </table>` : '<div class="empty-state"><p>Нет работ</p></div>'}
          </div>
        </div>`;
    }
    document.getElementById('assignmentGrades').innerHTML = html;
  }
}

async function updateGrade(submissionId, score) {
  try {
    await api('/submissions/' + submissionId + '/grade', { method: 'PUT', body: { score: parseInt(score) } });
    showToast('Оценка обновлена', 'success');
  } catch (e) {}
}

async function retryAssignment(assignmentId, studentId) {
  if (!confirm('Отправить задание на повторное выполнение?')) return;
  await api('/assignments/' + assignmentId + '/retry/' + studentId, { method: 'POST' });
  showToast('Задание отправлено на повторное выполнение', 'success');
  loadGrades();
}

async function exportGrades() {
  const groupId = document.getElementById('gradeGroupFilter').value;
  if (!groupId) return;
  try {
    const blob = await api('/dashboard/export/' + groupId);
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'grades.xlsx';
    a.click();
    window.URL.revokeObjectURL(url);
    showToast('Файл экспортирован', 'success');
  } catch (e) {}
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
  if (dd.classList.contains('show')) {
    dd.classList.remove('show');
    return;
  }
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
function openModal(title, content, onSave, cls) {
  const overlay = document.getElementById('modalOverlay');
  const modal = document.getElementById('modal');
  modal.className = 'modal' + (cls ? ' ' + cls : '');
  modal.innerHTML = `
    <div class="modal-header">
      <h3>${title}</h3>
      <button class="modal-close" onclick="closeModal()">&times;</button>
    </div>
    <div class="modal-body">${content}</div>
    ${onSave ? `<div class="modal-footer">
      <button class="btn btn-secondary" onclick="closeModal()">Отмена</button>
      <button class="btn btn-primary" id="modalSaveBtn">Сохранить</button>
    </div>` : `<div class="modal-footer">
      <button class="btn btn-secondary" onclick="closeModal()">Закрыть</button>
    </div>`}`;

  overlay.classList.add('active');

  if (onSave) {
    document.getElementById('modalSaveBtn').addEventListener('click', async () => {
      const btn = document.getElementById('modalSaveBtn');
      btn.disabled = true;
      btn.textContent = 'Сохранение...';
      try {
        await onSave();
      } catch (e) {
        btn.disabled = false;
        btn.textContent = 'Сохранить';
      }
    });
  }
}

function closeModal() {
  document.getElementById('modalOverlay').classList.remove('active');
}

// Close modal on overlay click
document.getElementById('modalOverlay').addEventListener('click', (e) => {
  if (e.target === e.currentTarget) closeModal();
});

// Close notifications on outside click
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
