import { DEMO_TRACKING_NUMBERS } from './config.js';
import { getTracking, isValidTrackingNumber, normalizeTrackingNumber } from './tracking-api.js';

const form = document.querySelector('#tracking-form');
const input = document.querySelector('#tracking-input');
const submit = document.querySelector('#tracking-submit');
const formError = document.querySelector('#tracking-error');
const content = document.querySelector('#tracking-content');
const workspace = document.querySelector('#workspace');
const sectionTitle = document.querySelector('#section-title');
const description = document.querySelector('#section-description');
const demoLabel = document.querySelector('#demo-label');
let activeRequest = null;
let demoParcels = [];

/** Escaping is mandatory because API values are untrusted strings. */
function escapeHTML(v) { return String(v ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c])); }
function formatDate(value) {
  if (!value || !Number.isFinite(Date.parse(value))) return 'Not available';
  return new Intl.DateTimeFormat('en-GB', { dateStyle:'medium', timeStyle:'short', timeZone:'Asia/Bangkok' }).format(new Date(value)) + ' ICT';
}
function statusClass(status) { const s = status.toLowerCase(); return s.includes('deliver') && !s.includes('failed') && !s.includes('out for') ? 'delivered' : s.includes('failed') || s.includes('return') ? 'issue' : 'transit'; }
function statusBadge(status) { return `<span class="status-pill ${statusClass(status)}">${escapeHTML(status)}</span>`; }
function showError(message) { formError.textContent = message; formError.hidden = !message; input.setAttribute('aria-invalid', String(Boolean(message))); }
function setBusy(busy) { workspace.setAttribute('aria-busy', String(busy)); submit.disabled = busy; submit.querySelector('span').textContent = busy ? 'Searching…' : 'Track parcel'; }
function getUrlTracking() { return new URL(location.href).searchParams.get('tracking'); }
function setTrackingUrl(no) { const url = new URL(location.href); no ? url.searchParams.set('tracking', no) : url.searchParams.delete('tracking'); history.pushState({}, '', url); }
function renderList() {
  sectionTitle.innerHTML = `My parcels <span class="count" id="parcel-count">${demoParcels.length} demo</span>`;
  description.textContent = 'Sample shipments to explore. Enter any tracking number above to check a real parcel when the API is connected.';
  demoLabel.hidden = false;
  if (!demoParcels.length) { content.innerHTML = '<div class="empty-state"><h3>No demo parcels available</h3><p>Use the search box above to track a shipment.</p></div>'; return; }
  content.innerHTML = `<div class="parcel-list">${demoParcels.map((p, i) => `<article class="parcel-card"><div class="parcel-icon"><span class="mini-box" aria-hidden="true">▣</span></div><div class="parcel-content"><div class="parcel-card-top"><span class="overline">SHIPMENT ${String(i+1).padStart(2,'0')}</span>${statusBadge(p.currentStatus)}</div><h3>${escapeHTML(p.trackingNumber)}</h3><p class="parcel-route">${escapeHTML(p.origin || 'Origin not available')} <span aria-hidden="true">→</span> ${escapeHTML(p.destination || 'Destination not available')}</p><div class="card-footer"><span class="last-update">◷ ${escapeHTML(formatDate(p.updatedAt))}</span><button class="outline-action" data-track="${escapeHTML(p.trackingNumber)}">More info <span aria-hidden="true">↗</span></button></div></div></article>`).join('')}</div>`;
}
function renderDetail(p) {
  sectionTitle.textContent = 'Parcel details';
  description.textContent = 'Current delivery status and recorded parcel movements.';
  demoLabel.hidden = !DEMO_TRACKING_NUMBERS.includes(p.trackingNumber);
  const history = p.history.length ? `<ol class="timeline">${p.history.map((event, i) => `<li class="timeline-item ${i === 0 ? 'newest' : ''}"><span class="timeline-dot"></span><div class="event-content"><div class="event-top"><strong>${escapeHTML(event.status)}</strong><time>${escapeHTML(formatDate(event.timestamp))}</time></div><p>${escapeHTML(event.location || 'Location not available')}</p></div></li>`).join('')}</ol>` : `<div class="history-empty"><strong>No tracking updates yet</strong><p>The parcel record exists, but no movement events have been recorded. The latest known status is shown above.</p></div>`;
  content.innerHTML = `<div class="detail-grid"><div class="detail-main"><button class="back-link" id="back-to-list">← Back to parcels</button><article class="detail-card"><div class="detail-card-head"><div><span class="overline">TRACKING NUMBER</span><h3>${escapeHTML(p.trackingNumber)}</h3></div>${statusBadge(p.currentStatus)}</div><div class="delivery-graphic" aria-hidden="true"><div class="road-line"></div><div class="road-stop"><span>⌂</span><small>ORIGIN</small></div><div class="moving-truck">▣<span>→</span></div><div class="road-stop"><span>⌂</span><small>DESTINATION</small></div></div><div class="status-banner"><div class="status-icon">↗</div><div><small>CURRENT STATUS</small><h4>${escapeHTML(p.currentStatus)}</h4><p>Last recorded: ${escapeHTML(formatDate(p.updatedAt))}</p></div></div><div class="shipment-facts"><div><span>LATEST LOCATION</span><strong>${escapeHTML(p.latestLocation || 'Not available')}</strong></div><div><span>SERVICE TYPE</span><strong>${escapeHTML(p.serviceType || 'Not available')}</strong></div><div><span>ORIGIN</span><strong>${escapeHTML(p.origin || 'Not available')}</strong></div><div><span>DESTINATION</span><strong>${escapeHTML(p.destination || 'Not available')}</strong></div></div></article></div><aside class="history-panel"><div class="history-title"><div><span class="overline">MOVEMENT LOG</span><h3>Status history</h3></div><span class="event-count">${p.history.length} updates</span></div>${history}<div class="aside-foot"><button class="disabled-action" type="button" disabled title="Rider contact is not part of this sprint">Contact your rider <span>Coming later</span></button><p>For privacy, rider contact details are not provided by the public tracking API.</p></div></aside></div>`;
}
async function loadTracking(trackingNo, { push = true } = {}) {
  const no = normalizeTrackingNumber(trackingNo);
  if (!isValidTrackingNumber(no)) { showError('Enter a valid tracking number (4–64 letters, numbers or hyphens).'); input.focus(); return; }
  activeRequest?.abort();
  const controller = new AbortController(); activeRequest = controller;
  showError(''); input.value = no; setBusy(true);
  content.innerHTML = `<div class="loading-state" role="status"><span class="spinner"></span> Retrieving tracking details…</div>`;
  try {
    const parcel = await getTracking(no, { signal: controller.signal });
    if (activeRequest !== controller) return;
    if (push) setTrackingUrl(no);
    renderDetail(parcel);
  } catch (error) {
    if (activeRequest !== controller || error.code === 'CANCELLED') return;
    content.innerHTML = `<div class="empty-state"><div class="empty-icon">!</div><h3>${error.code === 'NOT_FOUND' ? 'Parcel not found' : 'Unable to load tracking'}</h3><p>${escapeHTML(error.message)}</p><button class="outline-action" id="retry-search">Try again ↗</button></div>`;
  } finally {
    if (activeRequest === controller) { activeRequest = null; setBusy(false); }
  }
}
async function loadDemo() {
  const parcels = await Promise.allSettled(DEMO_TRACKING_NUMBERS.map(no => getTracking(no)));
  demoParcels = parcels.filter(p => p.status === 'fulfilled').map(p => p.value);
  if (!getUrlTracking()) renderList();
}
function backToList() { activeRequest?.abort(); activeRequest = null; setBusy(false); setTrackingUrl(null); input.value = ''; showError(''); renderList(); }
form.addEventListener('submit', event => { event.preventDefault(); loadTracking(input.value); });
input.addEventListener('input', () => { if (!formError.hidden) showError(''); });
content.addEventListener('click', event => {
  const track = event.target.closest('[data-track]');
  if (track) return loadTracking(track.dataset.track);
  if (event.target.closest('#back-to-list')) return backToList();
  if (event.target.closest('#retry-search')) return loadTracking(input.value);
});
window.addEventListener('popstate', () => { const no = getUrlTracking(); no ? loadTracking(no, { push: false }) : (activeRequest?.abort(), renderList()); });
const initial = getUrlTracking();
if (initial) loadTracking(initial, { push: false });
loadDemo();
