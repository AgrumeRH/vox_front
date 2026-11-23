#!/usr/bin/env python3
"""Vérifie le code client servi par un serveur de vote Vox (CNIL E27, VOX-559).

À lancer par le bureau de vote ou un expert, depuis son propre poste :

    python3 verifier.py --site https://vote.exemple.fr --manifeste web/empreintes-client.json

1. Le manifeste de référence est celui de la version publiée (dépôt
   AgrumeRH/vox_front, étiquette v<version>) : son SHA-256 doit être celui de
   EMPREINTES.sha256. Sans --manifeste, le script lit celui du site, ce qui
   n'est pas une vérification indépendante (avertissement).
2. Chaque fichier du manifeste est téléchargé depuis le site et son SHA-256
   comparé.
3. Les pages indiquées (--page, par défaut la page d'accueil) sont lues : chaque
   <script src> et <link rel=stylesheet> doit être servi par le site, porter un
   attribut integrity, et cette empreinte doit être celle du manifeste. La
   feuille de style propre à l'élection (css/custom.css) est contrôlée sur son
   contenu. Les scripts écrits dans la page (sans src) sont signalés.
4. --amont : les fichiers de provenance npm sont comparés au paquet officiel
   (https://cdn.jsdelivr.net/npm/).

Code de sortie 0 si tout est conforme, 1 sinon. Bibliothèque standard
uniquement (Python 3.8+). Le certificat TLS du site est toujours vérifié
(autorités du système, ou --cafile).
"""

import argparse
import base64
import hashlib
import json
import os
import ssl
import sys
import urllib.error
import urllib.parse
import urllib.request
from html.parser import HTMLParser

DYNAMIQUES = {"css/custom.css"}
NPM = "https://cdn.jsdelivr.net/npm/"


class Balises(HTMLParser):
    def __init__(self):
        super().__init__()
        self.ressources = []  # (type, url, integrity)
        self.inline = 0
        self._dans_script = False

    def handle_starttag(self, tag, attrs):
        a = {k.lower(): (v or "") for k, v in attrs}
        if tag == "script":
            if a.get("src"):
                self.ressources.append(("script", a["src"], a.get("integrity")))
            elif a.get("type", "text/javascript").lower() in ("", "text/javascript", "module", "application/javascript"):
                self.inline += 1
        elif tag == "link" and "stylesheet" in a.get("rel", "").lower().split():
            self.ressources.append(("feuille", a.get("href", ""), a.get("integrity")))


class Verificateur:
    def __init__(self, site, contexte):
        self.site = site.rstrip("/") + "/"
        self.contexte = contexte
        self.ecarts = []
        self.avertissements = []

    def lire(self, url):
        requete = urllib.request.Request(url, headers={"User-Agent": "vox-verifier"})
        with urllib.request.urlopen(requete, timeout=30, context=self.contexte) as r:
            return r.read()

    def chemin_local(self, url):
        """Chemin relatif à la racine du site, ou None si la ressource est ailleurs."""
        absolue = urllib.parse.urljoin(self.site, url)
        a, s = urllib.parse.urlsplit(absolue), urllib.parse.urlsplit(self.site)
        if (a.scheme, a.netloc) != (s.scheme, s.netloc) or not a.path.startswith(s.path):
            return None
        return urllib.parse.unquote(a.path[len(s.path):])

    def fichiers(self, manifeste):
        n = 0
        for chemin, attendu in sorted(manifeste["fichiers"].items()):
            try:
                contenu = self.lire(self.site + urllib.parse.quote(chemin))
            except (urllib.error.URLError, OSError) as e:
                self.ecarts.append("inaccessible   %s (%s)" % (chemin, e))
                continue
            if hashlib.sha256(contenu).hexdigest() != attendu["sha256"]:
                self.ecarts.append("modifié        %s" % chemin)
            else:
                n += 1
        print("Fichiers conformes : %d / %d" % (n, len(manifeste["fichiers"])))

    def page(self, manifeste, page):
        url = urllib.parse.urljoin(self.site, page.lstrip("/"))
        try:
            html = self.lire(url).decode("utf-8", "replace")
        except (urllib.error.URLError, OSError) as e:
            self.ecarts.append("page illisible %s (%s)" % (url, e))
            return
        balises = Balises()
        balises.feed(html)
        for genre, src, integrity in balises.ressources:
            chemin = self.chemin_local(src)
            if chemin is None:
                self.ecarts.append("externe        %s dans %s" % (src, page))
                continue
            if not integrity:
                self.ecarts.append("sans integrity %s dans %s" % (chemin, page))
                continue
            if chemin in DYNAMIQUES:
                contenu = self.lire(urllib.parse.urljoin(self.site, src))
                attendu = "sha384-" + base64.b64encode(hashlib.sha384(contenu).digest()).decode("ascii")
            elif chemin in manifeste["fichiers"]:
                attendu = manifeste["fichiers"][chemin]["sri"]
            else:
                self.ecarts.append("non déclaré    %s dans %s" % (chemin, page))
                continue
            if integrity.strip() != attendu:
                self.ecarts.append("integrity      %s dans %s ne correspond pas au manifeste" % (chemin, page))
        print("Page %s : %d ressources contrôlées, %d script(s) écrits dans la page"
              % (page, len(balises.ressources), balises.inline))
        if balises.inline:
            self.avertissements.append(
                "%s : %d script(s) écrits dans la page ne sont pas couverts par integrity ; "
                "leur gabarit est publié dans vox_front (gabarits/)" % (page, balises.inline))

    def amont(self, manifeste):
        n = 0
        for chemin, attendu in sorted(manifeste["fichiers"].items()):
            provenance = attendu.get("provenance", "")
            if not provenance.startswith("npm:"):
                continue
            try:
                contenu = self.lire(NPM + provenance[4:])
            except (urllib.error.URLError, OSError) as e:
                self.ecarts.append("amont absent   %s (%s)" % (chemin, e))
                continue
            if hashlib.sha256(contenu).hexdigest() != attendu["sha256"]:
                self.ecarts.append("amont différent %s (%s)" % (chemin, provenance))
            else:
                n += 1
        print("Fichiers identiques au paquet npm officiel : %d" % n)


def main():
    parser = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    parser.add_argument("--site", required=True, help="adresse du serveur de vote, ex. https://vote.exemple.fr")
    parser.add_argument("--manifeste", help="manifeste de référence (fichier local de la version publiée)")
    parser.add_argument("--page", action="append", help="page à contrôler (répétable), défaut : /")
    parser.add_argument("--amont", action="store_true", help="comparer aussi les bibliothèques à npm")
    parser.add_argument("--cafile", help="autorités de certification à utiliser (fichier PEM)")
    args = parser.parse_args()

    contexte = ssl.create_default_context(cafile=args.cafile)
    # Python de python.org sur macOS : aucune autorité chargée par défaut. On
    # prend alors le magasin du système (la vérification TLS reste entière).
    if not args.cafile and contexte.cert_store_stats().get("x509_ca", 0) == 0 \
            and os.path.isfile("/etc/ssl/cert.pem"):
        contexte.load_verify_locations("/etc/ssl/cert.pem")
    v = Verificateur(args.site, contexte)

    try:
        if args.manifeste:
            with open(args.manifeste, "rb") as f:
                brut = f.read()
        else:
            brut = v.lire(v.site + "empreintes-client.json")
            v.avertissements.append("manifeste lu sur le site lui-même : comparer son empreinte à celle "
                                    "publiée dans AgrumeRH/vox_front (EMPREINTES.sha256)")
    except urllib.error.URLError as e:
        if isinstance(getattr(e, "reason", None), ssl.SSLCertVerificationError):
            sys.exit("Certificat TLS non vérifié (%s). Sur macOS : Install Certificates.command, ou --cafile." % e.reason)
        sys.exit("Manifeste illisible : %s" % e)
    manifeste = json.loads(brut)
    print("Manifeste : %s %s, %d fichiers, SHA-256 %s" % (
        manifeste.get("application", "?"), manifeste.get("version", "?"),
        len(manifeste["fichiers"]), hashlib.sha256(brut).hexdigest()))

    if args.manifeste:
        # Le site doit servir exactement ce manifeste.
        try:
            servi = v.lire(v.site + "empreintes-client.json")
            if servi != brut:
                v.ecarts.append("manifeste      le site sert un manifeste différent de la référence")
        except (urllib.error.URLError, OSError) as e:
            v.ecarts.append("manifeste      inaccessible sur le site (%s)" % e)

    v.fichiers(manifeste)
    for page in args.page or ["/"]:
        v.page(manifeste, page)
    if args.amont:
        v.amont(manifeste)

    for a in v.avertissements:
        print("Avertissement : " + a)
    if v.ecarts:
        print("\nÉCARTS (%d) :" % len(v.ecarts))
        print("\n".join("  " + e for e in v.ecarts))
        sys.exit(1)
    print("\nConforme : le code servi est celui du manifeste.")


if __name__ == "__main__":
    main()
