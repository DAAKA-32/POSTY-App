/**
 * SEO Module Exports for POSTY
 * Centralized exports for all SEO-related functionality
 */

// Configuration
export {
  seoConfig,
  i18nSeoConfig,
  localizedPageSeo,
  seoSilos,
  pageSeo,
  structuredData,
} from "./config";

// Keywords Strategy
export {
  longTailKeywordsFR,
  longTailKeywordsEN,
  keywordClusters,
  metaTemplates,
  headingVariations,
} from "./keywords";

// Backlinks Strategy
export {
  backlinkCategories,
  outreachTemplates,
  linkBuildingCalendar,
  linkBuildingKPIs,
  competitorAnalysis,
} from "./backlinks-strategy";

// SEO Checklists
export {
  technicalSeoChecklist,
  onPageSeoChecklist,
  coreWebVitalsChecklist,
  mobileSeoChecklist,
  structuredDataChecklist,
  offPageSeoChecklist,
  analyticsChecklist,
  preLaunchChecklist,
  seoAuditTools,
} from "./checklist";

// Type exports
export type { ChecklistItem } from "./checklist";
