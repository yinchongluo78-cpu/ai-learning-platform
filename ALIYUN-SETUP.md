# 阿里云部署指南

## 📋 准备工作

### 1. 购买阿里云RDS PostgreSQL

1. 登录[阿里云控制台](https://www.aliyun.com)
2. 选择 **云数据库RDS** → **PostgreSQL**
3. 推荐配置：
   - 版本：PostgreSQL 14或以上
   - 规格：2核4GB起步
   - 存储：20GB起步
   - 地域：选择离用户最近的地域

### 2. 配置数据库

1. **创建数据库**
   ```sql
   CREATE DATABASE ai_learning;
   ```

2. **执行初始化脚本**
   ```bash
   psql -h your-rds-instance.pg.rds.aliyuncs.com -U your_username -d ai_learning -f database/init-aliyun.sql
   ```

3. **设置白名单**
   - 添加你的IP地址到RDS白名单
   - 如果部署在阿里云ECS，添加ECS内网IP

### 3. 配置OSS（对象存储）

1. 开通OSS服务
2. 创建Bucket
3. 获取AccessKey和Secret
4. 设置跨域规则（CORS）

## 🚀 部署步骤

### 方案A：部署到阿里云ECS

1. **准备ECS服务器**
   ```bash
   # 安装Node.js
   curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
   sudo yum install -y nodejs

   # 安装PM2
   npm install -g pm2
   ```

2. **克隆项目**
   ```bash
   git clone https://github.com/your-username/ai-learning-platform.git
   cd ai-learning-platform
   ```

3. **安装依赖**
   ```bash
   npm install
   ```

4. **配置环境变量**
   ```bash
   cp .env.aliyun.example .env.local
   # 编辑 .env.local，填写实际的配置值
   vim .env.local
   ```

5. **构建项目**
   ```bash
   npm run build
   ```

6. **启动服务**
   ```bash
   # 使用PM2启动
   pm2 start npm --name "ai-learning" -- run preview

   # 或使用nginx部署静态文件
   sudo cp -r dist/* /usr/share/nginx/html/
   ```

### 方案B：部署到阿里云函数计算（Serverless）

1. **安装Serverless Devs**
   ```bash
   npm install -g @serverless-devs/s
   ```

2. **配置s.yaml**
   ```yaml
   edition: 1.0.0
   name: ai-learning-platform

   services:
     ai-learning:
       component: fc
       props:
         region: cn-shenzhen
         service:
           name: ai-learning
         function:
           name: web
           runtime: nodejs14
           codeUri: ./dist
           handler: index.handler
   ```

3. **部署**
   ```bash
   s deploy
   ```

### 方案C：使用阿里云容器服务

1. **创建Dockerfile**
   ```dockerfile
   FROM node:18-alpine
   WORKDIR /app
   COPY package*.json ./
   RUN npm install
   COPY . .
   RUN npm run build
   EXPOSE 3000
   CMD ["npm", "run", "preview"]
   ```

2. **构建镜像**
   ```bash
   docker build -t ai-learning-platform .
   ```

3. **推送到阿里云容器镜像仓库**
   ```bash
   docker tag ai-learning-platform registry.cn-shenzhen.aliyuncs.com/your-namespace/ai-learning
   docker push registry.cn-shenzhen.aliyuncs.com/your-namespace/ai-learning
   ```

## 📝 环境变量配置

必须配置的环境变量：

```env
# 启用阿里云数据库
VITE_USE_ALIYUN_DB=true

# RDS配置
VITE_ALIYUN_DB_HOST=rm-xxx.pg.rds.aliyuncs.com
VITE_ALIYUN_DB_PORT=5432
VITE_ALIYUN_DB_NAME=ai_learning
VITE_ALIYUN_DB_USER=your_username
VITE_ALIYUN_DB_PASSWORD=your_password
VITE_ALIYUN_DB_SSL=true

# JWT密钥
VITE_JWT_SECRET=生成一个随机的32位字符串

# DeepSeek API
VITE_DEEPSEEK_API_KEY=你的DeepSeek API密钥

# OSS配置
VITE_OSS_REGION=oss-cn-shenzhen
VITE_OSS_ACCESS_KEY_ID=你的AccessKey
VITE_OSS_ACCESS_KEY_SECRET=你的Secret
VITE_OSS_BUCKET=你的Bucket名称
```

## 🔧 配置域名

1. **购买域名**（如果没有）
2. **配置DNS解析**指向你的服务器IP
3. **配置SSL证书**（推荐使用阿里云免费证书）
4. **配置nginx**（如果使用nginx）

```nginx
server {
    listen 443 ssl;
    server_name your-domain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        root /usr/share/nginx/html;
        try_files $uri $uri/ /index.html;
    }

    # API代理（如果有后端服务）
    location /api {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## 🔍 监控和维护

1. **配置阿里云监控**
   - RDS监控：CPU、内存、连接数
   - ECS监控：CPU、内存、带宽
   - OSS监控：流量、请求数

2. **设置报警规则**
   - 数据库连接数超过80%
   - CPU使用率超过80%
   - 磁盘空间低于20%

3. **定期备份**
   - RDS自动备份（每天）
   - OSS数据同步备份

## 🚨 常见问题

### 1. 数据库连接失败
- 检查白名单配置
- 确认用户名密码正确
- 检查SSL设置

### 2. OSS上传失败
- 检查CORS配置
- 确认AccessKey权限
- 检查Bucket权限

### 3. 网站无法访问
- 检查安全组规则
- 确认nginx/服务启动
- 查看错误日志

## 📞 技术支持

- 阿里云工单系统
- 阿里云社区论坛
- 项目Issues页面

## 💰 成本估算

基础配置月费用（参考）：
- RDS PostgreSQL（2核4GB）：约200元/月
- ECS（2核4GB）：约150元/月
- OSS（100GB存储+流量）：约50元/月
- 域名：约50元/年

**总计：约400元/月**

## 🎯 性能优化建议

1. 使用阿里云CDN加速静态资源
2. 启用RDS读写分离
3. 使用Redis缓存热点数据
4. 配置自动伸缩策略