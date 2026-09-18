const state = {
  site: {},
  projects: [],
  selectedCategory: "全部",
  search: ""
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

const els = {
  brandName: document.querySelector("#brandName"),
  profileTitle: document.querySelector("#profileTitle"),
  heroName: document.querySelector("#heroName"),
  heroHeadline: document.querySelector("#heroHeadline"),
  heroSummary: document.querySelector("#heroSummary"),
  projectCount: document.querySelector("#projectCount"),
  categoryCount: document.querySelector("#categoryCount"),
  featuredCount: document.querySelector("#featuredCount"),
  galleryLeadTitle: document.querySelector("#galleryLeadTitle"),
  heroGallery: document.querySelector("#heroGallery"),
  searchInput: document.querySelector("#searchInput"),
  categoryTabs: document.querySelector("#categoryTabs"),
  projectGrid: document.querySelector("#projectGrid"),
  emptyState: document.querySelector("#emptyState"),
  aboutText: document.querySelector("#aboutText"),
  profileLocation: document.querySelector("#profileLocation"),
  profileAvailability: document.querySelector("#profileAvailability"),
  profileEmail: document.querySelector("#profileEmail"),
  contactLinks: document.querySelector("#contactLinks"),
  footerName: document.querySelector("#footerName"),
  modal: document.querySelector("#projectModal"),
  closeModal: document.querySelector("#closeModal"),
  modalImage: document.querySelector("#modalImage"),
  modalMeta: document.querySelector("#modalMeta"),
  modalTitle: document.querySelector("#modalTitle"),
  modalSummary: document.querySelector("#modalSummary"),
  modalDescription: document.querySelector("#modalDescription"),
  modalTags: document.querySelector("#modalTags"),
  modalLinks: document.querySelector("#modalLinks")
};

async function init() {
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

function render() {
  document.title = `${state.site.name || "我的"} - ${state.site.title || "个人作品集"}`;
  els.brandName.textContent = state.site.name || "Portfolio";
  els.profileTitle.textContent = state.site.title || "个人作品集";
  els.heroName.textContent = state.site.name || "我的作品集";
  els.heroHeadline.textContent = state.site.headline || "把想法做成可使用、可展示、可维护的作品。";
  els.heroSummary.textContent = state.site.summary || "";
  els.footerName.textContent = state.site.name || "Portfolio";
  els.aboutText.textContent = state.site.summary || "这里会展示我的个人介绍、能力方向和代表作品。";
  els.profileLocation.textContent = state.site.location || "中国";
  els.profileAvailability.textContent = state.site.availability || "开放交流";
  els.profileEmail.textContent = state.site.email || "hello@example.com";

  const categories = uniqueCategories();
  const featured = state.projects.filter((project) => project.featured);
  els.projectCount.textContent = String(state.projects.length);
  els.categoryCount.textContent = String(categories.length);
  els.featuredCount.textContent = String(featured.length);
  els.galleryLeadTitle.textContent = featured[0]?.title || state.projects[0]?.title || "近期作品";

  renderGallery(featured.length ? featured : state.projects.slice(0, 3));
  renderTabs(categories);
  renderProjects();
  renderContactLinks();
}

function uniqueCategories() {
  return [...new Set(state.projects.map((project) => project.category || "作品"))];
}

function renderGallery(projects) {
  els.heroGallery.replaceChildren();
  projects.slice(0, 3).forEach((project) => {
    const card = document.createElement("article");
    card.className = "gallery-card";

    const image = document.createElement("img");
    image.src = normalizePath(project.image) || fallbackImage;
    image.alt = "";
    image.loading = "lazy";

    const content = document.createElement("div");
    const title = document.createElement("h3");
    title.textContent = project.title;
    const summary = document.createElement("p");
    summary.textContent = project.summary || project.role || "";
    content.append(title, summary);
    card.append(image, content);
    els.heroGallery.append(card);
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
  const keyword = state.search.trim().toLowerCase();
  return state.projects.filter((project) => {
    const inCategory = state.selectedCategory === "全部" || project.category === state.selectedCategory;
    const haystack = [
      project.title,
      project.role,
      project.category,
      project.year,
      project.status,
      project.summary,
      project.description,
      ...(project.tags || [])
    ]
      .join(" ")
      .toLowerCase();
    return inCategory && (!keyword || haystack.includes(keyword));
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
    const tags = renderTags(project.tags || []);
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

function renderTags(tags) {
  const wrap = document.createElement("div");
  wrap.className = "tag-list";
  appendTags(wrap, tags);
  return wrap;
}

function appendTags(container, tags) {
  tags.slice(0, 6).forEach((tag) => {
    const item = document.createElement("span");
    item.textContent = tag;
    container.append(item);
  });
}

function renderContactLinks() {
  els.contactLinks.replaceChildren();
  const links = [];
  if (state.site.email) links.push({ label: "发送邮件", url: `mailto:${state.site.email}` });
  if (state.site.resumeUrl) links.push({ label: "查看简历", url: state.site.resumeUrl });
  if (Array.isArray(state.site.socials)) links.push(...state.site.socials);

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
      els.contactLinks.append(anchor);
    });
}

function openProject(project) {
  els.modalImage.src = normalizePath(project.image) || fallbackImage;
  els.modalMeta.textContent = [project.category, project.role, project.year, project.status].filter(Boolean).join(" / ");
  els.modalTitle.textContent = project.title;
  els.modalSummary.textContent = project.summary || "";
  els.modalDescription.textContent = project.description || "";
  els.modalTags.replaceChildren();
  appendTags(els.modalTags, project.tags || []);
  els.modalLinks.replaceChildren();

  (project.links || []).forEach((link) => {
    if (!link.label || !link.url) return;
    const anchor = document.createElement("a");
    anchor.href = safeUrl(link.url);
    anchor.textContent = link.label;
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

els.searchInput.addEventListener("input", (event) => {
  state.search = event.target.value;
  renderProjects();
});

els.closeModal.addEventListener("click", closeModal);
els.modal.addEventListener("click", (event) => {
  if (event.target === els.modal) closeModal();
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !els.modal.hidden) closeModal();
});

init();
