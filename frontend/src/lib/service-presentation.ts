import type { ServiceItem } from "@/lib/api";

type ServicePresentation = {
  icon: string;
  accent: string;
  headlineAr: string;
  headlineFr: string;
  startsFrom: boolean;
};

const PRESENTATIONS: Array<{ match: string[]; value: ServicePresentation }> = [
  {
    match: ["غسيل داخلي و خارجي", "lavage interieur et exterieur", "lavage interieur et exterieur"],
    value: {
      icon: "🫧",
      accent: "from-sky-500/20 to-cyan-500/10 border-sky-500/25",
      headlineAr: "لمعة يومية ونظافة كاملة داخل وخارج السيارة",
      headlineFr: "Une remise a neuf rapide pour l'interieur et l'exterieur",
      startsFrom: true,
    },
  },
  {
    match: ["غسيل سيراميك سبراي", "nettoyant ceramique en spray"],
    value: {
      icon: "💎",
      accent: "from-violet-500/20 to-fuchsia-500/10 border-violet-500/25",
      headlineAr: "طبقة لمعان سريعة مع حماية سيراميك خفيفة",
      headlineFr: "Brillance immediate avec protection ceramique en spray",
      startsFrom: false,
    },
  },
  {
    match: ["تنظيف عميق بالبوخار", "nettoyage a la vapeur en profondeur"],
    value: {
      icon: "♨️",
      accent: "from-emerald-500/20 to-teal-500/10 border-emerald-500/25",
      headlineAr: "تنظيف عميق للمقصورة والزوايا الحساسة بالبخار",
      headlineFr: "Nettoyage vapeur profond pour tissus, plastiques et details",
      startsFrom: true,
    },
  },
  {
    match: ["تفصيل", "detailing"],
    value: {
      icon: "🔍",
      accent: "from-amber-500/20 to-yellow-500/10 border-amber-500/25",
      headlineAr: "خدمة تفصيل ترفع مستوى العرض واللمسة النهائية",
      headlineFr: "Un detailing premium pour une finition showroom",
      startsFrom: true,
    },
  },
  {
    match: ["ازالة خدوش", "polissage lustrage"],
    value: {
      icon: "✨",
      accent: "from-rose-500/20 to-orange-500/10 border-rose-500/25",
      headlineAr: "تصحيح ولمعان يعيدان الحيوية لسطح الطلاء",
      headlineFr: "Polissage et lustrage pour corriger les defauts visibles",
      startsFrom: true,
    },
  },
  {
    match: ["ازالة خدوش عميقة عملية دقيقة", "elimination des rayures profondes"],
    value: {
      icon: "🛠️",
      accent: "from-red-500/20 to-pink-500/10 border-red-500/25",
      headlineAr: "معالجة دقيقة للخدوش العميقة حسب حالة كل جزء",
      headlineFr: "Intervention delicate et localisee sur les rayures profondes",
      startsFrom: false,
    },
  },
  {
    match: ["نانو سيراميك", "nano ceramic"],
    value: {
      icon: "🛡️",
      accent: "from-indigo-500/20 to-blue-500/10 border-indigo-500/25",
      headlineAr: "حماية طويلة المدى ولمعان فاخر للهيكل",
      headlineFr: "Protection haut de gamme longue duree pour la carrosserie",
      startsFrom: true,
    },
  },
];

function normalize(value: string | null | undefined) {
  return (value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

export function getServicePresentation(service: Pick<ServiceItem, "name" | "name_ar" | "category">) {
  const candidates = [normalize(service.name), normalize(service.name_ar), normalize(service.category)];
  for (const entry of PRESENTATIONS) {
    if (entry.match.some((item) => candidates.some((candidate) => candidate.includes(normalize(item))))) {
      return entry.value;
    }
  }

  return {
    icon: "⚙️",
    accent: "from-gray-500/20 to-gray-600/10 border-gray-500/20",
    headlineAr: "خدمة عناية احترافية لسيارتك",
    headlineFr: "Service professionnel pour votre vehicule",
    startsFrom: false,
  } satisfies ServicePresentation;
}

export function formatServicePriceLabel(service: Pick<ServiceItem, "name" | "name_ar" | "category" | "price">, locale: "ar" | "fr") {
  const presentation = getServicePresentation(service);
  const amount = `${Number(service.price).toFixed(3)} TND`;
  if (!presentation.startsFrom) {
    return amount;
  }
  return locale === "ar" ? `ابتداء من ${amount}` : `A partir de ${amount}`;
}
