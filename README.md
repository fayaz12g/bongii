# Bongii

[Bongii](https://bongii.fayaz.one) is a free, customizable, real-time bingo game you can play with friends, family, or entire communities.  

Host a campaign, invite others with a code, and enjoy bingo like never before—complete with playful visuals and background music!  

---

## ✨ Features
- 🏆 **Custom Campaigns** – Create your own bingo campaign with unique categories and items.  
- 🔗 **Easy Sharing** – Share a campaign code so others can join instantly.  
- ⚡ **Real-Time Gameplay** – Powered by Socket.IO so everyone stays in sync.  
- 🎶 **Background Music** – Add a fun, immersive game-night vibe.  
- 👥 **Host & Player Roles** – Hosts moderate and call items, while players mark their boards.  
- 🔐 **Google Sign-In** – Quickly create an account or log in with Google.  

---

## 🌐 Play Online
👉 Try it now for free at: **[bongii.fayaz.one](https://bongii.fayaz.one)**  

1. **Sign in** (with Google or a Bongii account)  
2. **Create a campaign** or **join an existing one** with a code  
3. **Play bingo in real-time** with friends, family, or your community 🎉  

---

## 🚀 Local Development

### Prerequisites
- [Node.js](https://nodejs.org/) (v18+ recommended)  
- [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/)  

### Installation
```bash
# Clone the repo
git clone https://github.com/your-username/bongii.git
cd bongii

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env
```

Fill in your `.env` file with required values (Google OAuth keys, JWT secret, etc.).  

### Running Locally
```bash
npm run dev
```

Visit `http://localhost:3000` in your browser.  

---

## 🛠 Tech Stack
- **Frontend:** React / Next.js  
- **Backend:** Node.js + Express  
- **Real-time:** Socket.IO  
- **Database:** SQLite (with Fly.io volumes)  
- **Auth:** Google OAuth 2.0 + JWT  
- **Hosting:** Fly.io  

---

## 📦 Deployment
Deploy to Fly.io with:
```bash
fly deploy
```

Make sure your Fly.io app has a volume mounted for persistent database storage.  

---

## 🤝 Contributing
Contributions are welcome!  
If you’d like to improve Bongii:
1. Fork the repo  
2. Create a feature branch (`git checkout -b feature-name`)  
3. Commit changes (`git commit -m "Add feature"`)  
4. Push to your fork (`git push origin feature-name`)  
5. Open a Pull Request  

---

## 📜 License
MIT License © 2025 Fayaz  

---

## 🌟 Acknowledgements
- Inspired by classic **Bingo**, reimagined for the web  
- Built with ❤️ for game nights, classrooms, and community fun  
