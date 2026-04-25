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

// ===== LIGHTBOX =====
const lightbox = document.getElementById('lightbox');
const lightboxImg = document.getElementById('lightboxImg');

function openLightbox(el) {
  const img = el.querySelector('img');
  lightboxImg.src = img.src;
  lightboxImg.alt = img.alt;
  lightbox.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeLightbox() {
  lightbox.classList.remove('active');
  document.body.style.overflow = '';
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && lightbox.classList.contains('active')) closeLightbox();
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
  
  // Mailto fallback
  const subject = encodeURIComponent('Tarjouspyyntö - ' + name);
  const body = encodeURIComponent(
    'Nimi: ' + name + '\n' +
    'Puhelin: ' + phone + '\n' +
    'Sähköposti: ' + email + '\n' +
    'Palvelu: ' + service + '\n' +
    'Viesti: ' + message
  );
  
  window.location.href = 'mailto:fennoa.525363@erin.posti.com?subject=' + subject + '&body=' + body;
  
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
