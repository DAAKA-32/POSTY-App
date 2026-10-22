"use client";

/**
 * StrategistSettingsView — the workspace's "Settings" sub-view (header gear).
 * Editorial line first (it shapes every plan and post), autonomous mode next to
 * it. On desktop the two sit side by side in a wide card so the whole form is
 * visible without long scrolling; on mobile they stack in one comfortable
 * scroll column. A plain scroll area: no nested modal.
 */

import StrategistParamsPanel from "./StrategistParamsPanel";
import StrategistAutonomousPanel from "./StrategistAutonomousPanel";

export default function StrategistSettingsView() {
  return (
    <div className="flex-1 overflow-y-auto overscroll-contain">
      <div className="px-5 pt-5 pb-[max(env(safe-area-inset-bottom),24px)] space-y-8 lg:space-y-0 lg:grid lg:grid-cols-2 lg:gap-x-10 lg:items-start lg:px-8 lg:pt-6 lg:pb-6">
        <StrategistParamsPanel />
        <hr className="border-gray-200 dark:border-dark-border lg:hidden" />
        <div className="lg:border-l lg:border-gray-200 lg:dark:border-dark-border lg:pl-10">
          <StrategistAutonomousPanel />
        </div>
      </div>
    </div>
  );
}
