# 灵辰多产品前端

[English](./README.md) | 简体中文

基于 React、Ant Design Pro 和 Umi Max 的统一前端源码。当前一份源码生成一份 `dist/`，承载公共管理、Recov、Sales 和 Billing 能力；产品站点、登录布局、菜单、权限及部署拓扑分别配置，不通过源码目录一一绑定。

## 开发

```bash
npm install
npm run configure:local
PORT=8001 npm run dev
```

项目仅提供真实后端联调方式，不提供运行时 Mock。运行前请确认 8001 端口可用，并通过本地配置向导选择唯一主 Gateway。当前所有浏览器业务请求都通过主 API，智能外呼数据和 `/sys/voice` 业务配置也不使用独立 Voice 直连。

## 验证与构建

```bash
npm run lint
npm test -- --runInBand
npm run build
```

`npm run build` 生成唯一的 `dist/` 产物。正式发布由 release 仓把该产物固化进 Web Docker 镜像。

## 代码结构

```text
config/routes/          admin、recov、sales、billing 等路由聚合
src/api/                主 API、运行时配置和请求安全边界
src/app/                应用壳、鉴权、菜单和全局扩展
src/branding/           默认品牌与主题
src/login-layouts/      可复用登录布局及注册表
src/modules/admin/      公共平台管理模块
src/modules/recov/      Recov 业务模块
src/modules/sales/      Sales 业务模块
src/modules/billing/    可被多个产品复用的 Billing 能力
src/pages/              Umi 路由薄入口及少量待迁移的公共页面
src/shared/             跨模块稳定类型和共享平台服务
src/site-profiles/      服务端站点配置解析
```

业务模块页面实现放在所属模块中，`src/pages/` 负责 Umi 文件入口，并暂时保留少量尚未迁移的公共页面。已登录用户访问普通业务页面时，路径必须匹配后端 `/system/menu/getRouters` 返回的原始完整授权路由树，包括 `hidden` 路由；加载失败时 fail-closed。`hideInMenu` 和 `activeMenu` 只影响展示，不等于权限控制，前端不得补齐后端没有返回的菜单或路由。

## 文档

- [前端模块规范](./docs/前端模块规范.md)
- [本地与正式部署说明](./docs/部署说明.md)
- [项目速查](./docs/cheatsheet.zh-CN.md)
