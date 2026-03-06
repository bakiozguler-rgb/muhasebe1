import { useState } from "react";
import { uid, today, gelirHesaplari, harcamaHesaplari, fmt, katIkon, tumHesaplar, hesaplaKartBorc } from "../veri";

// Yardımcı fonksiyonlar (Para formatlamak için)
const formatliMiktar = (deger) => {
  if (!deger) return "";
  const num = parseFloat(deger);
  if (isNaN(num)) return deger;
  return new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(num);
};
const miktarTemizle = (val) => {
  let temiz = val.replace(/[^0-9,]/g, "");
  return temiz.replace(/,/g, ".");
};

// ─── Nakit / Banka Hesap Formu ────────────────────────────────────────────
export function HesapEkleForm({ baslik, hesapTur, onKaydet, onIptal, mevcutVeri }) {
  const [f, setF] = useState(mevcutVeri || { ad: "", banka: "", iban: "", para: "TRY", bakiye: "" });
  const duzenle = !!mevcutVeri;
  const [bakiyeOdak, setBakiyeOdak] = useState(false);
  return (
    <div>
      <h3 className="modal-baslik">{duzenle ? "Hesabı Düzenle" : `${baslik} — Yeni Hesap`}</h3>
      <div className="form-grid">
        <div className="form-grup">
          <label>Hesap Adı *</label>
          <input className="input" value={f.ad} onChange={e => setF({ ...f, ad: e.target.value })} placeholder="Örn: Vadesiz Hesap" />
        </div>
        {hesapTur === "banka" && (<>
          <div className="form-grup">
            <label>Banka Adı</label>
            <input className="input" value={f.banka} onChange={e => setF({ ...f, banka: e.target.value })} placeholder="Örn: Ziraat Bankası" />
          </div>
          <div className="form-grup">
            <label>IBAN</label>
            <input className="input" value={f.iban} onChange={e => setF({ ...f, iban: e.target.value })} placeholder="TR00 0000 0000 0000 0000 0000 00" />
          </div>
          <div className="form-grup">
            <label>Güncel Bakiye (₺)</label>
            <input
              type="text"
              className="input"
              value={bakiyeOdak ? String(f.bakiye).replace(/\./g, ",") : formatliMiktar(f.bakiye)}
              onChange={e => setF({ ...f, bakiye: miktarTemizle(e.target.value) })}
              onFocus={() => setBakiyeOdak(true)}
              onBlur={() => setBakiyeOdak(false)}
              placeholder="0,00"
            />
          </div>
        </>)}
        {hesapTur === "nakit" && (
          <div className="form-grup">
            <label>Güncel Bakiye (₺)</label>
            <input
              type="text"
              className="input"
              value={bakiyeOdak ? String(f.bakiye).replace(/\./g, ",") : formatliMiktar(f.bakiye)}
              onChange={e => setF({ ...f, bakiye: miktarTemizle(e.target.value) })}
              onFocus={() => setBakiyeOdak(true)}
              onBlur={() => setBakiyeOdak(false)}
              placeholder="0,00"
            />
          </div>
        )}
        <div className="form-grup">
          <label>Para Birimi</label>
          <select className="input" value={f.para} onChange={e => setF({ ...f, para: e.target.value })}>
            <option value="TRY">TRY — Türk Lirası</option>
            <option value="USD">USD — Amerikan Doları</option>
            <option value="EUR">EUR — Euro</option>
          </select>
        </div>
        <div className="checkbox-alan">
          <input type="checkbox" checked={f.pasif || false} onChange={e => setF({ ...f, pasif: e.target.checked })} />
          <span>Hesabı Pasife Al</span>
        </div>
        <div className="checkbox-alan">
          <input type="checkbox" checked={f.toplamaDahil !== false} onChange={e => setF({ ...f, toplamaDahil: e.target.checked })} />
          <span>Pasifse Toplama Dahil Et</span>
        </div>
      </div>
      <div className="modal-actions">
        <button className="btn btn-ghost" onClick={onIptal}>İptal</button>
        <button className="btn btn-altin" onClick={() => {
          if (!f.ad) { alert("Lütfen hesap adını giriniz."); return; }
          onKaydet({ ...f, bakiye: parseFloat(f.bakiye) || 0 });
        }}>
          {duzenle ? "Güncelle" : "Kaydet"}
        </button>
      </div>
    </div>
  );
}

// ─── Gelir/Gider İşlem Formu ──────────────────────────────────────────────
export function IslemEkleForm({ tur, hesapAdi, data, onKaydet, onIptal, sabitMiktar }) {
  const isGelir = ["giris", "odeme", "tahsilat"].includes(tur);
  const isOdemeModu = ["odeme", "tahsilat", "kk_odeme", "kredi_odeme"].includes(tur);

  // Başlangıç değerleri
  const ilkHesap = tumHesaplar(data).find(h => h.ad === hesapAdi)?.id || "";

  const [f, setF] = useState({ tarih: today(), miktar: sabitMiktar ? String(sabitMiktar) : "", aciklama: "", hesapId: ilkHesap, kartId: "", krediId: "" });
  const [anaKatId, setAnaKatId] = useState("");
  const [altKatId, setAltKatId] = useState("");
  const [miktarOdak, setMiktarOdak] = useState(false);

  const hesaplar = isGelir ? gelirHesaplari(data) : harcamaHesaplari(data);
  const anaKategoriler = data.kategoriler.filter(k => k.tur === (isGelir ? "gelir" : "gider") && !k.ustId && !k.pasif);
  const altKategoriler = data.kategoriler.filter(k => k.ustId === anaKatId && !k.pasif);

  const baslikMap = { giris: "Para Girişi", cikis: "Para Çıkışı", harcama: "Harcama Ekle", odeme: "Ödeme Kaydet", tahsilat: "Tahsilat Kaydet", kk_odeme: "Kart Borcu Öde", kredi_odeme: "Kredi Taksiti Öde" };

  const handleKaydet = () => {
    if (!f.miktar) { alert("Lütfen miktar giriniz."); return; }
    if (!f.hesapId) { alert("Lütfen hesap seçiniz."); return; }

    let kategoriField = "";
    if (isOdemeModu) {
      kategoriField = anaKatId || ""; // Kredilerde/Borç-Alacakta hedef ID kategoriye gider
    } else {
      if (!anaKatId) { alert("Lütfen kategori seçiniz."); return; }
      const anaKat = anaKategoriler.find(k => k.id === anaKatId);
      const altKat = altKategoriler.find(k => k.id === altKatId);
      kategoriField = altKat ? altKat.ad : anaKat?.ad || "";
    }

    onKaydet({
      ...f,
      tur,
      miktar: parseFloat(f.miktar) || 0,
      kategori: kategoriField,
      hesapId: f.hesapId,
      kartId: f.kartId || null,
      krediId: f.krediId || null
    });
  };

  return (
    <div>
      <h3 className="modal-baslik">{baslikMap[tur]} — {hesapAdi}</h3>
      <div className="form-grid">
        <div className="form-grup"><label>Tarih *</label><input type="date" className="input" value={f.tarih} onChange={e => setF({ ...f, tarih: e.target.value })} /></div>
        <div className="form-grup">
          <label>Tutar (₺) *</label>
          <input
            type="text"
            className="input"
            value={miktarOdak ? String(f.miktar).replace(/\./g, ",") : formatliMiktar(f.miktar)}
            onChange={e => !sabitMiktar && setF({ ...f, miktar: miktarTemizle(e.target.value) })}
            onFocus={() => setMiktarOdak(true)}
            onBlur={() => setMiktarOdak(false)}
            placeholder="0,00"
            disabled={!!sabitMiktar}
          />
        </div>

        {/* Satır 1: Hesap Seçimi */}
        <div className="form-grup tam">
          <label>Hesap (Para {isGelir ? "Girişi" : "Çıkışı"} Yapılacak Hesap)</label>
          <select className="input" value={f.hesapId} onChange={e => setF({ ...f, hesapId: e.target.value })}>
            <option value="">— Hesap Seçiniz —</option>
            {["Nakit", "Banka", "Kredi Kartı"].map(grup => {
              const grupRes = hesaplar.filter(h => h.grup === grup);
              if (grupRes.length === 0) return null;
              return (
                <optgroup key={grup} label={grup}>
                  {grupRes.map(h => (
                    <option key={h.id} value={h.id}>
                      {h.ikon} {h.ad} ({fmt(h.bakiye || 0)} ₺)
                    </option>
                  ))}
                </optgroup>
              );
            })}
          </select>
        </div>

        {/* Satır 1.5: Kart/Kredi Seçimi (SADECE Ödeme Modunda) */}
        {tur === "kk_odeme" && (
          <div className="form-grup tam">
            <label>Ödenecek Kart</label>
            <select className="input" value={f.kartId} onChange={e => setF({ ...f, kartId: e.target.value })}>
              <option value="">— Kart Seçiniz —</option>
              {data.krediKartlari.filter(k => !k.pasif).map(k => (
                <option key={k.id} value={k.id}>💳 {k.ad} ({fmt(hesaplaKartBorc(k.id, data.islemler, k.bakiyeDuzeltme || 0, today()))} ₺ Borç)</option>
              ))}
            </select>
          </div>
        )}
        {tur === "kredi_odeme" && (
          <div className="form-grup tam">
            <label>Ödenecek Kredi</label>
            <select className="input" value={f.krediId} onChange={e => setF({ ...f, krediId: e.target.value })}>
              <option value="">— Kredi Seçiniz —</option>
              {data.krediler.filter(k => !k.pasif && (k.kalanBorc || 0) > 0).map(k => (
                <option key={k.id} value={k.id}>🏦 {k.ad} ({fmt(k.kalanBorc)} ₺ Borç)</option>
              ))}
            </select>
          </div>
        )}
        {!isOdemeModu && (
          <div className="form-grup tam">
            <label>Kategori</label>
            <div style={{ display: "flex", gap: 10 }}>
              <select className="input" style={{ flex: 1 }} value={anaKatId} onChange={e => { setAnaKatId(e.target.value); setAltKatId(""); }}>
                <option value="">— Kategori Seçin —</option>
                {anaKategoriler.map(k => (
                  <option key={k.id} value={k.id}>{katIkon(k.ad)} {k.ad}</option>
                ))}
              </select>

              {altKategoriler.length > 0 && (
                <select className="input" style={{ flex: 1 }} value={altKatId} onChange={e => setAltKatId(e.target.value)}>
                  <option value="">— Alt Kategori —</option>
                  {altKategoriler.map(k => (
                    <option key={k.id} value={k.id}>↳ {k.ad}</option>
                  ))}
                </select>
              )}
            </div>
          </div>
        )}

        <div className="form-grup tam"><label>Açıklama</label><input className="input" value={f.aciklama} onChange={e => setF({ ...f, aciklama: e.target.value })} placeholder="İşlem açıklaması..." /></div>
      </div>
      <div className="modal-actions">
        <button className="btn btn-ghost" onClick={onIptal}>Kapat</button>
        <button className="btn btn-altin" onClick={handleKaydet}>Kaydet</button>
      </div>
    </div>
  );
}

// ─── Kredi Kartı Formu ────────────────────────────────────────────────────
export function KrediKartiEkleForm({ onKaydet, onIptal, mevcutVeri }) {
  const [f, setF] = useState(mevcutVeri || {
    ad: "", banka: "", limit: "", borc: "",
    hesapKesimTarihi: "", sonOdemeTarihi: "",
    asgariOdemeOrani: "", faizOrani: "",
  });
  const duzenle = !!mevcutVeri;
  const [limitOdak, setLimitOdak] = useState(false);
  const [borcOdak, setBorcOdak] = useState(false);

  return (
    <div>
      <h3 className="modal-baslik">{duzenle ? "Kartı Düzenle" : "Kredi Kartı Ekle"}</h3>
      <div className="form-grid">
        <div className="form-grup">
          <label>Kart Adı *</label>
          <input className="input" value={f.ad} onChange={e => setF({ ...f, ad: e.target.value })} placeholder="Örn: World Card" />
        </div>
        <div className="form-grup">
          <label>Banka *</label>
          <input className="input" value={f.banka} onChange={e => setF({ ...f, banka: e.target.value })} placeholder="Örn: Yapı Kredi" />
        </div>
        <div className="form-grup">
          <label>Kart Limiti (₺)</label>
          <input
            type="text"
            className="input"
            value={limitOdak ? String(f.limit).replace(/\./g, ",") : formatliMiktar(f.limit)}
            onChange={e => setF({ ...f, limit: miktarTemizle(e.target.value) })}
            onFocus={() => setLimitOdak(true)}
            onBlur={() => setLimitOdak(false)}
            placeholder="0,00"
          />
        </div>
        <div className="form-grup">
          <label>{duzenle ? "Bakiye Düzeltme (₺)" : "Başlangıç Borcu (₺)"}</label>
          <input
            type="text"
            className="input"
            value={borcOdak ? String(f.borc).replace(/\./g, ",") : formatliMiktar(f.borc)}
            onChange={e => setF({ ...f, borc: miktarTemizle(e.target.value) })}
            onFocus={() => setBorcOdak(true)}
            onBlur={() => setBorcOdak(false)}
            placeholder="0,00"
          />
        </div>
        <div className="form-grup">
          <label>Hesap Kesim Tarihi</label>
          <input className="input" value={f.hesapKesimTarihi} onChange={e => setF({ ...f, hesapKesimTarihi: e.target.value })} placeholder="Her ayın 25'i" />
        </div>
        <div className="form-grup">
          <label>Son Ödeme Tarihi</label>
          <input className="input" value={f.sonOdemeTarihi} onChange={e => setF({ ...f, sonOdemeTarihi: e.target.value })} placeholder="Her ayın 15'i" />
        </div>
        <div className="form-grup">
          <label>Asgari Ödeme Oranı (%)</label>
          <input type="number" className="input" value={f.asgariOdemeOrani} onChange={e => setF({ ...f, asgariOdemeOrani: e.target.value })} placeholder="20" />
        </div>
        <div className="form-grup">
          <label>Aylık Faiz Oranı (%)</label>
          <input type="text" className="input" value={String(f.faizOrani).replace(/\./g, ",")} onChange={e => setF({ ...f, faizOrani: miktarTemizle(e.target.value) })} placeholder="4,5" />
        </div>
        <div className="checkbox-alan">
          <input type="checkbox" checked={f.pasif || false} onChange={e => setF({ ...f, pasif: e.target.checked })} />
          <span>Kartı Pasife Al</span>
        </div>
        <div className="checkbox-alan">
          <input type="checkbox" checked={f.toplamaDahil !== false} onChange={e => setF({ ...f, toplamaDahil: e.target.checked })} />
          <span>Pasifse Toplama Dahil Et</span>
        </div>
      </div>
      <div className="modal-actions">
        <button className="btn btn-ghost" onClick={onIptal}>İptal</button>
        <button className="btn btn-altin" onClick={() => {
          if (!f.ad) { alert("Lütfen kart adını giriniz."); return; }
          if (!f.banka) { alert("Lütfen banka adını giriniz."); return; }
          onKaydet({
            ...f,
            limit: parseFloat(f.limit) || 0,
            borc: parseFloat(f.borc) || 0,
            asgariOdemeOrani: parseFloat(f.asgariOdemeOrani) || 0,
            faizOrani: parseFloat(f.faizOrani) || 0,
          });
        }}>
          {duzenle ? "Güncelle" : "Kaydet"}
        </button>
      </div>
    </div>
  );
}

// ─── Kredi Formu ──────────────────────────────────────────────────────────
export function KrediEkleForm({ data, onKaydet, onIptal, mevcutVeri }) {
  const [f, setF] = useState(mevcutVeri || {
    ad: "", banka: "", tutar: "", geriOdemeToplami: "", vade: "", faiz: "", baslangic: today(), hedefHesapId: ""
  });
  const aylikOdeme = (f.geriOdemeToplami && f.vade) ? (parseFloat(f.geriOdemeToplami) / parseInt(f.vade)) : 0;
  const bankaHesaplar = data?.bankaHesaplar?.filter(h => !h.pasif) || [];
  const duzenle = !!mevcutVeri;
  const [tutarOdak, setTutarOdak] = useState(false);
  const [geriOdemeOdak, setGeriOdemeOdak] = useState(false);
  return (
    <div>
      <h3 className="modal-baslik">{duzenle ? "Krediyi Düzenle" : "Kredi Ekle"}</h3>
      <div className="modal-form">
        <div className="form-grup"><label>Kredi Adı *</label><input className="input" value={f.ad} onChange={e => setF({ ...f, ad: e.target.value })} placeholder="Örn: Konut Kredisi" /></div>
        <div className="form-grup"><label>Banka Adı</label><input className="input" value={f.banka} onChange={e => setF({ ...f, banka: e.target.value })} /></div>
        <div className="form-grup">
          <label>Kredi Tutarı (Net) *</label>
          <input
            type="text"
            className="input"
            value={tutarOdak ? String(f.tutar).replace(/\./g, ",") : formatliMiktar(f.tutar)}
            onChange={e => setF({ ...f, tutar: miktarTemizle(e.target.value) })}
            onFocus={() => setTutarOdak(true)}
            onBlur={() => setTutarOdak(false)}
            placeholder="0,00"
          />
        </div>
        <div className="form-grup">
          <label>Geri Ödeme Toplamı *</label>
          <input
            type="text"
            className="input"
            value={geriOdemeOdak ? String(f.geriOdemeToplami).replace(/\./g, ",") : formatliMiktar(f.geriOdemeToplami)}
            onChange={e => setF({ ...f, geriOdemeToplami: miktarTemizle(e.target.value) })}
            onFocus={() => setGeriOdemeOdak(true)}
            onBlur={() => setGeriOdemeOdak(false)}
          />
        </div>
        <div className="form-grup"><label>Vade (Ay) *</label><input type="number" className="input" value={f.vade} onChange={e => setF({ ...f, vade: e.target.value })} /></div>
        <div className="form-grup"><label>Aylık Ödeme</label><input type="text" className="input" value={formatliMiktar(aylikOdeme) + " ₺"} disabled style={{ background: "transparent", border: "none", color: "var(--altin)", fontWeight: "bold" }} /></div>
        <div className="form-grup"><label>Faiz Oranı (%) (Bilgi Amaçlı)</label><input type="text" className="input" value={String(f.faiz).replace(/\./g, ",")} onChange={e => setF({ ...f, faiz: miktarTemizle(e.target.value) })} placeholder="Sadece not düşülür..." /></div>
        <div className="form-grup"><label>Başlangıç Tarihi (Bilgi Amaçlı)</label><input type="date" className="input" value={f.baslangic} onChange={e => setF({ ...f, baslangic: e.target.value })} disabled /></div>
        {!duzenle && (
          <div className="form-grup tam">
            <label>Kredinin Aktarılacağı Banka Hesabı *</label>
            <select className="input" value={f.hedefHesapId} onChange={e => setF({ ...f, hedefHesapId: e.target.value })}>
              <option value="">— Banka Seçiniz (Yoksa 0 girilir) —</option>
              {bankaHesaplar.map(h => (
                <option key={h.id} value={h.id}>{h.ad} ({fmt(h.bakiye || 0)} ₺)</option>
              ))}
              <option value="none">Hesaba Aktarım Yapma (Tutar 0)</option>
            </select>
            <small style={{ color: "var(--metin2)", marginTop: 4, display: "block" }}>
              Kredi onaylandığında bu tutar seçilen hesaba "Gelir" olarak yansıtılacaktır.
            </small>
          </div>
        )}
        <div className="checkbox-alan">
          <input type="checkbox" checked={f.pasif || false} onChange={e => setF({ ...f, pasif: e.target.checked })} />
          <span>Krediyi Pasife Al</span>
        </div>
        <div className="checkbox-alan">
          <input type="checkbox" checked={f.toplamaDahil !== false} onChange={e => setF({ ...f, toplamaDahil: e.target.checked })} />
          <span>Pasifse Toplama Dahil Et</span>
        </div>
      </div>
      <div className="modal-actions">
        <button className="btn btn-ghost" onClick={onIptal}>İptal</button>
        <button className="btn btn-altin" onClick={() => {
          if (!f.ad) { alert("Lütfen kredi adını giriniz."); return; }
          if (f.tutar === "") { alert("Lütfen kredi tutarını giriniz (istemiyorsanız 0 yazın)."); return; }
          if (!f.geriOdemeToplami) { alert("Lütfen geri ödeme toplamını giriniz."); return; }
          if (!f.vade) { alert("Lütfen vade süresini (ay) giriniz."); return; }
          if (!duzenle && !f.hedefHesapId && parseFloat(f.tutar) > 0) { alert("Lütfen kredinin aktarılacağı banka hesabını seçiniz."); return; }

          let hId = f.hedefHesapId;
          if (hId === "none") hId = null;

          onKaydet({
            ...f,
            hedefHesapId: hId,
            tutar: parseFloat(f.tutar) || 0,
            geriOdemeToplami: parseFloat(f.geriOdemeToplami) || 0,
            vade: parseInt(f.vade) || 0,
            faiz: parseFloat(f.faiz) || 0,
            pasif: f.pasif || false,
            toplamaDahil: f.toplamaDahil !== false,
          });
        }}>
          {duzenle ? "Güncelle" : "Kaydet"}
        </button>
      </div>
    </div>
  );
}

// ─── Borç/Alacak Formu ────────────────────────────────────────────────────
export function BorcAlacakEkleForm({ data, onKaydet, onIptal, mevcutVeri }) {
  const [f, setF] = useState(mevcutVeri || { tur: "alacak", kisi: "", miktar: "", aciklama: "", vade: "", hesapId: "", taksitli: false, taksitSayisi: "" });
  const duzenle = !!mevcutVeri;
  const [miktarOdak, setMiktarOdak] = useState(false);
  return (
    <div>
      <h3 className="modal-baslik">{duzenle ? "Kaydı Düzenle" : "Borç / Alacak Ekle"}</h3>
      <div className="form-grid">
        <div className="form-grup"><label>Tür *</label>
          <select className="input" value={f.tur} onChange={e => setF({ ...f, tur: e.target.value })}>
            <option value="alacak">Alacak (benden borç aldı)</option>
            <option value="borc">Borç (ben borç aldım)</option>
          </select>
        </div>
        <div className="form-grup"><label>Kişi Adı *</label><input className="input" value={f.kisi} onChange={e => setF({ ...f, kisi: e.target.value })} placeholder="Ad Soyad" /></div>
        <div className="form-grup">
          <label>Miktar (₺) *</label>
          <input
            type="text"
            className="input"
            value={miktarOdak ? String(f.miktar).replace(/\./g, ",") : formatliMiktar(f.miktar)}
            onChange={e => setF({ ...f, miktar: miktarTemizle(e.target.value) })}
            onFocus={() => setMiktarOdak(true)}
            onBlur={() => setMiktarOdak(false)}
            placeholder="0,00"
          />
        </div>
        <div className="form-grup"><label>{f.taksitli ? "İlk Vade Tarihi *" : "Vade Tarihi"}</label><input type="date" className="input" value={f.vade} onChange={e => setF({ ...f, vade: e.target.value })} /></div>
        <div className="form-grup tam"><label>Açıklama</label><input className="input" value={f.aciklama} onChange={e => setF({ ...f, aciklama: e.target.value })} placeholder="İşlem nedeni..." /></div>
        <div className="checkbox-alan tam">
          <input type="checkbox" checked={f.taksitli || false} onChange={e => setF({ ...f, taksitli: e.target.checked })} disabled={duzenle} />
          <span>Taksitli İşlem</span>
        </div>
        {f.taksitli && !duzenle && (
          <div className="form-grup tam">
            <label>Taksit Sayısı *</label>
            <input type="number" className="input" value={f.taksitSayisi} onChange={e => setF({ ...f, taksitSayisi: e.target.value })} min="2" max="60" />
            <small style={{ color: "var(--metin2)", marginTop: 4, display: "block" }}>
              Girilen tarih başlangıç kabul edilerek aylık periyotlarla {f.taksitSayisi || "?"} taksit oluşturulacaktır.
            </small>
          </div>
        )}
        {!duzenle && (
          <div className="form-grup tam">
            <label>{f.tur === "alacak" ? "Paranın Çıkacağı Hesap *" : "Paranın Gireceği Hesap *"}</label>
            <select className="input" value={f.hesapId} onChange={e => setF({ ...f, hesapId: e.target.value })}>
              <option value="">— Hesap Seçiniz —</option>
              {tumHesaplar(data).filter(h => !h.pasif).map(h => (
                <option key={h.id} value={h.id}>{h.ad} ({fmt(h.bakiye || 0)} ₺)</option>
              ))}
            </select>
          </div>
        )}
      </div>
      <div className="modal-actions">
        <button className="btn btn-ghost" onClick={onIptal}>İptal</button>
        <button className="btn btn-altin" onClick={() => {
          if (!f.kisi) { alert("Lütfen kişi adını giriniz."); return; }
          if (!f.miktar) { alert("Lütfen miktarı giriniz."); return; }
          if (!duzenle && !f.hesapId) { alert("Lütfen hesap seçiniz."); return; }
          if (f.taksitli && !duzenle) {
            if (!f.vade) { alert("Taksitli işlemler için ilk vade tarihini giriniz."); return; }
            if (!f.taksitSayisi || parseInt(f.taksitSayisi) < 2) { alert("Lütfen taksit sayısını giriniz (en az 2)."); return; }
          }
          const h = tumHesaplar(data).find(x => x.id === f.hesapId);

          const kayitVerisi = {
            ...f,
            miktar: parseFloat(f.miktar) || 0,
            hesapId: f.hesapId,
            hesapAdi: h?.ad,
            hesapTur: h?.hesapTur
          };

          if (f.taksitli && !duzenle) {
            const anaTarih = new Date(f.vade);
            const ts = parseInt(f.taksitSayisi);
            const tm = (parseFloat(f.miktar) || 0) / ts;
            const taksitlerListesi = [];
            for (let i = 0; i < ts; i++) {
              const d = new Date(anaTarih.getFullYear(), anaTarih.getMonth() + i, anaTarih.getDate());
              const yil = d.getFullYear();
              const ay = String(d.getMonth() + 1).padStart(2, "0");
              const gun = String(d.getDate()).padStart(2, "0");
              taksitlerListesi.push({
                id: uid(),
                vade: `${yil}-${ay}-${gun}`,
                miktar: tm,
                odendi: false
              });
            }
            kayitVerisi.taksitler = taksitlerListesi;
            kayitVerisi.taksitli = true;
          }

          onKaydet(kayitVerisi);
        }}>
          {duzenle ? "Güncelle" : "Kaydet"}
        </button>
      </div>
    </div>
  );
}

// ─── Kategori Formu ────────────────────────────────────────────────────────
export function KategoriForm({ onKaydet, onIptal, mevcutVeri, anaKategoriler, seciliKatId }) {
  const [f, setF] = useState(mevcutVeri || {
    ad: "", tur: "gider", ustId: "", renk: "#60a5fa", pasif: false, toplamaDahil: true
  });
  const duzenle = !!mevcutVeri;

  return (
    <div>
      <h3 className="modal-baslik">{duzenle ? "Kategoriyi Düzenle" : "Yeni Kategori"}</h3>
      <div className="form-grid">
        <div className="form-grup">
          <label>Kategori Adı *</label>
          <input className="input" value={f.ad} onChange={e => setF({ ...f, ad: e.target.value })} placeholder="Örn: Yakıt" />
        </div>
        <div className="form-grup">
          <label>Tür</label>
          <select className="input" value={f.tur} onChange={e => setF({ ...f, tur: e.target.value })} disabled={duzenle}>
            <option value="gelir">Gelir</option>
            <option value="gider">Gider</option>
          </select>
        </div>
        <div className="form-grup">
          <label>Üst Kategori</label>
          <select className="input" value={f.ustId} onChange={e => setF({ ...f, ustId: e.target.value })}>
            <option value="">— Ana Kategori —</option>
            {anaKategoriler.filter(k => k.tur === f.tur && k.id !== seciliKatId).map(k => (
              <option key={k.id} value={k.id}>{k.ad}</option>
            ))}
          </select>
        </div>
        <div className="form-grup">
          <label>Renk</label>
          <input type="color" className="input color-input" value={f.renk} onChange={e => setF({ ...f, renk: e.target.value })} />
        </div>
        <div className="checkbox-alan">
          <input type="checkbox" checked={f.pasif || false} onChange={e => setF({ ...f, pasif: e.target.checked })} />
          <span>Kategoriyi Pasife Al</span>
        </div>
        <div className="checkbox-alan">
          <input type="checkbox" checked={f.toplamaDahil !== false} onChange={e => setF({ ...f, toplamaDahil: e.target.checked })} />
          <span>Pasifse Raporlara Dahil Et</span>
        </div>
      </div>
      <div className="modal-actions">
        <button className="btn btn-ghost" onClick={onIptal}>İptal</button>
        <button className="btn btn-altin" onClick={() => {
          if (!f.ad) { alert("Lütfen kategori adını giriniz."); return; }
          onKaydet(f);
        }}>
          {duzenle ? "Güncelle" : "Kaydet"}
        </button>
      </div>
    </div>
  );
}
