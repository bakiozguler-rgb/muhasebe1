import { useState } from "react";
import { uid, fmt, fmtDate, today, hesapBakiyeGuncelle } from "../veri";
import { KrediEkleForm, IslemEkleForm } from "./Modaller";

// ═══════════════════════════════════════════════════════════════════════════
// KREDİ İŞLEMLER MODAL
// ═══════════════════════════════════════════════════════════════════════════
export function KrediIslemlerModal({ kredi, data, onKapat }) {
  const islemler = data.islemler
    .filter(i => i.krediId === kredi.id || (i.aciklama && i.aciklama.includes(kredi.ad)))
    .sort((a, b) => new Date(b.tarih) - new Date(a.tarih));

  return (
    <div>
      <h3 className="modal-baslik">{kredi.ad} — Hata Tespit / İşlem Geçmişi</h3>
      <div style={{ maxHeight: "400px", overflowY: "auto", paddingRight: 8 }}>
        {islemler.length === 0 ? (
          <div className="bos-durum">Bu krediye ait işlem bulunamadı.</div>
        ) : (
          <table className="tablo" style={{ fontSize: "0.9rem", width: "100%" }}>
            <thead>
              <tr>
                <th>Tarih</th>
                <th>İşlem Türü</th>
                <th>Açıklama</th>
                <th style={{ textAlign: "right" }}>Tutar</th>
              </tr>
            </thead>
            <tbody>
              {islemler.map(i => (
                <tr key={i.id}>
                  <td>{fmtDate(i.tarih)}</td>
                  <td>{i.tur}</td>
                  <td>{i.aciklama || i.kategori}</td>
                  <td
                    style={{ textAlign: "right" }}
                    className={i.tur === "kredi_odeme" ? "pozitif" : "negatif"}
                  >
                    {fmt(i.miktar)} ₺
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <div className="modal-actions" style={{ marginTop: 16 }}>
        <button className="btn btn-ghost tam" onClick={onKapat}>Kapat</button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// KREDİ SAYFASI
// ═══════════════════════════════════════════════════════════════════════════
export function KrediSayfa({ data, guncelle, bildir, setModal, setSilinecek }) {
  const [pasifleriGoster, setPasifleriGoster] = useState(false);

  const krediEkle = (kredi) => {
    const aylikTaksit =
      kredi.geriOdemeToplami && kredi.vade ? kredi.geriOdemeToplami / kredi.vade : 0;
    const miktar = kredi.tutar;

    guncelle(d => {
      let yeniData = { ...d };

      const yeniKredi = {
        ...kredi,
        id: uid(),
        kalanBorc: kredi.geriOdemeToplami,
        odenenTutar: 0,
        aylikTaksit,
      };
      delete yeniKredi.hedefHesapId;

      if (kredi.hedefHesapId && miktar > 0) {
        const hedefHesap = d.bankaHesaplar.find(h => h.id === kredi.hedefHesapId);
        if (hedefHesap) {
          yeniData = hesapBakiyeGuncelle(yeniData, kredi.hedefHesapId, "banka", miktar);
          const yeniIslem = {
            id: uid(),
            tarih: kredi.baslangic || today(),
            tur: "gelir",
            miktar: miktar,
            aciklama: `${kredi.ad} - Kredi Kullanımı`,
            kategori: "Kredi Kullanımı",
            hesapId: kredi.hedefHesapId,
            hesapAdi: hedefHesap.ad,
            hesapTur: "banka",
            krediId: yeniKredi.id,
          };
          yeniData = { ...yeniData, islemler: [...yeniData.islemler, yeniIslem] };
        }
      }

      return { ...yeniData, krediler: [...yeniData.krediler, yeniKredi] };
    });

    bildir("Kredi eklendi ve tutar hesaba aktarıldı.");
    setModal(null);
  };

  const krediDuzenle = (id, veri) => {
    const aylikTaksit =
      veri.geriOdemeToplami && veri.vade ? veri.geriOdemeToplami / veri.vade : 0;
    guncelle(d => ({
      ...d,
      krediler: d.krediler.map(k =>
        k.id === id
          ? {
              ...k,
              ...veri,
              aylikTaksit,
              kalanBorc: Math.max(
                0,
                (parseFloat(veri.geriOdemeToplami) || 0) - (k.odenenTutar || 0)
              ),
            }
          : k
      ),
    }));
    bildir("Kredi güncellendi.");
    setModal(null);
  };

  const odemeYap = (krediId, islem) => {
    guncelle(d => ({
      ...d,
      islemler: [...d.islemler, { ...islem, id: uid(), tur: "kredi_odeme", krediId }],
    }));
    bildir("Ödeme kaydedildi.");
    setModal(null);
  };

  const krediSil = (id) => {
    setSilinecek({
      mesaj: "Bu krediyi silmek istediğinizden emin misiniz?",
      onay: () => {
        guncelle(d => ({ ...d, krediler: d.krediler.filter(k => k.id !== id) }));
        bildir("Silindi.", "uyari");
      },
    });
  };

  const filtrelenmisKrediler = pasifleriGoster
    ? data.krediler
    : data.krediler.filter(k => !k.pasif);

  return (
    <div className="sayfa">
      <div className="sayfa-baslik">
        <h1>Krediler</h1>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <button className="btn btn-ghost" onClick={() => setPasifleriGoster(!pasifleriGoster)}>
            {pasifleriGoster ? "Gizle (Pasif)" : "Göster (Pasif)"}
          </button>
          <button
            className="btn btn-altin"
            onClick={() =>
              setModal(
                <KrediEkleForm
                  data={data}
                  onKaydet={krediEkle}
                  onIptal={() => setModal(null)}
                />
              )
            }
          >
            + Kredi Ekle
          </button>
        </div>
      </div>

      {filtrelenmisKrediler.length === 0 && (
        <div className="bos-durum">Henüz kredi eklenmedi</div>
      )}

      <div className="kart-grid">
        {filtrelenmisKrediler.map(k => {
          const yuzde = k.geriOdemeToplami
            ? ((k.odenenTutar || 0) / k.geriOdemeToplami) * 100
            : 0;
          return (
            <div key={k.id} className="hesap-kart">
              <div className="hk-ust">
                <div
                  onClick={() =>
                    setModal(
                      <KrediIslemlerModal
                        kredi={k}
                        data={data}
                        onKapat={() => setModal(null)}
                      />
                    )
                  }
                  style={{ cursor: "pointer", flex: 1 }}
                >
                  <div className="hk-ad">
                    {k.ad}{" "}
                    {k.pasif && (
                      <span style={{ color: "var(--metin2)", fontSize: "0.8rem", fontWeight: "normal" }}>
                        (Pasif)
                      </span>
                    )}
                  </div>
                  <div
                    className="hk-alt"
                    style={{ color: "var(--veri-renk)", textDecoration: "underline" }}
                  >
                    🏦 {k.banka} - (Geçmişi Gör)
                  </div>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button
                    className="btn-duz"
                    title="Düzenle"
                    onClick={() =>
                      setModal(
                        <KrediEkleForm
                          data={data}
                          mevcutVeri={{ ...k }}
                          onKaydet={v => krediDuzenle(k.id, v)}
                          onIptal={() => setModal(null)}
                        />
                      )
                    }
                  >
                    ✎
                  </button>
                  <button className="btn-sil" onClick={() => krediSil(k.id)}>✕</button>
                </div>
              </div>
              <div className="kk-satir">
                <span className="kk-label">Kalan Borç</span>
                <span className="negatif">{fmt(k.kalanBorc || 0)} ₺</span>
              </div>
              <div className="kk-satir">
                <span className="kk-label">Geri Ödeme Toplamı</span>
                <span>{fmt(k.geriOdemeToplami || k.tutar || 0)} ₺</span>
              </div>
              <div className="kk-satir">
                <span className="kk-label">Kredi Tutarı (Net)</span>
                <span style={{ color: "var(--metin2)" }}>{fmt(k.tutar || 0)} ₺</span>
              </div>
              <div className="kk-satir">
                <span className="kk-label">Aylık Taksit</span>
                <span className="altin">{fmt(k.aylikTaksit || 0)} ₺</span>
              </div>
              <div className="progress-bar">
                <div
                  className="progress-dolu"
                  style={{ width: `${Math.min(yuzde, 100)}%`, background: "#4ade80" }}
                />
              </div>
              <div className="kk-satir kucuk-yazi">
                <span>Ödenen: %{yuzde.toFixed(0)}</span>
                <span>Vade: {k.vade} ay</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
