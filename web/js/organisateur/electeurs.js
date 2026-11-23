function main() {

    $('.btnAddElecteur').off('click.adduser').on('click.adduser', function () {
        razFormAddUpdElecteur();

        $('#formElecteurs').slideUp(300);
        $('#formAddUpdElecteur').slideDown(300);
        $('.btnAddElecteur, .btnAddCsv, .btnValiderEtape').hide();
        $('.btnSaveAddUpd, .btnAnnulerAddUpd, #addAfterSaveContainer').show();
        addUpdElecteurListener();
    });

    $('.btnAddCsv').off('click.addcsv').on('click.addcsv', function () {
        $('#formElecteurs').slideUp(300);
        $('#formImport').slideDown(300);
        $('.btnAddElecteur, .btnAddCsv, .btnValiderEtape').hide();
        $('.btnGoImport, .btnAnnulerAddUpd').show();
        importListener();
    });

    $('.btnValiderEtape').off('click.valide').on('click.valide', function () {
        verifChampsValideEtape();
    });

    listeElecteursListener();
}

function importListener() {

    if ($('#listeCollegesCodesToimport li').length === 0) {
        showSwal("Aucun vote n'est disponible, vérifiez les dates.", 'error', "Votes indisponibles");
        $('#formImport').slideUp(300);
        $('#formElecteurs').slideDown(300);
        $('.btnGoImport, .btnAnnulerAddUpd').hide();
        $('.btnAddElecteur, .btnAddCsv, .btnValiderEtape').show();
        return false;
    }

    $('input.fileupload').addClass('organisateur-electeurs-csv')
    $('.btnGoImport').addClass('disabled').attr('disabled', 'disabled');

    $('.btnAnnulerAddUpd').off('click.annuler').on('click.annuler', function () {
        $('#formImport').slideUp(300);
        $('#formElecteurs').slideDown(300);
        $('.btnGoImport, .btnAnnulerAddUpd').hide();
        $('.btnAddElecteur, .btnAddCsv, .btnValiderEtape').show();
    });

    $('.btnTelechargerTrameCsv').off('click.trame').on('click.trame', function () {
        window.location.href = "/organisateur/electeurs/gettrame";
    });

    $('.btnGoImport').off('click.goimport').on('click.goimport', function () {
        if ($('#formUploadCsv input[name=import]').val() == '') {
            showSwal("Chargez un fichier CSV pour l'importer.");
            return false;
        }

        let tableVide = !$('.datatable-organisateurs-electeurs').DataTable().data().any();
        let texte = "Importer tous les électeurs du fichier ?";
        let ecraser = 1;
        if (!tableVide) {
            ecraser = $('#radioEcraser').is(':checked') ? 1 : 0;
            texte = ecraser === 1 ? "Remplacer tous les électeurs par ceux du fichier ?" : "Ajouter tous les électeurs du fichier ?";
        }

        let objDom = $('.btnGoImport');

        Swal.fire({
            title: "Confirmez",
            text: texte,
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#DD6B55",
            confirmButtonText: "Importer",
            cancelButtonText: 'Annuler',
            closeOnConfirm: true
        }).then((result) => {
            if (result.isConfirmed) {
                let Datas = getCsrfData({ ecraser: ecraser });

                objDom.addClass('disabled').attr('disabled', 'disabled');
                $('#overlay .text').text("L'import en cours, merci de patienter...");
                showOverlay();

                $.ajax({
                    url: '/organisateur/electeurs/import',
                    data: Datas,
                    method: "post",
                    success: function (retour) {
                        retour+= '';
                        if (retour === 'ok') {

                            setTimeout(function() {

                                Swal.fire({
                                    title: "Import terminé",
                                    text: "Les électeurs ont été ajoutés avec succès.",
                                    icon: "success",
                                    confirmButtonColor: "#579569",
                                    confirmButtonText: "Continuer"
                                }).then((result) => {
                                    window.location.replace('/organisateur/electeurs');
                                });
                            }, 800);

                        } else {
                            setTimeout(function() {
                                showSwal("L'import du fichier a échoué ! [E077]");
                            }, 800);

                        }
                    },
                    error: function (jqXHR, textStatus, errorThrown) {
                        setTimeout(function() {
                            showSwal(
                                jqXHR.responseJSON?.error ?? 'Une erreur est survenue.',
                                'error',
                                'Import impossible',
                                jqXHR.responseJSON?.taille ?? 0,
                                jqXHR.responseJSON?.gauche ?? 0
                            );
                        }, 800);


                    }, complete: function () {
                        setTimeout(function() {
                            objDom.removeClass('disabled').prop('disabled', false);
                            hideOverlay();
                        }, 1000);

                    }
                });
            }
        });
    });
}

function listeElecteursListener() {
    if ( typeof DataTable === 'function' ) {
        $('.datatable-organisateurs-electeurs').DataTable({
            pageLength: 50,
            lengthChange: false,
            language: {
                paginate: {
                    previous: "<i class=\"fa fa-chevron-left\"></i> Précédent",
                    next: "Suivant <i class=\"fa fa-chevron-right\"></i>"
                }
            },
            columnDefs: [
                { orderable: false, targets: [-1, -2] }
            ],
            drawCallback: function (settings) {
                getLimiteElecteurs(this.api().data().length);
            }
        });

        let elem_datatable_filterinput = $('.dataTables_wrapper .dataTables_filter input');
        $(elem_datatable_filterinput).attr('placeholder', 'Rechercher un électeur...');
    }

    $('.btnRenvoyerAcces').off('click.renvoyer').on('click.renvoyer', function () {
        let username = $(this).parents('tr').data('username');
        if (username === undefined || username === null || username === '') {
            showSwal("Identification de l'électeur impossible.");
            return;
        }
        Swal.fire({
            title: "Envoi des identifiants",
            text: "Renvoyer de nouveaux identifiants de connexion à cet électeur ?",
            icon: "question",
            showCancelButton: true,
            confirmButtonColor: "#417750",
            confirmButtonText: "Envoyer",
            cancelButtonText: 'Annuler',
            width: 600,
            closeOnConfirm: true
        }).then((result) => {
            if (result.isConfirmed) {
                let Datas = getCsrfData({ username: username });

                $.ajax({
                    url: '/organisateur/electeur/resend',
                    data: Datas,
                    method: "post",
                    success: function (retour) {
                        retour+= '';
                        if (retour === 'ok') {
                            window.location.replace('/organisateur/electeurs');
                        } else {
                            showSwal("L'envoi a échouée.");
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


    $('.btnSupprElecteur').off('click.supprelecteur').on('click.supprelecteur', function () {
        let username = $(this).parents('tr').data('username');
        if (username === undefined || username === null || username === '') {
            showSwal("Identification de l'électeur impossible.");
            return;
        }
        Swal.fire({
            title: "Attention",
            text: "Supprimer définitivement cet électeur ?",
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#DD6B55",
            confirmButtonText: "Supprimer",
            cancelButtonText: 'Annuler',
            closeOnConfirm: true
        }).then((result) => {
            if (result.isConfirmed) {
                let Datas = getCsrfData({ username: username });

                $.ajax({
                    url: '/organisateur/electeur/supprimer',
                    data: Datas,
                    method: "post",
                    success: function (retour) {
                        retour+= '';
                        if (retour === 'ok') {
                            window.location.replace('/organisateur/electeurs');
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

    $('.btnEditElecteur').off('click.editelecteur').on('click.editelecteur', function () {
        let username = $(this).parents('tr').data('username');
        if (username === undefined || username === null || username === '') {
            showSwal("Identification de l'électeur impossible.");
            return;
        }
        let Datas = getCsrfData({ username: username });
        $.ajax({
            url: '/organisateur/electeur/datas',
            data: Datas,
            dataType: 'json',
            method: "post",
            success: function (retour) {
                if (retour && typeof retour === 'object' &&
                    'user' in retour &&
                    'useraccess' in retour &&
                    'usersvotes' in retour) {

                    $('#usernameUpddate').val(retour.user.user_username);

                    let college = retour.usersvotes[0] !== undefined ? retour.usersvotes[0].vote_namekey : '';
                    $('#collegeVote').val(college);

                    let categories = [...new Set(retour.usersvotes.map(item => item.vote_category))];
                    let categorie = categories.length === 1 ? categories[0] : "ts";
                    $('#voteElecteur').val(categorie);

                    $('#formAddUpdElecteur h2').text(retour.user.user_prenom+' '+retour.user.user_nom);
                    $('#formAddUpdElecteur input[name=electeur_nom]').val(retour.user.user_nom);
                    $('#formAddUpdElecteur input[name=electeur_prenom]').val(retour.user.user_prenom);
                    $('#formAddUpdElecteur input[name=electeur_email]').val(retour.useraccess.useraccess_email);

                    if (isValidDateYMD(retour.user.user_dateentree)) {
                        $('#formAddUpdElecteur input[name=date_entree]').val(retour.user.user_dateentree);
                    } else {
                        $('#formAddUpdElecteur input[name=date_entree]').val('');
                    }

                    if ($('#formAddUpdElecteur input[name=electeur_tel]').length) {
                        $('#formAddUpdElecteur input[name=electeur_tel]').val(retour.useraccess.useraccess_tel.replace(/^\+33/, "0"));
                    }

                    if ((retour.useraccess.useraccess_datenaiss !== '' && retour.useraccess.useraccess_datenaiss !== null && $('#formAddUpdElecteur input[name=electeur_datenaiss]').length) || (retour.useraccess.useraccess_depnaiss !== '' && retour.useraccess.useraccess_depnaiss !== null && $('#formAddUpdElecteur input[name=electeur_depnaiss]').length)
                    ) {
                        // Depnaiss datenaiss
                        $('.donnee-update-naissance').show();
                        $('.donnee-naissance').hide();
                    } else if (retour.useraccess.useraccess_numss !== '' && retour.useraccess.useraccess_numss !== null && $('#formAddUpdElecteur input[name=electeur_matricule]').length) {
                        // Matricule
                        $('#formAddUpdElecteur input[name=electeur_matricule]').hide();
                        $('#formAddUpdElecteur .btnUpdMatricule').removeClass('hid').addClass('d-block');

                    } else if (retour.useraccess.useraccess_numss !== '' && retour.useraccess.useraccess_numss !== null && $('#formAddUpdElecteur input[name=electeur_donneeperso]').length) {
                        // Donnée perso
                        $('#formAddUpdElecteur input[name=electeur_donneeperso]').hide();
                        $('#formAddUpdElecteur .btnUpdAutreDonnee').removeClass('hid').addClass('d-block');
                    }

                    $('#formElecteurs').slideUp(300);
                    $('#formAddUpdElecteur').slideDown(300);
                    $('.btnAddElecteur, .btnAddCsv, .btnValiderEtape, #addAfterSaveContainer').hide();
                    $('.btnSaveAddUpd, .btnAnnulerAddUpd').show();
                    addUpdElecteurListener();

                } else {
                    showSwal("Récupération des données de l'électeur échouée ! [E106]");
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
    });
    canAddElecteurs();
}

function addUpdElecteurListener() {

    if ($('#collegeVote option').length === 0 || $('#voteElecteur option').length === 0) {
        showSwal("Aucun vote n'est disponible, vérifiez les dates.", 'error', "Votes indisponibles");
        $('#formAddUpdElecteur').slideUp(300);
        $('#formElecteurs').slideDown(300);
        $('.btnSaveAddUpd, .btnAnnulerAddUpd').hide();
        $('.btnAddElecteur, .btnAddCsv, .btnValiderEtape').show();
        return false;
    }

    $('.btnUpdDateEtDepNaissance').off('click.updnaiss').on('click.updnaiss', function () {
        $('.donnee-update-naissance').hide();
        $('.donnee-naissance').show();
    });

    $('.btnUpdMatricule').off('click.updmat').on('click.updmat', function () {
        $('.btnUpdMatricule').removeClass('d-block').addClass('hid');
        $('#formAddUpdElecteur input[name=electeur_matricule]').show().focus();
    });

    $('.btnUpdAutreDonnee').off('click.updautre').on('click.updautre', function () {
        $('.btnUpdAutreDonnee').removeClass('d-block').addClass('hid');
        $('#formAddUpdElecteur input[name=electeur_donneeperso]').show().focus();
    });

    $('.btnAnnulerAddUpd').off('click.annuler').on('click.annuler', function () {
        $('#formAddUpdElecteur').slideUp(300);
        $('#formElecteurs').slideDown(300);
        $('.btnSaveAddUpd, .btnAnnulerAddUpd').hide();
        $('.btnAddElecteur, .btnAddCsv, .btnValiderEtape').show();
    });

    $('.btnSaveAddUpd').off('click.addupd').on('click.addupd', function () {

        if (verifChampsElecteur() === false) {

            Swal.fire({
                title: "Enregistrement impossible",
                text: "Veuillez compléter tous les champs obligatoires.",
                icon: "warning",
                confirmButtonColor: "#dd6B55",
                confirmButtonText: "Compris",
            }).then((result) => {
                $('.coe').each(function() {
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
        if (!regexMail.test($('#formAddUpdElecteur input[name=electeur_email]').val())) {
            showSwal("L'adresse e-mail renseignée n'est pas valide.", 'error', "Enregistrement impossible");
            return false
        }

        let champAutreDonnee = $('#formAddUpdElecteur input[name=electeur_donneeperso]:visible');
        if (champAutreDonnee.length && champAutreDonnee.val().length > parseInt(champAutreDonnee.data('longueur'))) {
            let libelleAutreData = champAutreDonnee.parent().find('label').text();
            showSwal(
                `La valeur de ${libelleAutreData} est limitée à ${champAutreDonnee.data('longueur')} caractères.`,
                'warning',
                "Enregistrement impossible"
            );
            return false
        }

        saveElecteurAjax();

    });

}

function saveElecteurAjax() {

    let Datas = $("#formAddUpdElecteur").serializeArray().concat($("#formcsrf").serializeArray());

    $.ajax({
        url: '/organisateur/save/electeur',
        data: Datas,
        method: "post",
        success: function (retour) {
            retour+= '';
            if (retour === 'ok') {

                Swal.fire({
                    title: "",
                    text:'Électeur enregistré',
                    icon: "success",
                    showCancelButton: false,
                    confirmButtonText: 'Continuer',
                }).then((result) => {
                    if ($('input[name=add_after_save]').is(':checked')) {
                        razChampsElecteur();
                    } else {
                        window.location.replace('/organisateur/electeurs');
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

function verifChampsElecteur() {

    if ($('#collegeVote').val() === null || $('#collegeVote').val() === '') {
        return false;
    }
    if ($('#voteElecteur').val() === null || $('#voteElecteur').val() === '') {
        return false;
    }

    let champDepNaiss = $('#electeurdepnaiss:visible');
    if (champDepNaiss.length && !champDepNaiss.val()) {
        return false;
    }

    if ($('#formAddUpdElecteur input.coe:visible').filter(function() { return $(this).val().trim() === ''; }).length > 0) {
        return false;
    }

    return true;
}

function verifChampsValideEtape() {

    if (!$('#DataTables_Table_0').length) {
        showSwal("Ajoutez ou importez au moins un électeur.", 'error', "Validation impossible");
        return false;
    }

    let electeursErreur = [];
    $('#DataTables_Table_0 tbody tr').each(function() {
        let err_matricule = parseInt($(this).data('err-mat')) === 0;
        let err_datenaiss = parseInt($(this).data('err-dtn')) === 0;
        let err_depnaiss = parseInt($(this).data('err-dpn')) === 0;
        let err_donnee = parseInt($(this).data('err-don')) === 0;
        let err_tel = parseInt($(this).data('err-tel')) === 0;

        if (err_matricule === false || err_datenaiss === false || err_depnaiss === false || err_donnee === false || err_tel === false) {
            electeursErreur.push($(this).find('td:nth-child(1)').text()+' '+$(this).find('td:nth-child(2)').text());
            return false;
        }
    });

    if (electeursErreur.length > 0) {
        showSwal("<p>Certains électeurs ne disposent pas des élements nécéssaires pour valider cette étape :</p>"+electeursErreur.join(', '), 'error', "Validation impossible", 800, 1);
        return false;
    }

    saveEtape();

}

function saveEtape() {

    let Datas = getCsrfData();

    $.ajax({
        url: '/organisateur/valide/electeurs',
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


function getCsrfData(extra = {}) {
    return Object.assign({
        csrf_name: $('#formcsrf').find('input.csrf[name=csrf_name]').val(),
        csrf_value: $('#formcsrf').find('input.csrf[name=csrf_value]').val(),
    }, extra);
}


function showSwal(texte, icon = 'error', titre = 'Oups', taille = 0, gauche = 0) {

    let confirmBtnTexte = icon === 'error' ? 'Fermer' : 'Compris';

    let width = taille > 0 ? taille+'px' : '';
    let customClass = gauche === 1  ? 'swal-content-left' : '';

    Swal.fire({
        title: titre,
        html:texte,
        icon: icon,
        customClass: customClass,
        width: width,
        confirmButtonColor: "#dd6B55",
        confirmButtonText: confirmBtnTexte
    })

}

function razChampsElecteur() {
    $('#collegeVote').val('');
    $('#voteElecteur').val('');
    let champDepNaiss = $('#electeurdepnaiss:visible');
    if (champDepNaiss.length && !champDepNaiss.val()) {
        champDepNaiss.val('');
    }
    $('#formAddUpdElecteur input.coe:visible').each(function() {
        $(this).val('');
    });
}

function isValidDateYMD(str) {
    // Vérifie la forme et exclut "0000-00-00"
    var regex = /^\d{4}-\d{2}-\d{2}$/;
    if (!regex.test(str) || str === "0000-00-00") return false;

    // Vérifie que la date existe réellement
    var parts = str.split("-");
    var year = parseInt(parts[0], 10);
    var month = parseInt(parts[1], 10);
    var day = parseInt(parts[2], 10);

    var date = new Date(year, month - 1, day);

    return (
        date.getFullYear() === year &&
        date.getMonth() === month - 1 &&
        date.getDate() === day
    );
}

function razFormAddUpdElecteur() {
    $('#formAddUpdElecteur h2').text('Nouvel électeur...');
    $('#usernameUpddate').val('');
    $('#collegeVote').val('');
    $('#voteElecteur').val('');
    $('#formAddUpdElecteur input[name=electeur_nom]').val('');
    $('#formAddUpdElecteur input[name=electeur_prenom]').val('');
    $('#formAddUpdElecteur input[name=electeur_email]').val('');
    $('#formAddUpdElecteur input[name=date_entree]').val('');
    if ($('#formAddUpdElecteur input[name=electeur_tel]').length) {
        $('#formAddUpdElecteur input[name=electeur_tel]').val('');
    }
    if ($('#formAddUpdElecteur input[name=electeur_depnaiss]').length) {
        $('#formAddUpdElecteur input[name=electeur_depnaiss]').val('');
    }
    if ($('#formAddUpdElecteur input[name=electeur_datenaiss]').length) {
        $('#formAddUpdElecteur input[name=electeur_datenaiss]').val('');
    }
    if ($('#formAddUpdElecteur input[name=electeur_matricule]').length) {
        $('#formAddUpdElecteur input[name=electeur_matricule]').val('');
    }
    if ($('#formAddUpdElecteur input[name=electeur_donneeperso]').length) {
        $('#formAddUpdElecteur input[name=electeur_donneeperso]').val('');
    }
    $('.donnee-update-naissance').hide();
    $('.donnee-naissance').show();
}

function getLimiteElecteurs(total) {
    $.ajax({
        url: '/organisateur/le',
        method: "get",
        success: function (retour) {
            let le = isNaN(retour) ? 0 : parseInt(retour);
            if (le > 0) {
                let restant = le - total;
                let s = restant > 1 ? 's' : '';
                let texte ='('+restant+' restant'+s+')';
                $('.dataTables_info').append(`<span class="dt-electeurs-restants">${texte}</span>`);
            }
        }
    });
}

function canAddElecteurs() {
    $.ajax({
        url: '/organisateur/electeurs/canadd',
        method: "get",
        success: function (retour) {
           retour+= '';
           if (parseInt(retour) > 1) {
               $('#alertMaxElecteurs b').text(parseInt(retour));
               $('#alertMaxElecteurs').removeClass('d-none').addClass('d-block');
               // $('.btnAddElecteur').addClass('disabled').attr('disabled', 'disabled');
                $('.btnAddElecteur').remove();
           }
        }
    });
}