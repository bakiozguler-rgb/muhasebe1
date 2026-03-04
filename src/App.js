import { useState, useEffect, useCallback } from "react";
import { STORAGE_KEY, uid, fmt, defaultData, today, toYMD } from "./veri";
import css from "./stiller";
import IslemWizard from "./components/IslemWizard";
import IslemlerSayfa from "./components/IslemlerSayfa";
import OzetSayfa from "./components/OzetSayfa";
import HesapSayfa from "./components/HesapSayfa";
import KrediKartiSayfa from "./components/KrediKartiSayfa";
import {
  KrediSayfa, BorcAlacakSayfa, KategorilerSayfa,
  RaporlarSayfa, TransferlerSayfa
} from "./components/DigerSayfalar";
import AyarlarSayfa from "./components/AyarlarSayfa";
import { getButceDonemi } from "./veri";

export default function App() {
  const [data, setData] = useState(null);
  const [sayfa, setSayfa] = useState("ozet");
  const [modal, setModal] = useState(null);
  const [wizardAcik, setWizardAcik] = useState(false);
  const [bildirim, setBildirim] = useState(null);
  const [silinecek, setSilinecek] = useState(null);

  // localStorage'dan yükle
  useEffect(() => {
    try {
      const kayitli = localStorage.getItem(STORAGE_KEY);
      if (kayitli) {
        const parsed = JSON.parse(kayitli);
        // Veri temizliği: Hatalı yılları düzelt (örneğin 12026 -> 2026)
        const temizIslemler = (parsed.islemler || []).map(i => {
          if (i.tarih && i.tarih.startsWith("1")) {
            const parts = i.tarih.split("-");
            if (parts[0].length === 5 && parts[0].startsWith("1")) {
              parts[0] = parts[0].substring(1);
              return { ...i, tarih: parts.join("-") };
            }
          }
          return i;
        });
        setData({ ...defaultData, ...parsed, islemler: temizIslemler, transferler: parsed.transferler || [] });
      } else {
        setData(defaultData);
      }
    } catch { setData(defaultData); }
  }, []);

  const kaydet = useCallback((yeniData) => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(yeniData)); } catch (e) { console.error(e); }
  }, []);

  const guncelle = useCallback((fn) => {
    setData(prev => { const yeni = fn(prev); kaydet(yeni); return yeni; });
  }, [kaydet]);

  const bildir = (mesaj, tur = "basari") => {
    setBildirim({ mesaj, tur });
    setTimeout(() => setBildirim(null), 3000);
  };

  // Otomatik Yedekleme Mantığı
  useEffect(() => {
    if (!data || !data.ayarlar?.yedekKlasoru || !window.electronAPI) return;

    const yedekleOnClose = () => {
      window.electronAPI.saveBackup(data.ayarlar.yedekKlasoru, data);
    };

    window.addEventListener("beforeunload", yedekleOnClose);
    return () => window.removeEventListener("beforeunload", yedekleOnClose);
  }, [data]);

  const islemBakiyeEtkisi = (d, islem, carpan) => {
    const tutar = Number(islem.miktar) * carpan || 0;
    let yeniData = { ...d };

    // 1. Standart Hesap Bakiyeleri (Gelir/Gider/Borç-Alacak Doğuşu)
    if (!["kk_odeme", "kredi_odeme"].includes(islem.tur)) {
      const isParaGirisi = islem.tur === "gelir" || islem.tur === "borc_dogus";
      const isParaCikisi = islem.tur === "gider" || islem.tur === "alacak_dogus";

      if (islem.hesapTur === "nakit") {
        yeniData = { ...yeniData, nakitHesaplar: yeniData.nakitHesaplar.map(h => h.id === islem.hesapId ? { ...h, bakiye: (h.bakiye || 0) + (isParaGirisi ? tutar : (isParaCikisi ? -tutar : 0)) } : h) };
      } else if (islem.hesapTur === "banka") {
        yeniData = { ...yeniData, bankaHesaplar: yeniData.bankaHesaplar.map(h => h.id === islem.hesapId ? { ...h, bakiye: (h.bakiye || 0) + (isParaGirisi ? tutar : (isParaCikisi ? -tutar : 0)) } : h) };
      } else if (islem.hesapTur === "krediKarti") {
        // Normal kredi kartı harcaması (gider olmalı veya alacak_dogus - nakit avans gibi ama genellikle gider)
        yeniData = { ...yeniData, krediKartlari: yeniData.krediKartlari.map(k => k.id === islem.hesapId ? { ...k, kullanilanLimit: (k.kullanilanLimit || 0) + tutar } : k) };
      }
    }

    // 2. Kredi Kartı veya Kredi Ödemesi (Özel Durum)
    if (islem.tur === "kk_odeme" || islem.tur === "kredi_odeme") {
      // Kaynak hesap bakiyesini düş (Nakit veya Banka)
      if (islem.hesapTur === "nakit") {
        yeniData = { ...yeniData, nakitHesaplar: yeniData.nakitHesaplar.map(h => h.id === islem.hesapId ? { ...h, bakiye: (h.bakiye || 0) - tutar } : h) };
      } else if (islem.hesapTur === "banka") {
        yeniData = { ...yeniData, bankaHesaplar: yeniData.bankaHesaplar.map(h => h.id === islem.hesapId ? { ...h, bakiye: (h.bakiye || 0) - tutar } : h) };
      }

      // Kart borcunu düş
      if (islem.tur === "kk_odeme" && islem.kartId) {
        yeniData = {
          ...yeniData,
          krediKartlari: yeniData.krediKartlari.map(k => k.id === islem.kartId ? { ...k, kullanilanLimit: (k.kullanilanLimit || 0) - tutar } : k)
        };
      }

      // Kredi borcunu düş
      if (islem.tur === "kredi_odeme" && islem.krediId) {
        yeniData = {
          ...yeniData,
          krediler: yeniData.krediler.map(k => {
            if (k.id === islem.krediId) {
              const odenenEtkisi = tutar; // carpan dahil
              let yeniVade = k.vade;
              let yeniPasif = k.pasif;
              let yeniToplamaDahil = k.toplamaDahil;

              if (islem.krediOdemeTuru === "kapat") {
                // Kapatırken: carpan 1 ise (yeni ekleniyor), pasife al ve toplamdan çıkar.
                // carpan -1 ise (siliniyor), aktif yap ve toplama dahil et.
                yeniPasif = (carpan === 1);
                yeniToplamaDahil = (carpan === -1);
              } else if (islem.krediOdemeTuru === "taksit") {
                // Taksit ödenirken vade eksilsin. Silinirken geri artsın.
                yeniVade = (k.vade || 0) - carpan;
              }

              return {
                ...k,
                kalanBorc: (k.kalanBorc || 0) - odenenEtkisi,
                odenenTutar: (k.odenenTutar || 0) + odenenEtkisi,
                vade: yeniVade,
                pasif: yeniPasif,
                toplamaDahil: yeniToplamaDahil
              };
            }
            return k;
          })
        };
      }
    }

    // 3. Kredi Borcu Senkronizasyonu (Normal Giderler İçin)
    if (islem.krediId && islem.tur !== "kredi_odeme") {
      yeniData = {
        ...yeniData,
        krediler: yeniData.krediler.map(k => {
          if (k.id !== islem.krediId) return k;
          if (islem.tur === "gider") {
            return {
              ...k,
              kalanBorc: (k.kalanBorc || 0) - tutar,
              odenenTutar: (k.odenenTutar || 0) + tutar
            };
          }
          return k;
        })
      };
    }

    // 4. Borç/Alacak Senkronizasyonu
    // Ayni zamanda gelir/gider islemine de yansidigi icin borc/alacak miktarini tersine islemeliyiz.
    if (islem.borcAlacakId) {
      if (["alacak_dogus", "borc_dogus"].includes(islem.tur)) {
        // Kaydın başlangıç tutarı düzenleniyorsa veya siliniyorsa, asıl miktarı doğrudan güncelle
        yeniData = {
          ...yeniData,
          borcAlacaklar: yeniData.borcAlacaklar.map(b => {
            if (b.id !== islem.borcAlacakId) return b;
            return { ...b, miktar: (b.miktar || 0) + tutar };
          })
        };
      } else {
        // Tahsilat (gelir) veya Ödeme (gider) yapılıyorsa borç/alacak kapanır (azalır)
        // carpan=-1 (silme) durumunda borcu geri artirmamiz lazim
        // carpan=1 (ekleme) durumunda (tutar pozitif) borcu azaltmamiz lazim.
        // Yukaridaki tutar = islem.miktar * carpan. Eger carpan=1 ise tutar pozitif.
        // Odenince borc dusecegi icin 'eksi tutar' yapilir. Odenen islem silinirse 'arti tutar' yapilir.
        yeniData = {
          ...yeniData,
          borcAlacaklar: yeniData.borcAlacaklar.map(b => {
            if (b.id !== islem.borcAlacakId) return b;
            return { ...b, miktar: (b.miktar || 0) - tutar };
          })
        };
      }
    }

    return yeniData;
  };

  // Wizard'dan gelen işlemi kaydet / Taksitlendirme
  const wizardKaydet = (islem, kapat = false, taksitSayisi = 1) => {
    guncelle(d => {
      let yeniData = d;
      let yeniIslemler = [];

      if (taksitSayisi > 1 && islem.hesapTur === "krediKarti") {
        const taksitTutari = islem.miktar / taksitSayisi;
        const anaTarih = new Date(islem.tarih);

        for (let i = 0; i < taksitSayisi; i++) {
          const tTarih = new Date(anaTarih);
          tTarih.setMonth(tTarih.getMonth() + i);

          yeniIslemler.push({
            ...islem,
            id: uid(),
            tarih: toYMD(tTarih),
            miktar: taksitTutari,
            aciklama: `${islem.aciklama || islem.kategori} (${i + 1}/${taksitSayisi})`
          });
        }
        // Bakiye etkisi (tüm tutar hemen karta yansır)
        yeniData = islemBakiyeEtkisi(yeniData, islem, 1);
      } else {
        yeniIslemler = [islem];
        yeniData = islemBakiyeEtkisi(yeniData, islem, 1);
      }

      return { ...yeniData, islemler: [...yeniData.islemler, ...yeniIslemler] };
    });
    if (kapat) setWizardAcik(false);
    bildir(`${islem.tur === "gelir" ? "Gelir" : "Gider"} kaydedildi.`);
  };

  const islemSil = (islemId) => {
    guncelle(d => {
      const islem = d.islemler.find(i => i.id === islemId);
      if (!islem) return d;
      const dataBakiyeGeri = islemBakiyeEtkisi(d, islem, -1);
      return { ...dataBakiyeGeri, islemler: dataBakiyeGeri.islemler.filter(i => i.id !== islemId) };
    });
    bildir("İşlem silindi.", "uyari");
  };

  const cokluIslemSil = (ids) => {
    guncelle(d => {
      let yeniData = d;
      ids.forEach(id => {
        const islem = yeniData.islemler.find(i => i.id === id);
        if (islem) {
          yeniData = islemBakiyeEtkisi(yeniData, islem, -1);
        }
      });
      return { ...yeniData, islemler: yeniData.islemler.filter(i => !ids.includes(i.id)) };
    });
    bildir(`${ids.length} işlem silindi.`, "uyari");
  };

  const islemGuncelle = (islemId, yeniIslem) => {
    guncelle(d => {
      const eskiIslem = d.islemler.find(i => i.id === islemId);
      if (!eskiIslem) return d;
      // Eski etkiyi geri al, yeni etkiyi uygula
      let temp = islemBakiyeEtkisi(d, eskiIslem, -1);
      let final = islemBakiyeEtkisi(temp, yeniIslem, 1);
      return { ...final, islemler: final.islemler.map(i => i.id === islemId ? yeniIslem : i) };
    });
    setModal(null);
    bildir("İşlem güncellendi.");
  };

  if (!data) return (
    <div style={{ background: "#060c1a", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ color: "#c9a84c", fontFamily: "serif", fontSize: 24 }}>Yükleniyor...</div>
    </div>
  );

  // ─── Hesaplamalar ─────────────────────────────────────────────────────
  const hFiltre = (h) => !(h.pasif && h.toplamaDahil === false);

  const toplamNakit = data.nakitHesaplar.filter(hFiltre).reduce((s, h) => s + (parseFloat(h.bakiye) || 0), 0);
  const toplamBanka = data.bankaHesaplar.filter(hFiltre).reduce((s, h) => s + (parseFloat(h.bakiye) || 0), 0);
  const toplamKKBorc = data.krediKartlari.filter(hFiltre).reduce((s, k) => s + (parseFloat(k.kullanilanLimit) || 0), 0);
  const toplamKrediBorc = data.krediler.filter(hFiltre).reduce((s, k) => s + (parseFloat(k.kalanBorc) || 0), 0);
  const toplamAlacak = data.borcAlacaklar.filter(b => b.tur === "alacak" && hFiltre(b)).reduce((s, b) => s + (parseFloat(b.miktar) || 0), 0);
  const toplamBorc = data.borcAlacaklar.filter(b => b.tur === "borc" && hFiltre(b)).reduce((s, b) => s + (parseFloat(b.miktar) || 0), 0);
  const netVarlik = toplamNakit + toplamBanka + toplamAlacak - toplamKKBorc - toplamKrediBorc - toplamBorc;

  const { baslangic, bitis } = getButceDonemi(today(), data.ayarlar?.maasGunu || 1);
  const buAy = data.islemler.filter(i => {
    if (i.tur.startsWith("transfer")) return false;
    return i.tarih >= baslangic && i.tarih <= bitis;
  });
  const buAyGelir = buAy.filter(i => i.tur === "gelir").reduce((s, i) => s + (parseFloat(i.miktar) || 0), 0);
  const buAyGider = buAy.filter(i => i.tur === "gider").reduce((s, i) => s + (parseFloat(i.miktar) || 0), 0);

  // ─── Sayfalar ─────────────────────────────────────────────────────────
  const sayfalar = {
    ozet: <OzetSayfa data={data} toplamNakit={toplamNakit} toplamBanka={toplamBanka}
      toplamKKBorc={toplamKKBorc} toplamKrediBorc={toplamKrediBorc}
      toplamAlacak={toplamAlacak} toplamBorc={toplamBorc} netVarlik={netVarlik}
      buAyGelir={buAyGelir} buAyGider={buAyGider} fmt={fmt}
      onEdit={(islem) => setModal(<IslemWizard data={data} guncelle={guncelle} bildir={bildir} eskiIslem={islem} onKaydet={(y) => islemGuncelle(islem.id, y)} onKapat={() => setModal(null)} />)} />,

    islemler: <IslemlerSayfa data={data} guncelle={guncelle} bildir={bildir} setSilinecek={setSilinecek}
      onDelete={islemSil} onMultiDelete={cokluIslemSil}
      onEdit={(islem) => setModal(<IslemWizard data={data} guncelle={guncelle} bildir={bildir} eskiIslem={islem} onKaydet={(y) => islemGuncelle(islem.id, y)} onKapat={() => setModal(null)} />)} />,
    transferler: <TransferlerSayfa data={data} guncelle={guncelle} bildir={bildir} setSilinecek={setSilinecek} />,

    nakit: <HesapSayfa baslik="Nakit Hesaplar" hesaplar={data.nakitHesaplar} hesapTur="nakit"
      data={data} guncelle={guncelle} bildir={bildir} setModal={setModal} setSilinecek={setSilinecek} />,
    banka: <HesapSayfa baslik="Banka Hesapları" hesaplar={data.bankaHesaplar} hesapTur="banka"
      data={data} guncelle={guncelle} bildir={bildir} setModal={setModal} setSilinecek={setSilinecek} />,

    kredikarti: <KrediKartiSayfa data={data} guncelle={guncelle} bildir={bildir}
      setModal={setModal} setSilinecek={setSilinecek} />,
    kredi: <KrediSayfa data={data} guncelle={guncelle} bildir={bildir}
      setModal={setModal} setSilinecek={setSilinecek} />,
    borcalacak: <BorcAlacakSayfa data={data} guncelle={guncelle} bildir={bildir}
      setModal={setModal} setSilinecek={setSilinecek} />,
    kategoriler: <KategorilerSayfa data={data} guncelle={guncelle} bildir={bildir} setModal={setModal} />,
    raporlar: <RaporlarSayfa data={data} />,
    ayarlar: <AyarlarSayfa data={data} guncelle={guncelle} bildir={bildir} />,
  };

  const navItems = [
    { id: "ozet", icon: "⊞", label: "Özet" },
    { id: "islemler", icon: "↕", label: "İşlemler" },
    { id: "transferler", icon: "⇄", label: "Transferler" },
    { id: "nakit", icon: "💵", label: "Nakit" },
    { id: "banka", icon: "🏦", label: "Banka" },
    { id: "kredikarti", icon: "💳", label: "Kredi Kartı" },
    { id: "kredi", icon: "📋", label: "Krediler" },
    { id: "borcalacak", icon: "⇌", label: "Borç/Alacak" },
    { id: "kategoriler", icon: "◉", label: "Kategoriler" },
    { id: "raporlar", icon: "▤", label: "Raporlar" },
    { id: "ayarlar", icon: "⚙", label: "Ayarlar" },
  ];

  return (
    <>
      <style>{css}</style>
      <div className="app">
        {/* SIDEBAR */}
        <aside className="sidebar">
          <div className="logo">
            <span className="logo-icon">₺</span>
            <div>
              <div className="logo-title">Muhasebe</div>
              <div className="logo-sub">Kişisel Finans</div>
            </div>
          </div>

          {/* YENİ İŞLEM BUTONU */}
          <button className="yeni-islem-btn" onClick={() => setWizardAcik(true)}>
            ＋ Yeni İşlem
          </button>

          <nav className="nav">
            {navItems.map(item => (
              <button key={item.id} className={`nav-item${sayfa === item.id ? " active" : ""}`}
                onClick={() => setSayfa(item.id)}>
                <span className="nav-icon">{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}
          </nav>

          <div className="sidebar-footer">
            <div className="net-varlik">
              <div className="nv-label">Net Varlık</div>
              <div className={`nv-value ${netVarlik >= 0 ? "pozitif" : "negatif"}`}>{fmt(netVarlik)} ₺</div>
            </div>
          </div>
        </aside>

        {/* MAIN */}
        <main className="main">{sayfalar[sayfa]}</main>

        {/* BİLDİRİM */}
        {bildirim && <div className={`bildirim ${bildirim.tur}`}>{bildirim.mesaj}</div>}

        {/* SİLME ONAY */}
        {silinecek && (
          <div className="modal-overlay" onClick={() => setSilinecek(null)}>
            <div className="modal-box onay-modal" onClick={e => e.stopPropagation()}>
              <h3>Silme Onayı</h3>
              <p>{silinecek.mesaj}</p>
              <div className="modal-actions">
                <button className="btn btn-ghost" onClick={() => setSilinecek(null)}>İptal</button>
                <button className="btn btn-danger" onClick={() => { silinecek.onay(); setSilinecek(null); }}>Sil</button>
              </div>
            </div>
          </div>
        )}

        {/* GENEL MODAL */}
        {modal && (
          <div className="modal-overlay" onClick={() => setModal(null)}>
            <div className="modal-box" onClick={e => e.stopPropagation()}>{modal}</div>
          </div>
        )}

        {wizardAcik && (
          <IslemWizard data={data} guncelle={guncelle} bildir={bildir} onKaydet={wizardKaydet} onKapat={() => setWizardAcik(false)} />
        )}
      </div>
    </>
  );
}
