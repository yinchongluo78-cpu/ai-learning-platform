-- First, create the tables only (without indexes and policies)
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