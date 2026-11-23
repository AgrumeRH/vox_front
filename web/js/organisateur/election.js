function main() {
    $('#scrutinJustice').on('change', function () {
        if ($(this).is(':checked')) {
            $('#dateScrutinAnnule').show();
            $('#dateScrutinAnnule input').addClass('champbleu');
            setTimeout(function() {
                $('.champbleu').removeClass('champbleu');
            }, 2000);
        } else {
            $('#dateScrutinAnnule input').val('');
            $('#dateScrutinAnnule').hide();
        }
    });

    $('input[name="election_partielle"]').on('change', function () {
        $('.champbleu').removeClass('champbleu');
        if (parseInt($(this).val()) === 0) {
            $('#dateScrutinPrecedent, #siretDeclare').hide();
            $("#dureeMandatMoisAns").text('ans');
        } else {
            $('#dateScrutinPrecedent, #siretDeclare').show();
            $("#dureeMandatMoisAns").text('mois');

            if ($('input[name=election_dateprevious]').val() === '') {
                $('input[name=election_dateprevious]').addClass('champbleu');
                setTimeout(function() {
                    $('.champbleu').removeClass('champbleu');
                }, 2000);
            }
            if ($('input[name=election_siretprevious]').val() === '') {
                $('input[name=election_siretprevious]').addClass('champbleu');
                setTimeout(function() {
                    $('.champbleu').removeClass('champbleu');
                }, 2000);
            }
        }

        if (parseInt($(this).val()) === 1) {
            $('#infoElectionPartielle').show();
        } else {
            $('#infoElectionPartielle').hide();
        }
    });

   /* $('input[name=logo_client]').on('change', function () {
        if ($(this).is(':checked')) {
            $('#logoUpload').css('display', 'flex');
        } else {
            $('#logoUpload').hide();
        }
    });*/

    $('input[name=fond_client]').on('change', function () {
       if ($(this).is(':checked')) {
           $('#bgUpload').css('display', 'flex');
       } else {
           $('#bgUpload').hide();
       }
    });

    $('#checkboxCerfas').on('change', function () {
        if ($(this).is(':checked')) {
            $('#infoCerfas').show();
        } else {
            $('#infoCerfas').hide();
        }
    });

    $('.btnSupprimerLogo, .btnSupprimerBackground').click(function () {

        let url = $(this).data('url');
        let segments = url.split('/').filter(segment => segment !== "");
        let type = segments[segments.length - 2];
        let divSupprName = type.charAt(0).toUpperCase() + type.slice(1);
        let typeVerboseError = type === 'logo' ? 'du logo' : 'de l\'image de fond';

        $.ajax({
            url: url,
            method: "get",
            success: function (retour) {
                retour+= '';
                if (retour === 'ok') {

                    $('input[name="election_' + type + '"]').val('');

                    let typeVerboseSuccess = type === 'logo' ? 'Le logo a été supprimé' : 'L\'image de fond a été supprimée';
                    let htmlSuccess = '<div class="supprimageOk">'+typeVerboseSuccess+' avec succès.</div>';
                    let successMsgDom  = $('#apercu'+divSupprName);

                    successMsgDom.html(htmlSuccess);
                    setTimeout(function() {
                        successMsgDom.fadeOut('slow', function () {
                            successMsgDom.remove();
                        });
                    }, 2000);
                } else {

                    Swal.fire({
                        title: "Erreur",
                        text: 'La suppression '+typeVerboseError+' a échouée.',
                        icon: "error",
                        confirmButtonColor: "#dd6B55",
                        confirmButtonText: "Compris"
                    });

                }
            },
            error: function (jqXHR, textStatus, errorThrown) {

                Swal.fire({
                    title: "Erreur",
                    text: 'La suppression '+typeVerboseError+' a échouée.',
                    icon: "error",
                    confirmButtonColor: "#dd6B55",
                    confirmButtonText: "Fermer"
                });

            }
        });

    });

    $('input.co, textarea').on('change, blur', function () {
        verifChamps();
    });

    $('.btnValiderEtape').off('click.valide').on('click.valide', function () {
        verifChampsValideEtape();
    });

    verifChamps();
}

function verifChamps(retour) {

    let res = true;

    if ($('input.co:visible').filter(function() { return $(this).val().trim() === ''; }).length === 0) {
        $('.btnValiderEtape.disabled').removeClass('disabled');
    } else {
        res = false;
        if (!$('.btnValiderEtape').hasClass('disabled')) {
            $('.btnValiderEtape').addClass('disabled');
        }
    }

    if ($('textarea[name=election_description]').val().length > 0) {
        $('.btnValiderEtape.disabled').removeClass('disabled');
    } else {
        res = false;
        if (!$('.btnValiderEtape').hasClass('disabled')) {
            $('.btnValiderEtape').addClass('disabled');
        }
    }

    return res;

}

function verifChampsValideEtape() {

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

    // OK !
    saveEtape();
}

function saveEtape() {

    let Datas = $("#formEtape").serializeArray();

    $.ajax({
        url: '/organisateur/addupd/election',
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
                icon: "warning",
                confirmButtonColor: "#dd6B55",
                confirmButtonText: "Compris"
            })

        }
    });
}