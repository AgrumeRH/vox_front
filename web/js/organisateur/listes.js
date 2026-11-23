function main() {

    verifBtnValideEtape();
    listeVotesListener();
}

function getCsrfData(extra = {}) {
    return Object.assign({
        csrf_name: $('#formcsrf').find('input.csrf[name=csrf_name]').val(),
        csrf_value: $('#formcsrf').find('input.csrf[name=csrf_value]').val(),
    }, extra);
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

function saveEtape() {

    let Datas = getCsrfData();
    $.ajax({
        url: '/organisateur/valide/listes',
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

$('.btnValiderEtape').off('click.valide').on('click.valide', function () {
    verifBtnValideEtape();
    saveEtape();
});

function verifBtnValideEtape(result) {

    let ok = true;
    $('#tableVotesListes tbody tr').each(function () {
        if (!$(this).find('input.selectCarenceVote').is(':checked')
            && $(this).find('.btnEditListesVote').text().toLowerCase().includes('aucun')) {
            ok = false;
        }
    });

    if (!ok && !$('.btnValiderEtape').hasClass('disabled')) {
        $('.btnValiderEtape').addClass('disabled').attr('disabled', 'disabled');
    } else if (ok && $('.btnValiderEtape').hasClass('disabled')) {
        $('.btnValiderEtape').removeClass('disabled').prop('disabled', false);
    }
}

function listeVotesListener() {

    $('.selectCarenceVote').on('change', function () {
        let etat = $(this).is(':checked') ? 1 : 0;
        saveVoteCarence(etat, $(this));
    });

    $('.btnEditListesVote').off('click.editListes').on('click.editListes', function () {
        var $tr = $(this).closest('tr');
        var college = $tr.find('td:eq(0)').text().trim();
        var ts = $tr.find('td:eq(1)').text().trim();
        var vote_id = parseInt($tr.data('id'));

        loadListesDuVote(vote_id, college, ts);

    });
}

function listesOneVoteListener() {

    $('[data-toggle="popover"]').popover();

    $('.btnRetourVotes').off('click.retourVotes').on('click.retourVotes', function () {
        window.location.replace('/organisateur/listes');
    });

    $('.btnAddListe').off('click.addListe').on('click.addListe', function () {
        let vote_id = parseInt($('#voteIdForListes').val());
        showAddUpdListe(vote_id, 0);
    });
    $('.btnEditListe').off('click.updListe').on('click.updListe', function () {
        const $tr = $(this).closest('tr');
        let vote_id = parseInt($('#voteIdForListes').val());
        let choice_id = parseInt($tr.data('id'));
        showAddUpdListe(vote_id, choice_id);
    });
    $('.btnSupprListe').off('click.delListe').on('click.delListe', function () {
        let liste_id = parseInt($(this).parents('tr').data('id'));
        if (isNaN(liste_id) || liste_id === 0) {
            showSwal("Identification de la liste impossible.");
            return;
        }

        Swal.fire({
            title: "Attention",
            text: "Supprimer définitivement cette liste ?",
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#DD6B55",
            confirmButtonText: "Supprimer",
            cancelButtonText: 'Annuler',
            closeOnConfirm: true
        }).then((result) => {
            if (result.isConfirmed) {
                let Datas = getCsrfData({ liste_id: liste_id });

                $.ajax({
                    url: '/organisateur/listes/supprimer',
                    data: Datas,
                    method: "post",
                    success: function (retour) {
                        retour+= '';
                        if (retour === 'ok') {
                            let vote_id = parseInt($('#voteIdForListes').val());
                            let college = $('#collegeForListes').val();
                            let ts = $('#tsForListes').val();

                            $('#addUpdlisteVoteContent').slideUp(300);
                            $('#listeVoteContent').slideDown(300);
                            $('.btnRetourListes, .btnSaveListe').hide();
                            $('.btnRetourVotes, .btnAddListe').show();
                            loadListesDuVote(vote_id, college, ts);
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

    $('.btnEditCandidats').off('click.editCandidats').on('click.editCandidats', function () {
        const $tr = $(this).closest('tr');
        let vote_id = parseInt($('#voteIdForListes').val());
        let liste_nom = $tr.find('td:eq(1)').text().trim();
        let liste_id = parseInt($tr.data('id'));
        if (isNaN(liste_id) || liste_id === 0) {
            showSwal("Identification de la liste impossible.");
            return;
        }
        $('#listeVoteContent').slideUp(300);
        $('#listeCandidats').slideDown(300);
        $('.btnAddListe, .btnRetourVotes, #formAddUpdListesVote h2 span.h2s-n1').hide();
        $('.btnRetourListes, .btnAddCandidat').show();
        // « Liste Syndicat A » ne doit pas devenir « Liste Liste Syndicat A ».
        $('#formAddUpdListesVote h2 span.h2s-n3').text(" — " + (/^liste\b/i.test($.trim(liste_nom)) ? "" : "Liste ") + liste_nom);
        loadCandidats(liste_id);

    });

}

function listeCandidatsListener() {

    $('[data-toggle="popover"]').popover();
    let liste_id = parseInt($('#tableCandidatsListe').data('choice'));
    $('#infoBleueEtapeListes').html("Renseignez et ordonnez les candidats de la liste.");

    // Pas encore de candidat (pas de table)
    if (isNaN(liste_id) || liste_id === 0) {
        liste_id = parseInt($('#noCandidatsListe').data('choice'));
    }
    if (isNaN(liste_id) || liste_id === 0) {
        showSwal("Erreur d'identification de la liste.");
    }

    $('.btnRetourListes').off('click.retourListes').on('click.retourListes', function () {
        let vote_id = parseInt($('#voteIdForListes').val());
        let college = $('#collegeForListes').val();
        let ts = $('#tsForListes').val();
        $('#listeCandidats').slideUp(300);
        $('#listeVoteContent').slideDown(300);
        $('.btnAddListe, .btnRetourVotes, #formAddUpdListesVote h2 span.h2s-n1').show();
        $('.btnRetourListes, .btnAddCandidat').hide();
        $('#formAddUpdListesVote h2 span.h2s-n3').text('');
        loadListesDuVote(vote_id, college, ts);
    });

    $('.btnAddCandidat').off('click.addCandidat').on('click.addCandidat', function () {
        razAddUpdCandidat();
        $('#addUpdCandidat  .optionAddAfterSaveCandiat').show();
        $('#addUpdCandidat input[name=choice_id]').val(liste_id);
        $('#addUpdCandidat').slideDown(300);
        $('#listeCandidats').slideUp(300);
        $('.btnRetourListes, .btnAddCandidat').hide();
        $('.btnRetourCandidats, .btnSaveCandidat').show();
        addUpdCandidatListener();
    });

    $("#tableCandidatsListe tbody").sortable({
        handle: ".move-candidat",
        cursor: "grabbing",
        axis: "y",
        containment: "parent",
        tolerance: "pointer",
        helper: function(e, tr) {
            var $originals = tr.children();
            var $helper = tr.clone();
            $helper.children().each(function(i){
                $(this).width($originals.eq(i).width());
            });
            return $helper;
        },
        start: function(e, ui) {
            ui.placeholder.height(ui.helper.outerHeight());
        },
        update: function(event, ui) {

            var nouvelOrdre = $(this).children().map(function(){
                return $(this).data("id"); // récupère l'ID réel du candidat
            }).get();


            if (isNaN(liste_id) || liste_id === 0) {
                showSwal("Identification de la liste échouée !", 'warning');
                return false;
            }

            let Datas = getCsrfData({ ordre: nouvelOrdre, liste_id: liste_id });

            $.ajax({
                url: '/organisateur/listes/ordre-candidats',
                data: Datas,
                method: "post",
                success: function (retour) {
                    if (retour !== 'ok') showSwal(retour, 'warning');
                    $("#tableCandidatsListe tbody tr").each(function (index) {
                        $(this).removeData('id');            // vide le cache jQuery
                        $(this).attr('data-id', index);      // met à jour le DOM HTML (ne marche pas si on ne vide ps le cache jQuery avant)
                    });
                },
                error: function (jqXHR) {
                    let message = 'Une erreur est survenue.';
                    if (jqXHR.responseJSON && jqXHR.responseJSON.error) message = jqXHR.responseJSON.error;
                    showSwal(message, 'warning');
                }
            });
        }
    });

    $('.btnEditCandidat').off('click.editCandidat').on('click.editCandidat', function () {
        let index_candidat = $(this).closest('tr').data('id');
        if (isNaN(index_candidat)) {
            showSwal("Erreur d'identification du candidat.", 'warning');
            return false;
        }
        razAddUpdCandidat();

        let candidat_genre = $(this).closest('tr').find('td:eq(1)').text().trim().toLowerCase();
        let candidat_nom = $(this).closest('tr').find('td:eq(2)').text().trim();
        let candidat_prenom = $(this).closest('tr').find('td:eq(3)').text().trim();
        let candidat_datenaiss = formatDate($(this).closest('tr').find('td:eq(4)').text().trim());
        let candidat_photo = $(this).closest('tr').find('td:eq(5)').find('img').attr('src');
        let candidat_foi = $(this).closest('tr').find('td:eq(6)').find('a').attr('href');

        if (candidat_genre !== 'f' && candidat_genre !== 'h') { showSwal("Récupération du genre échouée !"); return false; }
        if (candidat_nom === '' || candidat_nom === undefined ) { showSwal("Récupération du nom échouée !"); return false; }
        if (candidat_prenom === '' || candidat_prenom === undefined ) { showSwal("Récupération du prenom échouée !"); return false; }
        if (candidat_datenaiss === '' || candidat_datenaiss === null) { showSwal("Récupération de la date de naissance échouée !"); return false; }
        if (candidat_photo === undefined) { candidat_photo = ''; } else { candidat_photo = candidat_photo.replace('photos/', ''); }
        if (candidat_foi === undefined) { candidat_foi = ''; } else { candidat_foi = candidat_foi.replace('/organisateur/choice/download/foi/', ''); }

        $('#addUpdCandidat input[name=choice_id]').val(liste_id);
        $('#addUpdCandidat input[name=index_candidat]').val(index_candidat);

        $('#addUpdCandidat select[name=candidat_genre]').val(candidat_genre);
        $('#addUpdCandidat input[name=candidat_nom]').val(candidat_nom);
        $('#addUpdCandidat input[name=candidat_prenom]').val(candidat_prenom);
        $('#addUpdCandidat input[name=candidat_datenaiss]').val(candidat_datenaiss);

        if (candidat_photo !== '') {
            $('#apercuPhotoCandidat').prop('src', '/photos/'+candidat_photo).show();
            $('.btnSupprPhotoCandidat').show();
            $('#formUploadPhotoCandidat input[name=photo_candidat]').val(candidat_photo);
        }
        if (candidat_foi !== '') {
            $('#apercuPdfCandidat').prop('href', '/organisateur/choice/download/foi/'+candidat_foi).show();
            $('.btnSupprPdfCandidat').show();
            $('#formUploadProfessionFoiCandidat input[name=profoi_candidat]').val(candidat_foi);
        }

        $('#addUpdCandidat').slideDown(300);
        $('#listeCandidats').slideUp(300);
        $('.btnRetourListes, .btnAddCandidat').hide();
        $('.btnRetourCandidats, .btnSaveCandidat').show();
        addUpdCandidatListener();
    });

    $('.btnSupprCandidat').off('click.delCandidat').on('click.delCandidat', function () {
        let index_candidat = $(this).closest('tr').data('id');
        if (isNaN(index_candidat)) {
            showSwal("Erreur d'identification du candidat.", 'warning');
            return false;
        }
        $('#addUpdCandidat input[name=index_candidat]').val(index_candidat);
        Swal.fire({
            title: "Attention",
            text: "Supprimer définitivement ce candidat ?",
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#DD6B55",
            confirmButtonText: "Supprimer",
            cancelButtonText: 'Annuler',
            closeOnConfirm: true
        }).then((result) => {
            if (result.isConfirmed) {
                let Datas = getCsrfData({ index_candidat: index_candidat, liste_id: liste_id });

                $.ajax({
                    url: '/organisateur/candidat/supprimer',
                    data: Datas,
                    method: "post",
                    success: function (retour) {
                        retour+= '';
                        if (retour === 'ok') {
                            loadCandidats(liste_id);
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


}


function addUpdCandidatListener() {

    $('#infoBleueEtapeListes').html("Renseignez les informations relatives au candidat.");

    $('.btnRetourCandidats').off('click.retourCandidats').on('click.retourCandidats', function () {
        $('#addUpdCandidat').slideUp(300);
        $('#listeCandidats').slideDown(300);
        $('.btnRetourListes, .btnAddCandidat').show();
        $('.btnRetourCandidats, .btnSaveCandidat').hide();
        listeCandidatsListener();
    });

    $('.btnSupprPhotoCandidat').off('click.supprphoto').on('click.supprphoto', function () {
        $('.btnSupprPhotoCandidat, #apercuPhotoCandidat').hide();
        $('#formUploadPhotoCandidat input[name=photo_candidat]').val('');
    });

    $('.btnSupprPdfCandidat').off('click.supprpdfc').on('click.supprpdfc', function () {
        $('.btnSupprPdfCandidat, #apercuPdfCandidat').hide();
        $('#formUploadProfessionFoiCandidat input[name=profoi_candidat]').val('');
    });

    $('.btnSaveCandidat').off('click.saveCandidat').on('click.saveCandidat', function () {
        let liste_id = parseInt($('#addUpdCandidat input[name=choice_id]').val());
        if (isNaN(liste_id) || liste_id === 0) {
            showSwal("Identification de la liste échouée [E335]");
            return false;
        }
        if ($('input.coc, select.coc').filter(function() {
            const val = $(this).val();
            return !val || val.trim() === '';
        }).length > 0) {
            Swal.fire({
                title: "Validation impossible",
                text: "Veuillez compléter tous les champs obligatoires.",
                icon: "warning",
                confirmButtonColor: "#dd6B55",
                confirmButtonText: "Compris"
            }).then((result) => {
                $('input.coc, select.coc').each(function() {
                    const val = $(this).val();
                    if (!val || val.trim() === '') {
                        $(this).addClass('erreurouge');
                    }
                });
                setTimeout(function() {
                    $('.erreurouge').removeClass('erreurouge');
                }, 3000);
            });
            return false;
        }

        let Datas = $("#addUpdCandidat").serializeArray().concat($("#formcsrf").serializeArray());
        $.ajax({
            url: '/organisateur/save/candidat',
            data: Datas,
            method: "post",
            success: function (retour) {
                retour+= '';
                if (retour === 'ok') {
                    Swal.fire({
                        title: "",
                        text:'Candidat enregistré',
                        icon: "success",
                        showCancelButton: false,
                        confirmButtonText: 'Continuer',
                    }).then((result) => {

                        if ($('input[name=add_after_save]').is(':checked')) {
                            razAddUpdCandidat();
                            $('#addUpdCandidat  .optionAddAfterSaveCandiat').show();
                            addUpdCandidatListener();
                        } else {
                            razAddUpdCandidat();
                            $('#addUpdCandidat').slideUp(300);
                            $('#listeCandidats').slideDown(300);
                            $('.btnRetourListes, .btnAddCandidat').show();
                            $('.btnRetourCandidats, .btnSaveCandidat').hide();
                            $('#formAddUpdListesVote h2 span.h2s-n3').html('')
                            loadCandidats(liste_id);
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
    });


}


function showAddUpdListe(vote_id, choice_id) {

    $('.btnRetourVotes, .btnAddListe').hide();
    $('.btnRetourListes, .btnSaveListe').show();
    $('#infoBleueEtapeListes').html("Configurez la liste du vote.");
    razAddUpdListe();

    let Datas = getCsrfData({ vote_id: vote_id, choice_id: choice_id });
    $.ajax({
        url: '/organisateur/listes/liste',
        data: Datas,
        dataType: 'json',
        method: "post",
        success: function (retour) {

            if (retour.choice_name) {
                $('#addUpdlisteVoteContent input[name=choice_name]').val(retour.choice_name);
            }
            if (retour.choice_type) {
                $('#addUpdlisteVoteContent input[name=choice_type][value="' + retour.choice_type + '"]').prop('checked', true);
            }
            if (retour.choice_logo) {
                $('#apercuLogoListe').prop('src', '/custom/'+retour.choice_logo).show();
                $('.btnSupprLogoListe').show();
                $('#addUpdlisteVoteContent input[name=logo_liste]').val(retour.choice_logo);
            }
            if (retour.choice_pdf) {
                $('#apercuPdfListe').prop('href', 'organisateur/choice/download/pdf/'+retour.choice_pdf).show();
                $('.btnSupprPdfListe').show();
                $('#addUpdlisteVoteContent input[name=profoi_liste]').val(retour.choice_pdf);
            }
            if (retour.choice_type === 'syndicat'
                && retour.choice_organisation
                && retour.choice_organisation.trim() !== ''
                && retour.choice_organisation.trim() !== ',') {

                let valeurs = retour.choice_organisation.split(',');
                const $blocOs = $('#optionsListeSyndicale');
                $blocOs.show();

                for (let i = 1; i < valeurs.length; i++) {
                    const $lastRow = $blocOs.find(".row").last();
                    const $newRow = $lastRow.clone(true);
                    $newRow.insertAfter($lastRow);
                }
                $blocOs.find(".row").each(function(index) {
                    if (valeurs[index]) {
                        $(this).find("input.syndicatOSA").val(valeurs[index].trim());
                    }
                });
                updateButtonsSyndicat();
            }
            if (retour.choice_type === 'commune'
                && retour.choice_organisation
                && retour.choice_organisation.trim() !== ''
                && retour.choice_organisation.trim() !== ',') {

                let syndicats = retour.choice_syndicats.split(',');
                let organisations = retour.choice_organisation.split(',');
                let repartitions = retour.choice_organisations_part.split(',');

                const $blocLc = $('#optionsListeCommune');
                $blocLc.show();

                let nbLignes = organisations.length; // toutes les longueurs sont identiques

                for (let i = 1; i < nbLignes; i++) { // 1 car la 1ère ligne existe déjà
                    const $lastRow = $blocLc.find(".row").last();
                    const $newRow = $lastRow.clone(true);
                    $newRow.insertAfter($lastRow);
                }

                $blocLc.find(".row").each(function(index) {
                    $(this).find("input.syndicatLC").val(syndicats[index].trim());
                    $(this).find("input.organisationLC").val(organisations[index].trim());
                    $(this).find("input.repartitionLC").val(repartitions[index].trim());
                });

                updateButtonsCommune();

            }

            if (parseInt(choice_id) === 0) {
                $('.optionAddAfterSaveListe').show();
            }

            $('#listeVoteContent').slideUp(300);
            $('#addUpdlisteVoteContent').slideDown(300);
            $('#addUpdlisteVoteContent input[name=choice_id]').val(choice_id);
            $('#addUpdlisteVoteContent input[name=vote_id]').val(vote_id);
            addUpdListeListener();
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

function razAddUpdListe() {
    $('#addUpdlisteVoteContent .optionAddAfterSaveListe').hide();
    $('#addUpdlisteVoteContent input[name=choice_name]').val('');
    $('#addUpdlisteVoteContent input[name=choice_id]').val('');
    $('#addUpdlisteVoteContent input[name=vote_id]').val('');
    $('#addUpdlisteVoteContent input[name=profoi_liste]').val('');
    $('#addUpdlisteVoteContent input[name=logo_liste]').val('');
    $('#addUpdlisteVoteContent input[name=choice_type]').first().prop('checked', true);
    $('#optionsListeSyndicale, #optionsListeCommune').hide();
    $('#optionsListeSyndicale input, #optionsListeCommune input').val('');
    $('#optionsListeSyndicale .row').not(':first').remove();
    $('#optionsListeCommune .row').not(':first').remove();
    $('#apercuLogoListe').prop('src', '');
    $('#apercuPdfListe').prop('href', '');
    $('.btnSupprPdfListe, .btnSupprLogoListe, #apercuLogoListe, #apercuPdfListe').hide();
    $('#addUpdlisteVoteContent .fileupload').each(function () {
        var parent = $(this).parent();
        $('.progress-bar', parent).css('width', '0%');
        $('.progress-bar', parent).removeClass().addClass('progress-bar');
        $('.answer', parent).html('').removeClass().addClass('answer');
    })
}

function razAddUpdCandidat() {

    $('#addUpdCandidat select[name=candidat_genre]').val('');
    $('#addUpdCandidat input[name=candidat_nom]').val('');
    $('#addUpdCandidat input[name=candidat_prenom]').val('');
    $('#addUpdCandidat input[name=candidat_datenaiss]').val('');
    $('#addUpdCandidat  .optionAddAfterSaveCandiat').hide();
    $('#addUpdCandidat input[name=index_candidat]').val('999');
    $('#addUpdCandidat .fileupload').each(function () {
        var parent = $(this).parent();
        $('.progress-bar', parent).css('width', '0%');
        $('.progress-bar', parent).removeClass().addClass('progress-bar');
        $('.answer', parent).html('').removeClass().addClass('answer');
    })
    $('#formUploadPhotoCandidat input[name=photo_candidat]').val('');
    $('#formUploadProfessionFoiCandidat input[name=profoi_candidat]').val('');
    $('#apercuPhotoCandidat').prop('src', '');
    $('#apercuPdfCandidat').prop('href', '');
    $('.btnSupprPhotoCandidat, .btnSupprPdfCandidat, #apercuPhotoCandidat, #apercuPdfCandidat').hide();


}

function saveVoteCarence(etat, objDom) {

    let vote_id = parseInt(objDom.parents('tr').data('id'))
    let btnEdit = objDom.parents('tr').find('.btnEditListesVote');


    // Par sécurité pour éviter de cliquer sur l'édition de liste pendant que l'Ajax tourne
    btnEdit.addClass('disabled').attr('disabled', 'disabled');

    let Datas = getCsrfData({ etat: etat, vote_id:vote_id });

    $.ajax({
        url: '/organisateur/listes/votecarence',
        data: Datas,
        method: "post",
        success: function (retour) {
            retour+= '';
            if (retour === 'ok') {
                if (etat === 0) {
                    btnEdit.removeClass('invisible');
                } else {
                    btnEdit.addClass('invisible');
                }
                verifBtnValideEtape();
            } else {
                showSwal("Une erreur est survenue lors de la mise à jour de la carence.");
            }
        },
        error: function (jqXHR, textStatus, errorThrown) {
            let message = 'Une erreur est survenue.';
            if (jqXHR.responseJSON && jqXHR.responseJSON.error) {
                message = jqXHR.responseJSON.error;
            }
            showSwal(message, 'warning')
        },
        complete: function () {
            btnEdit.removeClass('disabled').prop('disabled', false);
        }
    });

}

function loadListesDuVote(vote_id, college, ts) {
    if (isNaN(vote_id) || vote_id === '') {
        showSwal("Identification du vote échoué [E121]");
        return false;
    }
    let Datas = getCsrfData({ vote_id: vote_id });
    $.ajax({
        url: '/organisateur/listes/listesvote',
        data: Datas,
        method: "post",
        success: function (retour) {
            retour+= '';
            $('#infoBleueEtapeListes').html("Créez et gérez vos listes du vote.");
            $('#listeVoteContent').html(retour);
            $('#voteIdForListes').val(vote_id);
            $('#collegeForListes').val(college);
            $('#tsForListes').val(ts);
            $('#formAddUpdListesVote h2 span.h2s-n2').html(college+' &mdash; '+ts)
            $('#votesListes').slideUp(300);
            $('#formAddUpdListesVote').slideDown(300);
            $('.btnValiderEtape').hide();
            $('.btnRetourVotes, .btnAddListe').show();
            listesOneVoteListener();
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
function addUpdListeListener() {

    let selected = $('#addUpdlisteVoteContent input[name=choice_type]:checked').val();
    if (selected) changeTypeListe(selected);
    updateButtonsSyndicat();
    updateButtonsCommune();

    const $blocOs = $('#optionsListeSyndicale');
    const $blocLc = $('#optionsListeCommune');

    // Ajouter une ligne (syndicats)
    $blocOs.off("click.addOs").on("click.addOs", ".btnAddOrganisationSyndicale", function () {
        // Vérifie que toutes les lignes sont remplies
        let toutRempli = true;
        $blocOs.find("input.syndicatOSA").each(function () {
            if ($(this).val() === "") {
                toutRempli = false;
            }
        });

        if (!toutRempli) {
            showSwal("Veuillez compléter chaque lignes disponible avant d’en ajouter une autre.", 'warning', "Attention");
            return;
        }

        const $lastRow = $blocOs.find(".row").last();
        const $newRow = $lastRow.clone(true);

        // Réinitialiser la valeur du <select>
        $newRow.find("input.syndicatOSA").val("");
        $newRow.find("label").hide();

        $newRow.insertAfter($lastRow);
        updateButtonsSyndicat();
    });

    // Supprimer une ligne (syndicats)
    $blocOs.off("click.delOs").on("click.delOs", ".btnSupprOrganisationSyndicale", function () {
        if ($blocOs.find(".row").length > 1) {
            $(this).closest(".row").remove();
            updateButtonsSyndicat();
        }
    });

    // Ajouter une ligne (commune)
    $blocLc.off("click.addLc").on("click.addLc", ".btnAddLigneCommune", function () {
        // Vérifie que toutes les lignes sont remplies
        let toutRempli = true;
        $blocLc.find("input.syndicatLC").each(function () {
            if ($(this).val() === "") {
                toutRempli = false;
            }
        });
        $blocLc.find("input.organisationLC").each(function () {
            if ($(this).val() === "") {
                toutRempli = false;
            }
        });
        $blocLc.find("input.repartitionLC").each(function () {
            if ($(this).val() === "") {
                toutRempli = false;
            }
        });

        if (!toutRempli) {
            showSwal("Veuillez compléter chaque lignes disponible avant d’en ajouter une autre.", 'warning', "Attention");
            return;
        }

        const $lastRow = $blocLc.find(".row").last();
        const $newRow = $lastRow.clone(true);

        // Réinitialiser la valeur du <select>
        $newRow.find("input.syndicatLC").val("");
        $newRow.find("input.organisationLC").val("");
        $newRow.find("input.repartitionLC").val("");
        $newRow.find("label").hide();

        $newRow.insertAfter($lastRow);
        updateButtonsCommune();
    });

    // Supprimer une ligne (commune)
    $blocLc.off("click.delLc").on("click.delLc", ".btnSupprLigneCommune", function () {
        if ($blocLc.find(".row").length > 1) {
            $(this).closest(".row").remove();
            updateButtonsCommune();
        }
    });


    $('#addUpdlisteVoteContent input[name=choice_type]').on('change', function() {
        changeTypeListe(this.value);
    });

    $('.btnSupprLogoListe').off('click.supprlogo').on('click.supprlogo', function () {
        $('.btnSupprLogoListe, #apercuLogoListe').hide();
        $('#addUpdlisteVoteContent input[name=logo_liste]').val('');
    });

    $('.btnSupprPdfListe').off('click.supprpdf').on('click.supprpdf', function () {
        $('.btnSupprPdfListe, #apercuPdfListe').hide();
        $('#addUpdlisteVoteContent input[name=profoi_liste]').val('');
    });

    $('.btnRetourListes').off('click.retourListes').on('click.retourListes', function () {

        let vote_id = parseInt($('#voteIdForListes').val());
        let college = $('#collegeForListes').val();
        let ts = $('#tsForListes').val();

        $('#addUpdlisteVoteContent').slideUp(300);
        $('#listeVoteContent').slideDown(300);
        $('.btnRetourListes, .btnSaveListe').hide();
        $('.btnRetourVotes, .btnAddListe').show();
        loadListesDuVote(vote_id, college, ts);

    });

    $('.btnSaveListe').off('click.saveListe').on('click.saveListe', function () {
        if ($('#addUpdlisteVoteContent input[name=choice_name]').val() === '') {
            showSwal("Préciser le nom de la liste.");
            return false;
        }
        let Datas = $("#addUpdlisteVoteContent").serializeArray().concat($("#formcsrf").serializeArray());
        $.ajax({
            url: '/organisateur/save/liste',
            data: Datas,
            method: "post",
            success: function (retour) {
                retour+= '';
                if (retour === 'ok') {
                    Swal.fire({
                        title: "",
                        text:'Liste enregistrée',
                        icon: "success",
                        showCancelButton: false,
                        confirmButtonText: 'Continuer',
                    }).then((result) => {

                        let vote_id = parseInt($('#voteIdForListes').val());

                        if ($('input[name=add_after_save]').is(':checked')) {
                            showAddUpdListe(vote_id, 0);
                        } else {
                            let vote_id = parseInt($('#voteIdForListes').val());
                            let college = $('#collegeForListes').val();
                            let ts = $('#tsForListes').val();

                            $('#addUpdlisteVoteContent').slideUp(300);
                            $('#listeVoteContent').slideDown(300);
                            $('.btnRetourListes, .btnSaveListe').hide();
                            $('.btnRetourVotes, .btnAddListe').show();
                            loadListesDuVote(vote_id, college, ts);
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
    });
}

function changeTypeListe(value) {

    switch (value) {
        case 'syndicat':
            $('#optionsListeSyndicale').show();
            $('#optionsListeCommune').hide();
            break;
        case 'commune':
            $('#optionsListeSyndicale').hide();
            $('#optionsListeCommune').show();
            break;
        case 'candidat':
            $('#optionsListeSyndicale, #optionsListeCommune').hide();
            break;
    }
}


function updateButtonsSyndicat() {

    const $bloc = $('#optionsListeSyndicale');
    const $lines = $bloc.find('.row');
    const total = $lines.length;
    $lines.each(function (index) {
        const $addBtnOs = $(this).find(".btnAddOrganisationSyndicale");
        const $delBtnOs = $(this).find(".btnSupprOrganisationSyndicale");
        if (total === 1) {
            $(this).find('label').show();
        }
        if (index === 4 && total > 4) {
            $addBtnOs.hide();
        } else if (index === total - 1) {
            $addBtnOs.show();
        } else {
            $addBtnOs.hide();
        }
        if (total > 1) {
            $delBtnOs.show();
        } else {
            $delBtnOs.hide();
        }
    });
}

function updateButtonsCommune() {

    const $bloc = $('#optionsListeCommune');
    const $lines = $bloc.find('.row');
    const total = $lines.length;
    $lines.each(function (index) {
        const $addBtnLc = $(this).find(".btnAddLigneCommune");
        const $delBtnLc = $(this).find(".btnSupprLigneCommune");
        if (total === 1) {
            $(this).find('label').show();
        }
        if (index === 4 && total > 4) {
            $addBtnLc.hide();
        } else if (index === total - 1) {
            $addBtnLc.show();
        } else {
            $addBtnLc.hide();
        }
        if (total > 1) {
            $delBtnLc.show();
        } else {
            $delBtnLc.hide();
        }
    });
}

function loadCandidats(liste_id) {
    let Datas = getCsrfData({ liste_id: liste_id });
    $.ajax({
        url: '/organisateur/listes/candidats',
        data: Datas,
        method: "post",
        success: function (retour) {
            retour+= '';
            $('#listeCandidats').html(retour);
            listeCandidatsListener();
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

function formatDate(dateStr) {
    const regex = /^(\d{2})-(\d{2})-(\d{4})$/;
    const match = dateStr.match(regex);
    if (!match) return null; // format invalide
    return `${match[3]}-${match[2]}-${match[1]}`;
}