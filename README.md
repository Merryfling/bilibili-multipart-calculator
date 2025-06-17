# Bilibili Multipart Calculator

一个用于计算 B 站多 P 视频时长的工具，支持按照倍速调整计算观看时间。

## 功能特点

- 通过BV号或视频链接获取B站视频分P信息
- 显示所有分P标题和时长
- 可选择起始P和结束P进行时长计算
- 支持倍速调整，实时计算观看时间
- 被选中的分P会高亮显示，未选中的分P保持可见

## 项目结构

该项目采用单一仓库 monorepo 结构，分为前端和后端两部分：

```
/bilibili-multipart-calculator/
├── frontend/              # 前端代码
│   ├── src/               # Next.js源代码
│   ├── public/            # 静态资源
│   ├── package.json       # 前端依赖
│   └── ...                # 其他前端配置文件
│
├── backend/               # 后端代码
│   ├── main.go            # Go主程序
│   └── ...                # 其他后端文件
│
├── README.md              # 项目说明
├── DEPLOYMENT.md          # 部署指南
└── vercel.json            # Vercel部署配置
```

- 前端：基于 Next.js 的 React 应用，运行在 2233 端口
- 后端：Go 语言实现的 API 服务，运行在 2323 端口，用于请求B站数据

## 接口
    唯一接口 https://{NEXT_PUBLIC_BACKEND_API_URL}/bilibili-parts?url={BVID}

## 环境变量说明

### 前端环境变量

| 变量名 | 描述 | 默认值 |
|-------|------|--------|
| NEXT_PUBLIC_BACKEND_API_URL | 后端API地址 | http://localhost:2323 |

### 后端环境变量

| 变量名 | 描述 | 默认值 |
|-------|------|--------|
| ALLOWED_ORIGINS | 允许的前端域名，多个域名用逗号分隔 | http://localhost:2233 |
| API_TIMEOUT | API请求超时时间（秒） | 10 |
| PORT | 运行端口 | 2323 |
| DEBUG | 调试模式，true为开启 | false |
| USER_AGENT | 请求B站API使用的User-Agent | Mozilla/5.0... |

## 许可证

MIT

## 作者

ChanlerDev © 2025
