import { useState } from "react";
import { uid } from "../veri";
import { KategoriForm } from "./Modaller";

// ═══════════════════════════════════════════════════════════════════════════
// KATEGORİLER SAYFASI
// ═══════════════════════════════════════════════════════════════════════════
export function KategorilerSayfa({ data, guncelle, bildir, setModal }) {
  const [pasifleriGoster, setPasifleriGoster] = useState(false);
  const [seciliKatId, setSeciliKatId] = useState(null);
  const [expandedKats, setExpandedKats] = useState([]);

  const anaKategoriler = data.kategoriler
    .filter(k => !k.ustId && (pasifleriGoster || !k.pasif))
    .sort((a, b) => a.ad.localeCompare(b.ad, "tr"));

  const altKategoriler = (anaId) =>
    data.kategoriler
      .filter(k => k.ustId === anaId && (pasifleriGoster || !k.pasif))
      .sort((a, b) => a.ad.localeCompare(b.ad, "tr"));

  const toggleExpand = (id) => {
    setExpandedKats(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const kaydet = (kat, id = null) => {
    guncelle(d => {
      let yeniKategoriler;
      let yeniIslemler = d.islemler;

      if (id) {
        const eskiKat = d.kategoriler.find(k => k.id === id);
        yeniKategoriler = d.kategoriler.map(k => (k.id === id ? { ...k, ...kat } : k));
        if (eskiKat && eskiKat.ad !== kat.ad) {
          yeniIslemler = d.islemler.map(i =>
            i.kategori === eskiKat.ad ? { ...i, kategori: kat.ad } : i
          );
        }
        bildir("Kategori güncellendi.");
      } else {
        yeniKategoriler = [...d.kategoriler, { ...kat, id: uid() }];
        bildir("Kategori eklendi.");
      }

      return { ...d, kategoriler: yeniKategoriler, islemler: yeniIslemler };
    });
    setModal(null);
  };

  const duzenle = (kat) => {
    setSeciliKatId(kat.id);
    setModal(
      <KategoriForm
        mevcutVeri={kat}
        anaKategoriler={anaKategoriler}
        seciliKatId={kat.id}
        onKaydet={v => kaydet(v, kat.id)}
        onIptal={() => setModal(null)}
      />
    );
  };

  const yeniEkle = () => {
    setModal(
      <KategoriForm
        anaKategoriler={anaKategoriler}
        onKaydet={v => kaydet(v)}
        onIptal={() => setModal(null)}
      />
    );
  };

  const sil = (id) => {
    if (window.confirm("Bu kategoriyi ve alt kategorilerini silmek istediğinize emin misiniz?")) {
      guncelle(d => ({
        ...d,
        kategoriler: d.kategoriler.filter(k => k.id !== id && k.ustId !== id),
      }));
      bildir("Silindi.", "uyari");
    }
  };

  const KategoriGrubu = ({ tur }) => (
    <div className="panel" style={tur === "gider" ? { marginTop: 16 } : {}}>
      <div className="panel-baslik">
        {tur === "gelir" ? "Gelir Kategorileri" : "Gider Kategorileri"}
      </div>
      {anaKategoriler.filter(k => k.tur === tur).map(k => {
        const acts = altKategoriler(k.id);
        const expanded = expandedKats.includes(k.id);
        return (
          <div key={k.id}>
            <div
              className={`kategori-satir ${seciliKatId === k.id ? "active" : ""} ${k.pasif ? "pasif" : ""}`}
              onClick={() => toggleExpand(k.id)}
              style={{ cursor: "pointer" }}
            >
              <span className="renk-nokta" style={{ background: k.renk }}></span>
              <span style={{ fontWeight: 600 }}>
                {acts.length > 0 && (expanded ? "▼ " : "▶ ")}
                {k.ad} {k.pasif && "(Pasif)"}
              </span>
              <div
                style={{ marginLeft: "auto", display: "flex", gap: 6 }}
                onClick={e => e.stopPropagation()}
              >
                <button className="btn-duz" title="Düzenle" onClick={() => duzenle(k)}>✎</button>
                <button className="btn-sil" title="Sil" onClick={() => sil(k.id)}>✕</button>
              </div>
            </div>
            {expanded &&
              acts.map(a => (
                <div
                  key={a.id}
                  className={`kategori-satir alt ${seciliKatId === a.id ? "active" : ""} ${a.pasif ? "pasif" : ""}`}
                >
                  <span className="renk-nokta" style={{ background: a.renk }}></span>
                  <span>↳ {a.ad} {a.pasif && "(Pasif)"}</span>
                  <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
                    <button className="btn-duz" title="Düzenle" onClick={() => duzenle(a)}>✎</button>
                    <button className="btn-sil" title="Sil" onClick={() => sil(a.id)}>✕</button>
                  </div>
                </div>
              ))}
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="sayfa">
      <div className="sayfa-baslik">
        <h1>Gelir / Gider Kategorileri</h1>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <button className="btn btn-ghost" onClick={() => setPasifleriGoster(!pasifleriGoster)}>
            {pasifleriGoster ? "Gizle (Pasif)" : "Göster (Pasif)"}
          </button>
          <button className="btn btn-altin" onClick={yeniEkle}>+ Yeni Kategori</button>
        </div>
      </div>
      <div className="tek-sutun">
        <div className="sag-sutun">
          <KategoriGrubu tur="gelir" />
          <KategoriGrubu tur="gider" />
        </div>
      </div>
    </div>
  );
}
