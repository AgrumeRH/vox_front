function main() {

    $('#hasExpert').on('change', function () {
        updateHasExpert($(this).is(':checked'));
        if ($(this).is(':checked')) {
            $('#blocExpert').show();
            $('#blocExpert .coordonneesExpert:first').focus();
        } else {
            $('#blocExpert').hide();
        }
    });

    $('#hasSirets').on('change', function () {
        if ($(this).is(':checked')) {
            $('#blocSirets').show();
        } else {
            $('#blocSirets .autresSirets').val('');
            $('#blocSirets').hide();
        }
    });

    $('input.co').on('change, blur', function () {
        verifChamps();
    });

    $('.btnEnvoiIdentifiantsExpert').off('click.envoi').on('click.envoi', function () {
        envoiIdentifiantsExpert();
    });

    $('.btnValiderEtape').off('click.valide').on('click.valide', function () {
        verifChampsValideEtape();
    });

    autresSiretsListener();
    verifChamps();
}
function autresSiretsListener() {
    const maxSirets = 11;
    const $bloc = $("#blocSirets");

    // Fonction de mise à jour des boutons
    function updateButtons() {
        const $lines = $bloc.find(".row");
        const total = $lines.length;

        $lines.each(function (index) {
            const $addBtn = $(this).find(".btnAddSiret");
            const $delBtn = $(this).find(".btnSupprSiret");

            // Affiche bouton "ajouter" uniquement sur la dernière ligne et si < max
            if (index === total - 1 && total < maxSirets) {
                $addBtn.show();
            } else {
                $addBtn.hide();
            }

            // Toujours montrer le bouton supprimer sauf s’il ne reste qu’une ligne
            if (total > 1) {
                $delBtn.show();
            } else {
                $delBtn.hide();
            }
        });
    }

    // Ajouter une ligne
    $bloc.on("click", ".btnAddSiret", function () {
        const $lastRow = $bloc.find(".row").last();
        const $newRow = $lastRow.clone(true);

        // Réinitialiser le champ input
        $newRow.find("input").val("");

        // Ajouter la ligne sous la dernière
        $newRow.insertAfter($lastRow);

        updateButtons();
    });

    // Supprimer une ligne
    $bloc.on("click", ".btnSupprSiret", function () {
        if ($bloc.find(".row").length > 1) {
            $(this).closest(".row").remove();
            updateButtons();
        }
    });

    // Initialisation
    updateButtons();
}

function verifChamps(retour) {

    if ($('input.co').filter(function() { return $(this).val().trim() === ''; }).length === 0) {
        if (retour) { return true; }
        $('.btnValiderEtape.disabled').removeClass('disabled');
    } else {
        if (retour) { return false; }
        if (!$('.btnValiderEtape').hasClass('disabled')) {
            $('.btnValiderEtape').addClass('disabled');
        }
    }
}

function verifChampsValideEtape() {

    $('.c-siret').each(function () {
        let val = $(this).val();
        val = val.replace(/[^0-9 ]+/g, '');
        $(this).val(val);
    })

    if (verifChamps(true) === false) {

        Swal.fire({
            title: "Validation impossible",
            text: "Veuillez compléter tous les champs obligatoires.",
            icon: "warning",
            confirmButtonColor: "#dd6B55",
            confirmButtonText: "Compris"
        }).then((result) => {
            $('input.co').each(function() {
                if ($(this).val().trim() === '') {
                    $(this).addClass('erreurouge');
                }
            });
            setTimeout(function() {
                $('.erreurouge').removeClass('erreurouge');
            }, 3000);
        });
        return false;
    }

    let siretsPasBons = verifSirets();
    if (siretsPasBons.length > 0) {
        let texte = siretsPasBons.length === 1 ? 'Le SIRET renseigné est invalide, vérifiez son format.' : 'Plusieurs SIRET renseignés sont invalides, vérifiez leurs formats.';


        Swal.fire({
            title: "Validation impossible",
            text: texte,
            icon: "warning",
            confirmButtonColor: "#dd6B55",
            confirmButtonText: "Compris",
        }).then((result) => {
            $(siretsPasBons).each(function () {
                $(this).addClass('erreurouge');
                setTimeout(function() {
                    $('.erreurouge').removeClass('erreurouge');
                }, 3000);
            });
        });
        return false
    }

    let emailsPasBons = verifEmails();
    if (emailsPasBons.length > 0) {
        let texte = emailsPasBons.length === 1 ? "L'adresse e-mail renseignée est invalide, vérifiez son format." : 'Les adesses e-mail renseignés sont invalides, vérifiez leurs formats.';


        Swal.fire({
            title: "Validation impossible",
            text: texte,
            icon: "warning",
            confirmButtonColor: "#dd6B55",
            confirmButtonText: "Compris",
        }).then((result) => {
            $(emailsPasBons).each(function () {
                $(this).addClass('erreurouge');
                setTimeout(function() {
                    $('.erreurouge').removeClass('erreurouge');
                }, 3000);
            });
        });
        return false
    }

    if ($('#hasExpert').is(':checked')) {
        let toutEstRempli = true;
        var champsAremplir = [];

        $('.coordonneesExpert').each(function () {
            if ($(this).val().trim() === '') {
                toutEstRempli = false;
                champsAremplir.push($(this));
            }
        });

        if (!toutEstRempli) {

            Swal.fire({
                title: "Validation impossible",
                text: 'Un expert est mandaté pour cette élection : complétez les champs obligatoires.',
                icon: "warning",
                confirmButtonColor: "#dd6B55",
                confirmButtonText: "Compris",
            }).then((result) => {
                champsAremplir.forEach(function ($champ) {
                    $champ.addClass('erreurouge');
                    setTimeout(function () {
                        $champ.removeClass('erreurouge');
                    }, 3000);
                });
            });
            return false;
        }
    }

    // OK !
    saveEtape();

}

function verifSirets()  {
    var siretsPasBons = [];
    let autres = $('#hasSirets').is(':checked');
    $('.c-siret').each(function () {
        let skip = !autres && $(this).hasClass('autresSirets');
        const val = $(this).val().trim();
        if (!isSiretValide(val) && !skip) {
            siretsPasBons.push($(this));
        }
    });
    return siretsPasBons;
}

function verifEmails() {
    var emailsPasBons = [];
    $('.c-email').each(function() {
        const val = $(this).val().trim();
        if (!isEmailValide(val) && $(this).is(':visible')) {
            emailsPasBons.push($(this));
        }
    });
    return emailsPasBons;
}


function saveEtape() {

    let Datas = $("#formEtape").serializeArray();

    $.ajax({
        url: '/organisateur/addupd/entreprise',
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
                    icon: "error",
                    confirmButtonColor: "#dd6B55",
                    confirmButtonText: "Fermer"
                });

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
                icon: 'warning',
                confirmButtonColor: "#dd6B55",
                confirmButtonText: "Compris",
            });
        }
    });
}

function envoiIdentifiantsExpert() {
    let prenom = $('input[name="election_expert_nom"]').val().trim();
    let nom = $('input[name="election_expert_prenom"]').val().trim();
    let email = $('input[name="election_expert_email"]').val().trim();

    if (prenom === '' || nom === '' || !isEmailValide(email)) {
        Swal.fire({
            title: "Envoi impossible",
            text: "Les coordonnées de l'expert sont invalides.",
            icon: 'warning',
            confirmButtonColor: "#dd6B55",
            confirmButtonText: "Compris",
        });
        return false;
    }

    $('#blocExpert input, #blocExpert button').attr('disabled', 'disabled').addClass('disabled');
    let oldBtnText =  $('#blocExpert button').text();
    $('#blocExpert button').html('<i class="fas fa-spinner fa-spin"></i> Envoi en cours...');

    // TODO ajax
    let Datas = getCsrfData({ prenom:prenom, nom:nom, email: email });

    $.ajax({
        url: '/organisateur/sendaccessexpert',
        data: Datas,
        method: "post",
        success: function (retour) {
            retour+= '';
            if (parseInt(retour) > 0) {

                $('#expertId').val(retour);

                Swal.fire({
                    title: "",
                    text:'Identifiants envoyés',
                    icon: "success",
                    confirmButtonText: 'Fermer',
                    confirmButtonColor: "#579569",
                });

            } else {

                Swal.fire({
                    title: "Envoi impossible",
                    text: 'L\'envoi des identifiants a échoué.',
                    icon: "error",
                    confirmButtonColor: "#dd6B55",
                    confirmButtonText: "Fermer"
                });

            }
        },
        error: function (jqXHR, textStatus, errorThrown) {
            let message = 'Une erreur est survenue, l\'adresse e-mail est peut-être déjà utilisée';
            if (jqXHR.responseJSON && jqXHR.responseJSON.error) {
                message = jqXHR.responseJSON.error;
            }

            Swal.fire({
                title: "Envoi impossible",
                text: message,
                icon: 'warning',
                confirmButtonColor: "#dd6B55",
                confirmButtonText: "Compris",
            });
        },complete: function () {
            // On remet l'état de champs actifs
            $('#blocExpert input, #blocExpert button').prop('disabled', false).removeClass('disabled');
            $('#blocExpert button').text(oldBtnText);
        }
    });
}

function getCsrfData(extra = {}) {
    return Object.assign({
        csrf_name: $('#formcsrf').find('input.csrf[name=csrf_name]').val(),
        csrf_value: $('#formcsrf').find('input.csrf[name=csrf_value]').val(),
    }, extra);
}

function updateHasExpert(hasExpert) {

    let actif = hasExpert ? '1' : '0';
    let member_id = parseInt($('#expertId').val());
    if (isNaN(member_id)) { member_id = 0; }

    let Datas = getCsrfData({ member_id:member_id, actif:actif });
    $.ajax({
        url: '/organisateur/switchexpert',
        data: Datas,
        method: "post",
        success: function (retour) {
            retour+='';
            if (retour != 'ok') {
                Swal.fire({
                    title: "Oups !",
                    text: 'Une erreur est survenue lors de la mise à jour [J389]',
                    icon: "error",
                    confirmButtonColor: "#dd6B55",
                    confirmButtonText: "Fermer"
                });
            }
        },
        error: function (jqXHR, textStatus, errorThrown) {
            let message = 'Une erreur est survenue lors de la mise à jour [J393]';
            if (jqXHR.responseJSON && jqXHR.responseJSON.error) {
                message = jqXHR.responseJSON.error;
            }

            Swal.fire({
                title: "Oups !",
                text: message,
                icon: 'error',
                confirmButtonColor: "#dd6B55",
                confirmButtonText: "Fermer",
            });
        }
    });
}