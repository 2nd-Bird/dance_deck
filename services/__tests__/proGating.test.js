import { isProRequired } from "../proGating";

describe("pro gating policy", () => {
  it("requires Pro only for bookmark creation and BPM auto-detect", () => {
    expect(isProRequired("bookmark_create")).toBe(true);
    expect(isProRequired("bpm_auto_detect")).toBe(true);
  });

  it("keeps loop operations free", () => {
    expect(isProRequired("loop_toggle")).toBe(false);
    expect(isProRequired("loop_length_select")).toBe(false);
    expect(isProRequired("loop_drag")).toBe(false);
  });
});
