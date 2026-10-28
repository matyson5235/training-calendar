# 🏋️ Training Calendar & Tracker

A modern, responsive web application designed for athletes and fitness enthusiasts to track weekly training sessions with a special focus on **Wednesdays** and **Thursdays**.

![Training Calendar Preview](screenshot.png)

## ✨ Features

- **🗓️ Wednesday & Thursday Focus**: Special highlight indicators and checkmark badges for target Wednesday and Thursday workout days.
- **✅ Quick Checkmarks**: Toggle training completion directly from the calendar grid with one click.
- **🔢 Training Count Tracker**: Easily record how many training sessions you completed each day (1, 2, or more) using quick `+` and `-` buttons or the detailed day modal.
- **📝 Detailed Notes**: Record comprehensive training reflections, drills, exercises completed, and workout intensity.
- **🏷️ Quick Focus Tags**: Tag sessions with Gym, Running, Swimming, Practice, Mobility, Match, and more.
- **📊 Real-time Analytics**:
  - Total training sessions logged this month.
  - Wednesday & Thursday target attendance rate (%).
  - Detailed notes count.
  - Active weekly training streaks.
- **🔍 View Modes**: Switch between "All Days" view and a focused "Wed & Thu Only" view.
- **💾 Local Persistence**: All data is automatically saved in browser `localStorage`.
- **📦 Data Portability**: Export your data to JSON backup or CSV spreadsheet (compatible with Excel & Google Sheets), and restore backups anytime.
- **🌙 Dark & Light Mode**: Seamless theme switching with system preference detection.

## 🚀 Getting Started

Simply open `index.html` in any web browser, or serve using any static web server:

```bash
# Using npx serve
npx serve .

# Or using Node http-server
npx http-server .
```

## 🛠️ Tech Stack

- **HTML5 & CSS3** with modern responsive layout
- **Tailwind CSS** (via CDN)
- **Vanilla JavaScript (ES6+)** with zero dependencies
- **Vercel** deployment ready

## 📄 License

MIT
