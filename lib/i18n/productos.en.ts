import type { Lang } from "@/lib/i18n/dict";

type TextoEN = { titulo?: string; descripcion?: string };

const textos: Record<string, TextoEN> = {
  "goku-gohan-beast-vjump-exclusive": {
    descripcion:
      "Exclusive Vjump figure of Goku and Gohan in their Beast form. Limited edition imported from Japan.",
  },
  "tanjiro-flame-breathing": {
    descripcion:
      "Tanjiro figure with the Flame Breathing effect. High-quality PVC, 23 cm tall.",
  },
  "naruto-sage-mode-remastered": {
    descripcion:
      "Remastered edition of Naruto in Sage Mode. Detailed finish with chakra effects.",
  },
  "rengoku-flame-hashira": {
    descripcion:
      "Rengoku figure from his final battle. Fire effect with built-in LED light.",
  },
  "vegeta-ultra-ego-limited": {
    descripcion:
      "Limited edition of Vegeta in Ultra Ego. Includes a destruction-effect base and interchangeable parts.",
  },
  "gojo-infinite-void": {
    descripcion:
      "Gojo Satoru figure with the Infinite Void effect. Blindfold included with a holographic finish.",
  },
  "luffy-gear-5-nikkei": {
    descripcion:
      "Luffy figure in Gear 5, an exclusive Nikkei collaboration. Impressive detail and premium finish.",
  },
  "sukuna-ryomen-artfx": {
    titulo: "Sukuna Ryomen ArtFX J Figure",
    descripcion:
      "ArtFX J figure of Sukuna Ryomen from Jujutsu Kaisen. Detailed sculpt with a themed base.",
  },
  "denji-chainsaw-transformation": {
    descripcion:
      "Denji figure transformed into Chainsaw Man. Detailed blood and chains effect.",
  },
  "zoro-wano-country": {
    descripcion:
      "Zoro figure from the Wano arc. Three detailed swords with a velvet sheath.",
  },
  "camiseta-attack-on-titan-eren-titan": {
    titulo: "Attack on Titan T-Shirt - Eren Titan",
    descripcion:
      "Short-sleeve T-shirt with a front print of Eren Yeager in his Attack Titan form and the official logo.",
  },
};

export function traducirCampo(
  slug: string,
  campo: "titulo" | "descripcion",
  original: string | null | undefined,
  lang: Lang,
): string {
  if (lang !== "en") return original ?? "";
  return textos[slug]?.[campo] ?? original ?? "";
}
