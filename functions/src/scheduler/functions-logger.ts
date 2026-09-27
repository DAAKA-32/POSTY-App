import * as functions from "firebase-functions";
import { sanitizeLogFields, type SchedulerLogger } from "./logger";

/** Cloud Logging implementation: one structured JSON entry per event. */
export function createFunctionsLogger(base: Record<string, unknown> = {}): SchedulerLogger {
  return {
    log(severity, event, fields) {
      functions.logger.write({
        severity,
        message: event,
        event,
        ...sanitizeLogFields({ ...base, ...fields }),
      });
    },
  };
}
