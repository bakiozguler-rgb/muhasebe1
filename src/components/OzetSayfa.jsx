import { fmt, fmtDate, today } from "../veri";

export default function OzetSayfa({ data, toplamNakit, toplamBanka, toplamKKBorc,
  toplamKrediBorc, toplamAlacak, toplamBorc, netVarlik, buAyGelir, buAyGider, fmt: fmtProp, onEdit }) {
  const fmtFn = fmtProp || fmt;
  const suAn = today();

  const kartlar = [
    { label: "Nakit", deger: toplamNakit, ikon: "💵", renk: "#4ade80", aciklama: `${data.nakitHesaplar.filter(h => !h.pasif).length} hesap` },
    { label: "Banka", deger: toplamBanka, ikon: "🏦", renk: "#60a5fa", aciklama: `${data.bankaHesaplar.filter(h => !h.pasif).length} hesap` },
    { label: "KK Borcu", deger: -toplamKKBorc, ikon: "💳", renk: "#f87171", aciklama: `${data.krediKartlari.filter(k => !k.pasif).length} kart` },
    { label: "Kredi Borcu", deger: -toplamKrediBorc, ikon: "📋", renk: "#fb923c", aciklama: `${data.krediler.length} kredi` },
    { label: "Alacak", deger: toplamAlacak, ikon: "↑", renk: "#a78bfa", aciklama: `${data.borcAlacaklar.filter(b => b.tur === "alacak" && !b.pasif).length} kişi` },
    { label: "Kişisel Borç", deger: -toplamBorc, ikon: "↓", renk: "#f472b6", aciklama: `${data.borcAlacaklar.filter(b => b.tur === "borc" && !b.pasif).length} kişi` },
  ];

  const tumFiltreli = data.islemler.filter(i => !i.tur.startsWith("transfer"));

  const sonIslemler = tumFiltreli
    .filter(i => i.tarih <= suAn)
    .sort((a, b) => b.tarih.localeCompare(a.tarih) || b.id.localeCompare(a.id))
    .slice(0, 8);

  const IslemTablosu = ({ islemler, baslik, bosMesaj }) => (
    <div className="panel" style={{ marginBottom: 20 }}>
      <div className="panel-baslik">{baslik}</div>
      {islemler.length === 0 ? (
        <div className="bos-durum">{bosMesaj}</div>
      ) : (
        <div className="tablo-konteynir">
          <table className="tablo" style={{ fontSize: 12, tableLayout: "fixed", width: "100%" }}>
            <thead>
              <tr>
                <th style={{ whiteSpace: "nowrap", padding: "8px", width: "17%" }}>Tarih</th>
                <th style={{ padding: "8px", width: "22%" }}>Açıklama</th>
                <th style={{ padding: "8px", width: "20%" }}>Hesap</th>
                <th style={{ padding: "8px", width: "18%" }}>Kategori</th>
                <th style={{ textAlign: "right", padding: "8px", whiteSpace: "nowrap", width: "20%" }}>Tutar</th>
                <th style={{ width: "3%", padding: "8px" }}></th>
              </tr>
            </thead>
            <tbody>
              {islemler.map(i => (
                <tr key={i.id}>
                  <td style={{ whiteSpace: "nowrap", padding: "8px", overflow: "hidden", textOverflow: "ellipsis" }}>{fmtDate(i.tarih)}</td>
                  <td style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", padding: "8px" }} title={i.aciklama}>{i.aciklama}</td>
                  <td style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", padding: "8px" }} title={i.hesapAdi}>{i.hesapAdi}</td>
                  <td style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", padding: "8px" }} title={i.kategori}>{i.kategori || "—"}</td>
                  <td style={{ textAlign: "right", whiteSpace: "nowrap", fontWeight: 500, padding: "8px" }} className={i.tur === "gelir" ? "pozitif" : "negatif"}>
                    {i.tur === "gelir" ? "+" : "-"}{fmtFn(i.miktar)} ₺
                  </td>
                  <td style={{ textAlign: "right", padding: "8px" }}>
                    <button className="btn-islem-duzenle" onClick={() => onEdit(i)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12 }}>✏️</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  return (
    <div className="sayfa">
      <div className="sayfa-baslik">
        <h1>Finansal Özet</h1>
        <span className="tarih-badge">
          {new Date().toLocaleDateString("tr-TR", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
        </span>
      </div>

      {/* Net Varlık */}
      <div className="net-hero">
        <div className="nh-label">Toplam Net Varlık</div>
        <div className={`nh-deger ${netVarlik >= 0 ? "pozitif" : "negatif"}`}>
          {netVarlik >= 0 ? "+" : ""}{fmtFn(netVarlik)} ₺
        </div>
        <div className="nh-aylik">
          <span className="pozitif">↑ Bu ay gelir: {fmtFn(buAyGelir)} ₺</span>
          <span className="separator">|</span>
          <span className="negatif">↓ Bu ay gider: {fmtFn(buAyGider)} ₺</span>
          <span className="separator">|</span>
          <span className={buAyGelir - buAyGider >= 0 ? "pozitif" : "negatif"}>
            Net: {fmtFn(buAyGelir - buAyGider)} ₺
          </span>
        </div>
      </div>

      {/* Özet Kartlar */}
      <div className="kart-grid">
        {kartlar.map((k, i) => (
          <div key={i} className="ozet-kart" style={{ "--aksan": k.renk }}>
            <div className="ok-ust">
              <span className="ok-ikon">{k.ikon}</span>
              <span className="ok-aciklama">{k.aciklama}</span>
            </div>
            <div className="ok-deger" style={{ color: k.deger < 0 ? "#f87171" : k.renk }}>
              {k.deger >= 0 ? "" : "-"}{fmtFn(Math.abs(k.deger))} ₺
            </div>
            <div className="ok-label">{k.label}</div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 24 }}>
        <IslemTablosu
          islemler={sonIslemler}
          baslik="Son İşlemler"
          bosMesaj="Henüz işlem yok"
        />
      </div>
    </div>
  );
}
