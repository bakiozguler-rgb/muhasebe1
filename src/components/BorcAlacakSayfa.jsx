import { uid, fmt, fmtDate, today, tumHesaplar, hesapBakiyeGuncelle } from "../veri";
import { IslemEkleForm, BorcAlacakEkleForm } from "./Modaller";

// ═══════════════════════════════════════════════════════════════════════════
// BORÇ/ALACAK SAYFASI
// ═══════════════════════════════════════════════════════════════════════════
export function BorcAlacakSayfa({ data, guncelle, bildir, setModal, setSilinecek }) {

  const kayitEkle = (kayit) => {
    guncelle(d => {
      const yeniId = uid();
      const yeniKayit = { ...kayit, id: yeniId };

      const yeniIslem = {
        id: uid(),
        tarih: today(),
        tur: kayit.tur === "alacak" ? "alacak_dogus" : "borc_dogus",
        miktar: kayit.miktar,
        aciklama: `${kayit.kisi} - ${kayit.tur === "alacak" ? "Borç Verildi" : "Borç Alındı"}`,
        kategori: kayit.tur === "alacak" ? "Borç Verme" : "Borç Alma",
        hesapId: kayit.hesapId,
        hesapAdi: kayit.hesapAdi,
        hesapTur: kayit.hesapTur,
        borcAlacakId: yeniId,
      };

      const fark = kayit.miktar;
      const carpan = kayit.tur === "borc" ? 1 : -1;
      let yeniData = hesapBakiyeGuncelle(d, kayit.hesapId, kayit.hesapTur, fark * carpan);

      return {
        ...yeniData,
        borcAlacaklar: [...yeniData.borcAlacaklar, yeniKayit],
        islemler: [yeniIslem, ...yeniData.islemler],
      };
    });
    bildir("Kayıt ve bakiye hareketi eklendi.");
    setModal(null);
  };

  const kayitDuzenle = (id, veri) => {
    guncelle(d => {
      const eskiKayit = d.borcAlacaklar.find(b => b.id === id);
      if (!eskiKayit) return d;

      const dogusIslemi = d.islemler.find(
        i => i.borcAlacakId === id && (i.tur === "alacak_dogus" || i.tur === "borc_dogus")
      );
      let yeniData = { ...d };
      let yeniIslemler = [...d.islemler];

      if (dogusIslemi && dogusIslemi.miktar !== veri.miktar) {
        const fark = veri.miktar - dogusIslemi.miktar;
        const carpan = dogusIslemi.tur === "borc_dogus" ? 1 : -1;
        yeniData = hesapBakiyeGuncelle(yeniData, dogusIslemi.hesapId, dogusIslemi.hesapTur, fark * carpan);
        yeniIslemler = yeniIslemler.map(i =>
          i.id === dogusIslemi.id ? { ...i, miktar: veri.miktar } : i
        );
      }

      return {
        ...yeniData,
        borcAlacaklar: yeniData.borcAlacaklar.map(b => (b.id === id ? { ...b, ...veri } : b)),
        islemler: yeniIslemler,
      };
    });
    bildir("Kayıt güncellendi.");
    setModal(null);
  };

  const odemeEkle = (kayitId, islem, taksitId = null) => {
    const kaynakHesapId = islem.hesapId;
    if (!kaynakHesapId) { bildir("Lütfen hesap seçin.", "hata"); return; }

    guncelle(d => {
      const hesapListesi = tumHesaplar(d);
      const kaynakHesap = hesapListesi.find(h => h.id === kaynakHesapId);
      if (!kaynakHesap) return d;

      const kayit = d.borcAlacaklar.find(b => b.id === kayitId);
      if (!kayit) return d;

      const miktar = Number(islem.miktar) || 0;
      const isAlacak = kayit.tur === "alacak";

      const kayitlar = d.borcAlacaklar.map(b => {
        if (b.id !== kayitId) return b;
        let yeniB = { ...b, miktar: Math.max(0, b.miktar - miktar) };
        if (taksitId && b.taksitler) {
          yeniB.taksitler = b.taksitler.map(t =>
            t.id === taksitId ? { ...t, odendi: true } : t
          );
        }
        return yeniB;
      });

      let yeniData = { ...d, borcAlacaklar: kayitlar };
      const delta = isAlacak ? miktar : -miktar;
      yeniData = hesapBakiyeGuncelle(yeniData, kaynakHesapId, kaynakHesap.hesapTur, delta);

      const yeniIslem = {
        id: uid(),
        tarih: islem.tarih,
        tur: isAlacak ? "gelir" : "gider",
        miktar,
        aciklama: islem.aciklama || (isAlacak ? "Alacak Tahsilatı" : "Borç Ödemesi"),
        kategori: isAlacak ? "Alacak Tahsilatı" : "Borç Ödemesi",
        hesapId: kaynakHesapId,
        hesapAdi: kaynakHesap.ad,
        hesapTur: kaynakHesap.hesapTur,
        borcAlacakId: kayitId,
      };

      return { ...yeniData, islemler: [...yeniData.islemler, yeniIslem] };
    });
    bildir("İşlem kaydedildi.");
    setModal(null);
  };

  const kayitSil = (id) => {
    setSilinecek({
      mesaj: "Bu kaydı ve ilgili tüm işlem geçmişini silmek istediğinizden emin misiniz?",
      onay: () => {
        guncelle(d => {
          const silinecekKayit = d.borcAlacaklar.find(b => b.id === id);
          if (!silinecekKayit) return d;

          let yeniData = { ...d };
          const bagliIslemler = d.islemler.filter(i => i.borcAlacakId === id);

          bagliIslemler.forEach(islem => {
            let delta = 0;
            if (islem.tur === "borc_dogus") delta = -islem.miktar;
            else if (islem.tur === "alacak_dogus") delta = islem.miktar;
            else if (islem.tur === "gelir") delta = -islem.miktar;
            else if (islem.tur === "gider") delta = islem.miktar;
            yeniData = hesapBakiyeGuncelle(yeniData, islem.hesapId, islem.hesapTur, delta);
          });

          return {
            ...yeniData,
            borcAlacaklar: yeniData.borcAlacaklar.filter(b => b.id !== id),
            islemler: yeniData.islemler.filter(i => i.borcAlacakId !== id),
          };
        });
        bildir("Kayıt ve bağlı tüm işlemler silindi.", "uyari");
      },
    });
  };

  const alacaklar = data.borcAlacaklar.filter(b => b.tur === "alacak");
  const borclar = data.borcAlacaklar.filter(b => b.tur === "borc");

  return (
    <div className="sayfa">
      <div className="sayfa-baslik">
        <h1>Borç & Alacak</h1>
        <button
          className="btn btn-altin"
          onClick={() =>
            setModal(
              <BorcAlacakEkleForm
                data={data}
                onKaydet={kayitEkle}
                onIptal={() => setModal(null)}
              />
            )
          }
        >
          + Kayıt Ekle
        </button>
      </div>

      <div className="iki-bolum">
        {/* ALACAKLAR */}
        <div>
          <h2 className="bolum-baslik pozitif">Alacaklarım</h2>
          {alacaklar.length === 0 && <div className="bos-durum">Alacak kaydı yok</div>}
          {alacaklar.map(b => (
            <div key={b.id} className="hesap-kart">
              <div className="hk-ust">
                <div>
                  <div className="hk-ad">{b.kisi}</div>
                  {b.aciklama && <div className="hk-alt">{b.aciklama}</div>}
                  <div className="hk-alt">Vade: {b.vade ? fmtDate(b.vade) : "Belirsiz"}</div>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button
                    className="btn-duz"
                    title="Düzenle"
                    onClick={() =>
                      setModal(
                        <BorcAlacakEkleForm
                          mevcutVeri={{ ...b }}
                          data={data}
                          onKaydet={v => kayitDuzenle(b.id, v)}
                          onIptal={() => setModal(null)}
                        />
                      )
                    }
                  >✎</button>
                  <button className="btn-sil" onClick={() => kayitSil(b.id)}>✕</button>
                </div>
              </div>
              <div className="hk-bakiye pozitif">{fmt(b.miktar)} ₺</div>
              {b.taksitli ? (
                <div style={{ marginTop: 10 }}>
                  <div style={{ fontSize: "0.85rem", fontWeight: "bold", marginBottom: 6 }}>Taksitler</div>
                  {b.taksitler?.map((t, idx) => (
                    <div key={t.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 0", borderBottom: "1px solid var(--border)", opacity: t.odendi ? 0.5 : 1 }}>
                      <span style={{ fontSize: "0.85rem", textDecoration: t.odendi ? "line-through" : "none" }}>
                        {idx + 1}. {t.vade ? fmtDate(t.vade) : ""}
                      </span>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: "0.85rem", fontWeight: "bold" }}>{fmt(t.miktar)} ₺</span>
                        {!t.odendi && (
                          <button className="btn btn-kucuk btn-yesil" onClick={() =>
                            setModal(<IslemEkleForm tur="tahsilat" hesapAdi={b.kisi} data={data} sabitMiktar={t.miktar} onKaydet={i => odemeEkle(b.id, i, t.id)} onIptal={() => setModal(null)} />)
                          }>Öde</button>
                        )}
                        {t.odendi && <span style={{ fontSize: "0.8rem", color: "var(--metin2)" }}>Ödendi</span>}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="hk-aksiyonlar">
                  <button className="btn btn-kucuk btn-yesil" onClick={() =>
                    setModal(<IslemEkleForm tur="tahsilat" hesapAdi={b.kisi} data={data} onKaydet={i => odemeEkle(b.id, i)} onIptal={() => setModal(null)} />)
                  }>Tahsil Et</button>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* BORÇLAR */}
        <div>
          <h2 className="bolum-baslik negatif">Borçlarım</h2>
          {borclar.length === 0 && <div className="bos-durum">Borç kaydı yok</div>}
          {borclar.map(b => (
            <div key={b.id} className="hesap-kart">
              <div className="hk-ust">
                <div>
                  <div className="hk-ad">{b.kisi}</div>
                  {b.aciklama && <div className="hk-alt">{b.aciklama}</div>}
                  <div className="hk-alt">Vade: {b.vade ? fmtDate(b.vade) : "Belirsiz"}</div>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button
                    className="btn-duz"
                    title="Düzenle"
                    onClick={() =>
                      setModal(
                        <BorcAlacakEkleForm
                          mevcutVeri={{ ...b }}
                          data={data}
                          onKaydet={v => kayitDuzenle(b.id, v)}
                          onIptal={() => setModal(null)}
                        />
                      )
                    }
                  >✎</button>
                  <button className="btn-sil" onClick={() => kayitSil(b.id)}>✕</button>
                </div>
              </div>
              <div className="hk-bakiye negatif">{fmt(b.miktar)} ₺</div>
              {b.taksitli ? (
                <div style={{ marginTop: 10 }}>
                  <div style={{ fontSize: "0.85rem", fontWeight: "bold", marginBottom: 6 }}>Taksitler</div>
                  {b.taksitler?.map((t, idx) => (
                    <div key={t.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 0", borderBottom: "1px solid var(--border)", opacity: t.odendi ? 0.5 : 1 }}>
                      <span style={{ fontSize: "0.85rem", textDecoration: t.odendi ? "line-through" : "none" }}>
                        {idx + 1}. {t.vade ? fmtDate(t.vade) : ""}
                      </span>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: "0.85rem", fontWeight: "bold" }}>{fmt(t.miktar)} ₺</span>
                        {!t.odendi && (
                          <button className="btn btn-kucuk btn-kirmizi" onClick={() =>
                            setModal(<IslemEkleForm tur="odeme" hesapAdi={b.kisi} data={data} sabitMiktar={t.miktar} onKaydet={i => odemeEkle(b.id, i, t.id)} onIptal={() => setModal(null)} />)
                          }>Öde</button>
                        )}
                        {t.odendi && <span style={{ fontSize: "0.8rem", color: "var(--metin2)" }}>Ödendi</span>}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="hk-aksiyonlar">
                  <button className="btn btn-kucuk btn-kirmizi" onClick={() =>
                    setModal(<IslemEkleForm tur="odeme" hesapAdi={b.kisi} data={data} onKaydet={i => odemeEkle(b.id, i)} onIptal={() => setModal(null)} />)
                  }>Ödeme Yap</button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
