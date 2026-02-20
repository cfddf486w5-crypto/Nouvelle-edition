# Nouvelle-edition — DL WMS Hub

Prototype **mobile-first** d’un hub logistique unifié, conçu pour fonctionner sur iPhone via **GitHub Pages**.

## Contenu livré

- Interface simple et rapide pour terrain/supervision.
- Données locales offline (`localStorage`).
- Modules MVP inclus :
  - Objectifs globaux DL WMS
  - Tâches opérationnelles rapides
  - Consolidation bins (P1–P7)
  - Remise en stock Laval (ID `LAVREM####`)
  - Scan palette (ID `BE#######`)
  - KPI direction de base
- Export / import JSON pour sauvegarde manuelle.

## Déploiement GitHub Pages

1. Pousser la branche sur GitHub.
2. Dans **Settings → Pages** du repo :
   - **Source**: `Deploy from a branch`
   - **Branch**: `main` (ou votre branche de publication), dossier `/ (root)`
3. Ouvrir l’URL Pages depuis iPhone.

## Fichiers

- `index.html` : structure de l’application.
- `styles.css` : style mobile-first.
- `app.js` : logique offline, stockage, formulaires, KPI.

## Évolution recommandée

- Ajouter import CSV (Latin-1 robuste) pour inventaire/réception.
- Générer PDF/Excel natif (ou via worker/service externe).
- Ajouter workflow superviseur/dispatcher.
- Ajouter règles de parcours et recommandations automatiques.
