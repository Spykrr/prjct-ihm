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

const defaultParam = (name: string, comment: string, disabled = false): ParamDef => ({
  name,
  comment,
  isDisabled: disabled,
});

export const MATRICE_CORRESPONDANCE: MatriceItem[] = [
  {
    keyword: 'UP-EXT',
    description: 'Appel lib externe',
    Param1: defaultParam('Script', 'Chemin script (ex: keyword.py)', false),
    Param2: defaultParam('', '', true),
    Param3: defaultParam('', '', true),
    Param4: defaultParam('', '', true),
    Param5: defaultParam('', '', true),
    Param6: defaultParam('', '', true),
    Param7: defaultParam('', '', true),
    Param8: defaultParam('', '', true),
    Param9: defaultParam('', '', true),
    Param10: defaultParam('', '', true),
  },
  {
    keyword: 'UP-GET',
    description: 'GET',
    Param1: defaultParam('', '', true),
    Param2: defaultParam('', '', true),
    Param3: defaultParam('', '', true),
    Param4: defaultParam('', '', true),
    Param5: defaultParam('', '', true),
    Param6: defaultParam('', '', true),
    Param7: defaultParam('', '', true),
    Param8: defaultParam('', '', true),
    Param9: defaultParam('', '', true),
    Param10: defaultParam('', '', true),
  },
  {
    keyword: 'UP-PUT',
    description: 'PUT',
    Param1: defaultParam('', '', true),
    Param2: defaultParam('', '', true),
    Param3: defaultParam('', '', true),
    Param4: defaultParam('', '', true),
    Param5: defaultParam('', '', true),
    Param6: defaultParam('', '', true),
    Param7: defaultParam('', '', true),
    Param8: defaultParam('', '', true),
    Param9: defaultParam('', '', true),
    Param10: defaultParam('', '', true),
  },
  {
    keyword: 'UP-SQL',
    description: 'SQL',
    Param1: defaultParam('', '', true),
    Param2: defaultParam('', '', true),
    Param3: defaultParam('', '', true),
    Param4: defaultParam('', '', true),
    Param5: defaultParam('', '', true),
    Param6: defaultParam('', '', true),
    Param7: defaultParam('', '', true),
    Param8: defaultParam('', '', true),
    Param9: defaultParam('', '', true),
    Param10: defaultParam('', '', true),
  },
  {
    keyword: 'UP-SUB',
    description: 'Sous-traitement',
    Param1: defaultParam('', '', true),
    Param2: defaultParam('', '', true),
    Param3: defaultParam('', '', true),
    Param4: defaultParam('', '', true),
    Param5: defaultParam('', '', true),
    Param6: defaultParam('', '', true),
    Param7: defaultParam('', '', true),
    Param8: defaultParam('', '', true),
    Param9: defaultParam('', '', true),
    Param10: defaultParam('', '', true),
  },
  {
    keyword: 'UP-GEN',
    description: 'Générique',
    Param1: defaultParam('', '', true),
    Param2: defaultParam('', '', true),
    Param3: defaultParam('', '', true),
    Param4: defaultParam('', '', true),
    Param5: defaultParam('', '', true),
    Param6: defaultParam('', '', true),
    Param7: defaultParam('', '', true),
    Param8: defaultParam('', '', true),
    Param9: defaultParam('', '', true),
    Param10: defaultParam('', '', true),
  },
  {
    keyword: 'UP-CTL',
    description: 'Contrôle',
    Param1: defaultParam('', '', true),
    Param2: defaultParam('', '', true),
    Param3: defaultParam('', '', true),
    Param4: defaultParam('', '', true),
    Param5: defaultParam('', '', true),
    Param6: defaultParam('', '', true),
    Param7: defaultParam('', '', true),
    Param8: defaultParam('', '', true),
    Param9: defaultParam('', '', true),
    Param10: defaultParam('', '', true),
  },
  {
    keyword: 'UP-SOAP',
    description: 'SOAP',
    Param1: defaultParam('', '', true),
    Param2: defaultParam('', '', true),
    Param3: defaultParam('', '', true),
    Param4: defaultParam('', '', true),
    Param5: defaultParam('', '', true),
    Param6: defaultParam('', '', true),
    Param7: defaultParam('', '', true),
    Param8: defaultParam('', '', true),
    Param9: defaultParam('', '', true),
    Param10: defaultParam('', '', true),
  },
  {
    keyword: 'UP-MONETIQUE',
    description: 'Monétique',
    Param1: defaultParam('', '', true),
    Param2: defaultParam('', '', true),
    Param3: defaultParam('', '', true),
    Param4: defaultParam('', '', true),
    Param5: defaultParam('', '', true),
    Param6: defaultParam('', '', true),
    Param7: defaultParam('', '', true),
    Param8: defaultParam('', '', true),
    Param9: defaultParam('', '', true),
    Param10: defaultParam('', '', true),
  },
];

export const MODULE_SAB_PARAMS: ParamDef[] = [
  defaultParam('Récupération Spools O/N', 'O ou N', false),
  defaultParam('Id Spools', '', false),
  defaultParam('Id du test', '', false),
  defaultParam('', '', true),
  defaultParam('', '', true),
  defaultParam('', '', true),
  defaultParam('', '', true),
  defaultParam('', '', true),
  defaultParam('', '', true),
  defaultParam('', '', true),
];
