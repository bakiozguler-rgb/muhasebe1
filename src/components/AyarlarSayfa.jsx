import { useRef } from "react";

export default function AyarlarSayfa({ data, guncelle, bildir }) {
    const ayarlar = data.ayarlar || { maasGunu: 1 };
    const dosyaGirisRef = useRef(null);

    const gunDegis = (yeniGun) => {
        const gun = parseInt(yeniGun);
        if (gun < 1 || gun > 31) return;
        guncelle(d => ({
            ...d,
            ayarlar: { ...ayarlar, maasGunu: gun }
        }));
        bildir("Maaş günü güncellendi.");
    };

    const yedekle = async () => {
        const jsonStr = JSON.stringify(data, null, 2);
        const dosyaAdi = `muhasebe_yedek_${new Date().toISOString().split("T")[0]}.json`;

        // Modern API kontrolü (File System Access API)
        if ("showSaveFilePicker" in window) {
            try {
                const handle = await window.showSaveFilePicker({
                    suggestedName: dosyaAdi,
                    types: [{
                        description: "JSON Yedek Dosyası",
                        accept: { "application/json": [".json"] },
                    }],
                });
                const writable = await handle.createWritable();
                await writable.write(jsonStr);
                await writable.close();
                bildir("Yedek başarıyla kaydedildi.");
            } catch (err) {
                if (err.name !== "AbortError") {
                    console.error(err);
                    bildir("Yedekleme sırasında bir hata oluştu.", "hata");
                }
            }
        } else {
            // Fallback: Eski yöntem (Blob indirme)
            const blob = new Blob([jsonStr], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = dosyaAdi;
            a.click();
            URL.revokeObjectURL(url);
            bildir("Yedek dosyası indirildi.");
        }
    };

    const geriYukle = (e) => {
        const dosya = e.target.files[0];
        if (!dosya) return;

        if (!window.confirm("Dikkat! Bu işlem mevcut tüm verilerinizin üzerine yazılacaktır. Devam etmek istiyor musunuz?")) {
            e.target.value = "";
            return;
        }

        const reader = new FileReader();
        reader.onload = (re) => {
            try {
                const yedekData = JSON.parse(re.target.result);

                // Basit bir doğrulama - 'islemler' ve 'kategoriler' var mı?
                if (!yedekData.islemler || !yedekData.kategoriler) {
                    throw new Error("Geçersiz yedek dosyası formatı.");
                }

                guncelle(() => yedekData);
                bildir("Veriler başarıyla geri yüklendi.");
                setTimeout(() => window.location.reload(), 1000); // UI'yı tamamen tazelemek için
            } catch (err) {
                console.error(err);
                bildir("Geri yükleme başarısız oldu: Geçersiz dosya.", "hata");
            }
        };
        reader.readAsText(dosya);
        e.target.value = "";
    };

    return (
        <div className="sayfa">
            <div className="sayfa-baslik">
                <h1>Ayarlar</h1>
            </div>

            <div className="panel" style={{ maxWidth: 500 }}>
                <div className="panel-baslik">Genel Ayarlar</div>

                <div className="form-grup" style={{ marginTop: 20 }}>
                    <label style={{ display: "block", marginBottom: 8, fontWeight: 500 }}>Bütçe Başlangıç Günü (Maaş Günü)</label>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <input
                            type="number"
                            className="input"
                            min="1"
                            max="31"
                            value={ayarlar.maasGunu}
                            onChange={e => gunDegis(e.target.value)}
                            style={{ width: 80 }}
                        />
                        <span style={{ color: "var(--metin2)", fontSize: 13 }}>
                            Ayın {ayarlar.maasGunu}. günü bütçe başlar.
                        </span>
                    </div>
                </div>
            </div>

            <div className="panel" style={{ maxWidth: 500, marginTop: 20 }}>
                <div className="panel-baslik">Yedekle ve Geri Yükle</div>
                <p style={{ color: "var(--metin2)", fontSize: 13, marginBottom: 20 }}>
                    Verilerinizi bir dosyaya yedekleyerek Google Drive veya yerel klasörlerinizde saklayabilirsiniz.
                </p>

                <div style={{ display: "flex", gap: 12 }}>
                    <button className="btn btn-altin" onClick={yedekle}>
                        📥 Verileri Yedekle
                    </button>

                    <button className="btn btn-ghost" onClick={() => dosyaGirisRef.current.click()}>
                        📤 Yedekten Geri Yükle
                    </button>

                    <input
                        type="file"
                        ref={dosyaGirisRef}
                        onChange={geriYukle}
                        style={{ display: "none" }}
                        accept=".json"
                    />
                </div>

                <div style={{ marginTop: 20, padding: "12px", background: "rgba(201,168,76,0.05)", borderRadius: "8px", border: "1px dashed var(--kenar)" }}>
                    <p style={{ fontSize: 12, color: "var(--metin2)", margin: 0 }}>
                        💡 <strong>İpucu:</strong> Google Drive'a yedeklemek için "Verileri Yedekle" dedikten sonra açılan pencerede sol taraftan Drive klasörünüzü seçebilirsiniz.
                    </p>
                </div>
            </div>

            <div className="panel" style={{ maxWidth: 500, marginTop: 20 }}>
                <div className="panel-baslik">Otomatik Yedekleme</div>
                <p style={{ color: "var(--metin2)", fontSize: 13, marginBottom: 15 }}>
                    Program her kapandığında seçeceğiniz klasöre otomatik yedek alınır.
                </p>

                <div className="form-grup">
                    <label style={{ display: "block", marginBottom: 8, fontWeight: 500 }}>Yedek Klasörü (Drive vb.)</label>
                    <div style={{ display: "flex", gap: 8 }}>
                        <input
                            type="text"
                            className="input"
                            value={ayarlar.yedekKlasoru || ""}
                            readOnly
                            placeholder="Klasör seçilmedi..."
                            style={{ flex: 1, fontSize: 13 }}
                        />
                        <button className="btn btn-ghost" onClick={async () => {
                            try {
                                if (!window.electronAPI) {
                                    throw new Error("Electron API yüklenemedi. Lütfen uygulamayı yeniden başlatın.");
                                }

                                const yol = await window.electronAPI.selectFolder();
                                if (yol) {
                                    guncelle(d => ({
                                        ...d,
                                        ayarlar: { ...ayarlar, yedekKlasoru: yol }
                                    }));
                                    bildir("Yedek klasörü seçildi.");
                                }
                            } catch (err) {
                                console.error(err);
                                bildir("Hata: " + (err.message || "Klasör seçilemedi"), "hata");
                            }
                        }}>Klasör Seç</button>
                    </div>
                </div>

                {ayarlar.yedekKlasoru && (
                    <button
                        className="btn btn-danger btn-kucuk"
                        style={{ marginTop: 12 }}
                        onClick={() => {
                            if (window.confirm("Otomatik yedeklemeyi kapatmak istediğinizden emin misiniz?")) {
                                guncelle(d => ({
                                    ...d,
                                    ayarlar: { ...ayarlar, yedekKlasoru: null }
                                }));
                                bildir("Otomatik yedekleme devre dışı bırakıldı.");
                            }
                        }}
                    >
                        Otomatik Yedeklemeyi Kapat
                    </button>
                )}
            </div>

            <div className="panel" style={{ maxWidth: 500, marginTop: 20 }}>
                <div className="panel-baslik">Veri Yönetimi</div>
                <p style={{ color: "var(--metin2)", fontSize: 13, marginBottom: 15 }}>Uygulama verileri tarayıcınızda (localStorage) saklanmaktadır.</p>

                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    <div style={{ padding: "12px", background: "rgba(201,168,76,0.05)", borderRadius: "8px", border: "1px solid var(--kenar)" }}>
                        <h4 style={{ margin: "0 0 8px 0", color: "var(--altin)" }}>Kategori Temizliği</h4>
                        <p style={{ fontSize: 12, color: "var(--metin2)", marginBottom: 12 }}>
                            Aynı isimli, aynı türdeki ve aynı üst kategoriye sahip mükerrer kategorileri birleştirir. Bu işlem geri alınamaz, önce yedek almanız önerilir.
                        </p>
                        <button className="btn btn-altin btn-kucuk" onClick={() => {
                            if (window.confirm("Aynı isimli kategoriler birleştirilecek. Devam etmek istiyor musunuz?")) {
                                import("../veri").then(({ kategorileriTemizle }) => {
                                    guncelle(d => {
                                        const eskiSayi = d.kategoriler.length;
                                        const yeniData = kategorileriTemizle(d);
                                        const silinenSayi = eskiSayi - yeniData.kategoriler.length;
                                        bildir(`${silinenSayi} adet mükerrer kategori birleştirildi.`);
                                        return yeniData;
                                    });
                                });
                            }
                        }}>Kategorileri Birleştir (Temizle)</button>
                    </div>

                    <button className="btn btn-danger btn-kucuk" onClick={() => {
                        if (window.confirm("Tüm verileri silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.")) {
                            localStorage.clear();
                            window.location.reload();
                        }
                    }}>Tüm Verileri Sıfırla</button>
                </div>
            </div>
        </div>
    );
}
