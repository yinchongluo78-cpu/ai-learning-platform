# 阿里云OSS配置指南

## 第一步：创建阿里云账号

1. 访问 https://www.aliyun.com
2. 注册账号并完成实名认证
3. 充值少量金额（建议100元用于测试）

## 第二步：开通OSS服务

1. 登录阿里云控制台
2. 搜索"对象存储OSS"
3. 点击"立即开通"（首次开通免费）

## 第三步：创建Bucket

### 1. 进入OSS控制台
- 地址：https://oss.console.aliyun.com/

### 2. 创建Bucket
点击"创建Bucket"，配置如下：

```
Bucket名称：smartyouth-docs（需要全局唯一）
地域：华东1（杭州）或离用户最近的地域
存储类型：标准存储
读写权限：私有
服务端加密：无需配置
实时日志查询：关闭
定时备份：关闭
```

### 3. 配置跨域规则
在Bucket详情页，找到"权限管理" → "跨域设置"：

```
来源：
  http://localhost:5173
  https://your-domain.com

允许Methods：
  GET
  POST
  PUT
  DELETE
  HEAD

允许Headers：
  *

暴露Headers：
  ETag
  x-oss-request-id

缓存时间：600
```

## 第四步：创建RAM用户

### 1. 进入RAM控制台
访问：https://ram.console.aliyun.com/

### 2. 创建用户
- 点击"用户" → "创建用户"
- 登录名称：smartyouth-oss
- 显示名称：智能少年OSS访问
- 访问方式：勾选"编程访问"

### 3. 记录密钥
**重要**：创建成功后会显示：
- AccessKey ID
- AccessKey Secret

⚠️ **请立即保存，Secret只显示一次！**

### 4. 授权
- 点击用户名进入详情
- 点击"权限管理" → "添加权限"
- 搜索并添加：`AliyunOSSFullAccess`

## 第五步：安装依赖

```bash
# 在项目根目录执行
npm install ali-oss
```

## 第六步：配置环境变量

创建 `.env.production.local` 文件：

```env
VITE_OSS_REGION=oss-cn-hangzhou
VITE_OSS_ACCESS_KEY_ID=你的AccessKey_ID
VITE_OSS_ACCESS_KEY_SECRET=你的AccessKey_Secret
VITE_OSS_BUCKET=你的Bucket名称
```

## 第七步：修改代码集成OSS

### 1. 修改知识库上传功能

需要修改 `/src/views/KnowledgeBase.vue` 中的上传逻辑：

```javascript
// 导入OSS工具
import { uploadToOSS } from '../utils/aliyunOSS'

// 修改uploadFile函数
async function uploadFile(file) {
  // 使用OSS上传
  const result = await uploadToOSS(
    file,
    currentUserId,
    (progress) => {
      uploadProgress.value = progress
    }
  )

  if (result.success) {
    // 保存到数据库
    await saveDocumentRecord(result.data)
  }
}
```

### 2. 修改文件访问逻辑

```javascript
// 获取文件URL时使用签名URL
import { getSignedUrl } from '../utils/aliyunOSS'

async function getDocumentUrl(fileName) {
  return await getSignedUrl(fileName)
}
```

## 第八步：测试

### 1. 本地测试
```bash
npm run build
npm run preview
```

### 2. 测试上传功能
- 上传小文件（< 10MB）
- 上传大文件（> 100MB）
- 检查进度条
- 验证文件可访问

## 第九步：成本优化建议

### 1. 配置生命周期规则
- 临时文件30天后自动删除
- 归档不常访问的文件

### 2. 开启传输加速（可选）
- 提升跨地域上传速度
- 按需开启，会增加成本

### 3. 配置流量包
- 购买资源包更优惠
- 建议先按量付费，观察使用量

## 常见问题

### Q1: 跨域错误
**解决**：检查Bucket跨域配置，确保包含你的域名

### Q2: 上传失败 403
**解决**：检查RAM用户权限，确保有上传权限

### Q3: 文件无法访问
**解决**：私有Bucket需要使用签名URL访问

### Q4: 上传速度慢
**解决**：
1. 选择离用户近的地域
2. 使用分片上传
3. 开启传输加速

## 安全建议

1. **不要在前端硬编码密钥**
   - 使用STS临时凭证
   - 或通过后端代理上传

2. **设置防盗链**
   - Bucket设置 → 防盗链
   - 配置Referer白名单

3. **定期轮换密钥**
   - 每3个月更换一次AccessKey

4. **监控异常流量**
   - 设置流量告警
   - 定期检查账单

## 下一步

完成OSS配置后，继续：
1. 配置CDN加速
2. 部署应用到生产环境
3. 配置域名和SSL