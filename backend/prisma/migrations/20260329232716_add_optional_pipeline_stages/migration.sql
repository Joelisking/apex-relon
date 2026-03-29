-- AlterTable
ALTER TABLE "pipeline_stages" ADD COLUMN     "isOptional" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "projects" ADD COLUMN     "activeOptionalStages" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- ─── Renumber general project stages to multiples of 10 ───────────────────────
UPDATE pipeline_stages SET "sortOrder" = 0   WHERE "pipelineType" = 'project' AND "serviceType" = '__all__' AND name = 'Job Setup';
UPDATE pipeline_stages SET "sortOrder" = 10  WHERE "pipelineType" = 'project' AND "serviceType" = '__all__' AND name = 'Mobilization';
UPDATE pipeline_stages SET "sortOrder" = 20  WHERE "pipelineType" = 'project' AND "serviceType" = '__all__' AND name = 'Field Work';
UPDATE pipeline_stages SET "sortOrder" = 30  WHERE "pipelineType" = 'project' AND "serviceType" = '__all__' AND name = 'Drafting';
UPDATE pipeline_stages SET "sortOrder" = 40  WHERE "pipelineType" = 'project' AND "serviceType" = '__all__' AND name = 'QC Review';
UPDATE pipeline_stages SET "sortOrder" = 50  WHERE "pipelineType" = 'project' AND "serviceType" = '__all__' AND name = 'Client Review';
UPDATE pipeline_stages SET "sortOrder" = 60  WHERE "pipelineType" = 'project' AND "serviceType" = '__all__' AND name = 'Needs Invoiced';
UPDATE pipeline_stages SET "sortOrder" = 70  WHERE "pipelineType" = 'project' AND "serviceType" = '__all__' AND name = 'Invoiced';
UPDATE pipeline_stages SET "sortOrder" = 80  WHERE "pipelineType" = 'project' AND "serviceType" = '__all__' AND name = 'Paid';
UPDATE pipeline_stages SET "sortOrder" = 90  WHERE "pipelineType" = 'project' AND "serviceType" = '__all__' AND name = 'Completed';
UPDATE pipeline_stages SET "sortOrder" = 100 WHERE "pipelineType" = 'project' AND "serviceType" = '__all__' AND name = 'On Hold';
UPDATE pipeline_stages SET "sortOrder" = 110 WHERE "pipelineType" = 'project' AND "serviceType" = '__all__' AND name = 'Cancelled';

-- ─── Add general "Revisions" stage (sortOrder 55, between Client Review and Needs Invoiced) ──
INSERT INTO pipeline_stages (id, name, "pipelineType", "serviceType", color, "lightColor", border, probability, "sortOrder", "isSystem", "isOptional", "createdAt", "updatedAt")
VALUES (gen_random_uuid(), 'Revisions', 'project', '__all__', 'bg-purple-500', 'bg-purple-50', 'border-purple-200', 93, 55, false, false, now(), now())
ON CONFLICT (name, "pipelineType", "serviceType") DO NOTHING;

-- ─── Type-specific stages ─────────────────────────────────────────────────────

-- ALTA/NSPS Survey
INSERT INTO pipeline_stages (id, name, "pipelineType", "serviceType", color, "lightColor", border, probability, "sortOrder", "isSystem", "isOptional", "createdAt", "updatedAt") VALUES
  (gen_random_uuid(), 'Resolution',       'project', 'ALTA/NSPS Survey', 'bg-blue-500',    'bg-blue-50',    'border-blue-200',    75, 25, false, false, now(), now()),
  (gen_random_uuid(), 'Set Monumentation','project', 'ALTA/NSPS Survey', 'bg-teal-500',    'bg-teal-50',    'border-teal-200',    95, 83, false, true,  now(), now()),
  (gen_random_uuid(), 'Recordation',      'project', 'ALTA/NSPS Survey', 'bg-emerald-500', 'bg-emerald-50', 'border-emerald-200', 97, 85, false, true,  now(), now())
ON CONFLICT (name, "pipelineType", "serviceType") DO NOTHING;

-- Boundary Survey
INSERT INTO pipeline_stages (id, name, "pipelineType", "serviceType", color, "lightColor", border, probability, "sortOrder", "isSystem", "isOptional", "createdAt", "updatedAt") VALUES
  (gen_random_uuid(), 'Resolution',       'project', 'Boundary Survey', 'bg-blue-500',    'bg-blue-50',    'border-blue-200',    75, 25, false, false, now(), now()),
  (gen_random_uuid(), 'Set Monumentation','project', 'Boundary Survey', 'bg-teal-500',    'bg-teal-50',    'border-teal-200',    95, 83, false, true,  now(), now()),
  (gen_random_uuid(), 'Recordation',      'project', 'Boundary Survey', 'bg-emerald-500', 'bg-emerald-50', 'border-emerald-200', 97, 85, false, true,  now(), now())
ON CONFLICT (name, "pipelineType", "serviceType") DO NOTHING;

-- Lot Survey
INSERT INTO pipeline_stages (id, name, "pipelineType", "serviceType", color, "lightColor", border, probability, "sortOrder", "isSystem", "isOptional", "createdAt", "updatedAt") VALUES
  (gen_random_uuid(), 'Resolution',       'project', 'Lot Survey', 'bg-blue-500',    'bg-blue-50',    'border-blue-200',    75, 25, false, false, now(), now()),
  (gen_random_uuid(), 'Set Monumentation','project', 'Lot Survey', 'bg-teal-500',    'bg-teal-50',    'border-teal-200',    95, 83, false, true,  now(), now()),
  (gen_random_uuid(), 'Recordation',      'project', 'Lot Survey', 'bg-emerald-500', 'bg-emerald-50', 'border-emerald-200', 97, 85, false, true,  now(), now())
ON CONFLICT (name, "pipelineType", "serviceType") DO NOTHING;

-- As-Built Survey
INSERT INTO pipeline_stages (id, name, "pipelineType", "serviceType", color, "lightColor", border, probability, "sortOrder", "isSystem", "isOptional", "createdAt", "updatedAt") VALUES
  (gen_random_uuid(), 'Resolution',       'project', 'As-Built Survey', 'bg-blue-500',    'bg-blue-50',    'border-blue-200',    75, 25, false, false, now(), now()),
  (gen_random_uuid(), 'Set Monumentation','project', 'As-Built Survey', 'bg-teal-500',    'bg-teal-50',    'border-teal-200',    95, 83, false, true,  now(), now()),
  (gen_random_uuid(), 'Recordation',      'project', 'As-Built Survey', 'bg-emerald-500', 'bg-emerald-50', 'border-emerald-200', 97, 85, false, true,  now(), now())
ON CONFLICT (name, "pipelineType", "serviceType") DO NOTHING;

-- LCRS
INSERT INTO pipeline_stages (id, name, "pipelineType", "serviceType", color, "lightColor", border, probability, "sortOrder", "isSystem", "isOptional", "createdAt", "updatedAt") VALUES
  (gen_random_uuid(), 'Resolution',       'project', 'LCRS', 'bg-blue-500',    'bg-blue-50',    'border-blue-200',    75, 25, false, false, now(), now()),
  (gen_random_uuid(), 'Set Monumentation','project', 'LCRS', 'bg-teal-500',    'bg-teal-50',    'border-teal-200',    95, 83, false, true,  now(), now()),
  (gen_random_uuid(), 'Recordation',      'project', 'LCRS', 'bg-emerald-500', 'bg-emerald-50', 'border-emerald-200', 97, 85, false, true,  now(), now())
ON CONFLICT (name, "pipelineType", "serviceType") DO NOTHING;

-- Subdivision Plat
INSERT INTO pipeline_stages (id, name, "pipelineType", "serviceType", color, "lightColor", border, probability, "sortOrder", "isSystem", "isOptional", "createdAt", "updatedAt") VALUES
  (gen_random_uuid(), 'Resolution',       'project', 'Subdivision Plat', 'bg-blue-500',    'bg-blue-50',    'border-blue-200',    75, 25, false, false, now(), now()),
  (gen_random_uuid(), 'Set Monumentation','project', 'Subdivision Plat', 'bg-teal-500',    'bg-teal-50',    'border-teal-200',    95, 83, false, true,  now(), now()),
  (gen_random_uuid(), 'Recordation',      'project', 'Subdivision Plat', 'bg-emerald-500', 'bg-emerald-50', 'border-emerald-200', 97, 85, false, true,  now(), now())
ON CONFLICT (name, "pipelineType", "serviceType") DO NOTHING;

-- Easement Preparation
INSERT INTO pipeline_stages (id, name, "pipelineType", "serviceType", color, "lightColor", border, probability, "sortOrder", "isSystem", "isOptional", "createdAt", "updatedAt") VALUES
  (gen_random_uuid(), 'Resolution', 'project', 'Easement Preparation', 'bg-blue-500',   'bg-blue-50',   'border-blue-200',   75, 25, false, false, now(), now()),
  (gen_random_uuid(), 'Staking',    'project', 'Easement Preparation', 'bg-orange-500', 'bg-orange-50', 'border-orange-200', 95, 83, false, true,  now(), now())
ON CONFLICT (name, "pipelineType", "serviceType") DO NOTHING;

-- Right-of-Way Engineering
INSERT INTO pipeline_stages (id, name, "pipelineType", "serviceType", color, "lightColor", border, probability, "sortOrder", "isSystem", "isOptional", "createdAt", "updatedAt") VALUES
  (gen_random_uuid(), 'R/W Resolution', 'project', 'Right-of-Way Engineering', 'bg-blue-500',   'bg-blue-50',   'border-blue-200',   75, 25, false, false, now(), now()),
  (gen_random_uuid(), 'Staking',        'project', 'Right-of-Way Engineering', 'bg-orange-500', 'bg-orange-50', 'border-orange-200', 95, 83, false, true,  now(), now())
ON CONFLICT (name, "pipelineType", "serviceType") DO NOTHING;

-- Construction Engineering
INSERT INTO pipeline_stages (id, name, "pipelineType", "serviceType", color, "lightColor", border, probability, "sortOrder", "isSystem", "isOptional", "createdAt", "updatedAt") VALUES
  (gen_random_uuid(), 'Calculations', 'project', 'Construction Engineering', 'bg-purple-500', 'bg-purple-50', 'border-purple-200', 60, 15, false, false, now(), now()),
  (gen_random_uuid(), 'Field Book',   'project', 'Construction Engineering', 'bg-orange-500', 'bg-orange-50', 'border-orange-200', 80, 35, false, false, now(), now())
ON CONFLICT (name, "pipelineType", "serviceType") DO NOTHING;
