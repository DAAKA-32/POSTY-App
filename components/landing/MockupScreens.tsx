"use client";

import Image from "next/image";

/**
 * MockupScreens — Realistic miniature reproductions of the Posty app
 * for the landing page "Aperçu produit" carousel.
 *
 * 5 screens: Chat Welcome, Active Conversation, History, Schedule, Analytics
 * Each renders at any size via percentage-based layout.
 */

/** Reusable Posty logo at any size */
function PostyLogo({ size = 28, className = "" }: { size?: number; className?: string }) {
  return (
    <Image
      src="/logo.png"
      alt="Posty"
      width={size}
      height={size}
      className={`object-cover ${className}`}
    />
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  SHARED SIDEBAR                                                           */
/* ────────────────────────────────────────────────────────────────────────── */

const NAV_ITEMS = [
  {
    id: "chat",
    label: "Chat",
    color: "text-orange-500",
    bg: "bg-orange-500/10",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-full h-full">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
    ),
  },
  {
    id: "history",
    label: "Historique",
    color: "text-cyan-500",
    bg: "bg-cyan-500/10",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-full h-full">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    id: "schedule",
    label: "Programmé",
    color: "text-violet-500",
    bg: "bg-violet-500/10",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-full h-full">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    id: "analytics",
    label: "Analytics",
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-full h-full">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
];

const CONVERSATIONS = [
  { title: "Post leadership authentique", time: "il y a 2h", pinned: true },
  { title: "Retour d'expérience startup", time: "Hier" },
  { title: "5 erreurs en recrutement", time: "Lun." },
];

function MockSidebar({ activePage }: { activePage: string }) {
  return (
    <div className="w-[18%] min-w-0 bg-[#FFFBF9] border-r border-[#F8935D]/10 flex flex-col h-full select-none">
      {/* Logo */}
      <div className="px-[8%] pt-[6%] pb-[4%] flex items-center gap-[6%]">
        <div className="w-[28px] h-[28px] min-w-[28px] rounded-xl shadow-md overflow-hidden">
          <PostyLogo size={28} className="w-full h-full" />
        </div>
        <span className="text-[12px] font-bold text-gray-900 truncate">Posty</span>
      </div>

      {/* New post button */}
      <div className="px-[8%] mb-[6%]">
        <div className="h-[30px] rounded-xl bg-orange-500 flex items-center justify-center gap-[4px] text-white shadow-md">
          <svg className="w-[12px] h-[12px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
          </svg>
          <span className="text-[10px] font-semibold">Nouveau post</span>
        </div>
      </div>

      {/* Nav items */}
      <div className="px-[6%] space-y-[2px] flex-1 min-h-0">
        {NAV_ITEMS.map((item) => {
          const isActive = activePage === item.id;
          return (
            <div
              key={item.id}
              className={`px-[8px] py-[5px] rounded-lg flex items-center gap-[6px] ${
                isActive ? `${item.bg} ${item.color}` : "text-gray-400"
              }`}
            >
              <div className={`w-[14px] h-[14px] flex-shrink-0 ${isActive ? item.color : "text-gray-400"}`}>
                {item.icon}
              </div>
              <span className="text-[10px] font-medium truncate">{item.label}</span>
              {item.id === "schedule" && (
                <span className="ml-auto text-[8px] font-bold bg-violet-100 text-violet-600 px-[5px] py-[1px] rounded-full">3</span>
              )}
            </div>
          );
        })}

        {/* Conversations */}
        <div className="mt-[10px] pt-[8px]">
          <div className="flex items-center justify-between px-[4px] mb-[4px]">
            <span className="text-[8px] font-bold uppercase tracking-wider text-gray-400">Conversations</span>
            <span className="text-[7px] font-semibold text-blue-500 bg-blue-50 px-[4px] py-[1px] rounded-full">7</span>
          </div>
          <div className="space-y-[1px]">
            {CONVERSATIONS.map((conv, i) => (
              <div
                key={i}
                className={`px-[6px] py-[4px] rounded-md flex items-center gap-[5px] ${
                  i === 0 ? "bg-[#F8935D]/10 border-l-2 border-[#F8935D]" : "text-gray-500"
                }`}
              >
                <svg className="w-[10px] h-[10px] flex-shrink-0 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
                <span className={`text-[8px] truncate ${i === 0 ? "font-medium text-gray-900" : "text-gray-500"}`}>
                  {conv.title}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Profile */}
      <div className="px-[8%] py-[6%] border-t border-gray-200/60 flex items-center gap-[6px]">
        <div className="w-[24px] h-[24px] min-w-[24px] rounded-full bg-gradient-to-br from-orange-400 to-pink-400 flex items-center justify-center">
          <span className="text-white text-[7px] font-bold">ÉM</span>
        </div>
        <div className="min-w-0">
          <div className="text-[9px] font-medium text-gray-900 truncate leading-tight">Émilie Martin</div>
          <div className="text-[7px] text-gray-400 leading-tight">Plan Pro</div>
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  SCREEN 1 — Chat Welcome                                                 */
/* ────────────────────────────────────────────────────────────────────────── */

function ChatWelcomeScreen() {
  return (
    <div className="flex h-full bg-[#FFFBF9]">
      <MockSidebar activePage="chat" />
      <div className="flex-1 flex flex-col min-w-0">
        {/* Welcome content — centered */}
        <div className="flex-1 flex flex-col items-center justify-center px-[8%] pb-[8%]">
          {/* Logo with glow */}
          <div className="relative mb-[12px]">
            <div className="absolute -inset-[12px] bg-gradient-to-br from-[#F8935D]/25 via-[#F76B54]/15 to-[#F8935D]/25 rounded-full blur-xl opacity-50" />
            <div className="relative w-[48px] h-[48px] rounded-2xl shadow-lg overflow-hidden">
              <PostyLogo size={48} className="w-full h-full" />
            </div>
          </div>

          {/* Greeting */}
          <h2 className="text-[16px] font-bold text-gray-900 mb-[3px]">
            Bonjour, Émilie !
          </h2>
          <p className="text-[10px] text-gray-500 mb-[16px] text-center max-w-[280px]">
            Décrivez votre idée et je générerai <span className="font-semibold text-[#F8935D]">2 versions optimisées</span> de votre post LinkedIn
          </p>

          {/* Template suggestions */}
          <div className="flex flex-wrap justify-center gap-[6px] mb-[12px]">
            {["✍️ Post leadership", "📈 Retour d'exp.", "💡 Leçon apprise", "🎯 Conseil pro"].map((t) => (
              <div
                key={t}
                className="px-[8px] py-[4px] bg-white border border-gray-200 rounded-lg text-[8px] text-gray-600 shadow-sm"
              >
                {t}
              </div>
            ))}
          </div>
        </div>

        {/* Input bar */}
        <div className="px-[6%] pb-[4%]">
          <div className="relative bg-white border border-gray-200 rounded-[16px] shadow-sm">
            <div className="px-[14px] py-[10px] text-[10px] text-gray-400">
              Décrivez votre post LinkedIn...
            </div>
            <div className="absolute right-[8px] bottom-[6px] flex items-center gap-[4px]">
              <div className="w-[24px] h-[24px] rounded-full bg-gray-100 flex items-center justify-center">
                <svg className="w-[11px] h-[11px] text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              </div>
              <div className="w-[24px] h-[24px] rounded-full bg-gray-200 flex items-center justify-center">
                <svg className="w-[11px] h-[11px] text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  SCREEN 2 — Active Conversation                                          */
/* ────────────────────────────────────────────────────────────────────────── */

function ConversationScreen() {
  return (
    <div className="flex h-full bg-[#FFFBF9]">
      <MockSidebar activePage="chat" />
      <div className="flex-1 flex flex-col min-w-0">
        {/* Messages */}
        <div className="flex-1 overflow-hidden px-[6%] py-[4%] space-y-[10px]">
          {/* User message */}
          <div className="flex justify-end">
            <div className="max-w-[65%] bg-[#F8935D]/10 border border-[#F8935D]/20 rounded-2xl rounded-br-sm px-[12px] py-[8px]">
              <p className="text-[9px] text-gray-800 leading-relaxed">
                Un post sur le leadership authentique en startup. Je veux partager mes 3 leçons après 2 ans de management.
              </p>
            </div>
          </div>

          {/* AI response */}
          <div className="flex items-start gap-[6px]">
            <div className="w-[22px] h-[22px] min-w-[22px] rounded-lg shadow-sm overflow-hidden">
              <PostyLogo size={22} className="w-full h-full" />
            </div>
            <div className="space-y-[6px] min-w-0 max-w-[75%]">
              <p className="text-[9px] text-gray-600 leading-relaxed">
                Voici 2 versions de votre post sur le leadership authentique :
              </p>

              {/* Generated post card */}
              <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                <div className="px-[10px] py-[6px] border-b border-gray-100 flex items-center justify-between">
                  <span className="text-[8px] font-semibold text-[#F8935D]">Version 1 — Storytelling</span>
                  <div className="flex gap-[3px]">
                    <div className="w-[18px] h-[18px] rounded-md bg-gray-50 flex items-center justify-center">
                      <svg className="w-[10px] h-[10px] text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </div>
                  </div>
                </div>
                <div className="px-[10px] py-[8px]">
                  <p className="text-[8px] text-gray-700 leading-relaxed">
                    Il y a 2 ans, je suis devenu manager.<br />
                    <br />
                    Personne ne m&apos;avait prévenu à quel point ce serait difficile.<br />
                    <br />
                    Voici les 3 leçons que j&apos;aurais aimé connaître plus tôt :<br />
                    <br />
                    <span className="font-medium">1. L&apos;écoute {">"} la parole</span><br />
                    Les meilleurs leaders écoutent 80% du temps...<br />
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Input bar */}
        <div className="px-[6%] pb-[4%]">
          <div className="relative bg-white border border-[#F8935D]/20 rounded-[16px] shadow-[0_0_16px_rgba(248,147,93,0.15)]">
            <div className="px-[14px] py-[10px] text-[10px] text-gray-400">
              Modifiez ou demandez une autre version...
            </div>
            <div className="absolute right-[8px] bottom-[6px] flex items-center gap-[4px]">
              <div className="w-[24px] h-[24px] rounded-full bg-gray-100 flex items-center justify-center">
                <svg className="w-[11px] h-[11px] text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              </div>
              <div className="w-[24px] h-[24px] rounded-full bg-gradient-to-r from-[#F8935D] to-[#F76B54] flex items-center justify-center">
                <svg className="w-[11px] h-[11px] text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  SCREEN 3 — History                                                       */
/* ────────────────────────────────────────────────────────────────────────── */

const HISTORY_POSTS = [
  { title: "Le leadership authentique en startup", date: "15 fév. 2026", status: "Publié", statusColor: "bg-emerald-100 text-emerald-600" },
  { title: "5 erreurs que j'ai faites en recrutement", date: "12 fév. 2026", status: "Publié", statusColor: "bg-emerald-100 text-emerald-600" },
  { title: "Comment j'ai doublé mon engagement LinkedIn", date: "10 fév. 2026", status: "Programmé", statusColor: "bg-violet-100 text-violet-600" },
  { title: "Retour d'expérience : pivot produit à 6 mois", date: "8 fév. 2026", status: "Brouillon", statusColor: "bg-gray-100 text-gray-500" },
];

function HistoryScreen() {
  return (
    <div className="flex h-full bg-[#FAFAF8]">
      <MockSidebar activePage="history" />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <div className="px-[6%] py-[5%] space-y-[10px]">
          {/* Header */}
          <div>
            <h1 className="text-[16px] font-bold text-gray-900">Historique</h1>
            <p className="text-[9px] text-gray-500 mt-[2px]">
              <span className="font-medium text-gray-900">12</span> posts générés
            </p>
          </div>

          {/* Search */}
          <div className="relative">
            <svg className="absolute left-[8px] top-1/2 -translate-y-1/2 w-[12px] h-[12px] text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <div className="w-full pl-[26px] pr-[10px] py-[6px] bg-white border border-gray-200 rounded-xl text-[9px] text-gray-400">
              Rechercher un post...
            </div>
          </div>

          {/* Post cards */}
          <div className="space-y-[6px]">
            {HISTORY_POSTS.map((post, i) => (
              <div
                key={i}
                className="bg-white border border-gray-200 rounded-xl px-[12px] py-[8px] flex items-center justify-between hover:shadow-sm transition-shadow"
              >
                <div className="min-w-0 flex-1">
                  <h3 className="text-[9px] font-semibold text-gray-900 truncate">{post.title}</h3>
                  <p className="text-[7px] text-gray-400 mt-[1px]">{post.date}</p>
                </div>
                <span className={`ml-[8px] text-[7px] font-medium px-[6px] py-[2px] rounded-full flex-shrink-0 ${post.statusColor}`}>
                  {post.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  SCREEN 4 — Schedule                                                      */
/* ────────────────────────────────────────────────────────────────────────── */

function ScheduleScreen() {
  const days = Array.from({ length: 28 }, (_, i) => i + 1);
  const scheduledDays = [3, 7, 12, 18, 22, 25];

  return (
    <div className="flex h-full bg-[#FAFAF8]">
      <MockSidebar activePage="schedule" />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <div className="px-[6%] py-[5%] space-y-[10px]">
          {/* Header */}
          <div>
            <h1 className="text-[16px] font-bold text-gray-900">Posts programmés</h1>
            <p className="text-[9px] text-gray-500 mt-[2px]">
              <span className="font-medium text-gray-900">3</span> posts à venir
            </p>
          </div>

          {/* Mini calendar */}
          <div className="bg-white border border-gray-200 rounded-xl p-[10px]">
            {/* Month header */}
            <div className="flex items-center justify-between mb-[6px]">
              <span className="text-[10px] font-semibold text-gray-900">Février 2026</span>
              <div className="flex gap-[4px]">
                <div className="w-[16px] h-[16px] rounded-md bg-gray-50 flex items-center justify-center text-gray-400">
                  <svg className="w-[8px] h-[8px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                  </svg>
                </div>
                <div className="w-[16px] h-[16px] rounded-md bg-gray-50 flex items-center justify-center text-gray-400">
                  <svg className="w-[8px] h-[8px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Day labels */}
            <div className="grid grid-cols-7 gap-[2px] mb-[4px]">
              {["L", "M", "M", "J", "V", "S", "D"].map((d, i) => (
                <div key={i} className="text-center text-[7px] font-medium text-gray-400">{d}</div>
              ))}
            </div>

            {/* Days grid */}
            <div className="grid grid-cols-7 gap-[2px]">
              {/* Empty cells for offset (Feb 2026 starts on Sunday) */}
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={`e${i}`} className="aspect-square" />
              ))}
              {days.map((day) => {
                const isScheduled = scheduledDays.includes(day);
                const isToday = day === 17;
                return (
                  <div
                    key={day}
                    className={`aspect-square rounded-md flex flex-col items-center justify-center relative ${
                      isToday ? "bg-[#F8935D]/10 ring-1 ring-[#F8935D]/30" : ""
                    }`}
                  >
                    <span className={`text-[7px] ${isToday ? "font-bold text-[#F8935D]" : "text-gray-600"}`}>
                      {day}
                    </span>
                    {isScheduled && (
                      <div className="w-[3px] h-[3px] rounded-full bg-violet-500 mt-[1px]" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Scheduled posts */}
          <div className="space-y-[4px]">
            {[
              { title: "Comment j'ai doublé mon engagement", date: "18 fév. — 09:00", color: "border-l-violet-500" },
              { title: "Les 3 outils qui ont changé ma productivité", date: "22 fév. — 11:30", color: "border-l-violet-500" },
            ].map((post, i) => (
              <div key={i} className={`bg-white border border-gray-200 border-l-2 ${post.color} rounded-xl px-[10px] py-[6px]`}>
                <h3 className="text-[8px] font-semibold text-gray-900 truncate">{post.title}</h3>
                <p className="text-[7px] text-violet-500 mt-[1px]">{post.date}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  SCREEN 5 — Analytics                                                     */
/* ────────────────────────────────────────────────────────────────────────── */

function AnalyticsScreen() {
  const barData = [35, 52, 45, 68, 42, 78, 55, 90, 62, 73, 85, 95];

  return (
    <div className="flex h-full bg-[#FAFAF8]">
      <MockSidebar activePage="analytics" />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <div className="px-[6%] py-[5%] space-y-[10px]">
          {/* Header */}
          <div>
            <h1 className="text-[16px] font-bold text-gray-900">Analytics</h1>
            <p className="text-[9px] text-gray-500 mt-[2px]">Performance de vos posts</p>
          </div>

          {/* KPI cards */}
          <div className="grid grid-cols-3 gap-[6px]">
            {[
              { label: "Posts", value: "47", change: "+12%", color: "text-[#F8935D]", bg: "bg-[#F8935D]/10" },
              { label: "Impressions", value: "12.3K", change: "+28%", color: "text-cyan-500", bg: "bg-cyan-500/10" },
              { label: "Engagement", value: "8.7%", change: "+15%", color: "text-emerald-500", bg: "bg-emerald-500/10" },
            ].map((kpi, i) => (
              <div key={i} className="bg-white border border-gray-200 rounded-xl px-[10px] py-[8px]">
                <div className="flex items-center gap-[4px] mb-[4px]">
                  <div className={`w-[16px] h-[16px] rounded-md ${kpi.bg} flex items-center justify-center`}>
                    <div className={`w-[8px] h-[8px] rounded-sm ${kpi.bg}`} />
                  </div>
                  <span className="text-[7px] text-gray-500">{kpi.label}</span>
                </div>
                <div className="flex items-baseline gap-[4px]">
                  <span className="text-[14px] font-bold text-gray-900">{kpi.value}</span>
                  <span className="text-[7px] font-medium text-emerald-500">{kpi.change}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Chart area */}
          <div className="bg-white border border-gray-200 rounded-xl p-[10px]">
            <div className="flex items-center justify-between mb-[8px]">
              <span className="text-[9px] font-semibold text-gray-900">Impressions (12 dernières semaines)</span>
              <div className="flex gap-[4px]">
                {["7j", "30j", "90j"].map((period, i) => (
                  <div
                    key={period}
                    className={`px-[6px] py-[2px] rounded-md text-[7px] font-medium ${
                      i === 2 ? "bg-[#F8935D]/10 text-[#F8935D]" : "text-gray-400"
                    }`}
                  >
                    {period}
                  </div>
                ))}
              </div>
            </div>

            {/* Bar chart */}
            <div className="flex items-end gap-[4px] h-[60px]">
              {barData.map((val, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-[2px]">
                  <div
                    className="w-full rounded-t-sm bg-gradient-to-t from-[#F8935D] to-[#F8935D]/60"
                    style={{ height: `${(val / 100) * 52}px` }}
                  />
                  {i % 3 === 0 && (
                    <span className="text-[6px] text-gray-400">S{i / 3 + 1}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  EXPORTS                                                                  */
/* ────────────────────────────────────────────────────────────────────────── */

export const MOCKUP_SCREENS = [
  { id: "chat-welcome", component: ChatWelcomeScreen, label: "Chat" },
  { id: "conversation", component: ConversationScreen, label: "Conversation" },
  { id: "history", component: HistoryScreen, label: "Historique" },
  { id: "schedule", component: ScheduleScreen, label: "Programmé" },
  { id: "analytics", component: AnalyticsScreen, label: "Analytics" },
];
