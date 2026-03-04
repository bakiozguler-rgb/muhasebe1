import { useState } from "react";
import { uid, fmt, fmtDate, tumHesaplar, hesapBakiyeGuncelle } from "../veri";
import { HesapEkleForm, IslemEkleForm } from "./Modaller";

export default function HesapSayfa({ baslik, hesaplar, hesapTur, data, guncelle, bildir, setModal, setSilinecek }) {
  const [secili, setSecili] = useState(null);
  const [pasifleriGoster, setPasifleriGoster] = useState(false);

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
    // secili state'i de güncelle
    setSecili(prev => prev?.id === id ? { ...prev, ...guncellenenVeri } : prev);
  };

  const islemEkle = (hesapId, islem) => {
    const gercekHesapId = islem.hesapId || hesapId;
    guncelle(d => {
      // 1. Bakiyeyi güncelle
      const hesapListesi = tumHesaplar(d);
      const kaynakHesap = hesapListesi.find(h => h.id === gercekHesapId);
      if (!kaynakHesap) return d;

      let yeniData = hesapBakiyeGuncelle(d, gercekHesapId, kaynakHesap.hesapTur, islem.tur === "giris" ? Number(islem.miktar) : -Number(islem.miktar));

      // 2. İşlem kaydı oluştur
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

  const seciliIslemler = secili ? data.islemler.filter(i => i.hesapId === secili.id) : [];
  const filtrelenmisHesaplar = pasifleriGoster ? hesaplar : hesaplar.filter(h => !h.pasif);

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
          {filtrelenmisHesaplar.length === 0 && <div className="bos-durum">Henüz hesap eklenmedi</div>}
          {filtrelenmisHesaplar.map(h => (
            <div key={h.id} className={`hesap-kart${secili?.id === h.id ? " secili" : ""}${h.pasif ? " pasif" : ""}`} onClick={() => setSecili(h)}>
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
        </div>
        {secili && (
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
      </div>
    </div>
  );
}
