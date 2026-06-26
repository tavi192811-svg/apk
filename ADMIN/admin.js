// ================================
// Prime Follower — Admin Dashboard
// Coupon Management System
// ================================

import { auth, db, collection, query, where, orderBy, getDocs, doc, updateDoc, serverTimestamp } from "../firebase.js";

import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

// ── Config ──
const RAILWAY_URL = 'https://myserver-production-d47c.up.railway.app';
let ADMIN_SECRET = '';
let couponsCache = [];
let editingCouponId = null;
let supportMessagesCache = [];
let currentSupportTab = 'Redeem Problem';
let replyingMessageId = null;

// ── Toast ──
function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `admin-toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3500);
}

// ══════════════════════════════════════════════════
// AUTH SYSTEM
// ══════════════════════════════════════════════════

const authGate = document.getElementById('auth-gate');
const dashboard = document.getElementById('admin-dashboard');

document.getElementById('admin-login-btn')?.addEventListener('click', async () => {
  const email = document.getElementById('admin-email').value.trim();
  const password = document.getElementById('admin-password').value.trim();
  const secret = document.getElementById('admin-secret').value.trim();
  const errorEl = document.getElementById('auth-error');
  const btn = document.getElementById('admin-login-btn');

  errorEl.textContent = '';

  if (!email || !password || !secret) {
    errorEl.textContent = 'Please fill in all fields';
    return;
  }

  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Authenticating...';

  try {
    // Step 1: Verify admin secret via Railway
    const testRes = await fetch(`${RAILWAY_URL}/list-coupons`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ adminSecret: secret })
    });
    const testData = await testRes.json();

    if (!testData.success) {
      errorEl.textContent = 'Invalid Admin Secret Key';
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-shield-halved"></i> AUTHENTICATE';
      return;
    }

    // Step 2: Firebase auth
    await signInWithEmailAndPassword(auth, email, password);

    // Step 3: Save secret and show dashboard
    ADMIN_SECRET = secret;
    sessionStorage.setItem('adminSecret', secret);

    authGate.style.display = 'none';
    dashboard.style.display = 'block';
    document.getElementById('header-admin-email').textContent = email;

    // Load coupons
    await loadCoupons();

    showToast('Welcome, Admin!', 'success');

  } catch (err) {
    console.error('Auth error:', err);
    if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password') {
      errorEl.textContent = 'Wrong email or password';
    } else if (err.code === 'auth/user-not-found') {
      errorEl.textContent = 'Admin account not found';
    } else if (err.code === 'auth/too-many-requests') {
      errorEl.textContent = 'Too many attempts. Try later.';
    } else {
      errorEl.textContent = 'Authentication failed';
    }
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-shield-halved"></i> AUTHENTICATE';
  }
});

// Enter key support
document.querySelectorAll('#auth-gate input').forEach(input => {
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      document.getElementById('admin-login-btn').click();
    }
  });
});

// Logout
document.getElementById('admin-logout-btn')?.addEventListener('click', async () => {
  try {
    await signOut(auth);
  } catch (e) { /* ignore */ }
  ADMIN_SECRET = '';
  sessionStorage.removeItem('adminSecret');
  dashboard.style.display = 'none';
  authGate.style.display = 'flex';
  document.getElementById('admin-email').value = '';
  document.getElementById('admin-password').value = '';
  document.getElementById('admin-secret').value = '';
  showToast('Logged out', 'info');
});

// Auto-restore session
onAuthStateChanged(auth, async (user) => {
  const savedSecret = sessionStorage.getItem('adminSecret');
  if (user && savedSecret) {
    ADMIN_SECRET = savedSecret;
    authGate.style.display = 'none';
    dashboard.style.display = 'block';
    document.getElementById('header-admin-email').textContent = user.email;
    await loadCoupons();
  }
});

// ══════════════════════════════════════════════════
// VIEW SWITCHING (Coupons / Orders)
// ══════════════════════════════════════════════════

document.getElementById('view-coupons-btn')?.addEventListener('click', () => {
  document.getElementById('coupons-view').style.display = 'block';
  document.getElementById('orders-view').style.display = 'none';
  document.getElementById('support-view').style.display = 'none';
  document.getElementById('refil-view').style.display = 'none';
  document.getElementById('stats-row').style.display = 'grid';
});

document.getElementById('view-orders-btn')?.addEventListener('click', () => {
  document.getElementById('coupons-view').style.display = 'none';
  document.getElementById('orders-view').style.display = 'block';
  document.getElementById('support-view').style.display = 'none';
  document.getElementById('refil-view').style.display = 'none';
  document.getElementById('stats-row').style.display = 'none';
  loadOrders(currentOrderTab);
});

document.getElementById('view-support-btn')?.addEventListener('click', () => {
  document.getElementById('coupons-view').style.display = 'none';
  document.getElementById('orders-view').style.display = 'none';
  document.getElementById('support-view').style.display = 'block';
  document.getElementById('refil-view').style.display = 'none';
  document.getElementById('stats-row').style.display = 'none';
  loadSupportMessages(currentSupportTab);
});

document.getElementById('view-refil-btn')?.addEventListener('click', () => {
  document.getElementById('coupons-view').style.display = 'none';
  document.getElementById('orders-view').style.display = 'none';
  document.getElementById('support-view').style.display = 'none';
  document.getElementById('refil-view').style.display = 'block';
  document.getElementById('stats-row').style.display = 'none';
  loadRefilRequests();
});

document.getElementById('refil-refresh')?.addEventListener('click', loadRefilRequests);

async function loadRefilRequests() {
  const loading = document.getElementById('refil-loading');
  const empty = document.getElementById('refil-empty');
  const list = document.getElementById('refil-list');

  loading.style.display = 'block';
  empty.style.display = 'none';
  list.innerHTML = '';

  const data = await apiCall('admin-refil-requests');
  loading.style.display = 'none';

  if (!data.success) { showToast('Failed to load refil requests', 'error'); return; }

  const requests = data.requests || [];
  if (requests.length === 0) { empty.style.display = 'block'; return; }

  // Store for detail modal
  window._refilRequestsCache = requests;

  list.innerHTML = requests.map((r, idx) => `
    <div class="coupon-card" style="cursor:pointer;" onclick="openRefilDetail(${idx})">
      <div class="coupon-card-header">
        <span class="coupon-code-badge" style="font-size:13px;">@${r.instagram_username || '—'}</span>
        <span class="coupon-status-badge status-expired">${r.followers} Followers</span>
      </div>
      <div class="coupon-details">
        <div class="coupon-detail"><span class="coupon-detail-label">Username</span><span class="coupon-detail-value" style="font-size:13px;">${r.userName || '—'}</span></div>
        <div class="coupon-detail"><span class="coupon-detail-label">Email</span><span class="coupon-detail-value" style="font-size:11px;word-break:break-all;">${r.userEmail || '—'}</span></div>
        <div class="coupon-detail"><span class="coupon-detail-label">Paid</span><span class="coupon-detail-value">₹${r.paidAmount || '—'}</span></div>
        <div class="coupon-detail"><span class="coupon-detail-label">Submitted</span><span class="coupon-detail-value" style="font-size:12px;">${fmtDate(r.submittedAt)}</span></div>
        ${r.screenshotURL ? `<div class="coupon-detail" style="grid-column:1/-1;">
          <span class="coupon-detail-label">Screenshot</span><br>
          <a href="${r.screenshotURL}" target="_blank" onclick="event.stopPropagation()"
             style="color:#ff0080;font-size:12px;font-weight:700;word-break:break-all;">
            🖼️ View Image (opens new tab)
          </a>
        </div>` : '<div class="coupon-detail" style="grid-column:1/-1;"><span class="coupon-detail-label">Screenshot</span><span class="coupon-detail-value" style="color:#999;">No image</span></div>'}
      </div>
    </div>
  `).join('');
}

// Refil detail modal (add after loadRefilRequests function)
window.openRefilDetail = function(idx) {
  const r = (window._refilRequestsCache || [])[idx];
  if (!r) return;

  // Build or reuse modal
  let modal = document.getElementById('refil-detail-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'refil-detail-modal';
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-card" style="max-width:500px;">
        <div class="modal-header">
          <h2><i class="fas fa-rotate-right"></i> Refil Request Detail</h2>
          <button class="modal-close" onclick="document.getElementById('refil-detail-modal').classList.remove('visible')">✕</button>
        </div>
        <div class="modal-body" id="refil-detail-body"></div>
      </div>`;
    modal.addEventListener('click', e => { if (e.target === modal) modal.classList.remove('visible'); });
    document.body.appendChild(modal);
  }

  document.getElementById('refil-detail-body').innerHTML = `
    <div class="coupon-details" style="display:grid;gap:10px;">
      <div class="coupon-detail"><span class="coupon-detail-label">Username</span><span class="coupon-detail-value">${r.userName || '—'}</span></div>
      <div class="coupon-detail"><span class="coupon-detail-label">Email</span><span class="coupon-detail-value" style="word-break:break-all;font-size:12px;">${r.userEmail || '—'}</span></div>
      <div class="coupon-detail"><span class="coupon-detail-label">Instagram</span><span class="coupon-detail-value">@${r.instagram_username || '—'}</span></div>
      <div class="coupon-detail"><span class="coupon-detail-label">Followers</span><span class="coupon-detail-value">${r.followers}</span></div>
      <div class="coupon-detail"><span class="coupon-detail-label">Amount Paid</span><span class="coupon-detail-value">₹${r.paidAmount || '—'}</span></div>
      <div class="coupon-detail"><span class="coupon-detail-label">Order Date</span><span class="coupon-detail-value">${r.orderDate ? new Date(r.orderDate).toLocaleString() : '—'}</span></div>
      <div class="coupon-detail"><span class="coupon-detail-label">Submitted</span><span class="coupon-detail-value">${fmtDate(r.submittedAt)}</span></div>
      <div class="coupon-detail" style="grid-column:1/-1;"><span class="coupon-detail-label">Note</span><span class="coupon-detail-value" style="white-space:pre-wrap;">${r.note || '(no note)'}</span></div>
      ${r.screenshotURL ? `
      <div style="grid-column:1/-1;">
        <span class="coupon-detail-label">Screenshot</span>
        <div style="margin-top:8px;">
          <a href="${r.screenshotURL}" target="_blank" style="display:inline-block;margin-bottom:10px;color:#ff0080;font-weight:700;font-size:13px;">🔗 Open in new tab</a>
          <img src="${r.screenshotURL}" style="width:100%;border-radius:12px;max-height:300px;object-fit:contain;background:#f0f0f0;">
        </div>
      </div>` : ''}
    </div>`;

  modal.classList.add('visible');
};


let currentOrderTab = 'credit';

document.querySelectorAll('.order-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.order-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    currentOrderTab = tab.dataset.otab;
    loadOrders(currentOrderTab);
  });
});

document.getElementById('orders-refresh')?.addEventListener('click', () => loadOrders(currentOrderTab));

document.querySelectorAll('.support-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.support-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    currentSupportTab = tab.dataset.stab;
    loadSupportMessages(currentSupportTab);
  });
});

document.getElementById('support-refresh')?.addEventListener('click', () => loadSupportMessages(currentSupportTab));

// ══════════════════════════════════════════════════
// LOAD ORDERS
// ══════════════════════════════════════════════════

async function loadOrders(tab) {
  const loading = document.getElementById('orders-loading');
  const empty = document.getElementById('orders-empty');
  const list = document.getElementById('orders-list');

  loading.style.display = 'block';
  empty.style.display = 'none';
  list.innerHTML = '';

  const endpoint = tab === 'credit' ? 'admin-credit-orders'
    : tab === 'paid' ? 'admin-paid-orders'
    : 'admin-bonus-orders';

  const data = await apiCall(endpoint);
  loading.style.display = 'none';

  if (!data.success) {
    showToast('Failed to load orders', 'error');
    return;
  }

  const orders = data.orders || [];
  if (orders.length === 0) {
    empty.style.display = 'block';
    return;
  }

  list.innerHTML = orders.map(o => renderOrderCard(o, tab)).join('');
}

function fmtDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString() + ' ' + d.toLocaleTimeString();
}

document.addEventListener('change', async (e) => {
  const select = e.target.closest('.order-status-select');
  if (!select) return;

  const orderId = select.dataset.orderId;
  const newStatus = select.value;
  select.disabled = true;

  const result = await apiCall('admin-update-order-status', { orderId, status: newStatus });

  select.disabled = false;
  if (result.success) {
    showToast('Order status updated', 'success');
    const badge = select.closest('.coupon-card')?.querySelector('.coupon-status-badge');
    if (badge) {
      badge.textContent = newStatus;
      badge.className = `coupon-status-badge ${newStatus === 'delivered' ? 'status-active' : 'status-expired'}`;
    }
  } else {
    showToast(result.message || 'Failed to update status', 'error');
  }
});
// ══════════════════════════════════════════════════
// CONTACT SUPPORT — User Messages & Replies
// ══════════════════════════════════════════════════

function fmtFirestoreDate(ts) {
  if (!ts) return '—';
  try {
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString() + ' ' + d.toLocaleTimeString();
  } catch {
    return '—';
  }
}

async function loadSupportMessages(tab) {
  const loading = document.getElementById('support-loading');
  const empty = document.getElementById('support-empty');
  const list = document.getElementById('support-list');

  loading.style.display = 'block';
  empty.style.display = 'none';
  list.innerHTML = '';

  try {
    const constraints = [collection(db, 'contact_messages')];
    let q;
    if (tab === 'all') {
      q = query(collection(db, 'contact_messages'), orderBy('date', 'desc'));
    } else {
      q = query(
        collection(db, 'contact_messages'),
        where('subject', '==', tab),
        orderBy('date', 'desc')
      );
    }
    const snap = await getDocs(q);
    supportMessagesCache = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (err) {
    console.error('Load support messages error:', err);
    loading.style.display = 'none';
    showToast('Failed to load messages', 'error');
    return;
  }

  loading.style.display = 'none';

  if (supportMessagesCache.length === 0) {
    empty.style.display = 'block';
    return;
  }

  list.innerHTML = supportMessagesCache.map((m, i) => renderSupportCard(m, i)).join('');

  list.querySelectorAll('.btn-reply-msg').forEach(btn => {
    btn.addEventListener('click', () => openReplyModal(btn.dataset.id));
  });
}

function renderSupportCard(m, index) {
  const repliedBadge = m.status === 'replied'
    ? `<span class="coupon-status-badge status-active">Replied</span>`
    : `<span class="coupon-status-badge status-expired">Pending</span>`;

  return `
    <div class="coupon-card">
      <div class="coupon-card-header">
        <span class="coupon-code-badge" style="font-size:13px;">${m.subject || 'Support'}</span>
        ${repliedBadge}
      </div>
      <div class="coupon-details">
        <div class="coupon-detail"><span class="coupon-detail-label">Username</span><span class="coupon-detail-value" style="font-size:13px;">${m.userName || '—'}</span></div>
        <div class="coupon-detail"><span class="coupon-detail-label">Email</span><span class="coupon-detail-value" style="font-size:11px;word-break:break-all;">${m.userEmail || '—'}</span></div>
        <div class="coupon-detail" style="grid-column:1/-1;"><span class="coupon-detail-label">Message</span><span class="coupon-detail-value" style="font-size:13px;font-weight:500;white-space:pre-wrap;">${m.message || '—'}</span></div>
        <div class="coupon-detail" style="grid-column:1/-1;"><span class="coupon-detail-label">Sent</span><span class="coupon-detail-value" style="font-size:12px;">${fmtFirestoreDate(m.date)}</span></div>
        ${m.adminReply ? `
        <div class="coupon-detail" style="grid-column:1/-1;"><span class="coupon-detail-label">Your Reply</span><span class="coupon-detail-value" style="font-size:13px;font-weight:500;white-space:pre-wrap;color:var(--green);">${m.adminReply}</span></div>
        <div class="coupon-detail" style="grid-column:1/-1;"><span class="coupon-detail-label">Replied</span><span class="coupon-detail-value" style="font-size:12px;">${fmtFirestoreDate(m.repliedAt)}</span></div>
        ` : ''}
      </div>
      <div class="coupon-actions">
        <button class="coupon-action-btn btn-reply-msg" data-id="${m.id}">
          <i class="fas fa-reply"></i> ${m.adminReply ? 'Edit Reply' : 'Reply'}
        </button>
      </div>
    </div>
  `;
}

const DEFAULT_REPLY_TEMPLATE = `Hello,

Thank you for contacting Prime Follower Support.

We're sorry to hear that `;

const REPLY_TEMPLATE_SUFFIX = `

Thank you for your patience.

Best regards,
Prime Follower Support Team`;

function openReplyModal(messageId) {
  const msg = supportMessagesCache.find(m => m.id === messageId);
  if (!msg) return;

  replyingMessageId = messageId;

  document.getElementById('reply-user-info').textContent =
    `${msg.userName || '—'} (${msg.userEmail || '—'})`;
  document.getElementById('reply-original-message').textContent = msg.message || '—';

  const textarea = document.getElementById('reply-textarea');
  textarea.value = msg.adminReply || (DEFAULT_REPLY_TEMPLATE + REPLY_TEMPLATE_SUFFIX);

  document.getElementById('reply-modal').classList.add('visible');
}

function closeReplyModal() {
  document.getElementById('reply-modal').classList.remove('visible');
  replyingMessageId = null;
}

document.getElementById('reply-modal-close')?.addEventListener('click', closeReplyModal);
document.getElementById('reply-cancel')?.addEventListener('click', closeReplyModal);

document.getElementById('reply-modal')?.addEventListener('click', (e) => {
  if (e.target === e.currentTarget) closeReplyModal();
});

document.getElementById('reply-send')?.addEventListener('click', async () => {
  if (!replyingMessageId) return;
  const replyText = document.getElementById('reply-textarea').value.trim();

  if (!replyText) {
    showToast('Reply cannot be empty', 'error');
    return;
  }

  const btn = document.getElementById('reply-send');
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';

  try {
    await updateDoc(doc(db, 'contact_messages', replyingMessageId), {
      adminReply: replyText,
      status: 'replied',
      repliedAt: serverTimestamp()
    });
    showToast('Reply sent!', 'success');
    closeReplyModal();
    await loadSupportMessages(currentSupportTab);
  } catch (err) {
    console.error('Send reply error:', err);
    showToast('Failed to send reply', 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-paper-plane"></i> Send Reply';
  }
});

function renderOrderCard(o, tab) {
  let costLine = '';
  if (tab === 'credit') {
    costLine = o.isDiamondOrder
      ? `<div class="coupon-detail"><span class="coupon-detail-label">Cost</span><span class="coupon-detail-value">${o.diamondCost} 💎</span></div>`
      : `<div class="coupon-detail"><span class="coupon-detail-label">Credits</span><span class="coupon-detail-value">${o.credits_spent}</span></div>`;
  } else if (tab === 'paid') {
    costLine = `<div class="coupon-detail"><span class="coupon-detail-label">Paid</span><span class="coupon-detail-value">₹${o.paidAmount}</span></div>`;
  } else {
    costLine = `<div class="coupon-detail"><span class="coupon-detail-label">Type</span><span class="coupon-detail-value" style="font-size:12px;">${o.bonusType}</span></div>`;
  }

  const statusOptions = ['pending', 'processing', 'delivering', 'delivered']
    .map(s => `<option value="${s}" ${o.status === s ? 'selected' : ''}>${s.charAt(0).toUpperCase() + s.slice(1)}</option>`)
    .join('');

  return `
    <div class="coupon-card">
      <div class="coupon-card-header">
        <span class="coupon-code-badge" style="font-size:14px;">${o.followers} followers</span>
        <span class="coupon-status-badge ${o.status === 'delivered' ? 'status-active' : 'status-expired'}">${o.status}</span>
      </div>
      <div class="coupon-details">
        <div class="coupon-detail"><span class="coupon-detail-label">Username</span><span class="coupon-detail-value" style="font-size:13px;">${o.userName || '—'}</span></div>
        <div class="coupon-detail"><span class="coupon-detail-label">Email</span><span class="coupon-detail-value" style="font-size:11px;word-break:break-all;">${o.userEmail || '—'}</span></div>
        <div class="coupon-detail"><span class="coupon-detail-label">IG Username</span><span class="coupon-detail-value" style="font-size:13px;">${o.instagram_username || '—'}</span></div>
        ${costLine}
        <div class="coupon-detail" style="grid-column:1/-1;"><span class="coupon-detail-label">IG Link</span><span class="coupon-detail-value" style="font-size:11px;word-break:break-all;">${o.instagram_link || '—'}</span></div>
        <div class="coupon-detail" style="grid-column:1/-1;"><span class="coupon-detail-label">Date</span><span class="coupon-detail-value" style="font-size:12px;">${fmtDate(o.order_time)}</span></div>
      </div>
      <div class="coupon-actions">
        <select class="order-status-select" data-order-id="${o.id}" style="flex:1;padding:10px 12px;border-radius:var(--radius-sm);border:1.5px solid var(--border);background:var(--bg-input);color:var(--text-primary);font-size:13px;font-weight:600;outline:none;">
          ${statusOptions}
        </select>
      </div>
    </div>
  `;
}

// ══════════════════════════════════════════════════
// API HELPERS
// ══════════════════════════════════════════════════

async function apiCall(endpoint, body = {}) {
  try {
    const res = await fetch(`${RAILWAY_URL}/${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-secret': ADMIN_SECRET
      },
      body: JSON.stringify({ ...body, adminSecret: ADMIN_SECRET })
    });
    return await res.json();
  } catch (err) {
    console.error(`API ${endpoint} error:`, err);
    return { success: false, message: 'Network error' };
  }
}

// ══════════════════════════════════════════════════
// LOAD & RENDER COUPONS
// ══════════════════════════════════════════════════

async function loadCoupons() {
  const loading = document.getElementById('loading-state');
  const empty = document.getElementById('empty-state');
  const list = document.getElementById('coupons-list');

  loading.style.display = 'block';
  empty.style.display = 'none';
  list.innerHTML = '';

  const data = await apiCall('list-coupons');

  loading.style.display = 'none';

  if (!data.success) {
    showToast('Failed to load coupons', 'error');
    return;
  }

  couponsCache = data.coupons || [];

  if (couponsCache.length === 0) {
    empty.style.display = 'block';
    updateStats();
    return;
  }

  couponsCache.forEach(coupon => {
    list.appendChild(createCouponCard(coupon));
  });

  updateStats();
}

function updateStats() {
  const total = couponsCache.length;
  const active = couponsCache.filter(c => c.status === 'Active').length;
  const expired = couponsCache.filter(c => c.status === 'Expired').length;
  const disabled = couponsCache.filter(c => c.status === 'Disabled' || c.status === 'Usage Limit Reached').length;

  document.getElementById('stat-total').textContent = total;
  document.getElementById('stat-active').textContent = active;
  document.getElementById('stat-expired').textContent = expired;
  document.getElementById('stat-disabled').textContent = disabled;
}

function createCouponCard(coupon) {
  const card = document.createElement('div');
  card.className = 'coupon-card';

  const statusClass = coupon.status === 'Active' ? 'status-active'
    : coupon.status === 'Expired' ? 'status-expired'
    : coupon.status === 'Disabled' ? 'status-disabled'
    : 'status-limit';

  const validForText = coupon.validFor === 'both' ? 'Both'
    : coupon.validFor === 'credits' ? 'Credits'
    : 'Paid Orders';

  const expiryText = coupon.expiry
    ? new Date(coupon.expiry).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
    : 'No expiry';

  const maxUsesText = coupon.maxUses > 0 ? coupon.maxUses : '∞';
  const isActive = coupon.active;

  card.innerHTML = `
    <div class="coupon-card-header">
      <span class="coupon-code-badge">${coupon.code}</span>
      <span class="coupon-status-badge ${statusClass}">${coupon.status}</span>
    </div>
    <div class="coupon-details">
      <div class="coupon-detail">
        <span class="coupon-detail-label">Discount</span>
        <span class="coupon-detail-value">${coupon.discount}%</span>
      </div>
      <div class="coupon-detail">
        <span class="coupon-detail-label">Valid For</span>
        <span class="coupon-detail-value">${validForText}</span>
      </div>
      <div class="coupon-detail">
        <span class="coupon-detail-label">Usage</span>
        <span class="coupon-detail-value">${coupon.usedCount || 0} / ${maxUsesText}</span>
      </div>
      <div class="coupon-detail">
        <span class="coupon-detail-label">Expires</span>
        <span class="coupon-detail-value">${expiryText}</span>
      </div>
      <div class="coupon-detail">
        <span class="coupon-detail-label">Upto</span>
        <span class="coupon-detail-value">${coupon.maxDiscount > 0 ? (coupon.validFor === 'paidOrders' ? '₹' + coupon.maxDiscount : coupon.maxDiscount + ' Credits') : 'No cap'}</span>
      </div>
      <div class="coupon-detail">
        <span class="coupon-detail-label">Level</span>
        <span class="coupon-detail-value" style="font-size:12px;">${['Any Level','Starter','Lion','Shark','Elite','Member'][coupon.level || 0]}</span>
      </div>
    </div>
    <div class="coupon-actions">
      <button class="coupon-action-btn btn-copy-code" data-code="${coupon.code}">
        <i class="fas fa-copy"></i> Copy
      </button>
      <button class="coupon-action-btn btn-edit" data-id="${coupon.id}">
        <i class="fas fa-pen"></i> Edit
      </button>
      <button class="coupon-action-btn btn-toggle ${isActive ? '' : 'enable'}" data-id="${coupon.id}" data-active="${isActive}">
        <i class="fas fa-${isActive ? 'pause' : 'play'}"></i> ${isActive ? 'Disable' : 'Enable'}
      </button>
      <button class="coupon-action-btn btn-delete" data-id="${coupon.id}" data-code="${coupon.code}">
        <i class="fas fa-trash"></i>
      </button>
    </div>
  `;

  // Wire action buttons
  card.querySelector('.btn-copy-code').addEventListener('click', () => {
    navigator.clipboard.writeText(coupon.code).then(() => {
      showToast(`Copied: ${coupon.code}`, 'success');
    }).catch(() => showToast('Copy failed', 'error'));
  });

  card.querySelector('.btn-edit').addEventListener('click', () => openEditModal(coupon));

  card.querySelector('.btn-toggle').addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    const currentActive = btn.dataset.active === 'true';
    btn.disabled = true;
    const result = await apiCall('update-coupon', {
      id: coupon.id,
      updates: { active: !currentActive }
    });
    if (result.success) {
      showToast(`Coupon ${!currentActive ? 'enabled' : 'disabled'}`, 'success');
      await loadCoupons();
    } else {
      showToast(result.message || 'Failed', 'error');
      btn.disabled = false;
    }
  });

  card.querySelector('.btn-delete').addEventListener('click', () => openDeleteModal(coupon));

  return card;
}

// ══════════════════════════════════════════════════
// CREATE / EDIT MODAL
// ══════════════════════════════════════════════════

const couponModal = document.getElementById('coupon-modal');
const modalTitle = document.getElementById('modal-title');
const modalSave = document.getElementById('modal-save');
const discountSlider = document.getElementById('coupon-discount');
const discountLabel = document.getElementById('discount-value');
const activeToggleGroup = document.getElementById('active-toggle-group');

// Discount slider
discountSlider?.addEventListener('input', () => {
  discountLabel.textContent = discountSlider.value + '%';
});

// Generate random code
document.getElementById('btn-generate-code')?.addEventListener('click', () => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "PRIME";
  for (let i = 0; i < 6; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
  document.getElementById('coupon-code').value = code;
});

// Open create modal
document.getElementById('btn-create-coupon')?.addEventListener('click', () => {
  editingCouponId = null;
  modalTitle.innerHTML = '<i class="fas fa-ticket"></i> Create Coupon';
  modalSave.innerHTML = '<i class="fas fa-check"></i> Create Coupon';
  activeToggleGroup.style.display = 'none';
  resetModalForm();
  couponModal.classList.add('visible');
});

// Open edit modal
function openEditModal(coupon) {
  editingCouponId = coupon.id;
  modalTitle.innerHTML = '<i class="fas fa-pen"></i> Edit Coupon';
  modalSave.innerHTML = '<i class="fas fa-check"></i> Save Changes';
  activeToggleGroup.style.display = 'block';

  document.getElementById('coupon-code').value = coupon.code;
  document.getElementById('coupon-code').disabled = true; // Can't change code
  discountSlider.value = coupon.discount;
  discountLabel.textContent = coupon.discount + '%';
  document.getElementById('coupon-expiry').value = coupon.expiry ? coupon.expiry.split('T')[0] : '';
  document.getElementById('coupon-maxuses').value = coupon.maxUses || 0;
  document.getElementById('coupon-upto').value = coupon.maxDiscount || 0;
  document.getElementById('coupon-active').checked = coupon.active;
  document.getElementById('coupon-level').value = coupon.level || 0;
  updateUptoUnit();

  document.querySelectorAll('input[name="validFor"]').forEach(r => {
    r.checked = r.value === coupon.validFor;
  });

  couponModal.classList.add('visible');
}

function resetModalForm() {
  document.getElementById('coupon-code').value = '';
  document.getElementById('coupon-code').disabled = false;
  discountSlider.value = 10;
  discountLabel.textContent = '10%';
  document.getElementById('coupon-expiry').value = '';
  document.getElementById('coupon-maxuses').value = 0;
  document.getElementById('coupon-upto').value = 0;
  document.getElementById('coupon-active').checked = true;
  document.getElementById('coupon-level').value = 0;
  document.querySelectorAll('input[name="validFor"]').forEach(r => {
    r.checked = r.value === 'both';
  });
  updateUptoUnit();
}

// Update upto unit label based on validFor selection
function updateUptoUnit() {
  const validFor = document.querySelector('input[name="validFor"]:checked')?.value || 'both';
  const unitEl = document.getElementById('upto-unit');
  if (!unitEl) return;
  if (validFor === 'paidOrders') {
    unitEl.textContent = '₹';
  } else {
    unitEl.textContent = 'Credits';
  }
}

// Wire radio buttons to update unit
document.querySelectorAll('input[name="validFor"]').forEach(r => {
  r.addEventListener('change', updateUptoUnit);
});

// Close modal
function closeModal() {
  couponModal.classList.remove('visible');
  editingCouponId = null;
  document.getElementById('coupon-code').disabled = false;
}

document.getElementById('modal-close')?.addEventListener('click', closeModal);
document.getElementById('modal-cancel')?.addEventListener('click', closeModal);

couponModal?.addEventListener('click', (e) => {
  if (e.target === couponModal) closeModal();
});

// Save coupon
modalSave?.addEventListener('click', async () => {
  const code = document.getElementById('coupon-code').value.trim().toUpperCase();
  const discount = parseInt(discountSlider.value);
  const validFor = document.querySelector('input[name="validFor"]:checked')?.value || 'both';
  const expiry = document.getElementById('coupon-expiry').value || null;
  const maxUses = parseInt(document.getElementById('coupon-maxuses').value) || 0;
  const active = document.getElementById('coupon-active').checked;
  const level = parseInt(document.getElementById('coupon-level').value) || 0;

  if (discount < 1 || discount > 100) {
    showToast('Discount must be 1-100%', 'error');
    return;
  }

      const maxDiscount = parseInt(document.getElementById('coupon-upto').value) || 0;

  modalSave.disabled = true;
  modalSave.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

  try {
    let result;

    if (editingCouponId) {
      // Update existing
      result = await apiCall('update-coupon', {
        id: editingCouponId,
        updates: { discount, validFor, expiry, maxUses, active, maxDiscount, level }
      });
    } else {
      // Create new
      result = await apiCall('create-coupon', {
        code: code || undefined,
        discount,
        validFor,
        expiry,
        maxUses,
        maxDiscount,
        level
      });
    }

    if (result.success) {
      showToast(editingCouponId ? 'Coupon updated!' : `Coupon created: ${result.code || code}`, 'success');
      closeModal();
      await loadCoupons();
    } else {
      showToast(result.message || 'Failed', 'error');
    }
  } catch (err) {
    showToast('Error saving coupon', 'error');
  } finally {
    modalSave.disabled = false;
    modalSave.innerHTML = editingCouponId
      ? '<i class="fas fa-check"></i> Save Changes'
      : '<i class="fas fa-check"></i> Create Coupon';
  }
});

// ══════════════════════════════════════════════════
// DELETE MODAL
// ══════════════════════════════════════════════════

const deleteModal = document.getElementById('delete-modal');
let deletingCouponId = null;

function openDeleteModal(coupon) {
  deletingCouponId = coupon.id;
  document.getElementById('delete-coupon-code').textContent = coupon.code;
  deleteModal.classList.add('visible');
}

document.getElementById('delete-cancel')?.addEventListener('click', () => {
  deleteModal.classList.remove('visible');
  deletingCouponId = null;
});

deleteModal?.addEventListener('click', (e) => {
  if (e.target === deleteModal) {
    deleteModal.classList.remove('visible');
    deletingCouponId = null;
  }
});

document.getElementById('delete-confirm')?.addEventListener('click', async () => {
  if (!deletingCouponId) return;

  const btn = document.getElementById('delete-confirm');
  btn.disabled = true;
  btn.textContent = 'Deleting...';

  const result = await apiCall('delete-coupon', { id: deletingCouponId });

  if (result.success) {
    showToast('Coupon deleted', 'success');
    deleteModal.classList.remove('visible');
    await loadCoupons();
  } else {
    showToast(result.message || 'Delete failed', 'error');
  }

  btn.disabled = false;
  btn.textContent = 'Delete';
  deletingCouponId = null;
});

// ══════════════════════════════════════════════════
// REFRESH
// ══════════════════════════════════════════════════

document.getElementById('btn-refresh')?.addEventListener('click', async () => {
  const btn = document.getElementById('btn-refresh');
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Refreshing...';
  await loadCoupons();
  btn.disabled = false;
  btn.innerHTML = '<i class="fas fa-sync-alt"></i> Refresh';
  showToast('Refreshed', 'info');
});

console.log("✅ Admin Dashboard loaded.");