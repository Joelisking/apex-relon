
export const DEFAULT_PIPELINE_STAGES = [
  {
    id: '',
    name: 'New',
    color: 'bg-gray-500',
    lightColor: 'bg-gray-50',
    border: 'border-gray-200',
    probability: 10,
    sortOrder: 0,
    isSystem: false,
  },
  {
    id: '',
    name: 'Contacted',
    color: 'bg-blue-500',
    lightColor: 'bg-blue-50',
    border: 'border-blue-200',
    probability: 30,
    sortOrder: 1,
    isSystem: false,
  },
  {
    id: '',
    name: 'Quoted',
    color: 'bg-purple-500',
    lightColor: 'bg-purple-50',
    border: 'border-purple-200',
    probability: 50,
    sortOrder: 2,
    isSystem: false,
  },
  {
    id: '',
    name: 'Negotiation',
    color: 'bg-orange-500',
    lightColor: 'bg-orange-50',
    border: 'border-orange-200',
    probability: 80,
    sortOrder: 3,
    isSystem: false,
  },
  {
    id: '',
    name: 'Won',
    color: 'bg-green-500',
    lightColor: 'bg-green-50',
    border: 'border-green-200',
    probability: 100,
    sortOrder: 4,
    isSystem: true,
  },
  {
    id: '',
    name: 'Lost',
    color: 'bg-red-500',
    lightColor: 'bg-red-50',
    border: 'border-red-200',
    probability: 0,
    sortOrder: 5,
    isSystem: true,
  },
];

// Keep backward-compatible export
export const PIPELINE_STAGES = DEFAULT_PIPELINE_STAGES;

export const getProbability = (
  stage: string,
  stages?: Array<{ name: string; probability: number }>,
) => {
  if (stages) {
    const found = stages.find((s) => s.name === stage);
    if (found) return found.probability;
  }
  // Fallback to defaults
  const defaultStage = DEFAULT_PIPELINE_STAGES.find((s) => s.name === stage);
  return defaultStage?.probability ?? 0;
};
