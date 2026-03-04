import { useState, useMemo, useEffect } from "react";
import { fmt, today, getButceDonemi, toYMD } from "../veri";

const katIkon = (ad = "", tur = "") => {
  const a = ad.toLowerCase();
  if (a.includes("maaş") || a.includes("maas")) return "💼";
  if (a.includes("kira")) return "🏠";
  if (a.includes("freelance")) return "💻";
  if (a.includes("market")) return "🛒";
  if (a.includes("fatura") || a.includes("elektrik") || a.includes("su") || a.includes("internet") || a.includes("gaz")) return "📄";
  if (a.includes("ulaşım") || a.includes("ulasim") || a.includes("taksi")) return "🚗";
  if (a.includes("sağlık") || a.includes("saglik") || a.includes("ilaç")) return "💊";
  if (a.includes("eğlence") || a.includes("eglence")) return "🎬";
  if (a.includes("yemek") || a.includes("kafe")) return "🍽️";
  if (a.includes("kıyafet") || a.includes("kiyafet")) return "👕";
  if (a.includes("kredi")) return "🏦";
  if (a.includes("transfer")) return "↔️";
  if (tur === "gelir" || tur === "transfer-giris") return "💰";
  if (tur === "gider" || tur === "transfer-cikis") return "💸";
  return "📌";
};

const ikonRenk = (tur) => {
  if (tur === "gelir") return "rgba(74,222,128,0.15)";
  if (tur === "gider") return "rgba(248,113,113,0.15)";
  return "rgba(201,168,76,0.15)";
};

export default function IslemlerSayfa({ data, guncelle, bildir, setSilinecek, onEdit, onDelete, onMultiDelete }) {
  const [donem, setDonem] = useState("bugun");
  const [seciliTarih, setSeciliTarih] = useState(today());
  const [seciliYil, setSeciliYil] = useState(new Date().getFullYear());
  const [seciliAy, setSeciliAy] = useState(new Date().getMonth() + 1);
  const [hesapFiltre, setHesapFiltre] = useState("tumu");
  const [turFiltre, setTurFiltre] = useState("tumu");
  const [anaKatFiltre, setAnaKatFiltre] = useState("tumu");
  const [altKatFiltre, setAltKatFiltre] = useState("tumu");
  const [arama, setArama] = useState("");
  const [seciliIds, setSeciliIds] = useState([]);

  // Dönem başlangıç ve bitiş hesapla
  const { baslangic, bitis } = useMemo(() => {
    const su = new Date();
    if (donem === "bugun") {
      return { baslangic: seciliTarih, bitis: seciliTarih };
    }
    if (donem === "buhafta") {
      const gun = su.getDay() || 7;
      const pazartesi = new Date(su);
      pazartesi.setDate(su.getDate() - gun + 1);
      const pazar = new Date(pazartesi);
      pazar.setDate(pazartesi.getDate() + 6);
      return {
        baslangic: toYMD(pazartesi),
        bitis: toYMD(pazar)
      };
    }
    if (donem === "buay") {
      return getButceDonemi(today(), data.ayarlar?.maasGunu || 1);
    }
    if (donem === "buyl") {
      return {
        baslangic: `${su.getFullYear()}-01-01`,
        bitis: `${su.getFullYear()}-12-31`
      };
    }
    if (donem === "ozel") {
      // Seçili ayın başından sonuna (veya maaş gününe göre)
      // Kullanıcı basit ay/yıl seçtiği için tam ayı baz alıyoruz
      // seciliAy 0 ise tüm yıl, değilse belirli ay
      if (seciliAy === 0) {
        return {
          baslangic: `${seciliYil}-01-01`,
          bitis: `${seciliYil}-12-31`
        };
      }
      const maasGunu = data.ayarlar?.maasGunu || 1;
      return getButceDonemi(`${seciliYil}-${String(seciliAy).padStart(2, "0")}-01`, maasGunu);
    }
    return { baslangic: null, bitis: null };
  }, [donem, seciliYil, seciliAy, data.ayarlar?.maasGunu, seciliTarih]);

  // Filtrelenmiş işlemler (transferler hariç)
  const filtreliIslemler = useMemo(() => {
    return data.islemler.filter(i => {
      if (i.tur.startsWith("transfer")) return false;
      if (baslangic && i.tarih < baslangic) return false;
      if (bitis && i.tarih > bitis) return false;
      if (turFiltre !== "tumu" && i.tur !== turFiltre) return false;

      // Kategori Filtresi (İki Aşamalı)
      if (anaKatFiltre !== "tumu") {
        if (altKatFiltre === "tumu") {
          // Ana kategori grubu seçili (kendisi + tüm alt dalları)
          const anaKatObj = data.kategoriler.find(k => k.ad === anaKatFiltre && !k.ustId);
          if (anaKatObj) {
            const altDallar = data.kategoriler.filter(k => k.ustId === anaKatObj.id).map(k => k.ad);
            const grupIsimleri = [anaKatObj.ad, ...altDallar];
            if (!grupIsimleri.includes(i.kategori)) return false;
          } else {
            if (i.kategori !== anaKatFiltre) return false;
          }
        } else {
          // Spesifik alt kategori seçili
          if (i.kategori !== altKatFiltre) return false;
        }
      }
      if (hesapFiltre !== "tumu" && i.hesapTur !== hesapFiltre) return false;
      if (arama) {
        const ara = arama.toLowerCase();
        if (!i.aciklama?.toLowerCase().includes(ara) &&
          !i.hesapAdi?.toLowerCase().includes(ara) &&
          !i.kategori?.toLowerCase().includes(ara)) return false;
      }
      return true;
    });
  }, [data.islemler, baslangic, bitis, turFiltre, anaKatFiltre, altKatFiltre, hesapFiltre, arama]);

  // Dönem toplamları
  const topGelir = filtreliIslemler.filter(i => i.tur === "gelir").reduce((s, i) => s + i.miktar, 0);
  const topGider = filtreliIslemler.filter(i => i.tur === "gider").reduce((s, i) => s + i.miktar, 0);

  // Güne göre grupla
  const gunGruplari = useMemo(() => {
    const grups = {};
    [...filtreliIslemler]
      .sort((a, b) => b.tarih.localeCompare(a.tarih) || b.id.localeCompare(a.id))
      .forEach(i => {
        if (!grups[i.tarih]) grups[i.tarih] = [];
        grups[i.tarih].push(i);
      });
    return Object.entries(grups).sort((a, b) => b[0].localeCompare(a[0]));
  }, [filtreliIslemler]);

  // Hesap seçenekleri
  const hesapSecenekler = [
    { value: "tumu", label: "Tüm Hesaplar" },
    { value: "nakit", label: "💵 Nakit" },
    { value: "banka", label: "🏦 Banka" },
    { value: "krediKarti", label: "💳 Kredi Kartı" },
  ];

  // Günlük geçiş fonksiyonu
  const gunDegistir = (yon) => {
    const [y, m, d] = seciliTarih.split("-").map(Number);
    const dateObj = new Date(y, m - 1, d + yon);
    setSeciliTarih(toYMD(dateObj));
    setDonem("bugun");
  };

  // Filtre değişince seçimleri sıfırla
  useEffect(() => setSeciliIds([]), [donem, hesapFiltre, turFiltre, anaKatFiltre, altKatFiltre, arama, seciliTarih]);

  const islemSil = (islem) => {
    setSilinecek({
      mesaj: `"${islem.aciklama || islem.kategori}" işlemini silmek istiyor musunuz?`,
      onay: () => onDelete(islem.id),
    });
  };

  const topluSil = () => {
    if (seciliIds.length === 0) return;
    setSilinecek({
      mesaj: `${seciliIds.length} seçili işlemi silmek istediğinizden emin misiniz? Bakiyeler geri alınacaktır.`,
      onay: () => {
        onMultiDelete(seciliIds);
        setSeciliIds([]);
      },
    });
  };

  const secimTetikle = (id) => {
    setSeciliIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const tumunuSecTetikle = () => {
    if (seciliIds.length === filtreliIslemler.length) {
      setSeciliIds([]);
    } else {
      setSeciliIds(filtreliIslemler.map(i => i.id));
    }
  };

  const gunBaslikFormat = (tarih) => {
    const d = new Date(tarih + "T12:00:00");
    const bugun = today();
    const dun = new Date(); dun.setDate(dun.getDate() - 1);
    const dunStr = dun.toISOString().split("T")[0];
    if (tarih === bugun) return "Bugün";
    if (tarih === dunStr) return "Dün";
    return d.toLocaleDateString("tr-TR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  };

  return (
    <div className="sayfa">
      <div className="sayfa-baslik">
        <h1>İşlemler</h1>
      </div>

      {/* Filtre Barı */}
      <div className="filtre-bar">
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          {[
            { v: "bugun", l: "Günlük" },
            { v: "buhafta", l: "Bu Hafta" },
            { v: "buay", l: "Bu Ay" },
            { v: "buyl", l: "Bu Yıl" },
            { v: "tumu", l: "Tümü" },
          ].map(d => (
            <button key={d.v}
              className={`btn btn-kucuk${donem === d.v ? " btn-altin" : " btn-ghost"}`}
              onClick={() => {
                setDonem(d.v);
                if (d.v === "bugun") setSeciliTarih(today());
              }}>
              {d.l}
            </button>
          ))}

          {donem === "bugun" && (
            <div style={{ display: "flex", gap: 4, alignItems: "center", marginLeft: 8 }}>
              <button className="btn btn-kucuk btn-ghost" style={{ padding: "4px 8px" }} onClick={() => gunDegistir(-1)}>◀</button>
              <input type="date" className="input" style={{ padding: "4px 8px", width: 130 }} value={seciliTarih} onChange={e => { setSeciliTarih(e.target.value); setDonem("bugun"); }} />
              <button className="btn btn-kucuk btn-ghost" style={{ padding: "4px 8px" }} onClick={() => gunDegistir(1)}>▶</button>
            </div>
          )}

          <div style={{ display: "flex", gap: 4, alignItems: "center", marginLeft: 8 }}>
            <select className="input" style={{ width: 110, padding: "4px 8px" }}
              value={seciliAy} onChange={e => { setSeciliAy(parseInt(e.target.value)); setDonem("ozel"); }}>
              <option value={0}>Yılın Tamamı</option>
              {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                <option key={m} value={m}>{new Date(2000, m - 1).toLocaleDateString("tr-TR", { month: "long" })}</option>
              ))}
            </select>
            <select className="input" style={{ width: 80, padding: "4px 8px" }}
              value={seciliYil} onChange={e => { setSeciliYil(parseInt(e.target.value)); setDonem("ozel"); }}>
              {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i).map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <input className="input" placeholder="Ara..." value={arama}
            onChange={e => setArama(e.target.value)} style={{ maxWidth: 140 }} />
          <select className="input" value={hesapFiltre} onChange={e => setHesapFiltre(e.target.value)} style={{ maxWidth: 140 }}>
            {hesapSecenekler.map(h => <option key={h.value} value={h.value}>{h.label}</option>)}
          </select>
          <select className="input" value={turFiltre} onChange={e => { setTurFiltre(e.target.value); setAnaKatFiltre("tumu"); setAltKatFiltre("tumu"); }} style={{ maxWidth: 120 }}>
            <option value="tumu">Gelir & Gider</option>
            <option value="gelir">Gelir</option>
            <option value="gider">Gider</option>
          </select>
          <select className="input" value={anaKatFiltre} onChange={e => { setAnaKatFiltre(e.target.value); setAltKatFiltre("tumu"); }} style={{ maxWidth: 140 }}>
            <option value="tumu">Tüm Kategoriler</option>
            {data.kategoriler
              .filter(k => !k.ustId && !k.pasif && (turFiltre === "tumu" || k.tur === turFiltre))
              .sort((a, b) => a.ad.localeCompare(b.ad, "tr"))
              .map(k => (
                <option key={k.id} value={k.ad}>{k.ad}</option>
              ))}
          </select>

          {anaKatFiltre !== "tumu" && (() => {
            const anaKat = data.kategoriler.find(k => k.ad === anaKatFiltre && !k.ustId);
            if (!anaKat) return null;
            const alts = data.kategoriler
              .filter(k => k.ustId === anaKat.id && !k.pasif)
              .sort((a, b) => a.ad.localeCompare(b.ad, "tr"));

            if (alts.length === 0) return null;

            return (
              <select className="input" value={altKatFiltre} onChange={e => setAltKatFiltre(e.target.value)} style={{ maxWidth: 140 }}>
                <option value="tumu">Tümü (Alt Kat.)</option>
                {alts.map(k => (
                  <option key={k.id} value={k.ad}>{k.ad}</option>
                ))}
              </select>
            );
          })()}
        </div>
      </div>

      {/* Toplu İşlem Barı */}
      {filtreliIslemler.length > 0 && (
        <div className="toplu-islem-bar" style={{
          display: "flex", alignItems: "center", gap: 12, padding: "10px 15px",
          background: "rgba(201,168,76,0.05)", borderRadius: 8, marginBottom: 16,
          border: "1px solid var(--kenar)"
        }}>
          <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13, userSelect: "none" }}>
            <input type="checkbox"
              checked={seciliIds.length > 0 && seciliIds.length === filtreliIslemler.length}
              onChange={tumunuSecTetikle}
            />
            Tümünü Seç ({filtreliIslemler.length})
          </label>

          {seciliIds.length > 0 && (
            <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: 13, color: "var(--altin)", fontWeight: 600 }}>{seciliIds.length} seçili</span>
              <button className="btn btn-kucuk btn-danger" onClick={topluSil}>Seçilenleri Sil</button>
            </div>
          )}
        </div>
      )}

      {/* Dönem Özet Kartları */}
      <div className="donem-ozet">
        <div className="do-kart pozitif-bg">
          <div className="do-label">Toplam Gelir</div>
          <div className="do-deger pozitif">+{fmt(topGelir)} ₺</div>
        </div>
        <div className="do-kart negatif-bg">
          <div className="do-label">Toplam Gider</div>
          <div className="do-deger negatif">-{fmt(topGider)} ₺</div>
        </div>
        <div className={`do-kart ${topGelir - topGider >= 0 ? "pozitif-bg" : "negatif-bg"}`}>
          <div className="do-label">Net</div>
          <div className={`do-deger ${topGelir - topGider >= 0 ? "pozitif" : "negatif"}`}>
            {topGelir - topGider >= 0 ? "+" : ""}{fmt(topGelir - topGider)} ₺
          </div>
        </div>
      </div>

      {/* İşlem Listesi — Güne Göre Gruplu */}
      {gunGruplari.length === 0 ? (
        <div className="panel"><div className="bos-durum">Bu dönemde işlem bulunamadı</div></div>
      ) : (
        gunGruplari.map(([tarih, islemler]) => {
          const gunGelir = islemler.filter(i => i.tur === "gelir").reduce((s, i) => s + i.miktar, 0);
          const gunGider = islemler.filter(i => i.tur === "gider").reduce((s, i) => s + i.miktar, 0);
          return (
            <div key={tarih} className="gun-grup">
              {/* Gün Başlığı */}
              <div className="gun-baslik">
                <span className="gun-baslik-tarih">{gunBaslikFormat(tarih)}</span>
                <div className="gun-baslik-ozet">
                  {gunGelir > 0 && <span className="pozitif">+{fmt(gunGelir)} ₺</span>}
                  {gunGider > 0 && <span className="negatif">-{fmt(gunGider)} ₺</span>}
                  {(gunGelir > 0 || gunGider > 0) && (
                    <span className={gunGelir - gunGider >= 0 ? "pozitif" : "negatif"}
                      style={{ borderLeft: "1px solid var(--kenar)", paddingLeft: 12 }}>
                      {fmt(gunGelir - gunGider)} ₺
                    </span>
                  )}
                </div>
              </div>

              {/* Günün İşlemleri */}
              <div className="panel" style={{ padding: 0, overflow: "hidden" }}>
                {islemler.map((i, idx) => (
                  <div key={i.id} className={`islem-satir ${seciliIds.includes(i.id) ? "secili" : ""}`}
                    style={{ borderBottom: idx === islemler.length - 1 ? "none" : undefined }}>
                    {/* Checkbox */}
                    <div style={{ paddingRight: 12, display: "flex", alignItems: "center" }}>
                      <input type="checkbox"
                        checked={seciliIds.includes(i.id)}
                        onChange={() => secimTetikle(i.id)}
                        onClick={e => e.stopPropagation()}
                      />
                    </div>
                    {/* İkon */}
                    <div className="islem-ikon" style={{ background: ikonRenk(i.tur) }}>
                      {katIkon(i.kategori || "", i.tur)}
                    </div>
                    {/* Bilgi */}
                    <div className="islem-bilgi">
                      <div className="islem-aciklama">{i.aciklama || i.kategori}</div>
                      <div className="islem-meta">
                        <span className="badge">{i.hesapAdi}</span>
                        {i.kategori && i.aciklama && <span className="badge">{i.kategori}</span>}
                      </div>
                    </div>
                    {/* Tutar */}
                    <div className="islem-tutar" style={{ textAlign: "right", minWidth: 100, fontWeight: 600 }}>
                      <span className={i.tur === "gelir" ? "pozitif" : "negatif"}>
                        {i.tur === "gelir" ? "+" : "-"}{fmt(i.miktar)} ₺
                      </span>
                    </div>
                    {/* Düzenle / Sil */}
                    <div style={{ display: "flex", gap: 4 }}>
                      <button className="btn-duzenle islem-sil" onClick={() => onEdit(i)} title="Düzenle">✏️</button>
                      <button className="btn-sil islem-sil" onClick={() => islemSil(i)} title="Sil">✕</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
