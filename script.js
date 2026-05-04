// ===== NAVBAR SCROLL EFFECT =====
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
  navbar.classList.toggle('scrolled', window.scrollY > 50);
});

// ===== MOBILE MENU =====
const hamburger = document.getElementById('hamburger');
const mobileMenu = document.getElementById('mobileMenu');
const mobileOverlay = document.getElementById('mobileOverlay');

function toggleMenu() {
  hamburger.classList.toggle('active');
  mobileMenu.classList.toggle('active');
  mobileOverlay.classList.toggle('active');
  document.body.style.overflow = mobileMenu.classList.contains('active') ? 'hidden' : '';
}

hamburger.addEventListener('click', toggleMenu);
mobileOverlay.addEventListener('click', toggleMenu);

document.querySelectorAll('.mobile-menu a').forEach(link => {
  link.addEventListener('click', () => {
    if (mobileMenu.classList.contains('active')) toggleMenu();
  });
});

// ===== SCROLL ANIMATIONS =====
const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry, i) => {
    if (entry.isIntersecting) {
      setTimeout(() => entry.target.classList.add('visible'), i * 100);
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

document.querySelectorAll('.fade-in, .fade-in-left, .fade-in-right').forEach(el => observer.observe(el));

// ===== SMOOTH SCROLL =====
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function(e) {
    e.preventDefault();
    const target = document.querySelector(this.getAttribute('href'));
    if (target) target.scrollIntoView({ behavior: 'smooth' });
  });
});

// ===== PROJECTS GALLERY =====
const DEFAULT_PROJECTS = [
  { name: 'Bitumikattotyöt', photos: [{ src: 'images/ref-1.png', alt: 'Bitumikattotyöt Kuusamossa' }] },
  { name: 'Julkisivuremontti', photos: [{ src: 'images/ref-2.png', alt: 'Julkisivuremontti' }] },
  { name: 'Sisäremontit ja laatoitus', photos: [{ src: 'images/ref-3.png', alt: 'Sisäremontit ja laatoitus' }] },
  { name: 'Peltikattojen asennus', photos: [{ src: 'images/ref-4.png', alt: 'Peltikattojen asennus' }] }
];

let projectSections = [];
let allProjectPhotos = []; // flat list for lightbox navigation

function loadProjectSections() {
  // Try new format first
  const storedProjects = localStorage.getItem('kk_projects');
  if (storedProjects) {
    try {
      const parsed = JSON.parse(storedProjects);
      if (parsed && parsed.length > 0) {
        projectSections = parsed;
        return;
      }
    } catch (e) { /* fallback */ }
  }

  // Backward compat: try old gallery format and convert
  const storedGallery = localStorage.getItem('kk_gallery');
  if (storedGallery) {
    try {
      const parsed = JSON.parse(storedGallery);
      if (parsed && parsed.length > 0) {
        projectSections = parsed.map(photo => ({
          name: photo.title || 'Projekti',
          photos: [{ src: photo.src, alt: photo.alt || photo.title || 'Projekti' }]
        }));
        // Save in new format
        localStorage.setItem('kk_projects', JSON.stringify(projectSections));
        return;
      }
    } catch (e) { /* fallback */ }
  }

  projectSections = JSON.parse(JSON.stringify(DEFAULT_PROJECTS));
}

function buildAllPhotosIndex() {
  allProjectPhotos = [];
  projectSections.forEach((section, si) => {
    section.photos.forEach((photo, pi) => {
      allProjectPhotos.push({
        src: photo.src,
        alt: photo.alt || section.name,
        sectionName: section.name,
        sectionIndex: si,
        photoIndex: pi
      });
    });
  });
}

function renderProjectSections() {
  loadProjectSections();
  projectSections = projectSections.filter(s => s.published !== false);
  buildAllPhotosIndex();

  const container = document.getElementById('projectsGrid');
  if (!container) return;

  if (projectSections.length === 0) {
    container.innerHTML = '<p style="text-align:center;color:#6B7280;grid-column:1/-1;">Ei projekteja vielä.</p>';
    return;
  }

  // Update container class for the new grid layout
  container.className = 'projects-album-grid';

  let html = '';
  projectSections.forEach((section, si) => {
    if (section.photos.length === 0) return;
    
    // Find index of the first photo of this section in the global allProjectPhotos array
    const coverPhotoIndex = allProjectPhotos.findIndex(p => p.sectionIndex === si && p.photoIndex === 0);
    const coverPhoto = section.photos[0];

    html += `
      <div class="project-album-card fade-in" onclick="openLightbox(${coverPhotoIndex})">
        <img src="${coverPhoto.src}" alt="${coverPhoto.alt || section.name}" loading="lazy">
        <div class="album-overlay">
          <h3 class="album-title">${section.name}</h3>
          ${section.photos.length > 1 ? `<div class="album-count"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg> ${section.photos.length}</div>` : ''}
        </div>
      </div>
    `;
  });

  container.innerHTML = html;

  // Re-observe new fade-in elements
  container.querySelectorAll('.fade-in').forEach(el => observer.observe(el));
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', renderProjectSections);

// ===== LIGHTBOX =====
const lightbox = document.getElementById('lightbox');
const lightboxImg = document.getElementById('lightboxImg');
const lightboxCaption = document.getElementById('lightboxCaption');
let lightboxIndex = 0;

function openLightbox(index) {
  lightboxIndex = index;
  updateLightbox();
  lightbox.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function updateLightbox() {
  const photo = allProjectPhotos[lightboxIndex];
  if (!photo) return;
  lightboxImg.src = photo.src;
  lightboxImg.alt = photo.alt || '';
  if (lightboxCaption) {
    lightboxCaption.textContent = photo.sectionName || photo.alt || '';
  }
}

function lightboxNavigate(direction) {
  const total = allProjectPhotos.length;
  lightboxIndex = (lightboxIndex + direction + total) % total;
  updateLightbox();
}

function closeLightbox() {
  lightbox.classList.remove('active');
  document.body.style.overflow = '';
}

// Close lightbox on background click
lightbox.addEventListener('click', (e) => {
  if (e.target === lightbox) closeLightbox();
});

// ===== KEYBOARD NAVIGATION =====
document.addEventListener('keydown', (e) => {
  if (lightbox.classList.contains('active')) {
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowLeft') lightboxNavigate(-1);
    if (e.key === 'ArrowRight') lightboxNavigate(1);
  }
});

// ===== FORM HANDLING =====
function handleSubmit(e) {
  e.preventDefault();
  const form = document.getElementById('contactForm');
  const success = document.getElementById('formSuccess');
  
  // Collect form data
  const data = new FormData(form);
  const name = data.get('name');
  const phone = data.get('phone');
  const email = data.get('email') || 'ei annettu';
  const service = data.get('service') || 'ei valittu';
  const message = data.get('message') || 'ei viestiä';
  
  // Create request object
  const newRequest = {
    id: 'REQ-' + Math.random().toString(36).substr(2, 9).toUpperCase(),
    client: { name: name, phone: phone, email: email },
    serviceName: service,
    description: message,
    status: 'processing',
    createdAt: new Date().toISOString()
  };

  // Save to localStorage
  const existingRequests = JSON.parse(localStorage.getItem('kk_requests') || '[]');
  existingRequests.push(newRequest);
  localStorage.setItem('kk_requests', JSON.stringify(existingRequests));
  
  // Show success message
  form.style.display = 'none';
  success.classList.add('active');
  
  setTimeout(() => {
    form.style.display = '';
    form.reset();
    success.classList.remove('active');
  }, 5000);
}

// ===== ACTIVE NAV HIGHLIGHT =====
const sections = document.querySelectorAll('section[id]');
window.addEventListener('scroll', () => {
  let current = '';
  sections.forEach(section => {
    const top = section.offsetTop - 100;
    if (window.scrollY >= top) current = section.getAttribute('id');
  });
  document.querySelectorAll('.nav-links a:not(.nav-cta)').forEach(link => {
    link.style.opacity = link.getAttribute('href') === '#' + current ? '1' : '';
  });
});
