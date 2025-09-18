-- 修复用户注册的行级安全策略问题
-- 允许新用户注册时插入数据

-- 删除原来的策略
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Users can view own conversations" ON conversations;
DROP POLICY IF EXISTS "Users can insert own conversations" ON conversations;
DROP POLICY IF EXISTS "Users can view own files" ON files;
DROP POLICY IF EXISTS "Users can insert own files" ON files;
DROP POLICY IF EXISTS "Users can view own learning records" ON learning_records;
DROP POLICY IF EXISTS "Users can insert own learning records" ON learning_records;

-- 重新创建更宽松的策略，允许注册
-- 1. 用户表策略
CREATE POLICY "Enable insert for authentication users only" ON users FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can view own profile" ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (auth.uid() = id);

-- 2. 对话表策略
CREATE POLICY "Users can view own conversations" ON conversations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own conversations" ON conversations FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 3. 文件表策略
CREATE POLICY "Users can view own files" ON files FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own files" ON files FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 4. 学习记录表策略
CREATE POLICY "Users can view own learning records" ON learning_records FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own learning records" ON learning_records FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 5. 文件切片表策略
CREATE POLICY "Users can view related file chunks" ON file_chunks FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM files
    WHERE files.id = file_chunks.file_id
    AND files.user_id = auth.uid()
  )
);