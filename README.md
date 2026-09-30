# 个人作品集网站

一个苹果风格的静态个人作品集站点,搭配本地 Node.js 可视化后台。公开页面由 GitHub Pages 免费托管,推送到 `main` 分支即自动重新部署;后台在本地 `/admin` 提供所见即所得的项目编辑能力。

- 线上访问:<https://handong8950.github.io>
- 代码仓库:<https://github.com/handong8950/handong8950.github.io>

## 特性

- **静态前端**:纯 HTML / CSS / JS,无前端构建步骤,加载快、零运行成本。
- **苹果风格设计**:白底 + #2563eb 蓝强调 + 圆角胶囊按钮 + 毛玻璃导航栏。
- **本地可视化后台**:`/admin` 后台支持新增、编辑、删除项目,修改后直接写回 `data/*.json`。
- **自动部署**:push 到 `main` 触发 GitHub Actions,1–2 分钟内公网更新。
- **多类型链接**:每个项目可挂代码仓库、GitHub 主页、外部站点、证书图片(点击放大灯箱)。
- **后台入口隔离**:导航栏的"管理"链接在非 localhost 域名下自动隐藏,公网不暴露后台。
- **响应式布局**:桌面 / 平板 / 手机自适应。

## 技术栈

| 层 | 技术 |
| --- | --- |
| 前端 | 原生 HTML / CSS / JavaScript(ES2020+) |
| 后端 | Node.js + Express(仅本地后台) |
| 数据 | JSON 文件(`data/site.json`、`data/projects.json`) |
| 部署 | GitHub Pages + GitHub Actions |
| 鉴权 | 管理员密码 + 签名 Cookie 会话 |

## 目录结构

```
.
├── index.html          # 公开浏览页
├── admin.html          # 后台管理页
├── styles.css          # 苹果风格样式
├── app.js              # 前端渲染 + 交互逻辑
├── admin.js            # 后台编辑逻辑
├── server.js           # 本地 Express 服务(端口 5177)
├── package.json
├── .env.example        # 环境变量模板(复制为 .env 自定义密码)
├── .nojekyll           # 关闭 GitHub Pages 的 Jekyll 处理
├── .github/
│   └── workflows/
│       └── deploy.yml  # 推送到 main 自动部署 Pages
├── assets/             # 头像、项目封面、证书图片
└── data/
    ├── site.json          # 个人信息(姓名、简介、徽章、社交链接)
    ├── projects.json      # 项目列表
    └── admin-secret.txt   # 本地后台密码(自动生成,不入库)
```

## 本地开发

需要 Node.js ≥ 18。

```powershell
npm start
```

打开浏览器:

- 公开展示页:<http://localhost:5177>
- 后台管理页:<http://localhost:5177/admin>

首次启动会在 `data/admin-secret.txt` 自动生成管理员密码。线上部署前建议复制 `.env.example` 为 `.env`,把 `ADMIN_PASSWORD` 改成自己的强密码(`.env` 已在 `.gitignore`,不会推送到 GitHub)。

## 部署到 GitHub Pages

仓库已配置 [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml):推送到 `main` 分支后,工作流会把 `index.html / admin.html / styles.css / app.js / admin.js / assets/ / data/*.json` 打包到临时 `site/` 目录并上传到 GitHub Pages,无需手动选择分支。

```powershell
git add -A
git commit -m "Update portfolio content"
git push origin main
```

约 1–2 分钟后,在仓库 Settings → Pages 顶部能看到公网地址(已开启 **Source = GitHub Actions**)。

## 编辑内容流程

```powershell
# 1. 本地启动后台
npm start

# 2. 浏览器打开 http://localhost:5177/admin 登录后修改项目并保存
#    修改会写入 data/site.json 和 data/projects.json

# 3. 推送更新
git add data/
git commit -m "Update portfolio content"
git push origin main

# 4. GitHub Actions 自动重新部署,1-2 分钟后公网页面更新
```

也可以直接用文本编辑器改 `data/site.json` 和 `data/projects.json`,改完推送到 main 即可。

## 自定义内容

- **个人信息**:`data/site.json` 里的 `name` / `title` / `headline` / `summary` / `location` / `availability` / `badges` / `socials`。
- **项目列表**:`data/projects.json`,每条项目支持 `title` / `role` / `category` / `year` / `status` / `summary` / `description` / `tags` / `image` / `links`。
- **链接类型**:`links[].type` 可选 `site`(外部站点)、`repo`(代码仓库)、`github`(GitHub 主页)、`cert`(证书图片,点击弹出灯箱)、`image`(普通图片,点击弹出灯箱)。

## 安全注意

- `data/admin-secret.txt` 和 `.env` 已在 `.gitignore`,不会推送到 GitHub。
- 公网 GitHub Pages 上只暴露静态前端,后台 `/admin` 仅在本地 `npm start` 后可用。
- 真要在公网部署后台,务必先设 `ADMIN_PASSWORD`,如走 HTTPS 反代可设 `COOKIE_SECURE=true`。

## 许可证

个人作品,仅用于展示个人项目,不开放商用。
