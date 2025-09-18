# 查看OSS上传的文件

## 方法1：阿里云控制台（最直观）

1. **登录OSS控制台**
   - 访问：https://oss.console.aliyun.com/

2. **进入你的Bucket**
   - 点击 `smartyouth-docs-luoyinchong`

3. **查看文件**
   - 点击"文件管理"
   - 你会看到 `documents/` 文件夹
   - 点击进入查看上传的文件
   - 文件按照这个格式组织：`documents/用户ID/时间戳_随机码.扩展名`

## 方法2：测试页面查看URL

在测试页面上传成功后，会显示：
- **OSS路径**：例如 `documents/test_user_xxx/1234567_abc.txt`
- **访问URL**：完整的文件访问地址

## 方法3：使用OSS Browser（桌面工具）

1. **下载OSS Browser**
   - 官方下载：https://github.com/aliyun/oss-browser

2. **登录**
   - AccessKey ID: LTAI5tL4kAoHktpX8wxSm7yb
   - AccessKey Secret: 你的密钥
   - 区域：深圳

3. **浏览文件**
   - 可以下载、预览、管理文件

## 文件组织结构

```
smartyouth-docs-luoyinchong/
├── documents/
│   ├── test_user_1234567890/
│   │   ├── 1234567_abc.txt
│   │   └── 1234568_def.pdf
│   └── user_actual_id/
│       └── uploaded_files...
└── test/
    └── test_files...
```

## 注意事项

1. **文件是私有的**
   - 直接访问URL会报403错误
   - 这是正常的，因为我们设置了私有权限
   - 需要通过签名URL访问

2. **文件会实际占用存储**
   - 记得定期清理测试文件
   - 在控制台可以批量删除

3. **查看存储使用量**
   - 在Bucket概览页面
   - 可以看到已使用的存储空间
   - 可以看到本月的流量使用

## 当前状态

✅ **OSS上传功能正常**
- 测试页面的文件会上传到OSS
- 文件实际存储在阿里云服务器

⚠️ **知识库集成待完善**
- 知识库目前还是把文本内容存在Supabase数据库
- 可以改进为：
  - 原始文件存OSS
  - 文本内容和向量存数据库
  - 这样可以支持大文件

## 验证方法

最简单的验证：
1. 上传一个文件
2. 登录OSS控制台
3. 在文件管理中查看是否出现新文件
4. 文件大小应该与上传的一致