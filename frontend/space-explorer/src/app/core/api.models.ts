/** DTOs of the SpaceExplorer API (see backend Reports/ReportDtos.cs). */

export interface SpaceResponse<T> {
  spaceKey: string;
  spaceName: string;
  fileDateUtc: string;
  /** The CSV could not be re-read: the last loaded content is served. */
  stale: boolean;
  data: T;
}

export interface SpaceSummary {
  key: string;
  displayName: string;
}

export interface Me {
  userName: string;
  isAdmin: boolean;
  compartments: string[];
}

export interface RawRow {
  path: string;
  size: number;
}

/** `job` is null on the jobs total line of a workspace. */
export interface SplitRow {
  compartment: string;
  workspace: string;
  job: string | null;
  size: number;
}

export interface JobsTotalRow {
  compartment: string;
  workspace: string;
  size: number;
}

export interface CompartmentReport {
  spaceTotal: number;
  rows: CompartmentRow[];
}

/** `name` is null on the aggregated "other compartments" row. `percent` is relative to the whole space. */
export interface CompartmentRow {
  name: string | null;
  size: number;
  percent: number;
  isOthers: boolean;
}

export interface CompartmentDetail {
  name: string;
  size: number;
  percentOfSpace: number;
  workspaces: WorkspaceRow[];
}

/** `percent` is relative to the compartment. `jobs` only when requested. */
export interface WorkspaceRow {
  name: string;
  size: number;
  percent: number;
  jobs?: JobRow[];
}

/** `percent` is relative to the workspace. */
export interface JobRow {
  name: string;
  size: number;
  percent: number;
}
