/**
 * Login modal + session handling.
 * Talks to the real API (Law_College_API -> AccountController.Login) so
 * login works end-to-end even while the rest of the site is static markup.
 */
(function () {
  "use strict";

  const { API_URL, CMS_URL } = window.SGLC_CONFIG;
  const SESSION_TOKEN_KEY = "sglc_token";
  const SESSION_USER_KEY = "sglc_user";

  const loginTrigger = document.getElementById("loginTrigger");
  const loginTriggerMobile = document.getElementById("loginTriggerMobile");
  const loginModal = document.getElementById("loginModal");
  const loginClose = document.getElementById("loginClose");
  const loginForm = document.getElementById("loginForm");
  const loginEmail = document.getElementById("loginEmail");
  const loginPassword = document.getElementById("loginPassword");
  const loginError = document.getElementById("loginError");
  const loginSuccess = document.getElementById("loginSuccess");
  const loginSubmit = document.getElementById("loginSubmit");
  const userBox = document.getElementById("userBox");
  const userLabel = document.getElementById("userLabel");
  const logoutBtn = document.getElementById("logoutBtn");
  const toTopBtn = document.getElementById("toTop");

  let lastFocusedElement = null;

  function openLogin(triggerEl) {
    lastFocusedElement = triggerEl || document.activeElement;
    loginModal.classList.remove("hidden");
    loginError.classList.add("hidden");
    loginSuccess.classList.add("hidden");
    loginForm.reset();
    loginEmail.focus();
  }

  function closeLogin() {
    loginModal.classList.add("hidden");
    if (lastFocusedElement) lastFocusedElement.focus();
  }

  loginTrigger.addEventListener("click", () => openLogin(loginTrigger));
  if (loginTriggerMobile) {
    loginTriggerMobile.addEventListener("click", () => openLogin(loginTriggerMobile));
  }
  loginClose.addEventListener("click", closeLogin);
  loginModal.addEventListener("click", (e) => {
    if (e.target === loginModal) closeLogin();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !loginModal.classList.contains("hidden")) closeLogin();
  });

  function saveSession(token, user) {
    localStorage.setItem(SESSION_TOKEN_KEY, token);
    localStorage.setItem(SESSION_USER_KEY, JSON.stringify(user));
  }

  function clearSession() {
    localStorage.removeItem(SESSION_TOKEN_KEY);
    localStorage.removeItem(SESSION_USER_KEY);
  }

  function getSession() {
    const token = localStorage.getItem(SESSION_TOKEN_KEY);
    const userRaw = localStorage.getItem(SESSION_USER_KEY);
    if (!token || !userRaw) return null;
    try {
      return { token, user: JSON.parse(userRaw) };
    } catch {
      return null;
    }
  }

  function renderSession() {
    const session = getSession();
    if (session) {
      const role = (session.user.roles || session.user.Roles || [])[0] || "";
      const name = session.user.userName || session.user.UserName || session.user.email;
      userLabel.textContent = role ? `${name} (${role})` : name;
      userBox.classList.remove("hidden");
      loginTrigger.classList.add("hidden");
      if (loginTriggerMobile) loginTriggerMobile.closest("li").classList.add("hidden");
    } else {
      userBox.classList.add("hidden");
      loginTrigger.classList.remove("hidden");
      if (loginTriggerMobile) loginTriggerMobile.closest("li").classList.remove("hidden");
    }
  }

  logoutBtn.addEventListener("click", () => {
    clearSession();
    renderSession();
  });

  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    loginError.classList.add("hidden");
    loginSuccess.classList.add("hidden");

    const email = loginEmail.value.trim();
    const password = loginPassword.value;

    loginSubmit.disabled = true;
    loginSubmit.textContent = "Logging in...";

    try {
      const response = await fetch(`${API_URL}/Account/Login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ Email: email, Password: password })
      });

      let payload = null;
      try {
        payload = await response.json();
      } catch {
        /* non-JSON response body — handled by the fallback message below */
      }

      if (response.ok && payload && payload.token) {
        saveSession(payload.token, payload.user);
        renderSession();
        loginSuccess.textContent = "Login successful. Opening the college portal...";
        loginSuccess.classList.remove("hidden");
        setTimeout(() => {
          closeLogin();
          // The CMS app (Law_College_UI) owns the dashboard once authenticated.
          window.open(CMS_URL, "_blank", "noopener");
        }, 900);
        return;
      }

      const message =
        (payload && (payload.messageDescription || payload.message)) ||
        `Login failed (HTTP ${response.status}).`;
      loginError.textContent = message;
      loginError.classList.remove("hidden");
    } catch (err) {
      // Typical causes: API not running on API_URL, or its self-signed dev
      // certificate hasn't been trusted in this browser yet.
      loginError.textContent = `Could not reach the login server at ${API_URL}. Confirm the API is running and its HTTPS certificate is trusted.`;
      loginError.classList.remove("hidden");
      console.error("Login request failed:", err);
    } finally {
      loginSubmit.disabled = false;
      loginSubmit.textContent = "Login";
    }
  });

  toTopBtn.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));

  renderSession();
})();
