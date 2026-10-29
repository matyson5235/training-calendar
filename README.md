# 🛡️ Secret Apps Portal • secret.apartmanytobias.cz

A secure, protected personal web portal hosting private tools and dashboards with custom PIN lock protection.

## 🚀 Live Applications

- **♟️ Chess Training Calendar**: Focused tracker for Wednesday and Thursday chess training sessions, exercise counters, game notes, reflections, and streak analytics.
- **🐝 BSS Autorestart Dashboard**: Real-time cloud multi-instance management dashboard with PC switching (Main / Alt PC), 30s watchdog, remote command dispatch, and live status.

## 🔒 Security Features

- **Master PIN / Password Gate**: Full-screen authentication screen with SHA-256 hashed verification and client-side salting.
- **Default Master PIN**: `1234` (can be changed anytime via in-portal settings).
- **Persistent Sessions**: Option to remember authorized devices.
- **Instant Lock**: One-click lock button in the header to re-secure the portal instantly.
- **Edge Security**: Domain proxied via Cloudflare with full HTTPS SSL encryption.

## 📱 Mobile & Responsive Experience

- Responsive grid view and dedicated mobile agenda view.
- Touch-friendly on-screen numpad for fast unlocking on phones.
- Mobile bottom-sheet modals with safe area padding.

## 🛠️ Tech Stack

- **HTML5 & CSS3** with **Tailwind CSS**
- **Vanilla JavaScript (ES6+)** with Web Crypto API (SHA-256)
- **Vercel** serverless hosting & **Cloudflare** edge DNS proxy
- **Swift 6 & xtool** for iOS IPA packaging

## 📄 License

MIT
