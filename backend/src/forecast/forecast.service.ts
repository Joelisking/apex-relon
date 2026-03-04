import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/database/prisma.service';
import { UpsertForecastTargetDto } from './dto/forecast.dto';

const MONTH_LABELS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

@Injectable()
export class ForecastService {
  constructor(private readonly prisma: PrismaService) {}

  /** Upsert a monthly revenue target */
  async upsertTarget(dto: UpsertForecastTargetDto) {
    return this.prisma.forecastTarget.upsert({
      where: { month_year: { month: dto.month, year: dto.year } },
      create: {
        month: dto.month,
        year: dto.year,
        targetAmount: dto.targetAmount,
        currency: dto.currency ?? 'USD',
      },
      update: {
        targetAmount: dto.targetAmount,
        currency: dto.currency ?? 'USD',
      },
    });
  }

  /** List all forecast targets ordered by year then month */
  async getTargets() {
    return this.prisma.forecastTarget.findMany({
      orderBy: [{ year: 'asc' }, { month: 'asc' }],
    });
  }

  /** Summary stats for the dashboard forecast panel */
  async getSummary() {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    // Load all pipeline stages with their close probabilities
    const stages = await this.prisma.pipelineStage.findMany({
      where: { pipelineType: 'prospective_project' },
      select: { name: true, probability: true },
    });
    const probMap = new Map(stages.map((s) => [s.name, s.probability]));

    // All active (non-closed) leads for weighted pipeline calculation
    const activeLeads = await this.prisma.lead.findMany({
      where: { stage: { notIn: ['Won', 'Lost'] } },
      select: { expectedValue: true, stage: true },
    });
    const weightedPipeline = activeLeads.reduce((sum, lead) => {
      const prob = probMap.get(lead.stage) ?? 0;
      return sum + (lead.expectedValue * prob) / 100;
    }, 0);

    // Revenue won so far this calendar month
    const monthStart = new Date(currentYear, currentMonth - 1, 1);
    const monthEnd = new Date(currentYear, currentMonth, 0, 23, 59, 59);
    const wonThisMonthAgg = await this.prisma.lead.aggregate({
      where: {
        stage: 'Won',
        dealClosedAt: { gte: monthStart, lte: monthEnd },
      },
      _sum: { contractedValue: true },
    });
    const wonThisMonthValue = wonThisMonthAgg._sum.contractedValue ?? 0;

    // This month's revenue target (if one has been set)
    const target = await this.prisma.forecastTarget.findUnique({
      where: { month_year: { month: currentMonth, year: currentYear } },
    });
    const thisMonthTarget = target?.targetAmount ?? 0;

    // Forecast accuracy: last month actual won vs last month target
    const lastMonthDate = new Date(currentYear, currentMonth - 2, 1);
    const lastMonth = lastMonthDate.getMonth() + 1;
    const lastYear = lastMonthDate.getFullYear();
    const lastMonthStart = new Date(lastYear, lastMonth - 1, 1);
    const lastMonthEnd = new Date(lastYear, lastMonth, 0, 23, 59, 59);

    const wonLastMonthAgg = await this.prisma.lead.aggregate({
      where: {
        stage: 'Won',
        dealClosedAt: { gte: lastMonthStart, lte: lastMonthEnd },
      },
      _sum: { contractedValue: true },
    });
    const wonLastMonthValue = wonLastMonthAgg._sum.contractedValue ?? 0;

    const lastMonthTarget = await this.prisma.forecastTarget.findUnique({
      where: { month_year: { month: lastMonth, year: lastYear } },
    });

    // Accuracy = (actual won last month) / (last month target) * 100 when a target exists,
    // otherwise fall back to comparing current won vs current weighted pipeline.
    let forecastAccuracy = 0;
    if (lastMonthTarget && lastMonthTarget.targetAmount > 0) {
      forecastAccuracy = Math.round(
        (wonLastMonthValue / lastMonthTarget.targetAmount) * 100,
      );
    } else if (weightedPipeline > 0 && wonThisMonthValue > 0) {
      forecastAccuracy = Math.round(
        (wonThisMonthValue / weightedPipeline) * 100,
      );
    }

    return {
      weightedPipeline: Math.round(weightedPipeline),
      thisMonthTarget,
      wonThisMonth: Math.round(wonThisMonthValue),
      forecastAccuracy,
    };
  }

  /** Monthly forecast data for a chart — returns `months` months starting from the current month */
  async getMonthlyForecast(months = 6) {
    const now = new Date();

    // Load stage probabilities once
    const stages = await this.prisma.pipelineStage.findMany({
      where: { pipelineType: 'prospective_project' },
      select: { name: true, probability: true },
    });
    const probMap = new Map(stages.map((s) => [s.name, s.probability]));

    // Pre-fetch all targets so we avoid N+1 queries
    const targets = await this.prisma.forecastTarget.findMany();
    const targetMap = new Map(
      targets.map((t) => [`${t.year}-${t.month}`, t.targetAmount]),
    );

    const result: {
      month: number;
      year: number;
      label: string;
      target: number;
      weighted: number;
      won: number;
    }[] = [];

    for (let i = 0; i < months; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const month = d.getMonth() + 1;
      const year = d.getFullYear();
      const monthStart = new Date(year, month - 1, 1);
      const monthEnd = new Date(year, month, 0, 23, 59, 59);
      const label = `${MONTH_LABELS[month - 1]} ${year}`;

      // Actual won revenue closed in this calendar month
      const wonAgg = await this.prisma.lead.aggregate({
        where: {
          stage: 'Won',
          dealClosedAt: { gte: monthStart, lte: monthEnd },
        },
        _sum: { contractedValue: true },
      });
      const won = wonAgg._sum.contractedValue ?? 0;

      // Weighted pipeline: leads whose likelyStartDate falls in this month.
      // For the current month (i === 0) also include leads with no likelyStartDate
      // so they don't vanish from the forecast.
      const isCurrentMonth = i === 0;
      const leadsForMonth = await this.prisma.lead.findMany({
        where: {
          stage: { notIn: ['Won', 'Lost'] },
          OR: [
            { likelyStartDate: { gte: monthStart, lte: monthEnd } },
            ...(isCurrentMonth ? [{ likelyStartDate: null }] : []),
          ],
        },
        select: { expectedValue: true, stage: true },
      });
      const weighted = leadsForMonth.reduce((sum, lead) => {
        const prob = probMap.get(lead.stage) ?? 0;
        return sum + (lead.expectedValue * prob) / 100;
      }, 0);

      const target = targetMap.get(`${year}-${month}`) ?? 0;

      result.push({
        month,
        year,
        label,
        target,
        weighted: Math.round(weighted),
        won: Math.round(won),
      });
    }

    return result;
  }
}
