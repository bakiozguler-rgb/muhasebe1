import { useState, useEffect, useRef, useMemo } from "react";
import { uid, today, fmt, tumHesaplar, harcamaHesaplari, gelirHesaplari, hesaplaKartBorc } from "../veri";
import Calculator from "./Calculator";

export default function IslemWizard({ data, guncelle, bildir, onKaydet, onKapat, eskiIslem = null, mutabakatEkle = null }) {
  const [adim, setAdim] = useState(eskiIslem ? 3 : 1);
  const [tur, setTur] = useState(eskiIslem?.tur || "gider");
  const [miktar, setMiktar] = useState(eskiIslem?.miktar?.toString() || "");
  const [tarih, setTarih] = useState(eskiIslem?.tarih || today());
  const [aciklama, setAciklama] = useState(eskiIslem?.aciklama || "");

  // Açıklama kelime bazlı autocomplete için öneriler
  const [aciklamaFocus, setAciklamaFocus] = useState(false);
  const aciklamaInputRef = useRef(null);
  const aciklamaKelimeOnerileri = useMemo(() => {
    if (!data?.islemler) return [];
    // Tüm açıklamaları kelimelere böl, küçük harfe çevir, benzersiz yap
    const kelimeler = data.islemler
      .flatMap(i => (i.aciklama || "").split(/\s+/))
      .map(k => k.trim().toLowerCase())
      .filter(k => k.length > 0);
    return [...new Set(kelimeler)];
  }, [data?.islemler]);

  // Girilen metnin son kelimesine göre önerileri filtrele
  const aktifKelime = aciklama.split(/\s+/).pop().toLowerCase();
  const filtreliOneriler = useMemo(() => {
    if (!aktifKelime || !aciklamaFocus) return [];
    return aciklamaKelimeOnerileri.filter(k => k.startsWith(aktifKelime) && k !== aktifKelime).slice(0, 8);
  }, [aktifKelime, aciklamaKelimeOnerileri, aciklamaFocus]);

  // Öneri seçilince açıklamaya ekle
  const handleOneriSec = (kelime) => {
    const parcalar = aciklama.split(/\s+/);
    parcalar[parcalar.length - 1] = kelime;
    setAciklama(parcalar.join(" ") + " ");
    setTimeout(() => {
      aciklamaInputRef.current?.focus();
    }, 0);
  };
  const [hesapId, setHesapId] = useState(eskiIslem?.hesapId || "");
  const [anaKatId, setAnaKatId] = useState("");
  const [altKatId, setAltKatId] = useState("");
  const [taksitSayisi, setTaksitSayisi] = useState(1);
  const [yeniAnaKatModu, setYeniAnaKatModu] = useState(false);
  const [yeniAltKatModu, setYeniAltKatModu] = useState(false);
  const [yeniKatAdi, setYeniKatAdi] = useState("");
  const [acikGrup, setAcikGrup] = useState("nakit"); // nakit, banka, kredikarti
  const [kartId, setKartId] = useState(eskiIslem?.kartId || ""); // Ödenecek kart
  const [krediId, setKrediId] = useState(eskiIslem?.krediId || ""); // Ödenecek kredi
  const [krediOdemeTuru, setKrediOdemeTuru] = useState(eskiIslem?.krediOdemeTuru || "taksit"); // taksit, kapat
  const [mtYon, setMtYon] = useState("giris");
  const [mtHedefKey, setMtHedefKey] = useState("");
  const [calcAcik, setCalcAcik] = useState(false);
  const miktarInputRef = useRef(null);

  // Miktarı formatlı göster (sadece okuma amaçlı)
  const formatliMiktar = (deger) => {
    if (!deger) return "";
    const num = parseFloat(deger);
    if (isNaN(num)) return deger;
    return new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(num);
  };

  const miktarDegisti = (e) => {
    // Sadece rakam ve virgüle izin ver, formatlamayı kaldır
    let val = e.target.value.replace(/[^0-9,]/g, "");
    // Virgülü noktaya çevir ki state'te düzgün saklansın
    val = val.replace(/,/g, ".");
    setMiktar(val);
  };

  // Kategori ID eşleştirme (eskiIslem varsa)
  useEffect(() => {
    if (eskiIslem && eskiIslem.kategori) {
      const kat = data.kategoriler.find(k => k.ad === eskiIslem.kategori);
      if (kat) {
        if (kat.ustId) {
          setAnaKatId(kat.ustId);
          setAltKatId(kat.id);
        } else {
          setAnaKatId(kat.id);
        }
      }
    }
  }, [eskiIslem, data.kategoriler]);

  const seciliHesap = tumHesaplar(data).find(h => h.id === hesapId);
  const isKrediKarti = seciliHesap?.hesapTur === "krediKarti";

  // Mutabakat: seçili hedef bilgisi
  const mtHedefAd = (() => {
    if (!mtHedefKey) return "";
    const [, id] = mtHedefKey.split(":");
    return [...data.nakitHesaplar, ...data.bankaHesaplar, ...data.krediKartlari, ...data.krediler].find(h => h.id === id)?.ad || "";
  })();

  const yeniKategoriEkle = (pUid = null) => {
    if (!yeniKatAdi.trim()) return;
    const yeniId = uid();
    const yeniKategori = {
      id: yeniId,
      ad: yeniKatAdi.trim(),
      tur,
      ustId: pUid,
      renk: tur === "gelir" ? "#4ade80" : "#f87171"
    };

    guncelle(d => ({
      ...d,
      kategoriler: [...d.kategoriler, yeniKategori]
    }));

    if (pUid) {
      setAltKatId(yeniId);
      setYeniAltKatModu(false);
    } else {
      setAnaKatId(yeniId);
      setYeniAnaKatModu(false);
    }
    setYeniKatAdi("");
    bildir("Yeni kategori oluşturuldu.");
  };

  const kaydet = () => {
    // Mutabakat özel akışı
    if (tur === "mutabakat") {
      if (!mtHedefKey || !miktar) return;
      const [hedefTur, hedefId] = mtHedefKey.split(":");
      mutabakatEkle({
        yon: mtYon, hedefId, hedefTur, hedefAd: mtHedefAd,
        miktar: parseFloat(miktar), tarih, aciklama,
      });
      setMiktar(""); setAciklama(""); setMtHedefKey(""); setAdim(1); setTur("gider");
      return;
    }

    if (!miktar || !hesapId) return;

    const anaKat = data.kategoriler.find(k => k.id === anaKatId);
    const altKat = data.kategoriler.find(k => k.id === altKatId);
    const kategoriAdi = altKat ? altKat.ad : anaKat?.ad || "Diğer";

    const islem = {
      ...(eskiIslem || {}),
      id: eskiIslem?.id || uid(),
      tarih,
      miktar: parseFloat(miktar),
      tur,
      hesapId,
      hesapAdi: seciliHesap?.ad,
      hesapTur: seciliHesap?.hesapTur,
      kategori: tur === "kk_odeme" ? "Kredi Kartı Ödemesi" : (tur === "kredi_odeme" ? "Kredi Ödemesi" : kategoriAdi),
      aciklama: aciklama || (tur === "kk_odeme" ? `Kart Ödemesi: ${data.krediKartlari.find(k => k.id === kartId)?.ad}` : (tur === "kredi_odeme" ? `Kredi Ödemesi: ${data.krediler.find(k => k.id === krediId)?.ad}` : kategoriAdi)),
      kartId: tur === "kk_odeme" ? kartId : null,
      krediId: tur === "kredi_odeme" ? krediId : null,
      krediOdemeTuru: tur === "kredi_odeme" ? krediOdemeTuru : null
    };

    onKaydet(islem, !!eskiIslem, taksitSayisi);

    if (!eskiIslem) {
      // Formu sıfırla ama hesabı/türü koru (üst üste giriş için kolaylık)
      setMiktar("");
      setAciklama("");
      setAnaKatId("");
      setAltKatId("");
      setTaksitSayisi(1);
      // setAdim(3); // Zaten 3'teyiz
    }
  };

  return (
    <div className="modal-overlay" onClick={onKapat}>
      <div className="wizard-kart" onClick={e => e.stopPropagation()}>
        <div className="wizard-header">
          <h2>{eskiIslem ? "İşlemi Düzenle" : "Yeni İşlem"}</h2>
          <button className="btn-kapat" onClick={onKapat}>✕</button>
        </div>

        <div className="wizard-govde">
          {adim === 1 && (
            <div className="wizard-icerik">
              <p className="wizard-soru">Hangi tür işlem yapmak istiyorsunuz?</p>
              <div className="wizard-secenekler iki-kol">
                <button className={`wizard-tur-btn gider-btn ${tur === "gider" ? "secili" : ""}`}
                  onClick={() => { setTur("gider"); setAdim(2); }}>
                  <div className="wizard-tur-ikon">💸</div>
                  <div className="wizard-tur-ad">Gider</div>
                  <div className="wizard-tur-alt">Harcama yap</div>
                </button>
                <button className={`wizard-tur-btn gelir-btn ${tur === "gelir" ? "secili" : ""}`}
                  onClick={() => { setTur("gelir"); setAdim(2); }}>
                  <div className="wizard-tur-ikon">💰</div>
                  <div className="wizard-tur-ad">Gelir</div>
                  <div className="wizard-tur-alt">Para girişi</div>
                </button>
                <button className={`wizard-tur-btn`} style={{ borderColor: "#fbbf24" }}
                  onClick={() => { setTur("kk_odeme"); setAdim(2); }}>
                  <div className="wizard-tur-ikon">💳</div>
                  <div className="wizard-tur-ad">Kart Ödemesi</div>
                  <div className="wizard-tur-alt">Ekstre borcu öde</div>
                </button>
                <button className={`wizard-tur-btn`} style={{ borderColor: "#a78bfa" }}
                  onClick={() => { setTur("kredi_odeme"); setAdim(2); }}>
                  <div className="wizard-tur-ikon">🏦</div>
                  <div className="wizard-tur-ad">Kredi Ödemesi</div>
                  <div className="wizard-tur-alt">Kredi taksiti öde</div>
                </button>
                {mutabakatEkle && (
                  <button className={`wizard-tur-btn`} style={{ borderColor: "var(--altin)", gridColumn: "1 / -1" }}
                    onClick={() => { setTur("mutabakat"); setAdim(2); }}>
                    <div className="wizard-tur-ikon">⚖</div>
                    <div className="wizard-tur-ad">Mutabakat</div>
                    <div className="wizard-tur-alt">Bakiye düzeltme kaydı</div>
                  </button>
                )}
              </div>
            </div>
          )}

          {adim === 2 && (
            <div className="wizard-icerik">
              {tur === "kk_odeme" ? (
                <>
                  {!kartId ? (
                    <>
                      <p className="wizard-soru">Hangi kartın borcunu ödeyeceksiniz?</p>
                      <div className="wizard-secenekler-konteynir">
                        {data.krediKartlari.filter(k => !k.pasif).map(k => (
                          <button key={k.id} className="wizard-secenek" onClick={() => setKartId(k.id)}>
                            <span className="ws-ikon">💳</span>
                            <span className="ws-adi">{k.ad}</span>
                            <span className="ws-bakiye">{fmt(hesaplaKartBorc(k.id, data.islemler, k.bakiyeDuzeltme || 0, today()))} ₺ Borç</span>
                          </button>
                        ))}
                      </div>
                    </>
                  ) : (
                    <>
                      <p className="wizard-soru">Ödeme hangi hesaptan yapılacak?</p>
                      <div className="wizard-secenekler-konteynir">
                        {harcamaHesaplari(data).filter(h => h.hesapTur !== "krediKarti").map(h => (
                          <button key={h.id} className={`wizard-secenek ${hesapId === h.id ? "secili" : ""}`}
                            onClick={() => { setHesapId(h.id); setAdim(3); }}>
                            <span className="ws-ikon">{h.ikon}</span>
                            <span className="ws-adi">{h.ad}</span>
                            <span className="ws-bakiye">{fmt(h.bakiye)} ₺</span>
                          </button>
                        ))}
                      </div>
                      <button className="btn btn-ghost" style={{ marginTop: 10 }} onClick={() => setKartId("")}>← Kart Seçimine Dön</button>
                    </>
                  )}
                </>
              ) : tur === "kredi_odeme" ? (
                <>
                  {!krediId ? (
                    <>
                      <p className="wizard-soru">Hangi kredinin ödemesini yapacaksınız?</p>
                      <div className="wizard-secenekler-konteynir">
                        {data.krediler.filter(k => !k.pasif && (k.kalanBorc || 0) > 0).map(k => (
                          <button key={k.id} className="wizard-secenek" onClick={() => setKrediId(k.id)}>
                            <span className="ws-ikon">🏦</span>
                            <span className="ws-adi">{k.ad}</span>
                            <span className="ws-bakiye">{fmt(k.kalanBorc)} ₺ Kalan</span>
                          </button>
                        ))}
                      </div>
                    </>
                  ) : (
                    <>
                      <p className="wizard-soru">Ödeme hangi hesaptan yapılacak?</p>
                      <div className="wizard-secenekler-konteynir">
                        {harcamaHesaplari(data).filter(h => h.hesapTur !== "krediKarti").map(h => (
                          <button key={h.id} className={`wizard-secenek ${hesapId === h.id ? "secili" : ""}`}
                            onClick={() => { setHesapId(h.id); setAdim(3); }}>
                            <span className="ws-ikon">{h.ikon}</span>
                            <span className="ws-adi">{h.ad}</span>
                            <span className="ws-bakiye">{fmt(h.bakiye)} ₺</span>
                          </button>
                        ))}
                      </div>
                      <button className="btn btn-ghost" style={{ marginTop: 10 }} onClick={() => setKrediId("")}>← Kredi Seçimine Dön</button>
                    </>
                  )}
                </>
              ) : tur === "mutabakat" ? (
                <>
                  <p className="wizard-soru">Düzeltme yönünü seçin</p>
                  <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
                    <button className={`btn ${mtYon === "giris" ? "btn-yesil" : "btn-ghost"}`} style={{ flex: 1 }}
                      onClick={() => setMtYon("giris")}>↑ Giriş — Artı Etki</button>
                    <button className={`btn ${mtYon === "cikis" ? "btn-kirmizi" : "btn-ghost"}`} style={{ flex: 1 }}
                      onClick={() => setMtYon("cikis")}>↓ Çıkış — Eksi Etki</button>
                  </div>
                  <p className="wizard-soru">Muhatap hesap / kart</p>
                  <div className="wizard-secenekler-konteynir" style={{ display: "grid", gap: 10 }}>
                    {[
                      { grup: "mt_nakit", ikon: "💵", baslik: "Nakit Hesaplar", liste: data.nakitHesaplar.filter(h => !h.pasif), hTur: "nakit", bakiyeFn: h => `${fmt(h.bakiye || 0)} ₺` },
                      { grup: "mt_banka", ikon: "🏦", baslik: "Banka Hesapları", liste: data.bankaHesaplar.filter(h => !h.pasif), hTur: "banka", bakiyeFn: h => `${fmt(h.bakiye || 0)} ₺` },
                      { grup: "mt_kk", ikon: "💳", baslik: "Kredi Kartları", liste: data.krediKartlari.filter(h => !h.pasif), hTur: "krediKarti", bakiyeFn: h => `${fmt(hesaplaKartBorc(h.id, data.islemler, h.bakiyeDuzeltme || 0, today()))} ₺ Borç` },
                      { grup: "mt_kredi", ikon: "📋", baslik: "Krediler", liste: data.krediler.filter(k => !k.pasif), hTur: "kredi", bakiyeFn: h => `${fmt(h.kalanBorc || 0)} ₺ Kalan` },
                    ].map(({ grup, ikon, baslik, liste, hTur, bakiyeFn }) => liste.length > 0 && (
                      <div key={grup} className={`wizard-accordion ${acikGrup === grup ? "acik" : ""}`}>
                        <button className="wizard-accordion-baslik" onClick={() => setAcikGrup(acikGrup === grup ? "" : grup)}>
                          <span>{ikon} {baslik}</span><span className="wa-ok">▼</span>
                        </button>
                        {acikGrup === grup && (
                          <div className="wizard-accordion-icerik">
                            {liste.map(h => (
                              <button key={h.id} className={`wizard-secenek ${mtHedefKey === `${hTur}:${h.id}` ? "secili" : ""}`}
                                onClick={() => { setMtHedefKey(`${hTur}:${h.id}`); setAdim(3); }}>
                                <span className="ws-ikon">{ikon}</span>
                                <span className="ws-adi">{h.ad}</span>
                                <span className="ws-bakiye">{bakiyeFn(h)}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  <p className="wizard-soru">Hangi hesaptan {tur === "gider" ? "çıkış" : "giriş"} olacak?</p>
                  <div className="wizard-secenekler-konteynir" style={{ display: "grid", gap: 10 }}>
                    {/* ... diğer hesap seçimleri ... */}
                    <div className={`wizard-accordion ${acikGrup === "nakit" ? "acik" : ""}`}>
                      <button className="wizard-accordion-baslik" onClick={() => setAcikGrup(acikGrup === "nakit" ? "" : "nakit")}>
                        <span>💵 Nakit Hesaplar</span>
                        <span className="wa-ok">▼</span>
                      </button>
                      {acikGrup === "nakit" && (
                        <div className="wizard-accordion-icerik">
                          {data.nakitHesaplar.filter(h => !h.pasif).map(h => (
                            <button key={h.id} className={`wizard-secenek ${hesapId === h.id ? "secili" : ""}`}
                              onClick={() => { setHesapId(h.id); setAdim(3); }}>
                              <span className="ws-ikon">{h.ikon}</span>
                              <span className="ws-adi">{h.ad}</span>
                              <span className="ws-bakiye">{fmt(h.bakiye)} ₺</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className={`wizard-accordion ${acikGrup === "banka" ? "acik" : ""}`}>
                      <button className="wizard-accordion-baslik" onClick={() => setAcikGrup(acikGrup === "banka" ? "" : "banka")}>
                        <span>🏦 Banka Hesapları</span>
                        <span className="wa-ok">▼</span>
                      </button>
                      {acikGrup === "banka" && (
                        <div className="wizard-accordion-icerik">
                          {data.bankaHesaplar.filter(h => !h.pasif).map(h => (
                            <button key={h.id} className={`wizard-secenek ${hesapId === h.id ? "secili" : ""}`}
                              onClick={() => { setHesapId(h.id); setAdim(3); }}>
                              <span className="ws-ikon">{h.ikon}</span>
                              <span className="ws-adi">{h.ad}</span>
                              <span className="ws-bakiye">{fmt(h.bakiye)} ₺</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    {tur === "gider" && (
                      <div className={`wizard-accordion ${acikGrup === "kredi" ? "acik" : ""}`}>
                        <button className="wizard-accordion-baslik" onClick={() => setAcikGrup(acikGrup === "kredi" ? "" : "kredi")}>
                          <span>💳 Kredi Kartları</span>
                          <span className="wa-ok">▼</span>
                        </button>
                        {acikGrup === "kredi" && (
                          <div className="wizard-accordion-icerik">
                            {data.krediKartlari.filter(h => !h.pasif).map(h => (
                              <button key={h.id} className={`wizard-secenek ${hesapId === h.id ? "secili" : ""}`}
                                onClick={() => { setHesapId(h.id); setAdim(3); }}>
                                <span className="ws-ikon">{h.ikon}</span>
                                <span className="ws-adi">{h.ad}</span>
                                <span className="ws-bakiye">{fmt(h.limit - hesaplaKartBorc(h.id, data.islemler, h.bakiyeDuzeltme || 0, today()))} ₺ boş</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </>
              )}
              <div className="wizard-footer" style={{ marginTop: 20 }}>
                <button className="btn btn-ghost" onClick={() => { setAdim(1); setKartId(""); }}>Geri</button>
              </div>
            </div>
          )}

          {adim === 3 && (
            <div className="wizard-icerik form-wizard">
              <div className="form-grup">
                <label>Tarih ve Tutar</label>
                <div style={{ display: "flex", gap: 8, position: "relative" }}>
                  <input type="date" className="input" style={{ width: 140 }} value={tarih} onChange={e => setTarih(e.target.value)} />
                  <div style={{ display: "flex", flex: 1, position: "relative" }}>
                    <input
                      type="text"
                      className="input"
                      style={{ flex: 1, paddingRight: 40, textAlign: "right", fontFamily: "var(--font-baslik)", fontSize: 18, fontWeight: "bold", color: "var(--altin)" }}
                      placeholder="0,00"
                      value={calcAcik ? miktar : (document.activeElement === miktarInputRef.current ? String(miktar).replace(/\./g, ",") : formatliMiktar(miktar))}
                      onChange={miktarDegisti}
                      onFocus={() => {
                        // Focus olduğunda düz sayıyı göster
                        if (miktarInputRef.current && !calcAcik) {
                          miktarInputRef.current.value = String(miktar).replace(/\./g, ",");
                        }
                      }}
                      onBlur={() => {
                        // Blur olduğunda formatlı göster
                        if (miktar) {
                          let num = parseFloat(String(miktar).replace(/,/g, "."));
                          if (!isNaN(num)) {
                            setMiktar(num.toString());
                          }
                        }
                      }}
                      ref={miktarInputRef}
                      autoFocus
                    />
                    <button
                      type="button"
                      className="btn-duz"
                      style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)" }}
                      onClick={() => setCalcAcik(!calcAcik)}
                      title="Hesap Makinesi"
                    >
                      🖩
                    </button>
                    {calcAcik && (
                      <Calculator
                        onResult={(sonuc) => {
                          setMiktar(sonuc);
                          setCalcAcik(false);
                        }}
                        onKapat={() => setCalcAcik(false)}
                      />
                    )}
                  </div>
                </div>
              </div>

              {tur === "mutabakat" && (
                <div className="form-grup">
                  <label>Muhatap Hesap</label>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", background: "rgba(201,168,76,0.08)", border: "1px solid var(--altin)", borderRadius: 6 }}>
                    <span style={{ fontSize: "0.9rem", fontWeight: 600 }}>{mtHedefAd}</span>
                    <span style={{ fontSize: "0.75rem", color: "var(--metin2)", marginLeft: "auto" }}>{mtYon === "giris" ? "↑ Giriş" : "↓ Çıkış"}</span>
                    <button className="btn btn-kucuk btn-ghost" onClick={() => setAdim(2)}>Değiştir</button>
                  </div>
                </div>
              )}

              {tur === "kk_odeme" && (                <div className="form-grup">
                  <label>Ödenecek Kart</label>
                  <select className="input" value={kartId} onChange={e => setKartId(e.target.value)}>
                    <option value="">— Kart Seçiniz —</option>
                    {data.krediKartlari.filter(k => !k.pasif).map(k => (
                      <option key={k.id} value={k.id}>💳 {k.ad}</option>
                    ))}
                  </select>
                </div>
              )}

              {tur === "kredi_odeme" && (
                <div className="form-grup">
                  <label>Ödeme Türü</label>
                  <select className="input" value={krediOdemeTuru} onChange={e => setKrediOdemeTuru(e.target.value)}>
                    <option value="taksit">Kredi Taksit Öde</option>
                    <option value="kapat">Krediyi Kapat</option>
                  </select>
                  <small style={{ color: "var(--metin2)", marginTop: 4, display: "block" }}>
                    {krediOdemeTuru === "kapat" ? "Bu işlem sonrasında kredi otomatik olarak pasife alınacaktır." : "Bu işlem sonrasında kredinin vade sayısı 1 eksilecektir."}
                  </small>
                </div>
              )}

              {tur === "gider" && isKrediKarti && !eskiIslem && (
                <div className="form-grup">
                  <label>Taksit Sayısı</label>
                  <select className="input" value={taksitSayisi} onChange={e => setTaksitSayisi(parseInt(e.target.value))}>
                    {[1, 2, 3, 4, 5, 6, 9, 12].map(n => (
                      <option key={n} value={n}>{n === 1 ? "Tek Çekim" : `${n} Taksit`}</option>
                    ))}
                  </select>
                </div>
              )}

              {tur !== "kk_odeme" && tur !== "kredi_odeme" && tur !== "mutabakat" && (
                <div className="form-grup">
                  <label>Kategori</label>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {/* Ana Kategori */}
                    {yeniAnaKatModu ? (
                      <div style={{ display: "flex", gap: 8 }}>
                        <input className="input" style={{ flex: 1 }} value={yeniKatAdi}
                          onChange={e => setYeniKatAdi(e.target.value)} placeholder="Yeni ana kategori adı..." autoFocus />
                        <button className="btn btn-yesil" onClick={() => yeniKategoriEkle(null)}>Ekle</button>
                        <button className="btn btn-ghost" onClick={() => setYeniAnaKatModu(false)}>✖</button>
                      </div>
                    ) : (
                      <select className="input" value={anaKatId} onChange={e => {
                        if (e.target.value === "YENI") {
                          setYeniAnaKatModu(true);
                          setYeniKatAdi("");
                        } else {
                          setAnaKatId(e.target.value);
                          setAltKatId("");
                        }
                      }}>
                        <option value="">— Ana Kategori —</option>
                        {data.kategoriler
                          .filter(k => k.tur === tur && !k.ustId && !k.pasif)
                          .sort((a, b) => a.ad.localeCompare(b.ad, "tr"))
                          .map(k => (
                            <option key={k.id} value={k.id}>{k.ad}</option>
                          ))}
                        <option value="YENI">+ 🆕 Yeni Ana Kategori Ekle...</option>
                      </select>
                    )}

                    {/* Alt Kategori */}
                    {anaKatId && !yeniAnaKatModu && (
                      yeniAltKatModu ? (
                        <div style={{ display: "flex", gap: 8 }}>
                          <input className="input" style={{ flex: 1 }} value={yeniKatAdi}
                            onChange={e => setYeniKatAdi(e.target.value)} placeholder="Yeni alt kategori adı..." autoFocus />
                          <button className="btn btn-yesil" onClick={() => yeniKategoriEkle(anaKatId)}>Ekle</button>
                          <button className="btn btn-ghost" onClick={() => setYeniAltKatModu(false)}>✖</button>
                        </div>
                      ) : (
                        <select className="input" value={altKatId} onChange={e => {
                          if (e.target.value === "YENI") {
                            setYeniAltKatModu(true);
                            setYeniKatAdi("");
                          } else {
                            setAltKatId(e.target.value);
                          }
                        }}>
                          <option value="">— Alt Kategori —</option>
                          {data.kategoriler
                            .filter(k => k.ustId === anaKatId && !k.pasif)
                            .sort((a, b) => a.ad.localeCompare(b.ad, "tr"))
                            .map(k => (
                              <option key={k.id} value={k.id}>{k.ad}</option>
                            ))}
                          <option value="YENI">+ 🆕 Yeni Alt Kategori Ekle...</option>
                        </select>
                      )
                    )}
                  </div>
                </div>
              )}

              <div className="form-grup" style={{ position: "relative" }}>
                <label>Açıklama</label>
                <input
                  className="input"
                  placeholder="Not ekleyin..."
                  value={aciklama}
                  onChange={e => setAciklama(e.target.value)}
                  onFocus={() => setAciklamaFocus(true)}
                  onBlur={() => setTimeout(() => setAciklamaFocus(false), 150)}
                  ref={aciklamaInputRef}
                  autoComplete="off"
                />
                {filtreliOneriler.length > 0 && (
                  <div style={{
                    position: "absolute", left: 0, right: 0, top: "100%", zIndex: 10,
                    background: "#fff", border: "1px solid #ddd", borderTop: "none", maxHeight: 140, overflowY: "auto", boxShadow: "0 2px 8px rgba(0,0,0,0.08)"
                  }}>
                    {filtreliOneriler.map((k, idx) => (
                      <div
                        key={k}
                        style={{
                          padding: "6px 12px",
                          cursor: "pointer",
                          fontSize: 14,
                          color: "#222", // Yazı rengi koyu
                          background: "#fff"
                        }}
                        onMouseDown={e => { e.preventDefault(); handleOneriSec(k); }}
                        onMouseOver={e => e.currentTarget.style.background = '#c9a84c'}
                        onMouseOut={e => e.currentTarget.style.background = '#fff'}
                        onFocus={e => e.currentTarget.style.background = '#c9a84c'}
                      >
                        {k.charAt(0).toLocaleUpperCase('tr-TR') + k.slice(1)}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="wizard-footer" style={{ marginTop: 20 }}>
                {!eskiIslem && <button className="btn btn-ghost" onClick={() => setAdim(2)}>Geri</button>}
                <button className="btn btn-altin" style={{ flex: 1 }} onClick={kaydet}
                  disabled={tur === "mutabakat" ? (!miktar || !mtHedefKey) : (!miktar || !hesapId)}>
                  {eskiIslem ? "Güncelle" : (isKrediKarti && taksitSayisi > 1 ? "Taksitlendir" : "Kaydet")}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
