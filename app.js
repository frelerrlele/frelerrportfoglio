(function () {
  const storageKey = "portfolioDataDraft";
  const versionKey = "portfolioContentVersion";
  const languageKey = "portfolioLanguage";
  const baseData = cloneData(window.PORTFOLIO_DATA || {});
  const settings = { ...(window.PORTFOLIO_SETTINGS || {}) };
  let data = normalizeData(loadDraft() || cloneData(baseData));
  let currentLang = localStorage.getItem(languageKey) || "it";
  let currentCategory = "all";

  const languageSelect = document.querySelector("#language-select");
  const grid = document.querySelector("#work-grid");
  const tabsWrap = document.querySelector("#category-tabs");
  const modal = document.querySelector("#editor-modal");
  const editorShell = document.querySelector(".editor-shell");
  const editorLogin = document.querySelector("#editor-login");
  const editorArea = document.querySelector("#editor-area");
  const editorPassword = document.querySelector("#editor-password");
  const settingsPassword = document.querySelector("#settings-password");
  const projectEditorList = document.querySelector("#project-editor-list");
  const contentJson = document.querySelector("#content-json");
  const generatedCode = document.querySelector("#generated-code");

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
    return /^(https?:|mailto:|data:image\/|#)/i.test(url) ? url : "#";
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

  function categoryLabel(category) {
    if (category === "all") return translate("filterAll");
    const key = `cat${category.charAt(0).toUpperCase() + category.slice(1)}`;
    const translated = translate(key);
    return translated === key ? category : translated;
  }

  function renderTranslations() {
    document.documentElement.lang = currentLang;
    document.querySelectorAll("[data-i18n]").forEach((node) => {
      node.textContent = translate(node.dataset.i18n);
    });
  }

  function renderLanguageOptions() {
    languageSelect.innerHTML = Object.keys(data.translations).map((language) => `
      <button class="language-option ${language === currentLang ? "is-active" : ""}" type="button" data-language="${escapeHtml(language)}">
        ${escapeHtml(language.toUpperCase())}
      </button>
    `).join("");

    languageSelect.querySelectorAll(".language-option").forEach((button) => {
      button.addEventListener("click", () => {
        currentLang = button.dataset.language;
        localStorage.setItem(languageKey, currentLang);
        render();
      });
    });
  }

  function renderContact() {
    const actions = document.querySelector("#contact-actions");
    const links = [...(data.contact?.links || [])];
    if (data.contact?.email) {
      links.push({ label: "Email", url: `mailto:${data.contact.email}` });
    }

    actions.innerHTML = links.map((link, index) => `
      <a class="${index === 0 ? "primary-button" : "ghost-button"}" href="${escapeHtml(safeUrl(link.url))}" ${safeUrl(link.url).startsWith("mailto:") ? "" : 'target="_blank" rel="noreferrer"'}>
        ${escapeHtml(link.label)}
      </a>
    `).join("");
  }

  function renderProjects() {
    const projects = data.projects.filter((project) => {
      return currentCategory === "all" || project.category === currentCategory;
    });

    grid.innerHTML = projects.map((project) => `
      <article class="project-card" style="--accent:${safeColor(project.accent)}">
        <div class="project-visual">
          ${project.image ? `<img src="${escapeHtml(safeUrl(project.image))}" alt="${escapeHtml(localized(project.title))}">` : `<span class="empty-image">${escapeHtml(translate("noImage"))}</span>`}
          <div class="project-badges">
            <span>${escapeHtml(categoryLabel(project.category))}</span>
            <span>${escapeHtml(project.year)}</span>
          </div>
        </div>
        <div class="project-content">
          <h3>${escapeHtml(localized(project.title))}</h3>
          <p>${escapeHtml(localized(project.description))}</p>
          ${project.tags?.length ? `<div class="project-tags">${project.tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join("")}</div>` : ""}
        </div>
      </article>
    `).join("");
  }

  function renderTabs() {
    const categories = ["all", ...new Set(data.projects.map((project) => project.category))];
    if (currentCategory !== "all" && !categories.includes(currentCategory)) currentCategory = "all";
    tabsWrap.innerHTML = categories.map((category) => `
      <button class="tab ${category === currentCategory ? "is-active" : ""}" type="button" data-category="${escapeHtml(category)}">
        ${escapeHtml(categoryLabel(category))}
      </button>
    `).join("");

    tabsWrap.querySelectorAll(".tab").forEach((tab) => {
      tab.addEventListener("click", () => {
        currentCategory = tab.dataset.category;
        renderTabs();
        renderProjects();
      });
    });
  }

  function syncEditorCode() {
    contentJson.value = JSON.stringify(data, null, 2);
    generatedCode.value = makeContentFile(data);
  }

  function renderProjectEditor() {
    const languages = getLanguages();
    const categories = [...new Set(data.projects.map((project) => project.category))];
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
      title: { it: "Nuovo progetto", de: "Neues Projekt", en: "New project" },
      tags: ["nuovo"],
      description: {
        it: "Scrivi qui la descrizione.",
        de: "Schreibe hier die Beschreibung.",
        en: "Write the description here."
      }
    });
  }

  function render() {
    if (!data.translations[currentLang]) currentLang = "it";
    renderLanguageOptions();
    renderTranslations();
    renderContact();
    renderTabs();
    renderProjects();
  }

  document.querySelector("#edit-open").addEventListener("click", () => {
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
      base.addColorStop(0, "#ff1131");
      base.addColorStop(0.48, "#ff2d55");
      base.addColorStop(1, "#a9001d");
      context.fillStyle = base;
      context.fillRect(0, 0, w, h);

      const blobs = [
        [w * 0.18, h * 0.22, 240, "rgba(255,80,112,0.38)", 0],
        [w * 0.78, h * 0.18, 190, "rgba(255,38,75,0.42)", 1.7],
        [w * 0.58, h * 0.82, 280, "rgba(105,0,20,0.38)", 3.1],
        [w * 0.18, h * 0.76, 220, "rgba(184,0,35,0.34)", 4.4]
      ];

      blobs.forEach(([x, y, radius, color, offset]) => {
        const dx = Math.cos(time + offset) * 34;
        const dy = Math.sin(time * 1.4 + offset) * 26;
        const gradient = context.createRadialGradient(x + dx, y + dy, 0, x + dx, y + dy, radius);
        gradient.addColorStop(0, color);
        gradient.addColorStop(1, "rgba(0,0,0,0)");
        context.globalAlpha = 0.78;
        context.fillStyle = gradient;
        context.beginPath();
        context.arc(x + dx, y + dy, radius, 0, Math.PI * 2);
        context.fill();
      });

      context.globalAlpha = 1;
      requestAnimationFrame(draw);
    }

    resize();
    window.addEventListener("resize", resize);
    draw();
  }

  startLiquidCanvas();
  render();
})();
