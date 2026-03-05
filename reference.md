# Uptest-IHM - Référence Détaillée

## Matrices Excel - Détails

### Colonnes exactes (FileUtils.js)

```javascript
const columnKeys = [
  "*** Test Cases ***",
  "${type}",
  "${id}",
  "${ecran}",
  "${msgKOPrevu}",
  "${get}",
  ...Array.from({ length: 15 }, (_, i) => `\${champ${(i + 1).toString().padStart(2, "0")}}`),
  ...Array.from({ length: 10 }, (_, i) => `\${bouton${(i + 1).toString().padStart(2, "0")}}`),
];
```

### Styles

- **Header** : bold, couleur #47586E, bordure
- **INIT** : fond #ffcc99 (orange clair)
- **Autres** : texte #f98d21 (orange), bold

### Identifiants *** Test Cases ***

- INIT → `INIT-Ligne1`, `INIT-Ligne2`, ...
- TEST → `TEST-Ligne1`, ...
- MODEL → `MODEL-Ligne1`, ...
- TEST-MODEL → `TEST-MODEL-Ligne1`, ...

---

## infoKeyword.js - Format des options

### Champ (4 caractères)

| Pos | Valeurs | Signification |
|-----|---------|---------------|
| 1 | 1-15 | Numéro du champ |
| 2 | I, R, C, S | Input, Radio, Checkbox, Select |
| 3 | P, A | P=après libellé, A=avant |
| 4 | A, B, C, D, E, G, ... | Type d'élément (ancre, contenant, checkbox, double-clic, zone+Entrée, etc.) |

### Bouton (2 caractères)

| Pos | Valeurs | Signification |
|-----|---------|---------------|
| 1 | 1-10 | Numéro du bouton |
| 2 | N, F | N=obligatoire, F=facultatif |

### GET (4 caractères)

Format : `VAR_nomVariable##option` (ex. `VAR_champ##1IPV`)

---

## FileUtils - addGrp / addOpt

### addGrp(index, newgrp, ...)

- Ajoute un groupe dans le référentiel CSV (feuillesData[2])
- Structure : `{ name: "# " + newgrp, orderModule, childreen: [] }`
- Calcul orderModule : +100 entre groupes, ou moyenne si insertion au milieu

### addOpt(index, ...)

- Ajoute une option dans un groupe
- Structure : `{ Actif: "O", Instance, OrdreModule, Type: "ModuleSAB", Module, ordreOption, Option, Libelle }`

---

## Upload / Parsing

### uploader.js

- **Excel** : XLSX.read(), feuilles → objets avec clés = noms colonnes
- **CSV référentiel** : refData() parse ligne par ligne
  - Chapitre : `# Nom` → nouveau groupe
  - Données : Actif, Instance, OrdreModule, Module, ordreOption, Option, Libelle, Predecesseur
- **JSON** : pour variables (onglet 4)

---

## Extraction des données et des écrans

**Extraction des données :** Les données proviennent du fichier Excel importé. Chaque feuille est lue par SheetJS (XLSX) : la première ligne = en-têtes de colonnes (`${type}`, `${id}`, `${ecran}`, `${champ01}` à `${champ15}`, `${bouton01}` à `${bouton10}`, etc.), les lignes suivantes = lignes de données. Chaque ligne devient un objet dont les clés sont les en-têtes et les valeurs le contenu des cellules. Ces objets sont stockés dans `feuillesData[activeTab][nomFeuille]`, un tableau d’objets.

**Extraction des écrans :** La fonction `getObjectsByTestIdInSheet(feuille, id)` filtre ce tableau : en mode test, elle garde les lignes où `obj["${type}"] === "TEST"` et `obj["${id}"] === id` ; en mode définition, celles où `obj["${type}"] === "INIT"`. Chaque élément du tableau filtré = un écran. Le **nombre d’écrans** = nombre de lignes qui correspondent (une ligne = un écran).

**Nombre de champs par écran pour le bouton Champs :** La fonction `getInitObjectByEcran(feuille, nomEcran)` cherche la **première ligne INIT** dont `obj["${ecran}"] === nomEcran`. Elle parcourt toutes les propriétés de cet objet : celles dont le nom contient `"champ"` (ex. `${champ01}` à `${champ15}`) sont regroupées dans un tableau `champs`, celles contenant `"bouton"` dans `boutons`. Le **nombre de champs** affichés dans la modal Champs = nombre de colonnes champ présentes dans la ligne INIT (au maximum 15). Chaque entrée a la forme `{ key: "${champ01}", value: "libellé##option", comment }`. Le bouton Champs apparaît une fois **par écran** dans la liste des écrans ; chaque clic ouvre la modal des champs de cet écran précis.

### findValueByKeyPattern(item, patterns)

- Cherche une valeur dont la clé correspond au motif (insensible casse)
- Ex. : "actif", "active" pour colonne Actif

---

## IPC Electron

### Handlers

- `generate-csv-and-run` : exécution des tests (défini dans index.js)
- `auto-load-excel` : chargement fichier via `--source-file` en CLI
- `open-file-dialog` : dialogue sélection fichier

### Variables d'environnement

- `PORTABLE_EXECUTABLE_DIR` : dossier de l'exe (si portable)
- `PYTHONIOENCODING: "utf-8"` : passé à spawn pour Python

---

## Logs

- Fichier : `ref_and_log_temp/upTest_log.txt`
- Contenu : timestamp, commande exécutée, stdout, erreurs, code de sortie
- Supprimé avec le dossier à la fin

---

## Structure des vues

### InitFile (isDefinition = true)

- DragDropContext pour réordonner les écrans
- Par écran : Champs, Boutons, GET (si !isDefinition), Supprimer
- ChampsModal, BoutonsModal, GetModal

### TestsFile (activeTab=1, !isDefinition)

- Même structure + msgKOPrevu
- CustomFormControl : Input, Select, Radio, Checkbox selon type
- FlexMenuButton pour ordre des boutons

### TestsSoapFile (activeTab=3)

- Similaire à TestsFile
- GET affiché si écran contient "Response"
- Bloc MODEL avec tests associés

### TestsModelFile (activeTab=1, currentTest=MODEL)

- FormControlModel pour champs modèle
- Bloc "Tests associés au Model"

---

## Variables spéciales

- `##DAT_TODAY##` : date du jour (remplacée par le core)
- `##` : séparateur dans GET (VAR_champ##option)
