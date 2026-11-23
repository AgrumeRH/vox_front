function main() {
    mainUrnesListener();
}

function mainUrnesListener() {
    $('.btnRenvoyerCodes').off('click.renvoi').on('click.renvoi', function () {
        $('#renvoiCodes').slideDown(300);
        $('#urnesOrganisateur').slideUp(300);
        $('#actionsUrnes').hide();
        $('#actionsRenvoisCodes').show();
        renvoiCodesListener();
    });
}

function renvoiCodesListener() {
    $('.btnRetourUrnes').off('click.renvoi').on('click.renvoi', function () {
        $('#urnesOrganisateur').slideDown(300);
        $('#renvoiCodes').slideUp(300);
        $('#actionsUrnes').show();
        $('#actionsRenvoisCodes').hide();
        mainUrnesListener();
    });

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
                            window.location.replace('/organisateur/urnes');
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

function getCsrfData(extra = {}) {
    return Object.assign({
        csrf_name: $('#formcsrf').find('input.csrf[name=csrf_name]').val(),
        csrf_value: $('#formcsrf').find('input.csrf[name=csrf_value]').val(),
    }, extra);
}