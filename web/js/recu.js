/*
 * Reçu de vote (CNIL 2-07, écart E13).
 *
 * Le reçu est l'empreinte SHA-256 de chaque bulletin déposé dans l'urne
 * (une par unité de poids), c'est-à-dire exactement la valeur que l'urne
 * stocke. Il est gardé dans ce navigateur (sessionStorage), affiché sur la
 * page des votes (première empreinte et nombre de voix), à noter ou à
 * télécharger (liste complète), puis se vérifie sur la page publique
 * /electeur/verification et, après le scellement, dans la liste publique des
 * empreintes de l'urne.
 *
 * R1 (T18) : le navigateur produit lui-même les bulletins que l'urne
 * conserve. memoriser() calcule ici leurs empreintes avant chaque envoi et
 * les ajoute aux tentatives « en attente » de ce vote (double clic, second
 * onglet : chaque envoi garde les siennes). Le serveur remet une seule fois
 * les empreintes du dépôt qu'il a confirmé (attribut data-recu-depot) ;
 * afficher() les compare aux tentatives :
 *  - égales à l'une d'elles : reçu confirmé (avec une simple information si
 *    plusieurs envois ont été tentés) ;
 *  - égales à aucune : avertissement, le serveur aurait déposé autre chose
 *    que ce que ce navigateur a produit ; le reçu affiché est celui que le
 *    serveur a confirmé, le fichier téléchargé contient aussi les empreintes
 *    du navigateur ;
 *  - pas de confirmation du serveur : les empreintes du navigateur (dernier
 *    envoi) sont affichées avec un avertissement explicite.
 * L'état (avertissement) est gardé avec le reçu : il reste affiché aux
 * chargements suivants. Quand le serveur signale qu'un envoi a été refusé
 * (attribut data-recu-refus : non conforme, poids modifié, doublon, refus de
 * l'urne), les tentatives en attente de ce vote sont oubliées : elles n'ont
 * pas atteint l'urne, et un vote réussi ensuite ne doit pas afficher
 * « plusieurs envois ».
 */
(function (window) {
	'use strict';

	var PREFIXE = 'recu_bulletin_';
	var ATTENTE = 'recu_attente_';
	var NAVIGATEUR = 'recu_navigateur_';
	var ETAT = 'recu_etat_';
	/** Tentatives gardées par vote (les plus récentes). */
	var MAX_TENTATIVES = 5;
	var HEX = /^[0-9a-f]{64}$/;

	function stockage() {
		try { return window.sessionStorage; } catch (e) { return null; }
	}

	function lireCle(cle) {
		var s = stockage();
		try { return s ? s.getItem(cle) : null; } catch (e) { return null; }
	}

	function ecrireCle(cle, valeur) {
		var s = stockage();
		try {
			if (!s) { return; }
			if (valeur === null) { s.removeItem(cle); } else { s.setItem(cle, valeur); }
		} catch (e) {}
	}

	function hex(tampon) {
		return Array.prototype.map.call(new Uint8Array(tampon), function (o) {
			return ('0' + o.toString(16)).slice(-2);
		}).join('');
	}

	function liste(valeur) {
		return (Array.isArray(valeur) ? valeur : String(valeur || '').split(',')).filter(function (e) {
			return typeof e === 'string' && HEX.test(e);
		});
	}

	/** Liste de tentatives (tableau de listes d'empreintes), JSON ou ancien format « a,b,c ». */
	function tentatives(valeur) {
		if (!valeur) { return []; }
		var brut;
		try { brut = JSON.parse(valeur); } catch (e) { brut = [valeur]; }
		if (!Array.isArray(brut)) { return []; }
		return brut.map(liste).filter(function (t) { return t.length > 0; });
	}

	function memes(a, b) {
		return a.length === b.length && a.slice().sort().join(',') === b.slice().sort().join(',');
	}

	var RecuBulletin = {
		/** SHA-256 hexadécimal du texte, ou null si le navigateur ne sait pas le calculer. */
		empreinte: function (texte) {
			if (!window.crypto || !window.crypto.subtle || !window.TextEncoder) {
				return Promise.resolve(null);
			}
			return window.crypto.subtle.digest('SHA-256', new TextEncoder().encode(texte)).then(hex);
		},

		/**
		 * Appelé par vote.js avant chaque envoi, avec les bulletins b2 produits
		 * ici : ajoute leurs empreintes aux tentatives en attente de ce vote.
		 * Ne rejette jamais (le vote doit partir).
		 */
		memoriser: function (voteId, bulletins) {
			var lot = Array.isArray(bulletins) ? bulletins : [bulletins];
			return Promise.all(lot.map(RecuBulletin.empreinte)).then(function (empreintes) {
				if (empreintes.indexOf(null) >= 0) { return null; }
				var liste = RecuBulletin.enAttente(voteId);
				liste.push(empreintes);
				ecrireCle(ATTENTE + voteId, JSON.stringify(liste.slice(-MAX_TENTATIVES)));
				return empreintes;
			}, function () { return null; });
		},

		/** Tentatives en attente de confirmation : une liste d'empreintes par envoi, la plus récente en dernier. */
		enAttente: function (voteId) {
			return tentatives(lireCle(ATTENTE + voteId));
		},

		/** Oublie les tentatives en attente de ce vote (envoi refusé par le serveur). */
		oublierTentatives: function (voteId) {
			ecrireCle(ATTENTE + voteId, null);
		},

		/** Votes signalés refusés par le serveur ([data-recu-refus]) : tentatives oubliées. */
		purgerRefus: function () {
			var marques = document.querySelectorAll('[data-recu-refus]');
			Array.prototype.forEach.call(marques, function (marque) {
				String(marque.getAttribute('data-recu-refus') || '').split(',').forEach(function (id) {
					if (/^[0-9]+$/.test(id)) { RecuBulletin.oublierTentatives(id); }
				});
			});
		},

		/** Garde la liste des empreintes d'un vote (une par voix déposée). */
		garder: function (voteId, empreintes) {
			if (!empreintes || !empreintes.length) { return; }
			ecrireCle(PREFIXE + voteId, empreintes.join(','));
		},

		/** Empreintes gardées pour ce vote (tableau, vide si aucune). */
		lire: function (voteId) {
			return liste(lireCle(PREFIXE + voteId));
		},

		/** État du reçu : null (confirmé), « different », « non_confirme » ou « plusieurs ». */
		etat: function (voteId) {
			return lireCle(ETAT + voteId);
		},

		/**
		 * Rapproche le dépôt confirmé par le serveur (liste vide s'il n'en a
		 * remis aucun) des tentatives de ce navigateur, puis garde le reçu et
		 * son état. Sans effet s'il n'y a ni dépôt confirmé ni tentative.
		 */
		rapprocher: function (voteId, depot) {
			var essais = RecuBulletin.enAttente(voteId);
			if (depot.length) {
				var accepte = essais.some(function (t) { return memes(t, depot); });
				RecuBulletin.garder(voteId, depot);
				if (essais.length && !accepte) {
					ecrireCle(ETAT + voteId, 'different');
					ecrireCle(NAVIGATEUR + voteId, JSON.stringify(essais));
				} else {
					ecrireCle(ETAT + voteId, accepte && essais.length > 1 ? 'plusieurs' : null);
					ecrireCle(NAVIGATEUR + voteId, null);
				}
			} else if (essais.length && !RecuBulletin.lire(voteId).length) {
				// Vote enregistré sans confirmation des empreintes par le
				// serveur : celles du navigateur, signalées comme telles.
				RecuBulletin.garder(voteId, essais[essais.length - 1]);
				ecrireCle(ETAT + voteId, 'non_confirme');
				ecrireCle(NAVIGATEUR + voteId, JSON.stringify(essais));
			}
			// Un reçu déjà confirmé reste : un envoi ultérieur (autre onglet)
			// a été refusé par le serveur, le vote étant déjà enregistré.
			ecrireCle(ATTENTE + voteId, null);
		},

		/** Remplit les blocs [data-recu-vote] de la page des votes. */
		afficher: function () {
			RecuBulletin.purgerRefus();
			var blocs = document.querySelectorAll('[data-recu-vote]');
			Array.prototype.forEach.call(blocs, function (bloc) {
				var voteId = bloc.getAttribute('data-recu-vote');
				// Empreintes remises par le serveur juste après le dépôt (une seule fois).
				RecuBulletin.rapprocher(voteId, liste(bloc.getAttribute('data-recu-depot')));

				var empreintes = RecuBulletin.lire(voteId);
				if (!empreintes.length) { return; }
				var etat = RecuBulletin.etat(voteId);
				var avertissements = { different: '[data-recu-different]', non_confirme: '[data-recu-non-confirme]', plusieurs: '[data-recu-plusieurs-envois]' };
				if (avertissements[etat]) {
					var avertissement = bloc.querySelector(avertissements[etat]);
					if (avertissement) { avertissement.classList.remove('d-none'); }
				}
				var valeur = bloc.querySelector('[data-recu-valeur]');
				if (valeur) { valeur.textContent = empreintes[0]; }
				var plusieurs = bloc.querySelector('[data-recu-plusieurs]');
				if (plusieurs && empreintes.length > 1) {
					plusieurs.textContent = plusieurs.textContent.replace('#_n_#', String(empreintes.length));
					plusieurs.classList.remove('d-none');
				}
				var lien = bloc.querySelector('[data-recu-telecharger]');
				if (lien) {
					var texte = (bloc.getAttribute('data-recu-libelle') || '') + '\n' + empreintes.join('\n') + '\n';
					if (etat === 'different' || etat === 'non_confirme') {
						tentatives(lireCle(NAVIGATEUR + voteId)).forEach(function (t, i) {
							texte += '\n# Empreintes calculées par ce navigateur, envoi ' + (i + 1) + (etat === 'non_confirme' ? ' (non confirmées par le serveur)' : '') + ' :\n' + t.join('\n') + '\n';
						});
					}
					lien.href = 'data:text/plain;charset=utf-8,' + encodeURIComponent(texte);
					lien.setAttribute('download', 'recu-bulletin-' + empreintes[0].slice(0, 12) + '.txt');
				}
				bloc.classList.remove('d-none');
			});
		}
	};

	window.RecuBulletin = RecuBulletin;

	if (typeof document === 'undefined') { return; }
	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', RecuBulletin.afficher);
	} else {
		RecuBulletin.afficher();
	}
})(typeof window !== 'undefined' ? window : globalThis);
