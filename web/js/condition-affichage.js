/*
 * Conditions d'affichage des champs (attribut data-condition des gabarits),
 * évaluées sans eval ni new Function (CSP stricte, T16).
 *
 * Grammaire reconnue, atomes combinés par || puis par && (sans parenthèses) :
 *   S.val() == '<texte>'        S.val() != '<texte>'
 *   S.is(':checked')
 *   auth1Checked('<classe>') > <nombre>    auth1Checked('<classe>') < <nombre>
 * où S s'écrit $('<sélecteur>') ou jQuery('<sélecteur>'), avec en option
 * « , parent.document » (champ de la page qui contient la fenêtre modale).
 *
 * Une condition qui contient une forme inconnue vaut faux : le bloc reste
 * masqué, et la forme est signalée dans la console. Le test
 * vote/tests/js/condition-affichage.test.js vérifie que toutes les
 * conditions des gabarits sont reconnues.
 *
 * Utilisable dans le navigateur (window.ConditionAffichage) et sous Node
 * (module.exports) pour les tests.
 */
(function (racine, fabrique) {
    'use strict';
    if (typeof module === 'object' && module.exports) {
        module.exports = fabrique();
    } else {
        racine.ConditionAffichage = fabrique();
    }
})(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    var SELECTEUR = "(?:\\$|jQuery)\\(\\s*'([^']+)'(\\s*,\\s*parent\\.document)?\\s*\\)";
    var FORMES = [
        {
            type: 'valeur',
            motif: new RegExp('^' + SELECTEUR + "\\.val\\(\\)\\s*(==|!=)\\s*'([^']*)'$"),
            lire: function (m) {
                return { type: 'valeur', selecteur: m[1], parent: !!m[2], operateur: m[3], valeur: m[4] };
            }
        },
        {
            type: 'coche',
            motif: new RegExp('^' + SELECTEUR + "\\.is\\(\\s*':checked'\\s*\\)$"),
            lire: function (m) {
                return { type: 'coche', selecteur: m[1], parent: !!m[2] };
            }
        },
        {
            type: 'auth1',
            motif: /^auth1Checked\(\s*'([^']+)'\s*\)\s*(>|<)\s*(\d+)$/,
            lire: function (m) {
                return { type: 'auth1', classe: m[1], operateur: m[2], nombre: Number(m[3]) };
            }
        }
    ];

    /** Atome analysé, ou null si la forme n'est pas reconnue. */
    function analyserAtome(texte) {
        texte = String(texte).trim();
        for (var i = 0; i < FORMES.length; i++) {
            var m = texte.match(FORMES[i].motif);
            if (m) {
                return FORMES[i].lire(m);
            }
        }
        return null;
    }

    /**
     * Condition analysée : liste d'alternatives (||), chacune liste d'atomes
     * (&&). Renvoie null si un atome n'est pas reconnu ou si la condition est
     * vide.
     */
    function analyser(condition) {
        condition = String(condition == null ? '' : condition).trim();
        if (condition === '') {
            return null;
        }
        var alternatives = condition.split('||').map(function (alternative) {
            return alternative.split('&&').map(analyserAtome);
        });
        var reconnue = alternatives.every(function (atomes) {
            return atomes.every(function (atome) { return atome !== null; });
        });
        return reconnue ? alternatives : null;
    }

    /**
     * Évalue une condition. env fournit l'accès à la page :
     *   valeur(selecteur, duParent)  -> valeur du champ (jQuery .val())
     *   coche(selecteur, duParent)   -> booléen (jQuery .is(':checked'))
     *   auth1Checked(classe)         -> nombre (absent : atome faux)
     *   signaler(message)            -> facultatif, forme non reconnue
     */
    function evaluer(condition, env) {
        var arbre = analyser(condition);
        if (arbre === null) {
            if (env && typeof env.signaler === 'function') {
                env.signaler('Condition d\'affichage non reconnue : ' + condition);
            }
            return false;
        }
        var evaluerAtome = function (atome) {
            switch (atome.type) {
                case 'valeur':
                    var valeur = env.valeur(atome.selecteur, atome.parent);
                    // Comparaison souple, comme l'ancienne évaluation (eval) :
                    // un champ absent (undefined) est différent de tout texte.
                    /* eslint-disable eqeqeq */
                    return atome.operateur === '==' ? valeur == atome.valeur : valeur != atome.valeur;
                    /* eslint-enable eqeqeq */
                case 'coche':
                    return !!env.coche(atome.selecteur, atome.parent);
                case 'auth1':
                    if (typeof env.auth1Checked !== 'function') {
                        return false;
                    }
                    var n = env.auth1Checked(atome.classe);
                    return atome.operateur === '>' ? n > atome.nombre : n < atome.nombre;
            }
            return false;
        };
        return arbre.some(function (atomes) {
            return atomes.every(evaluerAtome);
        });
    }

    return { analyser: analyser, evaluer: evaluer };
});
