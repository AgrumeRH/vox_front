# vox_front

Éléments du système de vote Vox'Agrume exécutés sur le terminal de l'électeur,
dans son navigateur (objectif 3-05 de la recommandation CNIL de 2026).

**Version 2.5**, produite par `outils/front/exporter.sh` à partir du
commit `d77a31798d685054a4b769b1e179c09816c1bd0c` du dépôt de l'application. Ce dépôt est un export : il
n'est pas modifié à la main.

- `web/` : les fichiers servis tels quels au navigateur. Le code écrit par
  Agrume n'est pas minifié ; les bibliothèques sont celles des paquets
  officiels quand leur provenance est établie (voir le manifeste).
- `web/empreintes-client.json` : le manifeste. Pour chaque fichier : taille,
  SHA-256 et SHA-384 au format SRI (l'attribut `integrity` des balises).
  SHA-256 du manifeste : `1681527a49563ff1ad969e761c2e88097449b4239161021c299b33a875cfbc0f`.
- `gabarits/` : les gabarits des pages de l'électeur, dont les scripts écrits
  dans la page (non couverts par `integrity`).
- `outils/` : génération du manifeste et vérification d'un serveur.
- `EMPREINTES.sha256` : SHA-256 de chaque fichier de cet export.

## Vérifier un serveur de vote

Le bureau de vote ou un expert, depuis son poste (Python 3.8 ou plus, sans
dépendance) :

```sh
git clone --branch v2.5 https://github.com/AgrumeRH/vox_front.git
cd vox_front
sha256sum -c EMPREINTES.sha256          # macOS : shasum -a 256 -c EMPREINTES.sha256
python3 outils/verifier.py --site https://<serveur de vote> --manifeste web/empreintes-client.json --amont
```

Le script télécharge chaque fichier servi et compare son empreinte, contrôle
que chaque `<script>` et `<link>` de la page porte l'empreinte du manifeste,
et, avec `--amont`, compare les bibliothèques aux paquets npm officiels. La
page « Empreintes du code » du serveur (`/code-client`) affiche l'empreinte du
manifeste : elle doit être celle indiquée ci-dessus.

## Reproduire cet export

Depuis le dépôt de l'application, au commit indiqué :

```sh
outils/front/exporter.sh d77a31798d685054a4b769b1e179c09816c1bd0c /tmp/vox_front
```

Un même commit produit les mêmes fichiers : comparer `EMPREINTES.sha256`.
