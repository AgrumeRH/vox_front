function main() {

    verifBtnValideEtape();

    $('.btnDefinirCleDep').off('click.voteselect').on('click.voteselect', function () {

        let votes_ids = $(this).parents('tr').data('id');
        if (votes_ids === '' || votes_ids === undefined) {
            showSwal("Identification du vote impossible [J008].");
            return;
        }
        showScellementVotes(votes_ids);
    });
    $('.btnSuiviMdpVote').off('click.suivimdp').on('click.suivimdp', function () {

        let votes_ids = $(this).parents('tr').data('id');
        if (votes_ids === '' || votes_ids === undefined) {
            showSwal("Identification du vote impossible [J016].");
            return;
        }
        $('#votesListes').hide();
        $('#suiviMdpMembres').show();
        $('.btnValiderEtape').hide();
        $('.btnRetourVotes, .btnDefCleVotes').show();
        suiviMdpMembres(votes_ids);
    });
    $('.btnScellerUrne').off('click.sceller').on('click.sceller', function () {
        let votes_ids = $(this).parents('tr').data('id');
        if (votes_ids === '' || votes_ids === undefined) {
            showSwal("Identification du vote impossible [J030].");
            return;
        }
        scellerVotes(votes_ids);
    });



    $('.btnDefCleVotes').off('click.scv').on('click.scv', function () {
        defCleVotes();
    });

    $('.btnValiderEtape').off('click.valide').on('click.valide', function () {
        saveEtape();
    });

}

function showScellementVotes(votes_ids) {

    let Datas = getCsrfData({ votes_ids: votes_ids });

    $.ajax({
        url: '/organisateur/scellement/dashboard',
        data: Datas,
        method: "post",
        success: function (retour) {
            retour+= '';
            // Bascule immédiate, sans animation : pendant un slideUp/slideDown,
            // la liste des votes recouvre encore le choix du mode de génération
            // de la clé, et un clic sur « Choix à distance » est perdu.
            $('#votesListes').hide();
            $('#scellementVote').html(retour).show();
            $('.btnValiderEtape').hide();
            $('.btnRetourVotes, .btnCeremonieSeance').show();
            scellementDashboardListenner(votes_ids);

        },
        error: function (jqXHR, textStatus, errorThrown) {
            let message = 'Une erreur est survenue.';
            if (jqXHR.responseJSON && jqXHR.responseJSON.error) {
                message = jqXHR.responseJSON.error;
            }
            Swal.fire({
                title: "Oups !",
                text: message,
                icon: "error",
                confirmButtonColor: "#dd6B55",
                confirmButtonText: "Fermer",
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

function scellementDashboardListenner(votes_ids) {

    $('#infoBleueEtapeListes').text("Cérémonie de scellement des votes");

    $('[data-toggle="popover"]').popover({
        html:true
    });

    $('.btnRetourVotes').off('click.retour').on('click.retour', function () {
        window.location.replace('/organisateur/scellement');
    });

    // Mode de génération : cérémonie en séance (par défaut) ou choix à distance
    $('input[name=modeCle]').off('change.mode').on('change.mode', function () {
        let distance = $('input[name=modeCle]:checked').val() === 'distance';
        $('#ceremonieSeance').toggle(!distance);
        $('.btnCeremonieSeance').toggle(!distance);
        $('.btnInviterMembres').toggle(distance);
        $('#infoBleueEtapeListes').text(distance
            ? "Choix à distance : les membres du bureau vont recevoir un lien pour choisir leur mot de passe."
            : "Cérémonie de scellement : chaque membre présent saisit son mot de passe sur ce poste.");
    });

    $('.btnCeremonieSeance').off('click.seance').on('click.seance', function () {
        ceremonieSeance(votes_ids);
    });

    $('.btnInviterMembres').off('click.invit').on('click.invit', function () {
        Swal.fire({
            title: "Confirmation",
            text: "Inviter les membres du bureau à définir leur mot de passe ?",
            icon: "question",
            showCancelButton: true,
            confirmButtonColor: "#417750",
            confirmButtonText: "Envoyer",
            cancelButtonText: 'Annuler',
            closeOnConfirm: true
        }).then((result) => {
            if (result.isConfirmed) {
                let force = parseInt($('#forceMdpMembers').val());
                let Datas = getCsrfData({ votes_ids: votes_ids, force: force });

                $.ajax({
                    url: '/organisateur/scellement/definirmdp',
                    data: Datas,
                    method: "post",
                    success: function (retour) {
                        retour+= '';
                        if (retour === 'ok') {
                            $('#scellementVote').hide();
                            $('#suiviMdpMembres').show();
                            $('.btnInviterMembres, .btnCeremonieSeance').hide();
                            suiviMdpMembres(votes_ids);
                        } else {
                            showSwal("Une erreur est survenue.", 'warning')
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

// Session de l'organisateur fermée pendant le suivi (le plus souvent : un
// membre du bureau s'est connecté dans ce même navigateur, ce qui remplace la
// session) : on arrête le suivi et on le dit, au lieu d'afficher la page de
// connexion dans le tableau ou d'alerter toutes les 5 secondes.
function sessionSuiviPerdue() {
    $('#ajaxOuvert').val('0');
    clearInterval(window.suiviMdpTimer);
    $('.btnDefCleVotes').addClass('disabled').prop('disabled', true);
    $('#suiviMdpMembres').html('<div class="alert alert-warning">Votre session d\'organisateur a été fermée, '
        + 'probablement parce qu\'un membre du bureau s\'est connecté dans ce même navigateur : un navigateur ne garde '
        + 'qu\'une connexion à la fois. Les mots de passe déjà définis sont conservés. Reconnectez-vous comme organisateur '
        + 'pour reprendre le suivi ; chaque membre doit utiliser son propre appareil, un autre navigateur ou une fenêtre de navigation privée.'
        + ' <a href="/organisateur/login">Se reconnecter</a></div>');
}

function suiviMdpMembres(votes_ids) {
    getDashboardMdps(votes_ids);
    clearInterval(window.suiviMdpTimer);
    window.suiviMdpTimer = setInterval(function() {
        if ($('#ajaxOuvert').val() === '1') {
            getDashboardMdps(votes_ids);
        }
    }, 5000);

    $('.btnRetourVotes').off('click.retour').on('click.retour', function () {
        window.location.replace('/organisateur/scellement');
    });

}

function getDashboardMdps(votes_ids) {
    let Datas = getCsrfData({ votes_ids: votes_ids});

    $.ajax({
        url: '/organisateur/scellement/dashboardmdps',
        data: Datas,
        method: "post",
        success: function (retour) {
            retour+= '';
            // Réponse attendue : le tableau de suivi. Sinon (redirection vers
            // la connexion suivie par le navigateur), la session est perdue.
            if (!new DOMParser().parseFromString(retour, 'text/html').querySelector('table[data-vids]')) {
                sessionSuiviPerdue();
                return;
            }
            $('#suiviMdpMembres').html(retour);
            checkOkScellement();
        },
        error: function (jqXHR, textStatus, errorThrown) {
            // 400 : jeton CSRF refusé, la session a été remplacée.
            if (jqXHR.status === 400 && !jqXHR.responseJSON) {
                sessionSuiviPerdue();
                return;
            }
            let message = 'Une erreur est survenue.';
            if (jqXHR.responseJSON && jqXHR.responseJSON.error) {
                message = jqXHR.responseJSON.error;
            }
            showSwal(message, 'warning')
        }
    });
}

function checkOkScellement() {
    let nb = 0;
    $('#suiviMdpMembres table tbody tr').each(function () {
       if ($(this).find('td.ismdpset').data('set') === 1) {
           nb++;
       }
    });
    let total = $('#suiviMdpMembres table tbody tr').length;
    if (total > 0 && nb === total) {
        $('#ajaxOuvert').val('0');
        $('.btnDefCleVotes').removeClass('disabled').prop('disabled', false);
    }
}

function defCleVotes() {

    let votes_ids = $('#suiviMdpMembres table').data('vids');
    if (votes_ids === '' || votes_ids === undefined) {
        showSwal("Identification des vote impossible [J197].");
        return false;
    }

    Swal.fire({
        title: "Confirmez",
        text: "Définir la clé de dépouillement de ces votes ?",
        icon: "question",
        showCancelButton: true,
        confirmButtonColor: "#417750",
        confirmButtonText: "Poursuivre",
        cancelButtonText: 'Annuler',
        width: '600px',
        closeOnConfirm: true
    }).then((result) => {
        if (result.isConfirmed) {

            $('#overlay .text').text("La définition de la clé de dépouillement des votes est en cours, merci de patienter...");
            showOverlay();

            $.ajax({
                url: '/organisateur/scellement/clesmembres',
                data: getCsrfData({ votes_ids: votes_ids }),
                method: "post",
                dataType: "json",
                success: function (clesMembres) {
                    let votes = Object.keys(clesMembres).map(function (voteId) {
                        return {
                            vote_id: voteId,
                            membres: Object.keys(clesMembres[voteId]).map(function (id) { return { id: id, cle: clesMembres[voteId][id] }; })
                        };
                    });
                    genererEtEnvoyerCle(votes_ids, votes, 'distance');
                },
                error: erreurCreationCle
            });
        }
    });
}

/*
 * CNIL E2 : la clé de dépouillement est générée dans ce navigateur (cledep.js).
 * Seules la clé publique et les parts chiffrées sont envoyées au serveur ; les
 * mots de passe ne quittent jamais ce poste.
 */
function ceremonieSeance(votes_ids) {

    let force = parseInt($('#forceMdpMembers').val());
    let mdps = {};
    let probleme = '';
    $('#ceremonieSeance tbody tr').each(function () {
        if (probleme) { return; }
        let ligne = $(this);
        let nom = ligne.find('td:first').text();
        if (ligne.find('.absentSeance').is(':checked')) { return; }
        let mdp = ligne.find('.mdpSeance1').val();
        if (mdp !== ligne.find('.mdpSeance2').val()) {
            probleme = nom + " : les deux mots de passe ne sont pas identiques.";
            return;
        }
        let erreur = CleDep.controlerMdp(mdp, force);
        if (erreur) {
            probleme = nom + " : " + erreur;
            return;
        }
        mdps[ligne.data('member-id')] = mdp;
    });
    if (probleme) {
        showSwal(probleme, 'warning');
        return;
    }

    let membresParVote = JSON.parse($('#cledepMembresParVote').text());
    let votes = [];
    for (let voteId of Object.keys(membresParVote)) {
        let membres = membresParVote[voteId].filter(id => mdps[id]).map(id => ({ id: id, mdp: mdps[id] }));
        if (membres.length < 3) {
            showSwal("Au moins 3 membres du bureau de chaque vote doivent être présents et saisir un mot de passe.", 'warning');
            return;
        }
        votes.push({ vote_id: voteId, membres: membres });
    }

    Swal.fire({
        title: "Confirmez",
        text: "Générer la clé de dépouillement avec les mots de passe saisis ? Il sera nécessaire qu'au moins 2 membres du bureau avec leur mot de passe soient présents pour permettre le dépouillement.",
        icon: "question",
        showCancelButton: true,
        confirmButtonColor: "#417750",
        confirmButtonText: "Générer",
        cancelButtonText: 'Annuler',
        width: '600px'
    }).then((result) => {
        if (result.isConfirmed) {
            $('#overlay .text').text("Génération de la clé de dépouillement sur ce poste, merci de patienter...");
            showOverlay();
            genererEtEnvoyerCle(votes_ids, votes, 'seance');
        }
    });
}

function genererEtEnvoyerCle(votes_ids, votes, mode) {
    if (!window.CleDep || !window.crypto || !window.crypto.subtle) {
        hideOverlay();
        showSwal("Ce navigateur ne permet pas de générer la clé de dépouillement. Utilisez un navigateur récent (Firefox, Chrome, Edge, Safari).");
        return;
    }
    // Un seul couple de clés pour les votes scellés ensemble
    CleDep.ceremonie(votes, { progression: function (texte) { $('#overlay .text').text(texte); } })
        .then(function (r) {
            $('#ceremonieSeance input[type=password]').val('');
            let cles = {};
            Object.keys(r.parts).forEach(function (voteId) {
                cles[voteId] = { publicPem: r.publicPem, parts: r.parts[voteId] };
            });
            $('#overlay .text').text("Enregistrement de la clé publique et des parts chiffrées...");
            $.ajax({
                url: '/organisateur/scellement/defcledep',
                data: getCsrfData({ votes_ids: votes_ids, mode: mode, cles: JSON.stringify(cles) }),
                method: "post",
                success: function (retour) {
                    retour+= '';
                    if (retour === 'ok') {
                        window.location.replace('/organisateur/scellement');
                    } else {
                        hideOverlay();
                        showSwal("La création de la clé de dépouillement a échouée ! [J230]");
                    }
                },
                error: erreurCreationCle
            });
        })
        .catch(function (e) {
            hideOverlay();
            showSwal(e && e.message ? e.message : String(e), 'error', "La création de la clé de dépouillement a échouée !");
        });
}

function erreurCreationCle(jqXHR) {
    let message = 'Une erreur est survenue.';
    let taille = 0;
    if (jqXHR.responseJSON && jqXHR.responseJSON.error) {
        message = jqXHR.responseJSON.error;
    }
    if (jqXHR.responseJSON && jqXHR.responseJSON.taille) {
        taille = jqXHR.responseJSON.taille;
    }
    hideOverlay();
    showSwal(message, 'error', "La création de la clé de dépouillement a échouée !", taille);
}

function scellerVotes(votes_ids) {
    Swal.fire({
        title: "Scellement des urnes",
        html: "Après le scellement, vous ne pourrez plus modifier la configuration de l'élection.<br>Toute modification du système sera détectée, entraînant la potentielle annulation du vote.",
        icon: "question",
        showCancelButton: true,
        confirmButtonColor: "#417750",
        confirmButtonText: "Confirmer",
        cancelButtonText: 'Annuler',
        width: '800px',
        closeOnConfirm: true
    }).then((result) => {
        if (result.isConfirmed) {

            $('#overlay .text').text("Le scellement des urnes est en cours, merci de patienter...");
            showOverlay();

            let Datas = getCsrfData({ votes_ids: votes_ids });

            $.ajax({
                url: '/organisateur/scellement/scellerurne',
                data: Datas,
                method: "post",
                success: function (retour) {
                    retour+= '';
                    if (retour === 'ok') {
                        window.location.replace('/organisateur/scellement');
                    } else {
                        hideOverlay();
                        showSwal("Le scellement de l'urne a échouée ! [J297]");
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
                    showSwal(message, 'error', "Le scellement a échouée !",taille)
                }
            });
        }
    });
}

function verifBtnValideEtape() {

    let ok = 0;
    $('#tableVotesEnvoyer tbody tr td.sceletat').each(function () {
        if (parseInt($(this).data('etat')) === 1) {
            ok++;
        }
    })

    if (ok === 0 && !$('.btnValiderEtape').hasClass('disabled')) {
        $('.btnValiderEtape').addClass('disabled').attr('disabled', 'disabled');
    } else if (ok > 0 && $('.btnValiderEtape').hasClass('disabled')) {
        $('.btnValiderEtape').removeClass('disabled').prop('disabled', false);
    }
}

function saveEtape() {

    let Datas = getCsrfData();
    $.ajax({
        url: '/organisateur/valide/scellement',
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