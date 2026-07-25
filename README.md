# Survey Agent Frontend

面向材料冶金文献研究的 Research Copilot 前端。项目提供多轮问答、可审计 Thinking 轨迹、会话记忆、头脑风暴、证据矩阵和论文综述任务工作台。

## 技术栈

- React 19 + TypeScript
- Vite
- Tailwind CSS
- React Router
- React Markdown + KaTeX
- Framer Motion + Lucide Icons

## 本地运行

```bash
npm install
npm run dev
```

开发服务器默认通过 Vite 将 `/api` 转发到：

```text
http://localhost:8000
```

因此需要同时启动 Survey Agent FastAPI 后端。

## 构建

```bash
npm run build
```

构建产物生成在 `dist/`，该目录不会提交到 Git。

## 后端依赖

当前前端使用同源相对接口，例如 `/api/chat`、`/api/conversations` 和 `/api/tasks`。生产环境推荐由 FastAPI 静态托管构建产物，或在反向代理中将 `/api` 转发到后端服务。

GitHub Pages 只能展示静态页面，若要获得完整问答能力，需要部署可公网访问的后端并配置对应的 API 转发策略。

## 主要功能

- 多轮研究问答与流式输出
- Thinking、工具调用和检索轨迹展示
- 会话搜索、重命名、Markdown 导出和删除
- 分层对话记忆管理
- 选题头脑风暴与综述任务交接
- 研究问题证据覆盖矩阵与定向补证
- 深色/浅色主题与响应式研究工作区
