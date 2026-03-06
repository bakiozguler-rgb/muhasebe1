import { useState } from "react";
import { fmt, fmtDate, today, getButceDonemi, toYMD, hesaplaKartBorc, uid } from "../veri";

// ═══════════════════════════════════════════════════════════════════════════
// RAPORLAR SAYFASI
// ═══════════════════════════════════════════════════════════════════════════
export function RaporlarSayfa({ data, guncelle, bildir, islemBakiyeEtkisi, islemSil }) {
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

  // Güncel sekmesi state
  const [secModAcik, setSecModAcik] = useState(false);
  const [seciliSatirlar, setSeciliSatirlar] = useState(new Set());
  const [asgariOranGiris, setAsgariOranGiris] = useState({});
  const [asgariAcik, setAsgariAcik] = useState(new Set());

  // Projeler sekmesi state
  const [acikProjeler, setAcikProjeler] = useState(new Set());

  // Vadeli Borçlar pasif satırlar
  const [pasifVadeliIslemler, setPasifVadeliIslemler] = useState(new Set());

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
    ...data.krediKartlari.filter(k => !k.pasif).map(k => ({ ad: k.ad, bakiye: -hesaplaKartBorc(k.id, data.islemler, k.bakiyeDuzeltme || 0, today()), tur: "KK Borcu" })),
    ...data.krediler.filter(k => !k.pasif).map(k => ({ ad: k.ad, bakiye: -(k.kalanBorc || 0), tur: "Kredi Borcu" })),
    ...data.borcAlacaklar.filter(b => b.tur === "borc" && !b.pasif).map(b => ({ ad: b.kisi, bakiye: -(b.miktar || 0), tur: "Borç" })),
  ];
  const netVarlik = hesapBakiyeleri.reduce((s, h) => s + h.bakiye, 0);

  // ── Vadeli Borçlar ──
  const bugunStr = today();
  const { bitis: buAySonuTarihi, baslangic: buAyBaslangici } = getButceDonemi(bugunStr, maasGunu);

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

  const toplamVadeliTutar = filtrelenmisVadeliIslemler
    .filter(v => !pasifVadeliIslemler.has(v.id))
    .reduce((acc, curr) => acc + curr.miktar, 0);

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
        <SekmeBtn id="guncel" label="Güncel Durum" />
        <SekmeBtn id="genel" label="Genel Rapor" />
        <SekmeBtn id="vadeli" label="Vadeli Borçlar Dökümü" />
        <SekmeBtn id="kategori_dokum" label="📊 Kategoriye Göre Gider Dökümü" />
        <SekmeBtn id="projeler" label="🗂️ Projeler" />
      </div>

      {/* GÜNCEL DURUM */}
      {aktifSekme === "guncel" && (() => {
        const bugun = today();

        const tumSatirlar = [
          ...data.bankaHesaplar.filter(h => !h.pasif).map(h => ({
            id: `banka_${h.id}`, ad: h.ad, altAd: null,
            deger: h.bakiye || 0, grup: "Banka", ikon: "🏦",
          })),
          ...data.nakitHesaplar.filter(h => !h.pasif).map(h => ({
            id: `nakit_${h.id}`, ad: h.ad, altAd: null,
            deger: h.bakiye || 0, grup: "Nakit", ikon: "💵",
          })),
          ...data.krediKartlari.filter(k => !k.pasif).map(k => {
            const guncelBorc = hesaplaKartBorc(k.id, data.islemler, k.bakiyeDuzeltme || 0, bugun);
            const asgariOdeme = k.asgariOdemeOrani ? Math.max(0, guncelBorc) * (k.asgariOdemeOrani / 100) : null;
            return {
              id: `kk_${k.id}`, ad: k.ad, altAd: k.banka,
              deger: -guncelBorc, grup: "Kredi Kartı", ikon: "💳",
              kartId: k.id, guncelBorc, asgariOdemeOrani: k.asgariOdemeOrani, asgariOdeme,
            };
          }),
          ...data.borcAlacaklar.filter(b => b.tur === "alacak" && !b.pasif).map(b => ({
            id: `alacak_${b.id}`, ad: b.kisi, altAd: "Alacak",
            deger: b.miktar || 0, grup: "Borç / Alacak", ikon: "⇌",
          })),
          ...data.borcAlacaklar.filter(b => b.tur === "borc" && !b.pasif).map(b => ({
            id: `borc_${b.id}`, ad: b.kisi, altAd: "Borç",
            deger: -(b.miktar || 0), grup: "Borç / Alacak", ikon: "⇌",
          })),
          ...(data.sabitOdemeler || []).map(sp => ({
            id: `sp_${sp.id}`, ad: sp.aciklama || "—",
            altAd: sp.tarih ? fmtDate(sp.tarih) : null,
            deger: sp.pasif ? 0 : -(Number(sp.tutar) || 0), grup: "Sabit Ödemeler", ikon: "📌",
            spId: sp.id,
          })),
        ];

        const efektifDeger = (s) =>
          s.kartId && asgariAcik.has(s.kartId) && s.asgariOdeme !== null
            ? -s.asgariOdeme
            : s.deger;

        const toplamDeger = secModAcik
          ? tumSatirlar.filter(s => seciliSatirlar.has(s.id)).reduce((sum, s) => sum + efektifDeger(s), 0)
          : tumSatirlar.reduce((sum, s) => sum + efektifDeger(s), 0);

        const gruplar = ["Banka", "Nakit", "Kredi Kartı", "Borç / Alacak", "Sabit Ödemeler"];

        const asgariOranKaydet = (kartId, inputVal) => {
          const val = parseFloat(String(inputVal).replace(",", "."));
          if (!isNaN(val) && val >= 0) {
            guncelle(d => ({
              ...d,
              krediKartlari: d.krediKartlari.map(kk => kk.id === kartId ? { ...kk, asgariOdemeOrani: val } : kk),
            }));
          }
          setAsgariOranGiris(prev => { const { [kartId]: _, ...rest } = prev; return rest; });
        };

        // Sabit Ödemeler yönetim fonksiyonları
        const spEkle = () => {
          const yeni = { id: uid(), tarih: today(), aciklama: "", tutar: 0 };
          guncelle(d => ({ ...d, sabitOdemeler: [...(d.sabitOdemeler || []), yeni] }));
        };
        const spSil = (spId) => {
          guncelle(d => ({ ...d, sabitOdemeler: (d.sabitOdemeler || []).filter(s => s.id !== spId) }));
          setSeciliSatirlar(prev => { const next = new Set(prev); next.delete(`sp_${spId}`); return next; });
        };
        const spGuncelle = (spId, alan, deger) => {
          guncelle(d => ({ ...d, sabitOdemeler: (d.sabitOdemeler || []).map(s => s.id === spId ? { ...s, [alan]: deger } : s) }));
        };

        return (
          <div>
            {/* Üst Toplam Satırı */}
            <div style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "14px 16px", marginBottom: 16,
              background: "rgba(201,168,76,0.08)", border: "1px solid var(--altin)",
              borderRadius: 10,
            }}>
              <div>
                <div style={{ fontSize: "0.72rem", color: "var(--metin2)", marginBottom: 2 }}>
                  {secModAcik ? `${seciliSatirlar.size} satır seçili — Seçili Toplam` : "Güncel Net Toplam"}
                </div>
                <div style={{ fontSize: "1.6rem", fontWeight: 700 }} className={toplamDeger >= 0 ? "pozitif" : "negatif"}>
                  {toplamDeger >= 0 ? "+" : ""}{fmt(toplamDeger)} ₺
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                {secModAcik && (
                  <>
                    <button className="btn btn-kucuk btn-ghost" onClick={() =>
                      setSeciliSatirlar(new Set(tumSatirlar.map(s => s.id)))
                    }>Tümü Seç</button>
                    <button className="btn btn-kucuk btn-ghost" onClick={() => {
                      setSecModAcik(false); setSeciliSatirlar(new Set());
                    }}>İptal</button>
                  </>
                )}
                <button
                  className={`btn btn-kucuk ${secModAcik ? "btn-altin" : "btn-ghost"}`}
                  onClick={() => { setSecModAcik(p => !p); setSeciliSatirlar(new Set()); }}
                >
                  {secModAcik ? "✓ Seç Modu" : "Seç"}
                </button>
              </div>
            </div>

            {/* Gruplar */}
            {gruplar.map(grup => {
              const satirlar = tumSatirlar.filter(s => s.grup === grup);
              const spGrubu = grup === "Sabit Ödemeler";

              // Sabit Ödemeler grubu: her zaman paneli göster (satır 0 olsa bile)
              if (!spGrubu && satirlar.length === 0) return null;

              const grupToplam = satirlar.reduce((sum, s) => sum + efektifDeger(s), 0);
              return (
                <div key={grup} className="panel" style={{ marginBottom: 12 }}>
                  <div className="panel-baslik" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span>{spGrubu ? "📌" : satirlar[0]?.ikon} {grup}</span>
                    <span className={grupToplam >= 0 ? "pozitif" : "negatif"} style={{ fontWeight: 600 }}>
                      {grupToplam >= 0 ? "+" : ""}{fmt(grupToplam)} ₺
                    </span>
                  </div>

                  {/* ── Normal gruplar ── */}
                  {!spGrubu && satirlar.map(satir => (
                    <div key={satir.id} style={{
                      display: "flex", alignItems: "center", gap: 10,
                      padding: "10px 0", borderTop: "1px solid var(--kenar)",
                    }}>
                      {secModAcik && (
                        <input type="checkbox"
                          checked={seciliSatirlar.has(satir.id)}
                          onChange={() => setSeciliSatirlar(prev => {
                            const next = new Set(prev);
                            if (next.has(satir.id)) next.delete(satir.id); else next.add(satir.id);
                            return next;
                          })}
                          style={{ width: 16, height: 16, cursor: "pointer", flexShrink: 0 }}
                        />
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: "0.9rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{satir.ad}</div>
                        {satir.altAd && <div style={{ fontSize: "0.72rem", color: "var(--metin2)" }}>{satir.altAd}</div>}
                      </div>

                      {/* Kredi Kartı: Asgari Oran Girişi + Asgari Ödeme Kutusu */}
                      {satir.kartId && (
                        <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}
                          onClick={e => e.stopPropagation()}>
                          <input
                            type="text"
                            className="input"
                            style={{ width: 46, padding: "2px 5px", fontSize: "0.75rem", textAlign: "right" }}
                            placeholder="oran"
                            value={asgariOranGiris[satir.kartId] !== undefined
                              ? asgariOranGiris[satir.kartId]
                              : (satir.asgariOdemeOrani != null ? String(satir.asgariOdemeOrani) : "")}
                            onChange={e => setAsgariOranGiris(prev => ({ ...prev, [satir.kartId]: e.target.value }))}
                            onKeyDown={e => {
                              if (e.key === "Enter") asgariOranKaydet(satir.kartId, asgariOranGiris[satir.kartId] ?? "");
                            }}
                            onBlur={() => {
                              if (asgariOranGiris[satir.kartId] !== undefined)
                                asgariOranKaydet(satir.kartId, asgariOranGiris[satir.kartId]);
                            }}
                          />
                          <span style={{ fontSize: "0.72rem", color: "var(--metin2)" }}>%</span>
                          <button
                            className={`btn btn-kucuk ${asgariAcik.has(satir.kartId) ? "btn-altin" : "btn-ghost"}`}
                            style={{ padding: "2px 7px", fontSize: "0.7rem", flexShrink: 0 }}
                            onClick={() => setAsgariAcik(prev => {
                              const next = new Set(prev);
                              if (next.has(satir.kartId)) next.delete(satir.kartId); else next.add(satir.kartId);
                              return next;
                            })}
                          >
                            Asgari
                          </button>
                          {asgariAcik.has(satir.kartId) && (
                            <span className="altin" style={{ fontSize: "0.8rem", fontWeight: 600, minWidth: 70, textAlign: "right" }}>
                              {satir.asgariOdeme !== null ? `${fmt(satir.asgariOdeme)} ₺` : "oran girin"}
                            </span>
                          )}
                        </div>
                      )}

                      <div className={satir.deger >= 0 ? "pozitif" : "negatif"}
                        style={{ fontWeight: 700, fontSize: "0.95rem", minWidth: 100, textAlign: "right", flexShrink: 0 }}>
                        {satir.deger >= 0 ? "+" : ""}{fmt(satir.deger)} ₺
                      </div>
                    </div>
                  ))}

                  {/* ── Sabit Ödemeler grubu: inline düzenlenebilir satırlar ── */}
                  {spGrubu && (
                    <>
                      {(data.sabitOdemeler || []).length === 0 && (
                        <div style={{ fontSize: "0.82rem", color: "var(--metin2)", padding: "8px 0 4px" }}>
                          Henüz sabit ödeme eklenmemiş.
                        </div>
                      )}
                      {(data.sabitOdemeler || []).map(sp => (
                        <div key={sp.id} style={{
                          display: "flex", alignItems: "center", gap: 8,
                          padding: "8px 0", borderTop: "1px solid var(--kenar)",
                          flexWrap: "wrap",
                          opacity: sp.pasif ? 0.42 : 1,
                        }}>
                          {/* Seç checkbox */}
                          {secModAcik && (
                            <input type="checkbox"
                              checked={seciliSatirlar.has(`sp_${sp.id}`)}
                              onChange={() => setSeciliSatirlar(prev => {
                                const next = new Set(prev);
                                if (next.has(`sp_${sp.id}`)) next.delete(`sp_${sp.id}`); else next.add(`sp_${sp.id}`);
                                return next;
                              })}
                              style={{ width: 16, height: 16, cursor: "pointer", flexShrink: 0 }}
                            />
                          )}
                          {/* Tarih */}
                          <input
                            type="date"
                            className="input"
                            style={{ width: 140, padding: "4px 6px", fontSize: "0.82rem", flexShrink: 0 }}
                            value={sp.tarih || ""}
                            onChange={e => spGuncelle(sp.id, "tarih", e.target.value)}
                          />
                          {/* Açıklama */}
                          <input
                            type="text"
                            className="input"
                            style={{
                              flex: 1, minWidth: 100, padding: "4px 8px", fontSize: "0.85rem",
                              textDecoration: sp.pasif ? "line-through" : "none"
                            }}
                            placeholder="Açıklama"
                            value={sp.aciklama || ""}
                            onChange={e => spGuncelle(sp.id, "aciklama", e.target.value)}
                          />
                          {/* Tutar */}
                          <input
                            type="number"
                            className="input"
                            style={{
                              width: 110, padding: "4px 8px", fontSize: "0.85rem", textAlign: "right", flexShrink: 0,
                              textDecoration: sp.pasif ? "line-through" : "none"
                            }}
                            placeholder="0,00"
                            value={sp.tutar === 0 ? "" : sp.tutar}
                            onChange={e => spGuncelle(sp.id, "tutar", e.target.value === "" ? 0 : Number(e.target.value))}
                          />
                          <span style={{ fontSize: "0.78rem", color: "var(--metin2)", flexShrink: 0 }}>₺</span>
                          {/* Pasife Al / Aktifleştir */}
                          <button
                            className="btn btn-kucuk btn-ghost"
                            style={{
                              padding: "2px 7px", fontSize: "0.8rem", flexShrink: 0,
                              color: sp.pasif ? "#4ade80" : "#fb923c"
                            }}
                            title={sp.pasif ? "Aktifleştir" : "Pasife Al"}
                            onClick={() => spGuncelle(sp.id, "pasif", !sp.pasif)}
                          >{sp.pasif ? "▶" : "⏸"}</button>
                          {/* + yeni satır ekle */}
                          <button
                            className="btn btn-kucuk btn-ghost"
                            style={{ padding: "2px 8px", fontSize: "1rem", lineHeight: 1, flexShrink: 0, color: "var(--altin)" }}
                            title="Yeni satır ekle"
                            onClick={spEkle}
                          >+</button>
                          {/* Sil */}
                          <button
                            className="btn btn-kucuk btn-ghost"
                            style={{ padding: "2px 7px", fontSize: "0.8rem", flexShrink: 0, color: "#f87171" }}
                            title="Satırı sil"
                            onClick={() => spSil(sp.id)}
                          >✕</button>
                        </div>
                      ))}
                      {/* Satır yoksa veya ek satır eklemek için alt buton */}
                      <div style={{ paddingTop: 10 }}>
                        <button
                          className="btn btn-kucuk btn-ghost"
                          style={{ fontSize: "0.82rem", color: "var(--altin)", border: "1px dashed var(--altin)", padding: "4px 14px" }}
                          onClick={spEkle}
                        >+ Satır Ekle</button>
                      </div>
                    </>
                  )}
                </div>
              );
            })}

            {tumSatirlar.filter(s => s.grup !== "Sabit Ödemeler").length === 0 && (data.sabitOdemeler || []).length === 0 && (
              <div className="bos-durum">Henüz hesap eklenmemiş.</div>
            )}
          </div>
        );
      })()}

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

      {/* VADELİ BORCLAR */}
      {aktifSekme === "vadeli" && (
        <div className="panel">
          <div className="panel-baslik" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>Vadeli Borçlar Listesi</span>
            <div style={{ display: "flex", gap: 12, alignItems: "center", fontSize: "0.9rem", fontWeight: "normal" }}>
              {/* TOPLAM ÜSTE TAŞINDI */}
              {filtrelenmisVadeliIslemler.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", marginRight: 8 }}>
                  <div style={{ fontSize: "0.68rem", color: "var(--metin2)", letterSpacing: "0.05em" }}>TOPLAM ÖDENECEK</div>
                  <div style={{ fontSize: "1.15rem", fontWeight: 700 }} className="negatif">{fmt(toplamVadeliTutar)} ₺</div>
                </div>
              )}
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
            <thead><tr><th>Vade Tarihi</th><th>Kaynak/Kaynak Adı</th><th>Açıklama</th><th style={{ textAlign: "right" }}>Tutar</th><th style={{ width: 60 }}></th></tr></thead>
            <tbody>
              {filtrelenmisVadeliIslemler.length === 0 ? (
                <tr><td colSpan="5" style={{ textAlign: "center", padding: "30px 0", color: "var(--metin2)" }}>Seçili kriterlere uygun vadeli borç bulunamadı.</td></tr>
              ) : (
                filtrelenmisVadeliIslemler.map(v => {
                  const pasif = pasifVadeliIslemler.has(v.id);
                  return (
                    <tr key={v.id} style={{ opacity: pasif ? 0.4 : 1 }}>
                      <td style={{ textDecoration: pasif ? "line-through" : "none" }}>{fmtDate(v.tarih)}</td>
                      <td><div><b>{v.kaynak}</b></div><div style={{ fontSize: "0.8rem", color: "var(--metin2)" }}>{v.hedef}</div></td>
                      <td style={{ textDecoration: pasif ? "line-through" : "none" }}>{v.aciklama}</td>
                      <td style={{ textAlign: "right", fontWeight: "600", textDecoration: pasif ? "line-through" : "none" }} className="negatif">{fmt(v.miktar)} ₺</td>
                      <td style={{ textAlign: "center" }}>
                        <button
                          className="btn btn-kucuk btn-ghost"
                          style={{ padding: "2px 7px", fontSize: "0.7rem", color: pasif ? "#4ade80" : "#fb923c" }}
                          title={pasif ? "Aktifleştir" : "Pasife Al"}
                          onClick={() => setPasifVadeliIslemler(prev => {
                            const next = new Set(prev);
                            if (next.has(v.id)) next.delete(v.id); else next.add(v.id);
                            return next;
                          })}
                        >{pasif ? "▶" : "⏸"}</button>
                      </td>
                    </tr>
                  );
                })
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

      {/* PROJELER */}
      {aktifSekme === "projeler" && (() => {
        const projeler = data.projeler || [];
        const aktifProjeler = projeler.filter(p => p.durum !== "tamamlandi");
        const tamamlananlar = projeler.filter(p => p.durum === "tamamlandi");

        // Proje CRUD
        const projeEkle = () => {
          const yeni = { id: uid(), ad: "Yeni Proje", butce: 0, durum: "planlama", notlar: "", giderler: [], kaynakIslemler: [] };
          guncelle(d => ({ ...d, projeler: [...(d.projeler || []), yeni] }));
          setAcikProjeler(prev => new Set([...prev, yeni.id])); // Yeni proje otomatik açılır
        };
        const projeSil = (pid) => {
          guncelle(d => {
            const proje = (d.projeler || []).find(p => p.id === pid);
            // Kaynakları geri al
            let yeni = d;
            if (proje?.kaynakIslemler?.length) {
              proje.kaynakIslemler.forEach(k => {
                const islem = d.islemler.find(i => i.id === k.islemId);
                if (islem && islemBakiyeEtkisi) yeni = islemBakiyeEtkisi(yeni, islem, -1);
              });
              yeni = { ...yeni, islemler: yeni.islemler.filter(i => !proje.kaynakIslemler.map(k => k.islemId).includes(i.id)) };
            }
            return { ...yeni, projeler: (yeni.projeler || []).filter(p => p.id !== pid) };
          });
        };
        const projeGuncelle = (pid, alan, deger) => {
          guncelle(d => ({ ...d, projeler: (d.projeler || []).map(p => p.id === pid ? { ...p, [alan]: deger } : p) }));
        };
        const projeGiderEkle = (pid) => {
          const yeniGider = { id: uid(), tarih: today(), aciklama: "", tutar: 0, pasif: false };
          guncelle(d => ({ ...d, projeler: (d.projeler || []).map(p => p.id === pid ? { ...p, giderler: [...(p.giderler || []), yeniGider] } : p) }));
        };
        const projeGiderGuncelle = (pid, gid, alan, deger) => {
          guncelle(d => ({ ...d, projeler: (d.projeler || []).map(p => p.id === pid ? { ...p, giderler: (p.giderler || []).map(g => g.id === gid ? { ...g, [alan]: deger } : g) } : p) }));
        };
        const projeGiderSil = (pid, gid) => {
          guncelle(d => ({ ...d, projeler: (d.projeler || []).map(p => p.id === pid ? { ...p, giderler: (p.giderler || []).filter(g => g.id !== gid) } : p) }));
        };
        const projeGiderPasifToggle = (pid, gid) => {
          guncelle(d => ({ ...d, projeler: (d.projeler || []).map(p => p.id === pid ? { ...p, giderler: (p.giderler || []).map(g => g.id === gid ? { ...g, pasif: !g.pasif } : g) } : p) }));
        };
        const projeAsamaGec = (pid) => {
          projeGuncelle(pid, "durum", "test");
        };
        const projeKaydet = (pid) => {
          projeGuncelle(pid, "durum", "tamamlandi");
          bildir("Proje tamamlandı ve arşive taşındı.");
        };
        const projeIptal = (pid) => {
          guncelle(d => {
            const proje = (d.projeler || []).find(p => p.id === pid);
            if (!proje?.kaynakIslemler?.length) return d;
            let yeni = d;
            proje.kaynakIslemler.forEach(k => {
              const islem = d.islemler.find(i => i.id === k.islemId);
              if (islem && islemBakiyeEtkisi) yeni = islemBakiyeEtkisi(yeni, islem, -1);
            });
            yeni = { ...yeni, islemler: yeni.islemler.filter(i => !proje.kaynakIslemler.map(k => k.islemId).includes(i.id)) };
            return { ...yeni, projeler: (yeni.projeler || []).map(p => p.id === pid ? { ...p, kaynakIslemler: [], durum: "planlama" } : p) };
          });
          bildir("Aktarımlar iptal edildi.", "uyari");
        };

        return (
          <div>
            {/* Üst Bar */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div style={{ fontSize: "0.85rem", color: "var(--metin2)" }}>
                {aktifProjeler.length} aktif proje
              </div>
              <button className="btn btn-kucuk btn-altin" onClick={projeEkle}>
                + Yeni Proje
              </button>
            </div>

            {/* Aktif Projeler */}
            {aktifProjeler.length === 0 && (
              <div className="bos-durum">Henüz proje oluşturulmamış. "+ Yeni Proje" butonu ile başlayın.</div>
            )}

            {aktifProjeler.map(proje => {
              const projeHarcanan = (proje.giderler || []).filter(g => !g.pasif).reduce((s, g) => s + (Number(g.tutar) || 0), 0);
              const kaynakToplam = (proje.kaynakIslemler || []).reduce((s, k) => s + (Number(k.tutar) || 0), 0);
              const hesapKalan = kaynakToplam - projeHarcanan;
              const butceKalan = (Number(proje.butce) || 0) - projeHarcanan;
              const butcePct = proje.butce > 0 ? Math.min(100, (projeHarcanan / proje.butce) * 100) : 0;
              const testAsamasi = proje.durum === "test";
              const acik = acikProjeler.has(proje.id);
              const toggle = () => setAcikProjeler(prev => {
                const next = new Set(prev);
                if (next.has(proje.id)) next.delete(proje.id); else next.add(proje.id);
                return next;
              });

              return (
                <div key={proje.id} className="panel" style={{ marginBottom: 10, border: testAsamasi ? "1px solid #4ade8066" : "1px solid var(--kenar)", padding: 0, overflow: "hidden" }}>

                  {/* ─── ACCORDION BAŞLIĞI (her zaman görünür, tıklanınca aç/kapat) ─── */}
                  <div
                    onClick={toggle}
                    style={{
                      display: "flex", alignItems: "center", gap: 10, padding: "12px 16px",
                      cursor: "pointer", flexWrap: "wrap",
                      background: acik
                        ? (testAsamasi ? "rgba(74,222,128,0.07)" : "rgba(201,168,76,0.07)")
                        : "transparent",
                      borderBottom: acik ? "1px solid var(--kenar)" : "none",
                      userSelect: "none",
                    }}
                  >
                    {/* Chevron + İkon */}
                    <span style={{ fontSize: "0.8rem", color: "var(--metin2)", transition: "transform 0.2s", display: "inline-block", transform: acik ? "rotate(90deg)" : "rotate(0deg)" }}>&#9654;</span>
                    <span style={{ fontSize: "1rem", flexShrink: 0 }}>{testAsamasi ? "🔬" : "📋"}</span>

                    {/* Proje Adı (tıklamayı durdurarak düzenleme yapılır) */}
                    <input
                      className="input"
                      style={{ flex: 1, minWidth: 120, fontWeight: 700, fontSize: "0.92rem", padding: "3px 7px" }}
                      value={proje.ad}
                      onClick={e => e.stopPropagation()}
                      onChange={e => projeGuncelle(proje.id, "ad", e.target.value)}
                    />

                    {/* Aşama Badge */}
                    <span style={{
                      background: testAsamasi ? "rgba(74,222,128,0.15)" : "rgba(201,168,76,0.15)",
                      color: testAsamasi ? "#4ade80" : "var(--altin)",
                      fontSize: "0.68rem", fontWeight: 600, padding: "2px 8px", borderRadius: 4, flexShrink: 0
                    }}>
                      {testAsamasi ? "2. AŞAMA" : "1. AŞAMA"}
                    </span>

                    {/* Bütçe Kalan özeti */}
                    {proje.butce > 0 && (
                      <span style={{ fontSize: "0.78rem", color: butceKalan >= 0 ? "#4ade80" : "#f87171", fontWeight: 600, flexShrink: 0 }}>
                        {butceKalan >= 0 ? "+" : ""}{fmt(butceKalan)} ₺ kalan
                      </span>
                    )}

                    {/* Progress Mini Bar */}
                    {proje.butce > 0 && !acik && (
                      <div style={{ width: 60, flexShrink: 0 }}>
                        <div className="progress-bar" style={{ height: 4, margin: 0 }}>
                          <div className="progress-dolu" style={{
                            width: `${butcePct}%`,
                            background: butcePct >= 100 ? "#f87171" : butcePct >= 75 ? "#fb923c" : "#4ade80"
                          }} />
                        </div>
                      </div>
                    )}

                    {/* SİL Butonu (tıklamayı durdurur) */}
                    <button
                      className="btn btn-kucuk btn-ghost"
                      style={{ color: "#f87171", flexShrink: 0, fontSize: "0.78rem", padding: "2px 8px" }}
                      onClick={e => { e.stopPropagation(); projeSil(proje.id); }}
                    >🗑 SİL</button>
                  </div>

                  {/* ─── ACCORDION GÖVDE (sadece açıksa görünür) ─── */}
                  {acik && (
                    <div style={{ padding: "16px" }}>

                      {/* Bütçe + Hesap Bilgisi */}
                      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
                        <div style={{ flex: 1, minWidth: 180 }}>
                          <div style={{ fontSize: "0.72rem", color: "var(--metin2)", marginBottom: 4 }}>BÜTÇE</div>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <input type="number" className="input"
                              style={{ flex: 1, padding: "5px 8px", fontSize: "0.9rem", textAlign: "right" }}
                              value={proje.butce === 0 ? "" : proje.butce}
                              placeholder="0"
                              onChange={e => projeGuncelle(proje.id, "butce", e.target.value === "" ? 0 : Number(e.target.value))}
                            />
                            <span style={{ fontSize: "0.78rem", color: "var(--metin2)" }}>₺</span>
                          </div>
                        </div>
                        <div style={{ flex: 1, minWidth: 180 }}>
                          <div style={{ fontSize: "0.72rem", color: "var(--metin2)", marginBottom: 4 }}>PROJE HESABI (Aktarılan)</div>
                          <div style={{ fontSize: "1rem", fontWeight: 700, padding: "5px 0" }}
                            className={kaynakToplam > 0 ? "pozitif" : ""}>
                            {kaynakToplam > 0 ? `${fmt(kaynakToplam)} ₺` : "—"}
                          </div>
                        </div>
                        <div style={{ flex: 1, minWidth: 180 }}>
                          <div style={{ fontSize: "0.72rem", color: "var(--metin2)", marginBottom: 4 }}>HARCANAN</div>
                          <div style={{ fontSize: "1rem", fontWeight: 700, padding: "5px 0" }} className="negatif">
                            {projeHarcanan > 0 ? `-${fmt(projeHarcanan)} ₺` : "0,00 ₺"}
                          </div>
                        </div>
                        <div style={{ flex: 1, minWidth: 180 }}>
                          <div style={{ fontSize: "0.72rem", color: "var(--metin2)", marginBottom: 4 }}>BÜTÇE KALAN</div>
                          <div style={{ fontSize: "1rem", fontWeight: 700, padding: "5px 0" }}
                            className={butceKalan >= 0 ? "pozitif" : "negatif"}>
                            {butceKalan >= 0 ? "+" : ""}{fmt(butceKalan)} ₺
                          </div>
                        </div>
                        {testAsamasi && (
                          <div style={{ flex: 1, minWidth: 180 }}>
                            <div style={{ fontSize: "0.72rem", color: "var(--metin2)", marginBottom: 4 }}>HESAP KALAN</div>
                            <div style={{ fontSize: "1rem", fontWeight: 700, padding: "5px 0" }}
                              className={hesapKalan >= 0 ? "pozitif" : "negatif"}>
                              {hesapKalan >= 0 ? "+" : ""}{fmt(hesapKalan)} ₺
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Progress Bar */}
                      {proje.butce > 0 && (
                        <div style={{ marginBottom: 12 }}>
                          <div className="progress-bar" style={{ height: 6 }}>
                            <div className="progress-dolu" style={{
                              width: `${butcePct}%`,
                              background: butcePct >= 100 ? "#f87171" : butcePct >= 75 ? "#fb923c" : "#4ade80",
                              transition: "width 0.3s"
                            }} />
                          </div>
                          <div style={{ fontSize: "0.7rem", color: "var(--metin2)", marginTop: 3, textAlign: "right" }}>
                            %{butcePct.toFixed(1)} kullanıldı
                          </div>
                        </div>
                      )}

                      {/* Aşama 2 – Kaynak İşlemleri Listesi */}
                      {testAsamasi && (proje.kaynakIslemler || []).length > 0 && (
                        <div style={{ marginBottom: 12, padding: "8px 12px", background: "rgba(74,222,128,0.05)", borderRadius: 8, border: "1px solid rgba(74,222,128,0.2)" }}>
                          <div style={{ fontSize: "0.72rem", color: "#4ade80", fontWeight: 600, marginBottom: 6 }}>AKTARILAN KAYNAKLAR</div>
                          {(proje.kaynakIslemler || []).map(k => (
                            <div key={k.id} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.82rem", padding: "2px 0", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                              <span style={{ color: "var(--metin2)" }}>{k.hesapAd}</span>
                              <span>{k.aciklama}</span>
                              <span className="pozitif" style={{ fontWeight: 600 }}>{fmt(k.tutar)} ₺</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Gider Satırları */}
                      <div style={{ marginBottom: 10 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                          <div style={{ fontSize: "0.72rem", color: "var(--metin2)", fontWeight: 600, letterSpacing: "0.05em" }}>GİDERLER</div>
                          <button className="btn btn-kucuk btn-ghost"
                            style={{ fontSize: "0.78rem", color: "var(--altin)", border: "1px dashed var(--altin)", padding: "2px 10px" }}
                            onClick={() => projeGiderEkle(proje.id)}>+ Ekle</button>
                        </div>
                        {(proje.giderler || []).length === 0 && (
                          <div style={{ fontSize: "0.8rem", color: "var(--metin2)", padding: "4px 0" }}>Gider eklenmemiş.</div>
                        )}
                        {(proje.giderler || []).map(g => (
                          <div key={g.id} style={{
                            display: "flex", alignItems: "center", gap: 6, padding: "6px 0",
                            borderTop: "1px solid var(--kenar)", opacity: g.pasif ? 0.45 : 1,
                            flexWrap: "wrap",
                          }}>
                            <input type="date" className="input"
                              style={{ width: 136, padding: "3px 5px", fontSize: "0.8rem", flexShrink: 0 }}
                              value={g.tarih || ""}
                              onChange={e => projeGiderGuncelle(proje.id, g.id, "tarih", e.target.value)}
                            />
                            <input type="text" className="input"
                              style={{ flex: 1, minWidth: 90, padding: "3px 7px", fontSize: "0.83rem" }}
                              placeholder="Açıklama"
                              value={g.aciklama || ""}
                              onChange={e => projeGiderGuncelle(proje.id, g.id, "aciklama", e.target.value)}
                            />
                            <input type="number" className="input"
                              style={{ width: 100, padding: "3px 7px", fontSize: "0.83rem", textAlign: "right", flexShrink: 0 }}
                              placeholder="0,00"
                              value={g.tutar === 0 ? "" : g.tutar}
                              onChange={e => projeGiderGuncelle(proje.id, g.id, "tutar", e.target.value === "" ? 0 : Number(e.target.value))}
                            />
                            <span style={{ fontSize: "0.75rem", color: "var(--metin2)", flexShrink: 0 }}>₺</span>
                            <button className="btn btn-kucuk btn-ghost"
                              style={{ padding: "2px 7px", fontSize: "0.75rem", color: g.pasif ? "#4ade80" : "#fb923c", flexShrink: 0 }}
                              title={g.pasif ? "Aktifleştir" : "Pasife Al"}
                              onClick={() => projeGiderPasifToggle(proje.id, g.id)}>
                              {g.pasif ? "▶" : "⏸"}
                            </button>
                            <button className="btn btn-kucuk btn-ghost"
                              style={{ padding: "2px 7px", fontSize: "0.78rem", color: "#f87171", flexShrink: 0 }}
                              onClick={() => projeGiderSil(proje.id, g.id)}>✕</button>
                            <button className="btn btn-kucuk btn-ghost"
                              style={{ padding: "2px 7px", fontSize: "0.78rem", color: "var(--altin)", flexShrink: 0 }}
                              title="Bu satırın altına yeni satır ekle"
                              onClick={() => projeGiderEkle(proje.id)}>+</button>
                          </div>
                        ))}
                      </div>

                      {/* Notlar (Autosave) */}
                      <div style={{ marginBottom: 12 }}>
                        <div style={{ fontSize: "0.72rem", color: "var(--metin2)", fontWeight: 600, letterSpacing: "0.05em", marginBottom: 5 }}>NOTLAR</div>
                        <textarea
                          className="input"
                          style={{ width: "100%", minHeight: 72, padding: "8px", fontSize: "0.83rem", resize: "vertical", lineHeight: 1.5, boxSizing: "border-box" }}
                          placeholder="Proje ile ilgili notlar, hatırlatmalar..."
                          value={proje.notlar || ""}
                          onChange={e => projeGuncelle(proje.id, "notlar", e.target.value)}
                        />
                      </div>

                      {/* Eylem Butonları */}
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", borderTop: "1px solid var(--kenar)", paddingTop: 12 }}>
                        {!testAsamasi && (
                          <button className="btn btn-kucuk btn-altin"
                            onClick={() => projeAsamaGec(proje.id)}
                            style={{ fontSize: "0.8rem" }}>
                            🔬 2. Aşamaya Geç
                          </button>
                        )}
                        {testAsamasi && (
                          <>
                            <KaynakOlusturModal
                              data={data}
                              proje={proje}
                              guncelle={guncelle}
                              islemBakiyeEtkisi={islemBakiyeEtkisi}
                              bildir={bildir}
                              fmt={fmt}
                            />
                            <button className="btn btn-kucuk btn-ghost"
                              style={{ color: "#fb923c", border: "1px solid #fb923c66" }}
                              onClick={() => projeIptal(proje.id)}>
                              ↩ İPTAL (Aktarımları Geri Al)
                            </button>
                            <button className="btn btn-kucuk btn-ghost"
                              style={{ color: "#4ade80", border: "1px solid #4ade8066" }}
                              onClick={() => projeKaydet(proje.id)}>
                              ✓ KAYDET (Tamamla)
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Tamamlanan Projeler */}
            {tamamlananlar.length > 0 && (
              <div className="panel" style={{ marginTop: 24, opacity: 0.75 }}>
                <div className="panel-baslik">✅ Tamamlanan Projeler ({tamamlananlar.length})</div>
                {tamamlananlar.map(proje => {
                  const harcanan = (proje.giderler || []).filter(g => !g.pasif).reduce((s, g) => s + (Number(g.tutar) || 0), 0);
                  const kaynak = (proje.kaynakIslemler || []).reduce((s, k) => s + (Number(k.tutar) || 0), 0);
                  return (
                    <div key={proje.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderTop: "1px solid var(--kenar)", flexWrap: "wrap", gap: 8 }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: "0.9rem" }}>{proje.ad}</div>
                        <div style={{ fontSize: "0.75rem", color: "var(--metin2)" }}>
                          Bütçe: {fmt(proje.butce)} ₺ · Harcanan: {fmt(harcanan)} ₺{kaynak > 0 ? ` · Aktarılan: ${fmt(kaynak)} ₺` : ""}
                        </div>
                      </div>
                      <button className="btn btn-kucuk btn-ghost"
                        style={{ color: "#f87171", fontSize: "0.75rem" }}
                        onClick={() => projeSil(proje.id)}>🗑 Sil</button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })()}
    </div>
  );
}

// ─── Kaynak Oluştur Modal Bileşeni ───────────────────────────────────────────
function KaynakOlusturModal({ data, proje, guncelle, islemBakiyeEtkisi, bildir, fmt }) {
  const [acik, setAcik] = useState(false);
  const [hesapTur, setHesapTur] = useState("banka");
  const [hesapId, setHesapId] = useState("");
  const [kategori, setKategori] = useState("");
  const [aciklama, setAciklama] = useState("");
  const [tutar, setTutar] = useState("");

  const hesapListesi = (() => {
    if (hesapTur === "nakit") return data.nakitHesaplar.filter(h => !h.pasif).map(h => ({ id: h.id, ad: h.ad }));
    if (hesapTur === "banka") return data.bankaHesaplar.filter(h => !h.pasif).map(h => ({ id: h.id, ad: h.ad }));
    if (hesapTur === "krediKarti") return data.krediKartlari.filter(h => !h.pasif).map(h => ({ id: h.id, ad: h.ad }));
    if (hesapTur === "kredi") return data.krediler.filter(h => !h.pasif).map(h => ({ id: h.id, ad: h.ad }));
    return [];
  })();

  const giderKategoriler = data.kategoriler.filter(k => k.tur === "gider" && !k.pasif && !k.ustId);

  const kaydet = () => {
    const t = Number(tutar);
    if (!hesapId || !t || t <= 0) { bildir("Hesap ve tutar zorunludur.", "hata"); return; }
    const secHesap = hesapListesi.find(h => h.id === hesapId);
    const secKat = kategori || "Diğer Gider";
    const islemId = uid();
    const kaynakId = uid();
    const yeniIslem = {
      id: islemId, tarih: new Date().toISOString().split("T")[0],
      tur: "gider", hesapTur, hesapId,
      hesapAdi: secHesap?.ad || "",
      kategori: secKat, aciklama: aciklama || `Proje: ${proje.ad}`,
      miktar: t,
    };
    guncelle(d => {
      let yeni = { ...d, islemler: [...(d.islemler || []), yeniIslem] };
      if (islemBakiyeEtkisi) yeni = islemBakiyeEtkisi(yeni, yeniIslem, 1);
      const kaynakIslem = { id: kaynakId, islemId, tutar: t, hesapAd: `${hesapTur === "banka" ? "🏦" : hesapTur === "nakit" ? "💵" : hesapTur === "krediKarti" ? "💳" : "📋"} ${secHesap?.ad}`, aciklama: yeniIslem.aciklama };
      return {
        ...yeni,
        projeler: (yeni.projeler || []).map(p => p.id === proje.id
          ? { ...p, kaynakIslemler: [...(p.kaynakIslemler || []), kaynakIslem] }
          : p
        )
      };
    });
    bildir(`${fmt(t)} ₺ aktarım yapıldı.`);
    setAcik(false); setTutar(""); setAciklama("");
  };

  return (
    <>
      <button className="btn btn-kucuk btn-altin"
        style={{ fontSize: "0.8rem" }}
        onClick={() => setAcik(true)}>
        + KAYNAK OLUŞTUR
      </button>
      {acik && (
        <div className="modal-overlay" onClick={() => setAcik(false)}>
          <div className="modal-box" style={{ maxWidth: 420, width: "95%" }} onClick={e => e.stopPropagation()}>
            <h3 style={{ marginBottom: 16, color: "var(--altin)" }}>Kaynak Oluştur — {proje.ad}</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <label style={{ fontSize: "0.78rem", color: "var(--metin2)", display: "block", marginBottom: 4 }}>Hesap Tipi</label>
                <select className="input" value={hesapTur}
                  onChange={e => { setHesapTur(e.target.value); setHesapId(""); }}>
                  <option value="banka">🏦 Banka</option>
                  <option value="nakit">💵 Nakit</option>
                  <option value="krediKarti">💳 Kredi Kartı</option>
                  <option value="kredi">📋 Kredi</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: "0.78rem", color: "var(--metin2)", display: "block", marginBottom: 4 }}>Hesap</label>
                <select className="input" value={hesapId} onChange={e => setHesapId(e.target.value)}>
                  <option value="">— Seçin —</option>
                  {hesapListesi.map(h => <option key={h.id} value={h.id}>{h.ad}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: "0.78rem", color: "var(--metin2)", display: "block", marginBottom: 4 }}>Kategori</label>
                <select className="input" value={kategori} onChange={e => setKategori(e.target.value)}>
                  <option value="">— Seçin —</option>
                  {giderKategoriler.map(k => <option key={k.id} value={k.ad}>{k.ad}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: "0.78rem", color: "var(--metin2)", display: "block", marginBottom: 4 }}>Açıklama</label>
                <input type="text" className="input"
                  placeholder={`Proje: ${proje.ad}`}
                  value={aciklama} onChange={e => setAciklama(e.target.value)}
                />
              </div>
              <div>
                <label style={{ fontSize: "0.78rem", color: "var(--metin2)", display: "block", marginBottom: 4 }}>Tutar (₺)</label>
                <input type="number" className="input" style={{ textAlign: "right" }}
                  placeholder="0,00"
                  value={tutar} onChange={e => setTutar(e.target.value)}
                />
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 20, justifyContent: "flex-end" }}>
              <button className="btn btn-ghost" onClick={() => setAcik(false)}>Vazgeç</button>
              <button className="btn btn-altin" onClick={kaydet}>Aktarımı Oluştur ✓</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
