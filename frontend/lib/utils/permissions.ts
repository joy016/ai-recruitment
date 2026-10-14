import { PermissionDefinition } from "../types/permission";

/** Known actions are shown in this order; any others follow alphabetically. */
const ACTION_ORDER = [
  "view",
  "create",
  "update",
  "edit",
  "delete",
  "schedule",
  "reschedule",
  "manage",
];

/** Known modules are shown in this order; any others follow alphabetically. */
const MODULE_ORDER = [
  "dashboard",
  "candidates",
  "jobs",
  "jobposts",
  "interviews",
  "users",
  "accounts",
  "notifications",
  "settings",
];

const MODULE_LABELS: Record<string, string> = {
  jobs: "Job Posts",
  jobposts: "Job Posts",
};

const ACTION_LABELS: Record<string, string> = {
  managesystemsettings: "Manage System Settings",
};

const toTitleCase = (value: string) =>
  value
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

/** "candidates.create" -> { module: "candidates", action: "create" } */
export const parsePermissionName = (permissionName: string) => {
  const [module = "", ...rest] = permissionName.trim().toLowerCase().split(".");
  return { module, action: rest.join(".") };
};

export const getModuleLabel = (module: string) =>
  MODULE_LABELS[module] ?? toTitleCase(module);

export const getActionLabel = (action: string) =>
  ACTION_LABELS[action] ?? toTitleCase(action);

const byKnownOrder = (order: string[]) => (a: string, b: string) => {
  const indexA = order.indexOf(a);
  const indexB = order.indexOf(b);
  if (indexA === -1 && indexB === -1) return a.localeCompare(b);
  if (indexA === -1) return 1;
  if (indexB === -1) return -1;
  return indexA - indexB;
};

export interface PermissionModuleGroup {
  module: string;
  label: string;
  actions: string[];
}

/**
 * Groups plain permission names by module, e.g.
 * ["candidates.view", "candidates.edit"] -> Candidates: View, Edit.
 */
export const groupPermissionNames = (
  permissionNames: string[],
): PermissionModuleGroup[] => {
  const actionsByModule = new Map<string, Set<string>>();

  permissionNames.forEach((name) => {
    const { module, action } = parsePermissionName(name);
    if (!module || !action) return;
    const actions = actionsByModule.get(module) ?? new Set<string>();
    actions.add(action);
    actionsByModule.set(module, actions);
  });

  const moduleSort = byKnownOrder(MODULE_ORDER);
  const actionSort = byKnownOrder(ACTION_ORDER);

  return [...actionsByModule.entries()]
    .sort(([a], [b]) => moduleSort(a, b))
    .map(([module, actions]) => ({
      module,
      label: getModuleLabel(module),
      actions: [...actions].sort(actionSort),
    }));
};

export interface PermissionMatrixRow {
  module: string;
  label: string;
  /** Keyed by action; missing when the module has no such permission. */
  cells: Record<string, PermissionDefinition | undefined>;
}

export interface PermissionMatrix {
  actions: string[];
  rows: PermissionMatrixRow[];
}

/**
 * Builds a module x action matrix from whatever permissions exist, so new
 * modules or actions appear without code changes.
 */
export const buildPermissionMatrix = (
  permissions: PermissionDefinition[],
): PermissionMatrix => {
  const actions = new Set<string>();
  const rowsByModule = new Map<string, PermissionMatrixRow>();

  permissions.forEach((permission) => {
    const { module, action } = parsePermissionName(permission.permissionName);
    if (!module || !action) return;

    actions.add(action);
    const row = rowsByModule.get(module) ?? {
      module,
      label: getModuleLabel(module),
      cells: {},
    };
    row.cells[action] = permission;
    rowsByModule.set(module, row);
  });

  const moduleSort = byKnownOrder(MODULE_ORDER);

  return {
    actions: [...actions].sort(byKnownOrder(ACTION_ORDER)),
    rows: [...rowsByModule.values()].sort((a, b) =>
      moduleSort(a.module, b.module),
    ),
  };
};
