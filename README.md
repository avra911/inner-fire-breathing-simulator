# 🧊 Advanced Breathing Simulator

An immersive, interactive breathing exercise simulator inspired by the inner fire Method and traditional Tummo breathing. Built from the ground up with **React Native & Expo**, featuring beautiful animated graphics, dynamic color themes, haptic feedback, and full offline capabilities.

[![Live Demo](https://img.shields.io/badge/Demo-Live_on_GitHub_Pages-success?style=for-the-badge)](https://avra911.github.io/inner-fire-breathing-simulator/)

## ✨ Key Features

- **🫁 Animated Anatomic Lungs:** Smooth, 3D-ish SVG lungs that organically expand and contract, guiding your breath rate visually.
- **🎨 Dynamic "Level-Up" Themes:** The UI evolves as you progress through rounds. Colors shift from grounding Green, to oxygenating Cyan, deep Blue, and all the way to pure White for advanced rounds.
- **🔊 Audio & Haptics:** Precise audio cues for inhaling, exhaling, and breath holds, paired with native haptic vibrations (on supported mobile devices) for eyes-closed sessions.
- **⚙️ Fully Customizable:** - Preparation time
  - Number of rounds & breaths per round
  - Breathing pace (inhale/exhale duration)
  - Retention (hold) times and recovery breaths
- **📶 100% Offline Ready (PWA):** Powered by Google Workbox. Install it on your phone's home screen or desktop and use it in the middle of a forest—no internet required.
- **📱 Cross-Platform:** Built with React Native. Runs seamlessly in the web browser, but can be easily compiled to native Android (.apk/.aab) and iOS apps.

## 🚀 Live Demo

Try the app right now in your browser (Works best on mobile or a narrowed desktop window):  
👉 **[Play Live Demo](https://avra911.github.io/inner-fire-breathing-simulator/)**

## 💻 Installation & Local Development

Want to run it locally or build it for your phone? 

1. **Clone the repository:**
   ```bash
   git clone [https://github.com/avra911/inner-fire-breathing-simulator.git](https://github.com/avra911/inner-fire-breathing-simulator.git)
   cd inner-fire-breathing-simulator
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Run the local Expo server:**
   ```bash
   # Start the Expo bundler
   npx expo start --go

   # Press 'w' in the terminal to open the web version
   # Or scan the QR code with the Expo Go app on your phone
   ```

## 🌐 How to Deploy (GitHub Pages & PWA)

This project uses `gh-pages` and `workbox-cli` to automatically build, generate the offline Service Worker, and deploy to GitHub Pages.

To deploy your own version:
1. Update the `"homepage"` URL in `package.json` and `"baseUrl"` in `app.json` with your GitHub username.
2. Run the deployment script:
   ```bash
   npm run deploy
   ```

## 🛠 Tech Stack
- **Framework:** React Native & Expo (Expo Web)
- **Animations:** React Native Reanimated / Animated API
- **Graphics:** React Native SVG
- **Offline/PWA:** Workbox (Service Workers)
- **Deployment:** GitHub Pages

---

*Disclaimer: This is a fan-made, open-source project created for personal development and well-being. It is not officially affiliated with Wim Hof or Innerfire BV.*