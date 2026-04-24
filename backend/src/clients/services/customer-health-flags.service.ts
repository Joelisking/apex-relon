import { Injectable, Logger } from '@nestjs/common';
import { CustomerMetrics } from './customer-metrics.service';

export interface CustomerHealthFlag {
  type: 'NO_CONTACT' | 'DECLINING_ENGAGEMENT' | 'HIGH_VALUE_AT_RISK' | 'STRONG_RELATIONSHIP';
  severity: 'low' | 'medium' | 'high' | 'positive';
  message: string;
  icon: string;
}

@Injectable()
export class CustomerHealthFlagsService {
  private readonly logger = new Logger(CustomerHealthFlagsService.name);
  detectHealthFlags(metrics: CustomerMetrics, lifetimeRevenue?: number): CustomerHealthFlag[] {
    const flags: CustomerHealthFlag[] = [];

    if (metrics.daysSinceLastContact >= 60) {
      flags.push({
        type: 'NO_CONTACT',
        severity: metrics.daysSinceLastContact >= 120 ? 'high' : 'medium',
        message: `No contact in ${metrics.daysSinceLastContact} days`,
        icon: '🚩',
      });
    }

    const avgActivityPerMonth =
      metrics.totalActivityCount / Math.max(1, metrics.daysSinceLastContact / 30);
    if (
      metrics.totalActivityCount >= 10 &&
      metrics.recentActivityCount < avgActivityPerMonth * 0.5 &&
      metrics.daysSinceLastContact >= 30
    ) {
      flags.push({
        type: 'DECLINING_ENGAGEMENT',
        severity: 'medium',
        message: 'Engagement declining — recent activity below historical average',
        icon: '📉',
      });
    }

    if (
      lifetimeRevenue &&
      lifetimeRevenue >= 100000 &&
      (metrics.engagementScore < 40 || metrics.activeProjectCount === 0)
    ) {
      flags.push({
        type: 'HIGH_VALUE_AT_RISK',
        severity: 'high',
        message: `High-value customer ($${lifetimeRevenue.toLocaleString()}) with low engagement`,
        icon: '💰',
      });
    }

    if (metrics.engagementScore >= 75) {
      flags.push({
        type: 'STRONG_RELATIONSHIP',
        severity: 'positive',
        message: 'Strong relationship — high engagement and active projects',
        icon: '⭐',
      });
    }

    return flags;
  }

  generateSuggestedActions(flags: CustomerHealthFlag[], metrics: CustomerMetrics): string[] {
    const actions: string[] = [];

    if (flags.some((f) => f.type === 'NO_CONTACT')) {
      actions.push('📞 Schedule a check-in call immediately');
      actions.push('📧 Send a relationship-building email');
      actions.push('🎯 Review account status with team');
    }

    if (flags.some((f) => f.type === 'DECLINING_ENGAGEMENT')) {
      actions.push('📊 Analyze recent interaction patterns');
      actions.push('🤝 Schedule quarterly business review');
      actions.push('💡 Propose new project or service');
    }

    if (flags.some((f) => f.type === 'HIGH_VALUE_AT_RISK')) {
      actions.push('🚨 Escalate to senior management');
      actions.push('👔 Schedule executive-level meeting');
      actions.push('🎁 Consider value-add initiative or discount');
    }

    if (flags.some((f) => f.type === 'STRONG_RELATIONSHIP')) {
      actions.push('🎯 Explore upsell opportunities');
      actions.push('🌟 Request referrals or testimonial');
      actions.push('📈 Discuss expansion possibilities');
    }

    if (actions.length === 0 && metrics.activeProjectCount === 0) {
      actions.push('💼 Identify new project opportunities');
      actions.push('📅 Schedule catch-up meeting');
    }

    if (actions.length === 0 && metrics.recentActivityCount === 0) {
      actions.push('📝 Log recent interactions');
      actions.push('🔄 Re-engage with customer');
    }

    return actions;
  }

  determineHealthStatus(
    engagementScore: number,
    activeProjectCount: number,
    createdAt?: Date,
  ): string {
    if (createdAt) {
      const daysSinceCreated = Math.floor(
        (Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24),
      );
      if (daysSinceCreated <= 30 && activeProjectCount === 0) return 'New';
    }

    if (engagementScore >= 60 || activeProjectCount > 0) return 'Active';
    if (engagementScore < 40) return 'At Risk';
    return 'Dormant';
  }
}
