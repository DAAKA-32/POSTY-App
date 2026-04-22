/**
 * One-shot script to inject analytics + publishAs i18n keys into the
 * 8 non-FR/EN language files. Only intended to run once — delete after use.
 *
 * For each language file:
 *   - Adds new `analytics.*` keys before the closing brace of the analytics block
 *   - Adds new `publish.publishAs*` keys after `enableLinkedInVisibility`
 *
 * The script is idempotent: if the keys already exist, the file is skipped.
 */

const fs = require("fs");
const path = require("path");

const translations = {
  de: {
    analytics: {
      metricsInfoTitle: "Detaillierte Statistiken: nur Unternehmensseiten-Beiträge",
      metricsInfoBody:
        "LinkedIn stellt keine Aufrufe, Klicks oder Engagement-Rate für Beiträge auf persönlichen Profilen bereit. Nur als Unternehmensseite veröffentlichte Beiträge liefern diese Daten über die API. Du hast {{org}} Unternehmensseiten-Beitrag/-Beiträge und {{person}} Profil-Beitrag/-Beiträge.",
      metricsPersonBadge: "Persönlich",
      metricsNotAvailableTooltip:
        "Detaillierte Statistiken sind für Beiträge auf persönlichen Profilen nicht verfügbar (LinkedIn-Einschränkung).",
      metricsSyncOk: "Aktuell",
      metricsSyncPending: "Ausstehend",
      metricsSyncFailed: "Sync fehlgeschlagen",
      refreshMetrics: "Statistiken aktualisieren",
      metricsSyncing: "Wird synchronisiert...",
      metricsSyncSuccess: "Beitrag/Beiträge synchronisiert",
      metricsSyncDeleted: "auf LinkedIn gelöscht",
      metricsSyncNoOrgPosts: "Keine Unternehmensseiten-Beiträge zum Synchronisieren.",
      metricsSyncError: "Fehler beim Synchronisieren der Statistiken.",
      authorFilterAll: "Alle",
      authorFilterOrg: "Seiten",
      authorFilterPerson: "Profil",
      scheduledUpcoming: "Geplant",
      streakLabel: "Aktuelle Serie",
      daySingular: "Tag",
      daysPlural: "Tage",
      weeklyFrequency: "Beiträge / Woche",
      postsPerDayTitle: "Veröffentlichungen pro Tag",
      bestDayOfWeek: "Bester Tag",
      bestDayCaption: "Tag, an dem du am meisten postest",
      bestHourOfDay: "Beste Stunde",
      bestHourCaption: "Deine bevorzugte Veröffentlichungszeit",
      avgPostLength: "Durchschnittliche Länge",
      avgPostLengthCaption: "Zeichen pro Beitrag",
    },
    publish: {
      publishAsLabel: "Veröffentlichen als",
      publishAsPersonSuffix: "persönliches Profil",
      publishAsOrgSuffix: "Unternehmensseite",
      publishAsPersonMetricsHint:
        "Detaillierte Statistiken (Aufrufe, Klicks, Engagement) sind für Beiträge auf persönlichen Profilen nicht verfügbar.",
      publishAsOrgMetricsHint:
        "Detaillierte Statistiken sind nach der Veröffentlichung verfügbar (Aufrufe, Klicks, Engagement über LinkedIn).",
    },
  },
  es: {
    analytics: {
      metricsInfoTitle: "Estadísticas detalladas: solo publicaciones de página de empresa",
      metricsInfoBody:
        "LinkedIn no expone visualizaciones, clics ni tasa de interacción para publicaciones en perfiles personales. Solo las publicaciones publicadas como página de empresa ofrecen estos datos vía la API. Tienes {{org}} publicación(es) de página de empresa y {{person}} publicación(es) de perfil personal.",
      metricsPersonBadge: "Personal",
      metricsNotAvailableTooltip:
        "Las estadísticas detalladas no están disponibles para publicaciones en un perfil personal (limitación de LinkedIn).",
      metricsSyncOk: "Actualizado",
      metricsSyncPending: "Pendiente",
      metricsSyncFailed: "Sync fallido",
      refreshMetrics: "Actualizar estadísticas",
      metricsSyncing: "Sincronizando...",
      metricsSyncSuccess: "publicación(es) sincronizada(s)",
      metricsSyncDeleted: "eliminadas de LinkedIn",
      metricsSyncNoOrgPosts: "Sin publicaciones de página de empresa para sincronizar.",
      metricsSyncError: "Error al sincronizar las estadísticas.",
      authorFilterAll: "Todos",
      authorFilterOrg: "Páginas",
      authorFilterPerson: "Perfil",
      scheduledUpcoming: "Programados próximos",
      streakLabel: "Racha actual",
      daySingular: "día",
      daysPlural: "días",
      weeklyFrequency: "Posts / semana",
      postsPerDayTitle: "Publicaciones por día",
      bestDayOfWeek: "Mejor día",
      bestDayCaption: "Día que más publicas",
      bestHourOfDay: "Mejor hora",
      bestHourCaption: "Hora favorita de publicación",
      avgPostLength: "Longitud promedio",
      avgPostLengthCaption: "caracteres por post",
    },
    publish: {
      publishAsLabel: "Publicar como",
      publishAsPersonSuffix: "perfil personal",
      publishAsOrgSuffix: "página de empresa",
      publishAsPersonMetricsHint:
        "Las estadísticas detalladas (vistas, clics, engagement) no están disponibles para publicaciones de perfil personal.",
      publishAsOrgMetricsHint:
        "Las estadísticas detalladas estarán disponibles tras publicar (vistas, clics, engagement vía LinkedIn).",
    },
  },
  it: {
    analytics: {
      metricsInfoTitle: "Statistiche dettagliate: solo pagine aziendali",
      metricsInfoBody:
        "LinkedIn non fornisce visualizzazioni, clic o tasso di coinvolgimento per i post sui profili personali. Solo i post pubblicati come pagina aziendale mostrano questi dati tramite API. Hai {{org}} post aziendale/i e {{person}} post di profilo personale.",
      metricsPersonBadge: "Personale",
      metricsNotAvailableTooltip:
        "Le statistiche dettagliate non sono disponibili per i post pubblicati su un profilo personale (limitazione LinkedIn).",
      metricsSyncOk: "Aggiornato",
      metricsSyncPending: "In sospeso",
      metricsSyncFailed: "Sync fallito",
      refreshMetrics: "Aggiorna statistiche",
      metricsSyncing: "Sincronizzazione...",
      metricsSyncSuccess: "post sincronizzato/i",
      metricsSyncDeleted: "eliminati da LinkedIn",
      metricsSyncNoOrgPosts: "Nessun post di pagina aziendale da sincronizzare.",
      metricsSyncError: "Errore nella sincronizzazione delle statistiche.",
      authorFilterAll: "Tutti",
      authorFilterOrg: "Pagine",
      authorFilterPerson: "Profilo",
      scheduledUpcoming: "Programmati prossimi",
      streakLabel: "Serie attuale",
      daySingular: "giorno",
      daysPlural: "giorni",
      weeklyFrequency: "Post / settimana",
      postsPerDayTitle: "Pubblicazioni al giorno",
      bestDayOfWeek: "Miglior giorno",
      bestDayCaption: "Giorno in cui pubblichi di più",
      bestHourOfDay: "Miglior ora",
      bestHourCaption: "Orario di pubblicazione preferito",
      avgPostLength: "Lunghezza media",
      avgPostLengthCaption: "caratteri per post",
    },
    publish: {
      publishAsLabel: "Pubblica come",
      publishAsPersonSuffix: "profilo personale",
      publishAsOrgSuffix: "pagina aziendale",
      publishAsPersonMetricsHint:
        "Le statistiche dettagliate (visualizzazioni, clic, engagement) non sono disponibili per i post del profilo personale.",
      publishAsOrgMetricsHint:
        "Le statistiche dettagliate saranno disponibili dopo la pubblicazione (visualizzazioni, clic, engagement tramite LinkedIn).",
    },
  },
  ja: {
    analytics: {
      metricsInfoTitle: "詳細統計：会社ページの投稿のみ",
      metricsInfoBody:
        "LinkedInでは個人プロフィールの投稿に対する閲覧数、クリック数、エンゲージメント率はAPI経由で取得できません。会社ページとして公開された投稿のみ、APIでこれらのデータを取得できます。現在 {{org}} 件の会社ページ投稿と {{person}} 件の個人プロフィール投稿があります。",
      metricsPersonBadge: "個人",
      metricsNotAvailableTooltip:
        "個人プロフィールに投稿されたポストの詳細統計は利用できません（LinkedInの制限）。",
      metricsSyncOk: "最新",
      metricsSyncPending: "保留中",
      metricsSyncFailed: "同期失敗",
      refreshMetrics: "統計を更新",
      metricsSyncing: "同期中...",
      metricsSyncSuccess: "件の投稿を同期しました",
      metricsSyncDeleted: "LinkedInから削除されました",
      metricsSyncNoOrgPosts: "同期する会社ページの投稿がありません。",
      metricsSyncError: "統計の同期に失敗しました。",
      authorFilterAll: "すべて",
      authorFilterOrg: "ページ",
      authorFilterPerson: "プロフィール",
      scheduledUpcoming: "予定中",
      streakLabel: "現在の連続記録",
      daySingular: "日",
      daysPlural: "日",
      weeklyFrequency: "投稿 / 週",
      postsPerDayTitle: "1日あたりの投稿数",
      bestDayOfWeek: "最適な曜日",
      bestDayCaption: "最も投稿する曜日",
      bestHourOfDay: "最適な時間",
      bestHourCaption: "お気に入りの投稿時間",
      avgPostLength: "平均文字数",
      avgPostLengthCaption: "1投稿あたりの文字数",
    },
    publish: {
      publishAsLabel: "投稿者として",
      publishAsPersonSuffix: "個人プロフィール",
      publishAsOrgSuffix: "会社ページ",
      publishAsPersonMetricsHint:
        "個人プロフィールの投稿では、詳細統計（閲覧数、クリック数、エンゲージメント）は利用できません。",
      publishAsOrgMetricsHint:
        "投稿後に詳細統計（閲覧数、クリック数、エンゲージメント）がLinkedIn経由で利用可能になります。",
    },
  },
  ko: {
    analytics: {
      metricsInfoTitle: "상세 통계: 회사 페이지 게시물만",
      metricsInfoBody:
        "LinkedIn은 개인 프로필 게시물의 조회수, 클릭수, 참여율을 API로 제공하지 않습니다. 회사 페이지로 게시된 게시물만 API를 통해 이러한 데이터를 얻을 수 있습니다. 현재 {{org}}개의 회사 페이지 게시물과 {{person}}개의 개인 프로필 게시물이 있습니다.",
      metricsPersonBadge: "개인",
      metricsNotAvailableTooltip:
        "개인 프로필에 게시된 게시물의 상세 통계는 사용할 수 없습니다 (LinkedIn 제한).",
      metricsSyncOk: "최신",
      metricsSyncPending: "대기 중",
      metricsSyncFailed: "동기화 실패",
      refreshMetrics: "통계 새로고침",
      metricsSyncing: "동기화 중...",
      metricsSyncSuccess: "개 게시물 동기화됨",
      metricsSyncDeleted: "LinkedIn에서 삭제됨",
      metricsSyncNoOrgPosts: "동기화할 회사 페이지 게시물이 없습니다.",
      metricsSyncError: "통계 동기화에 실패했습니다.",
      authorFilterAll: "전체",
      authorFilterOrg: "페이지",
      authorFilterPerson: "프로필",
      scheduledUpcoming: "예약 예정",
      streakLabel: "현재 연속 기록",
      daySingular: "일",
      daysPlural: "일",
      weeklyFrequency: "게시물 / 주",
      postsPerDayTitle: "일일 게시물",
      bestDayOfWeek: "최적 요일",
      bestDayCaption: "가장 많이 게시하는 요일",
      bestHourOfDay: "최적 시간",
      bestHourCaption: "선호하는 게시 시간",
      avgPostLength: "평균 길이",
      avgPostLengthCaption: "게시물당 문자 수",
    },
    publish: {
      publishAsLabel: "게시자",
      publishAsPersonSuffix: "개인 프로필",
      publishAsOrgSuffix: "회사 페이지",
      publishAsPersonMetricsHint:
        "개인 프로필 게시물에서는 상세 통계(조회수, 클릭수, 참여도)를 사용할 수 없습니다.",
      publishAsOrgMetricsHint:
        "게시 후 상세 통계(조회수, 클릭수, 참여도)가 LinkedIn을 통해 제공됩니다.",
    },
  },
  nl: {
    analytics: {
      metricsInfoTitle: "Gedetailleerde statistieken: alleen bedrijfspagina's",
      metricsInfoBody:
        "LinkedIn biedt geen weergaven, klikken of betrokkenheidspercentage voor posts op persoonlijke profielen. Alleen posts gepubliceerd als bedrijfspagina geven deze data via de API. Je hebt {{org}} bedrijfspagina-post(s) en {{person}} persoonlijk profiel-post(s).",
      metricsPersonBadge: "Persoonlijk",
      metricsNotAvailableTooltip:
        "Gedetailleerde statistieken zijn niet beschikbaar voor posts gepubliceerd op een persoonlijk profiel (LinkedIn-beperking).",
      metricsSyncOk: "Up-to-date",
      metricsSyncPending: "In afwachting",
      metricsSyncFailed: "Sync mislukt",
      refreshMetrics: "Statistieken vernieuwen",
      metricsSyncing: "Synchroniseren...",
      metricsSyncSuccess: "post(s) gesynchroniseerd",
      metricsSyncDeleted: "verwijderd van LinkedIn",
      metricsSyncNoOrgPosts: "Geen bedrijfspagina-posts om te synchroniseren.",
      metricsSyncError: "Synchronisatie van statistieken mislukt.",
      authorFilterAll: "Alle",
      authorFilterOrg: "Pagina's",
      authorFilterPerson: "Profiel",
      scheduledUpcoming: "Geplande komende",
      streakLabel: "Huidige reeks",
      daySingular: "dag",
      daysPlural: "dagen",
      weeklyFrequency: "Posts / week",
      postsPerDayTitle: "Publicaties per dag",
      bestDayOfWeek: "Beste dag",
      bestDayCaption: "Dag waarop je het meest publiceert",
      bestHourOfDay: "Beste uur",
      bestHourCaption: "Favoriete publicatie-uur",
      avgPostLength: "Gemiddelde lengte",
      avgPostLengthCaption: "tekens per post",
    },
    publish: {
      publishAsLabel: "Publiceren als",
      publishAsPersonSuffix: "persoonlijk profiel",
      publishAsOrgSuffix: "bedrijfspagina",
      publishAsPersonMetricsHint:
        "Gedetailleerde statistieken (weergaven, klikken, engagement) zijn niet beschikbaar voor posts op persoonlijk profiel.",
      publishAsOrgMetricsHint:
        "Gedetailleerde statistieken worden beschikbaar na publicatie (weergaven, klikken, engagement via LinkedIn).",
    },
  },
  pt: {
    analytics: {
      metricsInfoTitle: "Estatísticas detalhadas: apenas páginas de empresa",
      metricsInfoBody:
        "O LinkedIn não expõe visualizações, cliques ou taxa de engajamento para posts em perfis pessoais. Apenas posts publicados como página de empresa fornecem esses dados via API. Você tem {{org}} post(s) de página de empresa e {{person}} post(s) de perfil pessoal.",
      metricsPersonBadge: "Pessoal",
      metricsNotAvailableTooltip:
        "As estatísticas detalhadas não estão disponíveis para posts publicados em um perfil pessoal (limitação do LinkedIn).",
      metricsSyncOk: "Atualizado",
      metricsSyncPending: "Pendente",
      metricsSyncFailed: "Sync falhou",
      refreshMetrics: "Atualizar estatísticas",
      metricsSyncing: "Sincronizando...",
      metricsSyncSuccess: "post(s) sincronizado(s)",
      metricsSyncDeleted: "excluídos do LinkedIn",
      metricsSyncNoOrgPosts: "Nenhum post de página de empresa para sincronizar.",
      metricsSyncError: "Falha ao sincronizar as estatísticas.",
      authorFilterAll: "Todos",
      authorFilterOrg: "Páginas",
      authorFilterPerson: "Perfil",
      scheduledUpcoming: "Programados próximos",
      streakLabel: "Sequência atual",
      daySingular: "dia",
      daysPlural: "dias",
      weeklyFrequency: "Posts / semana",
      postsPerDayTitle: "Publicações por dia",
      bestDayOfWeek: "Melhor dia",
      bestDayCaption: "Dia em que você publica mais",
      bestHourOfDay: "Melhor hora",
      bestHourCaption: "Horário de publicação preferido",
      avgPostLength: "Comprimento médio",
      avgPostLengthCaption: "caracteres por post",
    },
    publish: {
      publishAsLabel: "Publicar como",
      publishAsPersonSuffix: "perfil pessoal",
      publishAsOrgSuffix: "página de empresa",
      publishAsPersonMetricsHint:
        "Estatísticas detalhadas (visualizações, cliques, engajamento) não estão disponíveis para posts de perfil pessoal.",
      publishAsOrgMetricsHint:
        "Estatísticas detalhadas estarão disponíveis após a publicação (visualizações, cliques, engajamento via LinkedIn).",
    },
  },
  zh: {
    analytics: {
      metricsInfoTitle: "详细统计：仅限公司页面帖子",
      metricsInfoBody:
        "LinkedIn 不提供个人资料帖子的浏览量、点击量或互动率 API 数据。只有以公司页面身份发布的帖子才能通过 API 获取这些数据。您目前有 {{org}} 条公司页面帖子和 {{person}} 条个人资料帖子。",
      metricsPersonBadge: "个人",
      metricsNotAvailableTooltip: "个人资料发布的帖子无法查看详细统计数据（LinkedIn 限制）。",
      metricsSyncOk: "已更新",
      metricsSyncPending: "等待中",
      metricsSyncFailed: "同步失败",
      refreshMetrics: "刷新统计",
      metricsSyncing: "同步中...",
      metricsSyncSuccess: "条帖子已同步",
      metricsSyncDeleted: "已从 LinkedIn 删除",
      metricsSyncNoOrgPosts: "没有可同步的公司页面帖子。",
      metricsSyncError: "统计数据同步失败。",
      authorFilterAll: "全部",
      authorFilterOrg: "页面",
      authorFilterPerson: "个人",
      scheduledUpcoming: "即将发布",
      streakLabel: "当前连续记录",
      daySingular: "天",
      daysPlural: "天",
      weeklyFrequency: "帖子 / 周",
      postsPerDayTitle: "每日发布数",
      bestDayOfWeek: "最佳日期",
      bestDayCaption: "您发布最多的日子",
      bestHourOfDay: "最佳时段",
      bestHourCaption: "您偏好的发布时段",
      avgPostLength: "平均长度",
      avgPostLengthCaption: "每条帖子字符数",
    },
    publish: {
      publishAsLabel: "发布身份",
      publishAsPersonSuffix: "个人资料",
      publishAsOrgSuffix: "公司页面",
      publishAsPersonMetricsHint:
        "个人资料帖子无法查看详细统计数据（浏览量、点击量、互动率）。",
      publishAsOrgMetricsHint:
        "发布后将通过 LinkedIn 提供详细统计数据（浏览量、点击量、互动率）。",
    },
  },
};

const TRANSLATIONS_DIR = path.join(__dirname, "..", "lib", "i18n", "translations");

function escapeStringValue(s) {
  // Escape backslashes and double quotes for a JS double-quoted literal.
  // Newlines should never appear in our values — guard anyway.
  return s.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n");
}

function buildAnalyticsBlock(obj) {
  const lines = [];
  lines.push("    // Metrics availability + sync (Option 2 hybrid mode)");
  for (const [key, val] of Object.entries(obj)) {
    lines.push(`    ${key}: "${escapeStringValue(val)}",`);
  }
  return lines.join("\n");
}

function buildPublishBlock(obj) {
  const lines = [];
  for (const [key, val] of Object.entries(obj)) {
    lines.push(`    ${key}: "${escapeStringValue(val)}",`);
  }
  return lines.join("\n");
}

for (const [lang, dict] of Object.entries(translations)) {
  const filePath = path.join(TRANSLATIONS_DIR, `${lang}.ts`);
  if (!fs.existsSync(filePath)) {
    console.error(`[SKIP] Missing file: ${filePath}`);
    continue;
  }

  let src = fs.readFileSync(filePath, "utf8");

  // Idempotence: if already patched, skip.
  if (src.includes("metricsInfoTitle")) {
    console.log(`[SKIP ${lang}] already has analytics keys`);
    continue;
  }

  // --- Step 1: inject analytics keys ---
  // We look for the last analytics key we know exists (verifyPosts) and add
  // our new block right after it, just before the closing `},` of the
  // analytics object. Anchoring on verifyPosts is safer than regex-matching
  // the whole block.
  const analyticsAnchor = /(verifyPosts: "[^"]*",\n)(\s*\},)/;
  const analyticsBlock = buildAnalyticsBlock(dict.analytics);
  if (!analyticsAnchor.test(src)) {
    console.error(`[FAIL ${lang}] analytics anchor (verifyPosts) not found`);
    continue;
  }
  src = src.replace(analyticsAnchor, (_m, afterVerify, closingBrace) => {
    return `${afterVerify}${analyticsBlock}\n${closingBrace}`;
  });

  // --- Step 2: inject publishAs keys ---
  // Anchor on `enableLinkedInVisibility: "..."` which exists in all 8 files.
  const publishAnchor = /(enableLinkedInVisibility: "[^"]*",\n)/;
  const publishBlock = buildPublishBlock(dict.publish);
  if (!publishAnchor.test(src)) {
    console.error(`[FAIL ${lang}] publish anchor (enableLinkedInVisibility) not found`);
    continue;
  }
  src = src.replace(publishAnchor, (_m, afterEnable) => {
    return `${afterEnable}${publishBlock}\n`;
  });

  fs.writeFileSync(filePath, src);
  console.log(`[OK ${lang}] injected ${Object.keys(dict.analytics).length} analytics + ${Object.keys(dict.publish).length} publish keys`);
}
