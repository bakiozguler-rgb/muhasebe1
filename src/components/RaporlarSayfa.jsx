import { useState } from "react";
import { fmt, fmtDate, today, getButceDonemi, toYMD } from "../veri";

// ═══════════════════════════════════════════════════════════════════════════
// RAPORLAR SAYFASI
// ═══════════════════════════════════════════════════════════════════════════
export function RaporlarSayfa({ data }) {
  const [aktifSekme, setAktifSekme] = useState("genel");

  const suan = new Date();
  const [filtreTuru, setFiltreTuru] = useState("ay");
  const [seciliAy, setSeciliAy] = useState(suan.toISOString().slice(0, 7));
  const [seciliYil, setSeciliYil] = useState(suan.getFullYear().toString());
  const [basTarih, setBasTarih] = useState(today());
  const [bitTarih, setBitTarih] = useState(today());

  const [vadeliTurFiltre, setVadeliTurFiltre] = useState("tumu");
  const [vadeliTarihFiltre, setVadeliTarihFiltre] = useState("bu_ay");
  const [vadeliSeciliAy, setVadeliSeciliAy] = useState(suan.toISOString().slice(0, 7));

  const [kdFiltreTuru, setKdFiltreTuru] = useState("ay");
  const [kdAyOffset, setKdAyOffset] = useState(0);
  const [kdSeciliAy, setKdSeciliAy] = useState(suan.toISOString().slice(0, 7));
  const [kdBasTarih, setKdBasTarih] = useState(today());
  const [kdBitTarih, setKdBitTarih] = useState(today());
  const [seciliKatlar, setSeciliKatlar] = useState([]);
  const [kdGenisletilmis, setKdGenisletilmis] = useState([]);

  const maasGunu = data.ayarlar?.maasGunu || 1;

  // ── Genel Filtre ──
  const filtreliIslemler = data.islemler.filter(i => {
    if (i.tur.startsWith("transfer")) return false;
    const d = new Date(i.tarih);
    if (filtreTuru === "ay") {
      const { baslangic, bitis } = getButceDonemi(`${seciliAy}-01`, maasGunu);
      return d >= new Date(baslangic) && d <= new Date(bitis + "T23:59:59.999");
    } else if (filtreTuru === "yil") {
      const baslangicAy = getButceDonemi(`${seciliYil}-01-01`, maasGunu).baslangic;
      const bitisAy = getButceDonemi(`${seciliYil}-12-01`, maasGunu).bitis;
      return d >= new Date(baslangicAy) && d <= new Date(bitisAy + "T23:59:59.999");
    } else if (filtreTuru === "aralik") {
      const bas = new Date(basTarih);
      const bit = new Date(bitTarih);
      bit.setHours(23, 59, 59, 999);
      return d >= bas && d <= bit;
    }
    return true;
  });

  const gelirler = filtreliIslemler.filter(i => i.tur === "gelir");
  const giderler = filtreliIslemler.filter(i => i.tur === "gider");
  const topGelir = gelirler.reduce((s, i) => s + Number(i.miktar), 0);
  const topGider = giderler.reduce((s, i) => s + Number(i.miktar), 0);

  const giderKategoriler = {};
  giderler.forEach(i => { const k = i.kategori || "Diğer"; giderKategoriler[k] = (giderKategoriler[k] || 0) + Number(i.miktar); });
  const gelirKategoriler = {};
  gelirler.forEach(i => { const k = i.kategori || "Diğer"; gelirKategoriler[k] = (gelirKategoriler[k] || 0) + Number(i.miktar); });
  const hesapGider = {};
  giderler.forEach(i => { const k = i.hesapAdi || "Diğer"; hesapGider[k] = (hesapGider[k] || 0) + Number(i.miktar); });

  const hesapBakiyeleri = [
    ...data.nakitHesaplar.filter(h => !h.pasif).map(h => ({ ad: h.ad, bakiye: h.bakiye || 0, tur: "Nakit" })),
    ...data.bankaHesaplar.filter(h => !h.pasif).map(h => ({ ad: h.ad, bakiye: h.bakiye || 0, tur: "Banka" })),
    ...data.borcAlacaklar.filter(b => b.tur === "alacak" && !b.pasif).map(b => ({ ad: b.kisi, bakiye: b.miktar || 0, tur: "Alacak" })),
    ...data.krediKartlari.filter(k => !k.pasif).map(k => ({ ad: k.ad, bakiye: -(k.kullanilanLimit || 0), tur: "KK Borcu" })),
    ...data.krediler.filter(k => !k.pasif).map(k => ({ ad: k.ad, bakiye: -(k.kalanBorc || 0), tur: "Kredi Borcu" })),
    ...data.borcAlacaklar.filter(b => b.tur === "borc" && !b.pasif).map(b => ({ ad: b.kisi, bakiye: -(b.miktar || 0), tur: "Borç" })),
  ];
  const netVarlik = hesapBakiyeleri.reduce((s, h) => s + h.bakiye, 0);

  // ── Vadeli Borçlar ──
  const bugunStr = today();
  const { bitis: buAySonuTarihi } = getButceDonemi(bugunStr, maasGunu);

  let vadeliIslemler = [];

  data.islemler.forEach(islem => {
    if (islem.tarih > buAySonuTarihi && (islem.tur === "gider" || islem.tur === "alacak_dogus")) {
      const kart = data.krediKartlari.find(k => k.id === islem.hesapId || k.id === islem.kartId);
      if (kart) {
        vadeliIslemler.push({ id: islem.id, tarih: islem.tarih, turId: "krediKarti", kaynak: "Kredi Kartı", hedef: kart.ad, aciklama: islem.aciklama || "Kart Harcaması", miktar: Number(islem.miktar) || 0 });
      }
    }
  });

  data.krediler.forEach(kredi => {
    if (kredi.pasif) return;
    let kalanBorc = Number(kredi.kalanBorc) || 0;
    const aylikTaksit = Number(kredi.aylikTaksit) || 0;
    if (kalanBorc > 0 && aylikTaksit > 0) {
      let limitVade = Number(kredi.vade) || 240;
      let kalanVadeSayisi = Math.min(limitVade, Math.ceil(kalanBorc / aylikTaksit));
      let baslangicTrh = new Date(kredi.baslangic || bugunStr);
      let odemeGunu = baslangicTrh.getDate();
      let siradakiTaksitTrh = new Date(Math.max(new Date(bugunStr).getTime(), baslangicTrh.getTime()));
      if (siradakiTaksitTrh.getDate() > odemeGunu) siradakiTaksitTrh.setMonth(siradakiTaksitTrh.getMonth() + 1);
      siradakiTaksitTrh.setDate(odemeGunu);
      for (let i = 0; i < kalanVadeSayisi; i++) {
        let odenecekMiktar = Math.min(aylikTaksit, kalanBorc);
        if (odenecekMiktar <= 0) break;
        let tStr = siradakiTaksitTrh.toISOString().split("T")[0];
        vadeliIslemler.push({ id: `kr_${kredi.id}_${i}`, tarih: tStr, turId: "kredi", kaynak: "Kredi Taksiti", hedef: kredi.banka || kredi.ad, aciklama: `${kredi.ad} (${i + 1}/${limitVade})`, miktar: odenecekMiktar });
        kalanBorc -= odenecekMiktar;
        siradakiTaksitTrh.setMonth(siradakiTaksitTrh.getMonth() + 1);
      }
    }
  });

  data.borcAlacaklar.forEach(borc => {
    if (borc.tur === "borc") {
      if (borc.taksitli && borc.taksitler) {
        borc.taksitler.forEach((t, idx) => {
          if (!t.odendi && t.vade >= bugunStr) {
            vadeliIslemler.push({ id: t.id, tarih: t.vade, turId: "borc", kaynak: "Kişisel Borç", hedef: borc.kisi, aciklama: `${borc.aciklama || "Taksit"} (${idx + 1}/${borc.taksitler.length})`, miktar: Number(t.miktar) || 0 });
          }
        });
      } else if (Number(borc.miktar) > 0 && borc.vade && borc.vade >= bugunStr) {
        vadeliIslemler.push({ id: borc.id, tarih: borc.vade, turId: "borc", kaynak: "Kişisel Borç", hedef: borc.kisi, aciklama: borc.aciklama || "Vadeli Borç", miktar: Number(borc.miktar) || 0 });
      }
    }
  });

  vadeliIslemler.sort((a, b) => new Date(a.tarih) - new Date(b.tarih));

  let filtrelenmisVadeliIslemler = vadeliIslemler;
  if (vadeliTurFiltre !== "tumu") filtrelenmisVadeliIslemler = filtrelenmisVadeliIslemler.filter(v => v.turId === vadeliTurFiltre);

  if (vadeliTarihFiltre === "bu_ay") {
    filtrelenmisVadeliIslemler = filtrelenmisVadeliIslemler.filter(v => v.tarih <= buAySonuTarihi);
  } else if (vadeliTarihFiltre === "gelecek_ay") {
    let gAyTarih = new Date(buAySonuTarihi);
    gAyTarih.setDate(gAyTarih.getDate() + 5);
    const { baslangic: gAyBas, bitis: gAySon } = getButceDonemi(toYMD(gAyTarih), maasGunu);
    filtrelenmisVadeliIslemler = filtrelenmisVadeliIslemler.filter(v => v.tarih >= gAyBas && v.tarih <= gAySon);
  } else if (vadeliTarihFiltre === "3_ay") {
    let ayTarih = new Date(buAySonuTarihi);
    ayTarih.setMonth(ayTarih.getMonth() + 3);
    const { bitis: ucAySon } = getButceDonemi(toYMD(ayTarih), maasGunu);
    filtrelenmisVadeliIslemler = filtrelenmisVadeliIslemler.filter(v => v.tarih <= ucAySon);
  } else if (vadeliTarihFiltre === "secili_ay") {
    const { baslangic: sAyBas, bitis: sAySon } = getButceDonemi(`${vadeliSeciliAy}-01`, maasGunu);
    filtrelenmisVadeliIslemler = filtrelenmisVadeliIslemler.filter(v => v.tarih >= sAyBas && v.tarih <= sAySon);
  }

  const toplamVadeliTutar = filtrelenmisVadeliIslemler.reduce((acc, curr) => acc + curr.miktar, 0);

  const SekmeBtn = ({ id, label }) => (
    <button
      className={`sekme-btn ${aktifSekme === id ? "aktif" : ""}`}
      onClick={() => setAktifSekme(id)}
      style={{ padding: "8px 16px", background: "none", border: "none", borderBottom: aktifSekme === id ? "2px solid var(--altin)" : "2px solid transparent", cursor: "pointer", fontWeight: aktifSekme === id ? "bold" : "normal", color: "var(--metin)" }}
    >
      {label}
    </button>
  );

  return (
    <div className="sayfa">
      <div className="sayfa-baslik">
        <h1>Raporlar</h1>
        {aktifSekme === "genel" && (
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <select className="input" style={{ width: 120 }} value={filtreTuru} onChange={e => setFiltreTuru(e.target.value)}>
              <option value="ay">Aylık</option>
              <option value="yil">Yıllık</option>
              <option value="aralik">Aralık Seç</option>
            </select>
            {filtreTuru === "ay" && <input type="month" className="input" value={seciliAy} onChange={e => setSeciliAy(e.target.value)} />}
            {filtreTuru === "yil" && (
              <select className="input" value={seciliYil} onChange={e => setSeciliYil(e.target.value)}>
                {[...Array(10)].map((_, i) => { const s = (suan.getFullYear() - 5 + i).toString(); return <option key={s} value={s}>{s}</option>; })}
              </select>
            )}
            {filtreTuru === "aralik" && (
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <input type="date" className="input" value={basTarih} onChange={e => setBasTarih(e.target.value)} />
                <span>-</span>
                <input type="date" className="input" value={bitTarih} onChange={e => setBitTarih(e.target.value)} />
              </div>
            )}
          </div>
        )}
      </div>

      <div className="sekmeler" style={{ display: "flex", gap: 16, marginBottom: 20, borderBottom: "1px solid var(--border)", flexWrap: "wrap" }}>
        <SekmeBtn id="genel" label="Genel Rapor" />
        <SekmeBtn id="vadeli" label="Vadeli Borçlar Dökümü" />
        <SekmeBtn id="kategori_dokum" label="📊 Kategoriye Göre Gider Dökümü" />
      </div>

      {/* GENEL RAPOR */}
      {aktifSekme === "genel" && (
        <>
          <div className="rapor-ozet">
            <div className="rapor-kart pozitif-bg"><div className="rk-label">Toplam Gelir</div><div className="rk-deger pozitif">{fmt(topGelir)} ₺</div><div className="rk-alt">{gelirler.length} işlem</div></div>
            <div className="rapor-kart negatif-bg"><div className="rk-label">Toplam Gider</div><div className="rk-deger negatif">{fmt(topGider)} ₺</div><div className="rk-alt">{giderler.length} işlem</div></div>
            <div className={`rapor-kart ${topGelir - topGider >= 0 ? "pozitif-bg" : "negatif-bg"}`}><div className="rk-label">Net Bakiye</div><div className={`rk-deger ${topGelir - topGider >= 0 ? "pozitif" : "negatif"}`}>{fmt(topGelir - topGider)} ₺</div><div className="rk-alt">Seçili Dönem</div></div>
          </div>
          <div className="rapor-grid">
            <div className="panel">
              <div className="panel-baslik">Kategoriye Göre Gider</div>
              {Object.entries(giderKategoriler).sort((a, b) => b[1] - a[1]).map(([k, v]) => (
                <div key={k} className="rapor-satir"><span>{k}</span><div style={{ flex: 1, margin: "0 12px" }}><div className="progress-bar"><div className="progress-dolu" style={{ width: `${topGider ? (v / topGider) * 100 : 0}%`, background: "#f87171" }} /></div></div><span className="negatif">{fmt(v)} ₺</span></div>
              ))}
              {Object.keys(giderKategoriler).length === 0 && <div className="bos-durum">Seçili dönemde gider yok</div>}
            </div>
            <div className="panel">
              <div className="panel-baslik">Kategoriye Göre Gelir</div>
              {Object.entries(gelirKategoriler).sort((a, b) => b[1] - a[1]).map(([k, v]) => (
                <div key={k} className="rapor-satir"><span>{k}</span><div style={{ flex: 1, margin: "0 12px" }}><div className="progress-bar"><div className="progress-dolu" style={{ width: `${topGelir ? (v / topGelir) * 100 : 0}%`, background: "#4ade80" }} /></div></div><span className="pozitif">{fmt(v)} ₺</span></div>
              ))}
              {Object.keys(gelirKategoriler).length === 0 && <div className="bos-durum">Seçili dönemde gelir yok</div>}
            </div>
          </div>
          <div className="panel" style={{ marginTop: 16 }}>
            <div className="panel-baslik">Hesaba Göre Harcama</div>
            {Object.entries(hesapGider).sort((a, b) => b[1] - a[1]).map(([k, v]) => (
              <div key={k} className="rapor-satir"><span>{k}</span><div style={{ flex: 1, margin: "0 12px" }}><div className="progress-bar"><div className="progress-dolu" style={{ width: `${topGider ? (v / topGider) * 100 : 0}%`, background: "#fb923c" }} /></div></div><span className="negatif">{fmt(v)} ₺</span></div>
            ))}
            {Object.keys(hesapGider).length === 0 && <div className="bos-durum">Seçili dönemde harcama yok</div>}
          </div>
          <div className="panel" style={{ marginTop: 16 }}>
            <div className="panel-baslik">Güncel Hesap Bakiyeleri</div>
            <table className="tablo">
              <thead><tr><th>Hesap / Kalem</th><th>Tür</th><th style={{ textAlign: "right" }}>Bakiye</th></tr></thead>
              <tbody>
                {hesapBakiyeleri.map((h, i) => (
                  <tr key={i}><td>{h.ad}</td><td><span className="badge">{h.tur}</span></td><td style={{ textAlign: "right" }} className={h.bakiye >= 0 ? "pozitif" : "negatif"}>{fmt(h.bakiye)} ₺</td></tr>
                ))}
                <tr style={{ borderTop: "2px solid var(--altin)", background: "rgba(201, 168, 76, 0.05)" }}>
                  <td colSpan="2" style={{ fontWeight: 700, padding: 12, fontSize: 15, color: "var(--altin)" }}>MALVARLIĞIM (NET)</td>
                  <td style={{ textAlign: "right", fontWeight: 700, padding: 12, fontSize: 18 }} className={netVarlik >= 0 ? "pozitif" : "negatif"}>{fmt(netVarlik)} ₺</td>
                </tr>
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* VADELİ BORÇLAR */}
      {aktifSekme === "vadeli" && (
        <div className="panel">
          <div className="panel-baslik" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>Vadeli Borçlar Listesi</span>
            <div style={{ display: "flex", gap: 12, alignItems: "center", fontSize: "0.9rem", fontWeight: "normal" }}>
              <select className="input" style={{ width: 140, padding: "4px 8px" }} value={vadeliTurFiltre} onChange={e => setVadeliTurFiltre(e.target.value)}>
                <option value="tumu">Tüm Kaynaklar</option>
                <option value="krediKarti">Kredi Kartları</option>
                <option value="kredi">Kredi Taksitleri</option>
                <option value="borc">Kişisel Borçlar</option>
              </select>
              <select className="input" style={{ width: 150, padding: "4px 8px" }} value={vadeliTarihFiltre} onChange={e => setVadeliTarihFiltre(e.target.value)}>
                <option value="tumu">Tüm Tarihler</option>
                <option value="bu_ay">Bu Ay (Kalan)</option>
                <option value="gelecek_ay">Gelecek Ay</option>
                <option value="3_ay">Önümüzdeki 3 Ay</option>
                <option value="secili_ay">Ay Seç...</option>
              </select>
              {vadeliTarihFiltre === "secili_ay" && (
                <input type="month" className="input" style={{ padding: "3px 8px" }} value={vadeliSeciliAy} onChange={e => setVadeliSeciliAy(e.target.value)} />
              )}
            </div>
          </div>
          <table className="tablo" style={{ marginTop: 16, fontSize: "0.95rem" }}>
            <thead><tr><th>Vade Tarihi</th><th>Kaynak/Kaynak Adı</th><th>Açıklama</th><th style={{ textAlign: "right" }}>Tutar</th></tr></thead>
            <tbody>
              {filtrelenmisVadeliIslemler.length === 0 ? (
                <tr><td colSpan="4" style={{ textAlign: "center", padding: "30px 0", color: "var(--metin2)" }}>Seçili kriterlere uygun vadeli borç bulunamadı.</td></tr>
              ) : (
                filtrelenmisVadeliIslemler.map(v => (
                  <tr key={v.id}>
                    <td>{fmtDate(v.tarih)}</td>
                    <td><div><b>{v.kaynak}</b></div><div style={{ fontSize: "0.8rem", color: "var(--metin2)" }}>{v.hedef}</div></td>
                    <td>{v.aciklama}</td>
                    <td style={{ textAlign: "right", fontWeight: "600" }} className="negatif">{fmt(v.miktar)} ₺</td>
                  </tr>
                ))
              )}
              {filtrelenmisVadeliIslemler.length > 0 && (
                <tr style={{ borderTop: "2px solid var(--altin)", background: "rgba(201, 168, 76, 0.05)" }}>
                  <td colSpan="3" style={{ fontWeight: 700, padding: 12, fontSize: 14, color: "var(--altin)", textAlign: "right" }}>TOPLAM ÖDENECEK (FİLTRELENEN):</td>
                  <td style={{ textAlign: "right", fontWeight: 700, padding: 12, fontSize: 18 }} className="negatif">{fmt(toplamVadeliTutar)} ₺</td>
                </tr>
              )}
            </tbody>
          </table>
          <div style={{ marginTop: 12, fontSize: "0.85rem", color: "var(--metin2)", lineHeight: 1.4 }}>
            * Kredi kartı sekmesinde, bu aydan sonra gerçekleşecek harcamalar/taksitler listelenir.<br />
            * Krediler sekmesinde, kalan borcunuz üzerinden gelecek aylara yayılan tahmini ödeme taksitleriniz hesaplanır.
          </div>
        </div>
      )}

      {/* KATEGORİYE GÖRE GİDER DÖKÜMÜ */}
      {aktifSekme === "kategori_dokum" && (() => {
        let kdBaslangic, kdBitis;
        if (kdFiltreTuru === "ay_nav") {
          const ref = new Date(suan.getFullYear(), suan.getMonth() + kdAyOffset, 1);
          const refStr = `${ref.getFullYear()}-${String(ref.getMonth() + 1).padStart(2, "0")}-01`;
          const donem = getButceDonemi(refStr, maasGunu);
          kdBaslangic = donem.baslangic; kdBitis = donem.bitis;
        } else if (kdFiltreTuru === "ay") {
          const donem = getButceDonemi(`${kdSeciliAy}-01`, maasGunu);
          kdBaslangic = donem.baslangic; kdBitis = donem.bitis;
        } else {
          kdBaslangic = kdBasTarih; kdBitis = kdBitTarih;
        }

        const anaKatlar = data.kategoriler.filter(k => !k.ustId && !k.pasif && k.tur === "gider").sort((a, b) => a.ad.localeCompare(b.ad, "tr"));
        const altKatlar = (anaId) => data.kategoriler.filter(k => k.ustId === anaId && !k.pasif).sort((a, b) => a.ad.localeCompare(b.ad, "tr"));
        const tumKatAdlari = data.kategoriler.filter(k => !k.pasif && k.tur === "gider").map(k => k.ad);
        const hepsiSecili = seciliKatlar.length === tumKatAdlari.length;

        const katToggle = (ad) => setSeciliKatlar(prev => prev.includes(ad) ? prev.filter(x => x !== ad) : [...prev, ad]);
        const anaKatToggle = (anaKat) => {
          const alts = altKatlar(anaKat.id).map(k => k.ad);
          const tumGrup = [anaKat.ad, ...alts];
          const hepsiVar = tumGrup.every(a => seciliKatlar.includes(a));
          if (hepsiVar) setSeciliKatlar(prev => prev.filter(x => !tumGrup.includes(x)));
          else setSeciliKatlar(prev => [...new Set([...prev, ...tumGrup])]);
        };
        const hepsiniToggle = () => { if (hepsiSecili) setSeciliKatlar([]); else setSeciliKatlar(tumKatAdlari); };

        const kdGiderler = data.islemler.filter(i => {
          if (i.tur !== "gider") return false;
          if (i.tarih < kdBaslangic || i.tarih > kdBitis) return false;
          if (seciliKatlar.length > 0 && !seciliKatlar.includes(i.kategori)) return false;
          return true;
        }).sort((a, b) => b.tarih.localeCompare(a.tarih) || b.id.localeCompare(a.id));

        const katOzeti = {};
        kdGiderler.forEach(i => { const k = i.kategori || "Diğer"; katOzeti[k] = (katOzeti[k] || 0) + Number(i.miktar); });
        const kdTopGider = kdGiderler.reduce((s, i) => s + Number(i.miktar), 0);

        const navAyEtiketi = (() => {
          const ref = new Date(suan.getFullYear(), suan.getMonth() + kdAyOffset, 1);
          return ref.toLocaleDateString("tr-TR", { month: "long", year: "numeric" });
        })();

        return (
          <div>
            <div className="panel" style={{ marginBottom: 16 }}>
              <div className="panel-baslik">📅 Tarih Filtresi</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", padding: "12px 0 4px" }}>
                {[{ v: "ay_nav", l: "Ay Gezinme" }, { v: "ay", l: "Ay + Yıl Seç" }, { v: "aralik", l: "Tarih Aralığı" }].map(f => (
                  <button key={f.v} className={`btn btn-kucuk${kdFiltreTuru === f.v ? " btn-altin" : " btn-ghost"}`} onClick={() => setKdFiltreTuru(f.v)}>{f.l}</button>
                ))}
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 10, flexWrap: "wrap" }}>
                {kdFiltreTuru === "ay_nav" && (
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <button className="btn btn-kucuk btn-ghost" onClick={() => setKdAyOffset(p => p - 1)}>◀</button>
                    <span style={{ fontWeight: 600, minWidth: 130, textAlign: "center", color: "var(--altin)" }}>{navAyEtiketi}</span>
                    <button className="btn btn-kucuk btn-ghost" onClick={() => setKdAyOffset(p => p + 1)} disabled={kdAyOffset >= 0}>▶</button>
                    {kdAyOffset !== 0 && <button className="btn btn-kucuk btn-ghost" onClick={() => setKdAyOffset(0)} style={{ fontSize: 11 }}>Bu Ay</button>}
                  </div>
                )}
                {kdFiltreTuru === "ay" && <input type="month" className="input" value={kdSeciliAy} onChange={e => setKdSeciliAy(e.target.value)} />}
                {kdFiltreTuru === "aralik" && (
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <input type="date" className="input" value={kdBasTarih} onChange={e => setKdBasTarih(e.target.value)} />
                    <span>—</span>
                    <input type="date" className="input" value={kdBitTarih} onChange={e => setKdBitTarih(e.target.value)} />
                  </div>
                )}
                <span style={{ fontSize: 12, color: "var(--metin2)", marginLeft: 4 }}>{kdBaslangic} → {kdBitis}</span>
              </div>
            </div>

            <div className="panel" style={{ marginBottom: 16 }}>
              <div className="panel-baslik" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span>🏷️ Kategori Seçimi</span>
                <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: "normal", cursor: "pointer" }}>
                  <input type="checkbox" checked={hepsiSecili} onChange={hepsiniToggle} /> Tümünü Seç
                </label>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, padding: "12px 0 4px" }}>
                {anaKatlar.map(ana => {
                  const alts = altKatlar(ana.id);
                  const tumGrup = [ana.ad, ...alts.map(a => a.ad)];
                  const hepsiGrupVar = tumGrup.every(a => seciliKatlar.includes(a));
                  const kismVar = tumGrup.some(a => seciliKatlar.includes(a)) && !hepsiGrupVar;
                  const expanded = kdGenisletilmis.includes(ana.id);
                  return (
                    <div key={ana.id} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--kenar)", borderRadius: 8, padding: "8px 12px", minWidth: 160 }}>
                      <label style={{ display: "flex", alignItems: "center", gap: 7, cursor: "pointer", fontWeight: 600, fontSize: 13 }}>
                        <input type="checkbox" checked={hepsiGrupVar} ref={el => { if (el) el.indeterminate = kismVar; }} onChange={() => anaKatToggle(ana)} />
                        <span style={{ flex: 1 }}>{ana.ad}</span>
                        {alts.length > 0 && (
                          <span style={{ fontSize: 10, cursor: "pointer", color: "var(--altin)" }}
                            onClick={e => { e.preventDefault(); setKdGenisletilmis(prev => prev.includes(ana.id) ? prev.filter(x => x !== ana.id) : [...prev, ana.id]); }}>
                            {expanded ? "▼" : "▶"}
                          </span>
                        )}
                      </label>
                      {expanded && alts.map(alt => (
                        <label key={alt.id} style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 12, marginTop: 6, paddingLeft: 8, color: "var(--metin2)" }}>
                          <input type="checkbox" checked={seciliKatlar.includes(alt.ad)} onChange={() => katToggle(alt.ad)} /> ↳ {alt.ad}
                        </label>
                      ))}
                    </div>
                  );
                })}
              </div>
              {seciliKatlar.length > 0 && (
                <div style={{ fontSize: 12, color: "var(--metin2)", marginTop: 4 }}>
                  {seciliKatlar.length} kategori seçili
                  <button className="btn btn-kucuk btn-ghost" style={{ marginLeft: 8, padding: "2px 8px", fontSize: 11 }} onClick={() => setSeciliKatlar([])}>Temizle</button>
                </div>
              )}
            </div>

            <div className="rapor-ozet" style={{ marginBottom: 16 }}>
              <div className="rapor-kart negatif-bg">
                <div className="rk-label">Toplam Gider</div>
                <div className="rk-deger negatif">{fmt(kdTopGider)} ₺</div>
                <div className="rk-alt">{kdGiderler.length} işlem</div>
              </div>
              {Object.entries(katOzeti).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k, v]) => (
                <div key={k} className="rapor-kart" style={{ background: "rgba(248,113,113,0.06)" }}>
                  <div className="rk-label">{k}</div>
                  <div className="rk-deger negatif">{fmt(v)} ₺</div>
                  <div className="rk-alt">%{kdTopGider ? ((v / kdTopGider) * 100).toFixed(1) : 0}</div>
                </div>
              ))}
            </div>

            {Object.keys(katOzeti).length > 0 && (
              <div className="panel" style={{ marginBottom: 16 }}>
                <div className="panel-baslik">Dağılım</div>
                {Object.entries(katOzeti).sort((a, b) => b[1] - a[1]).map(([k, v]) => (
                  <div key={k} className="rapor-satir">
                    <span style={{ minWidth: 130, fontSize: 13 }}>{k}</span>
                    <div style={{ flex: 1, margin: "0 12px" }}><div className="progress-bar"><div className="progress-dolu" style={{ width: `${kdTopGider ? (v / kdTopGider) * 100 : 0}%`, background: "#f87171" }} /></div></div>
                    <span style={{ fontSize: 12, color: "var(--metin2)", minWidth: 40, textAlign: "right" }}>%{kdTopGider ? ((v / kdTopGider) * 100).toFixed(1) : 0}</span>
                    <span className="negatif" style={{ minWidth: 100, textAlign: "right", fontWeight: 600 }}>{fmt(v)} ₺</span>
                  </div>
                ))}
              </div>
            )}

            <div className="panel">
              <div className="panel-baslik">İşlem Detayları ({kdGiderler.length} işlem)</div>
              {kdGiderler.length === 0 ? (
                <div className="bos-durum">Seçili kriterlere uygun gider bulunamadı.</div>
              ) : (
                <div className="tablo-konteynir">
                  <table className="tablo" style={{ fontSize: 13 }}>
                    <thead><tr><th style={{ width: "13%" }}>Tarih</th><th style={{ width: "25%" }}>Açıklama</th><th style={{ width: "18%" }}>Kategori</th><th style={{ width: "18%" }}>Hesap</th><th style={{ textAlign: "right", width: "16%" }}>Tutar</th></tr></thead>
                    <tbody>
                      {kdGiderler.map(i => (
                        <tr key={i.id}>
                          <td style={{ whiteSpace: "nowrap" }}>{fmtDate(i.tarih)}</td>
                          <td style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 0 }} title={i.aciklama}>{i.aciklama || "—"}</td>
                          <td><span className="badge">{i.kategori || "—"}</span></td>
                          <td style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 0 }}>{i.hesapAdi || "—"}</td>
                          <td style={{ textAlign: "right", fontWeight: 600 }} className="negatif">-{fmt(i.miktar)} ₺</td>
                        </tr>
                      ))}
                      <tr style={{ borderTop: "2px solid var(--altin)", background: "rgba(201,168,76,0.05)" }}>
                        <td colSpan="4" style={{ fontWeight: 700, padding: "10px 12px", color: "var(--altin)", textAlign: "right" }}>TOPLAM:</td>
                        <td style={{ textAlign: "right", fontWeight: 700, fontSize: 16, padding: "10px 12px" }} className="negatif">-{fmt(kdTopGider)} ₺</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
