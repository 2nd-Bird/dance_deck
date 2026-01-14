export type ProAction =
  | "bookmark_create"
  | "bpm_auto_detect"
  | "loop_toggle"
  | "loop_length_select"
  | "loop_drag";

const PRO_ACTIONS = new Set<ProAction>(["bookmark_create", "bpm_auto_detect"]);

export const isProRequired = (action: ProAction) => PRO_ACTIONS.has(action);
