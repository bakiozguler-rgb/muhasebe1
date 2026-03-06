import { useState } from "react";
import { uid, fmt, fmtDate, today, tumHesaplar, hesapBakiyeGuncelle } from "../veri";
import { HesapEkleForm, IslemEkleForm } from "./Modaller";

export default function HesapSayfa({
  baslik, hesaplar, hesapTur, data, guncelle, bildir, setModal, setSilinecek,
  mutabakatIslemleri = [], mutabakatEkle, mutabakatSil,
}) {
  const [secili, setSecili] = useState(null);
  const [pasifleriGoster, setPasifleriGoster] = useState(false);
  const [mutabakatSecili, setMutabakatSecili] = useState(false);

  // Mutabakat form state
  const [mtFormAcik, setMtFormAcik] = useState(false);
  const [mtYon, setMtYon] = useState("giris");
  const [mtHedefKey, setMtHedefKey] = useState("");
  const [mtMiktar, setMtMiktar] = useState("");
  const [mtTarih, setMtTarih] = useState(today());
  const [mtAciklama, setMtAciklama] = useState("");

  const hesapEkle = (hesap) => {
    guncelle(d => {
      const alan = hesapTur === "nakit" ? "nakitHesaplar" : "bankaHesaplar";
      return { ...d, [alan]: [...d[alan], { ...hesap, id: uid() }] };
    });
    bildir(`${hesap.ad} hesabı oluşturuldu.`);
    setModal(null);
  };

  const hesapDuzenle = (id, guncellenenVeri) => {
    guncelle(d => {
      const alan = hesapTur === "nakit" ? "nakitHesaplar" : "bankaHesaplar";
      return { ...d, [alan]: d[alan].map(h => h.id === id ? { ...h, ...guncellenenVeri } : h) };
    });
    bildir("Hesap güncellendi.");
    setModal(null);
    setSecili(prev => prev?.id === id ? { ...prev, ...guncellenenVeri } : prev);
  };

  const islemEkle = (hesapId, islem) => {
    const gercekHesapId = islem.hesapId || hesapId;
    guncelle(d => {
      const hesapListesi = tumHesaplar(d);
      const kaynakHesap = hesapListesi.find(h => h.id === gercekHesapId);
      if (!kaynakHesap) return d;
      let yeniData = hesapBakiyeGuncelle(d, gercekHesapId, kaynakHesap.hesapTur, islem.tur === "giris" ? Number(islem.miktar) : -Number(islem.miktar));
      const yeniIslem = {
        id: uid(), tarih: islem.tarih, tur: islem.tur === "giris" ? "gelir" : "gider",
        miktar: Number(islem.miktar), aciklama: islem.aciklama, kategori: islem.kategori,
        hesapId: gercekHesapId, hesapAdi: kaynakHesap.ad, hesapTur: kaynakHesap.hesapTur,
      };
      return { ...yeniData, islemler: [...yeniData.islemler, yeniIslem] };
    });
    bildir("İşlem kaydedildi.");
  };

  const hesapSil = (id) => {
    setSilinecek({
      mesaj: "Bu hesabı ve tüm işlemlerini silmek istediğinizden emin misiniz?",
      onay: () => {
        guncelle(d => {
          const alan = hesapTur === "nakit" ? "nakitHesaplar" : "bankaHesaplar";
          return { ...d, [alan]: d[alan].filter(h => h.id !== id) };
        });
        bildir("Hesap silindi.", "uyari");
        if (secili?.id === id) setSecili(null);
      },
    });
  };

  // Mutabakat kaydet
  const mutabakatKaydet = () => {
    if (!mtHedefKey) return bildir("Hedef hesap seçin.", "uyari");
    const miktar = parseFloat(mtMiktar.replace(",", "."));
    if (!miktar || miktar <= 0) return bildir("Geçerli bir miktar girin.", "uyari");
    const [hedefTur, hedefId] = mtHedefKey.split(":");
    const tm = [
      ...data.nakitHesaplar, ...data.bankaHesaplar,
      ...data.krediKartlari, ...data.krediler,
    ];
    const hedef = tm.find(h => h.id === hedefId);
    mutabakatEkle({
      yon: mtYon, hedefId, hedefTur, hedefAd: hedef?.ad || "?",
      miktar, tarih: mtTarih, aciklama: mtAciklama,
    });
    setMtMiktar(""); setMtAciklama(""); setMtFormAcik(false);
  };

  const seciliIslemler = secili ? data.islemler.filter(i => i.hesapId === secili.id) : [];
  const filtrelenmisHesaplar = pasifleriGoster ? hesaplar : hesaplar.filter(h => !h.pasif);

  // Mutabakat bakiye (toplam etki)
  const mutabakatBakiye = mutabakatIslemleri.reduce(
    (s, i) => s + (i.yon === "giris" ? Number(i.miktar) : -Number(i.miktar)), 0
  );

  // Hedef hesap seçenekleri
  const tumHedefler = [
    ...data.nakitHesaplar.filter(h => !h.pasif).map(h => ({ key: `nakit:${h.id}`, ad: `${h.ad} (Nakit)` })),
    ...data.bankaHesaplar.filter(h => !h.pasif).map(h => ({ key: `banka:${h.id}`, ad: `${h.ad} (Banka)` })),
    ...data.krediKartlari.filter(k => !k.pasif).map(k => ({ key: `krediKarti:${k.id}`, ad: `${k.ad} (Kredi Kartı)` })),
    ...data.krediler.filter(k => !k.pasif).map(k => ({ key: `kredi:${k.id}`, ad: `${k.ad} (Kredi)` })),
  ];

  return (
    <div className="sayfa">
      <div className="sayfa-baslik">
        <h1>{baslik}</h1>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <button className="btn btn-ghost" onClick={() => setPasifleriGoster(!pasifleriGoster)}>
            {pasifleriGoster ? "Gizle (Pasif)" : "Göster (Pasif)"}
          </button>
          <button className="btn btn-altin"
            onClick={() => setModal(
              <HesapEkleForm baslik={baslik} hesapTur={hesapTur}
                onKaydet={hesapEkle} onIptal={() => setModal(null)} />
            )}>
            + Hesap Ekle
          </button>
        </div>
      </div>
      <div className="iki-sutun">
        <div className="sol-sutun">
          {filtrelenmisHesaplar.length === 0 && (
            <div className="bos-durum">Henüz hesap eklenmedi</div>
          )}
          {filtrelenmisHesaplar.map(h => (
            <div key={h.id} className={`hesap-kart${secili?.id === h.id ? " secili" : ""}${h.pasif ? " pasif" : ""}`}
              onClick={() => { setSecili(h); setMutabakatSecili(false); }}>
              <div className="hk-ust">
                <div>
                  <div className="hk-ad">{h.ad}</div>
                  {h.banka && <div className="hk-alt">🏦 {h.banka}</div>}
                  {h.iban && <div className="hk-iban">{h.iban}</div>}
                  <div className="hk-alt">{h.para || "TRY"}</div>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button className="btn-duz" title="Düzenle"
                    onClick={e => {
                      e.stopPropagation();
                      setModal(
                        <HesapEkleForm baslik={baslik} hesapTur={hesapTur}
                          mevcutVeri={{ ...h }}
                          onKaydet={v => hesapDuzenle(h.id, v)}
                          onIptal={() => setModal(null)} />
                      );
                    }}>✎</button>
                  <button className="btn-sil" onClick={e => { e.stopPropagation(); hesapSil(h.id); }}>✕</button>
                </div>
              </div>
              <div className={`hk-bakiye ${(h.bakiye || 0) >= 0 ? "pozitif" : "negatif"}`}>{fmt(h.bakiye || 0)} ₺</div>
              <div className="hk-aksiyonlar">
                <button className="btn btn-kucuk btn-yesil"
                  onClick={e => { e.stopPropagation(); setModal(<IslemEkleForm tur="giris" hesapAdi={h.ad} data={data} onKaydet={i => islemEkle(h.id, i)} onIptal={() => setModal(null)} />); }}>
                  + Giriş
                </button>
                <button className="btn btn-kucuk btn-kirmizi"
                  onClick={e => { e.stopPropagation(); setModal(<IslemEkleForm tur="cikis" hesapAdi={h.ad} data={data} onKaydet={i => islemEkle(h.id, i)} onIptal={() => setModal(null)} />); }}>
                  − Çıkış
                </button>
              </div>
            </div>
          ))}

          {/* MUTABAKAT KARTI — yalnızca Nakit Hesaplar sayfasında */}
          {hesapTur === "nakit" && (
            <div
              className={`hesap-kart${mutabakatSecili ? " secili" : ""}`}
              style={{ borderColor: "rgba(201,168,76,0.5)", cursor: "pointer", marginTop: 8 }}
              onClick={() => { setMutabakatSecili(true); setSecili(null); }}
            >
              <div className="hk-ust">
                <div>
                  <div className="hk-ad" style={{ color: "var(--altin)" }}>⚖ Mutabakat</div>
                  <div className="hk-alt" style={{ fontSize: "0.7rem" }}>Toplamlara dahil değil</div>
                </div>
                <div style={{ fontSize: "0.75rem", color: "var(--metin2)" }}>
                  {mutabakatIslemleri.length} kayıt
                </div>
              </div>
              <div className={`hk-bakiye ${mutabakatBakiye >= 0 ? "pozitif" : "negatif"}`}>
                {mutabakatBakiye >= 0 ? "+" : ""}{fmt(mutabakatBakiye)} ₺
              </div>
              <div style={{ fontSize: "0.72rem", color: "var(--metin2)", paddingTop: 2 }}>
                Kümülatif düzeltme tutarı
              </div>
            </div>
          )}
        </div>

        {/* SAĞ SÜTUN: Normal hesap geçmişi */}
        {secili && !mutabakatSecili && (
          <div className="sag-sutun">
            <div className="panel">
              <div className="panel-baslik">{secili.ad} — İşlem Geçmişi</div>
              {seciliIslemler.length === 0 ? <div className="bos-durum">İşlem yok</div> : (
                <table className="tablo">
                  <thead><tr><th>Tarih</th><th>Açıklama</th><th>Kategori</th><th style={{ textAlign: "right" }}>Tutar</th></tr></thead>
                  <tbody>
                    {[...seciliIslemler].reverse().map(i => (
                      <tr key={i.id}>
                        <td>{fmtDate(i.tarih)}</td><td>{i.aciklama}</td>
                        <td><span className="badge">{i.kategori || "—"}</span></td>
                        <td style={{ textAlign: "right" }}
                          className={i.tur === "gelir" || i.tur === "transfer-giris" ? "pozitif" : "negatif"}>
                          {i.tur === "gelir" || i.tur === "transfer-giris" ? "+" : "-"}{fmt(i.miktar)} ₺
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* SAĞ SÜTUN: Mutabakat detay paneli */}
        {mutabakatSecili && (
          <div className="sag-sutun">
            <div className="panel">
              <div className="panel-baslik" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span>⚖ Mutabakat — Düzeltme Kayıtları</span>
                <button
                  className={`btn btn-kucuk ${mtFormAcik ? "btn-ghost" : "btn-altin"}`}
                  onClick={() => setMtFormAcik(p => !p)}
                >
                  {mtFormAcik ? "İptal" : "+ Yeni Kayıt"}
                </button>
              </div>

              {/* Özet */}
              <div style={{ display: "flex", gap: 12, padding: "10px 0", borderBottom: "1px solid var(--kenar)", flexWrap: "wrap" }}>
                {[
                  { label: "Toplam Giriş", val: mutabakatIslemleri.filter(i => i.yon === "giris").reduce((s, i) => s + Number(i.miktar), 0), cls: "pozitif" },
                  { label: "Toplam Çıkış", val: mutabakatIslemleri.filter(i => i.yon === "cikis").reduce((s, i) => s + Number(i.miktar), 0), cls: "negatif" },
                  { label: "Net Düzeltme", val: mutabakatBakiye, cls: mutabakatBakiye >= 0 ? "pozitif" : "negatif" },
                ].map(({ label, val, cls }) => (
                  <div key={label} style={{ flex: 1, minWidth: 100, background: "rgba(255,255,255,0.03)", borderRadius: 6, padding: "6px 10px" }}>
                    <div style={{ fontSize: "0.7rem", color: "var(--metin2)" }}>{label}</div>
                    <div className={cls} style={{ fontWeight: 700, fontSize: "0.95rem" }}>
                      {val >= 0 ? "+" : ""}{fmt(val)} ₺
                    </div>
                  </div>
                ))}
              </div>

              {/* Yeni kayıt formu */}
              {mtFormAcik && (
                <div style={{ padding: "12px 0", borderBottom: "1px solid var(--kenar)", display: "flex", flexDirection: "column", gap: 8 }}>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      className={`btn btn-kucuk ${mtYon === "giris" ? "btn-yesil" : "btn-ghost"}`}
                      style={{ flex: 1 }}
                      onClick={() => setMtYon("giris")}
                    >
                      ↑ Giriş (Artı Etki)
                    </button>
                    <button
                      className={`btn btn-kucuk ${mtYon === "cikis" ? "btn-kirmizi" : "btn-ghost"}`}
                      style={{ flex: 1 }}
                      onClick={() => setMtYon("cikis")}
                    >
                      ↓ Çıkış (Eksi Etki)
                    </button>
                  </div>
                  <select
                    className="input"
                    value={mtHedefKey}
                    onChange={e => setMtHedefKey(e.target.value)}
                  >
                    <option value="">— Muhatap Hesap / Kart —</option>
                    {tumHedefler.map(h => (
                      <option key={h.key} value={h.key}>{h.ad}</option>
                    ))}
                  </select>
                  <div style={{ display: "flex", gap: 8 }}>
                    <input
                      type="number"
                      className="input"
                      placeholder="Miktar"
                      value={mtMiktar}
                      onChange={e => setMtMiktar(e.target.value)}
                      style={{ flex: 1 }}
                    />
                    <input
                      type="date"
                      className="input"
                      value={mtTarih}
                      onChange={e => setMtTarih(e.target.value)}
                      style={{ flex: 1 }}
                    />
                  </div>
                  <input
                    type="text"
                    className="input"
                    placeholder="Açıklama (isteğe bağlı)"
                    value={mtAciklama}
                    onChange={e => setMtAciklama(e.target.value)}
                  />
                  <button className="btn btn-altin" onClick={mutabakatKaydet}>
                    Kaydet
                  </button>
                </div>
              )}

              {/* İşlem listesi */}
              {mutabakatIslemleri.length === 0 ? (
                <div className="bos-durum">Henüz düzeltme kaydı yok</div>
              ) : (
                <table className="tablo" style={{ marginTop: 8 }}>
                  <thead>
                    <tr>
                      <th>Tarih</th>
                      <th>Muhatap Hesap</th>
                      <th>Açıklama</th>
                      <th style={{ textAlign: "right" }}>Tutar</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...mutabakatIslemleri].reverse().map(i => (
                      <tr key={i.id}>
                        <td style={{ whiteSpace: "nowrap" }}>{fmtDate(i.tarih)}</td>
                        <td>
                          <div style={{ fontWeight: 600, fontSize: "0.85rem" }}>{i.hedefAd}</div>
                          <div style={{ fontSize: "0.7rem", color: "var(--metin2)" }}>
                            {i.hedefTur === "nakit" ? "Nakit" : i.hedefTur === "banka" ? "Banka" : i.hedefTur === "krediKarti" ? "Kredi Kartı" : "Kredi"}
                            {" · "}{i.yon === "giris" ? "↑ Giriş" : "↓ Çıkış"}
                          </div>
                        </td>
                        <td style={{ fontSize: "0.85rem", color: "var(--metin2)" }}>{i.aciklama || "—"}</td>
                        <td style={{ textAlign: "right", fontWeight: 700 }}
                          className={i.yon === "giris" ? "pozitif" : "negatif"}>
                          {i.yon === "giris" ? "+" : "−"}{fmt(i.miktar)} ₺
                        </td>
                        <td>
                          <button
                            className="btn-sil"
                            title="Sil"
                            onClick={() => setSilinecek({
                              mesaj: "Bu mutabakat kaydı silinecek ve hedef hesap bakiyesi geri alınacak. Emin misiniz?",
                              onay: () => mutabakatSil(i.id),
                            })}
                          >✕</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
