# Coinche ESCP

Coinche ESCP is a local web-based implementation of the Coinche card game.  
The application lets a single player compete against three bots following the **ESCP Coinche ruleset**.  
The project focuses on clear rule implementation, partner-aware behavior, and a modern, readable user interface.

## Key Features

- Full implementation of **ESCP Coinche rules**
- Play against **two aggressive bots and with a partner-aware bots**
- Clear visual feedback for bids, Belote announcements, and tricks
- Modern UI with smooth card animations and glassmorphism styling
- Post-round feedback system to evaluate AI partner behavior

## Game Rules (ESCP Summary)

The game follows standard ESCP Coinche rules:

- **Card dealing:** 3-3-2 distribution
- **Turn order:** Strictly counter-clockwise
- **Belote & Rebelote:** +20 points
- **10 de Der:** +10 points for the last trick
- **Bidding:**
  - Minimum bid: **80**
  - A contract is validated only if the declaring team scores **at least 82 points**
- **Coinche:** Contract score ×2
- **Surcoinche:** Contract score ×4
- **Contract failure:**  
  If the declaring team fails, the opponents score **160 points plus bonuses**
- **Belote announcements:** Explicitly displayed during gameplay

No additional house rules or custom scoring are applied.

## AI Design Overview

The AI system is designed to reflect realistic Coinche behavior rather than random play:

- Bots play **aggressively** and prioritize winning contracts
- Each bot is **partner-aware** and adapts decisions to support its teammate
- Bidding logic allows bots to **signal hand strength** (e.g. announcing 100)
- Decision-making focuses on collaboration rather than isolated optimization

The goal is not perfect play, but **credible, readable AI behavior** consistent with human Coinche dynamics.

## Feedback & Data Collection

At the end of each round, the player can rate the performance of their partner bot.

- Ratings are stored as **JSON data**
- The data is intended for **future analysis or potential ML experimentation**
- No model is trained or embedded at this stage

This system is designed to keep the project extensible without overclaiming current capabilities.

## Installation & Local Development

1. Clone the repository
```bash
git clone https://github.com/hugomrtz/Coinche-ESCP.git
cd coinche-escp

2. Install dependencies
npm install

3. Start the development server
npm run dev


Once the server is running, open your browser and navigate to:

http://localhost:5173

Enjoy your gigue
