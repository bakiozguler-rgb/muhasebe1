import { useState, useEffect, useCallback } from "react";

export default function Calculator({ onResult, onKapat }) {
    const [ekran, setEkran] = useState("");

    const tikla = useCallback((deger) => {
        setEkran((onceki) => onceki + deger);
    }, []);

    const temizle = useCallback(() => {
        setEkran("");
    }, []);

    const sil = useCallback(() => {
        setEkran((onceki) => onceki.slice(0, -1));
    }, []);

    const hesapla = useCallback(() => {
        try {
            if (!ekran) return;
            // eslint-disable-next-line no-eval
            const sonuc = eval(ekran.replace(/,/g, '.'));
            if (!isNaN(sonuc) && isFinite(sonuc)) {
                onResult(sonuc.toString());
            }
        } catch (e) {
            setEkran("Hata");
            setTimeout(() => setEkran(""), 1000);
        }
    }, [ekran, onResult]);

    useEffect(() => {
        const handleKeyDown = (e) => {
            // İzin verilen tuşlar
            const key = e.key;
            if (/[0-9]/.test(key)) {
                e.preventDefault();
                tikla(key);
            } else if (key === '+' || key === '-' || key === '*' || key === '/') {
                e.preventDefault();
                tikla(key);
            } else if (key === '.' || key === ',') {
                e.preventDefault();
                tikla(',');
            } else if (key === 'Enter' || key === '=') {
                e.preventDefault();
                hesapla();
            } else if (key === 'Backspace') {
                e.preventDefault();
                sil();
            } else if (key === 'Escape') {
                e.preventDefault();
                onKapat();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [tikla, hesapla, sil, onKapat]);

    return (
        <div className="calc-overlay" style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.5)" }} onClick={onKapat}>
            <div className="calculator-wrapper" onClick={e => e.stopPropagation()}>
                <div className="calculator-header">
                    <span>Hesap Makinesi</span>
                    <button onClick={onKapat} className="calc-kapat">✕</button>
                </div>
                <div className="calculator-screen">
                    {ekran || "0"}
                </div>
                <div className="calculator-keys">
                    <button className="calc-btn calc-op" onClick={temizle}>C</button>
                    <button className="calc-btn calc-op" onClick={sil}>⌫</button>
                    <button className="calc-btn calc-op" onClick={() => tikla("/")}>÷</button>
                    <button className="calc-btn calc-op" onClick={() => tikla("*")}>×</button>

                    <button className="calc-btn" onClick={() => tikla("7")}>7</button>
                    <button className="calc-btn" onClick={() => tikla("8")}>8</button>
                    <button className="calc-btn" onClick={() => tikla("9")}>9</button>
                    <button className="calc-btn calc-op" onClick={() => tikla("-")}>-</button>

                    <button className="calc-btn" onClick={() => tikla("4")}>4</button>
                    <button className="calc-btn" onClick={() => tikla("5")}>5</button>
                    <button className="calc-btn" onClick={() => tikla("6")}>6</button>
                    <button className="calc-btn calc-op" onClick={() => tikla("+")}>+</button>

                    <button className="calc-btn" onClick={() => tikla("1")}>1</button>
                    <button className="calc-btn" onClick={() => tikla("2")}>2</button>
                    <button className="calc-btn" onClick={() => tikla("3")}>3</button>
                    <button className="calc-btn calc-eq" style={{ gridRow: "span 2" }} onClick={hesapla}>=</button>

                    <button className="calc-btn" style={{ gridColumn: "span 2" }} onClick={() => tikla("0")}>0</button>
                    <button className="calc-btn" onClick={() => tikla(".")}>,</button>
                </div>
            </div>
        </div>
    );
}
