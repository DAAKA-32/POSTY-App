"use client";

/**
 * Performance monitoring utilities for Core Web Vitals
 * Used for 8.4 - Performance Checklist validation
 */

export interface PerformanceMetrics {
  // Core Web Vitals
  lcp: number | null; // Largest Contentful Paint
  fid: number | null; // First Input Delay
  cls: number | null; // Cumulative Layout Shift
  fcp: number | null; // First Contentful Paint
  ttfb: number | null; // Time to First Byte
  inp: number | null; // Interaction to Next Paint
   
  //  metrics
  domContentLoaded: number | null;
  windowLoad: number | null;
  resourceCount: number;
  totalTransferSize: number;
  jsTransferSize: number;
  cssTransferSize: number;
  imageTransferSize: number;
}

// Thresholds based on Google's recommendations
export const PERFORMANCE_THRESHOLDS = {
  lcp: { good: 2500, poor: 4000 },
  fid: { good: 100, poor: 300 },
  cls: { good: 0.1, poor: 0.25 },
  fcp: { good: 1800, poor: 3000 },
  ttfb: { good: 800, poor: 1800 },
  inp: { good: 200, poor: 500 },
};

export type MetricStatus = "good" | "needs-improvement" | "poor";

export function getMetricStatus(
  metric: keyof typeof PERFORMANCE_THRESHOLDS,
  value: number
): MetricStatus {
  const thresholds = PERFORMANCE_THRESHOLDS[metric];
  if (value <= thresholds.good) return "good";
  if (value <= thresholds.poor) return "needs-improvement";
  return "poor";
}

class PerformanceMonitor {
  private metrics: PerformanceMetrics = {
    lcp: null,
    fid: null,
    cls: null,
    fcp: null,
    ttfb: null,
    inp: null,
    domContentLoaded: null,
    windowLoad: null,
    resourceCount: 0,
    totalTransferSize: 0,
    jsTransferSize: 0,
    cssTransferSize: 0,
    imageTransferSize: 0,
  };

  private observers: PerformanceObserver[] = [];
  private clsValue = 0;
  private inpValue = 0;

  constructor() {
    if (typeof window === "undefined") return;
    this.initObservers();
    this.measureNavigationTiming();
    this.measureResources();
  }

  private initObservers() {
    if (!("PerformanceObserver" in window)) return;

    // LCP Observer
    try {
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        this.metrics.lcp = lastEntry.startTime;
      });
      lcpObserver.observe({ type: "largest-contentful-paint", buffered: true });
      this.observers.push(lcpObserver);
    } catch {
      console.debug("LCP observer not supported");
    }

    // FCP Observer
    try {
      const fcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const fcpEntry = entries.find((e) => e.name === "first-contentful-paint");
        if (fcpEntry) {
          this.metrics.fcp = fcpEntry.startTime;
        }
      });
      fcpObserver.observe({ type: "paint", buffered: true });
      this.observers.push(fcpObserver);
    } catch {
      console.debug("FCP observer not supported");
    }

    // FID Observer
    try {
      const fidObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        if (entries.length > 0) {
          const firstInput = entries[0] as PerformanceEventTiming;
          this.metrics.fid = firstInput.processingStart - firstInput.startTime;
        }
      });
      fidObserver.observe({ type: "first-input", buffered: true });
      this.observers.push(fidObserver);
    } catch {
      console.debug("FID observer not supported");
    }

    // CLS Observer
    try {
      const clsObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const layoutShift = entry as LayoutShift;
          if (!layoutShift.hadRecentInput) {
            this.clsValue += layoutShift.value;
            this.metrics.cls = this.clsValue;
          }
        }
      });
      clsObserver.observe({ type: "layout-shift", buffered: true });
      this.observers.push(clsObserver);
    } catch {
      console.debug("CLS observer not supported");
    }

    // INP Observer (Interaction to Next Paint)
    try {
      const inpObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const eventTiming = entry as PerformanceEventTiming;
          const duration = eventTiming.processingEnd - eventTiming.processingStart;
          if (duration > this.inpValue) {
            this.inpValue = duration;
            this.metrics.inp = duration;
          }
        }
      });
      inpObserver.observe({ type: "event", buffered: true });
      this.observers.push(inpObserver);
    } catch {
      console.debug("INP observer not supported");
    }
  }

  private measureNavigationTiming() {
    if (typeof window === "undefined") return;

    // Wait for the window to fully load
    if (document.readyState === "complete") {
      this.collectNavigationTiming();
    } else {
      window.addEventListener("load", () => {
        // Small delay to ensure all metrics are collected
        setTimeout(() => this.collectNavigationTiming(), 100);
      });
    }
  }

  private collectNavigationTiming() {
    const navigation = performance.getEntriesByType(
      "navigation"
    )[0] as PerformanceNavigationTiming;

    if (navigation) {
      this.metrics.ttfb = navigation.responseStart - navigation.requestStart;
      this.metrics.domContentLoaded =
        navigation.domContentLoadedEventEnd - navigation.startTime;
      this.metrics.windowLoad = navigation.loadEventEnd - navigation.startTime;
    }
  }

  private measureResources() {
    if (typeof window === "undefined") return;

    const resources = performance.getEntriesByType(
      "resource"
    ) as PerformanceResourceTiming[];

    this.metrics.resourceCount = resources.length;

    resources.forEach((resource) => {
      const size = resource.transferSize || 0;
      this.metrics.totalTransferSize += size;

      if (resource.initiatorType === "script" || resource.name.includes(".js")) {
        this.metrics.jsTransferSize += size;
      } else if (
        resource.initiatorType === "link" ||
        resource.name.includes(".css")
      ) {
        this.metrics.cssTransferSize += size;
      } else if (
        resource.initiatorType === "img" ||
        /\.(png|jpg|jpeg|gif|webp|svg)/.test(resource.name)
      ) {
        this.metrics.imageTransferSize += size;
      }
    });
  }

  getMetrics(): PerformanceMetrics {
    // Refresh resource metrics
    this.measureResources();
    return { ...this.metrics };
  }

  getReport(): string {
    const metrics = this.getMetrics();
    const formatSize = (bytes: number) => {
      if (bytes < 1024) return `${bytes} B`;
      if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
      return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    };

    const formatTime = (ms: number | null) => {
      if (ms === null) return "N/A";
      if (ms < 1000) return `${ms.toFixed(0)}ms`;
      return `${(ms / 1000).toFixed(2)}s`;
    };

    return `
=== Performance Report ===

Core Web Vitals:
  LCP: ${formatTime(metrics.lcp)} ${metrics.lcp ? `(${getMetricStatus("lcp", metrics.lcp)})` : ""}
  FID: ${formatTime(metrics.fid)} ${metrics.fid ? `(${getMetricStatus("fid", metrics.fid)})` : ""}
  CLS: ${metrics.cls?.toFixed(3) || "N/A"} ${metrics.cls !== null ? `(${getMetricStatus("cls", metrics.cls)})` : ""}
  FCP: ${formatTime(metrics.fcp)} ${metrics.fcp ? `(${getMetricStatus("fcp", metrics.fcp)})` : ""}
  TTFB: ${formatTime(metrics.ttfb)} ${metrics.ttfb ? `(${getMetricStatus("ttfb", metrics.ttfb)})` : ""}
  INP: ${formatTime(metrics.inp)} ${metrics.inp ? `(${getMetricStatus("inp", metrics.inp)})` : ""}

Navigation Timing:
  DOM Content Loaded: ${formatTime(metrics.domContentLoaded)}
  Window Load: ${formatTime(metrics.windowLoad)}

Resources:
  Total Resources: ${metrics.resourceCount}
  Total Transfer: ${formatSize(metrics.totalTransferSize)}
  JS: ${formatSize(metrics.jsTransferSize)}
  CSS: ${formatSize(metrics.cssTransferSize)}
  Images: ${formatSize(metrics.imageTransferSize)}
    `.trim();
  }

  disconnect() {
    this.observers.forEach((observer) => observer.disconnect());
    this.observers = [];
  }
}

// Types for performance entries
interface LayoutShift extends PerformanceEntry {
  value: number;
  hadRecentInput: boolean;
}

// Singleton instance
let monitorInstance: PerformanceMonitor | null = null;

export function getPerformanceMonitor(): PerformanceMonitor {
  if (typeof window === "undefined") {
    // Return a mock for SSR
    return {
      getMetrics: () => ({
        lcp: null,
        fid: null,
        cls: null,
        fcp: null,
        ttfb: null,
        inp: null,
        domContentLoaded: null,
        windowLoad: null,
        resourceCount: 0,
        totalTransferSize: 0,
        jsTransferSize: 0,
        cssTransferSize: 0,
        imageTransferSize: 0,
      }),
      getReport: () => "Performance monitoring not available on server",
      disconnect: () => {},
    } as PerformanceMonitor;
  }

  if (!monitorInstance) {
    monitorInstance = new PerformanceMonitor();
  }
  return monitorInstance;
}

/**
 * Hook-friendly function to get current performance metrics
 */
export function measurePerformance(): PerformanceMetrics {
  return getPerformanceMonitor().getMetrics();
}

/**
 * Log performance report to console
 */
export function logPerformanceReport(): void {
  console.log(getPerformanceMonitor().getReport());
}

/**
 * Check if all Core Web Vitals pass thresholds
 */
export function checkCoreWebVitals(): {
  passed: boolean;
  results: Record<string, { value: number | null; status: MetricStatus | null }>;
} {
  const metrics = measurePerformance();

  const results = {
    lcp: {
      value: metrics.lcp,
      status: metrics.lcp ? getMetricStatus("lcp", metrics.lcp) : null,
    },
    fid: {
      value: metrics.fid,
      status: metrics.fid ? getMetricStatus("fid", metrics.fid) : null,
    },
    cls: {
      value: metrics.cls,
      status: metrics.cls !== null ? getMetricStatus("cls", metrics.cls) : null,
    },
  };

  const passed = Object.values(results).every(
    (r) => r.status === null || r.status === "good"
  );

  return { passed, results };
}
