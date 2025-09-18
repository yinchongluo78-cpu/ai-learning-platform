# 第二步：配置阿里云OSS

## 准备工作确认
在开始前，请确认已完成：
- ✅ 阿里云账号注册
- ✅ 实名认证通过
- ✅ OSS服务已开通

## 1. 创建Bucket

### 进入OSS管理控制台
访问：https://oss.console.aliyun.com/

### 点击"创建Bucket"

### 填写Bucket信息

#### 基础配置
```
Bucket名称：smartyouth-docs-[你的名字拼音]
示例：smartyouth-docs-zhangsan
（注：Bucket名称全局唯一，加上你的名字避免重复）

地域：华东1（杭州）
（选择离你最近的地域，华东、华北都可以）

存储类型：标准存储
```

#### 权限配置
```
读写权限：私有
（重要：保护用户隐私）

版本控制：关闭
加密方式：无
实时日志查询：关闭
```

点击"确定"创建Bucket

## 2. 配置跨域访问（CORS）

### 进入Bucket管理页面
点击刚创建的Bucket名称

### 找到"权限管理" → "跨域设置"

### 点击"创建规则"

填写以下信息：
```
来源：
*
（上线后改为具体域名）

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
x-oss-version-id

缓存时间（秒）：600

是否允许携带凭证：是
```

点击"确定"保存

## 3. 创建RAM访问用户

### 进入RAM控制台
访问：https://ram.console.aliyun.com/

### 创建用户

1. 点击左侧"用户"
2. 点击"创建用户"
3. 填写信息：
```
登录名称：smartyouth-oss-user
显示名称：智能少年OSS访问用户
访问方式：✅ 编程访问
```
4. 点击"确定"

### ⚠️ 重要：保存密钥

创建成功后会显示：
- **AccessKey ID**：类似 LTAI5t...
- **AccessKey Secret**：类似 K7XQP8...

**立即复制保存到安全的地方！Secret只显示一次！**

建议保存格式：
```
# 阿里云OSS密钥（请妥善保管）
AccessKey ID: LTAI5t...
AccessKey Secret: K7XQP8...
Bucket名称: smartyouth-docs-xxx
地域: oss-cn-hangzhou
```

### 4. 给用户授权

1. 在用户列表找到刚创建的用户
2. 点击用户名进入详情
3. 点击"权限管理"标签
4. 点击"添加权限"
5. 搜索并选择：`AliyunOSSFullAccess`
6. 点击"确定"

## 5. 验证配置

### 测试上传（可选）
1. 返回OSS控制台
2. 进入你的Bucket
3. 点击"文件管理"
4. 点击"上传文件"
5. 上传一个测试文件
6. 如果成功，说明配置正确

## ✅ 配置检查清单

确保已完成：
- [ ] Bucket创建成功
- [ ] CORS规则配置
- [ ] RAM用户创建
- [ ] AccessKey已保存
- [ ] 用户权限已授予

## 📝 收集的信息

请将以下信息整理好（稍后需要）：
```
Bucket名称: _____________
地域: oss-cn-_____________
AccessKey ID: _____________
AccessKey Secret: _____________
```

## ⚠️ 安全提醒

1. **永远不要**把AccessKey Secret分享给他人
2. **永远不要**把密钥提交到Git
3. **建议**定期更换密钥（每3个月）

## 下一步

完成OSS配置后，我们将：
1. 在项目中安装OSS SDK
2. 修改代码集成OSS上传
3. 测试文件上传功能

---

**完成后告诉我"OSS配置完成"，并提供你的Bucket名称和地域，我会帮你修改代码！**