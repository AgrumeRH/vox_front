function main() {
    listeVotesListener();
}

function listeVotesListener() {

    $('#infoBleueMailsRappel').hide();

    $('.btnMailsRappel').off('click.mails2rappel').on('click.mails2rappel', function () {
        $('#votesListes').slideUp(300);
        $('#mails2rappel').slideDown(300);
        $('.btnValiderEtape, .btnMailsRappel, .btnEnvoyerTous, #infoBleueEtapeListes, #infoAttenteCourrier').hide();
        $('.btnRetour, #infoBleueMailsRappel, .btnSaveMails2rappel').show();
        mails2rappelListener();
    });



    $('.btnEnvoyerIdentifiants, .btnEnvoyerTous').off('click.envoi').on('click.envoi', function () {

        let votes_ids = [];
        if ($(this).hasClass('btnEnvoyerIdentifiants')) {
            let vote_id = parseInt($(this).parents('tr').data('id'));
            if (isNaN(vote_id) || vote_id === 0) {
                showSwal("Identification du vote impossible [J016].");
                return;
            }

            votes_ids.push(vote_id);
        } else {
            $('#tableVotesEnvoyer tbody tr').each(function () {
                let vote_id = parseInt($(this).data('id'));
                votes_ids.push(vote_id);
            });
        }

        if (votes_ids.length === 0) {
            showSwal("Identification des vote impossible [J029].");
            return;
        }

        let subtxt = $(this).hasClass('btnEnvoyerIdentifiants') ? 'de ce vote' : 'qui ne les ont pas reçus pour tous les votes concernés';

        Swal.fire({
            title: "Confirmez",
            text: "Envoyer maintenant les identifiants aux électeurs "+subtxt+" ?",
            icon: "question",
            showCancelButton: true,
            confirmButtonColor: "#417750",
            confirmButtonText: "Envoyer",
            cancelButtonText: 'Annuler',
            width: '600px',
            closeOnConfirm: true
        }).then((result) => {
            if (result.isConfirmed) {

                $('#overlay .text').text("L'envoi en cours, merci de patienter...");
                showOverlay();
                let Datas = getCsrfData({ votes_ids: votes_ids });

                $.ajax({
                    url: '/organisateur/envoyer',
                    data: Datas,
                    method: "post",
                    success: function (retour) {
                        retour+= '';
                        if (retour === 'ok') {
                            window.location.replace('/organisateur/envoyer');
                        } else {
                            hideOverlay();
                            showSwal("L'envoi a échouée.");
                        }
                    },
                    error: function (jqXHR, textStatus, errorThrown) {
                        let message = 'Une erreur est survenue.';
                        let taille = 0;
                        if (jqXHR.responseJSON && jqXHR.responseJSON.error) {
                            message = jqXHR.responseJSON.error;
                        }
                        if (jqXHR.responseJSON && jqXHR.responseJSON.taille) {
                            taille = jqXHR.responseJSON.taille;
                        }
                        hideOverlay();
                        showSwal(message, 'error', "Envoi impossible",taille)
                    }
                });
            }
        });
    });


    $('.btnValiderEtape').off('click.envoi').on('click.envoi', function () {
        // On vérifie qu'il n'y a plus d'identifiants à envoyer
        if ($('.btnEnvoyerIdentifiants').length > 0) {
            showSwal("Tous les identifiants n'ont pas été envoyés !", "warning", "Validation impossible");
            return false;
        }

        saveEtape();

    });


}

function getCsrfData(extra = {}) {
    return Object.assign({
        csrf_name: $('#formcsrf').find('input.csrf[name=csrf_name]').val(),
        csrf_value: $('#formcsrf').find('input.csrf[name=csrf_value]').val(),
    }, extra);
}

function saveEtape() {

    let Datas = getCsrfData();
    $.ajax({
        url: '/organisateur/valide/envoyer',
        data: Datas,
        method: "post",
        success: function (retour) {
            retour+= '';
            if (retour === 'ok') {
                Swal.fire({
                    title: "",
                    text:'Étape validée',
                    icon: "success",
                    showCancelButton: true,
                    confirmButtonText: 'Étape suivante',
                    confirmButtonColor: "#579569",
                    cancelButtonText: 'Corriger'
                }).then((result) => {
                    if (result.isConfirmed) {
                        window.location.replace('/organisateur/');
                    }
                });
            } else {
                Swal.fire({
                    title: "Validation impossible",
                    text: 'L\'enregistrement a échoué.',
                    icon: "warning",
                    confirmButtonColor: "#dd6B55",
                    confirmButtonText: "Fermer"
                })
            }
        },
        error: function (jqXHR, textStatus, errorThrown) {
            let message = 'Une erreur est survenue.';
            if (jqXHR.responseJSON && jqXHR.responseJSON.error) {
                message = jqXHR.responseJSON.error;
            }
            Swal.fire({
                title: "Validation impossible",
                text: message,
                icon: "warning",
                confirmButtonColor: "#dd6B55",
                confirmButtonText: "Compris",
            })
        }
    });


}

function showSwal(texte, icon = 'error', titre = 'Oups', taille = 0, gauche = 0, then = null) {

    let confirmBtnTexte = icon === 'error' ? 'Fermer' : 'Compris';
    let confirmButtonColor = icon === 'error' ? '#dd6B55' : '#6e7881';
    let width = taille > 0 ? taille+'px' : '';
    let customClass = gauche === 1  ? 'swal-content-left' : '';

    Swal.fire({
        title: titre,
        html:texte,
        icon: icon,
        customClass: customClass,
        width: width,
        confirmButtonColor: confirmButtonColor,
        confirmButtonText: confirmBtnTexte
    }).then((result) => {
        if (then && typeof then === 'function') {
            then(result);
        }
    })
}

function mails2rappelListener() {
    $('.btnRetour').off('click.retour').on('click.retour', function () {
       mails2rappelsToEnvoyer();
    });

    $('.btnSaveMails2rappel').off('click.savemails2rappel').on('click.savemails2rappel', function () {
        verifFormMails2rappel();
    });

    compteurTexteRappel();
}

function compteurTexteRappel() {
    const textarea = document.querySelector('#rappelTexte');
    const counter = document.querySelector('#rappelTexteCompteur');
    const minLength = 10;
    const maxLength = 1000;

    if (!textarea || !counter) {
        return;
    }

    function updateCompteur() {
        const length = textarea.value.length;
        const remaining = maxLength - length;

        const isTooShort = length > 0 && length < minLength;
        const isTooLong = length > maxLength;

        if (isTooLong) {
            const excess = length - maxLength;

            counter.textContent =
                `Maximum dépassé de ${excess} caractère${excess > 1 ? 's' : ''}`;
        } else {
            counter.textContent =
                `${remaining} caractère${remaining > 1 ? 's' : ''} maximum restant${remaining > 1 ? 's' : ''}`;
        }

        counter.classList.toggle('is-invalid', isTooShort);
        counter.classList.toggle('is-over-limit', isTooLong);
    }

    textarea.addEventListener('input', updateCompteur);
    updateCompteur();
}


function mails2rappelsToEnvoyer() {
    $('#mails2rappel').slideUp(300);
    $('#votesListes').slideDown(300);
    $('.btnRetour, #infoBleueMailsRappel, .btnSaveMails2rappel').hide();
    $('.btnValiderEtape, .btnMailsRappel, .btnEnvoyerTous, #infoBleueEtapeListes, #infoAttenteCourrier').show();
    listeVotesListener();
}

function parseDate(dateString, format) {
    if (!dateString || !dateString.trim()) {
        return null;
    }

    let jour, mois, annee, heure = 0, minute = 0, seconde = 0;

    const parts = dateString.trim().split(/\s+/);
    const datePart = parts[0];
    const timePart = parts[1];

    if (format === 'fr') {
        // Format : DD/MM/YYYY HH:mm
        [jour, mois, annee] = datePart.split('/').map(Number);

        if (timePart) {
            [heure, minute] = timePart.split(':').map(Number);
        }
    } else if (format === 'sql') {
        // Format : YYYY-MM-DD HH:mm:ss
        [annee, mois, jour] = datePart.split('-').map(Number);

        if (timePart) {
            [heure, minute, seconde] = timePart.split(':').map(Number);
        }
    } else {
        return null;
    }

    const date = new Date(annee, mois - 1, jour, heure, minute, seconde);

    return Number.isNaN(date.getTime()) ? null : date;
}

function verifFormMails2rappel() {

    var nbVotesCoches = $('input[type="checkbox"][name^="vote_rappel_actif_organisateur["]:checked').length;
    if (nbVotesCoches > 0) {
        if ($('#rappelTexte').val() === '') {
            showSwal('Le texte de rappel ne peut pas être vide', 'error', 'Oups');
            return;
        }
        if ($('#rappelTexte').val().length < 10) {
            showSwal('Le texte de rappel doit contenir au moins 10 caractères', 'error', 'Oups');
            return;
        }
        let dateRappel = parseDate( $('#rappelDate').val(), 'fr')
        let dateMin = parseDate( $('#rappelDate').data('min'), 'sql')
        let dateMax = parseDate( $('#rappelDate').data('max'), 'sql')

        if ( dateRappel < dateMin || dateRappel > dateMax) {
            showSwal('La date de rappel doit être comprise entre ' + dateMin.toLocaleDateString('fr-FR') + ' et ' + dateMax.toLocaleDateString('fr-FR') + ' (plage d\'ouverture des votes).', 'error', 'Oups');
            return;
        }
    }

    // Texte et date saisis sans vote coché : rien ne serait programmé, on le dit
    // avant d'enregistrer plutôt qu'après (« Aucun mail de rappel programmé »).
    if (nbVotesCoches === 0 && $('#rappelDate').val() !== '') {
        Swal.fire({
            title: 'Aucun vote coché',
            text: "Aucun e-mail de rappel ne sera programmé. Cochez les votes concernés pour l'activer.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Enregistrer quand même',
            cancelButtonText: 'Cocher des votes',
        }).then((result) => {
            if (result.isConfirmed) {
                saveMails2rappel(nbVotesCoches);
            }
        });
        return;
    }

    saveMails2rappel(nbVotesCoches);
}

function saveMails2rappel(nbVotesCoches) {

    let Datas = $("#mails2rappel").serializeArray().concat($("#formcsrf").serializeArray());
    var pluriel =  nbVotesCoches > 1 ? 's' : '';
    let texteModaleOk = nbVotesCoches > 0 ? 'E-mails de rappels programmés pour '+nbVotesCoches+' vote'+pluriel+'.' : 'Aucun mail de rappel programmé.';

    $.ajax({
        url: '/organisateur/save/mail2rappel',
        data: Datas,
        method: "post",
        success: function (retour) {
            retour+= '';
            if (retour === 'ok') {
                Swal.fire({
                    title: "",
                    text:texteModaleOk,
                    icon: "success",
                    showCancelButton: false,
                    confirmButtonText: 'Continuer',
                }).then((result) => {
                    mails2rappelsToEnvoyer();
                });

            } else {
                showSwal('L\'enregistrement a échoué.');
                return false;
            }
        },
        error: function (jqXHR, textStatus, errorThrown) {
            let message = 'Une erreur est survenue.';
            if (jqXHR.responseJSON && jqXHR.responseJSON.error) {
                message = jqXHR.responseJSON.error;
            }
            showSwal(message);
        }
    });
}

