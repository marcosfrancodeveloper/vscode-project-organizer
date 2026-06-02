export interface GitStatus {
  branch: string;
  isDirty: boolean;
  unpushed?: number;
  lastChecked: number;
}

export interface Project {
  id: string;
  name: string;
  path: string;
  group?: string; // e.g. "Work/Backend" or "Personal"
  tags?: string[];
  notes?: string;
  lastAccessed: number;
}

export interface ProjectGroup {
  name: string;
  fullPath: string; // e.g. "Work/Backend"
  subgroups: Map<string, ProjectGroup>;
  projects: Project[];
}
