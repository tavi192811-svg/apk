// ================================
// Wallet Module
// ================================

// ── 1. Imports ──
import {
  auth,
  getUserProfile,
  getTransactions,
  getOrderById
} from './firebase.js';

import { showToast } from './pay.js';


// ── 2. State Management ──
let allTransactions = [];
let currentTab      = 'redeem';


// ── 3. Utility Functions ──

/** Format a Firestore Timestamp (or any Date-like) into a readable string. */
function formatDate(timestamp) {
  let date;
  if (timestamp?.toDate) {
    date = timestamp.toDate();
  } else if (timestamp?.seconds !== undefined) {
    // Plain serialized Firestore Timestamp shape {seconds, nanoseconds}
    date = new Date(timestamp.seconds * 1000);
  } else if (timestamp) {
    date = new Date(timestamp);
  } else {
    return '—';
  }
  if (isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-US', {
    year:  'numeric',
    month: 'short',
    day:   'numeric'
  });
}

/**
 * Determine the delivery status label and color based on how long ago the order was placed.
 * < 1 hour  → Pending  (red)
 * < 24 hours → Working  (orange)
 * ≥ 24 hours → Delivered Successfully (green)
 */
function getOrderStatus(txDate) {
  const diffHours = (Date.now() - txDate.getTime()) / (1000 * 60 * 60);

  if (diffHours < 1)  return { text: "Pending",               color: "red"    };
  if (diffHours < 24) return { text: "Working",               color: "orange" };
  return               { text: "Delivered Successfully",       color: "green"  };
}


// ── 4. Wallet Loading & Rendering ──

async function loadWallet(uid) {
  try {
    const profile = await getUserProfile(uid);
    if (profile) {
const balanceEl = document.getElementById('wallet-balance');
      if (balanceEl) {
        const rawBal = profile.credits || 0;
        const displayBal = Number.isInteger(rawBal) ? rawBal : parseFloat(rawBal.toFixed(1));
        balanceEl.innerHTML = `${displayBal}<span class="balance-unit">Credits</span>`;
      }
    }

    allTransactions = await getTransactions(uid);
    renderTransactions();

  } catch (err) {
    console.error('Wallet load error:', err);
  }
}

function renderTransactions() {
  const listEl = document.getElementById('transaction-list');
  if (!listEl) return;

  // Three tabs:
  // "redeem"  → Order History (orders / debits)
  // "point"   → Credit History (credit earnings + diamond changes)
  // "diamond" → Diamond History only
  let filtered;

if (currentTab === 'redeem') {
filtered = allTransactions.filter(tx => {
const amount = Number(tx.amount || 0);
const isDiamond = tx.diamondChange !== undefined && tx.diamondChange !== 0;
if (isDiamond && amount === 0 && !tx.action?.toLowerCase().includes("order")) return false;
return amount <= 0 || tx.action?.toLowerCase().includes("order");
});
} else {
// Credit History → credit earnings (amount > 0) + all diamond changes
filtered = allTransactions.filter(tx => {
const amount = Number(tx.amount || 0);
const isDiamond = tx.diamondChange !== undefined && tx.diamondChange !== 0;
return amount > 0 || isDiamond;
});
}

  if (filtered.length === 0) {
const emptyLabel = currentTab === 'redeem' ? 'order' : 'credit';
    listEl.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-receipt"></i>
        <p>No ${emptyLabel} history yet</p>
      </div>
    `;
    return;
  }

  listEl.innerHTML = filtered.map(tx => {
    const amount     = Number(tx.amount || 0);
    const diamondChange = Number(tx.diamondChange || 0);
    let rawDate;
    if (tx.date?.toDate) {
      rawDate = tx.date.toDate();
    } else if (tx.date?.seconds !== undefined) {
      rawDate = new Date(tx.date.seconds * 1000);
    } else if (tx.date) {
      rawDate = new Date(tx.date);
    } else {
      rawDate = new Date();
    }
    if (isNaN(rawDate.getTime())) rawDate = new Date();

    let amountHTML;
    if (diamondChange !== 0) {
      const dStr = diamondChange > 0 ? `+${diamondChange}` : `${diamondChange}`;
      const dClass = diamondChange > 0 ? 'positive' : 'negative';
      amountHTML = `<div class="tx-amount ${dClass}" style="display:flex;align-items:center;gap:4px;">${dStr} <img src="images/diamondgift.png" style="width:16px;height:16px;"></div>`;
    } else {
      const amountStr  = amount > 0 ? `+${amount}` : `${amount}`;
      const amountClass = amount > 0 ? 'positive' : 'negative';
      amountHTML = `<div class="tx-amount ${amountClass}">${amountStr}</div>`;
    }

    return `
      <div class="transaction-item order-item"
          data-action="${tx.action}"
data-ig="${tx.instagram_username || ''}"
data-link="${tx.instagram_link || ''}"
data-order-id="${tx.order_id || ''}"
           data-amount="${tx.amount}"
           data-date="${rawDate.toISOString()}">

        <div class="tx-info">
          <div class="tx-action">${tx.action || 'Transaction'}</div>
          <div class="tx-date">${formatDate(tx.date)}</div>
        </div>

        ${amountHTML}
      </div>
    `;
  }).join('');
}


// ── 5. Tab Switching Logic ──
document.querySelectorAll('.wallet-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.wallet-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    currentTab = tab.dataset.tab;
    renderTransactions();
  });
});


// ── 6. Transaction Detail Modal ──
document.addEventListener('click', async (e) => {
const item = e.target.closest('.order-item');
if (!item) return;
const actLower = (item.dataset.action || '').toLowerCase();
if (!actLower.includes("order")) return;

  const txDate  = new Date(item.dataset.date || Date.now());
  const statusEl = document.getElementById('detail-status');
  const costLine = document.getElementById('detail-cost-line');
  const action = item.dataset.action || '';
const isPaid = action.toLowerCase().includes("paid");
const isDiamondOrder = action.toLowerCase().includes("diamond order");
const isViralBonus = action.toLowerCase().includes("prime viral bonus");
const isDay3Bonus = action.toLowerCase().includes("day 3 bonus");

  // Fetch the live order doc when we have an order_id (admin-controlled status + full IG link).
  // Falls back to dataset-only display for older transactions created before this field existed.
  const orderId = item.dataset.orderId;
  let liveOrder = null;
  if (orderId) {
    try {
      liveOrder = await getOrderById(orderId);
    } catch (err) {
      console.warn('[Wallet] Could not fetch live order:', err);
    }
  }

  const orderDate = liveOrder?.order_time?.toDate ? liveOrder.order_time.toDate() : txDate;

  // Show heading differently for viral bonus
  const modalTitle = document.querySelector('#order-detail-modal .modal-box h3');

  if (isViralBonus) {
    if (modalTitle) {
      modalTitle.textContent = "PRIME VIRAL BONUS";
      modalTitle.style.color = "#FFD700";
    }
    if (costLine) costLine.innerHTML = `Cost: <span style="font-weight:800; color:#22c55e;">FREE</span>`;
  } else if (isDay3Bonus) {
    if (modalTitle) {
      modalTitle.textContent = "DAY 3 BONUS";
      modalTitle.style.color = "#60a5fa";
    }
    if (costLine) costLine.innerHTML = `Cost: <span style="font-weight:800; color:#22c55e;">FREE</span>`;
} else if (isDiamondOrder && costLine) {
if (modalTitle) {
modalTitle.textContent = "Diamond Order";
modalTitle.style.color = "#60a5fa";
}
const dia = liveOrder?.diamondCost ?? (action.match(/(\d+)\s*💎/)?.[1] || '0');
costLine.innerHTML = `Diamond Order: <span style="font-weight:800;color:#60a5fa;">${dia} 💎</span>`;
} else if (isPaid && costLine) {
if (modalTitle) {
modalTitle.textContent = "Order Details";
modalTitle.style.color = "";
}
const rupees = liveOrder?.paidAmount ?? (action.match(/₹(\d+)/)?.[1] || '0');
costLine.innerHTML = `Paid Order: <span style="font-weight:800;">₹${rupees}</span>`;
} else if (costLine) {
    if (modalTitle) {
      modalTitle.textContent = "Order Details";
      modalTitle.style.color = "";
    }
    const amt = item.dataset.amount || '0';
    costLine.innerHTML = `Credits Used: <span id="detail-credit-used">${amt}</span> <img src="icons/cashbag.png" style="height:18px;">`;
  }
  
const followersEl = document.getElementById('detail-followers');
const dateEl = document.getElementById('detail-date');
const timeEl = document.getElementById('detail-time');
const userEl = document.getElementById('detail-ig-user');
const linkEl = document.getElementById('detail-ig-link');

if (followersEl) {
  followersEl.textContent =
    liveOrder?.followers ?? (action.replace(/\D/g, "").substring(0, 5) || "0");
}

if (dateEl) {
  dateEl.textContent = orderDate.toLocaleDateString();
}

if (timeEl) {
  timeEl.textContent = orderDate.toLocaleTimeString();
}

if (userEl) {
  userEl.textContent = liveOrder?.instagram_username || item.dataset.ig || '-';
}

if (linkEl) {
  linkEl.textContent = liveOrder?.instagram_link || item.dataset.link || '-';
}

if (statusEl) {
  if (liveOrder?.status) {
    // Real admin-controlled status from the order document
    const STATUS_LABELS = {
      pending: { text: "Pending", color: "red" },
      processing: { text: "Processing", color: "orange" },
      delivering: { text: "Delivering", color: "#d4a017" },
      delivered: { text: "Delivered Successfully", color: "green" }
    };
    const s = STATUS_LABELS[liveOrder.status] || { text: liveOrder.status, color: "" };
    statusEl.textContent = s.text;
    statusEl.style.color = s.color;
  } else if (isPaid) {
    // Fallback time-based estimate (no live order found, e.g. old transaction)
    const diffHours = (Date.now() - txDate.getTime()) / (1000 * 60 * 60);

    if (diffHours < 1) {
      statusEl.textContent = "Pending";
      statusEl.style.color = "red";
    } else if (diffHours < 4) {
      statusEl.textContent = "Processing";
      statusEl.style.color = "orange";
    } else if (diffHours < 24) {
      statusEl.textContent = "Working";
      statusEl.style.color = "#d4a017";
    } else {
      statusEl.textContent = "Delivered Successfully";
      statusEl.style.color = "green";
    }
  } else {
    const status = getOrderStatus(txDate);
    statusEl.textContent = status.text;
    statusEl.style.color = status.color;
  }
}

document.getElementById('order-detail-modal')?.classList.add('visible');
});


// ── 7. Event Listeners & Auto-refresh ──

window.addEventListener('userReady', async (e) => {
  const { uid } = e.detail;
  await loadWallet(uid);

  // Refresh wallet data whenever the wallet tab is re-opened
  document.querySelectorAll('.nav-item[data-page]').forEach(item => {
    item.addEventListener('click', async () => {
      if (item.dataset.page === 'wallet') {
        const user = window.cashTreasureUser;
        if (user) await loadWallet(user.uid);
      }
    });
  });

  // Live auto-refresh every 5 seconds while the wallet page is active
  setInterval(async () => {
    const walletPage = document.getElementById('page-wallet');
    if (walletPage?.classList.contains('active')) {
      const user = window.cashTreasureUser;
      if (user) await loadWallet(user.uid);
    }
  }, 5000);
});





// ══════════════════════════════════════════════════
// MY BONUSES SYSTEM
// ══════════════════════════════════════════════════

const RAILWAY_BONUS_URL = 'https://myserver-production-d47c.up.railway.app';

document.getElementById('btn-my-bonuses')?.addEventListener('click', async () => {
  const user = window.cashTreasureUser;
  if (!user) return showToast('Please login first', 'error');
  document.getElementById('bonuses-modal')?.classList.add('visible');
  await loadMyBonuses(user.uid);
});

document.getElementById('bonuses-close')?.addEventListener('click', () => {
  document.getElementById('bonuses-modal')?.classList.remove('visible');
});

document.getElementById('bonuses-modal')?.addEventListener('click', (e) => {
  if (e.target === e.currentTarget) e.currentTarget.classList.remove('visible');
});

async function loadMyBonuses(uid) {
  const listEl = document.getElementById('bonuses-list');
  if (!listEl) return;
  listEl.innerHTML = '<div class="spinner"></div>';

  try {
    const res = await fetch(`${RAILWAY_BONUS_URL}/my-bonuses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: uid })
    });
    const data = await res.json();
    if (!data.success) {
      listEl.innerHTML = '<p style="text-align:center;color:#888;">Could not load bonuses</p>';
      return;
    }

    const bonuses = [];

    // Welcome diamond
    bonuses.push({
      title: '🎁 Welcome Diamond',
      desc: '+1 Diamond for joining',
      claimed: data.welcomeDiamond,
      claimable: !data.welcomeDiamond,
      bonusType: 'welcome_diamond'
    });

    // Prime Viral Bonus
    bonuses.push({
      title: '🚀 Prime Viral Bonus',
      desc: 'Refer 3 friends → 500 followers',
      claimed: data.primeViralBonusClaimed,
      claimable: false
    });

    // Shark diamond
    if (data.level >= 3) {
      bonuses.push({
        title: '💎 Shark Welcome Diamond',
        desc: '+1 Diamond for reaching Shark',
        claimed: data.sharkDiamondGranted,
        claimable: false
      });
    }

    // Shark lifetime 100 followers
    if (data.level >= 3) {
      bonuses.push({
        title: '👥 100 Free Followers (Lifetime)',
        desc: 'Prime Shark lifetime reward',
        claimed: data.sharkLifetimeFollowers,
        claimable: !data.sharkLifetimeFollowers,
        bonusType: 'shark_lifetime_100'
      });
    }

    // Elite monthly 100
    if (data.level >= 4) {
      bonuses.push({
        title: '👥 100 Free Followers (Monthly)',
        desc: 'Prime Elite monthly reward',
        claimed: data.eliteMonthlyClaimed,
        claimable: !data.eliteMonthlyClaimed,
        bonusType: 'elite_monthly_100'
      });
    }

    // Member monthly 250
    if (data.level >= 5) {
      bonuses.push({
        title: '👥 250 Free Followers (Monthly)',
        desc: 'Prime Member monthly reward',
        claimed: data.memberMonthlyClaimed,
        claimable: !data.memberMonthlyClaimed,
        bonusType: 'member_monthly_250'
      });
    }

    listEl.innerHTML = bonuses.map(b => {
      let btnHTML;
      if (!b.claimable) {
        btnHTML = b.claimed
          ? `<span style="color:#16a34a;font-weight:800;font-size:13px;">✅ CLAIMED</span>`
          : `<span style="color:#9ca3af;font-weight:700;font-size:12px;">Auto</span>`;
      } else {
        btnHTML = `<button class="bonus-claim-btn" data-type="${b.bonusType}"
          style="background:linear-gradient(135deg,#FFD700,#ffed4e,#FFA500);color:#1a1a2e;
                 border:none;border-radius:20px;padding:8px 16px;font-weight:800;font-size:12px;
                 cursor:pointer;box-shadow:0 4px 12px rgba(255,215,0,0.4);animation:shineBtn 2s infinite;">
          CLAIM NOW</button>`;
      }
      return `
        <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;
                    padding:14px 12px;background:#fff;border-radius:14px;margin-bottom:10px;
                    box-shadow:0 2px 8px rgba(0,0,0,0.06);">
          <div style="flex:1;">
            <div style="font-weight:800;font-size:14px;color:#1a1a2e;">${b.title}</div>
            <div style="font-size:12px;color:#777;margin-top:2px;">${b.desc}</div>
          </div>
          ${btnHTML}
        </div>`;
    }).join('');

    // Wire claim buttons
    listEl.querySelectorAll('.bonus-claim-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const type = btn.dataset.type;

        // Welcome diamond — no IG form, claim instantly
        if (type === 'welcome_diamond') {
          btn.disabled = true;
          btn.textContent = '⏳';
          try {
            const r = await fetch(`${RAILWAY_BONUS_URL}/diamond-welcome`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ userId: uid })
            });
            const d = await r.json();
            if (d.success) {
              showToast('💎 Welcome Diamond Collected!', 'success');
              const diamondEl = document.getElementById('diamond-count');
              if (diamondEl && d.diamonds !== undefined) diamondEl.textContent = d.diamonds;
              await loadMyBonuses(uid);
            } else {
              showToast(d.message || 'Already claimed', 'error');
            }
          } catch (e) {
            showToast('Network error', 'error');
            btn.disabled = false;
            btn.textContent = 'CLAIM NOW';
          }
          return;
        }

        // Follower bonuses — show IG form
        window._claimingBonusType = type;
        document.getElementById('bonuses-modal')?.classList.remove('visible');
        const u = document.getElementById('bonus-ig-username');
        const l = document.getElementById('bonus-ig-link');
        if (u) u.value = '';
        if (l) l.value = '';
        if (typeof window.autoFillInstagram === 'function') {
          window.autoFillInstagram(u, l);
        }
        document.getElementById('bonus-claim-modal')?.classList.add('visible');
      });
    });

  } catch (err) {
    console.error('loadMyBonuses error:', err);
    listEl.innerHTML = '<p style="text-align:center;color:#888;">Network error</p>';
  }
}

// Bonus claim form
document.getElementById('bonus-claim-cancel')?.addEventListener('click', () => {
  document.getElementById('bonus-claim-modal')?.classList.remove('visible');
  window._claimingBonusType = null;
});

document.getElementById('bonus-claim-confirm')?.addEventListener('click', async () => {
  const user = window.cashTreasureUser;
  if (!user || !window._claimingBonusType) return;

  const username = document.getElementById('bonus-ig-username')?.value.trim();
  const link = document.getElementById('bonus-ig-link')?.value.trim();

  if (!username) return showToast('Please enter Instagram username', 'error');
  if (link && !link.startsWith('https://www.instagram.com')) {
    return showToast('Link must start with https://www.instagram.com', 'error');
  }

  const btn = document.getElementById('bonus-claim-confirm');
  btn.disabled = true;
  btn.textContent = '⏳ Processing...';

  try {
    const res = await fetch(`${RAILWAY_BONUS_URL}/claim-level-followers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: user.uid,
        bonusType: window._claimingBonusType,
        instagram_username: username,
        instagram_link: link
      })
    });
    const data = await res.json();

    if (data.success) {
      showToast('🎉 Bonus claimed! Followers incoming!', 'success');
      document.getElementById('bonus-claim-modal')?.classList.remove('visible');
    } else {
      showToast(data.message || 'Claim failed', 'error');
    }
  } catch (err) {
    console.error('Bonus claim error:', err);
    showToast('Network error. Try again.', 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'CONFIRM';
    window._claimingBonusType = null;
  }
});