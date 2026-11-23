function main() {

    $('.btnAddMembre').off('click.addmember').on('click.addmember', function () {
        razFormAddUpdMembre();

        $('#formMembres').slideUp(300);
        $('#formAddUpdMembre').slideDown(300);
        $('.btnAddMembre, .btnValiderEtape, .btnAddObservateur, #formObservateurs').hide();
        $('.btnSaveAddUpd, .btnAnnulerAddUpd').show();
        addUpdMembreListener();
    });

    $('.btnAddObservateur').off('click.addobservateur').on('click.addobservateur', function () {
        razFormAddUpdObservateur();

        $('#formMembres').slideUp(300);
        $('#formAddUpdObservateur').slideDown(300);
        $('.btnAddMembre, .btnValiderEtape, .btnAddObservateur, #formObservateurs').hide();
        $('.btnSaveAddUpd, .btnAnnulerAddUpd').show();
        addUpdObservateurListener();
    });

    $('.btnValiderEtape').off('click.valide').on('click.valide', function () {

        let result = getResultsCollegesMembres();
        let ok = checkResults(result);
        if (!ok) {
            showSwal("Trois à cinq membres sont à désigner par collège.");
            return false;
        }
        let membresAuMoinsUnCollege = true;
        $('#tableMembresListe tbody tr').each(function () {
            let checkboxes = $(this).find('input.selectCollegeMembre[type=checkbox]');
            if (checkboxes.length > 0 && checkboxes.filter(':checked').length === 0) {
                membresAuMoinsUnCollege = false;
            }
        });
        if (!membresAuMoinsUnCollege) {
            showSwal("Tous les membres doivent être à minima affiliés à un collège.");
            return false;
        }

        saveEtape();

    });

    listeMembresListener();
    listeObservateursListener();
}

function razFormAddUpdMembre() {
    $('#formAddUpdMembre h2').text("Nouveau membre du bureau...");
    $('#formAddUpdMembre input[name=member_id]').val('');
    $('#formAddUpdMembre input[name=member_nom]').val('');
    $('#formAddUpdMembre input[name=member_prenom]').val('');
    $('#formAddUpdMembre input[name=member_email]').val('');
    $('#formAddUpdMembre .optionAddAfterSaveMembre').show();
}

function razFormAddUpdObservateur() {
    $('#formAddUpdObservateur h2').text("Nouvel observateur de l'élection...");
    $('#formAddUpdObservateur input[name=observateur_id]').val('');
    $('#formAddUpdObservateur input[name=observateur_nom]').val('');
    $('#formAddUpdObservateur input[name=observateur_prenom]').val('');
    $('#formAddUpdObservateur input[name=observateur_email]').val('');
}

function addUpdObservateurListener() {

    $('input[name=observateur_nom]').focus();

    $('.btnAnnulerAddUpd').off('click.annuler').on('click.annuler', function () {
        $('#formAddUpdObservateur').slideUp(300);
        $('#formMembres').slideDown(300);
        $('.btnSaveAddUpd, .btnAnnulerAddUpd').hide();
        $('.btnAddMembre, .btnValiderEtape, .btnAddObservateur, #formObservateurs').show();
    });

    $('.btnSaveAddUpd').off('click.saveObservateur').on('click.saveObservateur', function () {
        if (verifChampsObservateur() === false) {

            Swal.fire({
                title: "Enregistrement impossible",
                text: "Veuillez compléter tous les champs obligatoires.",
                icon: "warning",
                confirmButtonColor: "#dd6B55",
                confirmButtonText: "Compris",
            }).then((result) => {
                $('.cob').each(function() {
                    let valeur = $(this).val() === null ? '' : $(this).val();
                    if (valeur.trim() === '') {
                        $(this).addClass('erreurouge');
                    }
                });
                setTimeout(function() {
                    $('.erreurouge').removeClass('erreurouge');
                }, 3000);
            });

            return false;
        }

        var regexMail = /^([\w-+]+(?:\.[\w-+]+)*)@((?:[\w-]+\.)*\w[\w-]{0,66})\.([a-z]{2,63}(?:\.[a-z]{2})?)$/i;
        if (!regexMail.test($('#formAddUpdObservateur input[name=observateur_email]').val())) {
            showSwal("L'adresse e-mail renseignée n'est pas valide.", 'error', "Enregistrement impossible");
            return false
        }

        saveObservateurAjax();
    });

}

function addUpdMembreListener() {

    $('input[name=member_nom]').focus();

    $('.btnAnnulerAddUpd').off('click.annuler').on('click.annuler', function () {
        $('#formAddUpdMembre').slideUp(300);
        $('#formMembres').slideDown(300);
        $('.btnSaveAddUpd, .btnAnnulerAddUpd').hide();
        $('.btnAddMembre, .btnValiderEtape, .btnAddObservateur, #formObservateurs').show();
    });

    $('.btnSaveAddUpd').off('click.saveMember').on('click.saveMember', function () {
        if (verifChampsMembre() === false) {

            Swal.fire({
                title: "Enregistrement impossible",
                text: "Veuillez compléter tous les champs obligatoires.",
                icon: "warning",
                confirmButtonColor: "#dd6B55",
                confirmButtonText: "Compris",
            }).then((result) => {
                $('.cob').each(function() {
                    let valeur = $(this).val() === null ? '' : $(this).val();
                    if (valeur.trim() === '') {
                        $(this).addClass('erreurouge');
                    }
                });
                setTimeout(function() {
                    $('.erreurouge').removeClass('erreurouge');
                }, 3000);
            });

            return false;
        }

        var regexMail = /^([\w-+]+(?:\.[\w-+]+)*)@((?:[\w-]+\.)*\w[\w-]{0,66})\.([a-z]{2,63}(?:\.[a-z]{2})?)$/i;
        if (!regexMail.test($('#formAddUpdMembre input[name=member_email]').val())) {
            showSwal("L'adresse e-mail renseignée n'est pas valide.", 'error', "Enregistrement impossible");
            return false
        }

        saveMembreAjax();
    });
}

function saveMembreAjax() {
    let Datas = $("#formAddUpdMembre").serializeArray().concat($("#formcsrf").serializeArray());
    $.ajax({
        url: '/organisateur/save/membrebureau',
        data: Datas,
        method: "post",
        success: function (retour) {
            retour+= '';
            if (retour === 'ok') {
                Swal.fire({
                    title: "",
                    text:'Membre du bureau enregistré',
                    icon: "success",
                    showCancelButton: false,
                    confirmButtonText: 'Continuer',
                }).then((result) => {
                    if ($('input[name=add_after_save]').is(':checked')) {
                        razFormAddUpdMembre();
                    } else {
                        window.location.replace('/organisateur/bureau');
                    }
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

function saveObservateurAjax() {
    let Datas = $("#formAddUpdObservateur").serializeArray().concat($("#formcsrf").serializeArray());
    $.ajax({
        url: '/organisateur/save/observateur',
        data: Datas,
        method: "post",
        success: function (retour) {
            retour+= '';
            if (retour === 'ok') {
                Swal.fire({
                    title: "",
                    text:'Observateur enregistré',
                    icon: "success",
                    showCancelButton: false,
                    confirmButtonText: 'Continuer',
                }).then((result) => {
                    window.location.replace('/organisateur/bureau');
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

function verifChampsMembre() {
    let ok = true;
    $.each(['member_nom', 'member_prenom', 'member_email'], function(_, name) {
        if (!$('input[name=' + name + ']').val()?.trim()) {
            ok = false;
            return false;
        }
    });
    return ok;
}

function verifChampsObservateur() {
    let ok = true;
    $.each(['observateur_nom', 'observateur_prenom', 'observateur_email'], function(_, name) {
        if (!$('input[name=' + name + ']').val()?.trim()) {
            ok = false;
            return false;
        }
    });
    return ok;
}

function showSwal(texte, icon = 'error', titre = 'Oups', taille = 0, gauche = 0) {

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
    })

}

function listeMembresListener() {

    updateAffiliationColleges();
    $('.selectCollegeMembre').on('change', function () {
        let etat = $(this).is(':checked') ? 1 : 0;
        saveAffiliationCollege(etat, parseInt($(this).parents('tr').data('id')), $(this).data('votes'));
        updateAffiliationColleges();
    });

    $('.btnEditMembreBureau').off('click.updMember').on('click.updMember', function () {
        const $tr = $(this).closest('tr');
        const memberId = parseInt($tr.data('id'));

        if (!memberId || memberId < 1) {
            showSwal("Identification du membre du bureau impossible.");
            return;
        }

        const [membreNom, membrePrenom, membreEmail] = $tr.find('td').slice(0, 3).map((i, td) => $(td).text().trim()).get();

        const $form = $('#formAddUpdMembre');
        $form.find('h2').text(`${membrePrenom} ${membreNom}`);
        $form.find('input[name=member_id]').val(memberId);
        $form.find('input[name=member_nom]').val(membreNom);
        $form.find('input[name=member_prenom]').val(membrePrenom);
        $form.find('input[name=member_email]').val(membreEmail);
        $('#formAddUpdMembre .optionAddAfterSaveMembre').hide();

        $('#formMembres').slideUp(300);
        $form.slideDown(300);

        $('.btnAddMembre, .btnValiderEtape, .btnAddObservateur, #formObservateurs').hide();
        $('.btnSaveAddUpd, .btnAnnulerAddUpd').show();

        addUpdMembreListener();
    });

    $('.btnSupprMembreBureau').off('click.delMember').on('click.delMember', function () {
        const $tr = $(this).closest('tr');
        const memberId = parseInt($tr.data('id'));

        if (!memberId || memberId < 1) {
            showSwal("Identification du membre du bureau impossible.");
            return;
        }

        Swal.fire({
            title: "Attention",
            text: "Supprimer ce membre du bureau ?",
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#DD6B55",
            confirmButtonText: "Supprimer",
            cancelButtonText: 'Annuler',
            closeOnConfirm: true
        }).then((result) => {
            if (result.isConfirmed) {
                let Datas = getCsrfData({ memberId: memberId });

                $.ajax({
                    url: '/organisateur/membrebureau/supprimer',
                    data: Datas,
                    method: "post",
                    success: function (retour) {
                        retour+= '';
                        if (retour === 'ok') {
                            window.location.replace('/organisateur/bureau');
                        } else {
                            showSwal("La suppression a échouée.");
                        }
                    },
                    error: function (jqXHR, textStatus, errorThrown) {
                        let message = 'Une erreur est survenue.';
                        if (jqXHR.responseJSON && jqXHR.responseJSON.error) {
                            message = jqXHR.responseJSON.error;
                        }
                        showSwal(message, 'warning')
                    }
                });
            }
        });

    });

    $('.btnCodesMembreBureau').off('click.codesMember').on('click.codesMember', function () {
        const $tr = $(this).closest('tr');
        const memberId = parseInt($tr.data('id'));

        if (!memberId || memberId < 1) {
            showSwal("Identification du membre du bureau impossible.");
            return;
        }

        let texte = 'Envoyez ses ';
        if ($(this).find('i').hasClass('fa-check') || $(this).find('i').hasClass('fa-clock')) {
            texte = 'Renvoyer de nouveaux '
        }

        Swal.fire({
            title: "Confirmez",
            text: texte+" codes d'accès à ce membre du bureau ?",
            icon: "question",
            showCancelButton: true,
            confirmButtonColor: "#417750",
            confirmButtonText: "Envoyer",
            cancelButtonText: 'Annuler',
            closeOnConfirm: true
        }).then((result) => {
            if (result.isConfirmed) {
                let Datas = getCsrfData({ memberId: memberId });

                $.ajax({
                    url: '/organisateur/membrebureau/codes',
                    data: Datas,
                    method: "post",
                    success: function (retour) {
                        retour+= '';
                        if (retour === 'ok') {

                            Swal.fire({
                                title: "Envoyé",
                                html: "Les accès à l'élection ont bien été envoyés au membre du bureau.",
                                icon: "success",
                                confirmButtonColor: '#6e7881',
                                confirmButtonText: 'Fermer'
                            }).then((result) => {
                                if (result.isConfirmed) {
                                    window.location.replace('/organisateur/bureau');
                                }
                            });
                        } else {
                            showSwal("L'envoi des codes d'accès a échouée.");
                        }
                    },
                    error: function (jqXHR, textStatus, errorThrown) {
                        let message = 'Une erreur est survenue.';
                        if (jqXHR.responseJSON && jqXHR.responseJSON.error) {
                            message = jqXHR.responseJSON.error;
                        }
                        showSwal(message, 'warning')
                    }
                });
            }
        });

    });

}

function updateAffiliationColleges() {

    let result = getResultsCollegesMembres();

    $.each(result, function(cc, nb){
        $('.totalVotesCoches-'+cc).text( nb );
        if (nb >= 3 && nb <=5) {
            $('.totalVotesCoches-'+cc).parent().find('i.fa-circle-xmark.text-danger').removeClass('fa-circle-xmark text-danger').addClass('fa-circle-check text-success');
        } else {
            $('.totalVotesCoches-'+cc).parent().find('i.fa-circle-check.text-success').removeClass('fa-circle-check text-success').addClass('fa-circle-xmark text-danger');
        }
    });

    verifBtnValideEtape(result);
}

function getResultsCollegesMembres() {

    const result = {};

    $('#tableMembresListe thead th.chk-col').each(function(){
        const index = $(this).index() + 1;
        const header = $(this).data('cc');
        const count = $('#tableMembresListe tbody td:nth-child(' + index + ') input[type=checkbox]:checked').length;
        result[header] = count;
    });
    return result;
}

function getCsrfData(extra = {}) {
    return Object.assign({
        csrf_name: $('#formcsrf').find('input.csrf[name=csrf_name]').val(),
        csrf_value: $('#formcsrf').find('input.csrf[name=csrf_value]').val(),
    }, extra);
}

function listeObservateursListener() {

    $('.btnEditObservateur').off('click.updObservateur').on('click.updObservateur', function () {
        const $tr = $(this).closest('tr');
        const memberId = parseInt($tr.data('id'));

        if (!memberId || memberId < 1) {
            showSwal("Identification de l'observateur impossible.");
            return;
        }

        const [membreNom, membrePrenom, membreEmail] = $tr.find('td').slice(0, 3).map((i, td) => $(td).text().trim()).get();

        const $form = $('#formAddUpdObservateur');
        $form.find('h2').text(`${membrePrenom} ${membreNom}`);
        $form.find('input[name=observateur_id]').val(memberId);
        $form.find('input[name=observateur_nom]').val(membreNom);
        $form.find('input[name=observateur_prenom]').val(membrePrenom);
        $form.find('input[name=observateur_email]').val(membreEmail);

        $('#formMembres').slideUp(300);
        $form.slideDown(300);

        $('.btnAddMembre, .btnValiderEtape, .btnAddObservateur, #formObservateurs').hide();
        $('.btnSaveAddUpd, .btnAnnulerAddUpd').show();

        addUpdObservateurListener();
    });

    $('.btnSupprObservateur').off('click.delObs').on('click.delObs', function () {
        const $tr = $(this).closest('tr');
        const memberId = parseInt($tr.data('id'));

        if (!memberId || memberId < 1) {
            showSwal("Identification de l'observateur impossible.");
            return;
        }

        Swal.fire({
            title: "Attention",
            text: "Supprimer cet observateur ?",
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#DD6B55",
            confirmButtonText: "Supprimer",
            cancelButtonText: 'Annuler',
            closeOnConfirm: true
        }).then((result) => {
            if (result.isConfirmed) {
                let Datas = getCsrfData({ memberId: memberId });

                $.ajax({
                    url: '/organisateur/observateur/supprimer',
                    data: Datas,
                    method: "post",
                    success: function (retour) {
                        retour+= '';
                        if (retour === 'ok') {
                            window.location.replace('/organisateur/bureau');
                        } else {
                            showSwal("La suppression a échouée.");
                        }
                    },
                    error: function (jqXHR, textStatus, errorThrown) {
                        let message = 'Une erreur est survenue.';
                        if (jqXHR.responseJSON && jqXHR.responseJSON.error) {
                            message = jqXHR.responseJSON.error;
                        }
                        showSwal(message, 'warning')
                    }
                });
            }
        });

    });

    $('.btnCodesObservateur').off('click.codesObs').on('click.codesObs', function () {
        const $tr = $(this).closest('tr');
        const memberId = parseInt($tr.data('id'));

        if (!memberId || memberId < 1) {
            showSwal("Identification de l'observateur impossible.");
            return;
        }

        let texte = 'Envoyez ses ';
        if ($(this).find('i').hasClass('fa-check')) {
            texte = 'Renvoyer de nouveaux '
        }

        Swal.fire({
            title: "Confirmez",
            text: texte+" codes d'accès à cet observateur ?",
            icon: "question",
            showCancelButton: true,
            confirmButtonColor: "#417750",
            confirmButtonText: "Envoyer",
            cancelButtonText: 'Annuler',
            closeOnConfirm: true
        }).then((result) => {
            if (result.isConfirmed) {
                let Datas = getCsrfData({ memberId: memberId });

                $.ajax({
                    url: '/organisateur/observateur/codes',
                    data: Datas,
                    method: "post",
                    success: function (retour) {
                        retour+= '';
                        if (retour === 'ok') {
                            showSwal("Les accès à l'élection ont bien été envoyés à l'observateur.", "success", "Envoyé");
                        } else {
                            showSwal("L'envoi des codes d'accès a échouée.");
                        }
                    },
                    error: function (jqXHR, textStatus, errorThrown) {
                        let message = 'Une erreur est survenue.';
                        if (jqXHR.responseJSON && jqXHR.responseJSON.error) {
                            message = jqXHR.responseJSON.error;
                        }
                        showSwal(message, 'warning')
                    }
                });
            }
        });

    });

}

function verifBtnValideEtape(result) {

    if (result === undefined) {
        result = getResultsCollegesMembres();
    }

    let ok = checkResults(result);

    if (!ok && !$('.btnValiderEtape').hasClass('disabled')) {
        $('.btnValiderEtape').addClass('disabled').attr('disabled', 'disabled');
    } else if (ok && $('.btnValiderEtape').hasClass('disabled')) {
        $('.btnValiderEtape').removeClass('disabled').prop('disabled', false);
    }

}

function checkResults(result) {

    let ok = true;
    $.each(result, function(cc, nb){
        if (nb < 3 || nb > 5) {
            ok = false;
            return false;
        }
    });

    return ok;

}

function saveAffiliationCollege(etat, member_id, votes_ids) {

    let Datas = getCsrfData({ etat: etat, member_id:member_id, votes_ids:votes_ids });

    $.ajax({
        url: '/organisateur/membrebureau/votes',
        data: Datas,
        method: "post",
        success: function (retour) {
            retour+= '';
            if (retour !== 'ok') {
                showSwal("Une erreur est survenue lors de la mise à jour des votes concernés.");
            }
        },
        error: function (jqXHR, textStatus, errorThrown) {
            let message = 'Une erreur est survenue.';
            if (jqXHR.responseJSON && jqXHR.responseJSON.error) {
                message = jqXHR.responseJSON.error;
            }
            showSwal(message, 'warning')
        }
    });

}

function saveEtape() {

    let Datas = getCsrfData();

    $.ajax({
        url: '/organisateur/valide/bureau',
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