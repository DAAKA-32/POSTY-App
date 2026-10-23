"use client";

/**
 * StrategistSettingsView — the workspace's "Settings" view (header gear).
 *
 * From `xl` (≥ 1280px): three columns — free text, choices, autonomous mode
 * — so the whole view fits a laptop screen without scrolling. Between `lg`
 * and `xl`: editorial line + a sticky autonomous column. Phones / tablets:
 * one column in the journey's order; there, a dozen controls can't share one
 * screen and the view scrolls, with the save bar stuck to the bottom.
 */

import { useStrategistCopy } from "@/lib/strategist/copy";
import { useJourneyCopy } from "@/lib/strategist/journey-copy";
import StrategistParamsPanel from "./StrategistParamsPanel";
import StrategistAutonomousPanel from "./StrategistAutonomousPanel";
import { type } from "./type";

export default function StrategistSettingsView() {
  const { c } = useStrategistCopy();
  const { j } = useJourneyCopy();
  return (
    <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
      <div className="mx-auto w-full max-w-[1180px] px-5 pt-[clamp(16px,3.5dvh,40px)] pb-[max(env(safe-area-inset-bottom),24px)] sm:px-8">
        <p className={type.kicker}>{j.settingsView.kicker}</p>
        <h2 className={`mt-2 ${type.display}`}>{c.settings.title}</h2>
        <div className="mt-[var(--st-s3)] grid gap-12 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-12 xl:grid-cols-[minmax(0,1fr)_300px] xl:gap-12">
          <StrategistParamsPanel />
          <div className="border-t border-st-rule pt-10 lg:sticky lg:top-6 lg:self-start lg:border-t-0 lg:pt-0">
            <StrategistAutonomousPanel />
          </div>
        </div>
      </div>
    </div>
  );
}
