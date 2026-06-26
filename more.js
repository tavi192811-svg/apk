// ================================
// Prime Follower - More Page Module
// About, Privacy, Terms, Help/FAQ, Settings, Logout
// ================================

// ── 1. Imports ────────────────────────────────────────────────────────────────

import { auth, signOut } from "./firebase.js";

// ── 2. Page Content ───────────────────────────────────────────────────────────

/**
 * Static content for each detail overlay page.
 * Keys match the `data-page` attribute on `.more-item` elements.
 */
const pageContent = {

about: {
    title: "About Us",
    body: `
      <p><b>About Us – Prime Follower</b></p>

      <p>Welcome to <b>Prime Follower 🚀</b>, a platform built to help creators and everyday Instagram users grow their presence while keeping the experience simple, fair, transparent, and genuinely rewarding.</p>

      <p>At Prime Follower, we believe every creator — big or small — deserves the opportunity to grow and be seen. Whether you're just starting your journey or already building a personal brand, our mission is to give you a smooth, engaging, and trustworthy way to expand your social reach without confusion or hidden catches.</p>

      <p><b>🌟 Our Mission</b></p>
      <p>Our goal is simple: help users grow their Instagram presence in a fun, rewarding, and sustainable way. Prime Follower was built so users can earn credits daily, stay engaged through simple activities, and unlock real follower rewards through consistent participation — no shortcuts, no gimmicks.</p>

      <p><b>👥 Free Followers – Earn & Grow</b></p>
      <p>
        ▶️ Watch short rewarded ads to earn credits, completely free.<br>
        💰 Use your earned credits to order real followers for your Instagram account.<br>
        📅 Stay active daily — the more consistent you are, the more you earn.<br>
        🎯 Daily ad limits and credit caps are clearly shown, so there's never any confusion about how much you can earn each day.<br>
        🚀 Perfect for users who want to grow steadily without spending any money.
      </p>

      <p><b>💎 Paid Orders – Instant Growth</b></p>
      <p>
        ⚡ Want faster results? Purchase follower packages directly with secure, instant checkout.<br>
        🛡️ Every payment is processed through <b>Cashfree</b>, one of India's most trusted and RBI-recognized payment gateways.<br>
        🔒 100% Secure Payments – All transactions are encrypted end-to-end. We never see or store your card, UPI, or banking details — Cashfree handles all sensitive payment data directly.<br>
        🧾 Every paid order is verified and recorded server-side before any followers are processed, so there's no risk of lost or duplicate payments.<br>
        🎟️ Coupons & discounts are available from time to time to make growing your account even more affordable.
      </p>

      <p><b>🤝 Refer & Earn – Prime Viral Bonus</b></p>
      <p>
        🔗 Share your unique referral link or code with friends and fellow creators.<br>
        🎁 When someone joins using your referral, both of you can unlock bonus followers and rewards through our Prime Viral Bonus system.<br>
        📈 The more genuine people you bring to Prime Follower, the more your community — and your rewards — grow together.<br>
        ✅ Our referral system is built to reward real engagement, with safeguards in place to keep it fair for everyone.
      </p>

      <p><b>🏆 Prime Levels – Fair Rewards for Loyal Users</b></p>
      <p>
        🥉 <b>Prime Starter</b> – Every new user begins here, with full access to free and paid growth options.<br>
        🦁 <b>Prime Lion</b> – Unlocked by completing the 7-Day Check-In Challenge, rewarding consistency.<br>
        🦈 <b>Prime Shark</b> – Unlocked through the Prime Viral Bonus or your first successful paid order.<br>
        👑 <b>Prime Elite</b> – Reserved for users who reach ₹1000 or more in lifetime spending.<br>
        💠 <b>Prime Member</b> – Our top tier, for users spending ₹2000 or more within a calendar month.<br><br>
        ⭐ Higher levels unlock real benefits: bigger daily ad limits, better coupons, faster delivery times, free monthly followers, and exclusive diamond rewards.<br>
        ⚖️ Our <b>Level Skip System</b> means you're never stuck climbing one step at a time — you instantly receive the highest level you qualify for.<br>
        🔄 Levels are reviewed monthly to keep the system fair and active for everyone, rewarding users who stay engaged while keeping the playing field honest.
      </p>

      <p><b>💡 What Makes Prime Follower Different</b></p>
      <p>
        🎯 User-First Experience – Every feature is designed to be simple, fast, and enjoyable.<br>
        🔒 Respect for Users – We value your time, your data, and your trust.<br>
        ⚡ Transparent Reward System – Earn credits and know exactly how to use them.<br>
        🎁 Daily Rewards & Check-Ins – Stay active and unlock bonuses every single day.<br>
        💳 Secure Payments – Every paid order is protected through Cashfree's trusted infrastructure.<br>
        🤝 Fair Referral & Level System – Real rewards for real engagement, with no shortcuts or exploits.<br>
        📱 Mobile-Focused Design – Built from the ground up to feel like a modern, premium mobile app.
      </p>

      <p><b>🤝 Our Commitment</b></p>
      <p>
        💬 Listening closely to user feedback<br>
        🛠 Continuously improving the platform and fixing issues fast<br>
        ⚖ Keeping the credit, referral, and level systems fair and transparent<br>
        🔐 Protecting user privacy, accounts, and payment data at every step
      </p>

      <p><b>🚀 Our Vision</b></p>
      <p>We want Prime Follower to become a platform where creators of every size feel motivated, rewarded, and genuinely supported — a place where growing your Instagram presence feels exciting, safe, and worth coming back to every day.</p>

      <p><b>❤️ Thank You</b></p>
      <p>Thank you for being part of Prime Follower. Whether you're earning credits, referring friends, climbing levels, or placing your first paid order — your support helps us continue building and improving the platform for everyone.</p>
      <p>— Team Prime Follower</p>
    `
  },

privacy: {
    title: "Privacy Policy",
    body: `
      <p><b>🔒 Privacy Policy – Prime Follower</b></p>

      <p>At Prime Follower, your privacy is extremely important to us. We believe every user deserves a safe and respectful environment while using our platform. This Privacy Policy explains how we collect, use, protect, and store your information when you use Prime Follower, including when you earn credits, refer friends, climb Prime Levels, or make a paid order.</p>

<div class="policy-section">
  <div class="policy-title">📌 Information We Collect</div>

  <div class="policy-item">
    <span class="policy-icon">📧</span>
    <div>Email Address – Used for account registration and login.</div>
  </div>

  <div class="policy-item">
    <span class="policy-icon">👤</span>
    <div>Username & Instagram Details – Required to identify your account and process orders.</div>
  </div>

  <div class="policy-item">
    <span class="policy-icon">📱</span>
    <div>Device Information – Used for security, app performance, and ad services.</div>
  </div>

  <div class="policy-item">
    <span class="policy-icon">📊</span>
    <div>Usage Data – Includes ad views, check-ins & rewards.</div>
  </div>


  <div class="policy-item">
    <span class="policy-icon">🧾</span>
    <div>Order Records – Includes package details, amounts, and payment status. Payment information is securely processed by Cashfree and is not stored by us.</div>
  </div>
</div>

      <p>We do not collect unnecessary personal data.</p>

      <p><b>🎯 How We Use Your Information</b></p>
      <p>
        ⚙️ Provide and maintain our services<br>
        🔐 Secure user accounts and prevent fraud or abuse<br>
        🏆 Calculate your credits, Prime Level, and referral rewards accurately<br>
        💳 Process paid orders and verify payment status<br>
        📈 Improve features and user experience<br>
        🛠 Fix bugs and improve performance<br>
        💬 Respond to user support requests
      </p>

      <p><b>💳 Payment Information & Security</b></p>
      <p>
        🔒 All paid orders are processed through <b>Cashfree</b>, a secure and trusted payment gateway used by businesses across India.<br>
        🛡️ Prime Follower never sees, collects, or stores your card number, UPI ID, or banking credentials at any point — these details go directly to Cashfree's secure systems.<br>
        🧾 Our servers only store the order ID, amount, and payment status (such as "paid" or "pending") needed to deliver your followers correctly.<br>
        ✅ Every payment is verified server-side before any credits or followers are added to your account, keeping the entire process safe and tamper-resistant.
      </p>

      <p><b>🤝 Referral & Level Data</b></p>
      <p>
        🔗 When you use a referral link or code, we store which account referred you so that both users receive the correct Prime Viral Bonus rewards.<br>
        🏆 Your Prime Level (Starter, Lion, Shark, Elite, or Member) is calculated from your activity and spending history, and is reviewed periodically to keep the system fair.<br>
        📊 This data is used only to operate the referral and level systems — it is never sold or used for unrelated purposes.
      </p>

      <p><b>🔒 Data Protection</b></p>
      <p>
        🛡 Secure authentication systems via Firebase<br>
        🔐 Protected databases with strict access rules, so users can only access their own data<br>
        ⚙️ Trusted backend services hosted on secure infrastructure<br>
        🔁 Sensitive actions like credits, orders, and payments are verified and written server-side, not directly by the app, to prevent tampering
      </p>
      <p>We continuously work to keep Prime Follower safe and secure for everyone.</p>

      <p><b>🤝 Sharing of Information</b></p>
      <p>We respect our users and do not sell or trade personal information. Your information may only be shared when required by law, necessary to operate the platform, or when using trusted third-party services — such as Cashfree for payments — that help run the app securely.</p>

      <p><b>📱 Third-Party Services</b></p>
      <p>
        ☁ Firebase for authentication and database<br>
        💳 Cashfree for secure payment processing<br>
        📧 Email services for support messages<br>
        📊 Analytics tools to improve the platform
      </p>

      <p><b>🔄 Updates to This Policy</b></p>
      <p>We may update this Privacy Policy from time to time, especially as we add new features like referrals, levels, or payment options. Updates will always be reflected on this page.</p>

      <p><b>📩 Contact Us</b></p>
      <p>If you have any questions, you can contact us through the Contact Us section inside Prime Follower.</p>
      <p>Thank you for trusting Prime Follower. 💙</p>
    `
  },

terms: {
    title: "Terms & Conditions",
    body: `
      <p><b>📜 Terms & Conditions – Prime Follower</b></p>

      <p>Welcome to Prime Follower. By accessing or using our platform, you agree to follow these terms and conditions, including the rules around credits, referrals, Prime Levels, and paid orders described below.</p>

      <p><b>✅ Acceptance of Terms</b></p>
      <p>
        📌 Follow these Terms & Conditions<br>
        📌 Use the platform responsibly<br>
        📌 Respect other users and the system
      </p>

      <p><b>👤 User Accounts</b></p>
      <p>
        🔐 Keeping login details secure<br>
        📧 Providing accurate information<br>
        ⚠ Not sharing their account with others<br>
        🚫 Not creating duplicate accounts to farm credits, referrals, or level rewards
      </p>

      <p><b>🎯 Platform Usage</b></p>
      <p>Prime Follower allows users to earn credits through daily activity and ads, refer friends for bonus rewards, climb Prime Levels, and use credits or direct payments for follower orders. Users must use the platform fairly, follow system rules, and respect platform limits.</p>

      <p><b>💳 Paid Orders & Payments</b></p>
      <p>
        💰 Paid follower orders are processed securely through <b>Cashfree</b>, a trusted third-party payment gateway.<br>
        🔒 All payment transactions are encrypted and handled directly by Cashfree — Prime Follower does not store your card, UPI, or banking details.<br>
        ✅ Followers or credits linked to a paid order are only delivered after the payment is verified as successful on our servers.<br>
        🧾 Paid orders are non-refundable once payment is confirmed, except where required by law.<br>
        ⚠️ Users are responsible for entering accurate Instagram details before confirming a paid order — Prime Follower is not responsible for orders delivered to an incorrect account due to user error.
      </p>

      <p><b>🤝 Referral Program (Prime Viral Bonus)</b></p>
      <p>
        🔗 Users may share their referral link or code with others to earn bonus followers and rewards.<br>
        ✅ Referral rewards are only granted for genuine, real users who join and engage with the platform.<br>
        🚫 Using fake accounts, bots, or manipulative tactics to generate referrals is strictly prohibited and may result in forfeited rewards or account restrictions.<br>
        ⚖️ Prime Follower reserves the right to review, adjust, or revoke referral rewards obtained through abuse of the system.
      </p>

      <p><b>🏆 Prime Levels</b></p>
      <p>
        📊 Prime Levels (Starter, Lion, Shark, Elite, and Member) are awarded based on activity, check-ins, referrals, and spending as described in the app.<br>
        🔄 Levels are reviewed periodically (such as monthly), and a level may increase or decrease based on whether retention requirements continue to be met.<br>
        🎁 Level-based perks — such as ad limits, coupons, free followers, and delivery speed — may be changed, expanded, or adjusted by Prime Follower at any time to keep the system sustainable and fair.<br>
        ⚖️ The Level Skip System and level requirements are determined solely by Prime Follower and may be updated as the platform evolves.
      </p>

      <p><b>🚫 Prohibited Activities</b></p>
      <p>
        ❌ Creating multiple accounts to exploit credits, referrals, or level rewards<br>
        ❌ Using bots or automated tools to watch ads, check in, or refer others<br>
        ❌ Attempting to hack, exploit, or damage the platform or payment system<br>
        ❌ Submitting false Instagram details to manipulate orders or bonuses<br>
        ❌ Any activity that disrupts the system or unfairly disadvantages other users
      </p>
      <p>Accounts violating these rules may be restricted, have rewards revoked, or be permanently removed, including forfeiture of any credits, diamonds, or pending orders.</p>

      <p><b>📊 Rewards & Credits</b></p>
      <p>
        💠 Credits and diamonds have no real-world monetary value and cannot be exchanged for cash<br>
        💠 Credits and diamonds are used only within the platform, strictly for follower orders and platform features<br>
        💠 Daily ad limits and daily credit caps apply and may vary by Prime Level<br>
        💠 Reward systems, ad limits, and credit caps may change as the platform evolves
      </p>

      <p><b>🔄 Updates</b></p>
      <p>We may update these terms as the platform grows, including changes to credit limits, referral rules, or level requirements. Continued use of Prime Follower means you accept the updated terms.</p>

      <p><b>📩 Contact</b></p>
      <p>If you have questions about payments, referrals, levels, or anything else, please contact us through the Contact section inside the platform. Thank you for using Prime Follower.</p>
    `
  },

help: {
    title: "Help / FAQ",
    body: buildFAQHTML([
      ["1. ❓ How do I earn credits?", "➡️ Watch ads, complete check-ins, and participate in Prime Follower activities."],
      ["2. ❓ Why are my credits not updating?", "➡️ Refresh the app and wait a few moments for real-time synchronization."],
      ["3. ❓ Why is my order history empty?", "➡️ You have not placed any orders yet or another tab is selected."],
      ["4. ❓ How do I order followers?", "➡️ Open the Order page, enter your username, and confirm your order."],
      ["5. ❓ When will followers arrive?", "➡️ Delivery time depends on your level and usually starts within 24 hours."],
      ["6. ❓ Why is today's check-in locked?", "➡️ Complete the required ads to unlock the day's reward."],
      ["7. ❓ What is the daily ad limit?", "➡️ Your ad limit depends on your level. It ranges from 10 to 50 ads per day."],
      ["8. ❓ Can I get refunded credits?", "➡️ No. Used credits cannot be refunded."],
      ["9. ❓ Why do I see an insufficient credits error?", "➡️ Your current balance is lower than the order cost."],
      ["10. ❓ Is my account safe here?", "➡️ Yes. Follow all app rules and policies to keep your account secure."],
      ["11. ❓ Can I get a refund for paid orders?", "➡️ No. Paid orders are non-refundable according to our policy."],
      ["12. ❓ Is it safe to pay money on Prime Follower?", "➡️ Yes. Payments are securely processed through Cashfree."],
      ["13. ❓ Is there a follower limit per account?", "➡️ Yes. Each account can receive up to 100,000 followers."],
      ["14. ❓ How can I contact Prime Follower?", "➡️ Tap the Contact button in the bottom navigation bar."],
      ["15. ❓ What are Prime Levels?", "➡️ Prime Levels are membership tiers that unlock better rewards, discounts, and benefits."],
      ["16. ❓ How many levels are available?", "➡️ There are 5 levels: Prime Starter, Prime Lion, Prime Shark, Prime Elite, and Prime Member."],
      ["17. ❓ How do I become Prime Lion?", "➡️ Complete the 7-Day Check-In Challenge."],
      ["18. ❓ How do I become Prime Shark?", "➡️ Complete Prime Viral Bonus or successfully complete a paid purchase."],
      ["19. ❓ How do I become Prime Elite?", "➡️ Reach ₹1000 or more lifetime spending."],
      ["20. ❓ How do I become Prime Member?", "➡️ Spend ₹2000 or more during the current calendar month."],
      ["21. ❓ What is the Level Skip System?", "➡️ You automatically receive the highest level you qualify for without unlocking levels one by one."],
      ["22. ❓ What is the Monthly Level Review?", "➡️ During the first few days of each month, your previous month's activity is reviewed."],
      ["23. ❓ Can my level decrease?", "➡️ Yes. If you do not meet retention requirements, your level may be reduced."],
      ["24. ❓ How do I keep Prime Shark?", "➡️ Earn at least 100 credits every month."],
      ["25. ❓ How do I keep Prime Elite?", "➡️ Spend at least ₹500 during a calendar month."],
      ["26. ❓ How do I keep Prime Member?", "➡️ Spend at least ₹1000 during a calendar month."],
      ["27. ❓ Do higher levels get better rewards?", "➡️ Yes. Higher levels receive better coupons, higher ad limits, free followers, and faster delivery."],
      ["28. ❓ Do Prime Members get free followers?", "➡️ Yes. Prime Member receives 250 free followers every month."],
      ["29. ❓ Why did I receive a diamond reward?", "➡️ Users reaching Prime Shark may receive a special diamond reward."],
      ["30. ❓ When will the Spin Wheel feature be released?", "➡️ The Spin Wheel feature is currently planned for 2027."]
    ])
  }
};

// ── 3. FAQ HTML Builder ───────────────────────────────────────────────────────

/**
 * Generates the FAQ accordion HTML from a 2D array of [question, answer] pairs.
 * Extracted so the pageContent object stays declarative and easy to edit.
 * @param {Array<[string, string]>} items
 * @returns {string}
 */
function buildFAQHTML(items) {
  const rows = items.map((item, i) => `
    <div class="faq-item">
      <div class="faq-question" data-index="${i}">${item[0]}</div>
      <div class="faq-answer">${item[1]}</div>
    </div>`).join("");
  return `<div class="faq-container">${rows}</div>`;
}

// ── 4. Navigation & Detail Overlay Logic ─────────────────────────────────────

document.querySelectorAll(".more-item[data-page]").forEach(item => {
  item.addEventListener("click", () => {
    const content = pageContent[item.dataset.page];
    if (!content) return;

    // Hide the close button for overlay pages (back arrow is used instead)
    const closeBtn = document.getElementById("detail-close");
    if (closeBtn) closeBtn.style.display = "none";

    document.getElementById("detail-title").textContent = content.title;
    document.getElementById("detail-body").innerHTML = content.body;
    document.getElementById("detail-overlay").classList.add("visible");
    document.getElementById("bottom-nav").style.display = "none";
    document.getElementById("prime-ai-float-btn")?.style.setProperty("display", "none");
  });
});

document.getElementById("detail-back")?.addEventListener("click", () => {
  document.getElementById("detail-overlay").classList.remove("visible");
  document.getElementById("bottom-nav").style.display = "flex";
  document.getElementById("prime-ai-float-btn")?.style.removeProperty("display");
});


// ── 5. FAQ Accordion Handler ──────────────────────────────────────────────────

// Event delegation handles clicks on dynamically-rendered FAQ items
document.addEventListener("click", (e) => {
  const question = e.target.closest(".faq-question");
  if (!question) return;

  const answer = question.nextElementSibling;
  if (!answer) return;

  // Collapse any other open answer
  document.querySelectorAll(".faq-answer").forEach(a => {
    if (a !== answer) a.classList.remove("active");
  });

  answer.classList.toggle("active");
});

// ── 6. Logout with Confirmation Modal ────────────────────────────────────────

document.getElementById("btn-logout")?.addEventListener("click", () => {
  // Not logged in — redirect straight to sign-in page
  if (!auth.currentUser) {
    window.location.href = "../FIXSIGNIN/index.html";
    return;
  }
  document.getElementById("logout-modal").classList.add("visible");
});

document.getElementById("logout-cancel")?.addEventListener("click", () => {
  document.getElementById("logout-modal").classList.remove("visible");
});

document.getElementById("logout-yes")?.addEventListener("click", async () => {
  try {
    await signOut(auth);
    window.showToast?.("Logged out successfully.");
    document.getElementById("logout-modal").classList.remove("visible");
    setTimeout(() => { window.location.href = "index.html"; }, 500);
  } catch (err) {
    console.error("[More] Logout error:", err);
    window.showToast?.("Failed to logout. Try again.", "error");
    document.getElementById("logout-modal").classList.remove("visible");
  }
});

document.getElementById("logout-modal")?.addEventListener("click", (e) => {
  if (e.target === e.currentTarget) e.currentTarget.classList.remove("visible");
});

console.log("✅ More module loaded.");