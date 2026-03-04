const css = `
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=DM+Sans:wght@300;400;500;600&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
:root{
  --bg:#060c1a;--bg2:#0d1526;--bg3:#14213d;--bg4:#1a2a4a;
  --altin:#c9a84c;--altin2:#e8c96a;
  --metin:#e8eaf0;--metin2:#8a9bbf;--kenar:#1e3058;
  --pozitif:#4ade80;--negatif:#f87171;
  --font-baslik:'Playfair Display',serif;--font:'DM Sans',sans-serif;
  --radius:12px;
}
body{background:var(--bg);color:var(--metin);font-family:var(--font);overflow-x:hidden;}
.app{display:flex;min-height:100vh;width:100%;overflow-x:hidden;}

/* SIDEBAR */
.sidebar{width:240px;min-height:100vh;background:var(--bg2);border-right:1px solid var(--kenar);display:flex;flex-direction:column;position:sticky;top:0;height:100vh;overflow-y:auto;}
.logo{display:flex;align-items:center;gap:12px;padding:24px 20px;border-bottom:1px solid var(--kenar);}
.logo-icon{width:40px;height:40px;background:var(--altin);border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:700;color:var(--bg);font-family:var(--font-baslik);flex-shrink:0;}
.logo-title{font-family:var(--font-baslik);font-size:16px;font-weight:700;}.logo-sub{font-size:11px;color:var(--metin2);}
.nav{padding:12px 0;flex:1;}
.nav-item{width:100%;display:flex;align-items:center;gap:12px;padding:10px 20px;background:none;border:none;color:var(--metin2);cursor:pointer;font-family:var(--font);font-size:14px;transition:all 0.15s;text-align:left;}
.nav-item:hover{color:var(--metin);background:var(--bg3);}
.nav-item.active{color:var(--altin);background:var(--bg3);border-right:3px solid var(--altin);}
.nav-icon{font-size:16px;width:20px;text-align:center;}
.sidebar-footer{padding:16px 20px;border-top:1px solid var(--kenar);}
.nv-label{font-size:11px;color:var(--metin2);text-transform:uppercase;letter-spacing:1px;}
.nv-value{font-size:18px;font-weight:600;font-family:var(--font-baslik);margin-top:4px;}

/* YENI ISLEM BTN */
.yeni-islem-btn{margin:12px 16px;padding:12px;background:linear-gradient(135deg,var(--altin),var(--altin2));color:var(--bg);border:none;border-radius:10px;font-family:var(--font);font-size:14px;font-weight:600;cursor:pointer;transition:all 0.15s;display:flex;align-items:center;justify-content:center;gap:8px;}
.yeni-islem-btn:hover{opacity:0.9;transform:translateY(-1px);box-shadow:0 4px 20px rgba(201,168,76,0.3);}

/* MAIN */
.main{flex:1;overflow-y:auto;overflow-x:hidden;}
.sayfa{padding:32px;max-width:1400px;width:100%;overflow-x:hidden;}
.sayfa-baslik{display:flex;align-items:center;justify-content:space-between;margin-bottom:28px;}
.sayfa-baslik h1{font-family:var(--font-baslik);font-size:28px;font-weight:600;}
.tarih-badge{font-size:13px;color:var(--metin2);}

/* ÖZET */
.net-hero{background:linear-gradient(135deg,var(--bg3),var(--bg4));border:1px solid var(--kenar);border-radius:var(--radius);padding:32px;margin-bottom:24px;text-align:center;}
.nh-label{font-size:13px;color:var(--metin2);text-transform:uppercase;letter-spacing:2px;margin-bottom:8px;}
.nh-deger{font-family:var(--font-baslik);font-size:48px;font-weight:700;margin-bottom:12px;}
.nh-aylik{display:flex;gap:16px;justify-content:center;font-size:14px;flex-wrap:wrap;}
.separator{color:var(--kenar);}
.kart-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:16px;margin-bottom:24px;}
.ozet-kart{background:var(--bg2);border:1px solid var(--kenar);border-radius:var(--radius);padding:20px;border-left:3px solid var(--aksan,var(--kenar));}
.ok-ust{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;}
.ok-ikon{font-size:20px;}.ok-aciklama{font-size:11px;color:var(--metin2);}
.ok-deger{font-size:22px;font-weight:600;font-family:var(--font-baslik);margin-bottom:4px;}
.ok-label{font-size:12px;color:var(--metin2);}

/* PANEL */
.panel{background:var(--bg2);border:1px solid var(--kenar);border-radius:var(--radius);padding:20px;}
.panel-baslik{font-size:14px;font-weight:600;color:var(--altin);text-transform:uppercase;letter-spacing:1px;margin-bottom:16px;}

/* TABLO */
.tablo{width:100%;border-collapse:collapse;font-size:13px;}
.tablo th{padding:10px 12px;text-align:left;color:var(--metin2);font-weight:500;border-bottom:1px solid var(--kenar);}
.tablo td{padding:10px 12px;border-bottom:1px solid rgba(30,48,88,0.5);}
.tablo tr:hover td{background:var(--bg3);}

/* HESAP KARTLAR */
.hesap-kart{background:var(--bg2);border:1px solid var(--kenar);border-radius:var(--radius);padding:20px;margin-bottom:12px;cursor:pointer;transition:all 0.2s;}
.hesap-kart:hover{border-color:var(--altin);}
.hesap-kart.secili{border-color:var(--altin);background:var(--bg3);}
.hk-ust{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px;}
.hk-ad{font-size:15px;font-weight:600;}.hk-alt{font-size:12px;color:var(--metin2);margin-top:2px;}
.hk-iban{font-size:11px;color:var(--metin2);font-family:monospace;margin-top:2px;}
.hk-bakiye{font-size:24px;font-weight:700;font-family:var(--font-baslik);margin-bottom:12px;}
.hk-aksiyonlar{display:flex;gap:8px;flex-wrap:wrap;}
.kk-satir{display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;font-size:13px;}
.kk-label{color:var(--metin2);}.kucuk-yazi{font-size:11px;color:var(--metin2);margin-top:4px;}

/* PROGRESS */
.progress-bar{background:var(--bg3);border-radius:4px;height:6px;overflow:hidden;margin:6px 0;}
.progress-dolu{height:100%;border-radius:4px;transition:width 0.3s;}

/* LAYOUT */
.iki-sutun{display:grid;grid-template-columns:1fr 1fr;gap:24px;}
.iki-bolum{display:grid;grid-template-columns:1fr 1fr;gap:24px;}
.iki-sutun-ozet{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-top:10px;min-width:0;width:100%;}
.iki-sutun-ozet > * { min-width: 0; }
.tablo-konteynir{width:100%;overflow-x:auto;min-width:0;}
.bolum-baslik{font-family:var(--font-baslik);font-size:18px;margin-bottom:16px;}
.filtre-bar{display:flex;gap:12px;margin-bottom:16px;align-items:center;flex-wrap:wrap;}
.filtre-ozet{display:flex;gap:16px;font-size:13px;margin-left:auto;flex-wrap:wrap;}

/* RAPORLAR */
.rapor-ozet{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-bottom:24px;}
.rapor-kart{background:var(--bg2);border:1px solid var(--kenar);border-radius:var(--radius);padding:24px;text-align:center;}
.pozitif-bg{border-color:rgba(74,222,128,0.3);}.negatif-bg{border-color:rgba(248,113,113,0.3);}
.rk-label{font-size:12px;color:var(--metin2);text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;}
.rk-deger{font-size:28px;font-weight:700;font-family:var(--font-baslik);margin-bottom:4px;}
.rk-alt{font-size:12px;color:var(--metin2);}
.rapor-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;}
.rapor-satir{display:flex;align-items:center;padding:10px 0;border-bottom:1px solid rgba(30,48,88,0.5);font-size:13px;}

/* KATEGORİLER */
.kategori-satir{display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid rgba(30,48,88,0.5);font-size:14px;}
.kategori-satir.alt{padding-left:20px;font-size:13px;color:var(--metin2);}
.renk-nokta{width:10px;height:10px;border-radius:50%;flex-shrink:0;}
.kategori-satir .btn-sil{margin-left:auto;}

/* TRANSFER */
.transfer-kart{background:var(--bg2);border:1px solid var(--kenar);border-radius:var(--radius);padding:28px;margin-bottom:24px;}
.transfer-form{display:grid;grid-template-columns:1fr auto 1fr;gap:16px;align-items:start;margin-bottom:20px;}
.transfer-blok{display:flex;flex-direction:column;gap:8px;}
.transfer-label{font-size:12px;color:var(--metin2);font-weight:500;}
.transfer-bakiye{font-size:12px;color:var(--metin2);padding:4px 0;}
.kredi-uyari{color:#fbbf24 !important;}
.transfer-ok{display:flex;align-items:center;justify-content:center;font-size:28px;color:var(--altin);padding-top:24px;font-weight:700;}
.transfer-alt{display:grid;grid-template-columns:160px 160px 1fr;gap:16px;margin-bottom:20px;}
.hata-mesaji{background:rgba(248,113,113,0.1);border:1px solid rgba(248,113,113,0.3);color:#fca5a5;padding:10px 16px;border-radius:8px;font-size:13px;margin-bottom:16px;}
.transfer-ozet-satir{display:flex;align-items:center;gap:12px;background:var(--bg3);border:1px solid var(--kenar);border-radius:8px;padding:12px 16px;margin-bottom:16px;font-size:14px;}
.to-kaynak,.to-hedef{font-weight:600;}.to-kaynak{color:var(--negatif);}.to-hedef{color:var(--pozitif);}
.to-miktar{font-family:var(--font-baslik);font-size:18px;font-weight:700;color:var(--altin);margin-left:auto;}
.to-ok{color:var(--metin2);}
.btn-transfer{width:100%;padding:14px;font-size:15px;}
.hizli-transfer-baslik{font-size:12px;color:var(--metin2);text-transform:uppercase;letter-spacing:1px;margin-bottom:12px;}
.hizli-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:12px;}
.hizli-kart{background:var(--bg2);border:1px solid var(--kenar);border-radius:var(--radius);padding:16px;cursor:pointer;transition:all 0.15s;}
.hizli-kart:hover{border-color:var(--altin);background:var(--bg3);}
.hk-ikon{font-size:22px;margin-bottom:8px;}
.hk-baslik{font-size:13px;font-weight:600;margin-bottom:4px;}
.hk-aciklama{font-size:11px;color:var(--metin2);}

/* İŞLEMLER SAYFASI */
.gun-grup{margin-bottom:20px;}
.gun-baslik{display:flex;align-items:center;justify-content:space-between;padding:8px 12px;background:var(--bg3);border-radius:8px;margin-bottom:8px;font-size:13px;}
.gun-baslik-tarih{font-weight:600;color:var(--metin);}
.gun-baslik-ozet{display:flex;gap:12px;font-size:12px;}
.islem-satir{display:flex;align-items:center;gap:12px;padding:10px 12px;border-bottom:1px solid rgba(30,48,88,0.3);transition:all 0.1s;cursor:default;border-left:3px solid transparent;}
.islem-satir:hover{background:var(--bg3);}
.islem-satir.secili{background:rgba(201,168,76,0.1);border-left-color:var(--altin);}
.islem-ikon{width:36px;height:36px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0;}
.islem-bilgi{flex:1;min-width:0;}
.islem-aciklama{font-size:14px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.islem-meta{font-size:11px;color:var(--metin2);margin-top:2px;display:flex;gap:8px;}
.islem-tutar{font-family:var(--font-baslik);font-size:16px;font-weight:600;white-space:nowrap;}
.islem-sil{opacity:0;}
.islem-satir:hover .islem-sil{opacity:1;}
.donem-ozet{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:20px;}
.do-kart{background:var(--bg2);border:1px solid var(--kenar);border-radius:10px;padding:16px;text-align:center;}
.do-label{font-size:11px;color:var(--metin2);text-transform:uppercase;letter-spacing:1px;margin-bottom:6px;}
.do-deger{font-family:var(--font-baslik);font-size:22px;font-weight:700;}

/* WIZARD */
.wizard-overlay{position:fixed;inset:0;background:rgba(6,12,26,0.9);display:flex;align-items:center;justify-content:center;z-index:200;backdrop-filter:blur(6px);}
.wizard-kart{background:var(--bg2);border:1px solid var(--kenar);border-radius:16px;width:540px;max-width:95vw;max-height:90vh;overflow-y:auto;animation:fadeIn 0.2s ease;}
.wizard-header{display:flex;align-items:center;justify-content:space-between;padding:24px 28px 0;}
.wizard-baslik{font-family:var(--font-baslik);font-size:20px;}
.wizard-adim{font-size:12px;color:var(--metin2);}
.wizard-kapat{background:none;border:none;color:var(--metin2);cursor:pointer;font-size:20px;line-height:1;}
.wizard-icerik{padding:24px 28px;}
.wizard-soru{font-size:15px;color:var(--metin2);margin-bottom:20px;}
.wizard-secenekler{display:grid;gap:12px;}
.wizard-secenekler.iki-kol{grid-template-columns:1fr 1fr;}
.wizard-tur-btn{padding:24px;border-radius:12px;border:2px solid var(--kenar);background:var(--bg3);cursor:pointer;text-align:center;transition:all 0.15s;display:flex;flex-direction:column;align-items:center;gap:8px;color:var(--metin);}
.wizard-tur-btn:hover{border-color:var(--altin);}
.wizard-tur-btn.gelir-btn:hover,.wizard-tur-btn.gelir-btn.secili{border-color:var(--pozitif);background:rgba(74,222,128,0.08);}
.wizard-tur-btn.gider-btn:hover,.wizard-tur-btn.gider-btn.secili{border-color:var(--negatif);background:rgba(248,113,113,0.08);}
.wizard-tur-ikon{font-size:32px;}
.wizard-tur-ad{font-size:15px;font-weight:600;}
.wizard-tur-alt{font-size:12px;color:var(--metin2);}
.wizard-secenek{display:flex;align-items:center;gap:12px;padding:14px 16px;border-radius:10px;border:1px solid var(--kenar);background:var(--bg3);cursor:pointer;transition:all 0.15s;color:var(--metin);text-align:left;width:100%;}
.wizard-secenek:hover{border-color:var(--altin);}
.wizard-secenek.secili{border-color:var(--altin);background:rgba(201,168,76,0.1);}
.wizard-accordion{border:1px solid var(--kenar);border-radius:10px;margin-bottom:8px;overflow:hidden;}
.wizard-accordion-baslik{width:100%;padding:12px 16px;background:var(--bg3);border:none;color:var(--metin);font-weight:600;display:flex;justify-content:space-between;align-items:center;cursor:pointer;font-family:var(--font);font-size:14px;}
.wizard-accordion-baslik:hover{background:var(--bg4);}
.wizard-accordion-icerik{padding:8px;display:grid;gap:8px;background:var(--bg2);}
.wa-ok{font-size:12px;transition:transform 0.2s;color:var(--metin2);}
.wizard-accordion.acik .wa-ok{transform:rotate(180deg);}
.ws-renk{width:10px;height:10px;border-radius:50%;flex-shrink:0;}
.ws-ikon{font-size:20px;flex-shrink:0;}
.ws-adi{font-size:14px;font-weight:500;flex:1;}
.ws-bakiye{font-size:12px;color:var(--metin2);}
.wizard-footer{display:flex;gap:12px;padding:20px 28px 28px;justify-content:space-between;border-top:1px solid var(--kenar);}
.wizard-detay-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;}
.wizard-tutar-input{font-size:28px;font-family:var(--font-baslik);background:var(--bg3);border:2px solid var(--kenar);border-radius:10px;padding:16px;color:var(--metin);width:100%;outline:none;text-align:center;}
.wizard-tutar-input:focus{border-color:var(--altin);}
.wizard-ozet-satir{background:var(--bg3);border-radius:10px;padding:16px;margin-bottom:16px;display:grid;gap:8px;}
.wos{display:flex;justify-content:space-between;align-items:center;font-size:13px;}
.wos-label{color:var(--metin2);}
.wos-value{font-weight:600;}
.wos-tutar{font-family:var(--font-baslik);font-size:20px;}

/* HESAP MAKİNESİ */
.calculator-wrapper{background:var(--bg2);border:1px solid var(--kenar);border-radius:12px;width:260px;box-shadow:0 12px 48px rgba(0,0,0,0.6);overflow:hidden;animation:fadeIn 0.2s ease;}
.calculator-header{background:var(--bg3);padding:10px 14px;display:flex;justify-content:space-between;align-items:center;font-size:13px;font-weight:600;color:var(--altin);border-bottom:1px solid var(--kenar);}
.calc-kapat{background:none;border:none;color:var(--metin2);cursor:pointer;font-size:14px;}
.calc-kapat:hover{color:var(--negatif);}
.calculator-screen{padding:16px 14px;font-family:var(--font-baslik);font-size:24px;text-align:right;background:var(--bg2);border-bottom:1px solid rgba(30,48,88,0.5);word-break:break-all;min-height:65px;display:flex;align-items:flex-end;justify-content:flex-end;}
.calculator-keys{display:grid;grid-template-columns:repeat(4,1fr);gap:1px;background:var(--kenar);}
.calc-btn{background:var(--bg3);border:none;padding:14px 10px;font-size:16px;color:var(--metin);cursor:pointer;transition:all 0.1s;font-family:var(--font);}
.calc-btn:hover{background:var(--bg4);}
.calc-btn:active{background:rgba(201,168,76,0.2);}
.calc-btn.calc-op{background:var(--bg2);color:var(--altin);}
.calc-btn.calc-op:hover{background:var(--bg3);}
.calc-btn.calc-eq{background:linear-gradient(135deg,var(--altin),var(--altin2));color:var(--bg);font-weight:bold;}
.calc-btn.calc-eq:hover{opacity:0.9;}

/* BUTONLAR */
.btn{padding:10px 20px;border-radius:8px;border:none;cursor:pointer;font-family:var(--font);font-size:13px;font-weight:500;transition:all 0.15s;}
.btn-altin{background:var(--altin);color:var(--bg);}.btn-altin:hover{background:var(--altin2);}
.btn-ghost{background:transparent;color:var(--metin2);border:1px solid var(--kenar);}.btn-ghost:hover{color:var(--metin);border-color:var(--metin2);}
.btn-danger{background:#7f1d1d;color:#fca5a5;border:1px solid #f87171;}.btn-danger:hover{background:#991b1b;}
.btn-kucuk{padding:6px 12px;font-size:12px;border-radius:6px;border:none;cursor:pointer;font-family:var(--font);font-weight:500;}
.btn-yesil{background:rgba(74,222,128,0.15);color:#4ade80;}.btn-yesil:hover{background:rgba(74,222,128,0.25);}
.btn-kirmizi{background:rgba(248,113,113,0.15);color:#f87171;}.btn-kirmizi:hover{background:rgba(248,113,113,0.25);}
.btn-sil{background:none;border:none;color:var(--metin2);cursor:pointer;font-size:14px;width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;transition:all 0.15s;}
.btn-duz{background:none;border:none;color:var(--metin2);cursor:pointer;font-size:15px;width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;transition:all 0.15s;}.btn-duz:hover{background:rgba(201,168,76,0.2);color:var(--altin);}
.btn-sil:hover{background:rgba(248,113,113,0.2);color:#f87171;}

/* FORMLAR */
.form-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px;}
.form-grup{display:flex;flex-direction:column;gap:6px;}
.form-grup.tam{grid-column:1 / -1;}
.form-grup label{font-size:12px;color:var(--metin2);font-weight:500;}
.input{background:var(--bg3);border:1px solid var(--kenar);border-radius:8px;padding:10px 12px;color:var(--metin);font-family:var(--font);font-size:14px;outline:none;transition:border-color 0.15s;}
.input:focus{border-color:var(--altin);}.input option{background:var(--bg2);}
.color-input{padding:4px;height:40px;cursor:pointer;}

/* MODAL */
.modal-overlay{position:fixed;inset:0;background:rgba(6,12,26,0.85);display:flex;align-items:center;justify-content:center;z-index:100;backdrop-filter:blur(4px);}
.modal-box{background:var(--bg2);border:1px solid var(--kenar);border-radius:var(--radius);padding:28px;width:520px;max-width:95vw;max-height:90vh;overflow-y:auto;animation:fadeIn 0.2s ease;}
.onay-modal{width:380px;text-align:center;}
.onay-modal h3{font-family:var(--font-baslik);font-size:20px;margin-bottom:12px;}
.onay-modal p{color:var(--metin2);margin-bottom:24px;}
.modal-baslik{font-family:var(--font-baslik);font-size:20px;margin-bottom:24px;}
.modal-actions{display:flex;gap:12px;justify-content:flex-end;}

/* BİLDİRİM */
.bildirim{position:fixed;bottom:24px;right:24px;background:var(--bg3);border:1px solid var(--kenar);color:var(--metin);padding:14px 20px;border-radius:10px;font-size:14px;z-index:300;animation:fadeIn 0.2s ease;box-shadow:0 8px 32px rgba(0,0,0,0.4);}
.bildirim.basari{border-color:var(--pozitif);}.bildirim.hata{border-color:var(--negatif);}.bildirim.uyari{border-color:var(--altin);}

/* GENEL */
.pasif{opacity:0.4;filter:grayscale(0.8);pointer-events:all;}
.kategori-satir.active{background:rgba(201,168,76,0.1);border-left:3px solid var(--altin);}
.checkbox-alan{display:flex;align-items:center;gap:8px;font-size:13px;color:var(--metin2);cursor:pointer;margin-top:4px;}
.checkbox-alan input{cursor:pointer;}
@keyframes fadeIn{from{opacity:0;transform:translateY(8px);}to{opacity:1;transform:translateY(0);}}

@media(max-width:1024px){
  .iki-sutun,.iki-bolum,.rapor-grid,.iki-sutun-ozet{grid-template-columns:1fr;}
  .form-grid,.wizard-detay-grid{grid-template-columns:1fr;}
  .rapor-ozet,.donem-ozet{grid-template-columns:1fr;}
  .transfer-form{grid-template-columns:1fr;}
  .transfer-ok{padding-top:0;}
  .transfer-alt{grid-template-columns:1fr 1fr;}
  .wizard-secenekler.iki-kol{grid-template-columns:1fr;}
}
@media(max-width:768px){
  .sidebar{display:none;}
  .sayfa{padding:16px;}
  .kart-grid{grid-template-columns:1fr 1fr;}
  .hizli-grid{grid-template-columns:1fr 1fr;}
}
`;

export default css;
