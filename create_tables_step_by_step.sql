-- Step 1: Create user_stats table
CREATE TABLE IF NOT EXISTS user_stats (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  study_days integer DEFAULT 0,
  continuous_days integer DEFAULT 0,
  total_study_minutes integer DEFAULT 0,
  weekly_study_minutes integer DEFAULT 0,
  daily_goals_completed integer DEFAULT 0,
  topics_explored integer DEFAULT 0,
  questions_asked integer DEFAULT 0,
  knowledge_shared integer DEFAULT 0,
  conversation_depth_score integer DEFAULT 0,
  weekly_growth_score integer DEFAULT 0,
  skills_unlocked integer DEFAULT 0,
  challenges_completed integer DEFAULT 0,
  last_week_score integer DEFAULT 0,
  last_active_date date DEFAULT CURRENT_DATE,
  updated_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id)
);

-- Step 2: Create daily_activities table
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

-- Step 3: Create indexes
CREATE INDEX IF NOT EXISTS idx_user_stats_study_days ON user_stats(study_days DESC);
CREATE INDEX IF NOT EXISTS idx_user_stats_weekly_minutes ON user_stats(weekly_study_minutes DESC);
CREATE INDEX IF NOT EXISTS idx_user_stats_topics ON user_stats(topics_explored DESC);
CREATE INDEX IF NOT EXISTS idx_user_stats_questions ON user_stats(questions_asked DESC);
CREATE INDEX IF NOT EXISTS idx_user_stats_weekly_growth ON user_stats(weekly_growth_score DESC);
CREATE INDEX IF NOT EXISTS idx_user_stats_continuous ON user_stats(continuous_days DESC);

-- Step 4: Enable RLS
ALTER TABLE user_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_activities ENABLE ROW LEVEL SECURITY;

-- Step 5: Create RLS policies for user_stats
CREATE POLICY "Users can view own stats" ON user_stats
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own stats" ON user_stats
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own stats" ON user_stats
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "All users can view leaderboard" ON user_stats
  FOR SELECT USING (true);

-- Step 6: Create RLS policies for daily_activities
CREATE POLICY "Users can view own activities" ON daily_activities
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own activities" ON daily_activities
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own activities" ON daily_activities
  FOR UPDATE USING (auth.uid() = user_id);