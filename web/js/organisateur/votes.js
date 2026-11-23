function main() {

    $('.btnAnnulerVote').hide();

    $('.btnValiderEtape').off('click.valide').on('click.valide', function () {
        verifChampsValideEtape();
    });

    if ($('#formVotes').is(':visible')) {
        votesListener();
        verifChamps();
    } else {
        collegesListener();
    }
}

function votesListener() {

    $('.btnCollegesVotes, .btnAddVote, .btnValiderEtape').show();
    $('.btnListeVotes').hide();
    $('.btnCollegesVotes').click(function () {
        $('#formVotes, .btnCollegesVotes, .btnValiderEtape, .btnSaveVote').hide();
        $('#formColleges, .btnListeVotes').show();
        collegesListener();
    });

    $('.btnAddVote').off('click.addvote').on('click.addvote', function () {
        $('#formColleges, .btnAddVote, .btnCollegesVotes').hide();
        $('#formVotes').slideUp(300);
        $('#addUpdVote').slideDown(300);
        $('#collegeVote').html('');
        $('#formColleges .selectCollege option:selected').each(function () {
            $('#collegeVote').append('<option value="' + $(this).val() + '">' + $(this).text() + '</option>');
        });
        addupdVoteListener(false);
    });

    $('.btnEditVote').off('click.editvote').on('click.editvote', function () {

        let vote_id = parseInt($(this).parents('tr').data('id'));
        if (isNaN(vote_id) || vote_id === 0) {
            showSwal("Identification du vote impossible.")
            return;
        }
        let Datas = getCsrfData({ vote_id: vote_id });
        $.ajax({
            url: '/organisateur/votes/datas',
            data: Datas,
            dataType: 'json',
            method: "post",
            success: function (donnees) {
                if (donnees.vote_id !== vote_id) {
                    showSwal("Données de votes invalides.")
                    return;
                }

                // Hydratation des valeurs dans les champs
                if (donnees.vote_category === '') { donnees.vote_category = 'titulaires'; }
                $('#titreAddUpdVote').text(donnees.vote_college+' - '+ucfirst(donnees.vote_category)+' - Tour '+donnees.vote_tour);
                $('#voteId').val(donnees.vote_id);
                $('#voteNbsieges').val(donnees.vote_nbsieges);
                if ($('.choixTutuSup').length ) {
                    $('input[name=vote_category][value='+donnees.vote_category+']').prop('checked', true);
                }

                $('input[name=vote_tour][value='+donnees.vote_tour+']').prop('checked', true);
                $('#voteDescription').val(donnees.vote_description);

                $('input[name=vote_college_denomination][value='+donnees.vote_college_denomination+']').prop('checked', true);
                $.each(donnees.vote_college_composition, function(cle, valeur) {
                    $('input[name="vote_college_composition[' + cle + ']"]').prop('checked', true);
                });
                $('#autreCompo').val(donnees.vote_college_composition_autre);
                $('#voteStartDate').val(dateSqlToFr(donnees.vote_start));
                $('#voteEndDate').val(dateSqlToFr(donnees.vote_end));
                $('#voteDepotDate').val(dateSqlToFr(donnees.vote_depot));
                if (donnees.vote_depouillement_force === 1) {
                    $('#dateDepouillementCheckbox').prop('checked', true);
                }
                if (donnees.vote_scellement_force === 1) {
                    $('#dateScellementCheckbox').prop('checked', true);
                }
                $('#voteDepouillementDate').val(dateSqlToFr(donnees.vote_depouillement));
                $('#voteScellementDate').val(dateSqlToFr(donnees.vote_scellement));
                let rappelDate = donnees.vote_rappel_date === '1970-01-01 00:00:00' ? '' : donnees.vote_rappel_date;
                if (rappelDate !== '') {
                    $('#rappelCheckbox').prop('checked', true);
                    $('#rappelDate').val(dateSqlToFr(rappelDate));
                    $('#rappelTexte').val(donnees.vote_rappel_texte);
                }

                // Affichage du tmpl
                $('#formColleges, .btnAddVote, .btnCollegesVotes').hide();
                $('#formVotes').slideUp(300);
                $('#addUpdVote').slideDown(300);
                $('#collegeVote').html('');
                $('#formColleges .selectCollege option:selected').each(function () {
                    $('#collegeVote').append('<option value="' + $(this).val() + '">' + $(this).text() + '</option>');
                    $('#collegeVote option[value='+donnees.vote_namekey+']').prop('selected', true);

                });
                addupdVoteListener(true);

            },
            error: function (jqXHR, textStatus, errorThrown) {
                let message = 'Une erreur est survenue.';
                if (jqXHR.responseJSON && jqXHR.responseJSON.error) {
                    message = jqXHR.responseJSON.error;
                }
                showSwal(message);
                return;
            }
        });

    });

    $('.btnSupprVote').off('click.supprvote').on('click.supprvote', function () {

        let vote_id = parseInt($(this).parents('tr').data('id'));
        if (isNaN(vote_id) || vote_id === 0) {
            showSwal("Identification du vote impossible.");
            return;
        }

        Swal.fire({
            title: "Attention",
            text: "Supprimer définitivement ce vote ?",
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#DD6B55",
            confirmButtonText: "Supprimer",
            cancelButtonText: 'Annuler',
            closeOnConfirm: true
        }).then((result) => {
            if (result.isConfirmed) {
                let Datas = getCsrfData({ vote_id: vote_id });

                $.ajax({
                    url: '/organisateur/votes/supprimer',
                    data: Datas,
                    method: "post",
                    success: function (retour) {
                        retour+= '';
                        if (retour === 'ok') {
                            window.location.replace('/organisateur/votes');
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

function collegesListener() {

    $('.btnCollegesVotes, .btnAddVote, .btnValiderEtape').hide();
    $('.btnListeVotes').toggle($('#formVotes table tbody tr').length > 0);

    $('.btnListeVotes').click(function () {

        let Datas = getCsrfData({ colleges: [] });
        $('.selectCollege').each(function() {
            let value = $(this).val();
            Datas.colleges.push(value);
        });

        $.ajax({
            url: '/organisateur/votes/savecolleges',
            data: Datas,
            method: "post",
            success: function (retour) {
                $('#formColleges').slideUp(300);
                $('#formVotes').slideDown(300);
                votesListener();
                verifChamps();
            }, error: function () {
                showSwal("Impossible d'enregistrer les collèges");
            }
        });

        $('#formVotes, .btnCollegesVotes').show();
        $('#formColleges, .btnListeVotes').hide();
        votesListener();
    });

    const $bloc = $("#blocColleges");
    checkCreerVotesPossible();

    function checkCreerVotesPossible() {
        let toutRempli = true;
        $bloc.find("select").each(function () {
            if ($(this).val() === "") {
                toutRempli = false;
            }
        });
        if (toutRempli) {
            $('#blocCrerVotes').show();
        } else {
            $('#blocCrerVotes').hide();
        }
    }

    $('#btnCreerVotes').click(function () {

        let Datas = getCsrfData({  colleges: [] });
        $('.selectCollege').each(function() {
            let value = $(this).val();
            Datas.colleges.push(value);
        });

        $.ajax({
            url: '/organisateur/votes/savecolleges',
            data: Datas,
            method: "post",
            success: function (retour) {

                $('#collegeVote').html('');
                $('#formColleges .selectCollege option:selected').each(function () {
                    $('#collegeVote').append('<option value="' + $(this).val() + '">' + $(this).text() + '</option>');
                });

                $('#formColleges').slideUp(300);
                $('#addUpdVote').slideDown(300);
                addupdVoteListener(false);
            }, error: function () {
                showSwal("Aucun collège paramétré !");
            }
        });
    });

    function updateButtons() {

        const $lines = $bloc.find(".row");
        const total = $lines.length;

        $lines.each(function (index) {
            const $addBtn = $(this).find(".btnAddCollege");
            const $delBtn = $(this).find(".btnSupprCollege");

            if (index === total - 1) {
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
        checkCreerVotesPossible();
    }

    $bloc.on("change", "select", function () {
        const selectedValues = [];
        let hasDuplicate = false;
        var objdom = $(this).parent().parent();

        if ($(this).val() === 'addAutre') {
            $('#modalAddCollege').modal('show');
            newCollegeListener($(this));
        }

        $bloc.find("select").each(function () {
            const val = $(this).val();
            if (val && selectedValues.includes(val)) {
                hasDuplicate = true;
            }
            selectedValues.push(val);
        });

        if (hasDuplicate) {
            showSwal("Ce collège est déjà sélectionné.", 'warning', "Attention");
            $(this).val(""); // Réinitialise la sélection
        }

        if ($(this).val() !== 'addAutre' && $(this).val() !== '') {
            objdom.find('.codeCsv code').text($(this).val());
            objdom.find('.codeCsv').show();
        } else {
            objdom.find('.codeCsv code').text('');
            objdom.find('.codeCsv').hide();
        }

        updateButtons(); // Pour mettre à jour le bouton "+" au cas où
        checkCreerVotesPossible();
    });

    // Ajouter une ligne
    $bloc.off("click.addCo").on("click.addCo", ".btnAddCollege", function () {
        // Vérifie que toutes les lignes sont remplies
        let toutRempli = true;
        $bloc.find("select").each(function () {
            if ($(this).val() === "") {
                toutRempli = false;
            }
        });

        if (!toutRempli) {
            showSwal("Veuillez sélectionner un collège sur chaque lignes disponible avant d’en ajouter une autre.", 'warning', "Attention");
            return;
        }

        const $lastRow = $bloc.find(".row").last();
        const $newRow = $lastRow.clone(true);
        $newRow.find('.codeCsv').hide();
        $newRow.find('.codeCsv code').text('');

        // Réinitialiser la valeur du <select>
        $newRow.find("select").val("");

        $newRow.insertAfter($lastRow);
        updateButtons();
    });

    // Supprimer une ligne
    $bloc.on("click", ".btnSupprCollege", function () {
        if ($bloc.find(".row").length > 1) {
            let ceCollege = $(this).parent().data("college");
            var trouve = false;
            if (ceCollege !== '') {
                $('#formVotes table tbody tr').each(function() {
                    var college = $(this).data('college');
                    if (college === ceCollege) {
                        trouve = true;
                        return false;
                    }
                });
            }
            if (trouve) {
                showSwal("Impossible de supprimer ce collège :<br>des votes sont associés !", 'error', 'Attention');
            } else {
                $(this).closest(".row").remove();
                updateButtons();
            }
        }
    });

    $('#modalAddCollege').on('hidden.bs.modal', function (e) {
        $('#newCollegeName, #newCollegeCodeCsv').val('');
    })

    // Initialisation
    updateButtons();
    checkCreerVotesPossible();
}

function verifChamps(retour) {

    let res = true;

   if ($('#formVotes table tbody tr').length > 0) {
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
        showSwal("Au moins un vote doit être paramétré", 'warning', "Validation impossible");
        return false;
    }

    // vérifier que la date limite de dépot des candidatures (c'est la plus proche et elle est indispensable) n'est pas dépassée
    let pbDatesDepot = false;
    $('#formVotes table tbody tr .date-ddc').each(function () {
        let dateLim = $(this).text().trim();
        if (!isFutureDate(dateLim)) {
            showSwal("La date d'un des votes (ou de sa limite de dépot des candidatures) est dépassée.", 'warning', "Validation impossible");
            pbDatesDepot = true;
            return false;
        }
    });

    if (pbDatesDepot) { return false; }

    // vérifier que tous les colleges_codes sont corrects (pour chaque vote le vote_namekey doit être dans la table colleges_codes)
    let college_codes = new Set();
    $('#formVotes table tbody tr').each(function () {
        let college_code = $(this).data('college');
        if (college_code !== undefined) {
            college_codes.add(college_code);
        }
    });
    let codesAverifier = Array.from(college_codes).join(',');

    $.ajax({
        url: '/organisateur/votes/checkcollegecodes/' + codesAverifier,
        method: "get",
        success: function (retour) {
            retour+='';
            if (retour !== 'ok') {
                showSwal("Attention, certains collèges ne sont pas disponibles !.", 'danger'); return false;
            }
            saveEtape();

        }, error: function () {
            showSwal("Une erreur est survenue (collèges non identifiés).", 'danger'); return false;
        }
    });
}

function saveEtape() {

    let votes_ids = [];
    $('#formVotes table tbody tr').each(function () {
        let vote_id = $(this).data('id');
        if (vote_id !== undefined && parseInt(vote_id) > 0) {
            votes_ids.push(vote_id);
        }
    });

    let Datas = getCsrfData({ votes_ids: votes_ids });

    $.ajax({
        url: '/organisateur/addupd/votes',
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
                confirmButtonText: "Compris"
            })
        }
    });
}

function newCollegeListener(selectDom) {
    $('#newCollegeName').focus();

    $('#newCollegeCodeCsv').on('input', function () {
        let valeurFiltree = $(this).val().replace(/[^a-z]/g, '');
        $(this).val(valeurFiltree);
    });

    $('#btnAddNewCollegeName').on('click', function () {
        if ($('#newCollegeName').val().length < 3) {
            showSwal("Le nom du collège est trop court", 'warning');
            return false;
        }

        let codeCsv = $('#newCollegeCodeCsv').val();

        if (codeCsv === '') {
            showSwal("Le code CSV est obligatoire.", 'warning');
            return false;
        }

        let Datas = $("#formAddCollege").serializeArray();

        $.ajax({
            url: '/organisateur/votes/savenewcollege',
            data: Datas,
            method: "post",
            success: function (retour) {
                retour+= '';
                if (retour === 'ok') {

                    Swal.fire({
                        title: "",
                        text: "Nouveau collège créé et sélectionné.",
                        icon: "success",
                        confirmButtonColor: "#dd6B55",
                        confirmButtonText: "Continuer",
                    }).then((result) => {
                        $('#modalAddCollege').modal('hide');
                        reloadCollegesCodesSelect(selectDom, codeCsv);
                    });

                } else if (retour === 'both') {
                    showSwal("Ce collège existe déjà.", 'warning'); return false;
                } else if (retour === 'nom') {
                    showSwal("Un collège porte déjà ce nom.", 'warning'); return false;
                } else if (retour === 'code') {
                    showSwal("Ce code CSV est déjà associé à un autre collège.", 'warning'); return false;
                } else {
                    showSwal("Une erreur est survenue.", 'danger'); return false;
                }
            }, error: function (jqXHR, textStatus, errorThrown) {
                showSwal("Une erreur est survenue (nom ou code CSV absents).", 'danger'); return false;
            }
        });
    });

}
function reloadCollegesCodesSelect(selectDom, codeCree) {
    $.ajax({
        url: '/organisateur/votes/collegescodes',
        method: "get",
        dataType: 'json',
        success: function (retour) {
            // Vérifie que retour est un tableau non vide avec les bonnes clés
            if (Array.isArray(retour) && retour.length > 0) {
                const isValid = retour.every(item =>
                    typeof item === 'object' &&
                    'name' in item &&
                    'code' in item
                );

                if (!isValid) {
                    selectDom.val('');
                    showSwal("Format d'objet invalide dans le tableau JSON.", 'error');
                    return;
                }

                // Parcours tous les <select> à mettre à jour
                $('.selectCollege').each(function () {
                    const $select = $(this);

                    const optionSelect = $select.find('option[value=""]').first();
                    const optionAutre  = $select.find('option[value="addAutre"]').first();

                    // Conserve la valeur sélectionnée actuelle (si encore valide ensuite)
                    const currentValue = $select.val();

                    // Supprime toutes les options sauf "– Sélectionner –" et "Autre..."
                    $select.find('option').not(optionSelect).not(optionAutre).remove();

                    // Ajoute les nouvelles options
                    retour.forEach(item => {
                        const option = $('<option>', {
                            value: item.code,
                            text: item.name
                        });

                        // Si la valeur était sélectionnée précédemment, on la remets
                        if (item.code === currentValue) {
                            option.prop('selected', true);
                        }

                        optionAutre.before(option);
                    });
                });
                selectDom.val(codeCree);
                selectDom.parent().parent().find('.codeCsv code').text(codeCree);
                selectDom.parent().parent().find('.codeCsv').show();

            } else {
                selectDom.val('');
                showSwal("Aucune donnée reçue ou format incorrect.", 'error');
            }
        },
        error: function (xhr, status, error) {
            selectDom.val('');
            showSwal("Erreur AJAX", 'error');
        }
    });

}

function addupdVoteListener(update) {

    if (update === undefined) { update = false; }

   /* if (update) {
        $('.btnEnvoyerRappel').show();
    } else {
        $('.btnEnvoyerRappel').hide();
    }*/

    /*$('#rappelTexte').on('change', function () {
        if ($(this).val() === '') {
            $('.btnEnvoyerRappel').hide();
        } else {
            $('.btnEnvoyerRappel').show();
        }
    });*/

    $('.btnValiderEtape').hide();
    $('.btnSaveVote, .btnAnnulerVote').show();

    $('#btnShowColleges').click(function () {
        $('.btnSaveVote').hide();
        $('#addUpdVote').slideUp(300);
        $('#formColleges').slideDown(300);
    })

    $('#checkAutreCompo').on('click', function () {
        checkNomAutreComposition();
    })

    $('#dateDepouillementCheckbox').on('click', function () {
        checkDefinirDepouillement();
    })

    $('#dateScellementCheckbox').on('click', function () {
        checkDefinirScellement();
    })

    $('#rappelCheckbox').on('click', function () {
        checkRappel();
    })

    $('.btnSaveVote').on('click', function () {
        checkSaveVote();
    });

   /* $('.btnEnvoyerRappel').off('click.rappel').on('click.rappel', function () {
        envoiMailRappel();
    });*/

    checkNomAutreComposition(update);
    checkDefinirDepouillement();
    checkDefinirScellement();
    checkRappel();
}
function checkNomAutreComposition(update) {
    if ($('#checkAutreCompo').is(':checked')) {
        if (update) {
            $('#autreCompo').show();
        } else {
            $('#autreCompo').val('').show().focus();
        }
    } else {
        $('#autreCompo').hide();
    }
}

function checkDefinirDepouillement() {
    if ($('#dateDepouillementCheckbox').is(':checked')) {
        $('#dateDepouillement').show();
    } else {
        $('#dateDepouillement').hide();
        $('#voteDepouillementDate').val('');
    }
}

function checkDefinirScellement() {
    if ($('#dateScellementCheckbox').is(':checked')) {
        $('#dateScellement').show();
    } else {
        $('#dateScellement').hide();
        $('#voteScellementDate').val('');
    }
}

function checkRappel() {
    if ($('#rappelCheckbox').is(':checked')) {
        $('#rappel').show();
    } else {
        $('#rappel').hide();
        $('#rappelDate').val('');
    }
}

function checkSaveVote() {

    if ( $('.co:visible').filter(function() { return $(this).val().trim() === ''; }).length !== 0 ||
        ($('.choixTutuSup:visible').length && !$('input[name="vote_category"]:checked').length) ||
        !$('input[name="vote_tour"]:checked').length ||
        !$('input[name="vote_college_denomination"]:checked').length ||
        !$('input[name^="vote_college_composition"]:checked').length
    ){

        Swal.fire({
            title: "Enregistrement impossible",
            text: "Veuillez compléter tous les champs obligatoires.",
            icon: "warning",
            confirmButtonColor: "#dd6B55",
            confirmButtonText: "Compris",
        }).then((result) => {
            $('.co').each(function() {
                if ($(this).val().trim() === '') {
                    $(this).addClass('erreurouge');
                }
            });
            $('.groupe-champs-light').each(function() {
                if (!$('input[name="vote_category"]:checked').length) {
                    $('.choixTutuSup').addClass('erreurouge');
                }
                if (!$('input[name="vote_tour"]:checked').length) {
                    $('.choixTour').addClass('erreurouge');
                }
                if (!$('input[name="vote_college_denomination"]:checked').length) {
                    $('.choixDeno').addClass('erreurouge');
                }
                if (!$('input[name^="vote_college_composition"]:checked').length) {
                    $('.choixCompo').addClass('erreurouge');
                }
            });
            setTimeout(function() {
                $('.erreurouge').removeClass('erreurouge');
            }, 3000);
        });
        return false;
    }

    saveVote();
}

function saveVoteAjax(Datas) {
    $.ajax({
        url: '/organisateur/save/vote',
        data: Datas,
        method: "post",
        success: function (retour) {
            retour+= '';
            if (retour === 'ok') {

                Swal.fire({
                    title: "",
                    text:'Vote enregistré',
                    icon: "success",
                    showCancelButton: false,
                    confirmButtonText: 'Continuer',
                }).then((result) => {
                    if (result.isConfirmed) {
                        window.location.replace('/organisateur/votes');
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

function saveVote() {

    // ajax save puis retour à la page (redirection comme bouton "retour") en success

    let Datas = $("#addUpdVote").serializeArray();
    if (parseInt($('#isElecPartielle').val()) === 0 && parseInt($('#voteId').val()) > 0) {

        let titusup = $('.choixTutuSup input[name=vote_category]').val();
        let titusuptxt = titusup === 'titulaires' ? 'suppléants' : 'titulaires';

        Swal.fire({
            title: 'Enregistrement',
            text: "Appliquer les modifications également au vote " + titusuptxt + " ?",
            icon: "warning",
            showCancelButton: true,
            confirmButtonText: 'Oui',
            cancelButtonText: 'Non'
        }).then((result) => {
            if (result.isConfirmed) {
                Datas.push({name: 'savedouble', value: 1});
            }
            setTimeout(() => {
                saveVoteAjax(Datas);
            }, "800");
        });

    } else {
        saveVoteAjax(Datas);
    }

}

function dateSqlToFr(date_sql) {
    const date = new Date(date_sql.replace(' ', 'T'));

    return ('0' + date.getDate()).slice(-2) + '/' +
        ('0' + (date.getMonth() + 1)).slice(-2) + '/' +
        date.getFullYear() + ' ' +
        ('0' + date.getHours()).slice(-2) + ':' +
        ('0' + date.getMinutes()).slice(-2);
}

function ucfirst(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

function getCsrfData(extra = {}) {
    return Object.assign({
        csrf_name: $('#formColleges').find('input.csrf[name=csrf_name]').val(),
        csrf_value: $('#formColleges').find('input.csrf[name=csrf_value]').val(),
    }, extra);
}


function showSwal(texte, icon = 'error', titre = 'Oups', ) {

    let confirmBtnTexte = icon === 'error' ? 'Fermer' : 'Compris';

    Swal.fire({
        title: titre,
        html:texte,
        icon: icon,
        confirmButtonColor: "#dd6B55",
        confirmButtonText: confirmBtnTexte
    })
}

function envoiMailRappel() {
    if ($('#rappelTexte').val().trim() === '') {
        showSwal("Veuillez saisir un texte pour le rappel.", 'error', "Attention");
        return false;
    }

    let message = "Envoyer un mail de rappel aux électeur maintenant ?";

    if ($('#rappelDate').val().trim() !== '') {
        message+= "<br><br>Ceci ne se substitue pas à l'envoi programmé à la date renseignée."
    }

    let vote_id = parseInt($('#voteId').val());
    if (isNaN(vote_id) || vote_id <= 0) {
        showSwal("Identification du vote impossible [J853]", 'error', "Oup");
        return false;
    }

    Swal.fire({
        title: "E-mail de rappel",
        html: message,
        icon: "question",
        showCancelButton: true,
        confirmButtonColor: "#417750",
        confirmButtonText: "Envoyer",
        cancelButtonText: 'Annuler',
        closeOnConfirm: true
    }).then((result) => {
        if (result.isConfirmed) {

           /* let oldBtnHtml =  $('.btnEnvoyerRappel').html();
            $('.btnEnvoyerRappel').html('<i class="fas fa-spinner fa-spin"></i> Envoi en cours...');*/
            $('#rappelTexte, #rappelCheckbox').attr('disabled', true).addClass('disabled');

            let Datas = getCsrfData({ vote_id: vote_id });

            $.ajax({
                url: '/organisateur/votes/envoirappel',
                data: Datas,
                method: "post",
                success: function (retour) {
                    retour+= '';
                    let nbEnvoyes = parseInt(retour);
                    if (isNaN(nbEnvoyes) || nbEnvoyes <= 0) {
                        showSwal("Aucun e-mail de rappel n'a été envoyé.");
                    } else if (nbEnvoyes === 1) {
                        showSwal("Un e-mail de rappel a été envoyés.", 'success', "Envoyé"); return false;
                    } else if (nbEnvoyes > 1) {
                        showSwal(nbEnvoyes+" e-mails de rappel ont été envoyés.", 'success', "Envoyés"); return false;
                    } else {
                        showSwal("Une erreur est survenue [J889]");
                    }
                },
                error: function (jqXHR, textStatus, errorThrown) {
                    let message = 'Une erreur est survenue.';
                    if (jqXHR.responseJSON && jqXHR.responseJSON.error) {
                        message = jqXHR.responseJSON.error;
                    }
                    showSwal(message, 'warning')
                }, complete: function () {
                   /* $('.btnEnvoyerRappel').html(oldBtnHtml);*/
                    $('#rappelTexte, #rappelCheckbox').attr('disabled', false).removeClass('disabled');
                }
            });
        }
    });
}