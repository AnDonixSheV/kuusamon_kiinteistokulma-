// ===== ADMIN DASHBOARD LOGIC =====

const ADMIN_PASSWORD = 'admin2025';
let currentFilter = 'all';
let allRequests = [];
let galleryPhotos = [];
let pendingPhotoSrc = null;

// ===== DEFAULT PROJECTS =====
const DEFAULT_PROJECTS = [
  { name: 'Bitumikattotyöt', photos: [{ src: 'images/ref-1.png', alt: 'Bitumikattotyöt Kuusamossa' }] },
  { name: 'Julkisivuremontti', photos: [{ src: 'images/ref-2.png', alt: 'Julkisivuremontti' }] },
  { name: 'Sisäremontit ja laatoitus', photos: [{ src: 'images/ref-3.png', alt: 'Sisäremontit ja laatoitus' }] },
  { name: 'Peltikattojen asennus', photos: [{ src: 'images/ref-4.png', alt: 'Peltikattojen asennus' }] }
];

let pendingPhotos = []; // photos staged for new project

// ===== LOAD / SAVE PROJECTS =====
function loadGallery() {
  const stored = localStorage.getItem('kk_projects');
  galleryPhotos = [];
  if (stored) {
    try { 
      const parsed = JSON.parse(stored);
      galleryPhotos = Array.isArray(parsed) ? parsed : [];
    } catch (e) { 
      galleryPhotos = JSON.parse(JSON.stringify(DEFAULT_PROJECTS)); 
    }
  } else {
    // Try migrating old format
    const old = localStorage.getItem('kk_gallery');
    if (old) {
      try {
        const parsed = JSON.parse(old);
        if (Array.isArray(parsed)) {
          galleryPhotos = parsed.map(p => ({ name: p.title || 'Проект', photos: [{ src: p.src, alt: p.alt || p.title || '' }] }));
        } else {
          galleryPhotos = JSON.parse(JSON.stringify(DEFAULT_PROJECTS));
        }
      } catch (e) { galleryPhotos = JSON.parse(JSON.stringify(DEFAULT_PROJECTS)); }
    } else {
      galleryPhotos = JSON.parse(JSON.stringify(DEFAULT_PROJECTS));
    }
  }
  // Double check galleryPhotos is actually an array before rendering
  if (!Array.isArray(galleryPhotos)) galleryPhotos = JSON.parse(JSON.stringify(DEFAULT_PROJECTS));
  renderProjectsAdmin();
}

function saveProjects() {
  localStorage.setItem('kk_projects', JSON.stringify(galleryPhotos));
}

// ===== RENDER PROJECTS LIST =====
function renderProjectsAdmin() {
  const list = document.getElementById('projectsAdminList');
  const countEl = document.getElementById('projectCount');
  const emptyEl = document.getElementById('galleryEmpty');
  if (!list) return;

  countEl.textContent = galleryPhotos.length;

  if (galleryPhotos.length === 0) {
    list.innerHTML = '';
    emptyEl.style.display = '';
    return;
  }
  emptyEl.style.display = 'none';

  list.innerHTML = galleryPhotos.map((project, i) => {
    const isPublished = project.published !== false;
    return `
    <div class="project-admin-card" style="opacity: ${isPublished ? '1' : '0.6'}">
      <div class="project-admin-header">
        <div class="project-admin-title-row">
          <span class="gallery-index">#${i + 1}</span>
          <input type="text" class="gallery-edit-title" value="${project.name.replace(/"/g, '&quot;')}" onchange="updateProjectName(${i}, this.value)" placeholder="Название проекта...">
        </div>
        <div class="project-admin-actions">
          <button class="gallery-move-btn" onclick="toggleProjectVisibility(${i})" title="${isPublished ? 'Скрыть с сайта' : 'Опубликовать на сайте'}" style="background: ${isPublished ? 'rgba(239,68,68,0.15)' : 'rgba(74,222,128,0.15)'}; color: ${isPublished ? '#ef4444' : '#4ade80'}; border: 1px solid currentColor;">
            ${isPublished ? '👁️ Скрыть' : '👁️‍🗨️ Опубликовать'}
          </button>
          ${i > 0 ? `<button class="gallery-move-btn" onclick="moveProject(${i}, -1)" title="Переместить вверх">⬆</button>` : ''}
          ${i < galleryPhotos.length - 1 ? `<button class="gallery-move-btn" onclick="moveProject(${i}, 1)" title="Переместить вниз">⬇</button>` : ''}
          <button class="gallery-delete-btn" onclick="deleteProject(${i})" title="Удалить">🗑️ Удалить</button>
        </div>
      </div>
      <div class="project-admin-photos">
        ${project.photos.map((photo, pi) => `
          <div class="project-admin-photo">
            <img src="${photo.src}" alt="${(photo.alt || '').replace(/"/g, '&quot;')}" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 75%22><rect fill=%22%23252836%22 width=%22100%22 height=%2275%22/><text x=%2250%22 y=%2240%22 text-anchor=%22middle%22 fill=%22%235f6478%22 font-size=%2210%22>Ошибка</text></svg>'">
            <button class="photo-remove-btn" onclick="removePhotoFromProject(${i}, ${pi})" title="Удалить фото">✕</button>
          </div>
        `).join('')}
        ${project.photos.length < 5 ? `
          <div class="project-add-photo-btn" onclick="triggerAddPhotoToProject(${i})">
            <span>+ Добавить фото</span>
            <input type="file" id="addPhotoInput_${i}" accept="image/*" style="display:none;" onchange="handleAddPhotoToProject(${i}, this)">
          </div>
        ` : ''}
      </div>
    </div>
  `).join('');
}

// ===== PROJECT CRUD =====
function updateProjectName(index, newName) {
  galleryPhotos[index].name = newName;
  saveProjects();
}

function moveProject(index, direction) {
  const newIndex = index + direction;
  if (newIndex < 0 || newIndex >= galleryPhotos.length) return;
  const temp = galleryPhotos[index];
  galleryPhotos[index] = galleryPhotos[newIndex];
  galleryPhotos[newIndex] = temp;
  saveProjects();
  renderProjectsAdmin();
}

function deleteProject(index) {
  if (!confirm('Haluatko varmasti poistaa tämän projektin?')) return;
  galleryPhotos.splice(index, 1);
  saveProjects();
  renderProjectsAdmin();
  showGalleryToast('🗑️ Projekti poistettu.');
}

function toggleProjectVisibility(index) {
  const isPublished = galleryPhotos[index].published !== false;
  galleryPhotos[index].published = !isPublished;
  saveProjects();
  renderProjectsAdmin();
  showGalleryToast(galleryPhotos[index].published ? '👁️‍🗨️ Проект опубликован' : '👁️ Проект скрыт');
}

// ===== PHOTO MANAGEMENT WITHIN PROJECT =====
function removePhotoFromProject(projectIndex, photoIndex) {
  const project = galleryPhotos[projectIndex];
  if (project.photos.length <= 1) {
    if (confirm('Tämä on viimeinen kuva. Poistaa koko projektin?')) {
      deleteProject(projectIndex);
    }
    return;
  }
  project.photos.splice(photoIndex, 1);
  saveProjects();
  renderProjectsAdmin();
  showGalleryToast('🗑️ Kuva poistettu.');
}

function triggerAddPhotoToProject(projectIndex) {
  document.getElementById('addPhotoInput_' + projectIndex).click();
}

function handleAddPhotoToProject(projectIndex, input) {
  const file = input.files[0];
  if (!file) return;
  if (!file.type.startsWith('image/')) { alert('Valitse kuvatiedosto.'); return; }
  if (file.size > 5 * 1024 * 1024) { alert('Kuvan maksimikoko on 5 MB.'); return; }

  const reader = new FileReader();
  reader.onload = (e) => {
    galleryPhotos[projectIndex].photos.push({ src: e.target.result, alt: galleryPhotos[projectIndex].name });
    saveProjects();
    renderProjectsAdmin();
    showGalleryToast('✅ Kuva lisätty!');
  };
  reader.readAsDataURL(file);
}

// ===== ADD NEW PROJECT SECTION =====
function addProjectSection() {
  const nameInput = document.getElementById('projectNameInput');
  const name = nameInput.value.trim();
  if (!name) { alert('Anna projektin nimi.'); return; }
  if (pendingPhotos.length === 0) { alert('Lisää vähintään yksi kuva.'); return; }

  galleryPhotos.push({
    name: name,
    photos: pendingPhotos.map(p => ({ src: p.src, alt: name }))
  });

  saveProjects();
  renderProjectsAdmin();
  showGalleryToast('✅ Projekti lisätty!');

  // Clear form
  nameInput.value = '';
  pendingPhotos = [];
  updatePreviewGrid();
}

// ===== PENDING PHOTOS PREVIEW =====
function updatePreviewGrid() {
  const container = document.getElementById('projectPhotosPreview');
  const grid = document.getElementById('previewGrid');
  const countEl = document.getElementById('previewCount');

  countEl.textContent = pendingPhotos.length;
  container.style.display = pendingPhotos.length > 0 ? '' : 'none';

  grid.innerHTML = pendingPhotos.map((p, i) => `
    <div class="preview-item">
      <img src="${p.src}" alt="Esikatselu">
      <button class="preview-remove" onclick="removePendingPhoto(${i})">✕</button>
    </div>
  `).join('');
}

function removePendingPhoto(index) {
  pendingPhotos.splice(index, 1);
  updatePreviewGrid();
}

function addUrlToPreview() {
  const input = document.getElementById('galleryUrlInput');
  const url = input.value.trim();
  if (!url) return;
  if (pendingPhotos.length >= 5) { alert('Enintään 5 kuvaa per projekti.'); return; }
  pendingPhotos.push({ src: url });
  input.value = '';
  updatePreviewGrid();
}

// ===== RESET =====
function resetProjectsToDefaults() {
  if (!confirm('Palauttaa oletusprojektit? Kaikki lisätyt projektit poistetaan.')) return;
  galleryPhotos = JSON.parse(JSON.stringify(DEFAULT_PROJECTS));
  saveProjects();
  renderProjectsAdmin();
  showGalleryToast('🔄 Oletusprojektit palautettu.');
}

// ===== FILE UPLOAD =====
document.addEventListener('DOMContentLoaded', () => {
  const uploadZone = document.getElementById('uploadZone');
  const fileInput = document.getElementById('galleryFileInput');
  if (!uploadZone || !fileInput) return;

  uploadZone.addEventListener('click', () => fileInput.click());

  fileInput.addEventListener('change', (e) => {
    const files = Array.from(e.target.files);
    files.forEach(f => processFileForPreview(f));
    fileInput.value = '';
  });

  uploadZone.addEventListener('dragover', (e) => { e.preventDefault(); uploadZone.classList.add('dragover'); });
  uploadZone.addEventListener('dragleave', () => uploadZone.classList.remove('dragover'));
  uploadZone.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadZone.classList.remove('dragover');
    Array.from(e.dataTransfer.files).forEach(f => processFileForPreview(f));
  });
});

function processFileForPreview(file) {
  if (!file.type.startsWith('image/')) { alert('Valitse kuvatiedosto.'); return; }
  if (file.size > 5 * 1024 * 1024) { alert('Kuvan maksimikoko on 5 MB.'); return; }
  if (pendingPhotos.length >= 5) { alert('Enintään 5 kuvaa per projekti.'); return; }

  const reader = new FileReader();
  reader.onload = (e) => {
    pendingPhotos.push({ src: e.target.result });
    updatePreviewGrid();
  };
  reader.readAsDataURL(file);
}

// ===== TOAST =====
function showGalleryToast(message) {
  let toast = document.getElementById('galleryToast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'galleryToast';
    toast.className = 'gallery-toast';
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2500);
}

// ===== INITIAL LOAD =====
document.addEventListener('DOMContentLoaded', () => {
  loadRequests();
  loadGallery();
});


// ===== LOGIN =====
function doLogin() {
  const pwdInput = document.getElementById('loginPassword');
  const pwd = pwdInput.value.trim();
  if (pwd === ADMIN_PASSWORD) {
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('dashboard').classList.add('active');
    sessionStorage.setItem('kk_admin', 'true');
    loadRequests();
    loadGallery();
  } else {
    document.getElementById('loginError').style.display = 'block';
    pwdInput.style.borderColor = '#ef4444';
    setTimeout(() => {
      document.getElementById('loginError').style.display = 'none';
      pwdInput.style.borderColor = '';
    }, 3000);
  }
}

// Auto-login if session active
if (sessionStorage.getItem('kk_admin') === 'true') {
  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('dashboard').classList.add('active');
  loadRequests();
  loadGallery();
}

// ===== LOAD REQUESTS =====
function loadRequests() {
  try {
    const stored = localStorage.getItem('kk_requests');
    const parsed = stored ? JSON.parse(stored) : [];
    allRequests = Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.error('Error loading requests:', e);
    allRequests = [];
  }
  updateStats();
  filterRequests();
}

// ===== UPDATE STATS =====
function updateStats() {
  const total = allRequests.length;
  const processing = allRequests.filter(r => r.status === 'processing').length;
  const inProgress = allRequests.filter(r => r.status === 'in_progress').length;
  const archived = allRequests.filter(r => r.status === 'completed' || r.status === 'declined').length;

  const elTotal = document.getElementById('statTotal');
  const elNew = document.getElementById('statNew');
  const elInProgress = document.getElementById('statInProgress');
  const elArchived = document.getElementById('statArchived');

  if (elTotal) elTotal.textContent = total;
  if (elNew) elNew.textContent = processing;
  if (elInProgress) elInProgress.textContent = inProgress;
  if (elArchived) elArchived.textContent = archived;
  
  const badge = document.getElementById('newBadge');
  if (badge) {
    badge.textContent = processing;
    badge.style.display = processing > 0 ? '' : 'none';
  }
}

// ===== FILTER & SORT =====
function setFilter(filter) {
  currentFilter = filter;
  document.querySelectorAll('.filter-btn[data-filter]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.filter === filter);
  });
  filterRequests();
}

function filterRequests() {
  const search = (document.getElementById('searchInput').value || '').toLowerCase();
  const sort = document.getElementById('sortSelect') ? document.getElementById('sortSelect').value : 'newest';
  
  let filtered = allRequests;

  // Filter by status tab
  if (currentFilter === 'archive') {
    filtered = filtered.filter(r => r.status === 'completed' || r.status === 'declined');
  } else if (currentFilter === 'active') {
    filtered = filtered.filter(r => r.status !== 'completed' && r.status !== 'declined');
  } else if (currentFilter !== 'all') {
    filtered = filtered.filter(r => r.status === currentFilter);
  }

  // Filter by search
  if (search) {
    filtered = filtered.filter(r =>
      (r.client?.name || '').toLowerCase().includes(search) ||
      (r.client?.email || '').toLowerCase().includes(search) ||
      (r.client?.phone || '').toLowerCase().includes(search) ||
      (r.serviceName || '').toLowerCase().includes(search) ||
      (r.description || '').toLowerCase().includes(search)
    );
  }

  // Sorting
  filtered.sort((a, b) => {
    if (sort === 'newest') return new Date(b.createdAt) - new Date(a.createdAt);
    if (sort === 'oldest') return new Date(a.createdAt) - new Date(b.createdAt);
    if (sort === 'status') return a.status.localeCompare(b.status);
    return 0;
  });

  renderRequests(filtered);
}

// ===== RENDER REQUESTS =====
function renderRequests(requests) {
  const container = document.getElementById('requestsList');

  if (requests.length === 0) {
    container.innerHTML = `
      <div class="no-data">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
        <h3>Заявок не найдено</h3>
        <p>Здесь будут отображаться заявки с формы на сайте.</p>
      </div>
    `;
    return;
  }

  const statusLabels = { processing: 'Käsittelyssä', in_progress: 'Käynnissä', completed: 'Valmis', declined: 'Hylätty' };
  const statusColors = { processing: 'new', in_progress: 'processing', completed: 'accepted', declined: 'declined' };

  container.innerHTML = requests.map(r => {
    const date = new Date(r.createdAt);
    const dateStr = date.toLocaleDateString('ru-RU') + ' ' + date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

    return `
      <div class="request-card" onclick="openRequest('${r.id}')">
        <span class="status-badge ${statusColors[r.status] || ''}">${statusLabels[r.status] || r.status}</span>
        <div class="request-info">
          <h3>${r.client?.name || 'Без имени'} — ${r.serviceName || 'Без услуги'}</h3>
          <p>${r.description ? r.description.substring(0, 80) + (r.description.length > 80 ? '...' : '') : 'Нет описания'}</p>
        </div>
        <div class="request-meta">
          <div class="price">${r.client?.phone || 'Нет телефона'}</div>
          <div>${dateStr}</div>
        </div>
        <div style="font-size:12px;color:var(--text-muted)">${r.id}</div>
      </div>
    `;
  }).join('');
}

// ===== OPEN REQUEST DETAIL =====
function openRequest(id) {
  const r = allRequests.find(req => req.id === id);
  if (!r) return;

  document.getElementById('modalTitle').textContent = `Заявка ${r.id}`;

  const statusOptions = ['processing', 'in_progress', 'completed', 'declined'];
  const statusLabels = { processing: 'Käsittelyssä', in_progress: 'Käynnissä', completed: 'Valmis', declined: 'Hylätty' };

  const date = new Date(r.createdAt);
  const dateStr = date.toLocaleDateString('ru-RU') + ' ' + date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

  document.getElementById('modalContent').innerHTML = `
    <div class="modal-section">
      <div style="margin-bottom: 16px; font-size: 13px; color: var(--text-muted);">Получено: ${dateStr}</div>
      <h3>👤 Данные клиента</h3>
      <div class="modal-grid">
        <div class="modal-field"><div class="label">Имя</div><div class="value">${r.client?.name || '—'}</div></div>
        <div class="modal-field"><div class="label">Телефон</div><div class="value"><a href="tel:${r.client?.phone}" style="color:var(--accent-light)">${r.client?.phone || '—'}</a></div></div>
        <div class="modal-field"><div class="label">Email</div><div class="value">${r.client?.email || '—'}</div></div>
        <div class="modal-field"><div class="label">Услуга</div><div class="value">${r.serviceName || '—'}</div></div>
      </div>
    </div>

    <div class="modal-section">
      <h3>📝 Сообщение</h3>
      <div class="modal-field"><div class="value">${r.description || 'Нет описания'}</div></div>
    </div>

    <div class="modal-section">
      <h3>⚙️ Управление</h3>
      <div class="modal-grid">
        <div class="field-group" style="display:flex;flex-direction:column;gap:6px;">
          <label class="label" style="font-size:11px;color:var(--text-muted);text-transform:uppercase;">Статус заявки</label>
          <select id="modalStatus" class="status-select">
            ${statusOptions.map(opt => `<option value="${opt}" ${r.status === opt ? 'selected' : ''}>${statusLabels[opt]}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="field-group" style="margin-top:16px;">
        <label class="label" style="font-size:11px;color:var(--text-muted);text-transform:uppercase;margin-bottom:6px;display:block;">Заметки администратора</label>
        <textarea id="modalNotes" class="admin-notes" placeholder="Внутренние заметки...">${r.adminNotes || ''}</textarea>
      </div>
      <button class="modal-save" onclick="saveRequestChanges('${r.id}')">💾 Сохранить изменения</button>
    </div>
  `;

  document.getElementById('modalOverlay').classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  document.getElementById('modalOverlay').classList.remove('active');
  document.body.style.overflow = '';
}

// ===== SAVE CHANGES =====
function saveRequestChanges(id) {
  const idx = allRequests.findIndex(r => r.id === id);
  if (idx === -1) return;

  allRequests[idx].status = document.getElementById('modalStatus').value;
  allRequests[idx].adminNotes = document.getElementById('modalNotes').value;

  localStorage.setItem('kk_requests', JSON.stringify(allRequests));
  updateStats();
  filterRequests();
  closeModal();
  showGalleryToast('✅ Изменения сохранены');
}

// ===== SIDEBAR NAV (with views) =====
const viewTitles = {
  requests: 'Tarjouspyynnöt',
  gallery: 'Referenssigalleria',
  stats: 'Tilastot'
};

document.querySelectorAll('.sidebar-nav a').forEach(link => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    document.querySelectorAll('.sidebar-nav a').forEach(a => a.classList.remove('active'));
    link.classList.add('active');
    const view = link.dataset.view;

    document.getElementById('pageTitle').textContent = viewTitles[view] || 'Tarjouspyynnöt';

    // Toggle view visibility
    document.getElementById('viewRequests').style.display = view === 'requests' ? '' : 'none';
    document.getElementById('viewGallery').style.display = view === 'gallery' ? '' : 'none';
    document.getElementById('viewStats').style.display = view === 'stats' ? '' : 'none';

    // Hide filter bar and header actions based on view
    const filterBar = document.querySelector('.filter-bar');
    const headerActions = document.querySelector('.header-actions');

    if (view === 'gallery') {
      if (headerActions) headerActions.style.display = 'none';
    } else {
      if (headerActions) headerActions.style.display = '';
    }

    // Close mobile sidebar
    document.getElementById('sidebar').classList.remove('open');
  });
});

// ===== MOBILE SIDEBAR =====
function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
}

// ===== ESC TO CLOSE =====
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeModal();
});

