import { supabase } from '../lib/supabase.js'

// 更新用户统计数据
export async function updateUserStats(userId, updates) {
  try {
    // 先检查是否已存在统计记录
    const { data: existing } = await supabase
      .from('user_stats')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (existing) {
      // 更新现有记录
      const { error } = await supabase
        .from('user_stats')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)

      if (error) throw error
    } else {
      // 创建新记录
      const { error } = await supabase
        .from('user_stats')
        .insert({
          user_id: userId,
          ...updates
        })

      if (error) throw error
    }
  } catch (error) {
    console.error('更新用户统计失败:', error)
  }
}

// 记录每日活动
export async function recordDailyActivity(userId, activity) {
  try {
    const today = new Date().toISOString().split('T')[0]

    // 检查今日是否已有记录
    const { data: existing } = await supabase
      .from('daily_activities')
      .select('*')
      .eq('user_id', userId)
      .eq('activity_date', today)
      .single()

    if (existing) {
      // 更新今日活动
      const updates = {}
      if (activity.study_minutes) {
        updates.study_minutes = (existing.study_minutes || 0) + activity.study_minutes
      }
      if (activity.conversations_count) {
        updates.conversations_count = (existing.conversations_count || 0) + activity.conversations_count
      }
      if (activity.questions_count) {
        updates.questions_count = (existing.questions_count || 0) + activity.questions_count
      }
      if (activity.documents_uploaded) {
        updates.documents_uploaded = (existing.documents_uploaded || 0) + activity.documents_uploaded
      }

      const { error } = await supabase
        .from('daily_activities')
        .update(updates)
        .eq('user_id', userId)
        .eq('activity_date', today)

      if (error) throw error
    } else {
      // 创建新的每日记录
      const { error } = await supabase
        .from('daily_activities')
        .insert({
          user_id: userId,
          activity_date: today,
          ...activity
        })

      if (error) throw error
    }
  } catch (error) {
    console.error('记录每日活动失败:', error)
  }
}

// 增加学习时长
export async function incrementStudyTime(userId, minutes) {
  try {
    const { data: stats } = await supabase
      .from('user_stats')
      .select('total_study_minutes, weekly_study_minutes')
      .eq('user_id', userId)
      .single()

    const updates = {
      total_study_minutes: (stats?.total_study_minutes || 0) + minutes,
      weekly_study_minutes: (stats?.weekly_study_minutes || 0) + minutes
    }

    await updateUserStats(userId, updates)
    await recordDailyActivity(userId, { study_minutes: minutes })
  } catch (error) {
    console.error('增加学习时长失败:', error)
  }
}

// 增加对话次数
export async function incrementConversations(userId) {
  try {
    await recordDailyActivity(userId, { conversations_count: 1 })
  } catch (error) {
    console.error('增加对话次数失败:', error)
  }
}

// 增加提问数
export async function incrementQuestions(userId) {
  try {
    const { data: stats } = await supabase
      .from('user_stats')
      .select('questions_asked')
      .eq('user_id', userId)
      .single()

    await updateUserStats(userId, {
      questions_asked: (stats?.questions_asked || 0) + 1
    })
    await recordDailyActivity(userId, { questions_count: 1 })
  } catch (error) {
    console.error('增加提问数失败:', error)
  }
}

// 增加探索主题数
export async function incrementTopicsExplored(userId) {
  try {
    const { data: stats } = await supabase
      .from('user_stats')
      .select('topics_explored')
      .eq('user_id', userId)
      .single()

    await updateUserStats(userId, {
      topics_explored: (stats?.topics_explored || 0) + 1
    })
  } catch (error) {
    console.error('增加探索主题失败:', error)
  }
}

// 更新连续学习天数
export async function updateContinuousDays(userId) {
  try {
    const { data: stats } = await supabase
      .from('user_stats')
      .select('last_active_date, continuous_days, study_days')
      .eq('user_id', userId)
      .single()

    const today = new Date().toISOString().split('T')[0]
    const lastActive = stats?.last_active_date

    let continuousDays = stats?.continuous_days || 0
    let studyDays = stats?.study_days || 0

    if (lastActive) {
      const lastDate = new Date(lastActive)
      const todayDate = new Date(today)
      const diffDays = Math.floor((todayDate - lastDate) / (1000 * 60 * 60 * 24))

      if (diffDays === 0) {
        // 同一天，不更新
        return
      } else if (diffDays === 1) {
        // 连续学习
        continuousDays += 1
        studyDays += 1
      } else {
        // 中断了，重置连续天数
        continuousDays = 1
        studyDays += 1
      }
    } else {
      // 第一次学习
      continuousDays = 1
      studyDays = 1
    }

    await updateUserStats(userId, {
      continuous_days: continuousDays,
      study_days: studyDays,
      last_active_date: today
    })
  } catch (error) {
    console.error('更新连续学习天数失败:', error)
  }
}

// 计算并更新周进步分数
export async function updateWeeklyProgress(userId) {
  try {
    const { data: stats } = await supabase
      .from('user_stats')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (!stats) return

    // 简单的进步分数计算
    const currentScore =
      (stats.weekly_study_minutes || 0) * 0.1 +
      (stats.questions_asked || 0) * 5 +
      (stats.topics_explored || 0) * 10 +
      (stats.continuous_days || 0) * 20

    const growthScore = Math.max(0, currentScore - (stats.last_week_score || 0))

    await updateUserStats(userId, {
      weekly_growth_score: Math.round(growthScore)
    })
  } catch (error) {
    console.error('更新周进步分数失败:', error)
  }
}

// 每周重置（可以通过定时任务调用）
export async function weeklyReset() {
  try {
    // 获取所有用户的统计
    const { data: allStats } = await supabase
      .from('user_stats')
      .select('*')

    if (!allStats) return

    // 批量更新
    for (const stats of allStats) {
      const currentScore =
        (stats.weekly_study_minutes || 0) * 0.1 +
        (stats.questions_asked || 0) * 5 +
        (stats.topics_explored || 0) * 10 +
        (stats.continuous_days || 0) * 20

      await supabase
        .from('user_stats')
        .update({
          weekly_study_minutes: 0,
          last_week_score: currentScore,
          weekly_growth_score: 0,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', stats.user_id)
    }
  } catch (error) {
    console.error('周重置失败:', error)
  }
}