import { useState } from "react";
import { uid, fmt, fmtDate } from "../veri";
import { KrediKartiEkleForm, IslemEkleForm } from "./Modaller";

export default function KrediKartiSayfa({ data, guncelle, bildir, setModal, setSilinecek }) {
  const [secili, setSecili] = useState(null);
  const [pasifleriGoster, setPasifleriGoster] = useState(false);

  const kartEkle = (kart) => {
    guncelle(d => ({
      ...d,
      krediKartlari: [...d.krediKartlari, {
        ...kart, id: uid(),
        kullanilanLimit: kart.borc || 0,
      }]
    }));
    bildir("Kredi kartı eklendi."); setModal(null);
  };

  const kartDuzenle = (id, veri) => {
    guncelle(d => ({
      ...d,
      krediKartlari: d.krediKartlari.map(k => k.id === id
        ? { ...k, ...veri, kullanilanLimit: veri.borc !== undefined ? veri.borc : k.kullanilanLimit }
        : k
      )
    }));
    bildir("Kart güncellendi."); setModal(null);
    setSecili(prev => prev?.id === id ? { ...prev, ...veri } : prev);
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
            const suan = new Date();
            const y = suan.getFullYear();
            const m = String(suan.getMonth() + 1).padStart(2, "0");
            const d = String(new Date(y, suan.getMonth() + 1, 0).getDate()).padStart(2, "0");
            const aySonuStr = `${y}-${m}-${d}`;

            const gelecekIslemler = data.islemler.filter(i => i.tarih > aySonuStr && (i.hesapId === k.id || i.kartId === k.id));
            let gelecekBorc = 0;
            gelecekIslemler.forEach(i => {
              if (i.tur === "kk_odeme" && i.kartId === k.id) {
                gelecekBorc -= Number(i.miktar) || 0;
              } else if (i.hesapId === k.id) {
                gelecekBorc += Number(i.miktar) || 0;
              }
            });
            const guncelBorc = (k.kullanilanLimit || 0) - gelecekBorc;

            const kullanim = k.limit ? ((k.kullanilanLimit || 0) / k.limit) * 100 : 0;
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
                            mevcutVeri={{ ...k, borc: k.kullanilanLimit || 0 }}
                            onKaydet={v => kartDuzenle(k.id, v)}
                            onIptal={() => setModal(null)} />
                        );
                      }}>✎</button>
                    <button className="btn-sil" onClick={e => { e.stopPropagation(); kartSil(k.id); }}>✕</button>
                  </div>
                </div>

                {/* Bilgi satırları */}
                <div className="kk-satir">
                  <span className="kk-label">Güncel Borç <small style={{ fontWeight: "normal", color: "var(--metin2)", fontSize: "0.75rem", marginLeft: 4 }}>(Bu Ay ve Öncesi)</small></span>
                  <span className="negatif" style={{ fontWeight: "bold", fontSize: "1.1rem" }}>{fmt(guncelBorc)} ₺</span>
                </div>
                <div className="kk-satir">
                  <span className="kk-label">Toplam Borç <small style={{ fontWeight: "normal", color: "var(--metin2)", fontSize: "0.75rem", marginLeft: 4 }}>(Tüm Taksitler Dahil)</small></span>
                  <span className="negatif">{fmt(k.kullanilanLimit || 0)} ₺</span>
                </div>
                <div className="kk-satir"><span className="kk-label">Kart Limiti</span><span>{fmt(k.limit || 0)} ₺</span></div>

                <div className="progress-bar">
                  <div className="progress-dolu" style={{
                    width: `${Math.min(kullanim, 100)}%`,
                    background: kullanim > 80 ? "#f87171" : kullanim > 50 ? "#fbbf24" : "#4ade80"
                  }} />
                </div>
                <div className="kk-satir kucuk-yazi"><span>Kullanım: %{kullanim.toFixed(0)}</span><span>{fmt((k.limit || 0) - (k.kullanilanLimit || 0))} ₺ kullanılabilir limit</span></div>

                {/* Ek bilgiler */}
                <div style={{ borderTop: "1px solid var(--kenar)", marginTop: 8, paddingTop: 8, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4 }}>
                  {k.hesapKesimTarihi && <div className="kk-satir kucuk-yazi"><span className="kk-label">Kesim</span><span>{k.hesapKesimTarihi}</span></div>}
                  {k.sonOdemeTarihi && <div className="kk-satir kucuk-yazi"><span className="kk-label">Son Ödeme</span><span>{k.sonOdemeTarihi}</span></div>}
                  {k.faizOrani && <div className="kk-satir kucuk-yazi"><span className="kk-label">Faiz</span><span className="negatif">%{k.faizOrani}</span></div>}
                  {asgariOdeme !== null && <div className="kk-satir kucuk-yazi"><span className="kk-label">Asgari Ödeme</span><span className="altin">{fmt(asgariOdeme)} ₺</span></div>}
                </div>


              </div>
            );
          })}
        </div>

        {secili && (
          <div className="sag-sutun">
            <div className="panel">
              <div className="panel-baslik">{secili.ad} — Harcama Geçmişi</div>
              {data.islemler.filter(i => i.hesapId === secili.id).length === 0
                ? <div className="bos-durum">İşlem yok</div>
                : (
                  <table className="tablo">
                    <thead><tr><th>Tarih</th><th>Açıklama</th><th>Kategori</th><th style={{ textAlign: "right" }}>Tutar</th></tr></thead>
                    <tbody>
                      {[...data.islemler.filter(i => i.hesapId === secili.id)].reverse().map(i => (
                        <tr key={i.id}>
                          <td>{fmtDate(i.tarih)}</td><td>{i.aciklama}</td>
                          <td><span className="badge">{i.kategori || "—"}</span></td>
                          <td style={{ textAlign: "right" }} className={i.tur === "gider" ? "negatif" : "pozitif"}>
                            {i.tur === "gider" ? "-" : "+"}{fmt(i.miktar)} ₺
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
