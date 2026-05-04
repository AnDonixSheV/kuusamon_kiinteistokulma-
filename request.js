// ===== REQUEST PAGE LOGIC =====

// ===== STATE =====
let currentStep = 1;
let uploadedPhotos = []; // {file, dataUrl}
let uploadedPlan = null; // {file, dataUrl}
let chatActive = false;
let isProcessing = false;

// ===== STEP NAVIGATION =====
function goToStep(step) {
  // Validate before going forward
  if (step > currentStep) {
    if (!validateStep(currentStep)) return;
  }

  // Hide current step
  document.getElementById(`step${currentStep}`).classList.remove('active');
  // Show new step
  document.getElementById(`step${step}`).classList.add('active');

  // Update progress bar
  document.querySelectorAll('.progress-step').forEach((el, i) => {
    el.classList.remove('active', 'done');
    if (i + 1 < step) el.classList.add('done');
    if (i + 1 === step) el.classList.add('active');
  });

  currentStep = step;
}

function validateStep(step) {
  if (step === 1) {
    const name = document.getElementById('clientName').value.trim();
    const phone = document.getElementById('clientPhone').value.trim();
    const service = document.getElementById('serviceType').value;
    if (!name) { shakeField('clientName'); return false; }
    if (!phone) { shakeField('clientPhone'); return false; }
    if (!service) { shakeField('serviceType'); return false; }
    return true;
  }
  if (step === 3) {
    const desc = document.getElementById('taskDescription').value.trim();
    if (!desc) { shakeField('taskDescription'); return false; }
    return true;
  }
  return true;
}

function shakeField(id) {
  const el = document.getElementById(id);
  el.style.borderColor = '#e53e3e';
  el.style.animation = 'shake 0.4s ease';
  el.focus();
  setTimeout(() => {
    el.style.borderColor = '';
    el.style.animation = '';
  }, 1000);
}

// Add shake animation
const shakeStyle = document.createElement('style');
shakeStyle.textContent = `@keyframes shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-6px); } 75% { transform: translateX(6px); } }`;
document.head.appendChild(shakeStyle);

// ===== PHOTO UPLOAD =====
const photoInput = document.getElementById('photoInput');
const photoZone = document.getElementById('photoUploadZone');
const photoPreviews = document.getElementById('photoPreviews');

photoInput.addEventListener('change', handlePhotoSelect);
photoZone.addEventListener('dragover', (e) => { e.preventDefault(); photoZone.classList.add('dragover'); });
photoZone.addEventListener('dragleave', () => { photoZone.classList.remove('dragover'); });
photoZone.addEventListener('drop', (e) => {
  e.preventDefault();
  photoZone.classList.remove('dragover');
  handleFiles(e.dataTransfer.files, 'photo');
});

function handlePhotoSelect(e) {
  handleFiles(e.target.files, 'photo');
}

function handleFiles(files, type) {
  const fileArray = Array.from(files);
  fileArray.forEach(file => {
    if (!file.type.startsWith('image/')) return;

    if (type === 'photo' && uploadedPhotos.length >= 5) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      if (type === 'photo') {
        uploadedPhotos.push({ file: file, dataUrl: e.target.result });
        renderPhotoPreviews();
      } else {
        uploadedPlan = { file: file, dataUrl: e.target.result };
        renderPlanPreview();
      }
    };
    reader.readAsDataURL(file);
  });
}

function renderPhotoPreviews() {
  photoPreviews.innerHTML = uploadedPhotos.map((p, i) => `
    <div class="photo-preview">
      <img src="${p.dataUrl}" alt="Valokuva ${i + 1}">
      <button class="remove-photo" onclick="removePhoto(${i})">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    </div>
  `).join('');
}

function removePhoto(index) {
  uploadedPhotos.splice(index, 1);
  renderPhotoPreviews();
}

// ===== PLAN UPLOAD =====
const planInput = document.getElementById('planInput');
const planZone = document.getElementById('planUploadZone');
const planPreview = document.getElementById('planPreview');

planInput.addEventListener('change', (e) => { handleFiles(e.target.files, 'plan'); });
planZone.addEventListener('dragover', (e) => { e.preventDefault(); planZone.classList.add('dragover'); });
planZone.addEventListener('dragleave', () => { planZone.classList.remove('dragover'); });
planZone.addEventListener('drop', (e) => {
  e.preventDefault();
  planZone.classList.remove('dragover');
  handleFiles(e.dataTransfer.files, 'plan');
});

function renderPlanPreview() {
  if (!uploadedPlan) { planPreview.innerHTML = ''; return; }
  planPreview.innerHTML = `
    <div class="photo-preview">
      <img src="${uploadedPlan.dataUrl}" alt="Pohjapiirustus">
      <button class="remove-photo" onclick="removePlan()">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    </div>
  `;
}

function removePlan() {
  uploadedPlan = null;
  renderPlanPreview();
}

// ===== AI CHAT =====
const chatMessages = document.getElementById('chatMessages');
const chatInputArea = document.getElementById('chatInputArea');
const chatInput = document.getElementById('chatInput');
const chatSendBtn = document.getElementById('chatSendBtn');

async function startAIChat() {
  if (!validateStep(3)) return;

  goToStep(4);
  chatActive = true;

  // Enable chat
  chatInputArea.classList.remove('disabled');
  chatInput.disabled = false;
  chatSendBtn.disabled = false;

  // Clear placeholder
  chatMessages.innerHTML = '';

  // Show summary
  const service = document.getElementById('serviceType').value;
  const desc = document.getElementById('taskDescription').value;
  document.getElementById('summaryContent').innerHTML = `
    <strong>Palvelu:</strong> ${document.getElementById('serviceType').selectedOptions[0].text}<br>
    <strong>Valokuvat:</strong> ${uploadedPhotos.length} kpl<br>
    <strong>Pohjapiirustus:</strong> ${uploadedPlan ? 'Kyllä' : 'Ei'}<br>
    <strong>Kuvaus:</strong> ${desc.substring(0, 150)}${desc.length > 150 ? '...' : ''}
  `;

  // Init AI conversation
  const result = AIEstimator.initConversation(
    service,
    desc,
    uploadedPhotos.map(p => p.dataUrl),
    uploadedPlan ? uploadedPlan.dataUrl : null
  );

  // Show greeting
  addMessage('ai', result.greeting);

  // Show typing, then first question
  showTyping();
  const firstQ = await AIEstimator.getFirstQuestion();
  hideTyping();

  if (firstQ.type === 'question') {
    addMessage('ai', firstQ.message);
  } else if (firstQ.type === 'estimate') {
    showEstimate(firstQ.estimate);
  }

  chatInput.focus();
}

async function sendChatMessage() {
  const text = chatInput.value.trim();
  if (!text || isProcessing) return;

  isProcessing = true;
  addMessage('user', text);
  chatInput.value = '';
  chatInput.style.height = 'auto';

  // Disable input while processing
  chatSendBtn.disabled = true;

  showTyping();
  const response = await AIEstimator.sendMessage(text);
  hideTyping();

  if (response.type === 'question') {
    addMessage('ai', response.message);
  } else if (response.type === 'estimate') {
    showEstimate(response.estimate);
  }

  chatSendBtn.disabled = false;
  isProcessing = false;
  chatInput.focus();
}

function addMessage(type, text) {
  const msgDiv = document.createElement('div');
  msgDiv.className = `message ${type}`;

  const avatarSvg = type === 'ai'
    ? '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a4 4 0 0 1 4 4v2a4 4 0 0 1-8 0V6a4 4 0 0 1 4-4z"/><rect x="2" y="12" width="20" height="10" rx="4"/></svg>'
    : '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>';

  // Format text with markdown-like bold
  let formattedText = text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br>');

  msgDiv.innerHTML = `
    <div class="message-avatar">${avatarSvg}</div>
    <div class="message-bubble">${formattedText}</div>
  `;

  chatMessages.appendChild(msgDiv);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function showEstimate(estimate) {
  const estimateDiv = document.createElement('div');
  estimateDiv.className = 'message ai';
  estimateDiv.innerHTML = `
    <div class="message-avatar">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a4 4 0 0 1 4 4v2a4 4 0 0 1-8 0V6a4 4 0 0 1 4-4z"/><rect x="2" y="12" width="20" height="10" rx="4"/></svg>
    </div>
    <div>
      <div class="message-bubble" style="margin-bottom:12px;">Analysointini on valmis! Tässä on alustava hinta-arvio:</div>
      <div class="estimate-card">
        <h2>📊 Alustava hinta-arvio</h2>
        <p><strong>Palvelu:</strong> ${estimate.service}</p>
        <p><strong>Laajuus:</strong> ~${estimate.area} ${estimate.unit.includes('m²') ? 'm²' : estimate.unit.includes('jm') ? 'jm' : 'yks.'}</p>
        <p><strong>Materiaali:</strong> ${estimate.material}</p>
        <div class="estimate-price">💰 ${estimate.totalPrice.min.toLocaleString('fi-FI')} – ${estimate.totalPrice.max.toLocaleString('fi-FI')} €</div>
        <p class="estimate-details" style="font-size:13px;color:#6B7280;">(sis. ALV 25,5%) • ${estimate.pricePerUnit.min}–${estimate.pricePerUnit.max} ${estimate.unit}</p>
        <div class="estimate-section">
          <h4>✅ Hintaan sisältyy</h4>
          <ul class="estimate-details">${estimate.includes.map(i => `<li>${i}</li>`).join('')}</ul>
        </div>
        <div class="estimate-section">
          <h4>❌ Hintaan ei sisälly</h4>
          <ul class="estimate-details">${estimate.excludes.map(i => `<li>${i}</li>`).join('')}</ul>
        </div>
        <div class="estimate-section">
          <h4>⏱️ ${estimate.timeline}</h4>
        </div>
        <p class="estimate-disclaimer">⚠️ ${estimate.disclaimer}</p>
        <div class="estimate-actions">
          <button class="btn-accept" onclick="acceptEstimate()">✅ Tilaa työ</button>
          <button class="btn-decline" onclick="declineEstimate()">Ei kiitos</button>
        </div>
      </div>
    </div>
  `;

  chatMessages.appendChild(estimateDiv);
  chatMessages.scrollTop = chatMessages.scrollHeight;

  // Disable chat input
  chatInputArea.classList.add('disabled');
  chatInput.disabled = true;
  chatSendBtn.disabled = true;
}

function showTyping() {
  const typingDiv = document.createElement('div');
  typingDiv.className = 'typing-indicator';
  typingDiv.id = 'typingIndicator';
  typingDiv.innerHTML = '<span></span><span></span><span></span>';
  chatMessages.appendChild(typingDiv);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function hideTyping() {
  const el = document.getElementById('typingIndicator');
  if (el) el.remove();
}

// ===== ACCEPT / DECLINE =====
function acceptEstimate() {
  const clientInfo = {
    name: document.getElementById('clientName').value.trim(),
    phone: document.getElementById('clientPhone').value.trim(),
    email: document.getElementById('clientEmail').value.trim()
  };

  const request = AIEstimator.saveRequest(clientInfo);

  // Show success
  document.getElementById('successRequestId').textContent = `Tunnus: ${request.id}`;
  document.getElementById('successOverlay').classList.add('active');
}

function declineEstimate() {
  addMessage('ai', 'Kiitos ajastanne! Arvio on tallennettu ja voitte palata asiaan myöhemmin. Jos teillä on kysymyksiä, soittakaa meille: **+358 40 020 3709**');

  // Save anyway with "declined" status
  const clientInfo = {
    name: document.getElementById('clientName').value.trim(),
    phone: document.getElementById('clientPhone').value.trim(),
    email: document.getElementById('clientEmail').value.trim()
  };
  const conv = AIEstimator.getConversation();
  const requests = JSON.parse(localStorage.getItem('kk_requests') || '[]');
  requests.unshift({
    id: conv.requestId,
    status: 'declined',
    createdAt: new Date().toISOString(),
    client: clientInfo,
    service: conv.service,
    serviceName: document.getElementById('serviceType').selectedOptions[0].text.replace(/^[^\w]+ /, ''),
    description: conv.description,
    photos: conv.photos,
    plan: conv.plan,
    messages: conv.messages,
    estimate: null,
    area: conv.area,
    complexity: conv.complexity,
    adminNotes: '',
    adminPrice: null
  });
  localStorage.setItem('kk_requests', JSON.stringify(requests));
}

// ===== CHAT INPUT HANDLERS =====
chatInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendChatMessage();
  }
});

chatInput.addEventListener('input', () => {
  chatInput.style.height = 'auto';
  chatInput.style.height = Math.min(chatInput.scrollHeight, 120) + 'px';
});
