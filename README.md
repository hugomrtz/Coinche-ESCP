# 🃏 Coinche ESCP - Le Jeu

Bienvenue dans l'implémentation officielle de la Coinche règles ESCP (Amicale du Sud-Ouest).  
Ce projet est une application web moderne (React + Vite) permettant de jouer contre 3 bots intelligents et agressifs.

## 🚀 Fonctionnalités Clés
- **IA Drillée** : Les bots sont programmés pour soutenir leur partenaire et signaler la Belote via des enchères stratégiques (ex: annonce de 100).
- **Règles ESCP Complètes** : 
    - Distribution 3-3-2.
    - **Belote & Rebelote** (+20 pts).
    - **10 de Der** (+10 pts pour le dernier pli).
    - Sens anti-horaire strict.
- **Feedback & ML** : Système de notation des bots par étoiles et collecte de données JSON pour l'entraînement d'un modèle futur.
- **Interface Premium** : Design en verre (Glassmorphism), animations de cartes fluides et bulles de dialogue pour les annonces.

## 🛠️ Installation et Lancement

1. Clonez le dépôt et accédez au dossier :
   ```bash
   git clone https://github.com/hugomrtz/Coinche-ESCP.git
   cd coinche-escp
   ```

2. Installez les dépendances :
   ```bash
   npm install
   ```

3. Lancez le jeu :
   ```bash
   npm run dev
   ```
   Ouvrez ensuite `http://localhost:5173`.

## 🎮 Règles du Jeu (ESCP)
- **Enchères** : Minimum 82. 
- **Coinche** : Multiplie les points par 2 (Surcoinche x4).
- **Contrat** : Pour gagner une manche, l'équipe preneuse doit atteindre son contrat. En cas de chute, l'adversaire marque 160 points + bonus.
- **Belote** : Explicitée visuellement lors du jeu.

## 🧠 Système de Feedback
À la fin de chaque manche, vous pouvez noter la performance de votre partenaire bot (P2). Ces données sont stockées dans le fichier de training exportable.

Bonne Gigue ! 🏁
