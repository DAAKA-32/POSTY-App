"use client";

import Image from "next/image";

/**
 * MockupScreens — Realistic miniature reproductions of the Posty app
 * for the landing page "Aperçu produit" carousel.
 *
 * 6 screens: Chat Welcome, Dual Conversation, History, Schedule, Analytics, Profile
 * Each renders at any size via percentage-based layout.
 * Faithfully reproduces the real app UI: sidebar, colors, effects, typography.
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
/*  SHARED SIDEBAR — Faithful to MainLayout.tsx                              */
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
  { title: "Tendances IA 2026", time: "Dim." },
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
      <div className="px-[8%] mb-[4%]">
        <div className="h-[30px] rounded-xl bg-gradient-to-r from-[#F8935D] to-[#F76B54] flex items-center justify-center gap-[4px] text-white shadow-md shadow-[#F8935D]/20">
          <svg className="w-[12px] h-[12px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
          </svg>
          <span className="text-[10px] font-semibold">Nouveau post</span>
        </div>
      </div>

      {/* Search bar — like real app Cmd+K */}
      <div className="px-[8%] mb-[5%]">
        <div className="flex items-center gap-[4px] px-[6px] py-[4px] bg-white/60 border border-gray-200/60 rounded-lg">
          <svg className="w-[10px] h-[10px] text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <span className="text-[8px] text-gray-400 truncate">Rechercher...</span>
          <span className="ml-auto text-[7px] text-gray-300 bg-gray-100 px-[3px] rounded">⌘K</span>
        </div>
      </div>

      {/* Nav items */}
      <div className="px-[6%] space-y-[2px] flex-1 min-h-0">
        {NAV_ITEMS.map((item) => {
          const isActive = activePage === item.id;
          return (
            <div
              key={item.id}
              className={`px-[8px] py-[5px] rounded-lg flex items-center gap-[6px] transition-colors ${
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

        {/* Conversations list */}
        <div className="mt-[10px] pt-[8px] border-t border-gray-100">
          <div className="flex items-center justify-between px-[4px] mb-[4px]">
            <span className="text-[8px] font-bold uppercase tracking-wider text-gray-400">Conversations</span>
            <span className="text-[7px] font-semibold text-[#F8935D] bg-[#F8935D]/10 px-[4px] py-[1px] rounded-full">7</span>
          </div>

          {/* Pinned section */}
          <div className="mb-[3px]">
            <div className="flex items-center gap-[3px] px-[4px] mb-[2px]">
              <svg className="w-[7px] h-[7px] text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.828.722a.5.5 0 01.354 0l.707.293a.5.5 0 01.293.354l.293.707a.5.5 0 010 .354l-.293.707a.5.5 0 01-.354.293l-.707.293a.5.5 0 01-.354 0l-.707-.293a.5.5 0 01-.293-.354l-.293-.707a.5.5 0 010-.354l.293-.707A.5.5 0 019.12.722z"/>
              </svg>
              <span className="text-[7px] text-gray-400 font-medium">Épinglés</span>
            </div>
          </div>

          <div className="space-y-[1px]">
            {CONVERSATIONS.map((conv, i) => (
              <div
                key={i}
                className={`px-[6px] py-[4px] rounded-md flex items-center gap-[5px] ${
                  i === 0 ? "bg-[#F8935D]/8 border-l-2 border-[#F8935D]" : "text-gray-500"
                }`}
              >
                <svg className="w-[10px] h-[10px] flex-shrink-0 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
                <div className="min-w-0 flex-1">
                  <span className={`text-[8px] truncate block ${i === 0 ? "font-medium text-gray-900" : "text-gray-500"}`}>
                    {conv.title}
                  </span>
                  <span className="text-[6px] text-gray-400">{conv.time}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Profile — like real MainLayout */}
      <div className="px-[8%] py-[6%] border-t border-gray-200/60 flex items-center gap-[6px]">
        <div className="w-[24px] h-[24px] min-w-[24px] rounded-full bg-gradient-to-br from-orange-400 to-pink-400 flex items-center justify-center shadow-sm">
          <span className="text-white text-[7px] font-bold">ÉM</span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[9px] font-medium text-gray-900 truncate leading-tight">Émilie Martin</div>
          <div className="text-[7px] text-gray-400 leading-tight flex items-center gap-[3px]">
            Plan Max
            <span className="w-[4px] h-[4px] rounded-full bg-emerald-400" />
          </div>
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
        <div className="flex-1 flex flex-col items-center justify-center px-[8%] pb-[4%]">
          {/* Logo with multi-layer glow — like real app */}
          <div className="relative mb-[12px]">
            <div className="absolute -inset-[16px] bg-gradient-to-br from-[#F8935D]/20 via-[#F76B54]/10 to-[#F8935D]/20 rounded-full blur-xl opacity-60" />
            <div className="absolute -inset-[8px] bg-[#F8935D]/10 rounded-full blur-md" />
            <div className="relative w-[48px] h-[48px] rounded-2xl shadow-lg shadow-[#F8935D]/15 overflow-hidden ring-1 ring-white/50">
              <PostyLogo size={48} className="w-full h-full" />
            </div>
          </div>

          {/* Greeting with shimmer name — like real app */}
          <h2 className="text-[16px] font-bold text-gray-900 mb-[2px]">
            Bonjour, <span className="bg-gradient-to-r from-[#F8935D] to-[#F76B54] bg-clip-text text-transparent">Émilie</span> !
          </h2>
          <p className="text-[10px] text-gray-500 mb-[14px] text-center max-w-[280px] leading-relaxed">
            Décrivez votre idée et je générerai <span className="font-semibold text-[#F8935D]">2 versions optimisées</span> de votre post LinkedIn
          </p>

          {/* Template suggestions — like real CompactPostTemplates */}
          <div className="grid grid-cols-2 gap-[5px] w-full max-w-[300px] mb-[10px]">
            {[
              { emoji: "✍️", label: "Post leadership", desc: "Partagez votre vision" },
              { emoji: "📈", label: "Retour d'expérience", desc: "Vos apprentissages" },
              { emoji: "💡", label: "Leçon apprise", desc: "Vos insights clés" },
              { emoji: "🎯", label: "Conseil pro", desc: "Tips & stratégies" },
            ].map((t) => (
              <div
                key={t.label}
                className="px-[8px] py-[6px] bg-white border border-gray-200 rounded-xl shadow-sm hover:border-[#F8935D]/30 transition-colors"
              >
                <div className="flex items-center gap-[4px] mb-[2px]">
                  <span className="text-[10px]">{t.emoji}</span>
                  <span className="text-[8px] font-medium text-gray-800">{t.label}</span>
                </div>
                <span className="text-[7px] text-gray-400">{t.desc}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Input bar — matches real UniversalChatInput */}
        <div className="px-[6%] pb-[4%]">
          {/* Dual mode toggle — like real DualModeToggle */}
          <div className="flex justify-center mb-[6px]">
            <div className="inline-flex bg-gray-100 rounded-lg p-[2px]">
              <div className="px-[8px] py-[3px] rounded-md bg-white shadow-sm text-[7px] font-medium text-gray-900">Storytelling</div>
              <div className="px-[8px] py-[3px] rounded-md text-[7px] font-medium text-gray-400">Business</div>
            </div>
          </div>
          <div className="relative bg-white border border-gray-200 rounded-[16px] shadow-sm">
            <div className="px-[14px] py-[10px] text-[10px] text-gray-400">
              Décrivez votre post LinkedIn...
            </div>
            <div className="absolute right-[8px] bottom-[6px] flex items-center gap-[4px]">
              <div className="w-[22px] h-[22px] rounded-full bg-gray-100 flex items-center justify-center">
                <svg className="w-[10px] h-[10px] text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                </svg>
              </div>
              <div className="w-[22px] h-[22px] rounded-full bg-gray-100 flex items-center justify-center">
                <svg className="w-[10px] h-[10px] text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              </div>
              <div className="w-[22px] h-[22px] rounded-full bg-gray-200 flex items-center justify-center">
                <svg className="w-[10px] h-[10px] text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                </svg>
              </div>
            </div>
          </div>
          <p className="text-[6px] text-gray-400 text-center mt-[4px]">POSTY peut faire des erreurs. Vérifiez les informations importantes.</p>
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  SCREEN 2 — Active Conversation with DUAL Responses (MAX Plan feature)   */
/* ────────────────────────────────────────────────────────────────────────── */

function ConversationScreen() {
  return (
    <div className="flex h-full bg-[#FFFBF9]">
      <MockSidebar activePage="chat" />
      <div className="flex-1 flex flex-col min-w-0">
        {/* Messages area */}
        <div className="flex-1 overflow-hidden px-[5%] py-[3%] space-y-[8px]">
          {/* User message */}
          <div className="flex items-start gap-[5px] justify-end">
            <div className="max-w-[60%] bg-[#F8935D]/8 border border-[#F8935D]/15 rounded-2xl rounded-br-sm px-[10px] py-[7px]">
              <p className="text-[8px] text-gray-800 leading-relaxed">
                Un post sur le leadership authentique en startup. Je veux partager mes 3 leçons après 2 ans de management.
              </p>
              <p className="text-[6px] text-gray-400 mt-[3px] text-right">14:32</p>
            </div>
            <div className="w-[20px] h-[20px] min-w-[20px] rounded-full bg-gradient-to-br from-orange-400 to-pink-400 flex items-center justify-center">
              <span className="text-white text-[6px] font-bold">ÉM</span>
            </div>
          </div>

          {/* AI intro message */}
          <div className="flex items-start gap-[5px]">
            <div className="w-[20px] h-[20px] min-w-[20px] rounded-lg shadow-sm overflow-hidden">
              <PostyLogo size={20} className="w-full h-full" />
            </div>
            <p className="text-[8px] text-gray-500 leading-relaxed pt-[3px]">
              Voici <span className="font-semibold text-[#F8935D]">2 versions</span> de votre post :
            </p>
          </div>

          {/* DUAL Response Cards — side by side like real MAX plan */}
          <div className="flex gap-[6px] ml-[25px]">
            {/* Version 1 — Storytelling */}
            <div className="flex-1 bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
              <div className="px-[8px] py-[5px] border-b border-gray-100 bg-gradient-to-r from-[#F85751]/5 to-transparent flex items-center gap-[4px]">
                <span className="inline-flex items-center gap-[3px] px-[5px] py-[2px] text-[7px] font-semibold rounded-full bg-[#F85751]/10 text-[#F85751] border border-[#F85751]/20">
                  <svg className="w-[7px] h-[7px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                  </svg>
                  Storytelling
                </span>
              </div>
              <div className="px-[8px] py-[6px]">
                <p className="text-[7px] text-gray-700 leading-relaxed">
                  Il y a 2 ans, je suis devenu manager.<br />
                  <br />
                  Personne ne m&apos;avait prévenu à quel point ce serait difficile.<br />
                  <br />
                  <span className="font-medium">Voici les 3 leçons</span> que j&apos;aurais aimé connaître plus tôt :<br />
                  <br />
                  <span className="font-medium">1. L&apos;écoute {">"} la parole</span><br />
                  Les meilleurs leaders écoutent 80% du temps...
                </p>
              </div>
              {/* Actions */}
              <div className="px-[6px] py-[4px] border-t border-gray-100 flex gap-[3px]">
                <div className="flex-1 py-[3px] rounded-md text-center text-[6px] text-gray-500 bg-gray-50 font-medium flex items-center justify-center gap-[2px]">
                  <svg className="w-[7px] h-[7px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Copier
                </div>
                <div className="flex-1 py-[3px] rounded-md text-center text-[6px] text-white bg-[#0A66C2] font-medium flex items-center justify-center gap-[2px]">
                  <svg className="w-[7px] h-[7px]" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                  </svg>
                  Publier
                </div>
                <div className="py-[3px] px-[5px] rounded-md text-[6px] text-violet-500 bg-violet-50 font-medium flex items-center justify-center">
                  <svg className="w-[7px] h-[7px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Version 2 — Business */}
            <div className="flex-1 bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
              <div className="px-[8px] py-[5px] border-b border-gray-100 bg-gradient-to-r from-[#F8935D]/5 to-transparent flex items-center gap-[4px]">
                <span className="inline-flex items-center gap-[3px] px-[5px] py-[2px] text-[7px] font-semibold rounded-full bg-[#F8935D]/10 text-[#F8935D] border border-[#F8935D]/20">
                  <svg className="w-[7px] h-[7px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  Business
                </span>
              </div>
              <div className="px-[8px] py-[6px]">
                <p className="text-[7px] text-gray-700 leading-relaxed">
                  3 leçons de management que j&apos;aurais aimé apprendre plus tôt.<br />
                  <br />
                  Après 2 ans à diriger une équipe en startup :<br />
                  <br />
                  <span className="font-medium">Leçon 1 : Écouter {">"} Parler</span><br />
                  Les données montrent que les équipes dont le manager écoute activement...
                </p>
              </div>
              {/* Actions */}
              <div className="px-[6px] py-[4px] border-t border-gray-100 flex gap-[3px]">
                <div className="flex-1 py-[3px] rounded-md text-center text-[6px] text-gray-500 bg-gray-50 font-medium flex items-center justify-center gap-[2px]">
                  <svg className="w-[7px] h-[7px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Copier
                </div>
                <div className="flex-1 py-[3px] rounded-md text-center text-[6px] text-white bg-[#0A66C2] font-medium flex items-center justify-center gap-[2px]">
                  <svg className="w-[7px] h-[7px]" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                  </svg>
                  Publier
                </div>
                <div className="py-[3px] px-[5px] rounded-md text-[6px] text-violet-500 bg-violet-50 font-medium flex items-center justify-center">
                  <svg className="w-[7px] h-[7px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Input bar — active state with orange glow */}
        <div className="px-[5%] pb-[3%]">
          <div className="relative bg-white border border-[#F8935D]/20 rounded-[16px] shadow-[0_0_12px_rgba(248,147,93,0.12)]">
            <div className="px-[12px] py-[9px] text-[9px] text-gray-400">
              Modifiez ou demandez une autre version...
            </div>
            <div className="absolute right-[7px] bottom-[5px] flex items-center gap-[3px]">
              <div className="w-[22px] h-[22px] rounded-full bg-gray-100 flex items-center justify-center">
                <svg className="w-[10px] h-[10px] text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              </div>
              <div className="w-[22px] h-[22px] rounded-full bg-gradient-to-r from-[#F8935D] to-[#F76B54] flex items-center justify-center shadow-sm shadow-[#F8935D]/20">
                <svg className="w-[10px] h-[10px] text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
/*  SCREEN 3 — History with grouped dates, pins, version badges              */
/* ────────────────────────────────────────────────────────────────────────── */

const HISTORY_GROUPS = [
  {
    label: "Épinglés",
    isPinned: true,
    posts: [
      { title: "Le leadership authentique en startup", version: "Storytelling", date: "15 fév.", status: "Publié", statusColor: "bg-emerald-100 text-emerald-600" },
    ],
  },
  {
    label: "Aujourd'hui",
    posts: [
      { title: "5 erreurs que j'ai faites en recrutement", version: "Business", date: "18 fév.", status: "Publié", statusColor: "bg-emerald-100 text-emerald-600" },
    ],
  },
  {
    label: "Hier",
    posts: [
      { title: "Comment j'ai doublé mon engagement LinkedIn", version: "Storytelling", date: "17 fév.", status: "Programmé", statusColor: "bg-violet-100 text-violet-600" },
      { title: "Retour d'expérience : pivot produit", version: "Business", date: "17 fév.", status: "Brouillon", statusColor: "bg-gray-100 text-gray-500" },
    ],
  },
];

function HistoryScreen() {
  return (
    <div className="flex h-full bg-[#FAFAF8]">
      <MockSidebar activePage="history" />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <div className="px-[6%] py-[4%] space-y-[8px]">
          {/* Header with back button */}
          <div className="flex items-center gap-[6px]">
            <div className="w-[20px] h-[20px] rounded-lg bg-gray-100 flex items-center justify-center">
              <svg className="w-[10px] h-[10px] text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
              </svg>
            </div>
            <div>
              <h1 className="text-[14px] font-bold text-gray-900">Historique</h1>
              <p className="text-[8px] text-gray-500">
                <span className="font-medium text-gray-900">12</span> posts générés
              </p>
            </div>
          </div>

          {/* Stats row — like real app */}
          <div className="grid grid-cols-3 gap-[4px]">
            {[
              { label: "Total", value: "12", icon: "📝" },
              { label: "Publiés", value: "8", icon: "✅" },
              { label: "Programmés", value: "3", icon: "📅" },
            ].map((s) => (
              <div key={s.label} className="bg-white border border-gray-200 rounded-lg px-[6px] py-[5px] text-center">
                <span className="text-[9px]">{s.icon}</span>
                <div className="text-[11px] font-bold text-gray-900">{s.value}</div>
                <div className="text-[6px] text-gray-400">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Search */}
          <div className="relative">
            <svg className="absolute left-[8px] top-1/2 -translate-y-1/2 w-[11px] h-[11px] text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <div className="w-full pl-[24px] pr-[10px] py-[5px] bg-white border border-gray-200 rounded-xl text-[8px] text-gray-400">
              Rechercher un post...
            </div>
          </div>

          {/* Grouped posts */}
          <div className="space-y-[8px]">
            {HISTORY_GROUPS.map((group) => (
              <div key={group.label}>
                {/* Group header */}
                <div className="flex items-center gap-[4px] mb-[4px]">
                  {group.isPinned && (
                    <svg className="w-[8px] h-[8px] text-[#F8935D]" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.828.722a.5.5 0 01.354 0l.707.293a.5.5 0 01.293.354l.293.707a.5.5 0 010 .354l-.293.707a.5.5 0 01-.354.293l-.707.293a.5.5 0 01-.354 0l-.707-.293a.5.5 0 01-.293-.354l-.293-.707a.5.5 0 010-.354l.293-.707A.5.5 0 019.12.722z"/>
                    </svg>
                  )}
                  <span className="text-[8px] font-bold text-gray-500 uppercase tracking-wider">{group.label}</span>
                  <span className="text-[7px] font-medium text-gray-400 bg-gray-100 px-[4px] py-[1px] rounded-full">{group.posts.length}</span>
                  <div className="flex-1 h-[1px] bg-gray-200/60 ml-[4px]" />
                </div>

                {/* Post cards */}
                <div className="space-y-[4px]">
                  {group.posts.map((post, i) => (
                    <div
                      key={i}
                      className="bg-white border border-gray-200 rounded-xl px-[10px] py-[7px] flex items-center justify-between"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-[4px] mb-[2px]">
                          <h3 className="text-[8px] font-semibold text-gray-900 truncate">{post.title}</h3>
                        </div>
                        <div className="flex items-center gap-[4px]">
                          <span className={`text-[6px] font-medium px-[4px] py-[1px] rounded-full ${
                            post.version === "Storytelling" ? "bg-[#F85751]/10 text-[#F85751]" : "bg-[#F8935D]/10 text-[#F8935D]"
                          }`}>
                            {post.version}
                          </span>
                          <span className="text-[6px] text-gray-400">{post.date}</span>
                        </div>
                      </div>
                      <span className={`ml-[6px] text-[6px] font-medium px-[5px] py-[2px] rounded-full flex-shrink-0 ${post.statusColor}`}>
                        {post.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  SCREEN 4 — Schedule with filter pills and calendar                       */
/* ────────────────────────────────────────────────────────────────────────── */

function ScheduleScreen() {
  const days = Array.from({ length: 28 }, (_, i) => i + 1);
  const scheduledDays: Record<number, string> = { 3: "09:00", 7: "12:30", 12: "09:00", 18: "09:00", 22: "11:30", 25: "14:00" };

  return (
    <div className="flex h-full bg-[#FAFAF8]">
      <MockSidebar activePage="schedule" />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <div className="px-[6%] py-[4%] space-y-[8px]">
          {/* Header with badges */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-[14px] font-bold text-gray-900">Posts programmés</h1>
              <p className="text-[8px] text-gray-500 mt-[1px]">
                <span className="font-medium text-gray-900">3</span> posts à venir
              </p>
            </div>
            {/* View toggle */}
            <div className="flex bg-gray-100 rounded-lg p-[2px]">
              <div className="px-[6px] py-[3px] text-[7px] font-medium rounded-md text-gray-400">Liste</div>
              <div className="px-[6px] py-[3px] text-[7px] font-medium rounded-md bg-white text-gray-900 shadow-sm">Calendrier</div>
            </div>
          </div>

          {/* Filter pills — like real app */}
          <div className="flex gap-[4px] overflow-x-auto">
            {[
              { label: "Tous", count: "6", active: true, color: "bg-gray-900 text-white" },
              { label: "Programmés", count: "3", active: false, color: "text-violet-600 bg-violet-50 border border-violet-200" },
              { label: "Publiés", count: "2", active: false, color: "text-emerald-600 bg-emerald-50 border border-emerald-200" },
              { label: "Échec", count: "1", active: false, color: "text-red-500 bg-red-50 border border-red-200" },
            ].map((f) => (
              <div key={f.label} className={`flex items-center gap-[3px] px-[6px] py-[3px] rounded-full text-[7px] font-medium whitespace-nowrap ${f.active ? f.color : f.color}`}>
                {f.label}
                <span className={`text-[6px] ${f.active ? "bg-white/20" : ""} px-[3px] rounded-full`}>{f.count}</span>
              </div>
            ))}
          </div>

          {/* Calendar */}
          <div className="bg-white border border-gray-200 rounded-xl p-[8px]">
            {/* Month header */}
            <div className="flex items-center justify-between mb-[5px]">
              <svg className="w-[10px] h-[10px] text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
              </svg>
              <span className="text-[10px] font-bold text-gray-900">Février 2026</span>
              <svg className="w-[10px] h-[10px] text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
              </svg>
            </div>

            {/* Day labels */}
            <div className="grid grid-cols-7 gap-[2px] mb-[3px]">
              {["L", "M", "M", "J", "V", "S", "D"].map((d, i) => (
                <div key={i} className="text-center text-[6px] font-semibold text-gray-400 uppercase">{d}</div>
              ))}
            </div>

            {/* Days grid */}
            <div className="grid grid-cols-7 gap-[1px]">
              {/* Empty cells for offset (Feb 2026 starts on Sunday) */}
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={`e${i}`} className="aspect-square" />
              ))}
              {days.map((day) => {
                const scheduled = scheduledDays[day];
                const isToday = day === 18;
                return (
                  <div
                    key={day}
                    className={`aspect-square rounded-md flex flex-col items-center justify-center relative ${
                      isToday ? "bg-[#F8935D]/10 ring-1 ring-[#F8935D]/30" : ""
                    } ${scheduled && !isToday ? "bg-violet-50/50" : ""}`}
                  >
                    <span className={`text-[7px] ${isToday ? "font-bold text-[#F8935D]" : scheduled ? "font-medium text-gray-700" : "text-gray-500"}`}>
                      {day}
                    </span>
                    {scheduled && (
                      <div className="flex flex-col items-center gap-[0.5px]">
                        <div className="w-[3px] h-[3px] rounded-full bg-violet-500" />
                        <span className="text-[4px] text-violet-500 font-medium">{scheduled}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Upcoming posts */}
          <div className="space-y-[3px]">
            {[
              { title: "Comment j'ai doublé mon engagement", time: "18 fév. — 09:00", version: "Storytelling" },
              { title: "Les 3 outils qui ont changé ma productivité", time: "22 fév. — 11:30", version: "Business" },
            ].map((post, i) => (
              <div key={i} className="bg-white border border-gray-200 border-l-2 border-l-violet-500 rounded-xl px-[8px] py-[5px] flex items-center gap-[6px]">
                <div className="w-[6px] h-[6px] rounded-full bg-violet-500 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <h3 className="text-[7px] font-semibold text-gray-900 truncate">{post.title}</h3>
                  <div className="flex items-center gap-[4px] mt-[1px]">
                    <span className="text-[6px] text-violet-500 font-medium">{post.time}</span>
                    <span className={`text-[5px] font-medium px-[3px] py-[0.5px] rounded-full ${
                      post.version === "Storytelling" ? "bg-[#F85751]/10 text-[#F85751]" : "bg-[#F8935D]/10 text-[#F8935D]"
                    }`}>{post.version}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  SCREEN 5 — Analytics with line chart and top posts                       */
/* ────────────────────────────────────────────────────────────────────────── */

function AnalyticsScreen() {
  // SVG line chart data points (12 weeks)
  const chartPoints = [35, 42, 38, 55, 48, 62, 58, 75, 68, 82, 78, 95];
  const chartW = 220;
  const chartH = 50;
  const maxVal = 100;

  // Build SVG path
  const pathPoints = chartPoints.map((val, i) => {
    const x = (i / (chartPoints.length - 1)) * chartW;
    const y = chartH - (val / maxVal) * chartH;
    return `${x},${y}`;
  });
  const linePath = `M${pathPoints.join(" L")}`;
  const areaPath = `${linePath} L${chartW},${chartH} L0,${chartH} Z`;

  return (
    <div className="flex h-full bg-[#FAFAF8]">
      <MockSidebar activePage="analytics" />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <div className="px-[6%] py-[4%] space-y-[8px]">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-[14px] font-bold text-gray-900">Analytics</h1>
              <p className="text-[8px] text-gray-500 mt-[1px]">Performance de vos posts</p>
            </div>
            {/* Period selector */}
            <div className="flex gap-[3px]">
              {["7j", "30j", "Tout"].map((period, i) => (
                <div
                  key={period}
                  className={`px-[6px] py-[3px] rounded-lg text-[7px] font-medium ${
                    i === 1 ? "bg-[#F8935D]/10 text-[#F8935D]" : "text-gray-400 bg-gray-100"
                  }`}
                >
                  {period}
                </div>
              ))}
            </div>
          </div>

          {/* KPI cards */}
          <div className="grid grid-cols-3 gap-[5px]">
            {[
              { label: "Posts publiés", value: "47", change: "+12%", icon: (
                <svg className="w-[9px] h-[9px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              ), color: "text-[#F8935D]", bg: "bg-[#F8935D]/10" },
              { label: "Impressions", value: "12.3K", change: "+28%", icon: (
                <svg className="w-[9px] h-[9px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              ), color: "text-cyan-500", bg: "bg-cyan-500/10" },
              { label: "Engagement", value: "8.7%", change: "+15%", icon: (
                <svg className="w-[9px] h-[9px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              ), color: "text-emerald-500", bg: "bg-emerald-500/10" },
            ].map((kpi, i) => (
              <div key={i} className="bg-white border border-gray-200 rounded-xl px-[8px] py-[6px]">
                <div className="flex items-center gap-[3px] mb-[3px]">
                  <div className={`w-[16px] h-[16px] rounded-md ${kpi.bg} flex items-center justify-center ${kpi.color}`}>
                    {kpi.icon}
                  </div>
                  <span className="text-[6px] text-gray-500">{kpi.label}</span>
                </div>
                <div className="flex items-baseline gap-[3px]">
                  <span className="text-[13px] font-bold text-gray-900">{kpi.value}</span>
                  <span className="text-[6px] font-medium text-emerald-500 flex items-center gap-[1px]">
                    <svg className="w-[5px] h-[5px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 15l7-7 7 7" />
                    </svg>
                    {kpi.change}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Line chart area */}
          <div className="bg-white border border-gray-200 rounded-xl p-[8px]">
            <div className="flex items-center justify-between mb-[6px]">
              <span className="text-[8px] font-semibold text-gray-900">Engagement (30 derniers jours)</span>
              <div className="flex gap-[6px]">
                <div className="flex items-center gap-[3px]">
                  <div className="w-[6px] h-[2px] rounded-full bg-[#F8935D]" />
                  <span className="text-[6px] text-gray-400">Likes</span>
                </div>
                <div className="flex items-center gap-[3px]">
                  <div className="w-[6px] h-[2px] rounded-full bg-cyan-400" />
                  <span className="text-[6px] text-gray-400">Comments</span>
                </div>
              </div>
            </div>

            {/* SVG line chart */}
            <svg viewBox={`0 0 ${chartW} ${chartH + 8}`} className="w-full h-[55px]" preserveAspectRatio="none">
              <defs>
                <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#F8935D" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#F8935D" stopOpacity="0" />
                </linearGradient>
              </defs>
              {/* Grid lines */}
              {[0, 0.25, 0.5, 0.75, 1].map((ratio) => (
                <line key={ratio} x1="0" y1={chartH * ratio} x2={chartW} y2={chartH * ratio} stroke="#E5E7EB" strokeWidth="0.5" strokeDasharray="2,2" />
              ))}
              {/* Area fill */}
              <path d={areaPath} fill="url(#lineGrad)" />
              {/* Main line */}
              <path d={linePath} fill="none" stroke="#F8935D" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              {/* Data points */}
              {chartPoints.map((val, i) => {
                const x = (i / (chartPoints.length - 1)) * chartW;
                const y = chartH - (val / maxVal) * chartH;
                return (
                  <circle key={i} cx={x} cy={y} r="2" fill="white" stroke="#F8935D" strokeWidth="1" />
                );
              })}
            </svg>
          </div>

          {/* Top performing posts */}
          <div>
            <span className="text-[8px] font-semibold text-gray-900 mb-[4px] block">Top posts</span>
            <div className="space-y-[3px]">
              {[
                { title: "Leadership authentique en startup", likes: 234, comments: 47 },
                { title: "5 erreurs en recrutement", likes: 189, comments: 31 },
              ].map((post, i) => (
                <div key={i} className="bg-white border border-gray-200 rounded-lg px-[8px] py-[5px] flex items-center gap-[6px]">
                  <span className="text-[8px] font-bold text-[#F8935D] w-[14px]">#{i + 1}</span>
                  <span className="text-[7px] text-gray-900 font-medium truncate flex-1">{post.title}</span>
                  <div className="flex items-center gap-[6px] flex-shrink-0">
                    <span className="text-[6px] text-gray-400 flex items-center gap-[2px]">
                      <svg className="w-[6px] h-[6px]" fill="currentColor" viewBox="0 0 20 20"><path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.56 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 7.933a4 4 0 00-.8 2.4z" /></svg>
                      {post.likes}
                    </span>
                    <span className="text-[6px] text-gray-400 flex items-center gap-[2px]">
                      <svg className="w-[6px] h-[6px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" /></svg>
                      {post.comments}
                    </span>
                  </div>
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
/*  SCREEN 6 — Profile with plan info, stats, and settings                   */
/* ────────────────────────────────────────────────────────────────────────── */

function ProfileScreen() {
  return (
    <div className="flex h-full bg-[#FAFAF8]">
      <MockSidebar activePage="" />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <div className="px-[6%] py-[4%] space-y-[8px]">
          {/* Header */}
          <div className="flex items-center gap-[6px]">
            <div className="w-[20px] h-[20px] rounded-lg bg-gray-100 flex items-center justify-center">
              <svg className="w-[10px] h-[10px] text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
              </svg>
            </div>
            <h1 className="text-[14px] font-bold text-gray-900">Mon profil</h1>
          </div>

          {/* Profile card */}
          <div className="bg-white border border-gray-200 rounded-xl p-[10px]">
            <div className="flex items-center gap-[10px] mb-[8px]">
              <div className="w-[38px] h-[38px] rounded-full bg-gradient-to-br from-orange-400 to-pink-400 flex items-center justify-center shadow-lg shadow-orange-400/20">
                <span className="text-white text-[12px] font-bold">ÉM</span>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-[4px]">
                  <h2 className="text-[11px] font-bold text-gray-900">Émilie Martin</h2>
                  <svg className="w-[10px] h-[10px] text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </div>
                <div className="flex items-center gap-[4px] mt-[2px]">
                  <span className="text-[7px] text-gray-500">CMO &middot; Tech / SaaS</span>
                  <span className="text-[7px] font-medium px-[4px] py-[1px] rounded-full bg-[#0A66C2]/10 text-[#0A66C2] flex items-center gap-[2px]">
                    <svg viewBox="0 0 24 24" className="w-[6px] h-[6px]" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                    Connecté
                  </span>
                </div>
              </div>
            </div>

            {/* Plan badge + daily usage */}
            <div className="bg-gradient-to-r from-[#F8935D]/5 to-[#F76B54]/5 border border-[#F8935D]/15 rounded-xl p-[8px]">
              <div className="flex items-center justify-between mb-[5px]">
                <span className="text-[8px] font-bold text-gray-900 flex items-center gap-[3px]">
                  Plan Max
                  <span className="text-[6px] font-medium px-[4px] py-[1px] rounded-full bg-gradient-to-r from-[#F8935D] to-[#F76B54] text-white">PRO</span>
                </span>
                <span className="text-[7px] text-[#F8935D] font-medium">Gérer</span>
              </div>
              {/* Usage bar */}
              <div className="mb-[3px]">
                <div className="flex items-center justify-between mb-[2px]">
                  <span className="text-[7px] text-gray-500">Messages aujourd&apos;hui</span>
                  <span className="text-[7px] font-medium text-gray-900">7/50</span>
                </div>
                <div className="h-[4px] bg-gray-200 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-[#F8935D] to-[#F76B54] rounded-full" style={{ width: "14%" }} />
                </div>
              </div>
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-[4px]">
            {[
              { label: "Posts créés", value: "47", icon: "📝" },
              { label: "Sessions", value: "128", icon: "💬" },
              { label: "Membre depuis", value: "Jan 2025", icon: "📅" },
            ].map((s) => (
              <div key={s.label} className="bg-white border border-gray-200 rounded-xl px-[6px] py-[6px] text-center">
                <span className="text-[10px] block mb-[2px]">{s.icon}</span>
                <div className="text-[10px] font-bold text-gray-900">{s.value}</div>
                <div className="text-[6px] text-gray-400 mt-[1px]">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Profile fields */}
          <div className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100">
            {[
              { label: "Style LinkedIn", value: "Concis & data-driven" },
              { label: "Objectif", value: "Générer des leads qualifiés" },
              { label: "Audience cible", value: "Founders, CMOs, VPs" },
            ].map((field) => (
              <div key={field.label} className="px-[10px] py-[6px] flex items-center justify-between">
                <span className="text-[7px] text-gray-500">{field.label}</span>
                <span className="text-[7px] font-medium text-gray-900">{field.value}</span>
              </div>
            ))}
          </div>

          {/* Quick actions */}
          <div className="flex gap-[4px]">
            <div className="flex-1 bg-white border border-gray-200 rounded-xl px-[8px] py-[6px] flex items-center gap-[5px]">
              <svg className="w-[10px] h-[10px] text-cyan-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-[7px] font-medium text-gray-700">Historique</span>
            </div>
            <div className="flex-1 bg-white border border-gray-200 rounded-xl px-[8px] py-[6px] flex items-center gap-[5px]">
              <svg className="w-[10px] h-[10px] text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="text-[7px] font-medium text-gray-700">Paramètres</span>
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
  { id: "profile", component: ProfileScreen, label: "Profil" },
];
