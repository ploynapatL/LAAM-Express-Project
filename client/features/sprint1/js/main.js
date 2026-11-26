import { accountRequest, getAccount, mountAccount } from '/assets/js/account.js';
import { getTracking, isValidTrackingNumber, normalizeTrackingNumber } from './tracking-api.js';

const form = document.querySelector('#tracking-form');
const input = document.querySelector('#tracking-input');
const submit = document.querySelector('#tracking-submit');
const formError = document.querySelector('#tracking-error');
const content = document.querySelector('#tracking-content');
const workspace = document.querySelector('#workspace');
const sectionTitle = document.querySelector('#section-title');
const description = document.querySelector('#section-description');
let activeRequest = null;
let account = null;
let parcels = [];
let parcelError = '';
let showingTracking = false;

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
  sectionTitle.textContent = 'My parcels';
  description.textContent = '';
  if (parcelError) {
    content.innerHTML = '<div class="empty-state"><h3>Could not load your parcels</h3><button class="outline-action" id="retry-parcels">Try again</button></div>';
    return;
  }
  if (account?.type !== 'customer') {
    const signIn = account ? '<a class="outline-action" href="/rider">View assignments</a>' :
      '<a class="outline-action" href="/login">Sign in to see your parcels</a>';
    content.innerHTML = `<div class="empty-state"><h3>Enter your tracking number</h3><p>Look up a shipment using the form above.</p>${signIn}</div>`;
    return;
  }
  if (!parcels.length) {
    content.innerHTML = '<div class="empty-state"><h3>No parcels yet</h3><p>Create your parcel delivery</p><span class="upcoming">Upcoming feature</span></div>';
    return;
  }
  description.textContent = 'Shipments linked to your account.';
  content.innerHTML = `<div class="parcel-list">${parcels.map(parcel => `
    <article class="parcel-card">
      <div class="parcel-icon" aria-hidden="true"><span class="mini-box">▣</span></div>
      <div class="parcel-content">
        ${statusBadge(parcel.currentStatus)}
        <h3>${escapeHTML(parcel.trackingNumber)}</h3>
        <p class="parcel-route">${escapeHTML(parcel.destination || 'Destination not available')}</p>
        <div class="card-footer">
          <span class="last-update">${escapeHTML(formatDate(parcel.updatedAt))}</span>
          <button class="outline-action" data-track="${escapeHTML(parcel.trackingNumber)}">More info <span aria-hidden="true">↗</span></button>
        </div>
      </div>
    </article>`).join('')}</div>`;
}
function renderDetail(p) {
  sectionTitle.textContent = 'Parcel details';
  description.textContent = 'Current delivery status and recorded parcel movements.';
  const history = p.history.length ? `<ol class="timeline">${p.history.map((event, i) => `<li class="timeline-item ${i === 0 ? 'newest' : ''}"><span class="timeline-dot"></span><div class="event-content"><div class="event-top"><strong>${escapeHTML(event.status)}</strong><time>${escapeHTML(formatDate(event.timestamp))}</time></div><p>${escapeHTML(event.location || 'Location not available')}</p></div></li>`).join('')}</ol>` : `<div class="history-empty"><strong>No tracking updates yet</strong><p>The parcel record exists, but no movement events have been recorded. The latest known status is shown above.</p></div>`;
  content.innerHTML = `<div class="detail-grid"><div class="detail-main"><button class="back-link" id="back-to-list">← Back to parcels</button><article class="detail-card"><div class="detail-card-head"><div><span class="overline">TRACKING NUMBER</span><h3>${escapeHTML(p.trackingNumber)}</h3></div>${statusBadge(p.currentStatus)}</div><div class="delivery-graphic" aria-hidden="true"><div class="road-line"></div><div class="road-stop"><span>⌂</span><small>ORIGIN</small></div><div class="moving-truck">▣<span>→</span></div><div class="road-stop"><span>⌂</span><small>DESTINATION</small></div></div><div class="status-banner"><div class="status-icon">↗</div><div><small>CURRENT STATUS</small><h4>${escapeHTML(p.currentStatus)}</h4><p>Last recorded: ${escapeHTML(formatDate(p.updatedAt))}</p></div></div><div class="shipment-facts"><div><span>LATEST LOCATION</span><strong>${escapeHTML(p.latestLocation || 'Not available')}</strong></div><div><span>SERVICE TYPE</span><strong>${escapeHTML(p.serviceType || 'Not available')}</strong></div><div><span>ORIGIN</span><strong>${escapeHTML(p.origin || 'Not available')}</strong></div><div><span>DESTINATION</span><strong>${escapeHTML(p.destination || 'Not available')}</strong></div></div></article></div><aside class="history-panel"><div class="history-title"><div><span class="overline">MOVEMENT LOG</span><h3>Status history</h3></div><span class="event-count">${p.history.length} updates</span></div>${history}<div class="aside-foot"><button class="disabled-action" type="button" disabled title="Rider contact is not part of this sprint">Contact your rider <span>Coming later</span></button><p>For privacy, rider contact details are not provided by the public tracking API.</p></div></aside></div>`;
}
async function loadTracking(trackingNo, { push = true } = {}) {
  const no = normalizeTrackingNumber(trackingNo);
  if (!isValidTrackingNumber(no)) { showError('Enter a valid tracking number (4–64 letters, numbers or hyphens).'); input.focus(); return; }
  showingTracking = true;
  activeRequest?.abort();
  const controller = new AbortController(); activeRequest = controller;
  showError(''); input.value = no; setBusy(true);
  sectionTitle.textContent = 'Parcel details';
  description.textContent = '';
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
async function loadMyParcels() {
  try {
    ({ parcels } = await accountRequest('/parcels/me'));
    parcelError = '';
  } catch (error) {
    parcelError = error.message;
  }
  if (!showingTracking) renderList();
}

async function loadAccount() {
  try {
    account = await getAccount();
  } catch {
    return;
  }
  if (account) {
    document.querySelector('#login-link').hidden = true;
    document.querySelector('#rider-link').hidden = account.type !== 'rider';
    mountAccount(account, { button: document.querySelector('#account-button') });
  }
  if (account?.type === 'customer') await loadMyParcels();
  else if (!showingTracking) renderList();
}

function backToList({ push = true } = {}) {
  showingTracking = false;
  activeRequest?.abort();
  activeRequest = null;
  setBusy(false);
  if (push) setTrackingUrl(null);
  input.value = '';
  showError('');
  renderList();
}
form.addEventListener('submit', event => { event.preventDefault(); loadTracking(input.value); });
input.addEventListener('input', () => { if (!formError.hidden) showError(''); });
content.addEventListener('click', event => {
  const track = event.target.closest('[data-track]');
  if (track) return loadTracking(track.dataset.track);
  if (event.target.closest('#back-to-list')) return backToList();
  if (event.target.closest('#retry-parcels')) return loadMyParcels();
  if (event.target.closest('#retry-search')) return loadTracking(input.value);
});
window.addEventListener('popstate', () => { const no = getUrlTracking(); no ? loadTracking(no, { push: false }) : backToList({ push: false }); });
const initial = getUrlTracking();
if (initial) loadTracking(initial, { push: false });
loadAccount();
