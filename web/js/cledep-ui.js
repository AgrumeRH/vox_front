/*
 * Écrans de génération de la clé de dépouillement (CNIL, écart E2).
 * Toute la cryptographie est faite dans le navigateur par CleDep (cledep.js) :
 * les champs « mot de passe » n'ont pas d'attribut name et ne sont jamais
 * envoyés. Seules la clé publique et les parts chiffrées partent au serveur,
 * dans le champ caché « cles » (ou « cle » pour la clé personnelle d'un membre).
 *
 *  - form[data-cledep="seance"]   : cérémonie en séance (admin)
 *  - form[data-cledep="distance"] : génération à partir des clés déposées par les membres (admin)
 *  - form[data-cledep="membre"]   : un membre choisit son mot de passe depuis son espace
 */
(function ($) {
    'use strict';

    function lireJson(id) {
        var el = document.getElementById(id);
        return el ? JSON.parse(el.textContent) : null;
    }

    function erreur(texte) {
        masquerProgression();
        if (typeof swal === 'function') {
            swal({ title: 'Clé de dépouillement', text: texte, type: 'error' });
        } else {
            alert(texte);
        }
    }

    function afficherProgression(texte) {
        var el = document.getElementById('cledepProgression');
        if (!el) {
            el = document.createElement('div');
            el.id = 'cledepProgression';
            el.setAttribute('role', 'status');
            el.style.cssText = 'position:fixed;inset:0;z-index:20000;background:rgba(255,255,255,.92);display:flex;align-items:center;justify-content:center;flex-direction:column;font-size:1.2em;text-align:center;padding:2em';
            el.innerHTML = '<i class="fa fa-key fa-2x mb-3"></i><div class="texte"></div><small class="text-muted mt-3">Ne fermez pas cette page. La clé est générée sur ce poste : ni la clé privée, ni les mots de passe ne sont envoyés au serveur.</small>';
            document.body.appendChild(el);
        }
        el.querySelector('.texte').textContent = texte;
    }

    function masquerProgression() {
        var el = document.getElementById('cledepProgression');
        if (el) { el.parentNode.removeChild(el); }
    }

    function viderMotsDePasse($form) {
        // Champs remasqués d'abord : un mot de passe affiché en clair (œil) est aussi vidé
        $form.find('.showhidepw').each(function () {
            $(this).prev('input').attr('type', 'password');
            $(this).find('i').removeClass('fa-eye-slash').addClass('fa-eye');
        });
        $form.find('input[type=password]').val('');
    }

    function envoyer(form, champ, valeur) {
        var input = form.querySelector('input[name="' + champ + '"]');
        if (!input) {
            input = document.createElement('input');
            input.type = 'hidden';
            input.name = champ;
            form.appendChild(input);
        }
        input.value = valeur;
        // HTMLFormElement.submit() ne redéclenche pas l'événement submit.
        HTMLFormElement.prototype.submit.call(form);
    }

    /* ---------- Cérémonie en séance ---------- */

    async function ceremonieSeance(form) {
        var $form = $(form);
        var membresParVote = lireJson('cledepMembresParVote') || {};

        // Mots de passe saisis (les membres « absents » n'ont plus de champ)
        var mdps = {};
        $form.find('input.pass1[data-member-id]').each(function () {
            var v = $(this).val();
            if (v) { mdps[$(this).data('member-id')] = v; }
        });

        var cles = {};
        var voteIds = Object.keys(membresParVote);
        for (var i = 0; i < voteIds.length; i++) {
            var voteId = voteIds[i];
            var membres = membresParVote[voteId]
                .filter(function (id) { return mdps[id]; })
                .map(function (id) { return { id: id, mdp: mdps[id] }; });
            if (membres.length < 3) {
                throw new Error("Au moins 3 membres du bureau de ce vote doivent saisir un mot de passe (vote #" + voteId + ").");
            }
            // Une clé distincte par vote, comme auparavant.
            var r = await CleDep.ceremonie([{ vote_id: voteId, membres: membres }], { progression: afficherProgression });
            cles[voteId] = { publicPem: r.publicPem, parts: r.parts[voteId] };
        }
        mdps = null;
        viderMotsDePasse($form);
        afficherProgression('Enregistrement de la clé publique et des parts chiffrées…');
        envoyer(form, 'cles', JSON.stringify(cles));
    }

    /* ---------- Choix à distance : chiffrement pour les clés des membres ---------- */

    async function ceremonieDistance(form) {
        var clesMembres = lireJson('cledepClesMembres') || {};
        var voteIds = Object.keys(clesMembres);
        if (!voteIds.length) { throw new Error("Aucune clé de membre n'a été déposée."); }

        // Votes scellés ensemble : une seule clé, comme pour l'organisateur.
        var votes = voteIds.map(function (voteId) {
            return {
                vote_id: voteId,
                membres: Object.keys(clesMembres[voteId]).map(function (id) { return { id: id, cle: clesMembres[voteId][id] }; })
            };
        });
        var r = await CleDep.ceremonie(votes, { progression: afficherProgression });
        var cles = {};
        voteIds.forEach(function (voteId) { cles[voteId] = { publicPem: r.publicPem, parts: r.parts[voteId] }; });
        afficherProgression('Enregistrement de la clé publique et des parts chiffrées…');
        envoyer(form, 'cles', JSON.stringify(cles));
    }

    /* ---------- Clé personnelle d'un membre ---------- */

    async function cleMembre(form) {
        var $form = $(form);
        var mdp = $form.find('#password1').val();
        if (!mdp) { throw new Error('Veuillez choisir votre mot de passe.'); }
        if (mdp !== $form.find('#password2').val()) { throw new Error('Les mots de passe ne sont pas identiques.'); }
        var probleme = CleDep.controlerMdp(mdp, $form.data('force'));
        if (probleme) { throw new Error(probleme); }

        afficherProgression('Création de votre clé personnelle de dépouillement…');
        var cle = await CleDep.creerCleMembre(mdp, { vote: $form.data('vote'), membre: $form.data('membre') });
        viderMotsDePasse($form);
        envoyer(form, 'cle', JSON.stringify(cle));
    }

    var actions = { seance: ceremonieSeance, distance: ceremonieDistance, membre: cleMembre };

    $(document).on('submit', 'form[data-cledep]', function (event) {
        event.preventDefault();
        var form = this;
        var action = actions[$(form).data('cledep')];
        if (!action) { return; }
        if (!window.CleDep || !window.crypto || !window.crypto.subtle) {
            erreur("Ce navigateur ne permet pas de générer la clé de dépouillement. Utilisez un navigateur récent (Firefox, Chrome, Edge, Safari).");
            return;
        }
        afficherProgression('Préparation…');
        // Laisse le navigateur afficher la progression avant les calculs.
        setTimeout(function () {
            action(form).catch(function (e) { erreur(e && e.message ? e.message : String(e)); });
        }, 50);
    });
})(jQuery);
