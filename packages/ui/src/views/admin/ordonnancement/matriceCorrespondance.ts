export interface ParamDef {
  name: string;
  comment: string;
  isDisabled: boolean;
}

export interface MatriceItem {
  keyword: string;
  description: string;
  Param1: ParamDef;
  Param2: ParamDef;
  Param3: ParamDef;
  Param4: ParamDef;
  Param5: ParamDef;
  Param6: ParamDef;
  Param7: ParamDef;
  Param8: ParamDef;
  Param9: ParamDef;
  Param10: ParamDef;
}

const P = (name: string, comment: string, disabled = false): ParamDef => ({
  name,
  comment,
  isDisabled: disabled,
});

export const MATRICE_CORRESPONDANCE: MatriceItem[] = [
  {
    keyword: 'UP-EXT',
    description: 'Appel traitement Librairie Externe',
    Param1: P('Keyword', 'Nom du keyword à appeler (Uptest_Lib_Externe.py)', false),
    Param2: P('Param 1', '1er paramètre passé au keyword', false),
    Param3: P('Param 2', '2e paramètre passé au keyword', false),
    Param4: P('Param 3', '3e paramètre passé au keyword', false),
    Param5: P('Param 4', '4e paramètre passé au keyword', false),
    Param6: P('', '', true),
    Param7: P('', '', true),
    Param8: P('', '', true),
    Param9: P('', '', true),
    Param10: P('', '', true),
  },
  {
    keyword: 'UP-PUT',
    description: 'Envoi d\'un fichier vers le système distant',
    Param1: P('Fichier à la volée', 'O ou N', false),
    Param2: P('Fichier à envoyer', 'Nom dans 05-Fichiers ou sous-répertoire Aller si à la volée', false),
    Param3: P('Fichier cible distant', 'Nom du fichier cible sur le système distant', false),
    Param4: P('Fichier intermédiaire IBM i', 'Obligatoire si cible dans /qsys.lib/...', false),
    Param5: P('Encodage transfert/local', 'cp1252, utf-8, ascii…', false),
    Param6: P('Encodage intermédiaire IBM i', '1252, 1208…', false),
    Param7: P('', '', true),
    Param8: P('', '', true),
    Param9: P('', '', true),
    Param10: P('', '', true),
  },
  {
    keyword: 'UP-GET',
    description: 'Récupération d\'un fichier distant',
    Param1: P('Fichier distant', 'Nom du fichier distant (* possible pour plusieurs)', false),
    Param2: P('Fichier réception', 'Nom du fichier dans le sous-répertoire Retour', false),
    Param3: P('Fichier intermédiaire IBM i', 'Si besoin', false),
    Param4: P('Encodage transfert/local', 'cp1252, utf-8…', false),
    Param5: P('Encodage intermédiaire IBM i', '1252, 1208…', false),
    Param6: P('', '', true),
    Param7: P('', '', true),
    Param8: P('', '', true),
    Param9: P('', '', true),
    Param10: P('', '', true),
  },
  {
    keyword: 'UP-SQL',
    description: 'Exécution d\'une requête SQL',
    Param1: P('Fichier SQL', 'Nom du fichier dans 04-SQL', false),
    Param2: P('Valeur attendue', 'Optionnelle (1ère ligne, 1ère colonne retournée)', false),
    Param3: P('', '', true),
    Param4: P('', '', true),
    Param5: P('', '', true),
    Param6: P('', '', true),
    Param7: P('', '', true),
    Param8: P('', '', true),
    Param9: P('', '', true),
    Param10: P('', '', true),
  },
  {
    keyword: 'UP-SUB',
    description: 'Substitution dans un fichier',
    Param1: P('Fichier', 'Nom du fichier où faire le remplacement', false),
    Param2: P('Option output', 'Nom de l\'option qui alimente output.csv', false),
    Param3: P('Répertoire', 'Répertoire du fichier', false),
    Param4: P('', '', true),
    Param5: P('', '', true),
    Param6: P('', '', true),
    Param7: P('', '', true),
    Param8: P('', '', true),
    Param9: P('', '', true),
    Param10: P('', '', true),
  },
  {
    keyword: 'UP-GEN',
    description: 'Génération de fichiers',
    Param1: P('DIR', 'Sous-répertoire du fichier source (ex. Retour, Aller)', false),
    Param2: P('FIC', 'Fichier à utiliser pour la génération', false),
    Param3: P('TYPE', 'XML ou PLAT', false),
    Param4: P('SCENARIO', 'Fichier yaml de scénario', false),
    Param5: P('MAPPINGCIBLE', 'Mapping cible yaml', false),
    Param6: P('MAPPINGSOURCE', 'Mapping source yaml', false),
    Param7: P('ENCODAGE', 'utf-8, cp1252…', false),
    Param8: P('PREFIXE', 'Préfixe des fichiers générés (dans Aller)', false),
    Param9: P('', '', true),
    Param10: P('', '', true),
  },
  {
    keyword: 'UP-CTL',
    description: 'Contrôle fichier',
    Param1: P('Sous-répertoire', 'Sous-répertoire du fichier', false),
    Param2: P('Fichier / Préfixes', 'Nom fichier (PLAT/XML) ou préfixes (RULES)', false),
    Param3: P('Type contrôle', 'PLAT, XML ou RULES', false),
    Param4: P('Modèle / XSD / YAML', 'Fichier modèle (PLAT), XSD (XML) ou YAML (RULES)', false),
    Param5: P('Filtre regex', 'Pour PLAT', false),
    Param6: P('Encodage', 'Encodage du ou des fichiers à contrôler', false),
    Param7: P('', '', true),
    Param8: P('', '', true),
    Param9: P('', '', true),
    Param10: P('', '', true),
  },
  {
    keyword: 'UP-SOAP',
    description: 'Test des web services SOAP',
    Param1: P('Matrice Excel SOAP', 'Nom de la matrice Excel SOAP', false),
    Param2: P('Onglet', 'Nom de l\'onglet', false),
    Param3: P('Service', 'Nom du service (Client, Account, AccountKeeping…)', false),
    Param4: P('', '', true),
    Param5: P('', '', true),
    Param6: P('', '', true),
    Param7: P('', '', true),
    Param8: P('', '', true),
    Param9: P('', '', true),
    Param10: P('', '', true),
  },
  {
    keyword: 'UP-MONETIQUE',
    description: 'Test monétique',
    Param1: P('Matrice Excel MONETIQUE', 'Nom de la matrice Excel MONETIQUE', false),
    Param2: P('Onglet', 'Nom de l\'onglet', false),
    Param3: P('', '', true),
    Param4: P('', '', true),
    Param5: P('', '', true),
    Param6: P('', '', true),
    Param7: P('', '', true),
    Param8: P('', '', true),
    Param9: P('', '', true),
    Param10: P('', '', true),
  },
];

export const MODULE_SAB_PARAMS: ParamDef[] = [
  P('Récupération Spools', 'O ou N', false),
  P('Id Spools', '', false),
  P('Id du test', '', false),
  P('', '', true),
  P('', '', true),
  P('', '', true),
  P('', '', true),
  P('', '', true),
  P('', '', true),
  P('', '', true),
];
