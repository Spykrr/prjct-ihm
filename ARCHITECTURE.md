# Uptest-v2 - Structure des dossiers et contenu

Chemin du projet : `C:\Users\othma\uptest-v2`

---

## Vue d'ensemble

```
uptest-v2/
├── electron/                 # Processus principal Electron
├── packages/
│   ├── core/                 # Logique métier partagée
│   └── ui/                   # Application React
├── config.json
├── index.js                  # Point d'entrée Electron (ou electron/main.js)
├── loading.html
├── logo.png
└── package.json
```

---

## 1. `electron/` – Processus Electron

| Fichier | Contenu | Source original |
|---------|---------|-----------------|
| `main.js` | Fenêtre principale, IPC handlers, spawn Uptest-Core.bat | `Uptest-IHM/index.js` |
| `preload.js` | contextBridge pour IPC sécurisé (optionnel) | - |

**Fonctions à inclure :**
- `createMainWindow()`, `createLoadingWindow()`
- `ipcMain.handle("generate-csv-and-run", ...)` – exécution des tests
- `ipcMain.handle("auto-load-excel", ...)` – chargement fichier via CLI
- Lecture `config.json`, écriture Excel, génération CSV référentiel, `spawn()`

---

## 2. `packages/core/` – Logique métier

| Fichier | Contenu | Source original |
|---------|---------|-----------------|
| `fileUtils.ts` | generateExcel(), generateWorksheetFromData(), addGrp(), addOpt() | `src/utils/FileUtils.js` |
| `infoKeyword.ts` | getInfoByKeyword() – messages d'aide champs/boutons/GET | `src/utils/infoKeyword.js` |
| `refValidFormat.ts` | isValidFormat(), isValidFormatHashTag(), showMessageError() | `src/utils/RefValidFormat.js` |
| `methode.ts` | removeHashes() | `src/utils/methode.js` |
| `index.ts` | Exports | - |

---

## 3. `packages/ui/` – Application React

### 3.1 `packages/ui/src/` – Racine

| Fichier | Contenu | Source original |
|---------|---------|-----------------|
| `main.tsx` | Point d'entrée React, ChakraProvider, HashRouter | `src/src/index.tsx` |
| `App.tsx` | Routes, layout | `src/src/routes.tsx` + index |
| `vite-env.d.ts` | Types Vite | - |

### 3.2 `packages/ui/src/layouts/`

| Dossier | Fichiers | Source |
|---------|----------|--------|
| `admin/` | `index.tsx` | `src/src/layouts/admin/index.tsx` |

**Contenu :** SidebarContext.Provider, Navbar, routing vers les vues

### 3.3 `packages/ui/src/contexts/`

| Fichier | Contenu | Source |
|---------|---------|--------|
| `SidebarContext.tsx` | feuillesData, activeTab, currentFeuille, currentTest, isDefinition, etc. | `src/src/contexts/SidebarContext.js` |

### 3.4 `packages/ui/src/components/`

#### `navbar/`

| Fichier | Contenu | Source |
|---------|---------|--------|
| `NavbarAdmin.tsx` | Barre de navigation, onglets | `NavbarAdmin.tsx` |
| `NavbarLinksAdmin.tsx` | Liens de navigation | `NavbarLinksAdmin.tsx` |
| `Upload.tsx` | Import/export, génération Excel/CSV/JSON | `Upload.js` |
| `uploader.tsx` | Drag & drop, lecture fichier | `uploader.js` |
| `uploader.css` | Styles uploader | `uploader.css` |
| `AlertChangeFile.tsx` | Alerte changement fichier | `AlertChangeFile.js` |

#### `sidebar/`

| Fichier | Contenu | Source |
|---------|---------|--------|
| `Sidebar.tsx` | Conteneur sidebar | `Sidebar.tsx` |
| `Brand.tsx` | Logo/brand | `Brand.tsx` |
| `Content.tsx` | Contenu sidebar (Brand + Tree) | `Content.tsx` |
| `Links.tsx` | Liens | `Links.tsx` |
| `SidebarCard.tsx` | Carte sidebar | `SidebarCard.tsx` |
| `Tree.tsx` | Arbre, runTest(), CRUD, menu contextuel | `Tree.js` |

#### `separator/`

| Fichier | Contenu | Source |
|---------|---------|--------|
| `Separator.tsx` | Séparateur | `Separator.tsx` |

#### `scrollbar/`

| Fichier | Contenu | Source |
|---------|---------|--------|
| `Scrollbar.tsx` | Scrollbar personnalisé | `Scrollbar.tsx` |

### 3.5 `packages/ui/src/views/admin/`

#### `default/`

| Fichier | Contenu | Source |
|---------|---------|--------|
| `index.tsx` | Dashboard principal, orchestration vues | `default/index.js` |
| `NotSelectedCard.tsx` | Carte "aucune sélection" | `NotSelectedCard.tsx` |
| `style.css` | Styles | `style.css` |

#### `initForm/`

| Fichier | Contenu | Source |
|---------|---------|--------|
| `InitFile.tsx` | Formulaire définition (INIT) | `InitFile.js` |
| `formInput.tsx` | Champ/bouton Init | `formInput.js` |

#### `gestionTest/`

| Fichier | Contenu | Source |
|---------|---------|--------|
| `TestsFile.tsx` | Formulaire tests (onglet 1) | `TestsFile.js` |
| `TestsSoapFile.tsx` | Formulaire tests Soap (onglet 3) | `TestsSoapFile.js` |
| `CustomFormControl.tsx` | Champ texte/select | `CustomFormControl.js` |
| `GetInput.tsx` | Champ GET | `GetInput.js` |
| `CheckboxBox.tsx` | Case à cocher | `CheckboxBox.js` |
| `RadioBox.tsx` | Bouton radio | `RadioBox.js` |
| `FlexMenuButton.tsx` | Menu boutons | `FlexMenuButton.js` |
| `ChampsModal.tsx` | Modal Champs/Boutons/GET | `ChampsModal.js` |
| `DialogVariableTest.tsx` | Dialogue variable test | `DialogVariableTest.js` |

#### `gestionModel/`

| Fichier | Contenu | Source |
|---------|---------|--------|
| `TestsModelFile.tsx` | Formulaire MODEL | `TestsModelFile.js` |
| `formControlModel.tsx` | Champ modèle | `formControlModel.js` |
| `DialogModelConfirmation.tsx` | Confirmation modèle | `DialogModelConfirmation.js` |

#### `ordananceTest/`

| Fichier | Contenu | Source |
|---------|---------|--------|
| `RefTestFile.tsx` | Ordonnancement référentiel | `RefTestFile.js` |
| `OrganigrammeModal.tsx` | Modal organigramme | `OrganigrammeModal.js` |
| `modelSelect.tsx` | Select modèle | `modelSelect.js` |
| `modelInput.tsx` | Input modèle | `modelInput.js` |
| `modelCheckbox.tsx` | Checkbox modèle | `modelCheckbox.js` |
| `formInputRef.tsx` | Champ option référentiel | `formInputRef.js` |
| `matriceCorrespandance.tsx` | Matrice correspondance | `matriceCorrespandance.js` |

#### `variables/`

| Fichier | Contenu | Source |
|---------|---------|--------|
| `VariablesFile.tsx` | Vue variables | `VariablesFile.js` |
| `listItems.tsx` | Liste de valeurs | `listItems.js` |
| `listItemsDialog.tsx` | Dialogue liste | `listItemsDialog.js` |
| `fixedVar.tsx` | Variables fixes (VAR_/PWD_) | `fixedVar.js` |
| `fiexdVarDialog.tsx` | Dialogue variable fixe | `fiexdVarDialog.js` |
| `deleteVarDialog.tsx` | Dialogue suppression var | `deleteVarDialog.js` |
| `deleteValueDialog.tsx` | Dialogue suppression valeur | `deleteValueDialog.js` |
| `amountRanges.tsx` | Plages (MNT_) | `amountRanges.js` |
| `amountRangesDialog.tsx` | Dialogue plages | `amountRangesDialog.tsx` |

### 3.6 `packages/ui/src/theme/`

| Fichier | Contenu | Source |
|---------|---------|--------|
| `theme.tsx` | Config Chakra | `theme/theme.tsx` |
| `styles.ts` | Styles globaux | `theme/styles.ts` |
| `foundations/breakpoints.ts` | Breakpoints | `theme/foundations/breakpoints.ts` |
| `components/badge.ts` | Badge | `theme/components/badge.ts` |
| `components/button.ts` | Button | `theme/components/button.ts` |
| `components/input.ts` | Input | `theme/components/input.ts` |
| `components/link.ts` | Link | `theme/components/link.ts` |
| `components/progress.ts` | Progress | `theme/components/progress.ts` |
| `components/slider.ts` | Slider | `theme/components/slider.ts` |
| `components/switch.ts` | Switch | `theme/components/switch.ts` |
| `components/textarea.ts` | Textarea | `theme/components/textarea.ts` |

### 3.7 `packages/ui/src/utils/`

| Fichier | Contenu | Source |
|---------|---------|--------|
| `fileUtils.ts` | Ré-exports ou wrappers vers core | - |
| `infoKeyword.ts` | Ré-exports | - |
| `refValidFormat.ts` | Ré-exports | - |
| `methode.ts` | Ré-exports | - |

*(Ou importer directement depuis `@uptest/core`)*

### 3.8 `packages/ui/src/types/`

| Fichier | Contenu | Source |
|---------|---------|--------|
| `hui-types.d.ts` | Types Horizon UI | `types/hui-types.d.ts` |
| `images.d.ts` | Déclarations images | `types/images.d.ts` |
| `stylis.d.ts` | Stylis | `types/stylis.d.ts` |

### 3.9 `packages/ui/src/assets/`

| Fichier | Contenu | Source |
|---------|---------|--------|
| `css/App.css` | Styles CSS | `assets/css/App.css` |

---

## 4. Racine du projet

| Fichier | Contenu | Source |
|---------|---------|--------|
| `index.js` | Point d'entrée Electron (ou electron/main.js) | `index.js` |
| `config.json` | Paths, Uptest-Core.bat | `config.json` |
| `loading.html` | Écran de chargement | `loading.html` |
| `logo.png` | Icône | `logo.png` |
| `package.json` | Scripts, dépendances | `package.json` |

---

## 5. Dépendances à installer

### Racine (`package.json`)

```json
{
  "devDependencies": {
    "electron": "^25.4.0",
    "electron-builder": "^26.0.12",
    "concurrently": "^8.2.2",
    "wait-on": "^7.2.0",
    "typescript": "^5.0.0",
    "@types/node": "^20.0.0"
  }
}
```

### packages/ui (`package.json`)

```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.0.0",
    "@chakra-ui/react": "^2.0.0",
    "@emotion/react": "^11.0.0",
    "@emotion/styled": "^11.0.0",
    "framer-motion": "^10.0.0",
    "@mui/material": "^5.14.0",
    "xlsx": "^0.18.0",
    "react-beautiful-dnd": "^13.1.0",
    "date-fns": "^3.6.0",
    "react-icons": "^4.0.0"
  }
}
```

---

## 6. Structure finale attendue

```
C:\Users\othma\uptest-v2\
├── electron/
│   ├── main.js
│   └── preload.js
├── packages/
│   ├── core/
│   │   ├── fileUtils.ts
│   │   ├── infoKeyword.ts
│   │   ├── refValidFormat.ts
│   │   ├── methode.ts
│   │   └── index.ts
│   └── ui/
│       ├── src/
│       │   ├── main.tsx
│       │   ├── App.tsx
│       │   ├── layouts/admin/index.tsx
│       │   ├── contexts/SidebarContext.tsx
│       │   ├── components/
│       │   │   ├── navbar/ (6 fichiers)
│       │   │   ├── sidebar/ (6 fichiers)
│       │   │   ├── separator/Separator.tsx
│       │   │   └── scrollbar/Scrollbar.tsx
│       │   ├── views/admin/
│       │   │   ├── default/ (3 fichiers)
│       │   │   ├── initForm/ (2 fichiers)
│       │   │   ├── gestionTest/ (9 fichiers)
│       │   │   ├── gestionModel/ (3 fichiers)
│       │   │   ├── ordananceTest/ (7 fichiers)
│       │   │   └── variables/ (9 fichiers)
│       │   ├── theme/ (theme + foundations + components)
│       │   ├── utils/
│       │   ├── types/
│       │   └── assets/
│       ├── index.html
│       ├── vite.config.ts
│       └── package.json
├── config.json
├── index.js
├── loading.html
├── logo.png
└── package.json
```

---

## 7. Ordre de migration recommandé

1. **Structure** : Créer les dossiers
2. **Electron** : main.js, config.json
3. **Core** : FileUtils, utils
4. **Theme** : Chakra theme
5. **Context** : SidebarContext
6. **Layout** : admin layout
7. **Components** : Navbar, Sidebar, Tree
8. **Views** : default, initForm, gestionTest, gestionModel, ordananceTest, variables
9. **Upload** : uploader, Upload
10. **Tests** : Vérifier exécution complète
