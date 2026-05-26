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

	
	jQuery('#sendvote').on('sendVote',function(){
	
		//1 : generate the vote string...
		var voteContent = JSON.stringify(app.myvote);

		var encrypt = new JSEncrypt();

		//2 : encrypt with the vote key...
		encrypt.setPublicKey(jQuery('#votekey').html());
		var encrypted1 = encrypt.encrypt(voteContent);

		if(!encrypted1){
			alert("Votre bulletin n'a pas pu être encrypté, veuillez contacter la cellule d'assistance immédiatement.");
			return false;
		}

		var passphrase = app.getPass(64);
		var encrypted2 = app.AESEncrypt(passphrase,encrypted1);

		if(!encrypted2){
			alert("Votre bulletin n'a pas pu être mis dans une enveloppe encryptée, veuillez contacter la cellule d'assistance immédiatement.");
			return false;
		}

		//3 : encrypt with the session key the password...
		encrypt.setPublicKey(jQuery('#publickey').html());
		var encryptedPassphrase = encrypt.encrypt(passphrase);

		//Let's send this vote!
		jQuery('#bulletin').val(encrypted2);
		jQuery('#passphrase').val(encryptedPassphrase);

		jQuery('#voteform').submit();
	})

	$('.btnBureau').click(function(e) {
		e.preventDefault();
		$('#bureau').slideDown();
	});
	$('.btnFermerMembres').click(function(e) {
		$('#bureau').slideUp();
	});
	
});