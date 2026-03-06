import { useState, useMemo } from "react";
import { uid, fmt, fmtDate, hesaplaKartBorc, today } from "../veri";
import { KrediKartiEkleForm, IslemEkleForm } from "./Modaller";

export default function KrediKartiSayfa({ data, guncelle, bildir, setModal, setSilinecek }) {
  const [secili, setSecili] = useState(null);
  const [pasifleriGoster, setPasifleriGoster] = useState(false);
  const [seciliAy, setSeciliAy] = useState(new Date().getMonth()); // 0-11
  const [seciliYil, setSeciliYil] = useState(new Date().getFullYear());
  const [donemFiltre, setDonemFiltre] = useState("ay"); // "ay" | "tumu"
  const [duzeltmeMiktar, setDuzeltmeMiktar] = useState("");
  const [asgariOranGiris, setAsgariOranGiris] = useState({});

  const kartEkle = (kart) => {
    guncelle(d => ({
      ...d,
      krediKartlari: [...d.krediKartlari, {
        ...kart, id: uid(),
        bakiyeDuzeltme: kart.borc || 0,
      }]
    }));
    bildir("Kredi kartı eklendi."); setModal(null);
  };

  const kartDuzenle = (id, veri) => {
    const { borc, ...diger } = veri;
    const guncelVeri = { ...diger };
    if (borc !== undefined) guncelVeri.bakiyeDuzeltme = borc;
    guncelle(d => ({
      ...d,
      krediKartlari: d.krediKartlari.map(k => k.id === id
        ? { ...k, ...guncelVeri }
        : k
      )
    }));
    bildir("Kart güncellendi."); setModal(null);
    setSecili(prev => prev?.id === id ? { ...prev, ...guncelVeri } : prev);
  };

  const harcamaEkle = (kartId, islem) => {
    // Bakiyeyi App.js/islemBakiyeEtkisi yönetiyor, biz sadece işlemi ekliyoruz.
    guncelle(d => ({ ...d, islemler: [...d.islemler, { ...islem, id: uid() }] }));
    bildir("İşlem kaydedildi."); setModal(null);
  };

  const kartSil = (id) => {
    setSilinecek({
      mesaj: "Bu kredi kartını silmek istiyor musunuz?",
      onay: () => {
        guncelle(d => ({ ...d, krediKartlari: d.krediKartlari.filter(k => k.id !== id) }));
        bildir("Silindi.", "uyari");
        if (secili?.id === id) setSecili(null);
      },
    });
  };

  const filtrelenmisKartlar = pasifleriGoster ? data.krediKartlari : data.krediKartlari.filter(k => !k.pasif);

  return (
    <div className="sayfa">
      <div className="sayfa-baslik">
        <h1>Kredi Kartları</h1>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <button className="btn btn-ghost" onClick={() => setPasifleriGoster(!pasifleriGoster)}>
            {pasifleriGoster ? "Gizle (Pasif)" : "Göster (Pasif)"}
          </button>
          <button className="btn btn-altin"
            onClick={() => setModal(<KrediKartiEkleForm onKaydet={kartEkle} onIptal={() => setModal(null)} />)}>
            + Kart Ekle
          </button>
        </div>
      </div>
      <div className="iki-sutun">
        <div className="sol-sutun">
          {filtrelenmisKartlar.length === 0 && <div className="bos-durum">Henüz kart eklenmedi</div>}
          {filtrelenmisKartlar.map(k => {
            const bugun = today();
            const guncelBorc = hesaplaKartBorc(k.id, data.islemler, k.bakiyeDuzeltme || 0, bugun);
            const toplamBorc = hesaplaKartBorc(k.id, data.islemler, k.bakiyeDuzeltme || 0);
            const kullanim = k.limit ? (Math.max(0, guncelBorc) / k.limit) * 100 : 0;
            const asgariOdeme = k.asgariOdemeOrani ? Math.max(0, guncelBorc) * (k.asgariOdemeOrani / 100) : null;
            return (
              <div key={k.id} className={`hesap-kart${secili?.id === k.id ? " secili" : ""}${k.pasif ? " pasif" : ""}`} onClick={() => setSecili(k)}>
                <div className="hk-ust">
                  <div>
                    <div className="hk-ad">{k.ad}</div>
                    <div className="hk-alt">🏦 {k.banka}</div>
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button className="btn-duz" title="Düzenle"
                      onClick={e => {
                        e.stopPropagation();
                        setModal(
                          <KrediKartiEkleForm
                            mevcutVeri={{ ...k, borc: k.bakiyeDuzeltme || 0 }}
                            onKaydet={v => kartDuzenle(k.id, v)}
                            onIptal={() => setModal(null)} />
                        );
                      }}>✎</button>
                    <button className="btn-sil" onClick={e => { e.stopPropagation(); kartSil(k.id); }}>✕</button>
                  </div>
                </div>

                {/* Bilgi satırları */}
                <div className="kk-satir">
                  <span className="kk-label">Güncel Borç</span>
                  <span className="negatif" style={{ fontWeight: "bold", fontSize: "1.1rem" }}>{fmt(guncelBorc)} ₺</span>
                </div>
                {toplamBorc !== guncelBorc && (
                  <div className="kk-satir">
                    <span className="kk-label">Toplam Borç <small style={{ fontWeight: "normal", color: "var(--metin2)", fontSize: "0.72rem" }}>(Taksitler Dahil)</small></span>
                    <span className="negatif">{fmt(toplamBorc)} ₺</span>
                  </div>
                )}
                <div className="kk-satir"><span className="kk-label">Kart Limiti</span><span>{fmt(k.limit || 0)} ₺</span></div>

                <div className="progress-bar">
                  <div className="progress-dolu" style={{
                    width: `${Math.min(kullanim, 100)}%`,
                    background: kullanim > 80 ? "#f87171" : kullanim > 50 ? "#fbbf24" : "#4ade80"
                  }} />
                </div>
                <div className="kk-satir kucuk-yazi"><span>Kullanım: %{kullanim.toFixed(0)}</span><span>{fmt(Math.max(0, (k.limit || 0) - guncelBorc))} ₺ kullanılabilir limit</span></div>

                {/* Ek bilgiler */}
                <div style={{ borderTop: "1px solid var(--kenar)", marginTop: 8, paddingTop: 8, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4 }}>
                  {k.hesapKesimTarihi && <div className="kk-satir kucuk-yazi"><span className="kk-label">Kesim</span><span>{k.hesapKesimTarihi}</span></div>}
                  {k.sonOdemeTarihi && <div className="kk-satir kucuk-yazi"><span className="kk-label">Son Ödeme</span><span>{k.sonOdemeTarihi}</span></div>}
                  {k.faizOrani && <div className="kk-satir kucuk-yazi"><span className="kk-label">Faiz</span><span className="negatif">%{k.faizOrani}</span></div>}
                  <div className="kk-satir kucuk-yazi" style={{ gridColumn: "1 / -1" }}>
                    <span className="kk-label">Asgari Ödeme</span>
                    <div style={{ display: "flex", alignItems: "center", gap: 4 }} onClick={e => e.stopPropagation()}>
                      <input
                        type="text"
                        className="input"
                        style={{ width: 52, padding: "2px 6px", fontSize: "0.75rem", textAlign: "right" }}
                        value={asgariOranGiris[k.id] !== undefined ? asgariOranGiris[k.id] : (k.asgariOdemeOrani != null ? String(k.asgariOdemeOrani) : "")}
                        placeholder="oran"
                        onChange={e => setAsgariOranGiris(prev => ({ ...prev, [k.id]: e.target.value }))}
                        onKeyDown={e => {
                          if (e.key === "Enter") {
                            const val = parseFloat(String(asgariOranGiris[k.id] ?? "").replace(",", "."));
                            if (!isNaN(val) && val >= 0) {
                              guncelle(d => ({ ...d, krediKartlari: d.krediKartlari.map(kk => kk.id === k.id ? { ...kk, asgariOdemeOrani: val } : kk) }));
                              bildir(`Asgari ödeme oranı %${val} olarak kaydedildi.`);
                            }
                            setAsgariOranGiris(prev => { const { [k.id]: _, ...rest } = prev; return rest; });
                          }
                        }}
                        onBlur={() => {
                          const inputVal = asgariOranGiris[k.id];
                          if (inputVal === undefined) return;
                          const val = parseFloat(String(inputVal).replace(",", "."));
                          if (!isNaN(val) && val >= 0) {
                            guncelle(d => ({ ...d, krediKartlari: d.krediKartlari.map(kk => kk.id === k.id ? { ...kk, asgariOdemeOrani: val } : kk) }));
                          }
                          setAsgariOranGiris(prev => { const { [k.id]: _, ...rest } = prev; return rest; });
                        }}
                      />
                      <span style={{ fontSize: "0.75rem", color: "var(--metin2)" }}>%</span>
                      {asgariOdeme !== null && (
                        <span className="altin" style={{ marginLeft: 6, fontWeight: 600 }}>{fmt(asgariOdeme)} ₺</span>
                      )}
                    </div>
                  </div>
                </div>


              </div>
            );
          })}
        </div>

        {secili && (() => {
          // Tüm kart işlemleri: harcamalar + ödemeler
          const tumIslemler = data.islemler.filter(i => i.hesapId === secili.id || (i.tur === "kk_odeme" && i.kartId === secili.id));

          // Hesap kesim gününü çıkar (varsayılan: ay sonu)
          const kesimGunu = secili.hesapKesimTarihi ? parseInt(secili.hesapKesimTarihi.replace(/\D/g, ""), 10) : 0;

          // Dönem filtresi
          let filtrelenmisIslemler;
          let donemBasStr = "", donemBitStr = "";
          if (donemFiltre === "tumu") {
            filtrelenmisIslemler = tumIslemler;
          } else {
            if (kesimGunu > 0 && kesimGunu <= 31) {
              // Kesim tarihine göre dönem: önceki ayın (kesim+1)'i ~ bu ayın kesim günü
              // seciliAy=2 (Mart), kesim=23 → 24 Şubat – 23 Mart
              const bitYil = seciliYil;
              const bitAy = seciliAy; // 0-indexed
              const bitDate = new Date(bitYil, bitAy, Math.min(kesimGunu, new Date(bitYil, bitAy + 1, 0).getDate()));
              const basDate = new Date(bitYil, bitAy - 1, kesimGunu + 1);
              // Önceki ayda kesimGunu+1 geçerli mi kontrol et
              const oncekiAySonGun = new Date(bitYil, bitAy, 0).getDate();
              if (kesimGunu + 1 > oncekiAySonGun) {
                basDate.setDate(1);
                basDate.setMonth(bitAy);
              }
              const pad = (n) => String(n).padStart(2, "0");
              donemBasStr = `${basDate.getFullYear()}-${pad(basDate.getMonth() + 1)}-${pad(basDate.getDate())}`;
              donemBitStr = `${bitDate.getFullYear()}-${pad(bitDate.getMonth() + 1)}-${pad(bitDate.getDate())}`;
            } else {
              // Kesim tarihi yoksa takvim ayı kullan
              donemBasStr = `${seciliYil}-${String(seciliAy + 1).padStart(2, "0")}-01`;
              const sonGun = new Date(seciliYil, seciliAy + 1, 0).getDate();
              donemBitStr = `${seciliYil}-${String(seciliAy + 1).padStart(2, "0")}-${String(sonGun).padStart(2, "0")}`;
            }
            filtrelenmisIslemler = tumIslemler.filter(i => i.tarih >= donemBasStr && i.tarih <= donemBitStr);
          }

          // Sıralama: yeniden eskiye
          const sirali = [...filtrelenmisIslemler].sort((a, b) => b.tarih.localeCompare(a.tarih));

          // Toplamlar
          let topHarcama = 0, topOdeme = 0;
          filtrelenmisIslemler.forEach(i => {
            if (i.tur === "kk_odeme" && i.kartId === secili.id) {
              topOdeme += Number(i.miktar) || 0;
            } else if (i.tur === "gider") {
              topHarcama += Number(i.miktar) || 0;
            } else if (i.tur === "gelir") {
              topOdeme += Number(i.miktar) || 0;
            }
          });

          const aylar = ["Ocak","Şubat","Mart","Nisan","Mayıs","Haziran","Temmuz","Ağustos","Eylül","Ekim","Kasım","Aralık"];

          // Mevcut yılları bul
          const yillar = [...new Set(tumIslemler.map(i => Number(i.tarih?.slice(0, 4))).filter(Boolean))];
          if (!yillar.includes(seciliYil)) yillar.push(seciliYil);
          yillar.sort((a, b) => b - a);

          const oncekiAy = () => {
            if (seciliAy === 0) { setSeciliAy(11); setSeciliYil(y => y - 1); }
            else setSeciliAy(a => a - 1);
          };
          const sonrakiAy = () => {
            if (seciliAy === 11) { setSeciliAy(0); setSeciliYil(y => y + 1); }
            else setSeciliAy(a => a + 1);
          };

          return (
          <div className="sag-sutun">
            <div className="panel">
              <div className="panel-baslik">{secili.ad} — İşlem Geçmişi</div>

              {/* Dönem Filtresi */}
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 12, padding: "8px 0", borderBottom: "1px solid var(--kenar)" }}>
                <select className="input" style={{ width: "auto", padding: "4px 8px" }} value={donemFiltre} onChange={e => setDonemFiltre(e.target.value)}>
                  <option value="ay">Aya Göre</option>
                  <option value="tumu">Tümü</option>
                </select>
                {donemFiltre === "ay" && (
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <button className="btn btn-ghost" style={{ padding: "2px 8px", fontSize: "1rem" }} onClick={oncekiAy}>◀</button>
                    <select className="input" style={{ width: "auto", padding: "4px 8px" }} value={seciliAy} onChange={e => setSeciliAy(Number(e.target.value))}>
                      {aylar.map((a, i) => <option key={i} value={i}>{a}</option>)}
                    </select>
                    <select className="input" style={{ width: "auto", padding: "4px 8px" }} value={seciliYil} onChange={e => setSeciliYil(Number(e.target.value))}>
                      {yillar.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                    <button className="btn btn-ghost" style={{ padding: "2px 8px", fontSize: "1rem" }} onClick={sonrakiAy}>▶</button>
                  </div>
                )}
                {donemFiltre === "ay" && donemBasStr && (
                  <div style={{ fontSize: "0.72rem", color: "var(--metin2)", marginLeft: 4 }}>
                    ({fmtDate(donemBasStr)} – {fmtDate(donemBitStr)})
                  </div>
                )}
              </div>

              {/* Dönem Toplamları */}
              <div style={{ display: "flex", gap: 16, marginBottom: 12, flexWrap: "wrap" }}>
                <div style={{ flex: 1, minWidth: 120, background: "rgba(248,113,113,0.1)", borderRadius: 8, padding: "8px 12px", textAlign: "center" }}>
                  <div style={{ fontSize: "0.75rem", color: "var(--metin2)" }}>Harcama</div>
                  <div className="negatif" style={{ fontWeight: 600 }}>{fmt(topHarcama)} ₺</div>
                </div>
                <div style={{ flex: 1, minWidth: 120, background: "rgba(74,222,128,0.1)", borderRadius: 8, padding: "8px 12px", textAlign: "center" }}>
                  <div style={{ fontSize: "0.75rem", color: "var(--metin2)" }}>Ödeme</div>
                  <div className="pozitif" style={{ fontWeight: 600 }}>{fmt(topOdeme)} ₺</div>
                </div>
                <div style={{ flex: 1, minWidth: 120, background: "rgba(201,168,76,0.1)", borderRadius: 8, padding: "8px 12px", textAlign: "center" }}>
                  <div style={{ fontSize: "0.75rem", color: "var(--metin2)" }}>Net</div>
                  <div className={topHarcama - topOdeme > 0 ? "negatif" : "pozitif"} style={{ fontWeight: 600 }}>{fmt(topHarcama - topOdeme)} ₺</div>
                </div>
              </div>

              {/* İşlem Tablosu */}
              {sirali.length === 0
                ? <div className="bos-durum">{donemFiltre === "ay" ? `${aylar[seciliAy]} ${seciliYil} döneminde işlem yok` : "İşlem yok"}</div>
                : (
                  <table className="tablo">
                    <thead><tr><th>Tarih</th><th>Açıklama</th><th>Kategori</th><th style={{ textAlign: "right" }}>Tutar</th></tr></thead>
                    <tbody>
                      {sirali.map(i => {
                        const isOdeme = i.tur === "kk_odeme" && i.kartId === secili.id;
                        return (
                        <tr key={i.id}>
                          <td>{fmtDate(i.tarih)}</td>
                          <td>{i.aciklama}</td>
                          <td><span className="badge">{isOdeme ? "Kart Ödemesi" : (i.kategori || "—")}</span></td>
                          <td style={{ textAlign: "right" }} className={isOdeme || i.tur === "gelir" ? "pozitif" : "negatif"}>
                            {isOdeme || i.tur === "gelir" ? "+" : "-"}{fmt(i.miktar)} ₺
                          </td>
                        </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr style={{ fontWeight: 600, borderTop: "2px solid var(--kenar)" }}>
                        <td colSpan={3}>Toplam ({sirali.length} işlem)</td>
                        <td style={{ textAlign: "right" }} className={topHarcama - topOdeme > 0 ? "negatif" : "pozitif"}>
                          {fmt(topHarcama - topOdeme)} ₺
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                )}
            </div>

            {/* Bakiye Düzeltme */}
            {(() => {
              const bugun = today();
              const islemBazliBorc = hesaplaKartBorc(secili.id, data.islemler, 0, bugun);
              const mevcutDuzeltme = secili.bakiyeDuzeltme || 0;
              const toplamGosterilen = islemBazliBorc + mevcutDuzeltme;

              const bakiyeAyarla = (hedefBorc) => {
                const yeniDuzeltme = hedefBorc - islemBazliBorc;
                guncelle(d => ({
                  ...d,
                  krediKartlari: d.krediKartlari.map(k => k.id === secili.id
                    ? { ...k, bakiyeDuzeltme: yeniDuzeltme }
                    : k
                  )
                }));
                setSecili(prev => ({ ...prev, bakiyeDuzeltme: yeniDuzeltme }));
                bildir(`Borç ${fmt(hedefBorc)} ₺ olarak ayarlandı.`);
                setDuzeltmeMiktar("");
              };

              return (
              <div className="panel" style={{ marginTop: 12 }}>
                <div className="panel-baslik">Bakiye Düzeltme</div>
                <div style={{ fontSize: "0.78rem", color: "var(--metin2)", marginBottom: 10, lineHeight: 1.5 }}>
                  İşlemlerden hesaplanan borç gerçek borçla uyuşmuyorsa, olması gereken toplam borcu girin.
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 10, fontSize: "0.8rem" }}>
                  <div className="kk-satir"><span className="kk-label">İşlem Bazlı Borç</span><span>{fmt(islemBazliBorc)} ₺</span></div>
                  <div className="kk-satir"><span className="kk-label">Düzeltme</span><span style={{ color: mevcutDuzeltme === 0 ? "var(--metin2)" : mevcutDuzeltme > 0 ? "#f87171" : "#4ade80" }}>{mevcutDuzeltme >= 0 ? "+" : ""}{fmt(mevcutDuzeltme)} ₺</span></div>
                </div>

                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input
                    type="text"
                    className="input"
                    style={{ flex: 1 }}
                    value={duzeltmeMiktar}
                    onChange={e => setDuzeltmeMiktar(e.target.value)}
                    placeholder={`Olması gereken borç (şu an: ${fmt(toplamGosterilen)})`}
                    onKeyDown={e => {
                      if (e.key === "Enter") {
                        const val = parseFloat(String(duzeltmeMiktar).replace(",", "."));
                        if (isNaN(val)) return;
                        bakiyeAyarla(val);
                      }
                    }}
                  />
                  <button className="btn btn-altin" onClick={() => {
                    const val = parseFloat(String(duzeltmeMiktar).replace(",", "."));
                    if (isNaN(val)) { bildir("Geçerli bir miktar giriniz.", "uyari"); return; }
                    bakiyeAyarla(val);
                  }}>Ayarla</button>
                </div>

                {mevcutDuzeltme !== 0 && (
                  <button className="btn btn-ghost" style={{ marginTop: 8, fontSize: "0.78rem" }} onClick={() => {
                    guncelle(d => ({
                      ...d,
                      krediKartlari: d.krediKartlari.map(k => k.id === secili.id
                        ? { ...k, bakiyeDuzeltme: 0 }
                        : k
                      )
                    }));
                    setSecili(prev => ({ ...prev, bakiyeDuzeltme: 0 }));
                    bildir("Düzeltme sıfırlandı.");
                  }}>Düzeltmeyi Sıfırla</button>
                )}
              </div>
              );
            })()}
          </div>
          );
        })()}
      </div>
    </div>
  );
}
