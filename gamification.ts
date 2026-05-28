/**
 * User statistics for household conservation gamification.
 */
export interface UserStats {
  /**
   * Earned badge identifiers or names.
   */
  badges: string[];

  /**
   * Current consecutive daily usage streak.
   */
  streakDays: number;

  /**
   * Total conservation score accumulated by the user.
   */
  conservationScore: number;
}

export interface LeaderboardEntry {
  name: string;
  stats: UserStats;
}

export class GamificationService {
  /**
   * Award a badge based on conservation milestones.
   *
   * Badge criteria are checked against the user's current conservation score and streak.
   * Example milestones:
   * - 100 points: Eco Starter
   * - 500 points: Water Saver
   * - 1000 points: Conservation Champion
   * - 7-day streak: Weekly Warrior
   */
  awardBadge(userStats: UserStats): string | null {
    const milestoneBadges = [
      { threshold: 1000, badge: 'Conservation Champion' },
      { threshold: 500, badge: 'Water Saver' },
      { threshold: 100, badge: 'Eco Starter' },
    ];

    for (const milestone of milestoneBadges) {
      if (userStats.conservationScore >= milestone.threshold && !userStats.badges.includes(milestone.badge)) {
        userStats.badges.push(milestone.badge);
        return milestone.badge;
      }
    }

    if (userStats.streakDays >= 7 && !userStats.badges.includes('Weekly Warrior')) {
      userStats.badges.push('Weekly Warrior');
      return 'Weekly Warrior';
    }

    return null;
  }

  /**
   * Increment the user's daily streak count.
   *
   * If the user returns exactly one day after the last recorded usage,
   * the streak is continued. If more than one day has passed, the streak resets.
   * Same-day usage does not increment the streak again.
   */
  incrementStreak(userStats: UserStats, lastUsedDate: Date, currentDate: Date = new Date()): UserStats {
    const previous = new Date(lastUsedDate);
    const today = new Date(currentDate);

    // Normalize dates to midnight to compare day boundaries only.
    previous.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);

    const msPerDay = 1000 * 60 * 60 * 24;
    const dayDifference = Math.round((today.getTime() - previous.getTime()) / msPerDay);

    if (dayDifference === 1) {
      userStats.streakDays += 1;
    } else if (dayDifference > 1) {
      userStats.streakDays = 1;
    }

    return userStats;
  }

  /**
   * Sort household users by conservation score for leaderboard display.
   */
  getHouseholdLeaderboard(entries: LeaderboardEntry[]): LeaderboardEntry[] {
    return [...entries].sort((a, b) => b.stats.conservationScore - a.stats.conservationScore);
  }
}
