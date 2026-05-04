const DEFAULT_PROJECTS = [
  { name: 'Bitumikattotyöt', photos: [{ src: 'images/ref-1.png', alt: 'Bitumikattotyöt Kuusamossa' }] }
];
let projectSections = DEFAULT_PROJECTS;
let globalPhotoIndex = 0;
const html = projectSections.map((section) => {
    const photoCount = section.photos.length;
    const photosHtml = section.photos.map((photo) => {
      const idx = globalPhotoIndex++;
      return `
        <div class="project-photo" onclick="openLightbox(${idx})">
          <img src="${photo.src}" alt="${photo.alt || section.name}" loading="lazy">
          <div class="photo-overlay"></div>
        </div>
      `;
    }).join('');

    return `
      <div class="project-section fade-in">
        <h3 class="project-section-title">${section.name}</h3>
        <div class="project-photos-grid photos-${Math.min(photoCount, 5)}">
          ${photosHtml}
        </div>
      </div>
    `;
  }).join('');
console.log(html);
