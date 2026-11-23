$( document ).ready(function() {

	setTimeout(function() {
		if ($('#choice_4.toto-ouvre').length) {
			$('#choice_4.toto-ouvre').trigger('click');
		}	
	}, 800);
	
	if ($('.toto-body').length) {
		$('.toto-max2 input[type=checkbox]').prop( "checked", false );
		$('.toto-max2 input[type=checkbox]+label').addClass( "opacity-unchecked" );
	}

	$('.toto-max2 input[type=checkbox]').on('click', function() {
		var nbCoches = $('.toto-max2 input[type=checkbox]:checked').length;
		if (nbCoches > 2) { 
			alert('Sélectionnez deux candidats maximum');
			return false; 
		}
	});

	
	// Un seul envoi par page : après la confirmation, app.js vide data-confirm
	// et chaque clic suivant relancerait un chiffrement et un envoi (nouveau
	// reçu en attente, second dépôt refusé). Le bouton est désactivé dès le
	// premier envoi, et rendu seulement si le chiffrement échoue.
	var envoiEnCours = false;

	jQuery('#sendvote').on('sendVote',function(){

		if (envoiEnCours) {
			return false;
		}
		envoiEnCours = true;
		var bouton = jQuery('#sendvote');
		bouton.addClass('disabled').attr('aria-disabled', 'true').css('pointer-events', 'none');

		// R1 (T18) : le navigateur produit les N bulletins que l'urne conservera
		// (un par unité de poids), chiffrés et authentifiés pour la clé du vote
		// (RSA-OAEP-SHA-256, AES-256-CBC et HMAC-SHA-256, CNIL E4). Le serveur
		// les dépose tels quels, sans les rechiffrer.
		var voteContent = JSON.stringify(app.myvote);

		var echec = function(){
			envoiEnCours = false;
			bouton.removeClass('disabled').removeAttr('aria-disabled').css('pointer-events', '');
			alert("Votre bulletin n'a pas pu être chiffré, veuillez contacter la cellule d'assistance immédiatement.");
		};

		var chiffrement;
		try {
			chiffrement = window.ChiffrementBulletin.chiffrerBulletins(voteContent, jQuery('#votekey').val(), jQuery('#voteform').data('poids'));
		} catch (e) {
			echec();
			return false;
		}

		chiffrement.then(function(bulletins){
			jQuery('#bulletin').val(JSON.stringify(bulletins));

			// Reçu (CNIL 2-07) : empreintes calculées ICI, sur les bulletins que
			// l'urne conservera ; comparées ensuite à celles remises par le serveur.
			var envoyer = function(){ jQuery('#voteform').submit(); };
			if (window.RecuBulletin) {
				window.RecuBulletin.memoriser(jQuery('#voteform').data('vote'), bulletins).then(envoyer, envoyer);
			} else {
				envoyer();
			}
		}, echec);
	})

	$('.btnBureau').click(function(e) {
		e.preventDefault();
		$('#bureau').slideDown();
	});
	$('.btnFermerMembres').click(function(e) {
		$('#bureau').slideUp();
	});
	
});