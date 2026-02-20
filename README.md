# DL WMS Level-2000 (starter)

Implémentation iPhone-first, hors-ligne par défaut, avec PWA + IndexedDB + module **Remise** complet.

## Modules livrés
- Core: `eventBus`, `stateEngine`, `storageEngine` (IndexedDB), `syncEngine` (stub structuré), `aiAdapter` (heuristique), `validator`, `auditEngine`, `performance`.
- Métier: `remise` (générer, queue, traitement, historique), autres modules en skeleton.

## Démarrage local
Servir le dossier avec un serveur statique puis ouvrir sur navigateur mobile.

## Vérification rapide
```bash
node tests/unit/validator.test.mjs
```

## Notes
- Authentification: non spécifiée.
- API serveur: non spécifiée.
