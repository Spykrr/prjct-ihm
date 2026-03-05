---
name: uptest-project-knowledge
description: Connaissance complète du projet Uptest-IHM (matrices Excel, exécution des tests, CSV référentiel, variables, formulaires). Use when working on Uptest-IHM, recoding the app, understanding test flow, matrices, or architecture.
---

# Uptest-IHM - Connaissance Complète du Projet

## 1. Stack Technique

| Couche | Technologie |
|--------|-------------|
| Shell desktop | Electron 25 |
| Frontend | React 17 |
| UI | Chakra UI, MUI |
| Spreadsheet | SheetJS (xlsx) |
| Build | Create React App (react-scripts) |

---

## 2. Matrices Excel - Structure

### Colonnes (FileUtils.js)

```
*** Test Cases *** | ${type} | ${id} | ${ecran} | ${msgKOPrevu} | ${get} | ${champ01}-${champ15} | ${bouton01}-${bouton10}
```

### Types de lignes

| ${type} | Rôle | Style |
|---------|------|-------|
| INIT | Définition écrans, champs, boutons | Fond orange #ffcc99 |
| TEST | Valeurs des tests | Texte orange #f98d21 |
| MODEL | Modèle réutilisable | Idem |
| TEST-MODEL | Tests basés sur modèle | Idem |

### Variables template (littérales dans le code)

- `${type}`, `${id}`, `${ecran}`, `${msgKOPrevu}`, `${get}`
- `${champ01}` à `${champ15}` : champs de saisie
- `${bouton01}` à `${bouton10}` : boutons

### Format GET

`VAR_champ##1IPV` = variable_champ##option (4 caractères)

### Format Champ (4 car.)

- Pos 1: numéro (1-15)
- Pos 2: I=Input, R=Radio, C=Checkbox, S=Select
- Pos 3: P=après libellé, A=avant
- Pos 4: A=ancre, B=contenant, C=checkbox, D=double-clic, E=zone+Entrée, G=...

### Format Bouton (2 car.)

- Pos 1: numéro (1-10)
- Pos 2: N=obligatoire, F=facultatif

---

## 3. Exécution des Tests

### Flux complet

```
Clic "Exécuter" (Tree.js) → runTest() → generateExcel() → IPC "generate-csv-and-run" → index.js → spawn(Uptest-Core.bat)
```

### runTest() (Tree.js ~900)

1. Détermine la feuille (parent si item = test)
2. Récupère `sheetData` depuis `feuillesData[activeTab][feuilleToUse]`
3. Filtre : `obj["${id}"] === item.label` OU `obj["${type}"] === "INIT"`
4. Appelle `generateExcel(XLSX, testToRun, openDialog, fileName, activeTab, feuilleToUse, true)`

### generateExcel() (FileUtils.js)

- Crée workbook avec `XLSX.utils.book_new()`
- Colonnes fixes (voir §2)
- Styles : header, INIT (orange), autres (orange gras)
- Export buffer binaire
- Appelle `openDialog(..., excelBuffer, currentFeuille)`

### openDialog() (Tree.js)

- `ipcRenderer.invoke("generate-csv-and-run", { nomFichier, feuille, excelBuffer })`
- Toast chargement / succès / erreur

### IPC handler (index.js)

1. Lit `config.json`
2. Écrit Excel → `PATH_TO_TESTS_FILES/_temp_{nomFichier}`
3. Crée `ref_and_log_temp/referentiel_temp_{timestamp}.csv`
4. Header CSV : `Actif;Instance;OrdreModule;Module;ordreOption;Option;Libelle;Predecesseur;Param1;...;Param10;`
5. Ligne : `O;Inst01;00500;{nomSansExtension};130;{feuille};N;;;;;;;`
6. `spawn(PATH_TO_UPTEST_BAT, [filepath], { shell: true, env })`
7. À la fin : suppression `_temp_*` et dossier `ref_and_log_temp`
8. Succès si `code === 0`

### config.json

```json
{
  "PATH_TO_TESTS_FILES": "./output-matrices",
  "PATH_TO_UPTEST_BAT": "./Uptest-Core.bat",
  "SUFFIX_TEST_FILES_TEMP": "_temp",
  "FOLDER_REF_AND_LOG_TEMP": "ref_and_log_temp"
}
```

### Calcul des résultats

- **L'IHM ne calcule pas** les résultats.
- Elle vérifie uniquement le code de sortie (0 = succès).
- Le calcul pass/fail est fait dans **Uptest-Core** (externe, hors repo).

---

## 4. CSV Référentiel

### Format exact (index.js)

```
Actif;Instance;OrdreModule;Module;ordreOption;Option;Libelle;Predecesseur;Param1;Param2;...;Param10;
O;Inst01;00500;{nomSansExtension};130;{feuille};N;;;;;;;
```

### Lecture (uploader.js refData())

- Lignes chapitre : `# Portefeuille`
- Lignes données : `N;Inst01;00100;BAS;100;MAJTaux;...`
- Colonnes : Actif/Active, Instance/Inst, OrdreModule/OrdreDansInstance, ordreOption/OrdreDansGroupe, Predecesseur
- Structure : instances → groupes (childreen) → options

### Predecesseur (RefValidFormat.js)

- Format : `Instance##OrdreModule##OrdreOption##Module`
- Exemple : `Inst01##02600##240##PTF`
- Regex : `^[^#]+(##[^#]+){3}$`

---

## 5. Variables (onglet 4)

| Type | Préfixe | Structure |
|------|---------|-----------|
| lists | - | `{ listName: [item1, ...] }` |
| fixed_vars | VAR_ | `{ VAR_name: value }` |
| amount_ranges | MNT_ | `{ MNT_name: [min, max] }` |
| passwords | PWD_ | `{ PWD_name: value }` |

---

## 6. Onglets (activeTab)

| ID | Nom | Fichier |
|----|-----|---------|
| 1 | Gérer les tests | Excel |
| 2 | Ordonnancer les tests | CSV |
| 3 | Gérer les tests Soap | Excel |
| 4 | Gérer les variables | JSON |

---

## 7. Fichiers Clés

| Fichier | Rôle |
|---------|------|
| `index.js` | Electron main, IPC generate-csv-and-run |
| `config.json` | Chemins exécution |
| `src/utils/FileUtils.js` | generateExcel, addGrp, addOpt |
| `src/utils/infoKeyword.js` | getInfoByKeyword (aide champs/boutons/GET) |
| `src/utils/RefValidFormat.js` | Validation Predecesseur |
| `src/components/sidebar/components/Tree.js` | Arbre, runTest, CRUD |
| `src/views/admin/initForm/InitFile.js` | Définition INIT |
| `src/views/admin/gestionTest/TestsFile.js` | Tests (onglet 1) |
| `src/views/admin/gestionTest/TestsSoapFile.js` | Tests Soap (onglet 3) |
| `src/views/admin/gestionModel/TestsModelFile.js` | MODEL |
| `src/views/admin/ordananceTest/RefTestFile.js` | Référentiel |
| `src/contexts/SidebarContext.js` | État global |

---

## 8. Contexte (feuillesData)

```
feuillesData = {
  "1": { "Feuille1": [ { "${type}": "INIT", ... }, { "${type}": "TEST", "${id}": "Test1", ... } ] },
  "2": { "Sheet1": [ { name: "Inst01", childreen: [ { name: "# Groupe1", orderModule: 100, childreen: [...] } ] } ] },
  "3": { ... },
  "4": { lists: {...}, fixed_vars: {...}, amount_ranges: {...}, passwords: {...} }
}
```

---

## 9. Règles UI

- **isDefinition** : mode définition (INIT) vs mode test
- Bouton GET masqué quand `isDefinition` (InitFile)
- Champs remplis : fond vert `rgba(29, 185, 84, 0.3)` avec `data-filled="true"`
- Écran "Contexte" : pas de bouton GET

---

## Référence détaillée

Voir [reference.md](reference.md) pour plus de détails sur les formats, utils et flux.
