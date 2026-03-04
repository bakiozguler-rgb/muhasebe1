import { useState } from "react";
import { uid, fmt, fmtDate, today, tumHesaplar, hesapBakiyeGuncelle } from "../veri";

// ═══════════════════════════════════════════════════════════════════════════
// TRANSFERLER SAYFASI
// ═══════════════════════════════════════════════════════════════════════════
export function TransferlerSayfa({ data, guncelle, bildir, setSilinecek }) {
  const hesapListesi = tumHesaplar(data);
  const [form, setForm] = useState({
    id: null,
    tarih: today(),
    kaynakId: "",
    hedefId: "",
    miktar: "",
    aciklama: "",
  });
  const [hata, setHata] = useState("");
  const [miktarOdak, setMiktarOdak] = useState(false);

  const formatliMiktar = (deger) => {
    if (!deger) return "";
    const num = parseFloat(deger);
    if (isNaN(num)) return deger;
    return new Intl.NumberFormat("tr-TR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num);
  };

  const miktarTemizle = (val) => {
    let temiz = val.replace(/[^0-9,]/g, "");
    return temiz.replace(/,/g, ".");
  };

  const kaynakHesap = hesapListesi.find(h => h.id === form.kaynakId);
  const hedefHesap = hesapListesi.find(h => h.id === form.hedefId);

  const transferYap = () => {
    setHata("");
    if (!form.kaynakId) { setHata("Kaynak hesap seçiniz."); return; }
    if (!form.hedefId) { setHata("Hedef hesap seçiniz."); return; }
    if (form.kaynakId === form.hedefId) { setHata("Kaynak ve hedef aynı olamaz."); return; }
    if (!form.miktar || parseFloat(form.miktar) <= 0) { setHata("Geçerli bir tutar giriniz."); return; }

    const miktar = parseFloat(form.miktar);
    const kaynak = hesapListesi.find(h => h.id === form.kaynakId);
    const hedef = hesapListesi.find(h => h.id === form.hedefId);

    if (kaynak.hesapTur !== "kredi") {
      let kontrolBakiye = kaynak.bakiye || 0;
      if (form.id) {
        const eski = data.transferler.find(t => t.id === form.id);
        if (eski && eski.kaynakId === form.kaynakId) kontrolBakiye += eski.miktar;
      }
      if (kontrolBakiye < miktar) {
        setHata(`Kaynak hesapta yeterli bakiye yok. Mevcut: ${fmt(kontrolBakiye)} ₺`);
        return;
      }
    }

    guncelle(d => {
      let yeniData = { ...d };

      if (form.id) {
        const eskiTransfer = d.transferler.find(t => t.id === form.id);
        if (eskiTransfer) {
          yeniData = hesapBakiyeGuncelle(yeniData, eskiTransfer.kaynakId, eskiTransfer.kaynakTur, eskiTransfer.miktar);
          yeniData = hesapBakiyeGuncelle(yeniData, eskiTransfer.hedefId, eskiTransfer.hedefTur, -eskiTransfer.miktar);
          yeniData = {
            ...yeniData,
            transferler: yeniData.transferler.filter(t => t.id !== form.id),
            islemler: yeniData.islemler.filter(i => i.transferId !== form.id),
          };
        }
      }

      yeniData = hesapBakiyeGuncelle(yeniData, form.kaynakId, kaynak.hesapTur, -miktar);
      yeniData = hesapBakiyeGuncelle(yeniData, form.hedefId, hedef.hesapTur, miktar);

      const transferId = form.id || uid();
      const transfer = {
        id: transferId,
        tarih: form.tarih,
        kaynakId: form.kaynakId,
        kaynakAdi: kaynak.ad,
        kaynakTur: kaynak.hesapTur,
        hedefId: form.hedefId,
        hedefAdi: hedef.ad,
        hedefTur: hedef.hesapTur,
        miktar,
        aciklama: form.aciklama || `${kaynak.ad} → ${hedef.ad}`,
      };
      const islemCikis = {
        id: uid(), tarih: form.tarih, tur: "transfer-cikis", miktar,
        aciklama: form.aciklama || `Transfer → ${hedef.ad}`, kategori: "Transfer",
        hesapId: form.kaynakId, hesapAdi: kaynak.ad, hesapTur: kaynak.hesapTur,
        transferId: transfer.id,
      };
      const islemGiris = {
        id: uid(), tarih: form.tarih, tur: "transfer-giris", miktar,
        aciklama: form.aciklama || `Transfer ← ${kaynak.ad}`, kategori: "Transfer",
        hesapId: form.hedefId, hesapAdi: hedef.ad, hesapTur: hedef.hesapTur,
        transferId: transfer.id,
      };

      return {
        ...yeniData,
        transferler: [...(yeniData.transferler || []), transfer],
        islemler: [...yeniData.islemler, islemCikis, islemGiris],
      };
    });

    bildir(form.id ? "Transfer güncellendi." : `Transfer tamamlandı: ${fmt(parseFloat(form.miktar))} ₺`);
    setForm({ id: null, tarih: today(), kaynakId: "", hedefId: "", miktar: "", aciklama: "" });
  };

  const transferDuzenle = (t) => {
    setForm({ id: t.id, tarih: t.tarih, kaynakId: t.kaynakId, hedefId: t.hedefId, miktar: t.miktar.toString(), aciklama: t.aciklama });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const transferSil = (transfer) => {
    setSilinecek({
      mesaj: `${transfer.kaynakAdi} → ${transfer.hedefAdi} transferini silmek istiyor musunuz? Bakiyeler geri alınır.`,
      onay: () => {
        guncelle(d => {
          let yeniData = hesapBakiyeGuncelle(d, transfer.kaynakId, transfer.kaynakTur, transfer.miktar);
          yeniData = hesapBakiyeGuncelle(yeniData, transfer.hedefId, transfer.hedefTur, -transfer.miktar);
          return {
            ...yeniData,
            transferler: yeniData.transferler.filter(t => t.id !== transfer.id),
            islemler: yeniData.islemler.filter(i => i.transferId !== transfer.id),
          };
        });
        bildir("Transfer silindi, bakiyeler güncellendi.", "uyari");
      },
    });
  };

  const hedefSecenekler = hesapListesi.filter(h => {
    if (h.id === form.kaynakId) return false;
    if (kaynakHesap?.hesapTur === "kredi" && h.hesapTur === "kredi") return false;
    if (h.hesapTur === "kredi") return false;
    return true;
  });

  const turIkon = (tur) => ({ nakit: "💵", banka: "🏦", kredi: "📋", krediKarti: "💳" }[tur] || "");

  return (
    <div className="sayfa">
      <div className="sayfa-baslik"><h1>Hesaplar Arası Transfer</h1></div>

      <div className="transfer-kart">
        <div className="panel-baslik">{form.id ? "Transferi Düzenle" : "Yeni Transfer"}</div>
        <div className="transfer-form">
          <div className="transfer-blok">
            <label className="transfer-label">Kaynak Hesap</label>
            <select className="input" value={form.kaynakId} onChange={e => setForm({ ...form, kaynakId: e.target.value, hedefId: "" })}>
              <option value="">— Seçiniz —</option>
              <optgroup label="💵 Nakit">{data.nakitHesaplar.filter(h => !h.pasif || h.id === form.kaynakId).map(h => <option key={h.id} value={h.id}>{h.ad} ({fmt(h.bakiye || 0)} ₺)</option>)}</optgroup>
              <optgroup label="🏦 Banka">{data.bankaHesaplar.filter(h => !h.pasif || h.id === form.kaynakId).map(h => <option key={h.id} value={h.id}>{h.ad} ({fmt(h.bakiye || 0)} ₺)</option>)}</optgroup>
              <optgroup label="📋 Kredi (Para Çekimi)">{data.krediler.filter(h => !h.pasif || h.id === form.kaynakId).map(h => <option key={h.id} value={h.id}>{h.ad}</option>)}</optgroup>
            </select>
            {kaynakHesap && kaynakHesap.hesapTur !== "kredi" && (
              <div className="transfer-bakiye">
                Mevcut: <span className={kaynakHesap.bakiye >= 0 ? "pozitif" : "negatif"}>{fmt(kaynakHesap.bakiye || 0)} ₺</span>
              </div>
            )}
            {kaynakHesap?.hesapTur === "kredi" && (
              <div className="transfer-bakiye kredi-uyari">⚠️ Kredi kullanımı — kalan borç artacak</div>
            )}
          </div>

          <div className="transfer-ok">⇄</div>

          <div className="transfer-blok">
            <label className="transfer-label">Hedef Hesap</label>
            <select className="input" value={form.hedefId} onChange={e => setForm({ ...form, hedefId: e.target.value })} disabled={!form.kaynakId}>
              <option value="">— Seçiniz —</option>
              <optgroup label="💵 Nakit">{hedefSecenekler.filter(h => h.hesapTur === "nakit" && (!h.pasif || h.id === form.hedefId)).map(h => <option key={h.id} value={h.id}>{h.ad} ({fmt(h.bakiye || 0)} ₺)</option>)}</optgroup>
              <optgroup label="🏦 Banka">{hedefSecenekler.filter(h => h.hesapTur === "banka" && (!h.pasif || h.id === form.hedefId)).map(h => <option key={h.id} value={h.id}>{h.ad} ({fmt(h.bakiye || 0)} ₺)</option>)}</optgroup>
            </select>
            {hedefHesap && (
              <div className="transfer-bakiye">
                Mevcut: <span className={hedefHesap.bakiye >= 0 ? "pozitif" : "negatif"}>{fmt(hedefHesap.bakiye || 0)} ₺</span>
              </div>
            )}
          </div>
        </div>

        <div className="transfer-alt">
          <div className="form-grup">
            <label>Tarih</label>
            <input type="date" className="input" value={form.tarih} onChange={e => setForm({ ...form, tarih: e.target.value })} />
          </div>
          <div className="form-grup">
            <label>Tutar (₺)</label>
            <input
              type="text"
              className="input"
              value={miktarOdak ? String(form.miktar).replace(/\./g, ",") : formatliMiktar(form.miktar)}
              onChange={e => setForm({ ...form, miktar: miktarTemizle(e.target.value) })}
              onFocus={() => setMiktarOdak(true)}
              onBlur={() => setMiktarOdak(false)}
              placeholder="0,00"
            />
          </div>
          <div className="form-grup" style={{ flex: 2 }}>
            <label>Açıklama</label>
            <input className="input" value={form.aciklama} onChange={e => setForm({ ...form, aciklama: e.target.value })} placeholder="Örn: ATM çekimi, EFT..." />
          </div>
        </div>

        {hata && <div className="hata-mesaji">⚠ {hata}</div>}

        {form.kaynakId && form.hedefId && form.miktar > 0 && (
          <div className="transfer-ozet-satir">
            <span className="to-kaynak">{kaynakHesap?.ad}</span>
            <span className="to-miktar">{fmt(parseFloat(form.miktar))} ₺</span>
            <span className="to-ok">→</span>
            <span className="to-hedef">{hedefHesap?.ad}</span>
          </div>
        )}

        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn btn-altin btn-transfer" style={{ flex: form.id ? 2 : 1 }} onClick={transferYap}>
            {form.id ? "✎ Güncellemeyi Kaydet" : "⇄ Transferi Gerçekleştir"}
          </button>
          {form.id && (
            <button className="btn btn-ghost" style={{ flex: 1 }}
              onClick={() => setForm({ id: null, tarih: today(), kaynakId: "", hedefId: "", miktar: "", aciklama: "" })}>
              İptal
            </button>
          )}
        </div>
      </div>

      <div className="panel">
        <div className="panel-baslik">Transfer Geçmişi</div>
        {(data.transferler || []).length === 0 ? (
          <div className="bos-durum">Henüz transfer yapılmadı</div>
        ) : (
          <table className="tablo">
            <thead>
              <tr><th>Tarih</th><th>Kaynak</th><th></th><th>Hedef</th><th>Açıklama</th><th style={{ textAlign: "right" }}>Tutar</th><th></th></tr>
            </thead>
            <tbody>
              {[...(data.transferler || [])].reverse().map(t => (
                <tr key={t.id}>
                  <td>{fmtDate(t.tarih)}</td>
                  <td><span className="badge">{turIkon(t.kaynakTur)} {t.kaynakAdi}</span></td>
                  <td style={{ color: "var(--altin)", textAlign: "center" }}>→</td>
                  <td><span className="badge">{turIkon(t.hedefTur)} {t.hedefAdi}</span></td>
                  <td style={{ color: "var(--metin2)", fontSize: 12 }}>{t.aciklama}</td>
                  <td style={{ textAlign: "right" }} className="altin">{fmt(t.miktar)} ₺</td>
                  <td style={{ display: "flex", gap: 6 }}>
                    <button className="btn-duz" title="Düzenle" onClick={() => transferDuzenle(t)}>✎</button>
                    <button className="btn-sil" title="Sil" onClick={() => transferSil(t)}>✕</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
