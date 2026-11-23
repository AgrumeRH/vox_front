function main() {
    $('input[name="election_connexion"]').on('change', function(){
        $('#blocSecondeEtape').show("slide", { direction: "left" }, 300);
    });

    $('input[name="election_confirmauth"]').on('change', function(){
        verifChamps();
        if ($(this).val() === 'info') {
            $('#cardDonneePersonnelle').slideDown(300);
            if ($('input[name="election_infotype"]:checked').val() === 'other') {

                $('#blocAutreDonnee').show("slide", { direction: "left" }, 300);
            }
        } else {
            $('#cardDonneePersonnelle').slideUp(300);
            $('#blocAutreDonnee').hide("slide", { direction: "left" }, 300);
        }
    });
    $('input[name="election_infotype"]').on('change', function(){
        verifChamps();
        if ($(this).val() === 'other') {
            $('#blocAutreDonnee').show("slide", { direction: "left" }, 300);
        } else {
            $('#blocAutreDonnee').hide("slide", { direction: "left" }, 300);
        }
    });
    $('input[name="wording"], input[name="election_other_data_length"]').on('change blur keyup', function(){
        verifChamps();
    });

    $('.btnValiderEtape').off('click.valide').on('click.valide', function () {
        verifChampsValideEtape();
    });

    verifChamps();
}

function verifChamps(retour) {

    if ($('input[name="election_connexion"]:checked').val() === undefined
     || $('input[name="election_confirmauth"]:checked').val() === undefined) {
        if (retour) { return false; }
        if (!$('.btnValiderEtape').hasClass('disabled')) {
            $('.btnValiderEtape').addClass('disabled');
        }
    } else if ($('input[name="election_confirmauth"]:checked').val() === 'info'
        && $('input[name="election_infotype"]:checked').val() === undefined) {
        if (retour) { return false; }
        if (!$('.btnValiderEtape').hasClass('disabled')) {
            $('.btnValiderEtape').addClass('disabled');
        }
    } else if ($('input[name="election_infotype"]:checked').val() === 'other'
        && ($('input[name="wording"]').val() === ''
            || parseInt($('input[name="election_other_data_length"]').val()) < 1)) {
        if (retour) { return false; }
        if (!$('.btnValiderEtape').hasClass('disabled')) {
            $('.btnValiderEtape').addClass('disabled');
        }
    } else {
        if (retour) { return true; }
        $('.btnValiderEtape.disabled').removeClass('disabled');
    }

}

function verifChampsValideEtape() {

    if (verifChamps(true) === false) {

        Swal.fire({
            title: "Validation impossible",
            text: "Veuillez compléter tous les champs obligatoires.",
            icon: "warning",
            confirmButtonColor: "#dd6B55",
            confirmButtonText: "Compris"
        })
        return false;
    }

    // OK !
    saveEtape();
}

function saveEtape() {

    let Datas = $("#formEtape").serializeArray();

    $.ajax({
        url: '/organisateur/addupd/identification',
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
                    confirmButtonColor: "#579569",
                    confirmButtonText: 'Étape suivante',
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
                confirmButtonText: "Compris"
            })
        }
    });
}

