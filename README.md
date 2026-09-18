# 个人作品集网站

这是一个无需登录即可浏览、后台受密码保护的个人作品集网站。公开页面展示项目，`/admin` 后台可以新增、编辑、删除项目和修改个人信息。

## 启动

```powershell
npm start
```

打开：

- 公开展示页：http://localhost:5177
- 后台管理页：http://localhost:5177/admin

如果没有配置 `.env`，首次启动会自动生成 `data/admin-secret.txt`，里面就是后台管理员密码。发布到公网前建议复制 `.env.example` 为 `.env`，把 `ADMIN_PASSWORD` 改成自己的强密码。

## 数据位置

- 个人信息：`data/site.json`
- 项目列表：`data/projects.json`
- 默认本地后台密码：`data/admin-secret.txt`

访客只能读取公开展示数据；项目新增、编辑、删除都需要先登录后台，服务端会验证管理员会话。

## 部署到 GitHub Pages（免费公网访问）

公开页面已改造为**纯静态**:`public/` 目录可以直接放到任何静态托管。`localhost` 只在本机能访问,要让别人打开必须部署到公网。GitHub Pages 提供免费的 `https://<用户名>.github.io/<仓库名>/` 形式网址,适合长期作品集展示。

### 架构说明

- **公开浏览页**:静态 HTML/CSS/JS + `public/data/*.json`,GitHub Pages 直接服务,无需后端。
- **后台 `/admin`**:仅在你本地 `npm start` 后可用,用于在线编辑内容。改完内容后,新的 `public/data/site.json` 和 `public/data/projects.json` 会自动保存到本地仓库,git push 后 GitHub Actions 自动重新部署 Pages。
- **GitHub Pages 上不暴露后台**:导航栏的"管理"链接在非 localhost 域名下会自动隐藏。

### 步骤

1. 在 GitHub 创建仓库。若仓库名为 `<用户名>.github.io`(如 `handong8950.github.io`),网址就是 `https://handong8950.github.io/`(根路径);若仓库名为 `portfolio`,网址则是 `https://handong8950.github.io/portfolio/`(子路径,代码已兼容)。
2. 把项目推送到该仓库的 `main` 分支:
   ```powershell
   git add -A
   git commit -m "Static deploy to GitHub Pages"
   git branch -M main
   git remote add origin https://github.com/<用户名>/<仓库名>.git
   git push -u origin main
   ```
3. 推送后,`.github/workflows/deploy.yml` 会自动触发,把 `public/` 目录部署到 GitHub Pages(约 1-2 分钟)。
4. 在仓库 Settings → Pages → Source 选择 **GitHub Actions**(部署工作流已配置好,无需再选分支)。
5. 等 Actions 跑完,在仓库主页右侧"Deployments"或 Settings → Pages 顶部能看到公网地址。

### 编辑内容流程

```powershell
npm start
# 浏览器打开 http://localhost:5177/admin 修改内容并保存
# 修改会写入 public/data/*.json
git add public/data/
git commit -m "Update portfolio content"
git push
# GitHub Actions 自动重新部署,1-2 分钟后公网页面更新
```

### 注意事项

- `data/admin-secret.txt` 是本地管理员密码,已在 `.gitignore` 中,不会推送到 GitHub。
- 若要自定义管理员密码,在项目根目录创建 `.env` 文件,写入 `ADMIN_PASSWORD=你的强密码`(`.env` 也在 `.gitignore` 中)。
- `.nojekyll` 文件已放在 `public/` 中,确保 GitHub Pages 不对 `_` 开头的文件夹做 Jekyll 处理。

## 部署提醒

1. 线上一定要设置 `ADMIN_PASSWORD`。
2. 如果通过 HTTPS 反向代理部署，可以设置 `COOKIE_SECURE=true`。
3. 确保部署环境允许写入 `data/` 目录，否则后台修改无法保存。
