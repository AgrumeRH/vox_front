/*
 * Chiffrement hybride authentifié du bulletin (CNIL, écart E4, VOX-536).
 *
 * Remplace JSEncrypt (RSA PKCS#1 v1.5, malléable) et l'enveloppe CryptoJS
 * AES-CBC sans MAC. Construction conforme au guide de sélection d'algorithmes
 * cryptographiques de l'ANSSI :
 *  - 64 octets aléatoires = deux clés indépendantes de 256 bits,
 *    Kc (chiffrement) et Km (authentification) ;
 *  - AES-256-CBC, IV aléatoire de 16 octets, bourrage PKCS#7 ;
 *  - HMAC-SHA-256 sur le chiffré (encrypt-then-MAC) ;
 *  - Kc || Km chiffrés en RSA-OAEP avec SHA-256.
 *
 * Format : <préfixe> + base64(JSON {k, i, c, t}), champs en base64.
 * HMAC sur : préfixe || 0x00 || longueur de k (32 bits gros-boutiste) || k || i || c.
 * Cette sortie (JSON.stringify, clés dans l'ordre k, i, c, t ; btoa) est la
 * forme canonique : le serveur de vote et l'urne refusent tout autre encodage
 * du même bulletin (R1, rejeu par réencodage).
 *
 * Préfixe : "b2:" bulletin pour la clé publique du vote. Le serveur ouvre ces objets avec
 * App\Helpers\ChiffrementAuthentifie (PHP) : les deux implémentations doivent
 * rester strictement alignées (fixture tests/fixtures/chiffrement-bulletin.json).
 *
 * Aucune dépendance : uniquement l'API WebCrypto. Chargeable sous Node (tests).
 */
(function (racine) {
    'use strict';

    var subtle = racine.crypto && racine.crypto.subtle;
    var PREFIXES = ['b2:'];
    var enc = new TextEncoder();

    function verifierEnvironnement() {
        if (!subtle || !racine.crypto.getRandomValues) {
            throw new Error("Ce navigateur ne permet pas de chiffrer le bulletin (WebCrypto indisponible). Utilisez un navigateur récent, en HTTPS.");
        }
    }

    function versB64(octets) {
        octets = new Uint8Array(octets);
        var s = '';
        for (var i = 0; i < octets.length; i += 0x8000) {
            s += String.fromCharCode.apply(null, octets.subarray(i, i + 0x8000));
        }
        return btoa(s);
    }

    function depuisPem(pem) {
        var b64 = String(pem).replace(/-----(BEGIN|END) PUBLIC KEY-----/g, '').replace(/\s+/g, '');
        if (!b64) {
            throw new Error("Clé publique absente.");
        }
        var bin = atob(b64);
        var octets = new Uint8Array(bin.length);
        for (var i = 0; i < bin.length; i++) octets[i] = bin.charCodeAt(i);
        return octets;
    }

    function concat(morceaux) {
        var total = 0;
        morceaux.forEach(function (m) { total += m.length; });
        var sortie = new Uint8Array(total);
        var pos = 0;
        morceaux.forEach(function (m) { sortie.set(m, pos); pos += m.length; });
        return sortie;
    }

    function aleatoire(n) {
        var octets = new Uint8Array(n);
        racine.crypto.getRandomValues(octets);
        return octets;
    }

    function donneesAuthentifiees(prefixe, k, iv, c) {
        var longueur = new Uint8Array(4);
        new DataView(longueur.buffer).setUint32(0, k.length, false);
        return concat([enc.encode(prefixe), new Uint8Array([0]), longueur, k, iv, c]);
    }

    /**
     * Scelle clair (chaîne ou Uint8Array) pour la clé publique PEM (SPKI).
     * Renvoie une promesse de chaîne "<préfixe>base64(JSON)".
     */
    async function sceller(prefixe, pem, clair) {
        verifierEnvironnement();
        if (PREFIXES.indexOf(prefixe) < 0) {
            throw new Error("Préfixe de chiffrement inconnu : " + prefixe);
        }
        var message = typeof clair === 'string' ? enc.encode(clair) : new Uint8Array(clair);

        var cleRsa = await subtle.importKey('spki', depuisPem(pem), { name: 'RSA-OAEP', hash: 'SHA-256' }, false, ['encrypt']);
        var materiel = aleatoire(64);
        var kc = await subtle.importKey('raw', materiel.slice(0, 32), { name: 'AES-CBC' }, false, ['encrypt']);
        var km = await subtle.importKey('raw', materiel.slice(32), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
        var iv = aleatoire(16);

        var c = new Uint8Array(await subtle.encrypt({ name: 'AES-CBC', iv: iv }, kc, message));
        var k = new Uint8Array(await subtle.encrypt({ name: 'RSA-OAEP' }, cleRsa, materiel));
        materiel.fill(0);
        var t = new Uint8Array(await subtle.sign('HMAC', km, donneesAuthentifiees(prefixe, k, iv, c)));

        return prefixe + btoa(JSON.stringify({ k: versB64(k), i: versB64(iv), c: versB64(c), t: versB64(t) }));
    }

    /**
     * R1 (T18) : le navigateur produit lui-même les N bulletins que l'urne
     * conservera, un par unité de poids de l'électeur, chacun scellé avec son
     * propre aléa (aucun chiffré identique, E24). Le serveur les dépose tels
     * quels : l'urne conserve exactement ce que le navigateur a produit, et le
     * reçu calculé ici (RecuBulletin) porte sur ce que l'urne stocke.
     * Renvoie la liste des bulletins b2.
     */
    async function chiffrerBulletins(bulletinJson, pemVote, poids) {
        var n = Math.max(1, Math.floor(Number(poids) || 1));
        var bulletins = [];
        for (var i = 0; i < n; i++) {
            bulletins.push(await sceller('b2:', pemVote, bulletinJson));
        }
        return bulletins;
    }

    var ChiffrementBulletin = {
        sceller: sceller,
        chiffrerBulletins: chiffrerBulletins,
        donneesAuthentifiees: donneesAuthentifiees
    };

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = ChiffrementBulletin;
    } else {
        racine.ChiffrementBulletin = ChiffrementBulletin;
    }
})(typeof globalThis !== 'undefined' ? globalThis : this);
