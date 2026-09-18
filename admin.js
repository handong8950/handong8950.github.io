const state = {
  site: {},
  projects: [],
  editingId: null
};

const fallbackImage = "/assets/project-portfolio.svg";

const els = {
  loginView: document.querySelector("#loginView"),
  adminView: document.querySelector("#adminView"),
  loginForm: document.querySelector("#loginForm"),
  logoutButton: document.querySelector("#logoutButton"),
  siteForm: document.querySelector("#siteForm"),
  projectForm: document.querySelector("#projectForm"),
  resetProjectForm: document.querySelector("#resetProjectForm"),
  formMode: document.querySelector("#formMode"),
  adminProjectList: document.querySelector("#adminProjectList"),
  projectTotal: document.querySelector("#projectTotal"),
  toast: document.querySelector("#toast")
};

async function init() {
  await loadPublicData();
  const me = await request("/api/me");
  if (me.authenticated) {
    showAdmin();
  } else {
    showLogin();
  }
}

async function loadPublicData() {
  const data = await request("/api/site");
  state.site = data.site || {};
  state.projects = Array.isArray(data.projects) ? data.projects : [];
}

async function request(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    },
    body: options.body && typeof options.body !== "string" ? JSON.stringify(options.body) : options.body
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : {};
  if (!response.ok) throw new Error(data.error || "请求失败");
  return data;
}

function showLogin() {
  els.loginView.hidden = false;
  els.adminView.hidden = true;
}

function showAdmin() {
  els.loginView.hidden = true;
  els.adminView.hidden = false;
  fillSiteForm();
  resetProjectForm();
  renderProjectList();
}

function fillSiteForm() {
  const form = els.siteForm;
  form.name.value = state.site.name || "";
  form.title.value = state.site.title || "";
  form.headline.value = state.site.headline || "";
  form.summary.value = state.site.summary || "";
  form.location.value = state.site.location || "";
  form.availability.value = state.site.availability || "";
  form.email.value = state.site.email || "";
  form.phone.value = state.site.phone || "";
  form.resumeUrl.value = state.site.resumeUrl || "";
  form.githubUrl.value = (state.site.socials || []).find((link) => /github/i.test(link.label))?.url || "";
  form.blogUrl.value =
    (state.site.socials || []).find((link) => !/github|邮箱|email/i.test(link.label))?.url || "";
}

function renderProjectList() {
  els.adminProjectList.replaceChildren();
  els.projectTotal.textContent = `${state.projects.length} 个项目`;

  if (!state.projects.length) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = "还没有项目，先在右侧新增一个。";
    els.adminProjectList.append(empty);
    return;
  }

  state.projects.forEach((project) => {
    const item = document.createElement("article");
    item.className = "admin-list-item";

    const image = document.createElement("img");
    image.src = project.image || fallbackImage;
    image.alt = "";

    const info = document.createElement("div");
    const title = document.createElement("h3");
    title.textContent = project.title;
    const meta = document.createElement("p");
    meta.textContent = [project.category, project.role, project.year, project.status].filter(Boolean).join(" / ");
    const summary = document.createElement("p");
    summary.textContent = project.summary || "";
    info.append(title, meta, summary);

    const actions = document.createElement("div");
    actions.className = "row-actions";
    const edit = document.createElement("button");
    edit.type = "button";
    edit.textContent = "编辑";
    edit.addEventListener("click", () => editProject(project.id));
    const del = document.createElement("button");
    del.type = "button";
    del.className = "danger";
    del.textContent = "删除";
    del.addEventListener("click", () => deleteProject(project.id));
    actions.append(edit, del);

    item.append(image, info, actions);
    els.adminProjectList.append(item);
  });
}

function editProject(id) {
  const project = state.projects.find((item) => item.id === id);
  if (!project) return;

  state.editingId = id;
  els.formMode.textContent = "正在编辑";
  const form = els.projectForm;
  form.id.value = project.id;
  form.title.value = project.title || "";
  form.role.value = project.role || "";
  form.category.value = project.category || "";
  form.year.value = project.year || "";
  form.status.value = project.status || "进行中";
  form.sortOrder.value = project.sortOrder ?? 99;
  form.featured.checked = Boolean(project.featured);
  form.image.value = project.image || "";
  form.summary.value = project.summary || "";
  form.description.value = project.description || "";
  form.tags.value = (project.tags || []).join(", ");
  form.demoUrl.value = findLink(project, "演示") || "";
  form.codeUrl.value = findLink(project, "源码") || findLink(project, "文档") || "";
  form.scrollIntoView({ behavior: "smooth", block: "start" });
}

function findLink(project, keyword) {
  return (project.links || []).find((link) => link.label.includes(keyword))?.url;
}

function resetProjectForm() {
  state.editingId = null;
  els.formMode.textContent = "新增项目";
  els.projectForm.reset();
  els.projectForm.status.value = "进行中";
  els.projectForm.sortOrder.value = 99;
  els.projectForm.image.value = fallbackImage;
}

function collectSiteForm() {
  const form = els.siteForm;
  const socials = [];
  if (form.githubUrl.value.trim()) socials.push({ label: "GitHub", url: form.githubUrl.value.trim() });
  if (form.blogUrl.value.trim()) socials.push({ label: "博客", url: form.blogUrl.value.trim() });
  if (form.email.value.trim()) socials.push({ label: "邮箱", url: `mailto:${form.email.value.trim()}` });

  return {
    name: form.name.value.trim(),
    title: form.title.value.trim(),
    headline: form.headline.value.trim(),
    summary: form.summary.value.trim(),
    location: form.location.value.trim(),
    availability: form.availability.value.trim(),
    email: form.email.value.trim(),
    phone: form.phone.value.trim(),
    resumeUrl: form.resumeUrl.value.trim(),
    socials
  };
}

function collectProjectForm() {
  const form = els.projectForm;
  const links = [];
  if (form.demoUrl.value.trim()) links.push({ label: "演示", url: form.demoUrl.value.trim() });
  if (form.codeUrl.value.trim()) links.push({ label: "源码 / 文档", url: form.codeUrl.value.trim() });

  return {
    title: form.title.value.trim(),
    role: form.role.value.trim(),
    category: form.category.value.trim(),
    year: form.year.value.trim(),
    status: form.status.value,
    sortOrder: Number(form.sortOrder.value || 99),
    featured: form.featured.checked,
    image: form.image.value.trim() || fallbackImage,
    summary: form.summary.value.trim(),
    description: form.description.value.trim(),
    tags: form.tags.value
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean),
    links
  };
}

async function deleteProject(id) {
  const project = state.projects.find((item) => item.id === id);
  if (!project) return;
  if (!confirm(`确定删除「${project.title}」吗？这个操作会写入 data/projects.json。`)) return;

  await request(`/api/admin/projects/${encodeURIComponent(id)}`, { method: "DELETE" });
  state.projects = state.projects.filter((item) => item.id !== id);
  if (state.editingId === id) resetProjectForm();
  renderProjectList();
  showToast("项目已删除");
}

function showToast(message) {
  els.toast.textContent = message;
  els.toast.hidden = false;
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => {
    els.toast.hidden = true;
  }, 2600);
}

els.loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    await request("/api/login", {
      method: "POST",
      body: { password: els.loginForm.password.value }
    });
    await loadPublicData();
    showAdmin();
    showToast("登录成功");
  } catch (error) {
    showToast(error.message);
  }
});

els.logoutButton.addEventListener("click", async () => {
  await request("/api/logout", { method: "POST" });
  showLogin();
  showToast("已退出后台");
});

els.siteForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    const data = await request("/api/admin/site", {
      method: "PUT",
      body: collectSiteForm()
    });
    state.site = data.site;
    showToast("个人信息已保存");
  } catch (error) {
    showToast(error.message);
  }
});

els.projectForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    const payload = collectProjectForm();
    if (state.editingId) {
      const data = await request(`/api/admin/projects/${encodeURIComponent(state.editingId)}`, {
        method: "PUT",
        body: payload
      });
      state.projects = state.projects.map((project) => (project.id === state.editingId ? data.project : project));
      showToast("项目已更新");
    } else {
      const data = await request("/api/admin/projects", {
        method: "POST",
        body: payload
      });
      state.projects = [...state.projects, data.project];
      showToast("项目已新增");
    }
    state.projects.sort((a, b) => Number(a.sortOrder || 99) - Number(b.sortOrder || 99));
    resetProjectForm();
    renderProjectList();
  } catch (error) {
    showToast(error.message);
  }
});

els.resetProjectForm.addEventListener("click", resetProjectForm);

init().catch((error) => {
  showToast(error.message);
});
