// ================================
// Prime-Follower - Contact Page Module
// Support form with 5-word validation + EmailJS integration
// ================================

import { submitContactMessage, getMyReplies } from './firebase.js';

// ── Toast helper ──
function showToast(message, type = 'success') {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}



// ── Priority badge image (changes with user level, hidden for Level 1) ──
const PRIORITY_BADGE_BY_LEVEL = {
  2: 'images/priority2.png',
  3: 'images/priority3.png',
  4: 'images/priority4.png',
  5: 'images/priority5.png'
};

function updateContactPriorityBadge(level) {
  const badgeEl = document.getElementById('contact-priority-badge');
  if (!badgeEl) return;
  const src = PRIORITY_BADGE_BY_LEVEL[level];
  if (src) {
    badgeEl.src = src;
    badgeEl.style.display = 'block';
  } else {
    badgeEl.style.display = 'none';
  }
}

window.addEventListener('userReady', () => {
  updateContactPriorityBadge(window.cashTreasureUser?.level || 1);
});

document.querySelector('.nav-item[data-page="contact"]')?.addEventListener('click', () => {
  updateContactPriorityBadge(window.cashTreasureUser?.level || 1);
});

// ── Enable textarea when subject is selected ──
const subjectSelect = document.getElementById('contact-subject');
const messageArea = document.getElementById('contact-message');

subjectSelect.addEventListener('change', () => {
  if (subjectSelect.value) {
    messageArea.placeholder = 'Describe your issue in detail (minimum 5 words)...';
  }
});

// ── Send message ──
document.getElementById('btn-send-message').addEventListener('click', async () => {
  const user = window.cashTreasureUser;
  if (!user) {
    showToast('Please log in first.', 'error');
    return;
  }

  const subject = subjectSelect.value;
  const message = messageArea.value.trim();

  if (!subject) {
    showToast('Please select a subject.', 'error');
    return;
  }

  if (!message) {
    showToast('Please describe your issue.', 'error');
    return;
  }

  // ── 5-word minimum validation ──
  const wordCount = message.trim().split(/\s+/).length;
  if (wordCount < 5) {
    showToast('Please describe your issue using at least 5 words.', 'error');
    return;
  }

  const btn = document.getElementById('btn-send-message');
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';

  try {
    // Save to Firestore
    await submitContactMessage(user.uid, {
      subject,
      message,
      userName: user.username || '—',
      userEmail: user.email || '—'
    });

    // ── Send email via EmailJS ──
    // Replace [ADD_SERVICE_ID] and [ADD_TEMPLATE_ID] with your actual EmailJS IDs
 
    showToast('Your message has been sent successfully.');

    // Reset form
    subjectSelect.value = '';
    messageArea.value = '';
    messageArea.disabled = true;
    messageArea.placeholder = 'Select a subject first...';
  } catch (err) {
    console.error('Contact error:', err);
    showToast('Failed to send message. Try again.', 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-paper-plane"></i> Send Message';
  }
});


// Show alert if user clicks textarea before selecting subject
messageArea.addEventListener("focus", () => {
  if (!subjectSelect.value) {
    showToast("Please select a subject first.", "error");
    messageArea.blur(); // 🔥 prevent typing
  }
});








// ══════════════════════════════════════════════════
// SETTINGS PAGE
// ══════════════════════════════════════════════════

import { auth as _auth, db as _db, doc as _doc, updateDoc as _updateDoc, getUserProfile as _getProfile } from "./firebase.js";
import {
  updateProfile as _updateProfile,
  sendPasswordResetEmail as _sendReset,
  signOut as _signOut,
  deleteUser as _deleteUser
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { deleteDoc as _deleteDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// Open settings from profile modal
document.getElementById("btn-open-settings")?.addEventListener("click", () => {
  document.getElementById("profile-modal")?.classList.remove("visible");
  window.navigateTo?.("settings");
  loadSettingsData();
});

async function loadSettingsData() {
  const user = window.cashTreasureUser;
  if (!user) return;

  // Username + email + avatar
  const unameEl = document.getElementById("settings-username");
  const emailEl = document.getElementById("settings-email");
  const avatarEl = document.getElementById("settings-avatar");
  if (unameEl) unameEl.textContent = user.username || "—";
  if (emailEl) emailEl.textContent = user.email || "—";
  if (avatarEl) avatarEl.src = "avatars/" + (user.avatar || "user1.png");

  // Instagram status
  const igEl = document.getElementById("settings-ig-status");
  if (igEl) {
    const saved = localStorage.getItem("connectedInstagram");
    if (saved) {
      igEl.textContent = "Connected ✓";
      igEl.style.color = "#22c55e";
    } else {
      igEl.textContent = "Not connected";
      igEl.style.color = "#ef4444";
    }
  }

  // Notification toggle (saved locally)
  const notifToggle = document.getElementById("settings-notif-toggle");
  if (notifToggle) {
    notifToggle.checked = localStorage.getItem("notifEnabled") !== "false";
  }
}

// Notification toggle persistence
document.getElementById("settings-notif-toggle")?.addEventListener("change", (e) => {
  localStorage.setItem("notifEnabled", e.target.checked ? "true" : "false");
  showToast(e.target.checked ? "Notifications enabled" : "Notifications disabled", "success");
});

// Change username
document.getElementById("settings-change-username")?.addEventListener("click", async () => {
  const user = window.cashTreasureUser;
  if (!user) return;
  const newName = prompt("Enter new username (3-20 chars):", user.username || "");
  if (newName === null) return;
  const trimmed = newName.trim();
  if (!/^[a-zA-Z0-9_]{3,20}$/.test(trimmed)) {
    return showToast("Invalid username (3-20, letters/numbers/_)", "error");
  }
  try {
    await _updateDoc(_doc(_db, "users", user.uid), { username: trimmed });
    if (_auth.currentUser) await _updateProfile(_auth.currentUser, { displayName: trimmed });
    window.cashTreasureUser.username = trimmed;
    document.getElementById("settings-username").textContent = trimmed;
    document.getElementById("profile-username").textContent = trimmed;
    showToast("Username updated!", "success");
  } catch (err) {
    console.error(err);
    showToast("Failed to update username", "error");
  }
});

// Change password (sends reset email)
document.getElementById("settings-change-password")?.addEventListener("click", async () => {
  const user = window.cashTreasureUser;
  if (!user?.email) return;
  try {
    await _sendReset(_auth, user.email);
    showToast("Password reset link sent to your email", "success");
  } catch (err) {
    console.error(err);
    showToast("Failed to send reset email", "error");
  }
});

// ── DELETE ACCOUNT FLOW ──
document.getElementById("settings-delete-account")?.addEventListener("click", showDeleteAccountStep1);

function showDeleteAccountStep1() {
  document.querySelectorAll(".delete-acc-overlay").forEach(el => el.remove());
  const overlay = document.createElement("div");
  overlay.className = "delete-acc-overlay";
  overlay.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,0.7);backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center;z-index:99999;padding:20px;";

  overlay.innerHTML = `
  <div style="background:#fff;border-radius:20px;padding:28px 24px;max-width:360px;width:100%;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,0.3);">
    <img src="images/insta.jpeg" style="width:80px;height:80px;border-radius:18px;margin-bottom:8px;">
    <p style="font-size:11px;letter-spacing:3px;color:#777;font-weight:700;margin-bottom:14px;">P R I M E   F O L L O W E R</p>
    <h2 style="color:#b91c1c;font-size:24px;font-weight:900;line-height:1.2;margin-bottom:10px;">YOU ARE GOING TO DELETE YOUR ACCOUNT</h2>
    <p style="color:#ef4444;font-weight:700;font-size:14px;margin-bottom:14px;">This action cannot be undone</p>
    <p style="color:#444;font-size:14px;line-height:1.6;margin-bottom:22px;">After this.. You will never be able to recover your account by any means. All your streaks, credits, diamonds, history, and badges will be lost forever.</p>
    <div style="display:flex;gap:12px;">
      <button id="del-acc-cancel-1" style="flex:1;padding:16px;border:none;border-radius:50px;background:#ef4444;color:#fff;font-weight:800;font-size:16px;cursor:pointer;">Cancel</button>
      <button id="del-acc-confirm-1" disabled style="flex:1;padding:16px;border:none;border-radius:50px;background:#e5e7eb;color:#9ca3af;font-weight:800;font-size:16px;cursor:not-allowed;">Confirm (30)</button>
    </div>
  </div>`;
  document.body.appendChild(overlay);

  const confirmBtn = document.getElementById("del-acc-confirm-1");
  let secs = 30;
  const timer = setInterval(() => {
    secs--;
    if (secs <= 0) {
      clearInterval(timer);
      confirmBtn.disabled = false;
      confirmBtn.textContent = "Confirm";
      confirmBtn.style.background = "#d1d5db";
      confirmBtn.style.color = "#374151";
      confirmBtn.style.cursor = "pointer";
    } else {
      confirmBtn.textContent = `Confirm (${secs})`;
    }
  }, 1000);

  document.getElementById("del-acc-cancel-1").onclick = () => { clearInterval(timer); overlay.remove(); };
  confirmBtn.onclick = () => {
    if (confirmBtn.disabled) return;
    clearInterval(timer);
    overlay.remove();
    showDeleteAccountStep2();
  };
}

function showDeleteAccountStep2() {
  const overlay = document.createElement("div");
  overlay.className = "delete-acc-overlay";
  overlay.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,0.75);backdrop-filter:blur(10px);display:flex;align-items:center;justify-content:center;z-index:99999;padding:20px;";

  overlay.innerHTML = `
  <div style="background:#fff;border-radius:20px;padding:26px 22px;max-width:340px;width:100%;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,0.35);">
    <img src="images/insta.jpeg" style="width:48px;height:48px;border-radius:12px;margin-bottom:6px;">
    <p style="font-size:9px;letter-spacing:2px;color:#999;font-weight:700;margin-bottom:14px;">PRIME FOLLOWER</p>
    <p style="color:#333;font-size:14px;line-height:1.55;margin-bottom:8px;">In the next second, all information associated with your account will be <b style="color:#ef4444;">permanently deleted.</b></p>
    <p style="color:#555;font-size:13px;line-height:1.5;margin-bottom:16px;">Once this action is taken, it cannot be reversed under any circumstances. You will not be able to recover anything.</p>
    <label style="display:flex;align-items:center;gap:8px;justify-content:center;margin-bottom:18px;cursor:pointer;">
      <input type="checkbox" id="del-acc-understand" style="width:18px;height:18px;accent-color:#ef4444;">
      <span style="font-size:14px;font-weight:600;color:#374151;">I Understand</span>
    </label>
    <div style="display:flex;gap:12px;">
      <button id="del-acc-cancel-2" style="flex:1;padding:14px;border:none;border-radius:50px;background:#ef4444;color:#fff;font-weight:800;font-size:15px;cursor:pointer;">Cancel</button>
      <button id="del-acc-confirm-2" disabled style="flex:1;padding:14px;border:none;border-radius:50px;background:#e5e7eb;color:#9ca3af;font-weight:800;font-size:15px;cursor:not-allowed;">Yes delete (5)</button>
    </div>
  </div>`;
  document.body.appendChild(overlay);

  const confirmBtn = document.getElementById("del-acc-confirm-2");
  const checkbox = document.getElementById("del-acc-understand");
  let secs = 5;
  let timerDone = false;

  const timer = setInterval(() => {
    secs--;
    if (secs <= 0) {
      clearInterval(timer);
      timerDone = true;
      confirmBtn.textContent = "Yes delete";
      updateConfirmState();
    } else {
      confirmBtn.textContent = `Yes delete (${secs})`;
    }
  }, 1000);

  function updateConfirmState() {
    if (timerDone && checkbox.checked) {
      confirmBtn.disabled = false;
      confirmBtn.style.background = "#ef4444";
      confirmBtn.style.color = "#fff";
      confirmBtn.style.cursor = "pointer";
    } else {
      confirmBtn.disabled = true;
      confirmBtn.style.background = "#e5e7eb";
      confirmBtn.style.color = "#9ca3af";
      confirmBtn.style.cursor = "not-allowed";
    }
  }

  checkbox.addEventListener("change", updateConfirmState);
  document.getElementById("del-acc-cancel-2").onclick = () => { clearInterval(timer); overlay.remove(); };

  confirmBtn.onclick = async () => {
    if (confirmBtn.disabled) return;
    confirmBtn.textContent = "Deleting...";
    confirmBtn.disabled = true;
    const user = window.cashTreasureUser;
    try {
      // Delete Firestore user document
      await _deleteDoc(_doc(_db, "users", user.uid));
      // Try to delete auth account (may need recent login)
      try {
        if (_auth.currentUser) await _deleteUser(_auth.currentUser);
      } catch (authErr) {
        console.warn("Auth delete needs re-login:", authErr);
      }
      await _signOut(_auth).catch(() => {});
      localStorage.clear();
      overlay.remove();
      showToast("Account deleted", "success");
      setTimeout(() => { window.location.href = "FIXSIGNIN/index.html"; }, 1000);
    } catch (err) {
      console.error("Delete account error:", err);
      showToast("Failed to delete. Please re-login and try again.", "error");
      confirmBtn.textContent = "Yes delete";
      confirmBtn.disabled = false;
    }
  };
}

console.log('✅ Contact module loaded.');


// ══════════════════════════════════════════════════
// SUPPORT REPLIES — Notification Bell System
// ══════════════════════════════════════════════════

const REPLIES_STORAGE_KEY = "primeFollowerLastReplies";
const SEEN_REPLIES_KEY = "primeFollowerSeenReplyIds";

function getCachedReplies() {
  try {
    return JSON.parse(localStorage.getItem(REPLIES_STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function getSeenReplyIds() {
  try {
    return JSON.parse(localStorage.getItem(SEEN_REPLIES_KEY)) || [];
  } catch {
    return [];
  }
}

function fmtReplyDate(dateVal) {
  if (!dateVal) return "";
  try {
    let d;
    if (dateVal.toDate) {
      d = dateVal.toDate();
    } else if (dateVal.seconds !== undefined) {
      // Serialized Firestore Timestamp shape after JSON round-trip through localStorage
      d = new Date(dateVal.seconds * 1000);
    } else {
      d = new Date(dateVal);
    }
    if (isNaN(d.getTime())) return "";
    return d.toLocaleDateString() + " " + d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

/**
 * Refreshes the bell icon (notification.png vs notification1.png) based on
 * whether there are unseen replies. Exposed on window so script.js can call
 * it whenever the Contact page opens.
 */
window.refreshNotifBellIcon = async function () {
  const user = window.cashTreasureUser;
  const iconEl = document.getElementById("notif-bell-icon");
  if (!iconEl) return;

  if (!user) {
    iconEl.src = "images/notification.png";
    return;
  }

  try {
    const replies = await getMyReplies(user.uid);
    const last3 = replies.slice(0, 3);
    localStorage.setItem(REPLIES_STORAGE_KEY, JSON.stringify(last3));

    const seenIds = getSeenReplyIds();
    const hasUnseen = last3.some(r => !seenIds.includes(r.id));

    iconEl.src = hasUnseen ? "images/notification1.png" : "images/notification.png";
  } catch (err) {
    console.error("[Contact] Failed to refresh replies:", err);
    iconEl.src = "images/notification.png";
  }
};

function renderRepliesList() {
  const list = document.getElementById("replies-list");
  if (!list) return;

  const replies = getCachedReplies();

  if (replies.length === 0) {
    list.innerHTML = `
      <div class="reply-empty-state">
        <i class="fas fa-comment-slash"></i>
        <p>No replies yet</p>
      </div>`;
    return;
  }

  list.innerHTML = replies.map((r, i) => `
    <div class="reply-item" data-index="${i}">
      <div class="reply-item-header">
        <div class="reply-item-subject">${r.subject || "Support"}</div>
        <div class="reply-item-date">${fmtReplyDate(r.repliedAt)}</div>
      </div>
      <div class="reply-item-preview">${(r.adminReply || "").slice(0, 60)}${(r.adminReply || "").length > 60 ? "…" : ""}</div>
    </div>
  `).join("");

  // Mark all currently-shown replies as seen
  const seenIds = getSeenReplyIds();
  const newSeenIds = Array.from(new Set([...seenIds, ...replies.map(r => r.id)]));
  localStorage.setItem(SEEN_REPLIES_KEY, JSON.stringify(newSeenIds));

  const iconEl = document.getElementById("notif-bell-icon");
  if (iconEl) iconEl.src = "images/notification.png";

  list.querySelectorAll(".reply-item").forEach(item => {
    item.addEventListener("click", () => {
      const r = replies[Number(item.dataset.index)];
      if (!r) return;
      document.getElementById("reply-detail-date").textContent =
        `${r.subject || "Support"} — ${fmtReplyDate(r.repliedAt)}`;
      const cleanText = (t) => (t || "—").replace(/</g, "&lt;").replace(/\n{2,}/g, "\n");
      document.getElementById("reply-detail-text").innerHTML = `
        <div class="reply-detail-original">
          <span class="reply-detail-label">Your message:</span>
          <p>${cleanText(r.message)}</p>
        </div>
        <div class="reply-detail-admin">
          <span class="reply-detail-label">Support reply:</span>
          <p>${cleanText(r.adminReply)}</p>
        </div>
      `;
      document.getElementById("reply-detail-overlay").classList.add("visible");
      document.getElementById("prime-ai-float-btn")?.style.setProperty("display", "none");
    });
  });
}

document.getElementById("notif-bell")?.addEventListener("click", () => {
  renderRepliesList();
  document.getElementById("replies-overlay")?.classList.add("visible");
  document.getElementById("bottom-nav").style.display = "none";
  document.getElementById("prime-ai-float-btn")?.style.setProperty("display", "none");
});

document.getElementById("replies-back")?.addEventListener("click", () => {
  document.getElementById("replies-overlay")?.classList.remove("visible");
  document.getElementById("bottom-nav").style.display = "flex";
  document.getElementById("prime-ai-float-btn")?.style.removeProperty("display");
});

document.getElementById("reply-detail-close")?.addEventListener("click", () => {
  document.getElementById("reply-detail-overlay")?.classList.remove("visible");
  document.getElementById("prime-ai-float-btn")?.style.removeProperty("display");
});

document.getElementById("reply-detail-overlay")?.addEventListener("click", (e) => {
  if (e.target === e.currentTarget) {
    e.currentTarget.classList.remove("visible");
    document.getElementById("prime-ai-float-btn")?.style.removeProperty("display");
  }
});