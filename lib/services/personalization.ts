// ============================================================
// PERSONALIZATION ENGINE
// Adapts UI text, placeholders, and template ordering
// based on the user's onboarding profile data.
// Supports all 10 languages (en, fr, es, de, it, pt, nl, zh, ja, ko).
// ============================================================

import { UserProfile } from "@/types";
import { Language } from "@/lib/i18n";

type ProfileData = UserProfile["profile"];
type LocalizedText = Partial<Record<Language, string>>;
type LocalizedTextArray = Partial<Record<Language, string[]>>;

// ---------------------------------------------------------------------------
// WELCOME SUBTITLE - adapts the description below "Bonjour, {name}!"
// ---------------------------------------------------------------------------

const SUBTITLE_BY_OBJECTIVE: Record<string, LocalizedText> = {
  "Trouver de nouveaux clients": {
    fr: "Creez des posts qui attirent vos futurs clients",
    en: "Create posts that attract your future clients",
    es: "Crea publicaciones que atraigan a tus futuros clientes",
    de: "Erstellen Sie Beiträge, die Ihre zukünftigen Kunden anziehen",
    it: "Crea post che attraggano i tuoi futuri clienti",
    pt: "Crie posts que atraiam seus futuros clientes",
    nl: "Maak berichten die uw toekomstige klanten aantrekken",
    zh: "创建吸引未来客户的帖子",
    ja: "将来のクライアントを引き付ける投稿を作成",
    ko: "미래 고객을 끌어들이는 게시물을 만드세요",
  },
  "Augmenter mon chiffre d'affaires": {
    fr: "Generez des posts qui convertissent votre audience",
    en: "Generate posts that convert your audience",
    es: "Genera publicaciones que conviertan a tu audiencia",
    de: "Erstellen Sie Beiträge, die Ihr Publikum konvertieren",
    it: "Genera post che convertano il tuo pubblico",
    pt: "Gere posts que convertam sua audiência",
    nl: "Genereer berichten die uw publiek converteren",
    zh: "生成能够转化受众的帖子",
    ja: "オーディエンスを顧客に変える投稿を生成",
    ko: "청중을 전환시키는 게시물을 생성하세요",
  },
  "Developper ma visibilite et credibilite": {
    fr: "Renforcez votre image d'expert avec chaque post",
    en: "Strengthen your expert image with every post",
    es: "Refuerza tu imagen de experto con cada publicación",
    de: "Stärken Sie Ihr Expertenimage mit jedem Beitrag",
    it: "Rafforza la tua immagine di esperto con ogni post",
    pt: "Fortaleça sua imagem de especialista com cada post",
    nl: "Versterk uw expertimago met elk bericht",
    zh: "每篇帖子都强化您的专家形象",
    ja: "投稿するたびに専門家としてのイメージを強化",
    ko: "모든 게시물로 전문가 이미지를 강화하세요",
  },
  "Generer des leads qualifies": {
    fr: "Transformez votre audience LinkedIn en opportunites",
    en: "Turn your LinkedIn audience into opportunities",
    es: "Transforma tu audiencia de LinkedIn en oportunidades",
    de: "Verwandeln Sie Ihr LinkedIn-Publikum in Chancen",
    it: "Trasforma il tuo pubblico LinkedIn in opportunità",
    pt: "Transforme sua audiência do LinkedIn em oportunidades",
    nl: "Verander uw LinkedIn-publiek in kansen",
    zh: "将您的LinkedIn受众转化为商机",
    ja: "LinkedInのオーディエンスをビジネスチャンスに変換",
    ko: "LinkedIn 청중을 기회로 전환하세요",
  },
  "Construire une audience engagee": {
    fr: "Fidelisez votre communaute avec du contenu percutant",
    en: "Build a loyal community with impactful content",
    es: "Fideliza a tu comunidad con contenido impactante",
    de: "Bauen Sie eine treue Community mit wirkungsvollem Inhalt auf",
    it: "Fidelizza la tua community con contenuti d'impatto",
    pt: "Fidelize sua comunidade com conteúdo impactante",
    nl: "Bouw een loyale community op met impactvolle content",
    zh: "用有影响力的内容建立忠实社区",
    ja: "インパクトのあるコンテンツで忠実なコミュニティを構築",
    ko: "영향력 있는 콘텐츠로 충성도 높은 커뮤니티를 구축하세요",
  },
};

const DEFAULT_SUBTITLE: LocalizedText = {
  fr: "Decrivez votre idee et je genererai 2 versions optimisees de votre post LinkedIn",
  en: "Describe your idea and I'll generate 2 optimized versions of your LinkedIn post",
  es: "Describe tu idea y generaré 2 versiones optimizadas de tu publicación de LinkedIn",
  de: "Beschreiben Sie Ihre Idee und ich erstelle 2 optimierte Versionen Ihres LinkedIn-Beitrags",
  it: "Descrivi la tua idea e genererò 2 versioni ottimizzate del tuo post LinkedIn",
  pt: "Descreva sua ideia e eu gerarei 2 versões otimizadas do seu post no LinkedIn",
  nl: "Beschrijf uw idee en ik genereer 2 geoptimaliseerde versies van uw LinkedIn-bericht",
  zh: "描述您的想法，我将为您生成2个优化版本的LinkedIn帖子",
  ja: "アイデアを入力してください。LinkedInの投稿を2つの最適化バージョンで生成します",
  ko: "아이디어를 설명해 주세요. LinkedIn 게시물의 최적화된 2가지 버전을 생성해 드립니다",
};

export function getPersonalizedSubtitle(profile?: ProfileData, language: Language = "fr"): string {
  if (!profile?.objective) return (DEFAULT_SUBTITLE[language] || DEFAULT_SUBTITLE.en!);

  // Try exact match first, then partial match
  for (const [key, subtitles] of Object.entries(SUBTITLE_BY_OBJECTIVE)) {
    const objStr = Array.isArray(profile.objective) ? profile.objective.join(", ") : String(profile.objective || "");
    if (objStr.toLowerCase().includes(key.toLowerCase().slice(0, 15))) {
      return subtitles[language] || subtitles.en!;
    }
  }

  return (DEFAULT_SUBTITLE[language] || DEFAULT_SUBTITLE.en!);
}

// ---------------------------------------------------------------------------
// PLACEHOLDER EXAMPLES - adapts rotating input placeholders to the sector
// ---------------------------------------------------------------------------

const PLACEHOLDERS_BY_SECTOR: Record<string, LocalizedTextArray> = {
  "Tech / IT": {
    fr: [
      "Un post sur une innovation tech...",
      "Comment l'IA transforme mon quotidien...",
      "Une lecon apprise en developpement...",
      "Les erreurs a eviter en gestion de projet tech...",
      "Pourquoi j'ai choisi cette stack technique...",
    ],
    en: [
      "A post about a tech innovation...",
      "How AI is transforming my daily work...",
      "A lesson learned in development...",
      "Mistakes to avoid in tech project management...",
      "Why I chose this tech stack...",
    ],
    es: [
      "Una publicación sobre una innovación tech...",
      "Cómo la IA transforma mi día a día...",
      "Una lección aprendida en desarrollo...",
      "Errores a evitar en gestión de proyectos tech...",
      "Por qué elegí esta stack tecnológica...",
    ],
    de: [
      "Ein Beitrag über eine Tech-Innovation...",
      "Wie KI meinen Alltag verändert...",
      "Eine Lektion aus der Entwicklung...",
      "Fehler, die man im Tech-Projektmanagement vermeiden sollte...",
      "Warum ich diesen Tech-Stack gewählt habe...",
    ],
    it: [
      "Un post su un'innovazione tech...",
      "Come l'IA trasforma il mio quotidiano...",
      "Una lezione imparata nello sviluppo...",
      "Errori da evitare nella gestione progetti tech...",
      "Perché ho scelto questo stack tecnologico...",
    ],
    pt: [
      "Um post sobre uma inovação tech...",
      "Como a IA transforma meu dia a dia...",
      "Uma lição aprendida em desenvolvimento...",
      "Erros a evitar na gestão de projetos tech...",
      "Por que escolhi esta stack tecnológica...",
    ],
    nl: [
      "Een bericht over een tech-innovatie...",
      "Hoe AI mijn dagelijks werk verandert...",
      "Een les geleerd in ontwikkeling...",
      "Fouten om te vermijden in tech-projectmanagement...",
      "Waarom ik deze tech-stack heb gekozen...",
    ],
    zh: [
      "一篇关于科技创新的帖子...",
      "AI如何改变我的日常工作...",
      "开发中学到的一课...",
      "科技项目管理中应避免的错误...",
      "我为什么选择这个技术栈...",
    ],
    ja: [
      "テクノロジーの革新についての投稿...",
      "AIが私の日常をどう変えているか...",
      "開発で学んだ教訓...",
      "テックプロジェクト管理で避けるべきミス...",
      "この技術スタックを選んだ理由...",
    ],
    ko: [
      "기술 혁신에 관한 게시물...",
      "AI가 나의 일상을 어떻게 변화시키는지...",
      "개발에서 배운 교훈...",
      "기술 프로젝트 관리에서 피해야 할 실수...",
      "이 기술 스택을 선택한 이유...",
    ],
  },
  "Marketing / Communication": {
    fr: [
      "Une strategie qui a booste mes resultats...",
      "Les tendances marketing a suivre...",
      "Comment j'ai double mon taux d'engagement...",
      "Mon framework pour creer du contenu viral...",
      "Une campagne qui a tout change...",
    ],
    en: [
      "A strategy that boosted my results...",
      "Marketing trends to follow...",
      "How I doubled my engagement rate...",
      "My framework for creating viral content...",
      "A campaign that changed everything...",
    ],
    es: [
      "Una estrategia que impulsó mis resultados...",
      "Las tendencias de marketing a seguir...",
      "Cómo dupliqué mi tasa de engagement...",
      "Mi framework para crear contenido viral...",
      "Una campaña que lo cambió todo...",
    ],
    de: [
      "Eine Strategie, die meine Ergebnisse verbessert hat...",
      "Marketing-Trends, die man verfolgen sollte...",
      "Wie ich meine Engagement-Rate verdoppelt habe...",
      "Mein Framework für viralen Content...",
      "Eine Kampagne, die alles verändert hat...",
    ],
    it: [
      "Una strategia che ha migliorato i miei risultati...",
      "Le tendenze marketing da seguire...",
      "Come ho raddoppiato il mio tasso di engagement...",
      "Il mio framework per creare contenuti virali...",
      "Una campagna che ha cambiato tutto...",
    ],
    pt: [
      "Uma estratégia que impulsionou meus resultados...",
      "Tendências de marketing para acompanhar...",
      "Como dobrei minha taxa de engajamento...",
      "Meu framework para criar conteúdo viral...",
      "Uma campanha que mudou tudo...",
    ],
    nl: [
      "Een strategie die mijn resultaten heeft verbeterd...",
      "Marketingtrends om te volgen...",
      "Hoe ik mijn engagement-ratio verdubbelde...",
      "Mijn framework voor virale content...",
      "Een campagne die alles veranderde...",
    ],
    zh: [
      "一个提升了我业绩的策略...",
      "值得关注的营销趋势...",
      "我如何将互动率翻倍...",
      "我创建爆款内容的框架...",
      "一场改变一切的营销活动...",
    ],
    ja: [
      "成果を伸ばした戦略...",
      "注目すべきマーケティングトレンド...",
      "エンゲージメント率を2倍にした方法...",
      "バイラルコンテンツを作るフレームワーク...",
      "すべてを変えたキャンペーン...",
    ],
    ko: [
      "성과를 높인 전략...",
      "주목해야 할 마케팅 트렌드...",
      "참여율을 2배로 늘린 방법...",
      "바이럴 콘텐츠를 만드는 프레임워크...",
      "모든 것을 바꾼 캠페인...",
    ],
  },
  "Finance / Banque": {
    fr: [
      "Ce que j'ai appris sur la gestion financiere...",
      "Une lecon sur l'investissement...",
      "Comment expliquer la finance simplement...",
      "Les erreurs financieres les plus courantes...",
      "Mon parcours dans la finance...",
    ],
    en: [
      "What I learned about financial management...",
      "A lesson about investing...",
      "How to explain finance simply...",
      "The most common financial mistakes...",
      "My journey in finance...",
    ],
    es: [
      "Lo que aprendí sobre gestión financiera...",
      "Una lección sobre inversión...",
      "Cómo explicar las finanzas de forma sencilla...",
      "Los errores financieros más comunes...",
      "Mi trayectoria en finanzas...",
    ],
    de: [
      "Was ich über Finanzmanagement gelernt habe...",
      "Eine Lektion über Investitionen...",
      "Wie man Finanzen einfach erklärt...",
      "Die häufigsten Finanzfehler...",
      "Mein Weg in der Finanzwelt...",
    ],
    it: [
      "Cosa ho imparato sulla gestione finanziaria...",
      "Una lezione sugli investimenti...",
      "Come spiegare la finanza in modo semplice...",
      "Gli errori finanziari più comuni...",
      "Il mio percorso nella finanza...",
    ],
    pt: [
      "O que aprendi sobre gestão financeira...",
      "Uma lição sobre investimentos...",
      "Como explicar finanças de forma simples...",
      "Os erros financeiros mais comuns...",
      "Minha trajetória em finanças...",
    ],
    nl: [
      "Wat ik leerde over financieel management...",
      "Een les over investeren...",
      "Hoe je financiën eenvoudig uitlegt...",
      "De meest voorkomende financiële fouten...",
      "Mijn reis in de financiële wereld...",
    ],
    zh: [
      "我在财务管理方面学到的...",
      "关于投资的一课...",
      "如何简单解释金融...",
      "最常见的财务错误...",
      "我的金融之路...",
    ],
    ja: [
      "財務管理で学んだこと...",
      "投資についての教訓...",
      "金融をわかりやすく説明する方法...",
      "最も多い金融の失敗...",
      "金融業界での私のキャリア...",
    ],
    ko: [
      "재무 관리에서 배운 것...",
      "투자에 대한 교훈...",
      "금융을 쉽게 설명하는 법...",
      "가장 흔한 금융 실수...",
      "금융 분야에서의 나의 여정...",
    ],
  },
  "Sante": {
    fr: [
      "Un conseil bien-etre pour les professionnels...",
      "Ce que la sante m'a appris sur le leadership...",
      "L'importance de l'equilibre vie pro/perso...",
      "Innovation dans le secteur de la sante...",
      "Mon parcours dans le secteur medical...",
    ],
    en: [
      "A wellness tip for professionals...",
      "What healthcare taught me about leadership...",
      "The importance of work-life balance...",
      "Innovation in the healthcare sector...",
      "My journey in the medical field...",
    ],
    es: [
      "Un consejo de bienestar para profesionales...",
      "Lo que la salud me enseñó sobre liderazgo...",
      "La importancia del equilibrio vida-trabajo...",
      "Innovación en el sector salud...",
      "Mi trayectoria en el sector médico...",
    ],
    de: [
      "Ein Wellness-Tipp für Fachleute...",
      "Was das Gesundheitswesen mich über Führung lehrte...",
      "Die Bedeutung der Work-Life-Balance...",
      "Innovation im Gesundheitssektor...",
      "Mein Weg in der Medizin...",
    ],
    it: [
      "Un consiglio di benessere per i professionisti...",
      "Cosa la sanità mi ha insegnato sulla leadership...",
      "L'importanza dell'equilibrio vita-lavoro...",
      "Innovazione nel settore sanitario...",
      "Il mio percorso nel settore medico...",
    ],
    pt: [
      "Uma dica de bem-estar para profissionais...",
      "O que a saúde me ensinou sobre liderança...",
      "A importância do equilíbrio vida-trabalho...",
      "Inovação no setor de saúde...",
      "Minha trajetória no setor médico...",
    ],
    nl: [
      "Een welzijnstip voor professionals...",
      "Wat de gezondheidszorg mij leerde over leiderschap...",
      "Het belang van werk-privébalans...",
      "Innovatie in de gezondheidssector...",
      "Mijn reis in de medische wereld...",
    ],
    zh: [
      "给专业人士的健康建议...",
      "医疗行业教会我的领导力...",
      "工作与生活平衡的重要性...",
      "医疗领域的创新...",
      "我在医疗领域的历程...",
    ],
    ja: [
      "プロフェッショナル向けのウェルネスのヒント...",
      "医療がリーダーシップについて教えてくれたこと...",
      "ワークライフバランスの重要性...",
      "ヘルスケア分野のイノベーション...",
      "医療分野での私のキャリア...",
    ],
    ko: [
      "전문가를 위한 웰빙 팁...",
      "헬스케어가 가르쳐준 리더십...",
      "워라밸의 중요성...",
      "헬스케어 분야의 혁신...",
      "의료 분야에서의 나의 여정...",
    ],
  },
  "Commerce / Vente": {
    fr: [
      "Ma technique de vente la plus efficace...",
      "Comment j'ai conclu mon plus gros deal...",
      "Les objections clients et comment y repondre...",
      "Ce que j'ai appris en prospection...",
      "Pourquoi l'ecoute est la cle de la vente...",
    ],
    en: [
      "My most effective sales technique...",
      "How I closed my biggest deal...",
      "Client objections and how to handle them...",
      "What I learned from prospecting...",
      "Why listening is the key to sales...",
    ],
    es: [
      "Mi técnica de venta más efectiva...",
      "Cómo cerré mi mayor trato...",
      "Objeciones de clientes y cómo manejarlas...",
      "Lo que aprendí en prospección...",
      "Por qué escuchar es la clave de las ventas...",
    ],
    de: [
      "Meine effektivste Verkaufstechnik...",
      "Wie ich meinen größten Deal abgeschlossen habe...",
      "Kundeneinwände und wie man damit umgeht...",
      "Was ich bei der Akquise gelernt habe...",
      "Warum Zuhören der Schlüssel zum Verkauf ist...",
    ],
    it: [
      "La mia tecnica di vendita più efficace...",
      "Come ho chiuso il mio più grande affare...",
      "Le obiezioni dei clienti e come gestirle...",
      "Cosa ho imparato dalla prospezione...",
      "Perché l'ascolto è la chiave della vendita...",
    ],
    pt: [
      "Minha técnica de vendas mais eficaz...",
      "Como fechei meu maior negócio...",
      "Objeções de clientes e como lidar com elas...",
      "O que aprendi com a prospecção...",
      "Por que ouvir é a chave para as vendas...",
    ],
    nl: [
      "Mijn meest effectieve verkooptechniek...",
      "Hoe ik mijn grootste deal sloot...",
      "Klantbezwaren en hoe ermee om te gaan...",
      "Wat ik leerde van prospectie...",
      "Waarom luisteren de sleutel tot verkoop is...",
    ],
    zh: [
      "我最有效的销售技巧...",
      "我如何达成最大的交易...",
      "客户异议及其处理方法...",
      "我从开发客户中学到的...",
      "为什么倾听是销售的关键...",
    ],
    ja: [
      "最も効果的な営業テクニック...",
      "最大の商談を成約した方法...",
      "顧客の反論とその対処法...",
      "営業活動で学んだこと...",
      "なぜ傾聴が営業の鍵なのか...",
    ],
    ko: [
      "가장 효과적인 영업 기법...",
      "최대 거래를 성사시킨 방법...",
      "고객 반론과 대처법...",
      "영업 활동에서 배운 것...",
      "경청이 영업의 핵심인 이유...",
    ],
  },
  "Conseil": {
    fr: [
      "Un conseil que je donne a tous mes clients...",
      "Comment je structure une mission de conseil...",
      "Les defis du consulting et mes solutions...",
      "Ce que j'ai appris en accompagnant des entreprises...",
      "La methodologie qui fait la difference...",
    ],
    en: [
      "Advice I give to all my clients...",
      "How I structure a consulting engagement...",
      "Consulting challenges and my solutions...",
      "What I learned from working with companies...",
      "The methodology that makes the difference...",
    ],
    es: [
      "Un consejo que doy a todos mis clientes...",
      "Cómo estructuro una misión de consultoría...",
      "Los desafíos del consulting y mis soluciones...",
      "Lo que aprendí acompañando empresas...",
      "La metodología que marca la diferencia...",
    ],
    de: [
      "Ein Rat, den ich allen meinen Kunden gebe...",
      "Wie ich ein Beratungsprojekt strukturiere...",
      "Herausforderungen im Consulting und meine Lösungen...",
      "Was ich bei der Begleitung von Unternehmen gelernt habe...",
      "Die Methodik, die den Unterschied macht...",
    ],
    it: [
      "Un consiglio che do a tutti i miei clienti...",
      "Come struttura una missione di consulenza...",
      "Le sfide del consulting e le mie soluzioni...",
      "Cosa ho imparato accompagnando le aziende...",
      "La metodologia che fa la differenza...",
    ],
    pt: [
      "Um conselho que dou a todos os meus clientes...",
      "Como estruturo uma missão de consultoria...",
      "Os desafios da consultoria e minhas soluções...",
      "O que aprendi acompanhando empresas...",
      "A metodologia que faz a diferença...",
    ],
    nl: [
      "Een advies dat ik al mijn klanten geef...",
      "Hoe ik een adviesopdracht structureer...",
      "Uitdagingen in consulting en mijn oplossingen...",
      "Wat ik leerde van het begeleiden van bedrijven...",
      "De methodologie die het verschil maakt...",
    ],
    zh: [
      "我给所有客户的建议...",
      "我如何构建咨询项目...",
      "咨询中的挑战和我的解决方案...",
      "陪伴企业成长中学到的...",
      "真正产生效果的方法论...",
    ],
    ja: [
      "すべてのクライアントに伝えるアドバイス...",
      "コンサルティング案件の構成方法...",
      "コンサルティングの課題と私の解決策...",
      "企業支援で学んだこと...",
      "差をつける方法論...",
    ],
    ko: [
      "모든 고객에게 드리는 조언...",
      "컨설팅 프로젝트를 구성하는 방법...",
      "컨설팅의 도전과 나의 솔루션...",
      "기업을 지원하면서 배운 것...",
      "차이를 만드는 방법론...",
    ],
  },
  "RH / Recrutement": {
    fr: [
      "Comment attirer les meilleurs talents...",
      "Les erreurs a eviter en recrutement...",
      "Ma vision du management bienveillant...",
      "L'entretien qui a change ma perspective...",
      "Pourquoi la culture d'entreprise est essentielle...",
    ],
    en: [
      "How to attract top talent...",
      "Mistakes to avoid in recruiting...",
      "My vision of compassionate management...",
      "The interview that changed my perspective...",
      "Why company culture is essential...",
    ],
    es: [
      "Cómo atraer al mejor talento...",
      "Errores a evitar en reclutamiento...",
      "Mi visión del management empático...",
      "La entrevista que cambió mi perspectiva...",
      "Por qué la cultura de empresa es esencial...",
    ],
    de: [
      "Wie man Top-Talente anzieht...",
      "Fehler, die man beim Recruiting vermeiden sollte...",
      "Meine Vision von empathischer Führung...",
      "Das Gespräch, das meine Perspektive veränderte...",
      "Warum Unternehmenskultur entscheidend ist...",
    ],
    it: [
      "Come attrarre i migliori talenti...",
      "Errori da evitare nel recruiting...",
      "La mia visione del management empatico...",
      "Il colloquio che ha cambiato la mia prospettiva...",
      "Perché la cultura aziendale è essenziale...",
    ],
    pt: [
      "Como atrair os melhores talentos...",
      "Erros a evitar no recrutamento...",
      "Minha visão de gestão empática...",
      "A entrevista que mudou minha perspectiva...",
      "Por que a cultura empresarial é essencial...",
    ],
    nl: [
      "Hoe je toptalent aantrekt...",
      "Fouten om te vermijden bij werving...",
      "Mijn visie op empathisch management...",
      "Het sollicitatiegesprek dat mijn perspectief veranderde...",
      "Waarom bedrijfscultuur essentieel is...",
    ],
    zh: [
      "如何吸引顶尖人才...",
      "招聘中应避免的错误...",
      "我对人性化管理的愿景...",
      "改变我观点的那场面试...",
      "为什么企业文化至关重要...",
    ],
    ja: [
      "トップ人材を引き付ける方法...",
      "採用で避けるべきミス...",
      "思いやりのあるマネジメントの私のビジョン...",
      "私の視点を変えた面接...",
      "企業文化が不可欠な理由...",
    ],
    ko: [
      "최고의 인재를 유치하는 방법...",
      "채용에서 피해야 할 실수...",
      "공감적 매니지먼트에 대한 나의 비전...",
      "내 관점을 바꾼 면접...",
      "기업 문화가 필수적인 이유...",
    ],
  },
};

const DEFAULT_PLACEHOLDERS: LocalizedTextArray = {
  fr: [
    "Un post sur le leadership...",
    "Une astuce productivite...",
    "Mon parcours professionnel...",
    "Une lecon apprise recemment...",
    "Un conseil pour les juniors...",
    "Une reflexion sur le teletravail...",
    "Un moment cle de ma carriere...",
  ],
  en: [
    "A post about leadership...",
    "A productivity tip...",
    "My professional journey...",
    "A lesson learned recently...",
    "Advice for junior professionals...",
    "A thought on remote work...",
    "A key moment in my career...",
  ],
  es: [
    "Una publicación sobre liderazgo...",
    "Un consejo de productividad...",
    "Mi trayectoria profesional...",
    "Una lección aprendida recientemente...",
    "Un consejo para los juniors...",
    "Una reflexión sobre el teletrabajo...",
    "Un momento clave de mi carrera...",
  ],
  de: [
    "Ein Beitrag über Führung...",
    "Ein Produktivitätstipp...",
    "Mein beruflicher Werdegang...",
    "Eine kürzlich gelernte Lektion...",
    "Ein Rat für Berufseinsteiger...",
    "Ein Gedanke zum Homeoffice...",
    "Ein Schlüsselmoment meiner Karriere...",
  ],
  it: [
    "Un post sulla leadership...",
    "Un consiglio di produttività...",
    "Il mio percorso professionale...",
    "Una lezione imparata di recente...",
    "Un consiglio per i junior...",
    "Una riflessione sul lavoro da remoto...",
    "Un momento chiave della mia carriera...",
  ],
  pt: [
    "Um post sobre liderança...",
    "Uma dica de produtividade...",
    "Minha trajetória profissional...",
    "Uma lição aprendida recentemente...",
    "Um conselho para os juniores...",
    "Uma reflexão sobre o trabalho remoto...",
    "Um momento-chave da minha carreira...",
  ],
  nl: [
    "Een bericht over leiderschap...",
    "Een productiviteitstip...",
    "Mijn professionele reis...",
    "Een recent geleerde les...",
    "Een advies voor starters...",
    "Een gedachte over thuiswerken...",
    "Een sleutelmoment in mijn carrière...",
  ],
  zh: [
    "一篇关于领导力的帖子...",
    "一个提高效率的技巧...",
    "我的职业历程...",
    "最近学到的一课...",
    "给职场新人的建议...",
    "对远程工作的思考...",
    "职业生涯中的关键时刻...",
  ],
  ja: [
    "リーダーシップについての投稿...",
    "生産性向上のヒント...",
    "私のキャリア...",
    "最近学んだ教訓...",
    "若手へのアドバイス...",
    "リモートワークについての考察...",
    "キャリアの転機...",
  ],
  ko: [
    "리더십에 관한 게시물...",
    "생산성 향상 팁...",
    "나의 직업 여정...",
    "최근에 배운 교훈...",
    "주니어에게 주는 조언...",
    "원격 근무에 대한 생각...",
    "커리어의 핵심 순간...",
  ],
};

export function getPersonalizedPlaceholders(profile?: ProfileData, language: Language = "fr"): string[] {
  if (!profile?.sector) return (DEFAULT_PLACEHOLDERS[language] || DEFAULT_PLACEHOLDERS.en!);

  const sectorKey = Array.isArray(profile.sector) ? profile.sector[0] : profile.sector;
  const sectorData = PLACEHOLDERS_BY_SECTOR[sectorKey];
  if (!sectorData) return (DEFAULT_PLACEHOLDERS[language] || DEFAULT_PLACEHOLDERS.en!);

  return sectorData[language] || sectorData.en!;
}

// ---------------------------------------------------------------------------
// TEMPLATE ORDERING - prioritizes templates based on profile type & objective
// ---------------------------------------------------------------------------

// Maps profile characteristics to preferred template IDs (in priority order)
const TEMPLATE_PRIORITY_BY_PROFILE: Record<string, string[]> = {
  "Independant / Freelance": ["storytelling", "tips", "success", "lesson", "controversial", "question"],
  "Agence": ["success", "tips", "controversial", "storytelling", "question", "lesson"],
  "Entrepreneur / Founder": ["storytelling", "success", "controversial", "tips", "lesson", "question"],
  "Salarie en entreprise": ["tips", "lesson", "storytelling", "question", "success", "controversial"],
};

const TEMPLATE_PRIORITY_BY_OBJECTIVE: Record<string, string[]> = {
  "Trouver de nouveaux clients": ["tips", "success", "storytelling"],
  "Augmenter mon chiffre d'affaires": ["success", "tips", "controversial"],
  "Developper ma visibilite et credibilite": ["storytelling", "controversial", "lesson"],
  "Generer des leads qualifies": ["tips", "success", "question"],
  "Construire une audience engagee": ["question", "storytelling", "controversial"],
};

/**
 * Returns template IDs sorted by relevance for this user's profile.
 * Templates not in the priority list are appended at the end in original order.
 */
export function getPersonalizedTemplateOrder(
  templateIds: string[],
  profile?: ProfileData
): string[] {
  if (!profile) return templateIds;

  // Merge priorities: objective first (more specific), then profileType
  const prioritySet = new Set<string>();

  if (profile.objective) {
    const objPriority = Object.entries(TEMPLATE_PRIORITY_BY_OBJECTIVE)
      .find(([key]) => {
        const objStr = Array.isArray(profile.objective) ? profile.objective.join(", ") : String(profile.objective || "");
        return objStr.toLowerCase().includes(key.toLowerCase().slice(0, 15));
      });
    if (objPriority) {
      objPriority[1].forEach(id => prioritySet.add(id));
    }
  }

  if (profile.profileType) {
    const profilePriority = TEMPLATE_PRIORITY_BY_PROFILE[profile.profileType];
    if (profilePriority) {
      profilePriority.forEach(id => prioritySet.add(id));
    }
  }

  if (prioritySet.size === 0) return templateIds;

  const prioritized = [...prioritySet].filter(id => templateIds.includes(id));
  const remaining = templateIds.filter(id => !prioritySet.has(id));

  return [...prioritized, ...remaining];
}

// ---------------------------------------------------------------------------
// GREETING - time-aware personalized greeting
// ---------------------------------------------------------------------------

// Time periods: night (22-5h), morning (5-12h), afternoon (12-18h), evening (18-22h)
const GREETINGS: Record<string, Record<Language, string>> = {
  night: {
    en: "Good night",
    fr: "Bonne nuit",
    es: "Buenas noches",
    de: "Gute Nacht",
    it: "Buonanotte",
    pt: "Boa noite",
    nl: "Goedenacht",
    zh: "晚安",
    ja: "こんばんは",
    ko: "좋은 밤",
  },
  morning: {
    en: "Good morning",
    fr: "Bonjour",
    es: "Buenos días",
    de: "Guten Morgen",
    it: "Buongiorno",
    pt: "Bom dia",
    nl: "Goedemorgen",
    zh: "早上好",
    ja: "おはようございます",
    ko: "좋은 아침",
  },
  afternoon: {
    en: "Good afternoon",
    fr: "Bon après-midi",
    es: "Buenas tardes",
    de: "Guten Tag",
    it: "Buon pomeriggio",
    pt: "Boa tarde",
    nl: "Goedemiddag",
    zh: "下午好",
    ja: "こんにちは",
    ko: "안녕하세요",
  },
  evening: {
    en: "Good evening",
    fr: "Bonsoir",
    es: "Buenas tardes",
    de: "Guten Abend",
    it: "Buonasera",
    pt: "Boa noite",
    nl: "Goedenavond",
    zh: "晚上好",
    ja: "こんばんは",
    ko: "좋은 저녁",
  },
};

const WELCOME_FALLBACK: Record<Language, string> = {
  en: "Welcome to POSTY",
  fr: "Bienvenue sur POSTY",
  es: "Bienvenido a POSTY",
  de: "Willkommen bei POSTY",
  it: "Benvenuto su POSTY",
  pt: "Bem-vindo ao POSTY",
  nl: "Welkom bij POSTY",
  zh: "欢迎使用 POSTY",
  ja: "POSTY へようこそ",
  ko: "POSTY에 오신 것을 환영합니다",
};

export function getPersonalizedGreeting(firstName?: string, language: Language = "fr"): string {
  const hour = new Date().getHours();

  // night: 22h-5h, morning: 5h-12h, afternoon: 12h-18h, evening: 18h-22h
  const period = hour < 5 ? "night" : hour < 12 ? "morning" : hour < 18 ? "afternoon" : hour < 22 ? "evening" : "night";
  const timeGreeting = GREETINGS[period][language] || GREETINGS[period].en;

  return firstName ? `${timeGreeting}, ` : (WELCOME_FALLBACK[language] || WELCOME_FALLBACK.en);
}
