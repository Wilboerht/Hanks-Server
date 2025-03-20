# Hanks Server

一个基于 Node.js、Express 和 Prisma 的 RESTful API 服务器。

## 功能特性

- 基于 Express 框架的 RESTful API
- TypeScript 支持
- JWT 认证
- Prisma ORM 集成
- SQLite 用于开发环境

## 快速开始

### 1. 克隆仓库

```bash
git clone https://github.com/Wilboerht/Hanks-Server.git
cd Hanks-Server
```

### 2. 安装依赖

```bash
npm install
```

### 3. 设置环境变量

拷贝环境变量示例文件，然后修改为您的配置：

```bash
cp .env.example .env
```

请务必修改 JWT 密钥为您自己的安全密钥。

### 4. 初始化数据库

```bash
npx prisma migrate dev --name init
```

### 5. 启动服务器

开发模式：
```bash
npm run dev
```

生产模式：
```bash
npm run build
npm start
```

## 项目结构

```
├── src/
│   ├── controllers/    # 控制器
│   ├── middleware/     # 中间件
│   ├── models/         # 模型
│   ├── routes/         # 路由
│   ├── services/       # 服务
│   ├── utils/          # 工具函数
│   ├── app.ts          # Express 应用程序
│   ├── config.ts       # 配置文件
│   ├── index.ts        # 程序入口
│   └── server.ts       # HTTP 服务器
├── prisma/             # Prisma 数据库配置
├── .env.example        # 环境变量示例
└── package.json        # 项目依赖
```

## 安全说明

为了安全起见，请确保：

1. 不要提交 `.env` 文件到版本控制系统
2. 为生产环境使用强密码和安全密钥
3. 数据库文件（如 `prisma/dev.db`）不应被提交到仓库

## 贡献指南

1. Fork 这个仓库
2. 创建新的功能分支 (`git checkout -b feature/amazing-feature`)
3. 提交您的更改 (`git commit -m 'Add some amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 创建一个 Pull Request

## 许可证

[MIT](LICENSE) 