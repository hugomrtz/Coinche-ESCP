# Coinche ESCP - Le Jeu

Bienvenue dans l'implémentation officielle de la Coinche règles ESCP (Amicale du Sud-Ouest).
Ce projet est une application web React unique (SPA) pour jouer contre 3 bots.

## Prérequis
- Node.js (v16 ou supérieur)
- npm

## Installation

1. Accédez au dossier du projet :
   ```bash
   cd coinche-escp
   ```

2. Installez les dépendances :
   ```bash
   npm install
   ```

## Lancer le jeu

Pour démarrer le serveur de développement :

```bash
npm run dev
```

Ouvrez ensuite votre navigateur sur l'URL indiquée (généralement `http://localhost:5173`).

## Règles Implémentées (ESCP)
- **Distribution** : 3-3-2 (total 8 cartes).
- **Enchères** : Minimum 82. Pas de Sans Atout / Tout Atout.
- **Sens du jeu** : Anti-horaire (0 -> 1 -> 2 -> 3).
- **Points** : 160 points par manche. Contrat = Total, Chute = 0 pour vous, 160 pour adversaire.
- **Coinche** : x2. Surcoinche non implémentée (MVP).
- **Belote** : Non comptabilisée automatiquement pour l'instant (MVP).

## Controles
- **Enchères** : Sélectionnez une couleur (H/D/C/S) puis un montant.
- **Jeu** : Cliquez sur une carte pour la jouer. Si la carte est grisée, elle n'est pas valide selon les règles (Couleur, Coupe, Surcoupe).

Bonne Gigue !
# Coinche-ESCP
# Coinche-ESCP
