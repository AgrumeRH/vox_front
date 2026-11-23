/*
 * Clé de dépouillement générée côté client (CNIL, écart E2).
 *
 * La paire de clés de l'élection est générée dans le navigateur. Sa partie
 * privée est découpée (Shamir sur GF(256)) et chaque part est chiffrée pour un
 * membre du bureau AVANT d'être envoyée : le serveur ne reçoit que la clé
 * publique et des parts chiffrées. Il ne voit jamais la clé privée ni les mots
 * de passe des membres.
 *
 * Deux façons de chiffrer une part (format « v2 ») :
 *  - t = "mdp"  : cérémonie en séance (mode A). La part est chiffrée avec le
 *                 mot de passe du membre : PBKDF2-SHA256 puis AES-256-GCM.
 *  - t = "ecdh" : choix à distance (mode B). Chaque membre a créé, dans son
 *                 propre navigateur, une paire ECDH P-256 dont la partie privée
 *                 est chiffrée avec son mot de passe (enveloppe "cle-membre").
 *                 La part lui est chiffrée en ECIES : ECDH éphémère, HKDF-SHA256,
 *                 AES-256-GCM. L'enveloppe embarque la clé privée chiffrée du
 *                 membre : elle se suffit à elle-même au dépouillement.
 *
 * Chaque chiffrement est lié à son contexte (vote, membre, abscisse, seuil)
 * par les données authentifiées d'AES-GCM : une part ne peut être ni déplacée
 * vers un autre membre ou un autre vote, ni modifiée sans que le
 * déchiffrement échoue.
 *
 * Le dépouillement est lui aussi fait dans le navigateur du bureau (CNIL, écart
 * E3) : déchiffrement des parts, reconstitution de la clé, déchiffrement de
 * l'urne (voir plus bas). App\Helpers\CleDepouillement (PHP) garde la
 * validation des parts à l'enregistrement et le dépouillement sur le serveur
 * des votes qui ne peuvent pas l'être ici : les deux implémentations doivent
 * rester strictement alignées.
 *
 * Aucune dépendance, aucun CDN : uniquement l'API WebCrypto du navigateur.
 * Le fichier est aussi chargeable sous Node (tests).
 */
(function (racine) {
    'use strict';

    var subtle = racine.crypto && racine.crypto.subtle;

    var VERSION = 2;
    var PBKDF2_ITERATIONS = 600000;
    var RSA_BITS = 4096;
    var SEUIL_DEFAUT = 2;

    var enc = new TextEncoder();

    /* ---------- Utilitaires ---------- */

    function verifierEnvironnement() {
        if (!subtle) {
            throw new Error("Ce navigateur ne permet pas de générer la clé de dépouillement (WebCrypto indisponible). Utilisez un navigateur récent, en HTTPS.");
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

    function depuisB64(b64) {
        var s = atob(b64);
        var octets = new Uint8Array(s.length);
        for (var i = 0; i < s.length; i++) { octets[i] = s.charCodeAt(i); }
        return octets;
    }

    function versPem(der, etiquette) {
        var b64 = versB64(der);
        var lignes = b64.match(/.{1,64}/g).join('\n');
        return '-----BEGIN ' + etiquette + '-----\n' + lignes + '\n-----END ' + etiquette + '-----\n';
    }

    function aleatoire(n) {
        var o = new Uint8Array(n);
        racine.crypto.getRandomValues(o);
        return o;
    }

    function effacer(octets) {
        if (octets && octets.fill) { octets.fill(0); }
    }

    function entier(v, nom) {
        var n = Number(v);
        if (!Number.isInteger(n) || n < 1) { throw new Error('Paramètre invalide : ' + nom); }
        return n;
    }

    /* ---------- Données authentifiées (doivent correspondre au PHP) ---------- */

    function aadPart(t, vote, membre, x, k, n) {
        return enc.encode(['vox-cledep-v2', t, vote, membre, x, k, n].join('|'));
    }

    function aadCleMembre(vote, membre, pubB64) {
        return enc.encode(['vox-cle-membre-v2', vote, membre, pubB64].join('|'));
    }

    function infoHkdf(vote, membre, x) {
        return enc.encode(['vox-cledep-v2', 'ecdh', vote, membre, x].join('|'));
    }

    /* ---------- Shamir sur GF(2^8), polynôme 0x11b ---------- */

    var EXP = new Uint8Array(512);
    var LOG = new Uint8Array(256);
    (function () {
        var x = 1;
        for (var i = 0; i < 255; i++) {
            EXP[i] = x;
            LOG[x] = i;
            // x * 3 = x * 2 xor x
            var x2 = x << 1;
            if (x2 & 0x100) { x2 ^= 0x11b; }
            x = x2 ^ x;
        }
        for (var j = 255; j < 512; j++) { EXP[j] = EXP[j - 255]; }
    })();

    function gfMul(a, b) {
        if (a === 0 || b === 0) { return 0; }
        return EXP[LOG[a] + LOG[b]];
    }

    function gfDiv(a, b) {
        if (b === 0) { throw new Error('Division par zéro'); }
        if (a === 0) { return 0; }
        return EXP[LOG[a] + 255 - LOG[b]];
    }

    /**
     * Découpe un secret en n parts, k d'entre elles suffisent à le reconstituer.
     * Renvoie [{x: 1..n, y: Uint8Array}].
     */
    function partager(secret, n, k) {
        n = entier(n, 'n');
        k = entier(k, 'k');
        if (k < 2 || k > n || n > 255) { throw new Error('Seuil de partage invalide (' + k + ' sur ' + n + ').'); }

        var parts = [];
        for (var p = 0; p < n; p++) { parts.push({ x: p + 1, y: new Uint8Array(secret.length) }); }

        var coef = new Uint8Array(k);
        for (var i = 0; i < secret.length; i++) {
            coef[0] = secret[i];
            racine.crypto.getRandomValues(coef.subarray(1));
            for (var q = 0; q < n; q++) {
                // Horner
                var x = parts[q].x, y = 0;
                for (var c = k - 1; c >= 0; c--) { y = gfMul(y, x) ^ coef[c]; }
                parts[q].y[i] = y;
            }
        }
        effacer(coef);
        return parts;
    }

    /** Reconstitue le secret (interpolation de Lagrange en 0). */
    function combiner(parts) {
        if (!parts || parts.length < 2) { throw new Error('Au moins deux parts sont nécessaires.'); }
        var longueur = parts[0].y.length;
        var xs = {};
        parts.forEach(function (p) {
            if (p.y.length !== longueur) { throw new Error('Parts de longueurs différentes.'); }
            if (p.x < 1 || p.x > 255 || xs[p.x]) { throw new Error('Abscisses de parts invalides.'); }
            xs[p.x] = true;
        });

        var coefs = parts.map(function (pi, i) {
            var num = 1, den = 1;
            parts.forEach(function (pj, j) {
                if (i === j) { return; }
                num = gfMul(num, pj.x);
                den = gfMul(den, pj.x ^ pi.x);
            });
            return gfDiv(num, den);
        });

        var secret = new Uint8Array(longueur);
        for (var b = 0; b < longueur; b++) {
            var s = 0;
            for (var i = 0; i < parts.length; i++) { s ^= gfMul(parts[i].y[b], coefs[i]); }
            secret[b] = s;
        }
        return secret;
    }

    /* ---------- Dérivations ---------- */

    async function cleDepuisMdp(mdp, sel, iterations) {
        var base = await subtle.importKey('raw', enc.encode(mdp), 'PBKDF2', false, ['deriveKey']);
        return subtle.deriveKey(
            { name: 'PBKDF2', hash: 'SHA-256', salt: sel, iterations: iterations },
            base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']
        );
    }

    async function gcmChiffrer(cle, clair, aad) {
        var iv = aleatoire(12);
        var ct = await subtle.encrypt({ name: 'AES-GCM', iv: iv, additionalData: aad }, cle, clair);
        return { iv: versB64(iv), ct: versB64(ct) };
    }

    async function gcmDechiffrer(cle, env, aad) {
        try {
            return new Uint8Array(await subtle.decrypt(
                { name: 'AES-GCM', iv: depuisB64(env.iv), additionalData: aad }, cle, depuisB64(env.ct)
            ));
        } catch (e) {
            throw new Error('Mot de passe incorrect ou part altérée.');
        }
    }

    /* ---------- Clé de l'élection ---------- */

    /**
     * Génère la paire RSA de l'élection. La clé publique (PEM SPKI) sert à
     * chiffrer les bulletins ; la clé privée (PKCS#8 DER) est le secret à partager.
     */
    async function genererCleElection() {
        verifierEnvironnement();
        var paire = await subtle.generateKey(
            { name: 'RSA-OAEP', modulusLength: RSA_BITS, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' },
            true, ['encrypt', 'decrypt']
        );
        var spki = await subtle.exportKey('spki', paire.publicKey);
        var pkcs8 = new Uint8Array(await subtle.exportKey('pkcs8', paire.privateKey));
        return { publicPem: versPem(spki, 'PUBLIC KEY'), publicKey: paire.publicKey, secret: pkcs8 };
    }

    /** Vérifie qu'un secret (PKCS#8) correspond bien à la clé publique générée. */
    async function verifierCorrespondance(secret, publicKey) {
        var privee = await subtle.importKey('pkcs8', secret, { name: 'RSA-OAEP', hash: 'SHA-256' }, false, ['decrypt']);
        var temoin = aleatoire(32);
        var chiffre = await subtle.encrypt({ name: 'RSA-OAEP' }, publicKey, temoin);
        var clair = new Uint8Array(await subtle.decrypt({ name: 'RSA-OAEP' }, privee, chiffre));
        if (versB64(clair) !== versB64(temoin)) {
            throw new Error('La clé reconstituée ne correspond pas à la clé publique.');
        }
    }

    /* ---------- Mode A : part chiffrée par mot de passe ---------- */

    async function chiffrerPartMdp(part, mdp, ctx) {
        if (!mdp) { throw new Error('Mot de passe manquant pour le membre ' + ctx.membre + '.'); }
        var sel = aleatoire(16);
        var cle = await cleDepuisMdp(mdp, sel, PBKDF2_ITERATIONS);
        var c = await gcmChiffrer(cle, part.y, aadPart('mdp', ctx.vote, ctx.membre, part.x, ctx.k, ctx.n));
        return {
            v: VERSION, t: 'mdp', vote: ctx.vote, membre: ctx.membre, x: part.x, k: ctx.k, n: ctx.n,
            kdf: { a: 'PBKDF2-SHA256', i: PBKDF2_ITERATIONS, s: versB64(sel) }, iv: c.iv, ct: c.ct
        };
    }

    async function dechiffrerPartMdp(env, mdp) {
        var cle = await cleDepuisMdp(mdp, depuisB64(env.kdf.s), env.kdf.i);
        var y = await gcmDechiffrer(cle, env, aadPart('mdp', env.vote, env.membre, env.x, env.k, env.n));
        return { x: env.x, y: y };
    }

    /* ---------- Mode B : clé personnelle du membre ---------- */

    /**
     * Créée dans le navigateur du membre (page « mot de passe de dépouillement »).
     * Seule cette enveloppe est envoyée : clé publique en clair, clé privée
     * chiffrée avec le mot de passe, qui ne quitte jamais le navigateur.
     */
    async function creerCleMembre(mdp, ctx) {
        verifierEnvironnement();
        if (!mdp) { throw new Error('Mot de passe manquant.'); }
        var paire = await subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
        var pub = versB64(await subtle.exportKey('spki', paire.publicKey));
        var pkcs8 = new Uint8Array(await subtle.exportKey('pkcs8', paire.privateKey));
        var sel = aleatoire(16);
        var cle = await cleDepuisMdp(mdp, sel, PBKDF2_ITERATIONS);
        var c = await gcmChiffrer(cle, pkcs8, aadCleMembre(ctx.vote, ctx.membre, pub));
        effacer(pkcs8);
        return {
            v: VERSION, t: 'cle-membre', vote: ctx.vote, membre: ctx.membre, pub: pub,
            kdf: { a: 'PBKDF2-SHA256', i: PBKDF2_ITERATIONS, s: versB64(sel) }, iv: c.iv, ct: c.ct
        };
    }

    function verifierCleMembre(wk, ctx) {
        if (!wk || wk.v !== VERSION || wk.t !== 'cle-membre' || !wk.pub || !wk.kdf || !wk.iv || !wk.ct) {
            throw new Error('Clé du membre ' + ctx.membre + ' invalide : il doit redéfinir son mot de passe.');
        }
        if (String(wk.vote) !== String(ctx.vote) || String(wk.membre) !== String(ctx.membre)) {
            throw new Error('La clé du membre ' + ctx.membre + ' ne correspond pas à ce vote.');
        }
    }

    async function hkdfCle(z, sel, info) {
        var base = await subtle.importKey('raw', z, 'HKDF', false, ['deriveKey']);
        return subtle.deriveKey(
            { name: 'HKDF', hash: 'SHA-256', salt: sel, info: info },
            base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']
        );
    }

    async function chiffrerPartPourMembre(part, wk, ctx) {
        verifierCleMembre(wk, ctx);
        var pubMembre = await subtle.importKey('spki', depuisB64(wk.pub), { name: 'ECDH', namedCurve: 'P-256' }, false, []);
        var eph = await subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
        var z = new Uint8Array(await subtle.deriveBits({ name: 'ECDH', public: pubMembre }, eph.privateKey, 256));
        var sel = aleatoire(16);
        var cle = await hkdfCle(z, sel, infoHkdf(ctx.vote, ctx.membre, part.x));
        effacer(z);
        var c = await gcmChiffrer(cle, part.y, aadPart('ecdh', ctx.vote, ctx.membre, part.x, ctx.k, ctx.n));
        return {
            v: VERSION, t: 'ecdh', vote: ctx.vote, membre: ctx.membre, x: part.x, k: ctx.k, n: ctx.n,
            epk: versB64(await subtle.exportKey('spki', eph.publicKey)), hs: versB64(sel),
            iv: c.iv, ct: c.ct, wk: wk
        };
    }

    async function dechiffrerPartEcdh(env, mdp) {
        var wk = env.wk;
        var cleMdp = await cleDepuisMdp(mdp, depuisB64(wk.kdf.s), wk.kdf.i);
        var pkcs8 = await gcmDechiffrer(cleMdp, wk, aadCleMembre(wk.vote, wk.membre, wk.pub));
        var privee = await subtle.importKey('pkcs8', pkcs8, { name: 'ECDH', namedCurve: 'P-256' }, false, ['deriveBits']);
        effacer(pkcs8);
        var epk = await subtle.importKey('spki', depuisB64(env.epk), { name: 'ECDH', namedCurve: 'P-256' }, false, []);
        var z = new Uint8Array(await subtle.deriveBits({ name: 'ECDH', public: epk }, privee, 256));
        var cle = await hkdfCle(z, depuisB64(env.hs), infoHkdf(env.vote, env.membre, env.x));
        effacer(z);
        var y = await gcmDechiffrer(cle, env, aadPart('ecdh', env.vote, env.membre, env.x, env.k, env.n));
        return { x: env.x, y: y };
    }

    /* ---------- Cérémonie ---------- */

    /**
     * Génère UNE paire de clés pour les votes fournis et chiffre les parts.
     *
     * votes : [{ vote_id, membres: [{ id, mdp }] }]  (mode A)
     *      ou [{ vote_id, membres: [{ id, cle }] }]  (mode B, cle = enveloppe "cle-membre")
     * options.seuil : nombre de parts nécessaires au dépouillement (2 par défaut).
     * options.progression(texte) : rappel facultatif pour l'affichage.
     *
     * Renvoie { publicPem, parts: { vote_id: { member_id: "<json>" } } }.
     * La clé privée n'est jamais renvoyée : elle est effacée avant la fin.
     */
    async function ceremonie(votes, options) {
        verifierEnvironnement();
        options = options || {};
        var progression = options.progression || function () {};
        if (!votes || !votes.length) { throw new Error('Aucun vote à sceller.'); }

        progression('Génération de la clé de dépouillement (RSA ' + RSA_BITS + ' bits)…');
        var cle = await genererCleElection();
        var resultat = { publicPem: cle.publicPem, parts: {} };

        try {
            for (var v = 0; v < votes.length; v++) {
                var vote = votes[v];
                var voteId = entier(vote.vote_id, 'vote_id');
                var membres = vote.membres || [];
                var n = membres.length;
                if (n < 3) {
                    throw new Error("Il est nécessaire qu'au moins 3 membres du bureau participent pour générer la clé de dépouillement.");
                }
                var k = Math.min(Math.max(2, entier(options.seuil || SEUIL_DEFAUT, 'seuil')), n);

                var parts = partager(cle.secret, n, k);
                var envs = {};
                var cachePourTest = [];

                for (var m = 0; m < n; m++) {
                    var membre = membres[m];
                    var ctx = { vote: voteId, membre: entier(membre.id, 'membre'), k: k, n: n };
                    progression('Chiffrement de la part ' + (m + 1) + '/' + n + ' du vote #' + voteId + '…');
                    var env = membre.cle
                        ? await chiffrerPartPourMembre(parts[m], membre.cle, ctx)
                        : await chiffrerPartMdp(parts[m], membre.mdp, ctx);

                    // Mode A : on vérifie que chaque part se déchiffre avec le mot
                    // de passe saisi (faute de frappe impossible à rattraper ensuite).
                    if (!membre.cle) {
                        var relue = await dechiffrerPartMdp(env, membre.mdp);
                        if (versB64(relue.y) !== versB64(parts[m].y)) {
                            throw new Error('Contrôle de la part du membre ' + ctx.membre + ' en échec.');
                        }
                        effacer(relue.y);
                    }
                    envs[ctx.membre] = JSON.stringify(env);
                    cachePourTest.push(parts[m]);
                }

                // Toute combinaison de k parts doit redonner la clé : on contrôle
                // les k premières et les k dernières.
                progression('Contrôle de la clé du vote #' + voteId + '…');
                var debut = combiner(cachePourTest.slice(0, k));
                await verifierCorrespondance(debut, cle.publicKey);
                effacer(debut);
                var fin = combiner(cachePourTest.slice(n - k));
                await verifierCorrespondance(fin, cle.publicKey);
                effacer(fin);

                parts.forEach(function (p) { effacer(p.y); });
                resultat.parts[voteId] = envs;
            }
        } finally {
            effacer(cle.secret);
            cle.secret = null;
        }
        return resultat;
    }

    /* ---------- Dépouillement dans le navigateur (CNIL, écart E3) ---------- */

    /*
     * Le serveur de vote connaît les identités : il ne doit ni reconstituer la
     * clé, ni déchiffrer les bulletins (objectifs 1-08 et 3-04). Le poste du
     * bureau déchiffre les parts avec les mots de passe saisis, reconstitue la
     * clé, déchiffre l'urne et ne renvoie que la liste TRIÉE des bulletins en
     * clair, sans lien avec les chiffrés : le serveur, qui a vu chaque chiffré
     * avec l'identité de son électeur au dépôt, ne peut pas les rapprocher.
     *
     * Formats (E4, App\Helpers\ChiffrementAuthentifie) : <préfixe> +
     * base64(JSON {k, i, c, t}) ; k = Kc || Km en RSA-OAEP-SHA-256, i = IV,
     * c = AES-256-CBC, t = HMAC-SHA-256 sur préfixe || 0x00 || longueur de k
     * (32 bits gros-boutiste) || k || i || c, vérifié AVANT le déchiffrement.
     * Depuis R1, l'urne contient les bulletins « b2: » produits par le
     * navigateur de l'électeur, déposés tels quels. Une urne d'avant R1
     * contient des enveloppes « env2: » posées par le serveur, qui
     * contiennent chacune un bulletin « b2: ».
     */

    var dec = new TextDecoder('utf-8', { fatal: true });
    var PREFIXE_ENVELOPPE = 'env2:', PREFIXE_BULLETIN = 'b2:', PREFIXE_TEMOIN = 'w2:';
    /* Motifs de rejet, mêmes valeurs que App\Helpers\Enveloppe::REJET_*. */
    var REJET_ENVELOPPE = 'enveloppe', REJET_AUTHENTIFICATION = 'authentification', REJET_DECHIFFREMENT = 'dechiffrement';

    function concatOctets(morceaux) {
        var total = 0;
        morceaux.forEach(function (m) { total += m.length; });
        var sortie = new Uint8Array(total), pos = 0;
        morceaux.forEach(function (m) { sortie.set(m, pos); pos += m.length; });
        return sortie;
    }

    function donneesAuthentifiees(prefixe, k, iv, c) {
        var lg = new Uint8Array([(k.length >>> 24) & 255, (k.length >>> 16) & 255, (k.length >>> 8) & 255, k.length & 255]);
        return concatOctets([enc.encode(prefixe), new Uint8Array([0]), lg, k, iv, c]);
    }

    /** Champs [k, i, c, t] d'un objet scellé, ou null s'il est mal formé. */
    function decouperScelle(prefixe, objet) {
        if (typeof objet !== 'string' || objet.indexOf(prefixe) !== 0) { return null; }
        var champs;
        try { champs = JSON.parse(dec.decode(depuisB64(objet.slice(prefixe.length)))); } catch (e) { return null; }
        if (!champs || typeof champs !== 'object') { return null; }
        var v = [];
        var noms = ['k', 'i', 'c', 't'];
        for (var n = 0; n < noms.length; n++) {
            if (typeof champs[noms[n]] !== 'string') { return null; }
            try { v.push(depuisB64(champs[noms[n]])); } catch (e) { return null; }
        }
        if (!v[0].length || v[1].length !== 16 || v[3].length !== 32 || !v[2].length || v[2].length % 16) { return null; }
        return v;
    }

    /**
     * Ouvre un objet scellé (même construction que ChiffrementAuthentifie::ouvrir).
     * Renvoie { clair: Uint8Array } ou { motif: 'format' | 'cle' | 'authentification' | 'dechiffrement' }.
     */
    async function ouvrirScelle(prefixe, objet, cle) {
        var p = decouperScelle(prefixe, objet);
        if (!p) { return { motif: 'format' }; }
        var materiel;
        try { materiel = new Uint8Array(await subtle.decrypt({ name: 'RSA-OAEP' }, cle, p[0])); } catch (e) { return { motif: 'cle' }; }
        if (materiel.length !== 64) { effacer(materiel); return { motif: 'cle' }; }
        try {
            var km = await subtle.importKey('raw', materiel.slice(32), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
            if (!(await subtle.verify('HMAC', km, p[3], donneesAuthentifiees(prefixe, p[0], p[1], p[2])))) {
                return { motif: 'authentification' };
            }
            var kc = await subtle.importKey('raw', materiel.slice(0, 32), { name: 'AES-CBC' }, false, ['decrypt']);
            try {
                return { clair: new Uint8Array(await subtle.decrypt({ name: 'AES-CBC', iv: p[1] }, kc, p[2])) };
            } catch (e) {
                return { motif: 'dechiffrement' };
            }
        } finally {
            effacer(materiel);
        }
    }

    /** Importe la clé privée reconstituée (PKCS#8) pour RSA-OAEP-SHA-256. */
    async function importerClePrivee(pkcs8) {
        try {
            return await subtle.importKey('pkcs8', pkcs8, { name: 'RSA-OAEP', hash: 'SHA-256' }, false, ['decrypt']);
        } catch (e) {
            throw new Error("La clé de dépouillement n'a pas pu être reconstituée.");
        }
    }

    /**
     * Déchiffre les parts saisies et reconstitue la clé privée d'un vote.
     *
     * envs : { member_id: "<enveloppe JSON>" } (parts du vote)
     * mdps : { member_id: mot de passe } (membres présents)
     * Renvoie { cle (CryptoKey non extractible), membres: [ids utilisés], erreurs: { member_id: message } }.
     * Lève une erreur si moins de k parts sont utilisables.
     */
    async function reconstituerCle(envs, mdps) {
        verifierEnvironnement();
        var parts = [], membres = [], erreurs = {}, k = 2;
        var ids = Object.keys(envs || {});
        for (var i = 0; i < ids.length; i++) {
            var env = JSON.parse(envs[ids[i]]);
            k = Math.max(k, Number(env.k) || 2);
            var mdp = mdps[ids[i]];
            if (!mdp) { continue; }
            try {
                if (String(env.membre) !== String(ids[i])) { throw new Error("Cette part n'appartient pas à ce membre."); }
                var part = env.t === 'ecdh' ? await dechiffrerPartEcdh(env, mdp) : await dechiffrerPartMdp(env, mdp);
                parts.push(part);
                membres.push(Number(ids[i]));
            } catch (e) {
                erreurs[ids[i]] = e && e.message ? e.message : String(e);
            }
        }
        if (parts.length < k) {
            parts.forEach(function (p) { effacer(p.y); });
            var err = new Error("La clé n'est pas complète : il est nécessaire d'avoir au moins " + k + ' mots de passe valides.');
            err.erreurs = erreurs;
            throw err;
        }
        var secret = combiner(parts.slice(0, k));
        parts.forEach(function (p) { effacer(p.y); });
        try {
            return { cle: await importerClePrivee(secret), membres: membres, erreurs: erreurs };
        } finally {
            effacer(secret);
        }
    }

    /** Déchiffre une valeur RSA-OAEP-SHA-256 brute (base64) ; null si impossible. */
    async function dechiffrerOaep(cle, b64) {
        try { return new Uint8Array(await subtle.decrypt({ name: 'RSA-OAEP' }, cle, depuisB64(String(b64)))); } catch (e) { return null; }
    }

    /**
     * Contrôle la clé avec la phrase témoin du vote (préfixe « w2: », T5).
     * Renvoie true ou false ; null pour un témoin d'un ancien format, que
     * seul le serveur sait lire (le défi suffit alors).
     */
    async function verifierTemoin(cle, temoin, phrase) {
        if (typeof temoin !== 'string' || temoin.indexOf(PREFIXE_TEMOIN) !== 0) { return null; }
        var clair = await dechiffrerOaep(cle, temoin.slice(PREFIXE_TEMOIN.length));
        if (!clair) { return false; }
        try { return dec.decode(clair) === phrase; } catch (e) { return false; }
    }

    /** Réponse au défi du serveur (base64 du défi déchiffré), ou null. */
    async function repondreDefi(cle, defiB64) {
        var clair = await dechiffrerOaep(cle, defiB64);
        return clair ? versB64(clair) : null;
    }

    /**
     * Déchiffre un bulletin de l'urne (« b2: » depuis R1 ; avant R1,
     * enveloppe « env2: » puis bulletin « b2: »). Renvoie { clair: string } ou { motif } (mêmes motifs et même
     * correspondance que App\Helpers\Enveloppe::dechiffrer).
     */
    async function dechiffrerBulletin(cle, stocke) {
        // R1 : bulletin b2 déposé tel quel par le navigateur de l'électeur.
        if (typeof stocke === 'string' && stocke.indexOf(PREFIXE_BULLETIN) === 0) {
            var direct = await ouvrirScelle(PREFIXE_BULLETIN, stocke, cle);
            if (!direct.clair) { return { motif: direct.motif === 'dechiffrement' ? REJET_DECHIFFREMENT : REJET_AUTHENTIFICATION }; }
            try { return { clair: dec.decode(direct.clair) }; } catch (e) { return { motif: REJET_DECHIFFREMENT }; }
        }
        var env = await ouvrirScelle(PREFIXE_ENVELOPPE, stocke, cle);
        if (!env.clair) { return { motif: REJET_ENVELOPPE }; }
        var chiffre;
        try { chiffre = dec.decode(env.clair); } catch (e) { return { motif: REJET_ENVELOPPE }; }
        if (chiffre.indexOf(PREFIXE_BULLETIN) !== 0) { return { motif: REJET_DECHIFFREMENT }; }
        var b = await ouvrirScelle(PREFIXE_BULLETIN, chiffre, cle);
        if (!b.clair) { return { motif: b.motif === 'dechiffrement' ? REJET_DECHIFFREMENT : REJET_AUTHENTIFICATION }; }
        try { return { clair: dec.decode(b.clair) }; } catch (e) { return { motif: REJET_DECHIFFREMENT }; }
    }

    /** Ordre total, identique à App\Helpers\Bulletin::trier (PHP) : octets UTF-8, puis les null. */
    function trierBulletins(liste) {
        return liste.slice().sort(function (a, b) {
            if (a === null || b === null) { return a === b ? 0 : (a === null ? 1 : -1); }
            var oa = enc.encode(a), ob = enc.encode(b);
            for (var i = 0; i < Math.min(oa.length, ob.length); i++) {
                if (oa[i] !== ob[i]) { return oa[i] - ob[i]; }
            }
            return oa.length - ob.length;
        });
    }

    /**
     * Déchiffre le contenu de l'urne. Renvoie { bulletins: liste TRIÉE des
     * bulletins en clair (null pour un rejet), de même longueur que l'urne,
     * rejets: { motif: nombre } }.
     */
    async function depouillerUrne(cle, chiffres, progression) {
        progression = progression || function () {};
        var clairs = [], rejets = {};
        for (var i = 0; i < chiffres.length; i++) {
            var r = await dechiffrerBulletin(cle, chiffres[i]);
            if (r.clair === undefined) {
                clairs.push(null);
                rejets[r.motif] = (rejets[r.motif] || 0) + 1;
            } else {
                clairs.push(r.clair);
            }
            if (i % 25 === 24) {
                progression('Déchiffrement des bulletins : ' + (i + 1) + '/' + chiffres.length + '…');
                await new Promise(function (ok) { setTimeout(ok, 0); });
            }
        }
        return { bulletins: trierBulletins(clairs), rejets: rejets };
    }

    /* ---------- Politique de mot de passe (le serveur ne voit plus le mot de passe) ---------- */

    function controlerMdp(mdp, force) {
        force = Number(force) || 1;
        var min = force >= 3 ? 12 : (force === 2 ? 8 : 6);
        if (!mdp || mdp.length < min) { return 'Le mot de passe doit contenir au moins ' + min + ' caractères.'; }
        if (force > 1 && !(/[a-z]/.test(mdp) && /[A-Z]/.test(mdp))) { return 'Le mot de passe doit contenir au moins une majuscule et une minuscule.'; }
        if (force > 2 && !(/\d/.test(mdp) && /[#&@()\[\]\-_!?$+]/.test(mdp))) { return 'Le mot de passe doit contenir au moins un chiffre et un caractère spécial.'; }
        return '';
    }

    var CleDep = {
        VERSION: VERSION,
        PBKDF2_ITERATIONS: PBKDF2_ITERATIONS,
        partager: partager,
        combiner: combiner,
        genererCleElection: genererCleElection,
        chiffrerPartMdp: chiffrerPartMdp,
        dechiffrerPartMdp: dechiffrerPartMdp,
        creerCleMembre: creerCleMembre,
        chiffrerPartPourMembre: chiffrerPartPourMembre,
        dechiffrerPartEcdh: dechiffrerPartEcdh,
        ceremonie: ceremonie,
        controlerMdp: controlerMdp,
        reconstituerCle: reconstituerCle,
        verifierTemoin: verifierTemoin,
        repondreDefi: repondreDefi,
        dechiffrerBulletin: dechiffrerBulletin,
        depouillerUrne: depouillerUrne,
        trierBulletins: trierBulletins,
        versB64: versB64,
        depuisB64: depuisB64
    };

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = CleDep;
    } else {
        racine.CleDep = CleDep;
    }
})(typeof globalThis !== 'undefined' ? globalThis : this);
