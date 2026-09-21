import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";

export type Language = "en" | "ar";

const STORAGE_KEY = "ai-shield-language";

const dictionaries = {
  en: {
    "app.brand": "AI Shield",
    "app.tagline": "Agent security scanner",
    "app.footer": "Defensive security tool. Only scan systems you own or are authorized to test.",

    "nav.dashboard": "Dashboard",
    "nav.scans": "Scans",
    "nav.targets": "Targets",
    "nav.corpus": "Attack corpus",
    "nav.audit": "Audit log",

    "theme.toggleToLight": "Switch to light theme",
    "theme.toggleToDark": "Switch to dark theme",
    "language.toggle": "Switch language",

    "common.retry": "Retry",
    "common.delete": "Delete",
    "common.deleting": "Deleting…",
    "common.cancel": "Cancel",

    "dashboard.title": "Dashboard",
    "dashboard.noScans": "No scans yet.",
    "dashboard.loading": "Loading scan history…",
    "dashboard.emptyMessage": "Run your first scan from the Scans page to populate the dashboard.",
    "dashboard.viewLatestReport": "View latest report",
    "dashboard.securityScore": "Security score",
    "dashboard.securityScoreSub": "100 minus average risk across every attack",
    "dashboard.attacksRun": "Attacks run (latest scan)",
    "dashboard.vulnerableFindings": "Vulnerable findings",
    "dashboard.totalScansRun": "Total scans run",
    "dashboard.scoreOverTime": "Security score over time",
    "dashboard.findingsBySeverity": "Findings by severity (latest scan)",
    "dashboard.recentScans": "Recent scans",
    "dashboard.col.target": "Target",
    "dashboard.col.started": "Started",
    "dashboard.col.packs": "Packs",
    "dashboard.col.attacks": "Attacks",
    "dashboard.col.vulnerable": "Vulnerable",
    "dashboard.col.score": "Score",

    "scans.title": "Scans",
    "scans.subtitle": "Every scan run against a target, newest first.",
    "scans.newScan": "New scan",
    "scans.runScan": "Run scan",
    "scans.runningScan": "Running scan…",
    "scans.loading": "Loading scans…",
    "scans.emptyMessage": "No scans yet — click New scan to run one.",
    "scans.form.target": "Target",
    "scans.form.trialsPerAttack": "Trials per attack",
    "scans.form.attackPacks": "Attack packs (none selected = all)",
    "scans.form.authorizedBy": "Authorized by",
    "scans.col.scan": "Scan",
    "scans.col.target": "Target",
    "scans.col.started": "Started",
    "scans.col.trials": "Trials",
    "scans.col.attacks": "Attacks",
    "scans.col.severityMix": "Severity mix",
    "scans.col.score": "Score",

    "targets.title": "Targets",
    "targets.subtitle":
      "Agents AI Shield is configured to scan. Defined in targets/*.yaml — a scan is refused unless authorization.confirmed is true.",
    "targets.loading": "Loading targets…",
    "targets.authorized": "Authorized",
    "targets.notAuthorized": "Not authorized",
    "targets.adapter": "Adapter",
    "targets.baseUrl": "Base URL",
    "targets.assertedBy": "Asserted by",
    "targets.applyFixSupported": "Apply Fix supported",
    "targets.indirectInjectionSupported": "Indirect injection (V3) supported",

    "corpus.title": "Attack corpus",
    "corpus.loading": "Loading attack corpus…",
    "corpus.col.id": "ID",
    "corpus.col.name": "Name",
    "corpus.col.owasp": "OWASP",
    "corpus.col.mitre": "MITRE ATLAS",
    "corpus.col.priorSeverity": "Prior severity",
    "corpus.col.turns": "Turns",
    "corpus.col.channel": "Channel",
    "corpus.channelIndirect": "Retrieved document (indirect)",
    "corpus.channelDirect": "Direct chat",

    "audit.title": "Audit log",
    "audit.subtitle": "Every scan and rescan the engine has run — who, what target, when. Append-only (ai_shield/audit.py).",
    "audit.loading": "Loading audit log…",
    "audit.emptyMessage": "No audit entries yet — they're written the moment a scan or rescan runs.",
    "audit.col.time": "Time",
    "audit.col.event": "Event",
    "audit.col.scan": "Scan",
    "audit.col.target": "Target",
    "audit.col.authorizedBy": "Authorized by",
    "audit.col.detail": "Detail",

    "scanDetail.loading": "Loading scan…",
    "scanDetail.securityScore": "Security score",
    "scanDetail.attacksRun": "Attacks run",
    "scanDetail.vulnerable": "Vulnerable",
    "scanDetail.needsReview": "Needs review",
    "scanDetail.needsReviewSub": "Low-confidence LLM-judge verdicts",
    "scanDetail.corpusVersion": "Corpus version",
    "scanDetail.configHash": "Config hash",
    "scanDetail.packs": "Packs",
    "scanDetail.trialsPerAttack": "Trials per attack",
    "scanDetail.findings": "Findings",
    "scanDetail.allSeverities": "All severities",
    "scanDetail.allPacks": "All packs",
    "scanDetail.col.attack": "Attack",
    "scanDetail.col.owasp": "OWASP",
    "scanDetail.col.asr": "ASR",
    "scanDetail.col.severity": "Severity",
    "scanDetail.col.status": "Status",

    "findingDetail.loading": "Loading finding…",
    "findingDetail.notFound": "Finding not found in this scan.",
    "findingDetail.backTo": "Back to",
    "findingDetail.applyFix": "Apply Fix",
    "findingDetail.applying": "Applying…",
    "findingDetail.rescan": "Rescan (verify fix)",
    "findingDetail.rescanning": "Re-scanning…",
    "findingDetail.attackSuccessRate": "Attack success rate",
    "findingDetail.trialsVulnerable": "trials vulnerable",
    "findingDetail.severity": "Severity",
    "findingDetail.status": "Status",
    "findingDetail.threatMapping": "Threat mapping",
    "findingDetail.vulnClass": "Vuln class",
    "findingDetail.suggestedRemediation": "Suggested remediation",
    "findingDetail.exampleTranscript": "Example transcript",
  },
  ar: {
    "app.brand": "إيه آي شيلد",
    "app.tagline": "ماسح أمان الوكلاء",
    "app.footer": "أداة أمان دفاعية. لا تفحص إلا الأنظمة التي تملكها أو المصرح لك باختبارها.",

    "nav.dashboard": "لوحة التحكم",
    "nav.scans": "الفحوصات",
    "nav.targets": "الأهداف",
    "nav.corpus": "مجموعة الهجمات",
    "nav.audit": "سجل التدقيق",

    "theme.toggleToLight": "التبديل إلى الوضع الفاتح",
    "theme.toggleToDark": "التبديل إلى الوضع الداكن",
    "language.toggle": "تبديل اللغة",

    "common.retry": "إعادة المحاولة",
    "common.delete": "حذف",
    "common.deleting": "جارٍ الحذف…",
    "common.cancel": "إلغاء",

    "dashboard.title": "لوحة التحكم",
    "dashboard.noScans": "لا توجد فحوصات بعد.",
    "dashboard.loading": "جارٍ تحميل سجل الفحوصات…",
    "dashboard.emptyMessage": "شغّل أول فحص من صفحة الفحوصات لتعبئة لوحة التحكم.",
    "dashboard.viewLatestReport": "عرض أحدث تقرير",
    "dashboard.securityScore": "درجة الأمان",
    "dashboard.securityScoreSub": "100 ناقص متوسط الخطورة عبر كل هجوم",
    "dashboard.attacksRun": "الهجمات المنفذة (آخر فحص)",
    "dashboard.vulnerableFindings": "النتائج الضعيفة",
    "dashboard.totalScansRun": "إجمالي الفحوصات",
    "dashboard.scoreOverTime": "درجة الأمان عبر الزمن",
    "dashboard.findingsBySeverity": "النتائج حسب الخطورة (آخر فحص)",
    "dashboard.recentScans": "الفحوصات الأخيرة",
    "dashboard.col.target": "الهدف",
    "dashboard.col.started": "بدأ في",
    "dashboard.col.packs": "الحزم",
    "dashboard.col.attacks": "الهجمات",
    "dashboard.col.vulnerable": "الضعيفة",
    "dashboard.col.score": "الدرجة",

    "scans.title": "الفحوصات",
    "scans.subtitle": "كل فحص تم تشغيله على هدف، الأحدث أولاً.",
    "scans.newScan": "فحص جديد",
    "scans.runScan": "تشغيل الفحص",
    "scans.runningScan": "جارٍ تشغيل الفحص…",
    "scans.loading": "جارٍ تحميل الفحوصات…",
    "scans.emptyMessage": "لا توجد فحوصات بعد — انقر «فحص جديد» لتشغيل واحد.",
    "scans.form.target": "الهدف",
    "scans.form.trialsPerAttack": "عدد المحاولات لكل هجوم",
    "scans.form.attackPacks": "حزم الهجمات (لا شيء محدد = الكل)",
    "scans.form.authorizedBy": "مصرَّح من قِبل",
    "scans.col.scan": "الفحص",
    "scans.col.target": "الهدف",
    "scans.col.started": "بدأ في",
    "scans.col.trials": "المحاولات",
    "scans.col.attacks": "الهجمات",
    "scans.col.severityMix": "توزيع الخطورة",
    "scans.col.score": "الدرجة",

    "targets.title": "الأهداف",
    "targets.subtitle":
      "الوكلاء التي تم إعداد إيه آي شيلد لفحصها. مُعرَّفة في targets/*.yaml — يُرفض تشغيل الفحص ما لم يكن authorization.confirmed صحيحًا.",
    "targets.loading": "جارٍ تحميل الأهداف…",
    "targets.authorized": "مصرَّح به",
    "targets.notAuthorized": "غير مصرَّح به",
    "targets.adapter": "المهايئ",
    "targets.baseUrl": "الرابط الأساسي",
    "targets.assertedBy": "أكّده",
    "targets.applyFixSupported": "دعم تطبيق الإصلاح",
    "targets.indirectInjectionSupported": "دعم الحقن غير المباشر (V3)",

    "corpus.title": "مجموعة الهجمات",
    "corpus.loading": "جارٍ تحميل مجموعة الهجمات…",
    "corpus.col.id": "المعرّف",
    "corpus.col.name": "الاسم",
    "corpus.col.owasp": "OWASP",
    "corpus.col.mitre": "MITRE ATLAS",
    "corpus.col.priorSeverity": "الخطورة المتوقعة",
    "corpus.col.turns": "الجولات",
    "corpus.col.channel": "القناة",
    "corpus.channelIndirect": "مستند مسترجَع (غير مباشر)",
    "corpus.channelDirect": "محادثة مباشرة",

    "audit.title": "سجل التدقيق",
    "audit.subtitle": "كل فحص وإعادة فحص نفّذه المحرك — من، أي هدف، ومتى. سجل غير قابل للتعديل (ai_shield/audit.py).",
    "audit.loading": "جارٍ تحميل سجل التدقيق…",
    "audit.emptyMessage": "لا توجد إدخالات تدقيق بعد — تُكتب فور تشغيل فحص أو إعادة فحص.",
    "audit.col.time": "الوقت",
    "audit.col.event": "الحدث",
    "audit.col.scan": "الفحص",
    "audit.col.target": "الهدف",
    "audit.col.authorizedBy": "مصرَّح من قِبل",
    "audit.col.detail": "التفاصيل",

    "scanDetail.loading": "جارٍ تحميل الفحص…",
    "scanDetail.securityScore": "درجة الأمان",
    "scanDetail.attacksRun": "الهجمات المنفذة",
    "scanDetail.vulnerable": "الضعيفة",
    "scanDetail.needsReview": "بحاجة لمراجعة",
    "scanDetail.needsReviewSub": "أحكام قاضي الذكاء الاصطناعي منخفضة الثقة",
    "scanDetail.corpusVersion": "إصدار المجموعة",
    "scanDetail.configHash": "بصمة الإعداد",
    "scanDetail.packs": "الحزم",
    "scanDetail.trialsPerAttack": "المحاولات لكل هجوم",
    "scanDetail.findings": "النتائج",
    "scanDetail.allSeverities": "كل درجات الخطورة",
    "scanDetail.allPacks": "كل الحزم",
    "scanDetail.col.attack": "الهجوم",
    "scanDetail.col.owasp": "OWASP",
    "scanDetail.col.asr": "معدل النجاح",
    "scanDetail.col.severity": "الخطورة",
    "scanDetail.col.status": "الحالة",

    "findingDetail.loading": "جارٍ تحميل النتيجة…",
    "findingDetail.notFound": "لم يتم العثور على هذه النتيجة ضمن هذا الفحص.",
    "findingDetail.backTo": "العودة إلى",
    "findingDetail.applyFix": "تطبيق الإصلاح",
    "findingDetail.applying": "جارٍ التطبيق…",
    "findingDetail.rescan": "إعادة الفحص (للتحقق من الإصلاح)",
    "findingDetail.rescanning": "جارٍ إعادة الفحص…",
    "findingDetail.attackSuccessRate": "معدل نجاح الهجوم",
    "findingDetail.trialsVulnerable": "محاولات ضعيفة",
    "findingDetail.severity": "الخطورة",
    "findingDetail.status": "الحالة",
    "findingDetail.threatMapping": "تصنيف التهديد",
    "findingDetail.vulnClass": "فئة الثغرة",
    "findingDetail.suggestedRemediation": "الإصلاح المقترح",
    "findingDetail.exampleTranscript": "مثال على المحادثة",
  },
} as const;

export type TranslationKey = keyof (typeof dictionaries)["en"];

const STORAGE_LANG_KEY = STORAGE_KEY;

const LanguageContext = createContext<{
  language: Language;
  toggleLanguage: () => void;
  t: (key: TranslationKey) => string;
} | null>(null);

function getInitialLanguage(): Language {
  const stored = localStorage.getItem(STORAGE_LANG_KEY);
  return stored === "ar" ? "ar" : "en";
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>(getInitialLanguage);

  useEffect(() => {
    document.documentElement.setAttribute("lang", language);
    document.documentElement.setAttribute("dir", language === "ar" ? "rtl" : "ltr");
    localStorage.setItem(STORAGE_LANG_KEY, language);
  }, [language]);

  function toggleLanguage() {
    setLanguage((l) => (l === "en" ? "ar" : "en"));
  }

  function t(key: TranslationKey): string {
    return dictionaries[language][key] ?? dictionaries.en[key] ?? key;
  }

  return <LanguageContext.Provider value={{ language, toggleLanguage, t }}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within a LanguageProvider");
  return ctx;
}
