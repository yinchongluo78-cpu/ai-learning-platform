-- 创建用户统计表
CREATE TABLE IF NOT EXISTS user_stats (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  -- 努力榜指标
  study_days integer DEFAULT 0,  -- 累计学习天数
  continuous_days integer DEFAULT 0,  -- 连续学习天数
  total_study_minutes integer DEFAULT 0,  -- 总学习时长(分钟)
  weekly_study_minutes integer DEFAULT 0,  -- 本周学习时长
  daily_goals_completed integer DEFAULT 0,  -- 完成的每日目标数

  -- 探索榜指标
  topics_explored integer DEFAULT 0,  -- 探索的主题数
  questions_asked integer DEFAULT 0,  -- 提问数量
  knowledge_shared integer DEFAULT 0,  -- 知识分享数(公开文档数)
  conversation_depth_score integer DEFAULT 0,  -- 对话深度得分

  -- 进步榜指标
  weekly_growth_score integer DEFAULT 0,  -- 本周进步分数
  skills_unlocked integer DEFAULT 0,  -- 解锁的技能数
  challenges_completed integer DEFAULT 0,  -- 完成的挑战数
  last_week_score integer DEFAULT 0,  -- 上周分数(用于计算进步)

  -- 更新时间
  last_active_date date DEFAULT CURRENT_DATE,
  updated_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(user_id)
);

-- 创建学习记录表(用于追踪每日活动)
CREATE TABLE IF NOT EXISTS daily_activities (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  activity_date date DEFAULT CURRENT_DATE,
  study_minutes integer DEFAULT 0,
  conversations_count integer DEFAULT 0,
  questions_count integer DEFAULT 0,
  documents_uploaded integer DEFAULT 0,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(user_id, activity_date)
);

-- 创建索引优化查询性能
CREATE INDEX IF NOT EXISTS idx_user_stats_study_days ON user_stats(study_days DESC);
CREATE INDEX IF NOT EXISTS idx_user_stats_weekly_minutes ON user_stats(weekly_study_minutes DESC);
CREATE INDEX IF NOT EXISTS idx_user_stats_topics ON user_stats(topics_explored DESC);
CREATE INDEX IF NOT EXISTS idx_user_stats_questions ON user_stats(questions_asked DESC);
CREATE INDEX IF NOT EXISTS idx_user_stats_weekly_growth ON user_stats(weekly_growth_score DESC);
CREATE INDEX IF NOT EXISTS idx_user_stats_continuous ON user_stats(continuous_days DESC);

-- 启用RLS
ALTER TABLE user_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_activities ENABLE ROW LEVEL SECURITY;

-- 创建RLS策略
-- 用户只能查看自己的统计数据
CREATE POLICY "Users can view own stats" ON user_stats
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own stats" ON user_stats
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own stats" ON user_stats
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 所有用户都可以查看排行榜(但只返回前10)
CREATE POLICY "All users can view leaderboard" ON user_stats
  FOR SELECT USING (true);

-- daily_activities的策略
CREATE POLICY "Users can view own activities" ON daily_activities
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own activities" ON daily_activities
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own activities" ON daily_activities
  FOR UPDATE USING (auth.uid() = user_id);