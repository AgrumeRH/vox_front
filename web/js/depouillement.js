/*
 * Dépouillement dans le navigateur du bureau (CNIL, écart E3).
 *
 * Le serveur de vote connaît les identités des électeurs : il ne reconstitue
 * plus la clé de dépouillement et ne déchiffre plus les bulletins. Sur ce
 * poste, CleDep (cledep.js) :
 *  1. déchiffre les parts des membres présents avec leurs mots de passe ;
 *  2. reconstitue la clé (non exportable) et la contrôle avec la phrase témoin ;
 *  3. déchiffre le défi du serveur (preuve que le bureau détient la clé) ;
 *  4. déchiffre les enveloppes de l'urne (env2:, puis bulletins b2:, E4),
 *     transmises sans aucune identité ; un bulletin dont l'authentification
 *     échoue est rejeté (compté nul), avec son motif ;
 *  5. renvoie la liste TRIÉE des bulletins en clair, sans lien avec les chiffrés.
 *
 * Les champs « mot de passe » n'ont pas d'attribut name : ils ne sont jamais
 * envoyés. La clé n'existe que dans la mémoire de cette page.
 */
(function ($) {
    'use strict';

    function lireJson(id) {
        var el = document.getElementById(id);
        return el ? JSON.parse(el.textContent) : null;
    }

    function afficherProgression(texte) {
        var el = document.getElementById('depouillementProgression');
        if (!el) {
            el = document.createElement('div');
            el.id = 'depouillementProgression';
            el.setAttribute('role', 'status');
            el.style.cssText = 'position:fixed;inset:0;z-index:20000;background:rgba(255,255,255,.92);display:flex;align-items:center;justify-content:center;flex-direction:column;font-size:1.2em;text-align:center;padding:2em';
            el.innerHTML = '<i class="fa fa-key fa-2x mb-3"></i><div class="texte"></div><small class="text-muted mt-3">Ne fermez pas cette page. La clé de dépouillement est reconstituée et l\'urne est déchiffrée sur ce poste : ni la clé, ni les mots de passe ne sont envoyés au serveur.</small>';
            document.body.appendChild(el);
        }
        el.querySelector('.texte').textContent = texte;
    }

    function masquerProgression() {
        var el = document.getElementById('depouillementProgression');
        if (el) { el.parentNode.removeChild(el); }
    }

    function erreur(texte) {
        masquerProgression();
        // Même place qu'une erreur du serveur : bandeau en tête de page.
        var bandeau = document.getElementById('depouillementErreur');
        if (!bandeau) {
            bandeau = document.createElement('div');
            bandeau.id = 'depouillementErreur';
            bandeau.className = 'alert alert-danger';
            bandeau.setAttribute('role', 'alert');
            var titre = document.querySelector('h1');
            if (titre && titre.parentNode) { titre.parentNode.insertBefore(bandeau, titre.nextSibling); } else { document.body.insertBefore(bandeau, document.body.firstChild); }
        }
        bandeau.textContent = texte;
        if (typeof swal === 'function') {
            swal({ title: 'Dépouillement', text: texte, type: 'error' });
        } else {
            alert(texte);
        }
    }

    function nomMembre(id) {
        var champ = document.getElementById('pass_' + id);
        var etape = champ ? $(champ).closest('.oneStep').find('h4 b').text() : '';
        return $.trim(etape) || ('#' + id);
    }

    async function chargerUrne(url) {
        var reponse = await fetch(url, { credentials: 'same-origin', headers: { Accept: 'application/json' } });
        var donnees = null;
        try { donnees = await reponse.json(); } catch (e) { /* réponse non JSON */ }
        if (!reponse.ok || !donnees || donnees.status !== 'success') {
            throw new Error((donnees && donnees.message) || "Le contenu de l'urne n'a pas pu être récupéré.");
        }
        return donnees;
    }

    async function depouiller(form) {
        var config = lireJson('depouillementClient');
        if (!config || !config.votes) { throw new Error('Configuration du dépouillement absente.'); }

        var mdps = {};
        $(form).find('input.pass1[data-member-id]').each(function () {
            var v = $(this).val();
            if (v) { mdps[$(this).data('member-id')] = v; }
        });

        var resultat = {};
        var voteIds = Object.keys(config.votes);
        for (var i = 0; i < voteIds.length; i++) {
            var voteId = voteIds[i];
            var vote = config.votes[voteId];
            var prefixe = voteIds.length > 1 ? 'Vote ' + (i + 1) + '/' + voteIds.length + ' : ' : '';

            afficherProgression(prefixe + 'Reconstitution de la clé de dépouillement…');
            var r;
            try {
                r = await CleDep.reconstituerCle(vote.parts, mdps);
            } catch (e) {
                var details = Object.keys(e.erreurs || {}).map(function (id) {
                    return 'Le mot de passe de ' + nomMembre(id) + " n'a pas pu être utilisé : " + e.erreurs[id];
                });
                throw new Error(details.concat([e.message]).join('\n'));
            }

            try {
                if (await CleDep.verifierTemoin(r.cle, vote.temoin, config.phraseTemoin) === false) {
                    throw new Error('La clé reconstituée ne permet pas de déchiffrer ce vote.');
                }
                var defi = await CleDep.repondreDefi(r.cle, vote.defi);
                if (!defi) { throw new Error('La clé reconstituée ne permet pas de répondre au contrôle du serveur.'); }

                afficherProgression(prefixe + "Récupération du contenu chiffré de l'urne…");
                var urne = await chargerUrne(vote.urne);

                var depouillement = await CleDep.depouillerUrne(r.cle, urne.bulletins, function (t) { afficherProgression(prefixe + t); });
                resultat[voteId] = { defi: defi, urne_hash: urne.urne_hash, bulletins: depouillement.bulletins, rejets: depouillement.rejets, membres: r.membres };
            } finally {
                // CryptoKey non exportable : on retire la seule référence.
                r = null;
            }
        }

        mdps = null;
        $(form).find('input[type=password]').val('');
        afficherProgression('Envoi des bulletins en clair (sans lien avec les bulletins chiffrés) et calcul des résultats…');

        var input = form.querySelector('input[name="clairs"]');
        if (!input) {
            input = document.createElement('input');
            input.type = 'hidden';
            input.name = 'clairs';
            form.appendChild(input);
        }
        input.value = JSON.stringify(resultat);
        // HTMLFormElement.submit() ne redéclenche pas l'événement submit.
        HTMLFormElement.prototype.submit.call(form);
    }

    $(document).on('submit', 'form[data-depouillement="client"]', function (event) {
        event.preventDefault();
        var form = this;
        if (!window.CleDep || !window.crypto || !window.crypto.subtle) {
            erreur('Ce navigateur ne permet pas de dépouiller sur ce poste. Utilisez un navigateur récent (Firefox, Chrome, Edge, Safari), en HTTPS.');
            return;
        }
        afficherProgression('Préparation…');
        setTimeout(function () {
            depouiller(form).catch(function (e) { erreur(e && e.message ? e.message : String(e)); });
        }, 50);
    });
})(jQuery);
