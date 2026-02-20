# DL WMS Level-2000 (starter)

Implémentation iPhone-first, hors-ligne par défaut, avec PWA + IndexedDB + module **Remise** complet.

## Modules livrés
- Core: `eventBus`, `stateEngine`, `storageEngine` (IndexedDB), `syncEngine` (stub structuré), `aiAdapter` (heuristique), `validator`, `auditEngine`, `performance`.
- Métier: `remise` (générer, queue, traitement, historique), autres modules en skeleton.
- Schéma principal JSON Schema Draft 2020-12: `schemas/dlwms.level2000.schema.json` (alias conservé: `schemas/dlwms.v2000.schema.json`).

## Démarrage local
Servir le dossier avec un serveur statique puis ouvrir sur navigateur mobile.

## Vérification rapide
```bash
node tests/unit/validator.test.mjs
```

## Notes
- Authentification: non spécifiée.
- API serveur: non spécifiée.

## Documentation
- Inventaire pages/projets DL WMS: `docs/inventaire-dl-wms.md`.
