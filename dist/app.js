(function () {
  const storageKey = "portfolioDataDraft";
  const versionKey = "portfolioContentVersion";
  const languageKey = "portfolioLanguage";
  const authKey = "portfolioAuthProfile";
  const baseData = cloneData(window.PORTFOLIO_DATA || {});
  const settings = { ...(window.PORTFOLIO_SETTINGS || {}) };
  let data = normalizeData(loadDraft() || cloneData(baseData));
  let currentLang = localStorage.getItem(languageKey) || "it";
  let currentCategory = "all";
  let authProfile = loadAuthProfile();
  let wasDetailView = false;
  const visibleLanguages = ["it", "de", "en"];

  const languageSelect = document.querySelector("#language-select");
  const grid = document.querySelector("#work-grid");
  const tabsWrap = document.querySelector("#category-tabs");
  const navLinks = document.querySelector(".nav-links");
  const brand = document.querySelector(".brand");
  const modal = document.querySelector("#editor-modal");
  const editorShell = document.querySelector(".editor-shell");
  const editorLogin = document.querySelector("#editor-login");
  const editorArea = document.querySelector("#editor-area");
  const editorPassword = document.querySelector("#editor-password");
  const settingsPassword = document.querySelector("#settings-password");
  const projectEditorList = document.querySelector("#project-editor-list");
  const contentJson = document.querySelector("#content-json");
  const generatedCode = document.querySelector("#generated-code");
  const scrollProgress = document.querySelector("#scroll-progress");
  const loginToggle = document.querySelector("#login-toggle");
  const loginOptions = document.querySelector("#login-options");
  const authModal = document.querySelector("#auth-modal");
  const authForm = document.querySelector("#auth-form");
  const authEmail = document.querySelector("#auth-email");
  const authPassword = document.querySelector("#auth-password");
  const authUsername = document.querySelector("#auth-username");
  const authPhoto = document.querySelector("#auth-photo");
  const authPhotoTrigger = document.querySelector("#auth-photo-trigger");
  const authPhotoInitial = document.querySelector("#auth-photo-initial");
  const authPhotoPreview = document.querySelector("#auth-photo-preview");
  const authRecaptcha = document.querySelector("#auth-recaptcha");
  const authRecaptchaFallback = document.querySelector("#auth-recaptcha-fallback");
  const authPasswordToggle = document.querySelector("#auth-password-toggle");
  const passwordMeter = document.querySelector(".password-meter");
  const passwordMeterBar = document.querySelector("#password-meter-bar");
  const passwordStatus = document.querySelector("#password-status");
  const authError = document.querySelector("#auth-error");
  const imageLightbox = document.querySelector("#image-lightbox");
  const imageLightboxImg = document.querySelector("#image-lightbox-img");
  const imageLightboxTitle = document.querySelector("#image-lightbox-title");
  const imageLightboxClose = document.querySelector("#image-lightbox-close");
  let recaptchaWidgetId = null;
  let recaptchaReady = false;

  const urlErrorMessages = {
    discord_missing_config: "Configura DISCORD_CLIENT_ID e DISCORD_CLIENT_SECRET nel file .env.",
    discord_invalid_client: "Discord ha rifiutato client id/secret. Controlla il file .env e rigenera il secret.",
    google_missing_config: "Configura GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET nel file .env.",
    google_invalid_client: "Google ha rifiutato client id/secret o redirect URI. Controlla Google Cloud Console e .env."
  };

  function cloneData(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function normalizeData(value) {
    const next = value && typeof value === "object" ? value : cloneData(baseData);
    next.contact = next.contact || {};
    next.contact.links = Array.isArray(next.contact.links) ? next.contact.links : [];
    next.translations = next.translations || cloneData(baseData.translations || { it: {} });
    next.projects = Array.isArray(next.projects) ? next.projects : [];
    return next;
  }

  function loadDraft() {
    try {
      const expectedVersion = settings.contentVersion || "default";
      if (localStorage.getItem(versionKey) !== expectedVersion) {
        localStorage.removeItem(storageKey);
        localStorage.setItem(versionKey, expectedVersion);
        return null;
      }

      const saved = localStorage.getItem(storageKey);
      return saved ? JSON.parse(saved) : null;
    } catch (error) {
      console.warn("Draft data is invalid.", error);
      return null;
    }
  }

  function loadAuthProfile() {
    try {
      const saved = localStorage.getItem(authKey);
      return saved ? JSON.parse(saved) : null;
    } catch (error) {
      console.warn("Auth profile is invalid.", error);
      return null;
    }
  }

  function translate(key) {
    return data.translations[currentLang]?.[key] || data.translations.it[key] || key;
  }

  function localized(value) {
    if (typeof value === "string") return value;
    return value?.[currentLang] || value?.it || "";
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[char]);
  }

  function safeColor(value) {
    return /^#[0-9a-f]{6}$/i.test(value || "") ? value : "#ff2d55";
  }

  function safeUrl(value) {
    const url = String(value || "#").trim();
    if (/^(https?:|mailto:|data:image\/|#)/i.test(url)) return url;
    if (!/^[a-z][a-z0-9+.-]*:/i.test(url) && !url.startsWith("//")) return url;
    return "#";
  }

  function slugify(value) {
    const slug = String(value || "progetto")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    return slug || `progetto-${Date.now()}`;
  }

  function getLanguages() {
    return Object.keys(data.translations || { it: {} });
  }

  function localizedObject(value) {
    const languages = getLanguages();
    return languages.reduce((acc, language) => {
      acc[language] = typeof value === "string" ? value : value?.[language] || value?.it || "";
      return acc;
    }, {});
  }

  function projectCategories() {
    return [...new Set(data.projects.map((project) => project.category))];
  }

  function languageMeta(language) {
    return ({
      it: { flag: "🇮🇹", label: "Italiano" },
      de: { flag: "🇩🇪", label: "Deutsch" },
      en: { flag: "EN", label: "English" },
      es: { flag: "🇪🇸", label: "Español" },
      fr: { flag: "🇫🇷", label: "Français" },
      ru: { flag: "🇷🇺", label: "Русский" }
    })[language] || { flag: "🌐", label: language.toUpperCase() };
  }

  function renderLanguageChoice(meta) {
    const flagClass = /^[A-Z]{2,3}$/.test(meta.flag) ? " is-text-flag" : "";
    return `
      <span class="language-choice">
        <span class="language-flag${flagClass}" aria-hidden="true">${escapeHtml(meta.flag)}</span>
        <span class="language-label">${escapeHtml(meta.label)}</span>
      </span>
    `;
  }

  function categoryLabel(category) {
    if (category === "all") return translate("filterAll");
    const key = `cat${category.charAt(0).toUpperCase() + category.slice(1)}`;
    const translated = translate(key);
    return translated === key ? category : translated;
  }

  function categorySlug(category) {
    return category === "all" ? "all" : category;
  }

  function categoryFromHash() {
    const hash = decodeURIComponent(window.location.hash || "").replace(/^#/, "");
    if (!hash.startsWith("portfolio")) return null;
    const [, rawCategory = "all"] = hash.split("/");
    const categories = ["all", ...projectCategories()];
    return categories.includes(rawCategory) ? rawCategory : "all";
  }

  function renderTopNav(activeCategory) {
    if (!navLinks) return;

    if (!activeCategory) {
      if (brand) {
        brand.classList.remove("is-back-link");
        brand.setAttribute("href", "#home");
        brand.setAttribute("aria-label", "Portfolio home");
        brand.innerHTML = `
          <span class="brand-mark home-mark" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <path d="M3.8 11.2 12 4.6l8.2 6.6"></path>
              <path d="M6.2 10.2v9h11.6v-9"></path>
              <path d="M9.7 19.2v-5.1h4.6v5.1"></path>
            </svg>
          </span>
          <span>${escapeHtml(translate("siteName"))}</span>
        `;
      }
      navLinks.innerHTML = `
        <a href="#work">${escapeHtml(translate("navWork"))}</a>
        <a href="#about">${escapeHtml(translate("navAbout"))}</a>
        <a href="#contact">${escapeHtml(translate("navContact"))}</a>
      `;
      return;
    }

    if (brand) {
      brand.classList.add("is-back-link");
      brand.setAttribute("href", "#home");
      brand.setAttribute("aria-label", "Torna alla home");
      brand.innerHTML = `
        <span class="brand-mark back-mark" aria-hidden="true">
          <svg viewBox="0 0 24 24">
            <path d="M14.8 5.6 8.4 12l6.4 6.4"></path>
            <path d="M9.2 12h10.2"></path>
            <path d="M5 5.2v13.6"></path>
          </svg>
        </span>
        <span>Indietro</span>
      `;
    }

    navLinks.innerHTML = projectCategories().map((category) => `
      <a class="${category === activeCategory ? "is-active" : ""}" href="#portfolio/${escapeHtml(categorySlug(category))}">
        ${escapeHtml(categoryLabel(category))}
      </a>
    `).join("");
  }

  function galleryItems(category) {
    const categories = category === "all"
      ? projectCategories()
      : [category];

    return categories.flatMap((itemCategory) => {
      const project = data.projects.find((item) => item.category === itemCategory);
      const gallery = Array.isArray(project?.gallery) ? project.gallery : [];

      return gallery.map((item) => ({
        src: item.src,
        title: localized(item.title),
        description: localized(item.description),
        featured: Boolean(item.featured),
        category: itemCategory
      }));
    });
  }

  function projectIcon(category) {
    const icons = {
      cazzeggio: `
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 3.4l1.5 3.1 3.4.5-2.5 2.4.6 3.4-3-1.6-3 1.6.6-3.4L7.1 7l3.4-.5L12 3.4z"></path>
          <path d="M5.2 17.1c1.8-1.3 4.1-2 6.8-2s5 .7 6.8 2"></path>
          <path d="M7.4 20.1c1.3-.9 2.8-1.3 4.6-1.3s3.3.4 4.6 1.3"></path>
          <path d="M4.3 7.7l1.2.5"></path>
          <path d="M18.5 8.2l1.2-.5"></path>
        </svg>
      `,
      socialmedia: `
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <rect x="3.4" y="5.2" width="17.2" height="11.6" rx="3.1"></rect>
          <path d="M10.2 8.6v4.8l4.2-2.4-4.2-2.4z"></path>
          <path d="M8.2 20h7.6"></path>
          <path d="M12 16.8V20"></path>
          <path d="M6.5 8.2h.1"></path>
          <path d="M17.5 13.8h.1"></path>
        </svg>
      `,
      commissioni: `
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M6.1 4.2h8.5l3.3 3.3v12.3H6.1V4.2z"></path>
          <path d="M14.6 4.2v3.3h3.3"></path>
          <path d="M8.8 10.2h6.4"></path>
          <path d="M8.8 13.4h6.4"></path>
          <path d="M8.8 16.6h3.8"></path>
          <path d="M15.1 17.2l1.1 1.1 2.4-2.7"></path>
        </svg>
      `
    };

    return icons[category] || `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 4l7 4v8l-7 4-7-4V8l7-4z"></path>
        <path d="M12 8v8"></path>
        <path d="M8.5 10l7 4"></path>
        <path d="M15.5 10l-7 4"></path>
      </svg>
    `;
  }

  function projectBackground(project, index) {
    const backgrounds = ["#6d38d8", "#7d3cc4", "#5533b3", "#824fd2"];
    return safeColor(project.placeholder || backgrounds[index % backgrounds.length]);
  }

  function renderTranslations() {
    document.documentElement.lang = currentLang;
    document.querySelectorAll("[data-i18n]").forEach((node) => {
      node.textContent = translate(node.dataset.i18n);
    });
    document.querySelectorAll("[data-i18n-label]").forEach((label) => {
      const text = label.childNodes[0];
      if (text?.nodeType === Node.TEXT_NODE) text.textContent = translate(label.dataset.i18nLabel);
    });
  }

  function updateAuthInitial() {
    if (!authPhotoInitial || authPhotoPreview && !authPhotoPreview.hidden) return;
    authPhotoInitial.textContent = initials(authUsername?.value || "StellaRossa");
  }

  function passwordScore(value) {
    let score = 0;
    if (value.length >= 6) score += 1;
    if (value.length >= 10) score += 1;
    if (/[A-Z]/.test(value) && /[a-z]/.test(value)) score += 1;
    if (/\d/.test(value)) score += 1;
    if (/[^A-Za-z0-9]/.test(value)) score += 1;
    return Math.min(score, 5);
  }

  function updatePasswordMeter() {
    const score = passwordScore(authPassword?.value || "");
    const percent = [0, 20, 40, 62, 82, 100][score];
    const strength = score >= 4 ? "strong" : score >= 3 ? "medium" : "weak";
    if (passwordMeter) passwordMeter.dataset.strength = strength;
    if (passwordMeterBar) passwordMeterBar.style.width = `${percent}%`;
    if (passwordStatus) {
      passwordStatus.textContent = translate(strength === "strong" ? "passwordStrong" : strength === "medium" ? "passwordMedium" : "passwordWeak");
    }
  }

  function isServerMode() {
    return window.location.protocol === "http:" || window.location.protocol === "https:";
  }

  async function apiRequest(path, options = {}) {
    const response = await fetch(path, {
      credentials: "include",
      headers: { "Content-Type": "application/json", ...(options.headers || {}) },
      ...options
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || "Request failed");
    return payload;
  }

  function renderLanguageOptions() {
    const currentMeta = languageMeta(currentLang);
    const menuLanguages = visibleLanguages.filter((language) => data.translations[language]);
    languageSelect.innerHTML = `
      <button class="language-toggle" type="button" aria-expanded="false">
        ${renderLanguageChoice(currentMeta)}
      </button>
      <div class="language-panel" hidden>
        ${menuLanguages.map((language) => {
          const meta = languageMeta(language);
          return `<button class="${language === currentLang ? "is-active" : ""}" type="button" data-language="${escapeHtml(language)}">${renderLanguageChoice(meta)}</button>`;
        }).join("")}
      </div>
    `;

    const toggle = languageSelect.querySelector(".language-toggle");
    const panel = languageSelect.querySelector(".language-panel");
    toggle.addEventListener("click", () => {
      const isOpen = panel.hidden;
      closeMenus();
      panel.hidden = !isOpen;
      languageSelect.classList.toggle("is-open", isOpen);
      toggle.setAttribute("aria-expanded", String(isOpen));
    });

    panel.querySelectorAll("[data-language]").forEach((button) => {
      button.addEventListener("click", () => {
        currentLang = button.dataset.language;
        localStorage.setItem(languageKey, currentLang);
        render();
        closeMenus();
      });
    });
  }

  function renderContact() {
    const actions = document.querySelector("#contact-actions");
    const links = [...(data.contact?.links || [])];
    if (data.contact?.email) {
      links.push({ label: "Email", url: `mailto:${data.contact.email}` });
    }

    function linkIcon(label) {
      const key = String(label || "").toLowerCase();
      if (key.includes("youtube")) return "assets/icon-youtube.png";
      if (key.includes("twitch")) return "assets/icon-twitch.png";
      if (key.includes("discord")) return "assets/icon-discord.png";
      if (key.includes("email")) return "assets/icon-email.png";
      return "";
    }

    actions.innerHTML = links.map((link, index) => `
      <a class="ghost-button social-button" href="${escapeHtml(safeUrl(link.url))}" ${safeUrl(link.url).startsWith("mailto:") ? "" : 'target="_blank" rel="noreferrer"'}>
        <span class="button-icon">${linkIcon(link.label) ? `<img src="${escapeHtml(linkIcon(link.label))}" alt="">` : ""}</span>
        <span>${escapeHtml(link.label)}</span>
      </a>
    `).join("");
  }

  function initials(name) {
    return String(name || "?").trim().charAt(0).toUpperCase() || "?";
  }

  function firstName(name) {
    return String(name || "")
      .trim()
      .split(/\s+/)[0] || String(name || "Account");
  }

  function authAvatarHtml(profile, className = "profile-avatar") {
    const avatar = profile?.avatar
      ? `<img src="${escapeHtml(profile.avatar)}" alt="">`
      : escapeHtml(initials(profile?.name));
    return `<span class="${className}">${avatar}</span>`;
  }

  function renderAccountSummary() {
    loginOptions?.querySelector(".account-summary")?.remove();
    if (!authProfile || !loginOptions) return;

    const summary = document.createElement("div");
    summary.className = "account-summary";
    summary.innerHTML = `
      ${authAvatarHtml(authProfile, "account-avatar")}
      <span class="account-copy">
        <strong>${escapeHtml(authProfile.name || firstName(authProfile.email))}</strong>
      </span>
    `;
    loginOptions.prepend(summary);
  }

  function renderAuthProfile() {
    if (!loginToggle) return;

    if (!authProfile) {
      loginOptions?.querySelector(".account-summary")?.remove();
      loginToggle.classList.remove("has-profile");
      loginToggle.innerHTML = escapeHtml(translate("loginButton"));
      loginOptions?.querySelectorAll("[data-login]").forEach((button) => {
        button.hidden = button.dataset.login === "logout";
      });
      return;
    }

    loginToggle.classList.add("has-profile");
    loginToggle.innerHTML = `
      ${authAvatarHtml(authProfile)}
      <span class="profile-name">${escapeHtml(firstName(authProfile.name || authProfile.email))}</span>
    `;
    loginOptions?.querySelectorAll("[data-login]").forEach((button) => {
      button.hidden = button.dataset.login !== "logout";
    });
    renderAccountSummary();
  }

  function showUrlError() {
    const params = new URLSearchParams(window.location.search);
    const error = params.get("error");
    if (!error || !urlErrorMessages[error]) return;
    console.warn(urlErrorMessages[error]);
    if (authError) authError.textContent = urlErrorMessages[error];
    window.history.replaceState(null, "", window.location.pathname + window.location.hash);
  }

  function renderProjects() {
    const projects = data.projects.filter((project) => {
      return currentCategory === "all" || project.category === currentCategory;
    });

    grid.classList.remove("detail-gallery", "detail-cazzeggio", "detail-socialmedia", "detail-commissioni", "detail-all");
    grid.innerHTML = projects.map((project, index) => `
      <a class="project-card project-${escapeHtml(project.category)} reveal" href="#portfolio/${escapeHtml(project.category)}" style="--accent:${safeColor(project.accent)}; --project-bg:${projectBackground(project, index)}">
        <div class="project-visual ${project.image ? "has-cover" : ""}">
          ${project.image ? `<img src="${escapeHtml(safeUrl(project.image))}" alt="${escapeHtml(localized(project.title))}">` : `<div class="project-icon" aria-hidden="true">${projectIcon(project.category)}</div>`}
        </div>
        <div class="project-content">
          <h3>${escapeHtml(localized(project.title))}</h3>
          <p>${escapeHtml(localized(project.description))}</p>
        </div>
      </a>
    `).join("");

    revealVisibleCards();
  }

  function renderDetailPage(category) {
    const items = galleryItems(category);
    grid.classList.remove("detail-cazzeggio", "detail-socialmedia", "detail-commissioni", "detail-all");
    grid.classList.add("detail-gallery", `detail-${category}`);
    tabsWrap.innerHTML = "";
    grid.innerHTML = `
      ${items.map((item) => `
        <article class="gallery-card gallery-${escapeHtml(item.category)} ${item.featured ? "gallery-featured" : ""} reveal">
          <button class="gallery-media image-zoom-trigger" type="button" data-image-zoom data-image-src="${escapeHtml(safeUrl(item.src))}" data-image-title="${escapeHtml(item.title)}" aria-label="Ingrandisci immagine: ${escapeHtml(item.title)}">
            <img src="${escapeHtml(safeUrl(item.src))}" alt="${escapeHtml(item.title)}" loading="lazy">
            <span class="gallery-label">${escapeHtml(categoryLabel(item.category))}</span>
            <span class="zoom-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <circle cx="10.8" cy="10.8" r="5.8"></circle>
                <path d="m15.1 15.1 4.7 4.7"></path>
                <path d="M10.8 8v5.6"></path>
                <path d="M8 10.8h5.6"></path>
              </svg>
            </span>
          </button>
          <div class="gallery-copy">
            <h3>${escapeHtml(item.title)}</h3>
            <p>${escapeHtml(item.description)}</p>
          </div>
        </article>
      `).join("")}
    `;

    revealVisibleCards();
  }

  function openImageLightbox(src, title) {
    if (!imageLightbox || !imageLightboxImg || !imageLightboxTitle) return;
    imageLightboxImg.src = safeUrl(src);
    imageLightboxImg.alt = title || "";
    imageLightboxTitle.textContent = title || "";
    if (typeof imageLightbox.showModal === "function") {
      imageLightbox.showModal();
      return;
    }
    window.open(safeUrl(src), "_blank", "noopener");
  }

  function closeImageLightbox() {
    if (!imageLightbox) return;
    if (imageLightbox.open) imageLightbox.close();
  }

  function renderTabs() {
    const categories = ["all", ...projectCategories()];
    if (currentCategory !== "all" && !categories.includes(currentCategory)) currentCategory = "all";
    tabsWrap.innerHTML = categories.map((category) => `
      <a class="tab ${category === currentCategory ? "is-active" : ""}" href="#portfolio/${escapeHtml(categorySlug(category))}" data-category="${escapeHtml(category)}">
        ${escapeHtml(categoryLabel(category))}
      </a>
    `).join("");
  }

  function syncEditorCode() {
    contentJson.value = JSON.stringify(data, null, 2);
    generatedCode.value = makeContentFile(data);
  }

  function renderProjectEditor() {
    const languages = getLanguages();
    const categories = projectCategories();
    const categoryOptions = categories.map((category) => `<option value="${escapeHtml(category)}"></option>`).join("");

    projectEditorList.innerHTML = data.projects.map((project, index) => {
      const title = localizedObject(project.title);
      const description = localizedObject(project.description);
      const imagePreview = project.image
        ? `<img src="${escapeHtml(safeUrl(project.image))}" alt="">`
        : `<span>${escapeHtml(translate("noImage"))}</span>`;

      return `
        <article class="project-editor-card" data-project-index="${index}" data-project-id="${escapeHtml(project.id || "")}">
          <div class="project-editor-preview" style="--accent:${safeColor(project.accent)}">
            ${imagePreview}
          </div>
          <div class="project-editor-fields">
            <div class="project-editor-head">
              <strong>Progetto ${index + 1}</strong>
              <button class="danger-button" type="button" data-action="remove-project">Rimuovi</button>
            </div>

            <div class="editor-grid">
              <label>Categoria
                <input data-field="category" list="category-options" value="${escapeHtml(project.category || "")}" placeholder="es. gaming">
              </label>
              <label>Anno
                <input data-field="year" value="${escapeHtml(project.year || new Date().getFullYear())}">
              </label>
              <label>Colore
                <input data-field="accent" type="color" value="${safeColor(project.accent)}">
              </label>
              <label>Tag
                <input data-field="tags" value="${escapeHtml((project.tags || []).join(", "))}" placeholder="video, social, test">
              </label>
            </div>

            <label>Immagine URL o file
              <input data-field="image" value="${escapeHtml(project.image || "")}" placeholder="https://... oppure scegli un file sotto">
            </label>
            <div class="editor-tools inline-tools">
              <input class="file-input" data-field="image-file" type="file" accept="image/*">
              <button class="ghost-button" type="button" data-action="clear-image">Togli immagine</button>
            </div>

            <div class="language-field-grid">
              ${languages.map((language) => `
                <section class="language-field">
                  <h3>${language.toUpperCase()}</h3>
                  <label>Titolo
                    <input data-title-lang="${language}" value="${escapeHtml(title[language])}" placeholder="Titolo ${language.toUpperCase()}">
                  </label>
                  <label>Descrizione
                    <textarea data-description-lang="${language}" placeholder="Descrizione ${language.toUpperCase()}">${escapeHtml(description[language])}</textarea>
                  </label>
                </section>
              `).join("")}
            </div>
          </div>
        </article>
      `;
    }).join("") + `<datalist id="category-options">${categoryOptions}</datalist>`;

    projectEditorList.querySelectorAll("[data-action='remove-project']").forEach((button) => {
      button.addEventListener("click", () => {
        const card = button.closest(".project-editor-card");
        if (!window.confirm("Vuoi rimuovere questo progetto dall'editor?")) return;
        syncDataFromProjectEditor();
        data.projects.splice(Number(card.dataset.projectIndex), 1);
        if (!data.projects.length) addProject();
        renderProjectEditor();
        syncEditorCode();
        render();
      });
    });

    projectEditorList.querySelectorAll("[data-action='clear-image']").forEach((button) => {
      button.addEventListener("click", () => {
        const card = button.closest(".project-editor-card");
        card.querySelector("[data-field='image']").value = "";
        card.querySelector(".project-editor-preview").innerHTML = `<span>${escapeHtml(translate("noImage"))}</span>`;
      });
    });

    projectEditorList.querySelectorAll("[data-field='image-file']").forEach((input) => {
      input.addEventListener("change", () => {
        const file = input.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.addEventListener("load", () => {
          const card = input.closest(".project-editor-card");
          card.querySelector("[data-field='image']").value = reader.result;
          card.querySelector(".project-editor-preview").innerHTML = `<img src="${reader.result}" alt="">`;
        });
        reader.readAsDataURL(file);
      });
    });

    projectEditorList.querySelectorAll("input, textarea").forEach((field) => {
      field.addEventListener("input", () => {
        if (field.dataset.field === "image") {
          const card = field.closest(".project-editor-card");
          card.querySelector(".project-editor-preview").innerHTML = field.value
            ? `<img src="${escapeHtml(safeUrl(field.value))}" alt="">`
            : `<span>${escapeHtml(translate("noImage"))}</span>`;
        }
      });
    });
  }

  function syncDataFromProjectEditor() {
    const languages = getLanguages();
    data.projects = [...projectEditorList.querySelectorAll(".project-editor-card")].map((card, index) => {
      const category = card.querySelector("[data-field='category']").value.trim() || "cazzeggio";
      const rawImage = card.querySelector("[data-field='image']").value.trim();
      const title = {};
      const description = {};

      languages.forEach((language) => {
        title[language] = card.querySelector(`[data-title-lang='${language}']`).value.trim();
        description[language] = card.querySelector(`[data-description-lang='${language}']`).value.trim();
      });

      const titleSeed = title.it || title.en || title.de || `progetto-${index + 1}`;

      return {
        id: card.dataset.projectId || slugify(titleSeed),
        category,
        accent: safeColor(card.querySelector("[data-field='accent']").value),
        year: card.querySelector("[data-field='year']").value.trim() || String(new Date().getFullYear()),
        url: "#",
        image: rawImage ? safeUrl(rawImage) : "",
        title,
        tags: card.querySelector("[data-field='tags']").value.split(",").map((tag) => tag.trim()).filter(Boolean),
        gallery: data.projects[index]?.gallery || [],
        description
      };
    });

    syncEditorCode();
  }

  function addProject() {
    data.projects.push({
      id: `progetto-${Date.now()}`,
      category: "cazzeggio",
      accent: "#ff2d55",
      year: String(new Date().getFullYear()),
      url: "#",
      image: "",
      placeholder: "#6d38d8",
      gallery: [],
      title: {
        it: "Nuovo progetto",
        de: "Neues Projekt",
        en: "New project",
        es: "Nuevo proyecto",
        fr: "Nouveau projet",
        ru: "Новый проект"
      },
      tags: ["nuovo"],
      description: {
        it: "Scrivi qui la descrizione.",
        de: "Schreibe hier die Beschreibung.",
        en: "Write the description here.",
        es: "Escribe aquí la descripción.",
        fr: "Écris la description ici.",
        ru: "Напиши описание здесь."
      }
    });
  }

  function render() {
    if (!data.translations[currentLang]) currentLang = "it";
    const detailCategory = categoryFromHash();
    renderLanguageOptions();
    renderTranslations();
    renderTopNav(detailCategory);
    renderAuthProfile();
    renderContact();
    document.body.classList.toggle("is-detail-view", Boolean(detailCategory));
    if (detailCategory) {
      wasDetailView = true;
      currentCategory = detailCategory;
      renderDetailPage(detailCategory);
    } else {
      if (wasDetailView) currentCategory = "all";
      wasDetailView = false;
      renderTabs();
      renderProjects();
    }
  }

  function closeMenus() {
    document.querySelectorAll(".language-panel").forEach((panel) => {
      panel.hidden = true;
    });
    document.querySelectorAll(".language-options").forEach((menu) => {
      menu.classList.remove("is-open");
      menu.querySelector(".language-toggle")?.setAttribute("aria-expanded", "false");
    });
    if (loginOptions) loginOptions.hidden = true;
    if (loginToggle) loginToggle.setAttribute("aria-expanded", "false");
  }

  document.addEventListener("click", (event) => {
    if (event.target.closest(".language-options") || event.target.closest(".login-menu")) return;
    closeMenus();
  });

  grid?.addEventListener("click", (event) => {
    const trigger = event.target.closest("[data-image-zoom]");
    if (!trigger) return;
    event.preventDefault();
    openImageLightbox(trigger.dataset.imageSrc, trigger.dataset.imageTitle);
  });

  imageLightboxClose?.addEventListener("click", closeImageLightbox);
  imageLightbox?.addEventListener("click", (event) => {
    if (event.target === imageLightbox) closeImageLightbox();
  });
  imageLightbox?.addEventListener("close", () => {
    if (!imageLightboxImg) return;
    imageLightboxImg.removeAttribute("src");
  });

  window.addEventListener("hashchange", () => {
    render();
    if (categoryFromHash()) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  });

  loginToggle?.addEventListener("click", () => {
    const isOpen = loginOptions.hidden;
    closeMenus();
    loginOptions.hidden = !isOpen;
    loginToggle.setAttribute("aria-expanded", String(isOpen));
  });

  loginOptions?.querySelectorAll("[data-login]").forEach((button) => {
    button.addEventListener("click", () => {
      closeMenus();
      const provider = button.dataset.login;
      if (provider === "email") {
        authForm.reset();
        if (authError) authError.textContent = "";
        authEmail.setCustomValidity("");
        authPhotoPreview.hidden = true;
        authPhotoPreview.removeAttribute("src");
        authPhotoInitial.hidden = false;
        updateAuthInitial();
        renderRecaptcha();
        authModal.showModal();
      }
      if (provider === "discord") {
        startDiscordLogin();
      }
      if (provider === "google") {
        startGoogleLogin();
      }
      if (provider === "logout") {
        authProfile = null;
        localStorage.removeItem(authKey);
        if (isServerMode()) {
          apiRequest("/api/logout", { method: "POST", body: "{}" }).catch(() => {});
        }
        renderAuthProfile();
      }
    });
  });

  function startDiscordLogin() {
    if (!isServerMode()) {
      if (authError) authError.textContent = translate("authServerError");
      return;
    }
    window.location.href = "/auth/discord/start";
  }

  function startGoogleLogin() {
    if (!isServerMode()) {
      if (authError) authError.textContent = translate("authServerError");
      return;
    }
    window.location.href = "/auth/google/start";
  }

  async function finishDiscordLogin() {
    const params = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const accessToken = params.get("access_token");
    if (!accessToken) return;

    try {
      const response = await fetch("https://discord.com/api/users/@me", {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      if (!response.ok) return;
      const user = await response.json();
      const avatar = user.avatar
        ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=128`
        : "";
      authProfile = {
        provider: "discord",
        name: user.global_name || user.username || "Discord",
        email: user.email || "",
        avatar
      };
      localStorage.setItem(authKey, JSON.stringify(authProfile));
      window.history.replaceState(null, "", window.location.pathname + window.location.search);
      renderAuthProfile();
    } catch (error) {
      console.warn("Discord login failed.", error);
    }
  }

  function saveEmailProfile(avatar) {
    authProfile = {
      provider: "email",
      name: authUsername.value.trim(),
      email: authEmail.value.trim(),
      avatar
    };
    localStorage.setItem(authKey, JSON.stringify(authProfile));
    authModal.close();
    renderAuthProfile();
  }

  async function loadServerProfile() {
    if (!isServerMode()) return;
    try {
      const payload = await apiRequest("/api/me");
      authProfile = payload.profile || null;
      if (authProfile) localStorage.setItem(authKey, JSON.stringify(authProfile));
      else localStorage.removeItem(authKey);
      renderAuthProfile();
    } catch (error) {
      console.warn("Profile load failed.", error);
    }
  }

  function isLikelyRealEmail(value) {
    const email = String(value || "").trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return false;

    const domain = email.split("@")[1];
    const blockedDomains = new Set([
      "prova.it",
      "test.it",
      "fake.it",
      "mailinator.com",
      "example.com",
      "example.it",
      "invalid.com",
      "localhost"
    ]);
    const blockedWords = ["prova", "test", "fake", "example", "invalid"];
    if (blockedDomains.has(domain)) return false;
    if (blockedWords.some((word) => domain.split(".").includes(word))) return false;
    if (!domain.includes(".") || domain.endsWith(".local")) return false;
    return true;
  }

  function recaptchaIsVerified() {
    if (!settings.recaptchaSiteKey) return false;
    if (!window.grecaptcha || recaptchaWidgetId === null) return false;
    return Boolean(window.grecaptcha.getResponse(recaptchaWidgetId));
  }

  function renderRecaptcha() {
    if (!authRecaptcha || !authRecaptchaFallback) return;
    authRecaptcha.innerHTML = "";
    recaptchaWidgetId = null;
    recaptchaReady = false;

    if (!settings.recaptchaSiteKey) {
      authRecaptchaFallback.hidden = false;
      return;
    }

    authRecaptchaFallback.hidden = true;
    const scriptId = "google-recaptcha-api";
    const renderWidget = () => {
      if (!window.grecaptcha || recaptchaReady) return;
      recaptchaWidgetId = window.grecaptcha.render(authRecaptcha, {
        sitekey: settings.recaptchaSiteKey
      });
      recaptchaReady = true;
    };

    if (window.grecaptcha) {
      renderWidget();
      return;
    }

    if (!document.querySelector(`#${scriptId}`)) {
      const script = document.createElement("script");
      script.id = scriptId;
      script.src = "https://www.google.com/recaptcha/api.js?render=explicit";
      script.async = true;
      script.defer = true;
      script.addEventListener("load", renderWidget);
      document.head.appendChild(script);
      return;
    }

    window.setTimeout(renderWidget, 300);
  }

  authForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    if (authError) authError.textContent = "";
    authEmail.setCustomValidity("");
    if (!isLikelyRealEmail(authEmail.value)) {
      authEmail.setCustomValidity(translate("authEmailInvalid"));
    }
    if (settings.recaptchaSiteKey && !recaptchaIsVerified()) {
      authEmail.setCustomValidity(translate("authCaptchaInvalid"));
    }
    if (!authForm.reportValidity()) return;
    if (!isServerMode()) {
      if (authError) authError.textContent = translate("authServerError");
      return;
    }

    const file = authPhoto.files?.[0];
    if (!file) {
      registerEmailProfile("");
      return;
    }

    const reader = new FileReader();
    reader.addEventListener("load", () => registerEmailProfile(reader.result));
    reader.readAsDataURL(file);
  });

  async function registerEmailProfile(avatar) {
    try {
      const recaptchaToken = settings.recaptchaSiteKey && window.grecaptcha && recaptchaWidgetId !== null
        ? window.grecaptcha.getResponse(recaptchaWidgetId)
        : "";
      const payload = await apiRequest("/api/register", {
        method: "POST",
        body: JSON.stringify({
          email: authEmail.value.trim(),
          password: authPassword.value,
          username: authUsername.value.trim(),
          avatar,
          recaptchaToken
        })
      });
      authProfile = payload.profile;
      localStorage.setItem(authKey, JSON.stringify(authProfile));
      authModal.close();
      renderAuthProfile();
    } catch (error) {
      if (authError) authError.textContent = error.message;
      if (window.grecaptcha && recaptchaWidgetId !== null) window.grecaptcha.reset(recaptchaWidgetId);
    }
  }

  authUsername?.addEventListener("input", updateAuthInitial);
  authPassword?.addEventListener("input", updatePasswordMeter);
  authPasswordToggle?.addEventListener("click", () => {
    const show = authPassword.type === "password";
    authPassword.type = show ? "text" : "password";
    authPasswordToggle.textContent = show ? "◎" : "◉";
  });
  authPhotoTrigger?.addEventListener("click", () => authPhoto.click());
  authPhoto?.addEventListener("change", () => {
    const file = authPhoto.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      authPhotoPreview.src = reader.result;
      authPhotoPreview.hidden = false;
      authPhotoInitial.hidden = true;
    });
    reader.readAsDataURL(file);
  });

  document.querySelector("#auth-close")?.addEventListener("click", () => authModal.close());
  document.querySelector("#auth-cancel")?.addEventListener("click", () => authModal.close());

  document.querySelector("#edit-open")?.addEventListener("click", () => {
    editorPassword.value = "";
    editorLogin.hidden = false;
    editorArea.hidden = true;
    modal.showModal();
  });

  editorShell.addEventListener("submit", (event) => {
    if (event.submitter?.value === "close") return;
    event.preventDefault();
  });

  editorPassword.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    document.querySelector("#editor-unlock").click();
  });

  document.querySelector("#editor-unlock").addEventListener("click", () => {
    if (editorPassword.value !== settings.editorPassword) {
      editorPassword.setCustomValidity("Password errata");
      editorPassword.reportValidity();
      return;
    }

    editorPassword.setCustomValidity("");
    settingsPassword.value = settings.editorPassword || "";
    renderProjectEditor();
    syncEditorCode();
    editorLogin.hidden = true;
    editorArea.hidden = false;
  });

  document.querySelector("#add-project").addEventListener("click", () => {
    syncDataFromProjectEditor();
    addProject();
    renderProjectEditor();
    syncEditorCode();
  });

  document.querySelector("#apply-editor").addEventListener("click", () => {
    syncDataFromProjectEditor();
    renderProjectEditor();
    render();
  });

  document.querySelector("#save-local").addEventListener("click", () => {
    try {
      syncSettingsFromEditor();
      syncDataFromProjectEditor();
      localStorage.setItem(storageKey, JSON.stringify(data));
      localStorage.setItem(versionKey, settings.contentVersion || "default");
      render();
      contentJson.setCustomValidity("");
    } catch (error) {
      contentJson.setCustomValidity("JSON non valido");
      contentJson.reportValidity();
    }
  });

  function syncSettingsFromEditor() {
    settings.editorPassword = settingsPassword.value || settings.editorPassword || "cambia-questa-password";
  }

  function makeContentFile(nextData) {
    return `window.PORTFOLIO_SETTINGS = ${JSON.stringify(settings, null, 2)};\n\nwindow.PORTFOLIO_DATA = ${JSON.stringify(nextData, null, 2)};\n`;
  }

  document.querySelector("#generate-code").addEventListener("click", () => {
    try {
      syncSettingsFromEditor();
      syncDataFromProjectEditor();
      generatedCode.value = makeContentFile(data);
      contentJson.setCustomValidity("");
    } catch (error) {
      contentJson.setCustomValidity("JSON non valido");
      contentJson.reportValidity();
    }
  });

  document.querySelector("#download-json").addEventListener("click", () => {
    syncDataFromProjectEditor();
    const blob = new Blob([contentJson.value], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "portfolio-data.json";
    link.click();
    URL.revokeObjectURL(url);
  });

  document.querySelector("#reset-local").addEventListener("click", () => {
    if (!window.confirm("Vuoi cancellare le bozze salvate in questo browser?")) return;
    localStorage.removeItem(storageKey);
    localStorage.setItem(versionKey, settings.contentVersion || "default");
    data = normalizeData(cloneData(baseData));
    settingsPassword.value = settings.editorPassword || "";
    renderProjectEditor();
    syncEditorCode();
    render();
  });

  function startLiquidCanvas() {
    const canvas = document.querySelector("#liquid-canvas");
    const context = canvas.getContext("2d");
    let width = 0;
    let height = 0;
    let time = 0;

    function resize() {
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      width = canvas.width = Math.floor(window.innerWidth * ratio);
      height = canvas.height = Math.floor(window.innerHeight * ratio);
      canvas.style.width = "100%";
      canvas.style.height = "100%";
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
    }

    function draw() {
      time += 0.006;
      const w = window.innerWidth;
      const h = window.innerHeight;
      context.clearRect(0, 0, w, h);
      const base = context.createLinearGradient(0, 0, w, h);
      base.addColorStop(0, "#d00022");
      base.addColorStop(0.48, "#ef1834");
      base.addColorStop(1, "#970019");
      context.fillStyle = base;
      context.fillRect(0, 0, w, h);

      const ribbons = [
        ["rgba(255,255,255,0.18)", 0.14, 34, 0],
        ["rgba(255,110,132,0.2)", 0.34, 48, 1.1],
        ["rgba(120,0,28,0.3)", 0.54, 54, 2.2],
        ["rgba(255,255,255,0.1)", 0.76, 42, 3.3]
      ];

      ribbons.forEach(([color, yRatio, amplitude, offset]) => {
        context.globalAlpha = 1;
        context.fillStyle = color;
        context.beginPath();
        context.moveTo(0, h * yRatio + amplitude);

        for (let x = 0; x <= w; x += 18) {
          const y =
            h * yRatio +
            Math.sin(x * 0.006 + time * 2.1 + offset) * amplitude +
            Math.sin(x * 0.014 + time * 1.4 + offset) * (amplitude * 0.34);
          context.lineTo(x, y);
        }

        context.lineTo(w, h);
        context.lineTo(0, h);
        context.closePath();
        context.fill();
      });

      context.globalAlpha = 1;
      requestAnimationFrame(draw);
    }

    resize();
    window.addEventListener("resize", resize);
    draw();
  }

  function updateScrollProgress() {
    if (!scrollProgress) return;
    const scrollable = document.documentElement.scrollHeight - window.innerHeight;
    const progress = scrollable > 0 ? window.scrollY / scrollable : 0;
    scrollProgress.style.transform = `scaleX(${Math.min(1, Math.max(0, progress))})`;
  }

  function revealVisibleCards() {
    const cards = document.querySelectorAll(".reveal");
    if (!("IntersectionObserver" in window)) {
      cards.forEach((card) => card.classList.add("is-visible"));
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.16 });

    cards.forEach((card) => observer.observe(card));
  }

  window.addEventListener("scroll", updateScrollProgress, { passive: true });
  window.addEventListener("resize", updateScrollProgress);
  updateScrollProgress();
  startLiquidCanvas();
  render();
  finishDiscordLogin();
  loadServerProfile();
  showUrlError();
  requestAnimationFrame(() => {
    document.body.classList.remove("is-loading");
    document.body.classList.add("is-ready");
  });
})();
