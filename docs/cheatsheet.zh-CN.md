# 前端项目速查

本项目基于 React、Ant Design Pro 和 Umi Max，但业务代码不再沿用 Ant Design Pro 示例目录。完整边界与新增规则见 [前端模块规范](./前端模块规范.md)，本地和正式部署方式见 [部署说明](./部署说明.md)。

## 常用命令

| 命令 | 说明 |
| --- | --- |
| `npm run configure:local` | 交互式生成本地真实后端联调配置 |
| `PORT=8001 npm run dev` | 使用真实后端代理启动开发服务 |
| `npm run lint` | 执行 Biome 和 TypeScript 检查 |
| `npm test -- --runInBand` | 串行执行全部 Jest 测试 |
| `npm run build` | 生成正式 `dist/` 构建产物 |

项目没有运行时 Mock 启动模式。Jest mock 仅用于单元测试隔离，不参与开发或生产运行。

## 目录

```text
config/routes/          分模块路由注册
src/api/                主 API、运行时配置和请求安全边界
src/app/                应用壳、鉴权、菜单和扩展注册
src/branding/           默认品牌与主题
src/login-layouts/      登录布局目录和注册表
src/modules/admin/      公共平台管理模块
src/modules/recov/      Recov 业务模块
src/modules/sales/      Sales 业务模块
src/modules/billing/    Billing 共享业务能力
src/pages/              Umi 路由薄入口
src/shared/             跨模块稳定类型和共享平台服务
src/site-profiles/      服务端站点配置解析
```

## 新增页面

1. 在对应的 `src/modules/<module>/pages/` 中实现页面。
2. 在 `src/pages/` 中增加一行 Umi 薄入口。
3. 在对应的 `config/routes/<module>.ts` 中注册路由。
4. 让后端 `/system/menu/getRouters` 的完整授权树显式返回该业务路径；`hidden` 路由也必须在原始树中存在。
5. 菜单展示、Umi `access`、按钮权限码和后端接口授权是不同维度，需要分别配置和验证。

`hideInMenu` 和后端 `activeMenu` 只影响展示，不构成权限控制。普通业务页授权加载失败时 fail-closed；前端不得根据目录、父路径或产品编码自行补齐后端未返回的菜单或路由。

## API

- 当前所有业务请求统一使用 `src/api/main.ts`，由主 Gateway 转发。
- `adminApi` 仅为正式 release 兼容字段，前端解析但业务请求忽略。
- 不按产品预先创建 API 类型；新增产品能复用主 API 时不增加新通道。
- 只有新 upstream 被证明无法由主 Gateway 承接时，才为明确的所有者模块设计直连 API，并同步实现同源代理、认证、审计、release 和部署验证契约。

## 构建与部署

`npm run build` 生成一份 `dist/`。正式发布会把该产物固化进 Web Docker 镜像。登录布局由服务端站点配置选择；同机部署或将 Infra/App 分别放在基础设施服务器和应用服务器，只是两个固定角色包的放置方式，不决定源码目录。
