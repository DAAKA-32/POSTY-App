"use client";

/**
 * StrategistSettingsView — the drawer's "Settings" sub-view (header gear).
 * Editorial line first (it shapes every plan and post), autonomous mode below.
 * A plain scroll area: no nested modal, comfortable one-handed on mobile.
 */

import StrategistParamsPanel from "./StrategistParamsPanel";
import StrategistAutonomousPanel from "./StrategistAutonomousPanel";

export default function StrategistSettingsView() {
  return (
    <div className="flex-1 overflow-y-auto overscroll-contain">
      <div className="px-5 pt-5 pb-[max(env(safe-area-inset-bottom),24px)] space-y-8 max-w-xl">
        <StrategistParamsPanel />
        <hr className="border-gray-200 dark:border-dark-border" />
        <StrategistAutonomousPanel />
      </div>
    </div>
  );
}
