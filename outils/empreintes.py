#!/usr/bin/env python3
"""Manifeste des empreintes du code client de Vox (CNIL E27, VOX-559).

Produit vote/web/empreintes-client.json : pour chaque fichier servi au
navigateur, sa taille, son SHA-256 et son SHA-384 au format SRI, avec sa
provenance (code Agrume, paquet npm officiel, ou tiers non établi).

    outils/front/empreintes.py              régénère le manifeste
    outils/front/empreintes.py --verifier   échoue si le manifeste n'est plus à jour
    outils/front/empreintes.py --verifier --racine <export>/web
                                            contrôle un export (vox_front)

Les règles de sélection des fichiers sont celles de App\\Helpers\\Integrite
(vote/app/Helpers/Integrite.php) : les modifier aux deux endroits.
Bibliothèque standard uniquement.
"""

import argparse
import base64
import fnmatch
import hashlib
import json
import os
import re
import sys

DEPOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
MANIFESTE = "empreintes-client.json"
EXCLUS = {"index.php", MANIFESTE, "css/custom.css"}
DOSSIERS_EXCLUS = {"custom"}


def fichiers_servis(racine):
    """Chemins relatifs (séparateur /) des fichiers de code client, triés."""
    resultat = []
    for dossier, sous_dossiers, fichiers in os.walk(racine):
        relatif = os.path.relpath(dossier, racine).replace(os.sep, "/")
        relatif = "" if relatif == "." else relatif + "/"
        sous_dossiers[:] = [
            d for d in sous_dossiers
            if not d.startswith(".") and (relatif + d) not in DOSSIERS_EXCLUS
        ]
        for nom in fichiers:
            chemin = relatif + nom
            if nom.startswith(".") or chemin in EXCLUS:
                continue
            resultat.append(chemin)
    return sorted(resultat)


def empreintes(fichier):
    with open(fichier, "rb") as f:
        contenu = f.read()
    sri = base64.b64encode(hashlib.sha384(contenu).digest()).decode("ascii")
    return {
        "octets": len(contenu),
        "sha256": hashlib.sha256(contenu).hexdigest(),
        "sri": "sha384-" + sri,
    }


def charger_provenance(fichier):
    with open(fichier, encoding="utf-8") as f:
        provenance = json.load(f)
    return provenance.get("interne", []), provenance.get("npm", {})


def provenance_de(chemin, internes, npm):
    if chemin in npm:
        return "npm:" + npm[chemin]
    if any(fnmatch.fnmatchcase(chemin, motif) for motif in internes):
        return "interne"
    return "tierce"


def version_application(config):
    with open(config, encoding="utf-8") as f:
        trouve = re.search(r"define\(\s*'VERSION'\s*,\s*'([^']+)'\s*\)", f.read())
    if not trouve:
        sys.exit("VERSION introuvable dans " + config)
    return trouve.group(1)


def construire(racine, config, provenance):
    internes, npm = charger_provenance(provenance)
    servis = fichiers_servis(racine)
    inconnus = sorted(set(npm) - set(servis))
    if inconnus:
        sys.exit("provenance.json cite des fichiers absents : " + ", ".join(inconnus))
    fichiers = {}
    for chemin in servis:
        entree = empreintes(os.path.join(racine, chemin))
        entree["provenance"] = provenance_de(chemin, internes, npm)
        fichiers[chemin] = entree
    return {
        "application": "Vox'Agrume",
        "version": version_application(config),
        "description": "Empreintes du code exécuté dans le navigateur (CNIL E27). "
                       "Vérification : outils/front/verifier.py, procédure dans le README de AgrumeRH/vox_front.",
        "fichiers": fichiers,
    }


def serialiser(manifeste):
    return json.dumps(manifeste, ensure_ascii=False, indent=2, sort_keys=False) + "\n"


def verifier(racine, attendu):
    """Compare les fichiers d'un dossier à un manifeste. Renvoie la liste des écarts."""
    ecarts = []
    declares = attendu.get("fichiers", {})
    presents = fichiers_servis(racine)
    for chemin in sorted(set(declares) - set(presents)):
        ecarts.append("absent      " + chemin)
    for chemin in sorted(set(presents) - set(declares)):
        ecarts.append("non déclaré " + chemin)
    for chemin in sorted(set(presents) & set(declares)):
        reel = empreintes(os.path.join(racine, chemin))
        if any(reel[k] != declares[chemin].get(k) for k in ("octets", "sha256", "sri")):
            ecarts.append("modifié     " + chemin)
    return ecarts


def main():
    parser = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    parser.add_argument("--racine", default=os.path.join(DEPOT, "vote", "web"))
    parser.add_argument("--config", default=os.path.join(DEPOT, "vote", "config", "config.php"))
    parser.add_argument("--provenance", default=os.path.join(DEPOT, "outils", "front", "provenance.json"))
    parser.add_argument("--verifier", action="store_true",
                        help="ne rien écrire, échouer si le manifeste ne correspond pas")
    args = parser.parse_args()

    chemin_manifeste = os.path.join(args.racine, MANIFESTE)

    if args.verifier:
        try:
            with open(chemin_manifeste, encoding="utf-8") as f:
                contenu = f.read()
        except FileNotFoundError:
            sys.exit("Manifeste absent : " + chemin_manifeste)
        ecarts = verifier(args.racine, json.loads(contenu))
        # Dans le dépôt, le manifeste doit aussi être celui que produirait le
        # générateur (version, provenance, format) : un seul résultat possible.
        # Un export (--racine) n'a ni config.php ni provenance.json : seules
        # les empreintes des fichiers y sont contrôlées.
        dans_le_depot = os.path.abspath(args.racine) == os.path.join(DEPOT, "vote", "web")
        if not ecarts and dans_le_depot:
            if contenu != serialiser(construire(args.racine, args.config, args.provenance)):
                ecarts.append("manifeste   version, provenance ou format différents du générateur")
        if ecarts:
            print("Le manifeste du code client n'est pas à jour (outils/front/empreintes.py) :")
            print("\n".join("  " + e for e in ecarts))
            sys.exit(1)
        sha = hashlib.sha256(contenu.encode("utf-8")).hexdigest()
        print("Manifeste à jour : %d fichiers, SHA-256 %s" % (len(json.loads(contenu)["fichiers"]), sha))
        return

    contenu = serialiser(construire(args.racine, args.config, args.provenance))
    with open(chemin_manifeste, "w", encoding="utf-8", newline="\n") as f:
        f.write(contenu)
    sha = hashlib.sha256(contenu.encode("utf-8")).hexdigest()
    print("%s : %d fichiers, SHA-256 %s" % (chemin_manifeste, len(json.loads(contenu)["fichiers"]), sha))


if __name__ == "__main__":
    main()
