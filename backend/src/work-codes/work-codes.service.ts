import { Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { UpdateWorkCodeDto } from './dto/update-work-code.dto';

interface SeedCode {
  code: number;
  name: string;
  division: number;
  parentCode?: number;
  isMainTask: boolean;
  sortOrder: number;
}

// ─── Seed Data ────────────────────────────────────────────────────────────────

const WORK_CODES: SeedCode[] = [
  // 5000 – Engineering Services
  { code: 5100, name: 'Project Management',            division: 5000, isMainTask: true,  sortOrder: 0 },
  { code: 5101, name: 'Internal Coordination',         division: 5000, parentCode: 5100, isMainTask: false, sortOrder: 1 },
  { code: 5102, name: 'Client Coordination',           division: 5000, parentCode: 5100, isMainTask: false, sortOrder: 2 },
  { code: 5103, name: 'Project Meetings',              division: 5000, parentCode: 5100, isMainTask: false, sortOrder: 3 },
  { code: 5104, name: 'Schedule & Budget Control',     division: 5000, parentCode: 5100, isMainTask: false, sortOrder: 4 },
  { code: 5105, name: 'Subconsultant Coordination',    division: 5000, parentCode: 5100, isMainTask: false, sortOrder: 5 },

  { code: 5200, name: 'Engineering Design',            division: 5000, isMainTask: true,  sortOrder: 10 },
  { code: 5201, name: 'Record Research',               division: 5000, parentCode: 5200, isMainTask: false, sortOrder: 11 },
  { code: 5202, name: 'Site Visits',                   division: 5000, parentCode: 5200, isMainTask: false, sortOrder: 12 },
  { code: 5203, name: 'Base Mapping',                  division: 5000, parentCode: 5200, isMainTask: false, sortOrder: 13 },
  { code: 5204, name: 'Conceptual Layouts',            division: 5000, parentCode: 5200, isMainTask: false, sortOrder: 14 },
  { code: 5205, name: 'Roadway Design',                division: 5000, parentCode: 5200, isMainTask: false, sortOrder: 15 },
  { code: 5206, name: 'Bridge Design',                 division: 5000, parentCode: 5200, isMainTask: false, sortOrder: 16 },
  { code: 5207, name: 'MOT Design',                    division: 5000, parentCode: 5200, isMainTask: false, sortOrder: 17 },
  { code: 5208, name: 'Site Design',                   division: 5000, parentCode: 5200, isMainTask: false, sortOrder: 18 },
  { code: 5209, name: 'Stormwater Design',             division: 5000, parentCode: 5200, isMainTask: false, sortOrder: 19 },
  { code: 5210, name: 'Water Design',                  division: 5000, parentCode: 5200, isMainTask: false, sortOrder: 20 },
  { code: 5211, name: 'Sanitary Sewer Design',         division: 5000, parentCode: 5200, isMainTask: false, sortOrder: 21 },
  { code: 5212, name: 'Grading & Drainage Design',     division: 5000, parentCode: 5200, isMainTask: false, sortOrder: 22 },
  { code: 5213, name: 'Erosion Control (SWPPP)',        division: 5000, parentCode: 5200, isMainTask: false, sortOrder: 23 },
  { code: 5214, name: 'Specifications',                division: 5000, parentCode: 5200, isMainTask: false, sortOrder: 24 },
  { code: 5215, name: 'QTO & Estimates',               division: 5000, parentCode: 5200, isMainTask: false, sortOrder: 25 },
  { code: 5216, name: 'QA/QC Reviews',                 division: 5000, parentCode: 5200, isMainTask: false, sortOrder: 26 },

  { code: 5300, name: 'Plan Production',               division: 5000, isMainTask: true,  sortOrder: 30 },
  { code: 5301, name: '30% Plans',                     division: 5000, parentCode: 5300, isMainTask: false, sortOrder: 31 },
  { code: 5302, name: '50% Plans',                     division: 5000, parentCode: 5300, isMainTask: false, sortOrder: 32 },
  { code: 5303, name: '60% Plans',                     division: 5000, parentCode: 5300, isMainTask: false, sortOrder: 33 },
  { code: 5304, name: '75% Plans',                     division: 5000, parentCode: 5300, isMainTask: false, sortOrder: 34 },
  { code: 5305, name: '90% Plans',                     division: 5000, parentCode: 5300, isMainTask: false, sortOrder: 35 },
  { code: 5306, name: '100% Plans',                    division: 5000, parentCode: 5300, isMainTask: false, sortOrder: 36 },
  { code: 5307, name: 'Preliminary Site Plans',        division: 5000, parentCode: 5300, isMainTask: false, sortOrder: 37 },
  { code: 5308, name: 'Final Site Plans',              division: 5000, parentCode: 5300, isMainTask: false, sortOrder: 38 },

  { code: 5400, name: 'Utility Coordination',          division: 5000, isMainTask: true,  sortOrder: 40 },
  { code: 5401, name: 'Initial Contact',               division: 5000, parentCode: 5400, isMainTask: false, sortOrder: 41 },
  { code: 5402, name: 'Verification',                  division: 5000, parentCode: 5400, isMainTask: false, sortOrder: 42 },
  { code: 5403, name: 'Conflict Analysis/Resolution',  division: 5000, parentCode: 5400, isMainTask: false, sortOrder: 43 },
  { code: 5404, name: 'Utility Work Plans',            division: 5000, parentCode: 5400, isMainTask: false, sortOrder: 44 },

  { code: 5500, name: 'Permitting',                    division: 5000, isMainTask: true,  sortOrder: 50 },
  { code: 5501, name: 'Permit Applications',           division: 5000, parentCode: 5500, isMainTask: false, sortOrder: 51 },
  { code: 5502, name: 'Agency Meetings',               division: 5000, parentCode: 5500, isMainTask: false, sortOrder: 52 },
  { code: 5503, name: 'Responses to Reviews',          division: 5000, parentCode: 5500, isMainTask: false, sortOrder: 53 },
  { code: 5504, name: 'Final Submittal',               division: 5000, parentCode: 5500, isMainTask: false, sortOrder: 54 },

  { code: 5600, name: 'Bidding Phase Services',        division: 5000, isMainTask: true,  sortOrder: 60 },
  { code: 5601, name: 'Pre-Bid Meeting',               division: 5000, parentCode: 5600, isMainTask: false, sortOrder: 61 },
  { code: 5602, name: 'Bid Documents',                 division: 5000, parentCode: 5600, isMainTask: false, sortOrder: 62 },
  { code: 5603, name: 'Addendas & Revisions',          division: 5000, parentCode: 5600, isMainTask: false, sortOrder: 63 },
  { code: 5604, name: 'Bid Review',                    division: 5000, parentCode: 5600, isMainTask: false, sortOrder: 64 },
  { code: 5605, name: 'Recommendation of Award',       division: 5000, parentCode: 5600, isMainTask: false, sortOrder: 65 },

  { code: 5700, name: 'Construction Phase Services',   division: 5000, isMainTask: true,  sortOrder: 70 },
  { code: 5701, name: 'Pre-Construction Meeting',      division: 5000, parentCode: 5700, isMainTask: false, sortOrder: 71 },
  { code: 5702, name: "Shop Drawing/RFI's",            division: 5000, parentCode: 5700, isMainTask: false, sortOrder: 72 },
  { code: 5703, name: 'On-Site Meetings',              division: 5000, parentCode: 5700, isMainTask: false, sortOrder: 73 },
  { code: 5704, name: 'Pay Applications',              division: 5000, parentCode: 5700, isMainTask: false, sortOrder: 74 },
  { code: 5705, name: 'Change Orders',                 division: 5000, parentCode: 5700, isMainTask: false, sortOrder: 75 },
  { code: 5706, name: 'Project Closeout',              division: 5000, parentCode: 5700, isMainTask: false, sortOrder: 76 },

  { code: 5800, name: 'Traffic Impact Study',          division: 5000, isMainTask: true,  sortOrder: 80 },
  { code: 5801, name: 'Admin/Meetings',                division: 5000, parentCode: 5800, isMainTask: false, sortOrder: 81 },
  { code: 5802, name: 'Data Collection',               division: 5000, parentCode: 5800, isMainTask: false, sortOrder: 82 },
  { code: 5803, name: 'Traffic Counts',                division: 5000, parentCode: 5800, isMainTask: false, sortOrder: 83 },
  { code: 5804, name: 'Existing Traffic Analysis',     division: 5000, parentCode: 5800, isMainTask: false, sortOrder: 84 },
  { code: 5805, name: 'Proposed Traffic Analysis',     division: 5000, parentCode: 5800, isMainTask: false, sortOrder: 85 },
  { code: 5806, name: 'Preliminary Traffic Report',    division: 5000, parentCode: 5800, isMainTask: false, sortOrder: 86 },
  { code: 5807, name: 'Revisions Per Agency Review',   division: 5000, parentCode: 5800, isMainTask: false, sortOrder: 87 },
  { code: 5808, name: 'Final Report Submittal',        division: 5000, parentCode: 5800, isMainTask: false, sortOrder: 88 },

  { code: 5900, name: 'Machine Control Modeling',      division: 5000, isMainTask: true,  sortOrder: 90 },
  { code: 5901, name: 'Modeling',                      division: 5000, parentCode: 5900, isMainTask: false, sortOrder: 91 },
  { code: 5902, name: 'QA/QC Reviews',                 division: 5000, parentCode: 5900, isMainTask: false, sortOrder: 92 },
  { code: 5903, name: 'File Creation/Deliverables',    division: 5000, parentCode: 5900, isMainTask: false, sortOrder: 93 },

  // 6000 – Stormwater Inspections (flat — no subtasks)
  { code: 6100, name: 'SWPPP Inspections',                          division: 6000, isMainTask: true, sortOrder: 0 },
  { code: 6200, name: 'Stormwater Pollution Prevention Plan',       division: 6000, isMainTask: true, sortOrder: 1 },
  { code: 6300, name: 'Stormwater Quality Control Plan',            division: 6000, isMainTask: true, sortOrder: 2 },
  { code: 6400, name: 'Bat Inspections',                            division: 6000, isMainTask: true, sortOrder: 3 },
  { code: 6500, name: 'Submissions/Pictures',                       division: 6000, isMainTask: true, sortOrder: 4 },
  { code: 6600, name: 'Admin - Invoicing/Coordination',             division: 6000, isMainTask: true, sortOrder: 5 },

  // 7000 – Construction Inspection
  { code: 7100, name: 'Municipal Inspections',   division: 7000, isMainTask: true,  sortOrder: 0 },
  { code: 7101, name: 'Admin',                   division: 7000, parentCode: 7100, isMainTask: false, sortOrder: 1 },
  { code: 7102, name: 'Pre-Construction',        division: 7000, parentCode: 7100, isMainTask: false, sortOrder: 2 },
  { code: 7103, name: 'Field Inspections',       division: 7000, parentCode: 7100, isMainTask: false, sortOrder: 3 },
  { code: 7104, name: 'Project Closeout',        division: 7000, parentCode: 7100, isMainTask: false, sortOrder: 4 },

  { code: 7200, name: 'LPA Inspections',         division: 7000, isMainTask: true,  sortOrder: 10 },
  // Note: 7200 is intentionally reused as the Admin subtask per the source spreadsheet
  { code: 7201, name: 'Pre-Construction',        division: 7000, parentCode: 7200, isMainTask: false, sortOrder: 12 },
  { code: 7202, name: 'Field Inspections',       division: 7000, parentCode: 7200, isMainTask: false, sortOrder: 13 },
  { code: 7203, name: 'Project Closeout',        division: 7000, parentCode: 7200, isMainTask: false, sortOrder: 14 },

  { code: 7300, name: 'INDOT Inspections',       division: 7000, isMainTask: true,  sortOrder: 20 },
  { code: 7301, name: 'Admin',                   division: 7000, parentCode: 7300, isMainTask: false, sortOrder: 21 },
  { code: 7302, name: 'Pre-Construction',        division: 7000, parentCode: 7300, isMainTask: false, sortOrder: 22 },
  { code: 7303, name: 'Field Inspections',       division: 7000, parentCode: 7300, isMainTask: false, sortOrder: 23 },
  { code: 7304, name: 'Project Closeout',        division: 7000, parentCode: 7300, isMainTask: false, sortOrder: 24 },
];

@Injectable()
export class WorkCodesService implements OnModuleInit {
  private readonly logger = new Logger(WorkCodesService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    await this.seedWorkCodes();
  }

  private async seedWorkCodes() {
    for (const wc of WORK_CODES) {
      await this.prisma.workCode.upsert({
        where: { code: wc.code },
        update: {},
        create: {
          code: wc.code,
          name: wc.name,
          division: wc.division,
          parentCode: wc.parentCode ?? null,
          isMainTask: wc.isMainTask,
          isActive: true,
          sortOrder: wc.sortOrder,
        },
      });
    }

    this.logger.log(`Work codes seeded: ${WORK_CODES.length} entries`);
  }

  async findAll(division?: number) {
    return this.prisma.workCode.findMany({
      where: {
        ...(division ? { division } : {}),
        isActive: true,
      },
      orderBy: [{ division: 'asc' }, { sortOrder: 'asc' }],
    });
  }

  async findAllForAdmin(division?: number) {
    return this.prisma.workCode.findMany({
      where: division ? { division } : undefined,
      orderBy: [{ division: 'asc' }, { sortOrder: 'asc' }],
    });
  }

  async findOne(id: string) {
    const wc = await this.prisma.workCode.findUnique({ where: { id } });
    if (!wc) throw new NotFoundException(`Work code ${id} not found`);
    return wc;
  }

  async update(id: string, dto: UpdateWorkCodeDto) {
    await this.findOne(id);
    return this.prisma.workCode.update({
      where: { id },
      data: dto,
    });
  }
}
