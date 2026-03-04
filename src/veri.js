// ─── Sabitler & Yardımcılar ─────────────────────────────────────────────────
export const STORAGE_KEY = "kisisel_muhasebe_v2";

export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2);

export const fmt = (n) =>
  new Intl.NumberFormat("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n || 0);

export const fmtDate = (d) => new Date(d).toLocaleDateString("tr-TR");

export const toYMD = (d) => {
  const date = new Date(d);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

export const today = () => toYMD(new Date());

export const defaultData = {
  kategoriler: [
    { id: "k1", ad: "Maaş", tur: "gelir", ustId: null, renk: "#4ade80" },
    { id: "k2", ad: "Freelance", tur: "gelir", ustId: null, renk: "#34d399" },
    { id: "k3", ad: "Kira Geliri", tur: "gelir", ustId: null, renk: "#6ee7b7" },
    { id: "k9", ad: "Diğer Gelir", tur: "gelir", ustId: null, renk: "#a7f3d0" },
    { id: "k4", ad: "Market", tur: "gider", ustId: null, renk: "#f87171" },
    { id: "k5", ad: "Faturalar", tur: "gider", ustId: null, renk: "#fb923c" },
    { id: "k6", ad: "Ulaşım", tur: "gider", ustId: null, renk: "#fbbf24" },
    { id: "k7", ad: "Sağlık", tur: "gider", ustId: null, renk: "#a78bfa" },
    { id: "k8", ad: "Eğlence", tur: "gider", ustId: null, renk: "#60a5fa" },
    { id: "k10", ad: "Kıyafet", tur: "gider", ustId: null, renk: "#f472b6" },
    { id: "k11", ad: "Yemek / Kafe", tur: "gider", ustId: null, renk: "#fb7185" },
    { id: "k12", ad: "Diğer Gider", tur: "gider", ustId: null, renk: "#94a3b8" },
    { id: "k51", ad: "Elektrik", tur: "gider", ustId: "k5", renk: "#fb923c" },
    { id: "k52", ad: "Su", tur: "gider", ustId: "k5", renk: "#fb923c" },
    { id: "k53", ad: "İnternet", tur: "gider", ustId: "k5", renk: "#fb923c" },
    { id: "k54", ad: "Doğalgaz", tur: "gider", ustId: "k5", renk: "#fb923c" },
  ],
  nakitHesaplar: [],
  bankaHesaplar: [],
  krediKartlari: [],
  krediler: [],
  borcAlacaklar: [],
  islemler: [],
  transferler: [],
  ayarlar: { maasGunu: 1 },
};

// Bütçe dönemi hesapla (maaş gününe göre)
export function getButceDonemi(tarihStr, maasGunu = 1) {
  const su = new Date(tarihStr + "T12:00:00");
  const y = su.getFullYear();
  const m = su.getMonth();
  const d = su.getDate();

  let bas, bit;

  if (d >= maasGunu) {
    // Bu ayın maaş gününden gelecek ayın önceki gününe
    bas = new Date(y, m, maasGunu);
    bit = new Date(y, m + 1, maasGunu - 1);
  } else {
    // Geçen ayın maaş gününden bu ayın önceki gününe
    bas = new Date(y, m - 1, maasGunu);
    bit = new Date(y, m, maasGunu - 1);
  }

  return {
    baslangic: toYMD(bas),
    bitis: toYMD(bit)
  };
}

// Tüm para hesaplarını düz liste olarak döner (transfer için)
export function tumHesaplar(data) {
  return [
    ...data.nakitHesaplar.filter(h => !h.pasif).map(h => ({ ...h, hesapTur: "nakit", etiket: `💵 ${h.ad}` })),
    ...data.bankaHesaplar.filter(h => !h.pasif).map(h => ({ ...h, hesapTur: "banka", etiket: `🏦 ${h.ad}` })),
    ...data.krediKartlari.filter(h => !h.pasif).map(h => ({ ...h, hesapTur: "krediKarti", etiket: `💳 ${h.ad}`, bakiye: -(h.kullanilanLimit || 0) })),
    ...data.krediler.map(h => ({ ...h, hesapTur: "kredi", etiket: `📋 ${h.ad}`, bakiye: -(h.kalanBorc || 0) })),
  ];
}

// Harcama yapılabilecek hesaplar (gider için)
export function harcamaHesaplari(data) {
  return [
    ...data.nakitHesaplar.filter(h => !h.pasif).map(h => ({ ...h, hesapTur: "nakit", ikon: "💵", grup: "Nakit" })),
    ...data.bankaHesaplar.filter(h => !h.pasif).map(h => ({ ...h, hesapTur: "banka", ikon: "🏦", grup: "Banka" })),
    ...data.krediKartlari.filter(h => !h.pasif).map(h => ({ ...h, hesapTur: "krediKarti", ikon: "💳", grup: "Kredi Kartı" })),
  ];
}

// Para gelebilecek hesaplar (gelir için)
export function gelirHesaplari(data) {
  return [
    ...data.nakitHesaplar.filter(h => !h.pasif).map(h => ({ ...h, hesapTur: "nakit", ikon: "💵", grup: "Nakit" })),
    ...data.bankaHesaplar.filter(h => !h.pasif).map(h => ({ ...h, hesapTur: "banka", ikon: "🏦", grup: "Banka" })),
  ];
}

// Hesap bakiyesini güncelle (transfer için)
export function hesapBakiyeGuncelle(data, hesapId, hesapTur, delta) {
  if (hesapTur === "nakit") {
    return { ...data, nakitHesaplar: data.nakitHesaplar.map(h => h.id === hesapId ? { ...h, bakiye: (h.bakiye || 0) + delta } : h) };
  }
  if (hesapTur === "banka") {
    return { ...data, bankaHesaplar: data.bankaHesaplar.map(h => h.id === hesapId ? { ...h, bakiye: (h.bakiye || 0) + delta } : h) };
  }
  if (hesapTur === "kredi") {
    return { ...data, krediler: data.krediler.map(k => k.id === hesapId ? { ...k, kalanBorc: (k.kalanBorc || 0) - delta } : k) };
  }
  return data;
}
// Kategori ikonu tahmini
export const katIkon = (ad) => {
  const a = (ad || "").toLowerCase();
  if (a.includes("maaş") || a.includes("maas")) return "💼";
  if (a.includes("kira")) return "🏠";
  if (a.includes("freelance")) return "💻";
  if (a.includes("market")) return "🛒";
  if (a.includes("fatura") || a.includes("elektrik") || a.includes("su") || a.includes("internet") || a.includes("gaz")) return "📄";
  if (a.includes("ulaşım") || a.includes("ulasim") || a.includes("taksi") || a.includes("otobüs")) return "🚗";
  if (a.includes("sağlık") || a.includes("saglik") || a.includes("ilaç")) return "💊";
  if (a.includes("eğlence") || a.includes("eglence") || a.includes("sinema")) return "🎬";
  if (a.includes("yemek") || a.includes("kafe") || a.includes("restoran")) return "🍽️";
  if (a.includes("kıyafet") || a.includes("kiyafet") || a.includes("giyim")) return "👕";
  return "📌";
};

// Veritabanı Temizliği: Aynı isimli kategorileri birleştir (Derin Temizlik)
export function kategorileriTemizle(data) {
  const { kategoriler, islemler } = data;
  const yeniKategoriler = [];
  const haritası = {}; // eskiId -> yeniId (canonicalId)
  const isimGruplari = {}; // "ad-tur" -> canonicalId

  // Kategorileri puanla: ustId'si null olanlara öncelik ver
  const siraliKategoriler = [...kategoriler].sort((a, b) => {
    const aPuan = !a.ustId ? 10 : (a.ustId === "k_" ? 5 : 0);
    const bPuan = !b.ustId ? 10 : (b.ustId === "k_" ? 5 : 0);
    return bPuan - aPuan;
  });

  // 1. Kategorileri sadece isim ve türe göre birleştir
  siraliKategoriler.forEach(kat => {
    const anahtar = `${kat.ad.trim().toLowerCase()}-${kat.tur}`;
    if (!isimGruplari[anahtar]) {
      // Bu isim/tür kombinasyonu için ilk kayıt (canonical)
      isimGruplari[anahtar] = kat.id;
      yeniKategoriler.push({ ...kat, ustId: null }); // Derin temizlikte hepsini ana kategori yapıyoruz
      haritası[kat.id] = kat.id;
    } else {
      // Zaten var olan bir isme yönlendir
      haritası[kat.id] = isimGruplari[anahtar];
    }
  });

  // 2. İşlemleri güncelle: kategoriId kullanılıyorsa yönlendir
  const finalIslemler = (islemler || []).map(islem => {
    if (islem.kategoriId && haritası[islem.kategoriId]) {
      return { ...islem, kategoriId: haritası[islem.kategoriId] };
    }
    return islem;
  });

  return { ...data, kategoriler: yeniKategoriler, islemler: finalIslemler };
}
