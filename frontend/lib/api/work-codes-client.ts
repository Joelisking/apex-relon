import { apiFetch } from './client';

export interface WorkCode {
  id: string;
  code: number;
  name: string;
  division: number;
  parentCode: number | null;
  isMainTask: boolean;
  isActive: boolean;
  sortOrder: number;
}

export interface WorkCodeGroup {
  mainTask: WorkCode;
  subtasks: WorkCode[];
}

export const workCodesApi = {
  /** Active codes only — used in time entry dialog and project tab */
  getAll(division?: number): Promise<WorkCode[]> {
    const query = division ? `?division=${division}` : '';
    return apiFetch<WorkCode[]>(`/work-codes${query}`);
  },

  /** All codes including inactive — used in admin view */
  getAllForAdmin(division?: number): Promise<WorkCode[]> {
    const query = division ? `?division=${division}` : '';
    return apiFetch<WorkCode[]>(`/work-codes/admin${query}`);
  },

  update(id: string, data: { name?: string; isActive?: boolean; sortOrder?: number }): Promise<WorkCode> {
    return apiFetch<WorkCode>(`/work-codes/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },
};

/** Group a flat list of work codes into mainTask → subtasks structure */
export function groupWorkCodes(codes: WorkCode[]): WorkCodeGroup[] {
  const mainTasks = codes.filter((c) => c.isMainTask);
  return mainTasks.map((mainTask) => ({
    mainTask,
    subtasks: codes.filter((c) => !c.isMainTask && c.parentCode === mainTask.code),
  }));
}

/** Get division label from division number */
export function getDivisionLabel(division: number): string {
  switch (division) {
    case 5000: return 'Engineering Services';
    case 6000: return 'Stormwater Inspections';
    case 7000: return 'Construction Inspection';
    default: return `Division ${division}`;
  }
}
