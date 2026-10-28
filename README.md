# ♟️ Šachový kalendář tréninků

Moderní, responzivní webová aplikace navržená pro šachisty a klubové hráče k evidenci pravidelných šachových tréninků se zaměřením na **středy** a **čtvrtky**.

## ✨ Hlavní funkce

- **🗓️ Zaměření na středu a čtvrtek**: Automatické vizuální zvýraznění a odznáčky pro hlavní tréninkové dny (Středa & Čtvrtek).
- **✅ Rychlé odškrtávání**: Označení splněného tréninku jedním kliknutím přímo z přehledu kalendáře.
- **🔢 Počítadlo tréninků**: Možnost zaznamenat, kolik tréninků v daný den proběhlo (1, 2 nebo více) pomocí tlačítek `+` a `-` nebo v detailu dne.
- **📝 Poznámky k partiím a tréninkům**: Zápis rozborů, odehraných zahájení, témat přednášek, odkazů na partie a zjištěných chyb.
- **🏷️ Šachové štítky**: Rychlé označení témat – Taktika & Diagramy, Teorie zahájení, Rozbor vlastních partií, Trénink koncovek, Cvičné partie / Bleskovky, Lekce s trenérem / Klub.
- **📊 Statistiky a přehledy**:
  - Celkový počet absolvovaných šachových lekcí v měsíci.
  - Procentuální docházka na středeční a čtvrteční tréninky.
  - Počet zapsaných rozborů a poznámek.
  - Aktivní tréninková série v týdnech.
- **🔍 Filtrování pohledu**: Přepínání mezi kompletním kalendářem a pohledem zaměřeným pouze na tréninkové dny (St & Čt).
- **💾 Automatické ukládání**: Všechna data se ukládají lokálně v prohlížeči (`localStorage`).
- **📦 Export & Záloha**: Export do formátu JSON a tabulky CSV (Excel, Google Sheets), možnost snadné obnovy.
- **🌙 Tmavý & Světlý režim**: Podpora tmavého i světlého motivu s pamětí.

## 🚀 Spuštění

Stačí otevřít soubor `index.html` v libovolném webovém prohlížeči, nebo spustit lokální server:

```bash
npx serve .
```

## 🛠️ Technologie

- HTML5, moderní CSS3 a **Tailwind CSS**
- Čistý JavaScript (ES6+) bez dalších závislostí
- Připraveno pro nasazení na **Vercel**

## 📄 Licence

MIT
