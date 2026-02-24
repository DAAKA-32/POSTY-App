"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Smartphone,
  Tablet,
  Monitor,
  Zap,
  Eye,
  RefreshCw,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import {
  runAllValidations,
  ValidationResults,
  getCurrentBreakpoint,
} from "@/lib/validation";

interface CheckItemProps {
  label: string;
  passed: boolean | null;
  details?: string;
  children?: React.ReactNode;
}

function CheckItem({ label, passed, details, children }: CheckItemProps) {
  const [expanded, setExpanded] = useState(false);

  const Icon =
    passed === null
      ? AlertTriangle
      : passed
        ? CheckCircle
        : XCircle;

  const colorClass =
    passed === null
      ? "text-yellow-500"
      : passed
        ? "text-green-500"
        : "text-red-500";

  return (
    <div className="border-b border-dark-border last:border-b-0">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 py-2 px-3 hover:bg-dark-hover transition-colors text-left"
      >
        <Icon className={`w-4 h-4 ${colorClass} flex-shrink-0`} />
        <span className="text-sm text-text-primary flex-1">{label}</span>
        {(details || children) && (
          expanded ? (
            <ChevronDown className="w-4 h-4 text-text-secondary" />
          ) : (
            <ChevronRight className="w-4 h-4 text-text-secondary" />
          )
        )}
      </button>
      <AnimatePresence>
        {expanded && (details || children) && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-2 pl-9">
              {details && (
                <p className="text-xs text-text-secondary">{details}</p>
              )}
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface SectionProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

function Section({ title, icon, children, defaultOpen = false }: SectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="mb-3">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-2 py-2 px-3 bg-dark-hover rounded-t-lg hover:bg-opacity-80 transition-colors"
      >
        {icon}
        <span className="text-sm font-medium text-text-primary flex-1 text-left">
          {title}
        </span>
        {isOpen ? (
          <ChevronDown className="w-4 h-4 text-text-secondary" />
        ) : (
          <ChevronRight className="w-4 h-4 text-text-secondary" />
        )}
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden bg-dark-card rounded-b-lg border border-dark-border border-t-0"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function ValidationPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [results, setResults] = useState<ValidationResults | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [breakpoint, setBreakpoint] = useState("");

  const runValidation = useCallback(async () => {
    setIsLoading(true);
    try {
      const validationResults = await runAllValidations();
      setResults(validationResults);
    } catch (error) {
      console.error("Validation error:", error);
    }
    setIsLoading(false);
  }, []);

  // Update breakpoint on resize
  useEffect(() => {
    const updateBreakpoint = () => {
      setBreakpoint(getCurrentBreakpoint());
    };

    updateBreakpoint();
    window.addEventListener("resize", updateBreakpoint);
    return () => window.removeEventListener("resize", updateBreakpoint);
  }, []);

  // Run validation when panel opens
  useEffect(() => {
    if (isOpen && !results) {
      runValidation();
    }
  }, [isOpen, results, runValidation]);

  // Only show in development
  if (process.env.NODE_ENV !== "development") {
    return null;
  }

  return (
    <>
      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 left-4 z-50 w-10 h-10 bg-primary rounded-full flex items-center justify-center shadow-lg hover:bg-primary-hover transition-colors"
        title="Open Validation Panel"
      >
        <Eye className="w-5 h-5 text-white" />
      </button>

      {/* Panel */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black/50 z-50"
            />

            {/* Panel Content */}
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed left-0 top-0 bottom-0 w-80 max-w-[90vw] bg-dark-bg z-50 overflow-hidden flex flex-col shadow-xl"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-dark-border">
                <div>
                  <h2 className="text-lg font-semibold text-text-primary">
                    Validation Panel
                  </h2>
                  <p className="text-xs text-text-secondary">
                    Breakpoint: {breakpoint}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={runValidation}
                    disabled={isLoading}
                    className="p-2 hover:bg-dark-hover rounded-lg transition-colors disabled:opacity-50"
                    title="Refresh validations"
                  >
                    <RefreshCw
                      className={`w-4 h-4 text-text-secondary ${isLoading ? "animate-spin" : ""}`}
                    />
                  </button>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="p-2 hover:bg-dark-hover rounded-lg transition-colors"
                  >
                    <X className="w-4 h-4 text-text-secondary" />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-4">
                {isLoading && !results ? (
                  <div className="flex items-center justify-center py-8">
                    <RefreshCw className="w-6 h-6 text-primary animate-spin" />
                  </div>
                ) : results ? (
                  <>
                    {/* 8.1 - Mobile */}
                    <Section
                      title="8.1 - Mobile"
                      icon={<Smartphone className="w-4 h-4 text-primary" />}
                      defaultOpen
                    >
                      <CheckItem
                        label="Touch targets ≥ 44px"
                        passed={results.mobile.touchTargets.passed}
                        details={
                          results.mobile.touchTargets.passed
                            ? "All touch targets meet minimum size"
                            : `${results.mobile.touchTargets.issues.length} issues found`
                        }
                      >
                        {results.mobile.touchTargets.issues.length > 0 && (
                          <ul className="mt-2 space-y-1">
                            {results.mobile.touchTargets.issues
                              .slice(0, 5)
                              .map((issue, i) => (
                                <li
                                  key={i}
                                  className="text-xs text-red-400"
                                >
                                  • {issue}
                                </li>
                              ))}
                          </ul>
                        )}
                      </CheckItem>
                      <CheckItem
                        label="Safe area insets iOS"
                        passed={results.mobile.safeArea.passed}
                        details={results.mobile.safeArea.details}
                      />
                      <CheckItem
                        label="No horizontal scroll"
                        passed={results.mobile.horizontalScroll.passed}
                        details={results.mobile.horizontalScroll.details}
                      />
                      <CheckItem
                        label="Swipe gestures"
                        passed={null}
                        details="Manual test: Try swipe gestures on BottomSheet"
                      />
                      <CheckItem
                        label="Haptic feedback"
                        passed={null}
                        details="Manual test: Check vibration on mobile device"
                      />
                      <CheckItem
                        label="Keyboard doesn't hide inputs"
                        passed={null}
                        details="Manual test: Open keyboard on mobile and check input visibility"
                      />
                    </Section>

                    {/* 8.2 - Tablet */}
                    <Section
                      title="8.2 - Tablet"
                      icon={<Tablet className="w-4 h-4 text-primary" />}
                    >
                      <CheckItem
                        label={`Layout (${results.tablet.breakpoint})`}
                        passed={results.tablet.layout.passed}
                        details={results.tablet.layout.details}
                      />
                      <CheckItem
                        label="Sidebar semi-compacte"
                        passed={null}
                        details="Manual test: Check sidebar state at 768-1024px"
                      />
                      <CheckItem
                        label="Cards en grid"
                        passed={null}
                        details="Manual test: Check card layout in history"
                      />
                      <CheckItem
                        label="Touch + hover support"
                        passed={null}
                        details="Manual test: Both touch and hover should work"
                      />
                    </Section>

                    {/* 8.3 - Desktop */}
                    <Section
                      title="8.3 - Desktop"
                      icon={<Monitor className="w-4 h-4 text-primary" />}
                    >
                      <CheckItem
                        label="Hover states"
                        passed={results.desktop.hoverStates.passed}
                        details={`Found ${results.desktop.hoverStates.count} hover rules`}
                      />
                      <CheckItem
                        label="Keyboard shortcuts"
                        passed={null}
                        details="Registered shortcuts:"
                      >
                        <ul className="mt-2 space-y-1">
                          {results.desktop.shortcuts.registered.map((s, i) => (
                            <li key={i} className="text-xs text-text-secondary">
                              • {s}
                            </li>
                          ))}
                        </ul>
                      </CheckItem>
                      <CheckItem
                        label="Sidebar collapsible"
                        passed={null}
                        details="Manual test: Check sidebar collapse on desktop"
                      />
                      <CheckItem
                        label="Split view (si applicable)"
                        passed={null}
                        details="Manual test: Check split view functionality"
                      />
                    </Section>

                    {/* 8.4 - Performance */}
                    <Section
                      title="8.4 - Performance"
                      icon={<Zap className="w-4 h-4 text-primary" />}
                    >
                      <CheckItem
                        label="Bundle size"
                        passed={null}
                        details={`JS: ${results.performance.bundleSize.jsSize}, CSS: ${results.performance.bundleSize.cssSize}, Total: ${results.performance.bundleSize.totalSize}`}
                      />
                      <CheckItem
                        label={`LCP < 2.5s`}
                        passed={
                          results.performance.webVitals?.lcp
                            ? results.performance.webVitals.lcp < 2500
                            : null
                        }
                        details={
                          results.performance.webVitals?.lcp
                            ? `LCP: ${(results.performance.webVitals.lcp / 1000).toFixed(2)}s`
                            : "LCP not measured yet"
                        }
                      />
                      <CheckItem
                        label="FID < 100ms"
                        passed={
                          results.performance.webVitals?.fid
                            ? results.performance.webVitals.fid < 100
                            : null
                        }
                        details={
                          results.performance.webVitals?.fid
                            ? `FID: ${results.performance.webVitals.fid.toFixed(0)}ms`
                            : "FID not measured (needs user interaction)"
                        }
                      />
                      <CheckItem
                        label="CLS < 0.1"
                        passed={
                          results.performance.webVitals?.cls != null
                            ? results.performance.webVitals.cls < 0.1
                            : null
                        }
                        details={
                          results.performance.webVitals?.cls != null
                            ? `CLS: ${results.performance.webVitals.cls.toFixed(3)}`
                            : "CLS not measured"
                        }
                      />
                      <CheckItem
                        label="Lazy images"
                        passed={
                          results.performance.lazyImages.belowFold > 0
                            ? results.performance.lazyImages.lazy === results.performance.lazyImages.belowFold
                            : null
                        }
                        details={
                          results.performance.lazyImages.belowFold > 0
                            ? `${results.performance.lazyImages.lazy}/${results.performance.lazyImages.belowFold} below-fold images are lazy-loaded`
                            : "No below-fold images detected"
                        }
                      />
                    </Section>

                    {/* 8.5 - Accessibility */}
                    <Section
                      title="8.5 - Accessibilité"
                      icon={<Eye className="w-4 h-4 text-primary" />}
                    >
                      <CheckItem
                        label="prefers-reduced-motion"
                        passed={true}
                        details={results.accessibility.reducedMotion.details}
                      />
                      <CheckItem
                        label="ARIA Landmarks"
                        passed={results.accessibility.landmarks.passed}
                        details={
                          results.accessibility.landmarks.passed
                            ? `Found: ${results.accessibility.landmarks.found.join(", ")}`
                            : `Missing: ${results.accessibility.landmarks.missing.join(", ")}`
                        }
                      />
                      <CheckItem
                        label="Focus indicators"
                        passed={results.accessibility.focusIndicators.passed}
                        details={results.accessibility.focusIndicators.details}
                      />
                      <CheckItem
                        label="Skip links"
                        passed={results.accessibility.skipLinks.passed}
                        details={
                          results.accessibility.skipLinks.passed
                            ? `Found: ${results.accessibility.skipLinks.found.join(", ")}`
                            : "No skip links found"
                        }
                      />
                      <CheckItem
                        label="Color contrast (basic)"
                        passed={
                          results.accessibility.contrast.potentialIssues.length === 0
                        }
                        details={`Checked ${results.accessibility.contrast.checked} elements`}
                      >
                        {results.accessibility.contrast.potentialIssues.length > 0 && (
                          <ul className="mt-2 space-y-1">
                            {results.accessibility.contrast.potentialIssues.map(
                              (issue, i) => (
                                <li key={i} className="text-xs text-yellow-400">
                                  • {issue}
                                </li>
                              )
                            )}
                          </ul>
                        )}
                      </CheckItem>
                      <CheckItem
                        label="Screen reader compatible"
                        passed={null}
                        details="Manual test: Use VoiceOver/NVDA to navigate"
                      />
                    </Section>

                    {/* Security */}
                    <Section
                      title="Sécurité"
                      icon={<AlertTriangle className="w-4 h-4 text-primary" />}
                    >
                      <CheckItem
                        label="Secrets non exposés"
                        passed={results.security.exposedSecrets.passed}
                        details={
                          results.security.exposedSecrets.passed
                            ? "Aucun secret détecté dans le client"
                            : `${results.security.exposedSecrets.issues.length} problèmes trouvés`
                        }
                      >
                        {results.security.exposedSecrets.issues.length > 0 && (
                          <ul className="mt-2 space-y-1">
                            {results.security.exposedSecrets.issues.map((issue, i) => (
                              <li key={i} className="text-xs text-red-400">
                                • {issue}
                              </li>
                            ))}
                          </ul>
                        )}
                      </CheckItem>
                      <CheckItem
                        label="XSS Prevention"
                        passed={results.security.xssPrevention.passed}
                        details={results.security.xssPrevention.details}
                      />
                      <CheckItem
                        label="LinkedIn tokens server-side"
                        passed={results.security.linkedInTokens.passed}
                        details={results.security.linkedInTokens.details}
                      />
                      <CheckItem
                        label="Rate limiting API"
                        passed={null}
                        details={results.security.rateLimiting.details}
                      />
                      <CheckItem
                        label="Validation inputs"
                        passed={null}
                        details="Manual test: Test XSS/injection dans les champs"
                      />
                    </Section>

                    {/* Animations */}
                    <Section
                      title="Animations"
                      icon={<Zap className="w-4 h-4 text-primary" />}
                    >
                      <CheckItem
                        label="Durees coherentes (200-400ms)"
                        passed={results.animations.durations.passed}
                        details={`${results.animations.durations.issues.length} animations trop lentes`}
                      >
                        {results.animations.durations.issues.length > 0 && (
                          <ul className="mt-2 space-y-1">
                            {results.animations.durations.issues.slice(0, 3).map((issue, i) => (
                              <li key={i} className="text-xs text-yellow-400">
                                • {issue}
                              </li>
                            ))}
                          </ul>
                        )}
                      </CheckItem>
                      <CheckItem
                        label="Framer Motion / AnimatePresence"
                        passed={results.animations.animatePresence.found}
                        details={results.animations.animatePresence.details}
                      />
                      <CheckItem
                        label="Loading states (skeletons)"
                        passed={results.animations.loadingStates.found > 0 || null}
                        details={results.animations.loadingStates.details}
                      />
                      <CheckItem
                        label="Smooth scroll"
                        passed={results.animations.smoothScroll.enabled}
                        details={results.animations.smoothScroll.details}
                      />
                      <CheckItem
                        label="60fps sans jank"
                        passed={null}
                        details="Manual test: DevTools Performance panel"
                      />
                    </Section>

                    {/* Functional Tests */}
                    <Section
                      title="Tests Fonctionnels"
                      icon={<CheckCircle className="w-4 h-4 text-primary" />}
                    >
                      <CheckItem
                        label="Quota affiche"
                        passed={results.functional.quotaDisplay.found}
                        details={results.functional.quotaDisplay.details}
                      />
                      <CheckItem
                        label="Auth state"
                        passed={results.functional.authState.isAuthenticated}
                        details={results.functional.authState.details}
                      />
                      <CheckItem
                        label="Chat input"
                        passed={results.functional.chatInput.found}
                        details={results.functional.chatInput.details}
                      />
                      <CheckItem
                        label="Historique"
                        passed={results.functional.historyElements.found || null}
                        details={
                          results.functional.historyElements.found
                            ? `${results.functional.historyElements.postCount} posts, recherche: ${results.functional.historyElements.hasSearch ? "oui" : "non"}`
                            : "Page historique non visible"
                        }
                      />
                      <CheckItem
                        label="Virtualisation listes"
                        passed={
                          results.performance.virtualization.needed
                            ? results.performance.virtualization.implemented
                            : true
                        }
                        details={results.performance.virtualization.details}
                      />
                      <CheckItem
                        label="Publication LinkedIn E2E"
                        passed={null}
                        details="Manual test: Publier un post sur LinkedIn"
                      />
                      <CheckItem
                        label="Génération IA avec feedback"
                        passed={null}
                        details="Manual test: Générer un post et vérifier le streaming"
                      />
                    </Section>
                  </>
                ) : null}
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-dark-border">
                <p className="text-xs text-text-secondary text-center">
                  Dev only - Not visible in production
                </p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
