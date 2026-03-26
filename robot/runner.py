#!/usr/bin/env python3
"""
Uptest local robot runner (squelette).

Contrat d'entree:
  --ref-csv <chemin_csv_referentiel_temp>
  --excel   <chemin_excel_temp>

Objectif:
  - valider les entrees,
  - lire le CSV referentiel temporaire,
  - preparer la zone ou brancher ton vrai moteur robot.
"""

from __future__ import annotations

import argparse
import csv
import os
import sys
from datetime import datetime


def log(msg: str) -> None:
    ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"[robot-runner][{ts}] {msg}")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Uptest robot runner")
    parser.add_argument("--ref-csv", required=True, help="Chemin CSV referentiel temporaire")
    parser.add_argument("--excel", required=True, help="Chemin Excel temporaire")
    return parser.parse_args()


def read_ref_csv(path: str) -> list[dict[str, str]]:
    with open(path, "r", encoding="utf-8", newline="") as f:
        reader = csv.DictReader(f, delimiter=";")
        return list(reader)


def main() -> int:
    args = parse_args()
    ref_csv = os.path.abspath(args.ref_csv)
    excel = os.path.abspath(args.excel)

    if not os.path.exists(ref_csv):
        log(f"ERROR: CSV referentiel introuvable: {ref_csv}")
        return 1
    if not os.path.exists(excel):
        log(f"ERROR: Excel temporaire introuvable: {excel}")
        return 1

    log(f"START ref_csv={ref_csv}")
    log(f"START excel={excel}")

    rows = read_ref_csv(ref_csv)
    if not rows:
        log("ERROR: CSV referentiel vide.")
        return 1

    # Contrat attendu: une ligne test cible + header fixe
    target = rows[0]
    module = (target.get("Module") or "").strip()
    option = (target.get("Option") or "").strip()
    log(f"Target from CSV -> Module={module} | Option={option}")

    # TODO: branche ton vrai moteur robot ici
    # Exemple:
    #   rc = run_real_robot(excel_path=excel, module=module, option=option)
    #   return rc
    #
    # Tant que la commande robot reelle n'est pas branchee, on doit echouer explicitement
    # pour eviter les faux positifs "execution lancee avec succes" dans l'UI.
    log("ERROR: Runner robot non configure (placeholder).")
    log("ACTION: remplace le TODO par ta commande robot reelle.")
    log("END")
    return 2


if __name__ == "__main__":
    sys.exit(main())

