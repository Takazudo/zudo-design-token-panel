---
name: test-flow-color-picker-axis-direction
description: Verify the OKLCH/HSL dual-mode ColorPicker (packages/zdtp) renders its L (lightness), H (hue), and C/S (chroma/saturation) slider axes in the CORRECT direction — left edge = min value, right edge = max value, gradient and thumb position both aligned. Use when /verify-ui-ai dispatches a subagent for color-picker-axis-direction verification, or when a future PR changes the picker and you want to re-confirm the direction is still correct.
---

# Test flow: ColorPicker axis direction (L / H / C-S)

This test produces a binary PASS / FAIL verdict on whether the ColorPicker's three primary value-axis sliders (L, H, and C in OKLCH mode; H, S, L in HSL mode) render correctly — left edge of each track corresponds to the MIN value of that channel, right edge to the MAX value, and the thumb position matches the value's fraction across the track.

The verdict is per-mode, per-slider, so the report can pinpoint exactly which slider in which mode is wrong (if any) and how it is wrong (gradient flipped vs thumb position mirrored vs both).

## Scenario

1. cd to /home/takazudo/repos/myoss/zdtp.
2. Confirm the example app dev server is reachable. The canonical example for this test is zfb-tailwind (the one that produced the original bug-report screenshots). Its dev URL is http://localhost:44328.
   - If port 44328 is already responding, REUSE that server. Do NOT relaunch.
   - If port 44328 is NOT responding, start the dev server in the background and wait for ready:
     - `pnpm -F zfb-tailwind-example dev` (also boots a tokens-bin sidecar on 24686)
     - Wait until http://localhost:44328 returns 200 (poll with a short until loop, max 60s).
3. Open the page at viewport 1440x900 (a non-zoomed desktop default that matches the bug-report screenshots).
4. The floating "Design Tokens" panel is visible by default. Switch to the Color tab.
5. Click the first color swatch in the Palette section (label starts with `--zfbtw-palette-`) to open the ColorPicker popover.
6. The popover header shows a mode toggle (OKLCH | HSL). Start in OKLCH mode (the default).

## Verification — OKLCH mode

Perform each check below. For each, capture (a) a screenshot of the picker popover for evidence and (b) record the DOM measurement.

### Check OKLCH-L (lightness)

- Type `#000000` into the hex input. Wait for the picker to re-render.
- Record the L-slider thumb's `left` CSS percentage (DOM measurement). Expected: ≤ 5%.
- Record the visual color sample at the LEFT edge of the L-slider track (capture a small swatch). Expected: very dark / near-black.
- Type `#ffffff` into the hex input. Wait for re-render.
- Record the L-slider thumb's `left` CSS percentage. Expected: ≥ 95%.
- Record the visual color sample at the RIGHT edge of the L-slider track. Expected: very light / near-white.

### Check OKLCH-H (hue)

- Type `#ff0000` into the hex input (pure red, H ≈ 29° in OKLCH but we will use HSL hex for predictable input; the resulting OKLCH H is non-zero but predictable).
  - Actually for unambiguous H=0° testing, use the hex `#dc143c` or any color where the OKLCH H rounds to a value near 0. If the H thumb position does not match the expected value, retry with a hex whose OKLCH H is verified externally.
- The simpler test: use the hex input value computed from the displayed picker state — read the H-slider's aria-valuenow (DOM measurement) and the thumb's `left` CSS percentage. Verify: thumb-left-percent ≈ (aria-valuenow / 360) * 100, within ±3% tolerance.
- Set the hex to a series of values whose OKLCH H spans the gradient. Record the thumb-left-percent at each step and confirm monotonically-increasing (or at least non-decreasing) as the H value increases.
- Capture the gradient direction by sampling color values at LEFT edge (expected: red ~ rgb(2,55,55) — OKLCH(displayed L%, displayed C, 0)) and RIGHT edge (expected: same red after the rainbow wraps at 360°).
- The KEY observation is monotonic mapping of value to position with left = low, right = high.

### Check OKLCH-C (chroma)

- Read the C-slider's current aria-valuenow and the thumb's `left` CSS percentage. Compute expected-left-percent = aria-valuenow / MAX_OKLCH_CHROMA (which is 0.37 per packages/zdtp/src/components/color-picker/constants).
- Verify thumb-left-percent matches expected, within ±3%.
- Sample the LEFT edge of the C track. Expected: grayscale (chroma 0).
- Sample the RIGHT edge. Expected: most saturated for the current L and H.

## Verification — HSL mode

Click the HSL button in the mode toggle. Re-run analogous checks:

### Check HSL-H (hue) — identical procedure to OKLCH-H.

### Check HSL-S (saturation)

- aria-valuenow span is 0..100. Expected thumb-left-percent = aria-valuenow.
- LEFT edge of S track = gray, RIGHT edge = fully saturated.

### Check HSL-L (lightness)

- aria-valuenow span is 0..100. Expected thumb-left-percent = aria-valuenow.
- LEFT edge of L track = black, RIGHT edge = white.

## Measurements (mechanical — these should drive the verdict, not subjective AI judgment)

For each slider in each mode, compute:

- `thumbPositionError = abs(thumbLeftPercent - expectedLeftPercent)` — PASS if ≤ 3%.
- `gradientDirection` = which color appears at the LEFT vs RIGHT edge — PASS if LEFT matches MIN-value color and RIGHT matches MAX-value color (e.g. L-slider: LEFT=dark, RIGHT=light).

The AI judgment ONLY applies to (b) gradientDirection (subjective "this color region is darker than that color region" — which a small color-distance computation would also resolve mechanically if needed, but for L6 we accept AI's perceptual call).

## Verdict criteria

PER-SLIDER PASS if BOTH `thumbPositionError` ≤ 3% AND gradientDirection matches expected.
PER-SLIDER FAIL otherwise — report which (gradient or thumb or both) is wrong, in which direction it is wrong.

OVERALL VERDICT:
- All 6 checks PASS (OKLCH L+H+C, HSL H+S+L) → overall PASS.
- Any check FAIL → overall FAIL.

## Output schema

The verification subagent MUST return a structured result containing exactly:

```
{
  "verdict": "PASS" | "FAIL",
  "summary": "<one-line human-readable verdict>",
  "modes": {
    "oklch": {
      "L": { "thumbPositionError": number, "gradientDirection": "correct" | "reversed" | "inconclusive", "verdict": "PASS" | "FAIL", "notes": string },
      "H": { ... same shape ... },
      "C": { ... same shape ... }
    },
    "hsl": {
      "H": { ... },
      "S": { ... },
      "L": { ... }
    }
  },
  "screenshots": [
    { "label": "oklch-after-#000000", "path": "<absolute path>" },
    { "label": "oklch-after-#ffffff", "path": "<absolute path>" },
    ...
  ],
  "toolUsed": "verify-ui" | "headless-browser",
  "devServerStartedByThisRun": boolean,
  "devServerStopped": boolean
}
```

The `summary` field must be one line, no markdown.

## Browser-driving skill preference

Use `/headless-browser` (Tier 2 Playwright CLI) — this flow requires multi-step interaction (typing hex values, switching modes, clicking swatches, capturing screenshots at multiple states), and is beyond `/verify-ui`'s deterministic computed-style-only checks.

`/verify-ui` is acceptable as a fallback if `/headless-browser` is unavailable, but its single-page-read shape will require more round trips for this multi-step flow.

## Cleanup

If this test started the dev server (`devServerStartedByThisRun: true`), stop it on exit so it does not leak. Use `lsof -ti:44328 | xargs kill -9 2>/dev/null || true` and `lsof -ti:24686 | xargs kill -9 2>/dev/null || true`. Record `devServerStopped: true` in the output.

If the test reused an already-running server, do NOT stop it (someone else may still want it). Record `devServerStartedByThisRun: false, devServerStopped: false`.

## Don'ts

- Don't assume the bug exists — the user has reported it but the static analysis shows the code is correct. Approach with healthy skepticism in BOTH directions.
- Don't trust visual color-perception alone — back perceptual judgments with the mechanical thumb-position measurement (which is precise and deterministic).
- Don't run the full test suite or any other build steps in the verification subagent — this skill is for one specific verification.
- Don't modify any source code — verification is read-only on the application.
