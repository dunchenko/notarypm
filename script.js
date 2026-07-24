// Simple client-side calendar and time-slot picker

// Hamburger menu toggle
(function(){
  const hamburgerBtn = document.getElementById('hamburgerBtn');
  const navLinks = document.getElementById('navLinks');
  
  if(hamburgerBtn && navLinks){
    hamburgerBtn.addEventListener('click', () => {
      const isActive = hamburgerBtn.classList.toggle('active');
      navLinks.classList.toggle('active');
      // add a theme class so CSS can style the overlay; lock body scroll
      if(isActive){
        navLinks.classList.add('menu-theme-bw');
        document.body.classList.add('menu-open');
      } else {
        navLinks.classList.remove('menu-theme-bw');
        document.body.classList.remove('menu-open');
      }
    });
    
    // Close menu when a link is clicked
    navLinks.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        hamburgerBtn.classList.remove('active');
        navLinks.classList.remove('active');
        navLinks.classList.remove('menu-theme-bw');
        document.body.classList.remove('menu-open');
      });
    });
    
    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
      if(!hamburgerBtn.contains(e.target) && !navLinks.contains(e.target)){
        hamburgerBtn.classList.remove('active');
        navLinks.classList.remove('active');
        navLinks.classList.remove('menu-theme-bw');
        document.body.classList.remove('menu-open');
      }
    });
  }
})();

(function(){
  const modalTriggers = document.querySelectorAll('[data-modal-target]');
  const modalClosers = document.querySelectorAll('.modal-close');
  const modalOverlays = document.querySelectorAll('.modal-overlay');

  function closeModal(modal){
    modal.classList.remove('active');
    document.body.classList.remove('modal-open');
    modal.setAttribute('aria-hidden', 'true');
  }

  function openModal(modal){
    modal.classList.add('active');
    document.body.classList.add('modal-open');
    modal.setAttribute('aria-hidden', 'false');
  }

  modalTriggers.forEach(trigger => {
    trigger.addEventListener('click', (e) => {
      e.preventDefault();
      const target = document.getElementById(trigger.dataset.modalTarget);
      if(target) openModal(target);
    });
  });

  modalClosers.forEach(button => {
    button.addEventListener('click', () => {
      const modal = button.closest('.modal-overlay');
      if(modal) closeModal(modal);
    });
  });

  modalOverlays.forEach(overlay => {
    overlay.addEventListener('click', (e) => {
      if(e.target === overlay){
        closeModal(overlay);
      }
    });
  });
})();

// Initialize custom selects first
(function(){
  const customSelects = document.querySelectorAll('.custom-select');
  
  customSelects.forEach(select => {
    const header = select.querySelector('.custom-select-header');
    const dropdown = select.querySelector('.custom-select-dropdown');
    const options = select.querySelectorAll('.custom-option');
    const hiddenInput = select.closest('.custom-select-wrapper').querySelector('input[type="hidden"]');
    
    // Initialize selected state from hidden input
    const initVal = hiddenInput && hiddenInput.value ? hiddenInput.value : header.textContent.trim();
    if(initVal){
      options.forEach(o => {
        if(o.getAttribute('data-value') === initVal){
          o.classList.add('selected');
        }
      });
      // ensure header shows initial value
      header.textContent = initVal;
      if(hiddenInput) hiddenInput.value = initVal;
    }

    // Open/close dropdown — hide currently selected option when opening
    header.addEventListener('click', (e) => {
      e.stopPropagation();
      customSelects.forEach(s => {
        if (s !== select) {
          s.classList.remove('open');
          // restore options visibility for other selects
          s.querySelectorAll('.custom-option').forEach(o => o.style.display = '');
        }
      });
      // hide option that matches current value
      const current = hiddenInput && hiddenInput.value ? hiddenInput.value : header.textContent.trim();
      options.forEach(o => {
        if(o.getAttribute('data-value') === current) o.style.display = 'none'; else o.style.display = '';
      });
      // before toggling open, compute dropdown width/position so it matches the header exactly
      const dropdown = select.querySelector('.custom-select-dropdown');
      if(dropdown){
        // reset inline styles first
        dropdown.style.width = '';
        dropdown.style.left = '';
        dropdown.style.right = '';
      }
      select.classList.toggle('open');
      if(select.classList.contains('open') && dropdown){
        // Measure the select control and apply exact width to dropdown to avoid visual mismatch across viewports
        const selRect = select.getBoundingClientRect();
        const borderLeft = parseFloat(window.getComputedStyle(select).borderLeftWidth) || 0;
        // Set dropdown to the full width of the select (including borders) and offset by negative left border
        dropdown.style.boxSizing = 'border-box';
        dropdown.style.width = `${Math.round(selRect.width)}px`;
        dropdown.style.left = `${-Math.round(borderLeft)}px`;
        dropdown.style.right = 'auto';
      }
    });
    
    // Handle option selection
    options.forEach(option => {
      option.addEventListener('click', () => {
        const value = option.getAttribute('data-value');
        header.textContent = value;
        if(hiddenInput) hiddenInput.value = value;
        
        options.forEach(o => o.classList.remove('selected'));
        option.classList.add('selected');
        
        // hide the newly selected option so it's not shown in the list
        options.forEach(o => o.style.display = o.getAttribute('data-value') === value ? 'none' : '');

        select.classList.remove('open');
      });
    });
  });
  
  // Close dropdowns when clicking outside
  document.addEventListener('click', () => {
    customSelects.forEach(select => select.classList.remove('open'));
  });
})();

const monthLabel = document.getElementById('monthLabel');
const prevMonth = document.getElementById('prevMonth');
const nextMonth = document.getElementById('nextMonth');
const calendarDays = document.getElementById('calendarDays');
const timeSlots = document.getElementById('timeSlots');
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

let current = new Date();
let selectedDate = null;

function normalizeCoverageAddressSpacing(){
  document.querySelectorAll('.coverage-list li').forEach(li => {
    li.childNodes.forEach(node => {
      if(node.nodeType === Node.TEXT_NODE){
        node.textContent = node.textContent.replace(/,\s+/g, ',\u00A0');
      }
    });
  });
}

function initLoadAnimations(){
  normalizeCoverageAddressSpacing();

  const heroTargets = document.querySelectorAll('.hero-copy .eyebrow, .hero-copy h1, .hero-copy .lead, .hero-actions, .trust-list, .hero-card');
  const cardTargets = document.querySelectorAll('.section-heading, .info-card, .booking-card');
  const listTargets = document.querySelectorAll('.coverage-list li');

  heroTargets.forEach((el, index) => {
    el.classList.add('animate-on-load');
    el.dataset.variant = 'hero';
    el.style.setProperty('--delay', `${index * 0.08}s`);
  });

  cardTargets.forEach((el, index) => {
    el.classList.add('animate-on-load');
    el.dataset.variant = 'card';
    el.style.setProperty('--delay', `${0.18 + index * 0.08}s`);
  });

  listTargets.forEach((el, index) => {
    el.classList.add('animate-on-load');
    el.dataset.variant = 'list';
    el.style.setProperty('--delay', `${0.28 + index * 0.05}s`);
  });

  const animatedElements = [...heroTargets, ...cardTargets, ...listTargets];

  requestAnimationFrame(() => {
    document.body.classList.add('page-loaded');
    animatedElements.forEach((el, index) => {
      window.setTimeout(() => el.classList.add('is-visible'), prefersReducedMotion ? 0 : index * 120);
    });
  });
}

const availability = {
  // isoDate: ["09:00","10:00","11:30"]
};

function formatLocalIsoDate(date){
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function start(){
  renderMonth(current);
  var todayIso = formatLocalIsoDate(new Date());
  var todayButton = calendarDays.querySelector('.calendar-day.today');
  if(todayButton){ selectDay(todayIso, todayButton); }
  prevMonth.addEventListener('click',()=>{current.setMonth(current.getMonth()-1);renderMonth(current)});
  nextMonth.addEventListener('click',()=>{current.setMonth(current.getMonth()+1);renderMonth(current)});
}

function renderMonth(date){
  calendarDays.innerHTML='';
  const year = date.getFullYear();
  const month = date.getMonth();
  monthLabel.textContent = date.toLocaleString('default',{month:'long', year: 'numeric'});

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month+1, 0).getDate();
  const todayIso = formatLocalIsoDate(new Date());

  // blanks
  for(let i=0;i<firstDay;i++){
    const cell = document.createElement('div');
    cell.className='calendar-day inactive';
    calendarDays.appendChild(cell);
  }

  for(let d=1; d<=daysInMonth; d++){
    const cell = document.createElement('button');
    cell.className='calendar-day';
    const iso = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    cell.textContent = d;
    // mark today
    if(iso === todayIso) cell.classList.add('today');

    // mark past days as inactive/disabled so they show plain text
    if(iso < todayIso){
      cell.classList.add('inactive');
      cell.disabled = true;
      cell.setAttribute('aria-disabled', 'true');
    } else {
      // future or today: attach click handler
      cell.addEventListener('click', ()=>selectDay(iso, cell));
    }
    calendarDays.appendChild(cell);
  }
}

function selectDay(iso, node){
  selectedDate = iso;
  // mark selected
  Array.from(calendarDays.children).forEach(c=>c.classList.remove('selected'));
  node.classList.add('selected');
  renderTimeSlots(iso);
}

function renderTimeSlots(iso){
  timeSlots.innerHTML='';
  const defaultSlots = ["18:00","19:00","20:00","21:00"];
  const slots = availability[iso] || defaultSlots;
  // threshold: disable slots that are within 4 hours (user requested "меньше чем 4 часа")
  const THRESHOLD_MS = 4 * 60 * 60 * 1000; // 4 hours in milliseconds
  slots.forEach(s=>{
    const btn = document.createElement('button');
    btn.className='time-chip';
    btn.textContent = s;
    // compute slot datetime in local time and how far away it is
    try{
      const slotDate = new Date(`${iso}T${s}:00`);
      const diff = slotDate - Date.now();
      // If the slot is sooner than the threshold (less than 4 hours away) or in the past, disable it
      if(diff < THRESHOLD_MS){
        btn.disabled = true;
        btn.setAttribute('aria-disabled', 'true');
        btn.classList.add('disabled-future');
      } else {
        // Single click selects the time into the intake form; double-click opens booking mail
        btn.addEventListener('click', ()=>selectTimeFromSlot(iso, s, btn));
        btn.addEventListener('dblclick', ()=>confirmBooking(iso,s));
      }
    }catch(e){
      // fallback: attach handlers if date parsing fails
      btn.addEventListener('click', ()=>selectTimeFromSlot(iso, s, btn));
      btn.addEventListener('dblclick', ()=>confirmBooking(iso,s));
    }
    timeSlots.appendChild(btn);
  });
}

function confirmBooking(iso, time){
  const body = encodeURIComponent(`I'd like to book a notary appointment on ${iso} at ${time}. Please confirm availability and fees.`);
  window.location.href = `mailto:hanna@notaryservice.ca?subject=Booking%20Request&body=${body}`;
}

// Select a time slot: populate the intake form inputs and mark the slot visually
function selectTimeFromSlot(iso, time, btn){
  try{
    const timeInput = document.querySelector('input[name="preferredTime"]');
    const dateInput = document.querySelector('input[name="preferredDate"]');
    if(dateInput) dateInput.value = iso;
    if(timeInput) timeInput.value = time;

    // Visual selection on the chips
    if(timeSlots){
      Array.from(timeSlots.querySelectorAll('.time-chip')).forEach(b=>b.classList.remove('selected'));
    }
    if(btn) btn.classList.add('selected');

    if(timeInput) timeInput.focus();
  }catch(e){console.warn('selectTimeFromSlot failed', e)}
}

initLoadAnimations();
start();

// Simple reveal animations
const observer = new IntersectionObserver((items)=>{
  items.forEach(i=>{ if(i.isIntersecting) i.target.classList.add('reveal'); });
},{threshold:0.12});
document.querySelectorAll('.info-card, .hero-card, .booking-card, .map-card').forEach(el=>observer.observe(el));

// FAQ Toggle
function toggleFaq(button){
  const isActive = button.classList.contains('active');
  document.querySelectorAll('.faq-question').forEach(btn => btn.classList.remove('active'));
  if(!isActive) button.classList.add('active');
}

// Coverage list -> Leaflet map and Navigation link (fallback for Google embed)
const coverageList = document.getElementById('coverageList');
const navBtn = document.getElementById('navBtn');
const leafletContainer = document.getElementById('leafletMap');
const mapFrame = document.getElementById('mapFrame');
let map = null;
let marker = null;

async function geocode(address){
  const q = encodeURIComponent(address);
  try{
    const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${q}`);
    const data = await res.json();
    if(data && data.length) return {lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon)};
  }catch(e){console.warn('Geocode failed', e)}
  return null;
}

// Referral link helper: append current page URL as `referrer` query param
document.addEventListener('DOMContentLoaded', () => {
  try {
    const refLink = document.querySelector('.hypno-text a');
    if(!refLink) return;

    refLink.addEventListener('click', (e) => {
      // Build a URL that preserves the original host/path and appends a fixed referrer
      const original = refLink.getAttribute('href') || refLink.href;
      // Use site root as the referrer per request
      const ref = encodeURIComponent('http://www.notaryservice.ca');
      const separator = original.includes('?') ? '&' : '?';
      const newUrl = `${original}${separator}referrer=${ref}`;

      // Open in a new tab/window to preserve target semantics and prevent navigation interruption
      window.open(newUrl, '_blank', 'noopener');
      e.preventDefault();
    });
  } catch (err) {
    console.warn('Referral link handler failed', err);
  }
});

async function setMapForAddress(address){
  if(!address) return;
  // set navigation link to Google Maps directions
  const q = encodeURIComponent(address);
  navBtn.href = `https://www.google.com/maps/dir/?api=1&destination=${q}`;

  // If a Google Maps Embed API key is provided via global, prefer iframe embed
  const gKey = window?.GOOGLE_MAPS_API_KEY || null;
  if(gKey && mapFrame){
    // hide leaflet container and show iframe
    if(leafletContainer) leafletContainer.style.display = 'none';
    mapFrame.style.display = 'block';
    mapFrame.src = `https://www.google.com/maps/embed/v1/place?key=${gKey}&q=${q}`;
    return;
  } else {
    // ensure iframe hidden
    if(mapFrame) mapFrame.style.display = 'none';
    if(leafletContainer) leafletContainer.style.display = '';
  }

  const coords = await geocode(address);
  if(typeof L === 'undefined'){
    // Leaflet not available (CDN blocked). Show a fallback link that opens Google Maps.
    if(leafletContainer){
      leafletContainer.innerHTML = `
        <a class="map-fallback" href="https://www.google.com/maps?q=${q}" target="_blank" rel="noopener">
          Open ${address} in Google Maps
        </a>`;
    }
    return;
  }

  if(!coords){
    if(leafletContainer) leafletContainer.innerHTML = '<div style="padding:24px">Map not available for this address.</div>';
    return;
  }

  if(!map){
    map = L.map('leafletMap', {attributionControl:false}).setView([coords.lat, coords.lon], 14);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
    }).addTo(map);
    marker = L.marker([coords.lat, coords.lon]).addTo(map);
  } else {
    map.setView([coords.lat, coords.lon], 14);
    if(marker) marker.setLatLng([coords.lat, coords.lon]);
    else marker = L.marker([coords.lat, coords.lon]).addTo(map);
  }
}

if(coverageList){
  const items = Array.from(coverageList.querySelectorAll('li'));
  items.forEach((li)=>{
    li.addEventListener('click', ()=>{
      items.forEach(i=>i.classList.remove('selected'));
      li.classList.add('selected');
      setMapForAddress(li.dataset.address);
    });
  });
  const first = items[0];
  if(first){ first.classList.add('selected'); setMapForAddress(first.dataset.address); }
}

// Minimal intake form handling
const intakeForm = document.getElementById('intakeForm');
const intakeStatus = document.getElementById('intakeStatus');
const intakeClear = document.getElementById('intakeClear');
const attachmentInput = document.getElementById('attachmentInput');
const attachmentDropzone = document.getElementById('attachmentDropzone');
const attachmentStatus = document.getElementById('attachmentStatus');
const attachmentList = document.getElementById('attachmentList');

function serializeForm(form){
  const data = {};
  const formData = new FormData(form);
  formData.forEach((value, key) => {
    if (value instanceof File) {
      if (!data[key]) data[key] = [];
      data[key].push({ name: value.name, size: value.size, type: value.type });
    } else {
      data[key] = value;
    }
  });
  return data;
}

function validateEmail(email){ return /\S+@\S+\.\S+/.test(email); }

function resetAttachmentUI(){
  if(attachmentStatus) attachmentStatus.textContent = 'Ready for future Drive integration';
  if(attachmentList) attachmentList.innerHTML = '';
  if(attachmentDropzone) attachmentDropzone.classList.remove('has-files', 'drag-active');
  if(attachmentInput) attachmentInput.value = '';
}

function renderAttachmentFiles(files){
  const selectedFiles = Array.from(files || []);
  if(attachmentStatus){
    attachmentStatus.textContent = selectedFiles.length
      ? `${selectedFiles.length} file${selectedFiles.length > 1 ? 's' : ''} ready for review`
      : 'Ready for your intake review';
  }
  if(attachmentList){
    attachmentList.innerHTML = '';
    selectedFiles.forEach((file, index) => {
      const item = document.createElement('li');
      item.innerHTML = `<span>${file.name}</span><small>${Math.round(file.size / 1024)} KB</small><button type="button" class="attachment-remove" data-index="${index}" aria-label="Remove file" title="Remove">✕</button>`;
      attachmentList.appendChild(item);
      
      const removeBtn = item.querySelector('.attachment-remove');
      if(removeBtn) {
        removeBtn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          removeAttachmentFile(index);
        });
      }
    });
  }
  if(attachmentDropzone){ attachmentDropzone.classList.toggle('has-files', selectedFiles.length > 0); }
}

function removeAttachmentFile(index){
  const files = Array.from(attachmentInput.files);
  files.splice(index, 1);
  
  const dataTransfer = new DataTransfer();
  files.forEach(file => dataTransfer.items.add(file));
  attachmentInput.files = dataTransfer.files;
  
  renderAttachmentFiles(attachmentInput.files);
}

if(attachmentInput && attachmentDropzone){
  const openPicker = () => attachmentInput.click();

  attachmentDropzone.addEventListener('click', (event) => {
    if(event.target.closest('button')) return;
    openPicker();
  });

  attachmentDropzone.addEventListener('keydown', (event) => {
    if(event.key === 'Enter' || event.key === ' '){
      event.preventDefault();
      openPicker();
    }
  });

  ['dragenter','dragover'].forEach(type => {
    attachmentDropzone.addEventListener(type, (event) => {
      event.preventDefault();
      attachmentDropzone.classList.add('drag-active');
    });
  });

  ['dragleave','drop'].forEach(type => {
    attachmentDropzone.addEventListener(type, (event) => {
      event.preventDefault();
      attachmentDropzone.classList.remove('drag-active');
    });
  });

  attachmentDropzone.addEventListener('drop', (event) => {
    const files = event.dataTransfer?.files;
    if(files && files.length){
      attachmentInput.files = files;
      renderAttachmentFiles(Array.from(files));
    }
  });

  attachmentInput.addEventListener('change', (event) => {
    renderAttachmentFiles(Array.from(event.target.files || []));
  });
}

const intakeFields = document.querySelectorAll(
  '.intake-form input[type="text"], .intake-form input[type="email"], .intake-form input[type="tel"], .intake-form input[type="date"], .intake-form input[type="time"], .intake-form textarea'
);

function updateFilledState(field) {
  field.classList.toggle('filled', field.value.trim().length > 0);
}

function updateAllFilledStates() {
  intakeFields.forEach(updateFilledState);
}

// Apply filled-state to all intake fields
intakeFields.forEach(field => {
  field.addEventListener('input', () => {
    updateFilledState(field);
  });
  // initial state
  updateFilledState(field);
});

if(intakeForm){
  intakeForm.addEventListener('submit', (e)=>{
    e.preventDefault();
    // Show temporary-unavailable modal instead of submitting
    const modal = document.getElementById('tempUnavailableModal');
    if(modal){
      modal.classList.add('active');
      modal.setAttribute('aria-hidden', 'false');
      document.body.classList.add('modal-open');
      // focus the modal title for accessibility if possible
      const title = modal.querySelector('#tempUnavailableTitle');
      if(title && typeof title.focus === 'function') title.focus();
      intakeStatus.textContent = '';
      return;
    }

    // Fallback: original submit behaviour (if modal not present)
    const data = serializeForm(intakeForm);
    if(!data.fullName || !data.email){ intakeStatus.textContent='Name and email are required.'; return; }
    if(!validateEmail(data.email)){ intakeStatus.textContent='Please enter a valid email.'; return; }
    // Save to localStorage
    try{
      const key = 'notarypm_intake_submissions';
      const existing = JSON.parse(localStorage.getItem(key) || '[]');
      existing.push(Object.assign({submittedAt: new Date().toISOString()}, data));
      localStorage.setItem(key, JSON.stringify(existing));
    }catch(err){ console.warn('Storage failed', err); }
    const attachments = Array.isArray(data.attachments) ? data.attachments.map(file => file.name).join(', ') : 'None';
    const body = encodeURIComponent(
      `Name: ${data.fullName}\nEmail: ${data.email}\nPhone: ${data.phone}\nService: ${data.service}\nPreferred: ${data.preferredDate} ${data.preferredTime}\nAddress: ${data.address}\nAttachments: ${attachments}\nNotes:\n${data.message}`
    );
    window.location.href = `mailto:${window.SHARED_SETTINGS?.contact?.email || 'hello@notarypm.ca'}?subject=Notary%20Intake%20Request&body=${body}`;
    intakeStatus.textContent='Request prepared — your mail client should open. Saved locally.';
    intakeForm.reset();
    resetAttachmentUI();
    updateAllFilledStates();
  });
  if(intakeClear){ intakeClear.addEventListener('click', ()=>{ intakeForm.reset(); intakeStatus.textContent='Form cleared.'; resetAttachmentUI(); updateAllFilledStates(); }); }
}
