const state = {
  site: {},
  projects: [],
  selectedCategory: "全部"
};

const baseUrl = window.location.pathname.replace(/[^/]*$/, "");
const isLocal = ["localhost", "127.0.0.1", ""].includes(window.location.hostname);
const fallbackImage = `${baseUrl}assets/project-portfolio.svg`;

function sortProjects(projects) {
  return [...projects].sort((a, b) => {
    const order = Number(a.sortOrder || 99) - Number(b.sortOrder || 99);
    if (order !== 0) return order;
    return String(b.year || "").localeCompare(String(a.year || ""));
  });
}

function normalizePath(p) {
  if (!p || typeof p !== "string") return p;
  if (p.startsWith("/") && !p.startsWith("//")) return baseUrl + p.slice(1);
  return p;
}

function safeUrl(url) {
  const value = String(url || "").trim();
  if (!value) return "#";
  if (value.startsWith("/") || value.startsWith("#") || value.startsWith("mailto:")) return value;
  try {
    const parsed = new URL(value);
    return ["http:", "https:"].includes(parsed.protocol) ? parsed.href : "#";
  } catch {
    return "#";
  }
}

const els = {
  brandName: document.querySelector("#brandName"),
  profileTitle: document.querySelector("#profileTitle"),
  heroName: document.querySelector("#heroName"),
  heroHeadline: document.querySelector("#heroHeadline"),
  heroSummary: document.querySelector("#heroSummary"),
  heroBadges: document.querySelector("#heroBadges"),
  profileLocation: document.querySelector("#profileLocation"),
  profileAvailability: document.querySelector("#profileAvailability"),
  projectCount: document.querySelector("#projectCount"),
  categoryTabs: document.querySelector("#categoryTabs"),
  projectGrid: document.querySelector("#projectGrid"),
  emptyState: document.querySelector("#emptyState"),
  contactLinks: document.querySelector("#contactLinks"),
  contactCard: document.querySelector("#contactCard"),
  footerName: document.querySelector("#footerName"),
  footerYear: document.querySelector("#footerYear"),
  modal: document.querySelector("#projectModal"),
  closeModal: document.querySelector("#closeModal"),
  modalImage: document.querySelector("#modalImage"),
  modalMeta: document.querySelector("#modalMeta"),
  modalTitle: document.querySelector("#modalTitle"),
  modalSummary: document.querySelector("#modalSummary"),
  modalDescription: document.querySelector("#modalDescription"),
  modalTags: document.querySelector("#modalTags"),
  modalLinks: document.querySelector("#modalLinks"),
  imageModal: document.querySelector("#imageModal"),
  imageModalClose: document.querySelector("#imageModalClose"),
  imageModalImg: document.querySelector("#imageModalImg"),
  imageModalCaption: document.querySelector("#imageModalCaption"),
  imageModalBackdrop: document.querySelector("#imageModalBackdrop")
};

async function init() {
  els.footerYear.textContent = new Date().getFullYear();

  if (!isLocal) {
    document.querySelectorAll(".admin-link").forEach((el) => {
      el.hidden = true;
    });
  }

  try {
    const [siteRes, projectsRes] = await Promise.all([
      fetch(`${baseUrl}data/site.json`, { cache: "no-store" }),
      fetch(`${baseUrl}data/projects.json`, { cache: "no-store" })
    ]);
    if (!siteRes.ok || !projectsRes.ok) throw new Error("无法读取作品集数据");
    const [site, projects] = await Promise.all([siteRes.json(), projectsRes.json()]);
    state.site = site || {};
    state.projects = sortProjects(Array.isArray(projects) ? projects : []);
    render();
  } catch (error) {
    els.projectGrid.innerHTML = "";
    els.emptyState.hidden = false;
    els.emptyState.querySelector("strong").textContent = "数据加载失败";
    els.emptyState.querySelector("span").textContent = error.message;
  }
}

function uniqueCategories() {
  return [...new Set(state.projects.map((project) => project.category || "作品"))];
}

function render() {
  document.title = `${state.site.name || "我的"} - ${state.site.title || "个人作品集"}`;
  els.brandName.textContent = state.site.name || "Portfolio";
  els.footerName.textContent = state.site.name || "Portfolio";
  els.profileTitle.textContent = state.site.title || "个人作品集";
  els.heroName.textContent = state.site.name || "我的作品集";
  els.heroHeadline.textContent = state.site.headline || "把想法做成可使用、可展示、可维护的作品。";
  els.heroSummary.textContent = state.site.summary || "";
  els.profileLocation.textContent = state.site.location || "中国";
  els.profileAvailability.textContent = state.site.availability || "开放交流";
  els.projectCount.textContent = String(state.projects.length);

  renderBadges();
  renderTabs(uniqueCategories());
  renderProjects();
  renderContact();
}

function renderBadges() {
  els.heroBadges.replaceChildren();
  const badges = Array.isArray(state.site.badges) ? state.site.badges : [];
  badges.forEach((badge) => {
    const span = document.createElement("span");
    const variant = typeof badge === "string" ? "default" : badge.variant;
    span.className = `badge is-${variant || "default"}`;
    span.textContent = typeof badge === "string" ? badge : badge.label;
    els.heroBadges.append(span);
  });
}

function renderTabs(categories) {
  const tabs = ["全部", ...categories];
  els.categoryTabs.replaceChildren();
  tabs.forEach((category) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = category;
    button.setAttribute("aria-pressed", String(state.selectedCategory === category));
    button.addEventListener("click", () => {
      state.selectedCategory = category;
      renderTabs(categories);
      renderProjects();
    });
    els.categoryTabs.append(button);
  });
}

function filteredProjects() {
  return state.projects.filter((project) => {
    const inCategory = state.selectedCategory === "全部" || project.category === state.selectedCategory;
    return inCategory;
  });
}

function renderProjects() {
  const projects = filteredProjects();
  els.projectGrid.replaceChildren();
  els.emptyState.hidden = projects.length > 0;

  projects.forEach((project) => {
    const card = document.createElement("article");
    card.className = "project-card";

    const image = document.createElement("img");
    image.src = normalizePath(project.image) || fallbackImage;
    image.alt = `${project.title} 项目封面`;
    image.loading = "lazy";

    const body = document.createElement("div");
    body.className = "project-card-body";

    const meta = document.createElement("div");
    meta.className = "card-meta";
    const category = document.createElement("span");
    category.textContent = project.category || "作品";
    const year = document.createElement("span");
    year.textContent = project.year || "";
    meta.append(category, year);

    const title = document.createElement("h3");
    title.textContent = project.title;
    const summary = document.createElement("p");
    summary.textContent = project.summary || "";

    const tags = document.createElement("div");
    tags.className = "tag-list";
    (project.tags || []).slice(0, 5).forEach((tag) => {
      const span = document.createElement("span");
      span.textContent = tag;
      tags.append(span);
    });

    const button = document.createElement("button");
    button.className = "open-project";
    button.type = "button";
    button.textContent = "查看详情";
    button.addEventListener("click", () => openProject(project));

    body.append(meta, title, summary, tags, button);
    card.append(image, body);
    els.projectGrid.append(card);
  });
}

function renderContact() {
  els.contactLinks.replaceChildren();
  const links = [];
  if (state.site.email) links.push({ label: "发送邮件", url: `mailto:${state.site.email}`, primary: true });
  if (state.site.resumeUrl) links.push({ label: "查看简历", url: state.site.resumeUrl });
  if (Array.isArray(state.site.socials)) {
    state.site.socials.forEach((s) => links.push({ ...s }));
  }

  links
    .filter((link) => link.label && link.url)
    .forEach((link) => {
      const anchor = document.createElement("a");
      anchor.href = safeUrl(link.url);
      anchor.textContent = link.label;
      if (!anchor.href.startsWith("mailto:")) {
        anchor.target = "_blank";
        anchor.rel = "noreferrer";
      }
      if (!link.primary) anchor.classList.add("secondary");
      els.contactLinks.append(anchor);
    });

  els.contactCard.replaceChildren();
  const facts = [
    { label: "邮箱", value: state.site.email || "—" },
    { label: "所在地", value: state.site.location || "—" },
    { label: "状态", value: state.site.availability || "—" }
  ];
  facts.forEach((fact) => {
    const wrap = document.createElement("div");
    const dt = document.createElement("dt");
    dt.textContent = fact.label;
    const dd = document.createElement("dd");
    dd.textContent = fact.value;
    wrap.append(dt, dd);
    els.contactCard.append(wrap);
  });
}

function openProject(project) {
  els.modalImage.src = normalizePath(project.image) || fallbackImage;
  els.modalMeta.textContent = [project.category, project.role, project.year, project.status].filter(Boolean).join(" / ");
  els.modalTitle.textContent = project.title;
  els.modalSummary.textContent = project.summary || "";
  els.modalDescription.textContent = project.description || "";
  els.modalTags.replaceChildren();
  (project.tags || []).forEach((tag) => {
    const span = document.createElement("span");
    span.textContent = tag;
    els.modalTags.append(span);
  });
  els.modalLinks.replaceChildren();

  (project.links || []).forEach((link) => {
    if (!link.label || !link.url) return;
    const type = link.type || "default";

    if (type === "cert" || type === "image") {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "link-btn is-image";
      btn.innerHTML = `<span class="link-icon">🖼️</span><span class="link-label">${link.label}</span>`;
      btn.addEventListener("click", () => openImageModal(link.url, link.label));
      els.modalLinks.append(btn);
      return;
    }

    const anchor = document.createElement("a");
    anchor.href = safeUrl(link.url);
    anchor.className = "link-btn";
    let icon = "";
    if (type === "repo") { icon = "📦"; }
    else if (type === "github") { icon = "🐙"; }
    else if (type === "demo" || type === "site") { icon = "🔗"; }
    else { icon = "🔗"; }
    anchor.innerHTML = `<span class="link-icon">${icon}</span><span class="link-label">${link.label}</span>`;
    if (!anchor.href.startsWith("mailto:") && !anchor.href.startsWith(window.location.origin)) {
      anchor.target = "_blank";
      anchor.rel = "noreferrer";
    }
    els.modalLinks.append(anchor);
  });

  els.modal.hidden = false;
  document.body.style.overflow = "hidden";
}

function closeModal() {
  els.modal.hidden = true;
  document.body.style.overflow = "";
}

function openImageModal(url, caption) {
  els.imageModalImg.src = normalizePath(url);
  els.imageModalImg.alt = caption || "";
  els.imageModalCaption.textContent = caption || "";
  els.imageModal.hidden = false;
  document.body.style.overflow = "hidden";
}

function closeImageModal() {
  els.imageModal.hidden = true;
  els.imageModalImg.src = "";
  document.body.style.overflow = "";
}

els.closeModal.addEventListener("click", closeModal);
els.modal.addEventListener("click", (event) => {
  if (event.target === els.modal) closeModal();
});
els.imageModalClose.addEventListener("click", closeImageModal);
els.imageModalBackdrop.addEventListener("click", closeImageModal);
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    if (!els.imageModal.hidden) closeImageModal();
    else if (!els.modal.hidden) closeModal();
  }
});

init();
