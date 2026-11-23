$(document).ready(function () {
    app.init();  
});

window.addEventListener("beforeunload", function (e) {
    if (e.target.activeElement.className.indexOf("noloader") === -1 && navigator.userAgent.indexOf("Safari") !== -1) {
        $('body').addClass('unload');
        $('.ring').show();
    }
});    

var app = {
    init: function () {
        if ($('body').hasClass('electeur') || $('body').hasClass('manager') || $('body').hasClass('observer')) {
            let dt = new Date($.now());
            $.ajax({
                url: "/checktime",
                data: {
                    "clientHeure": dt.getHours(),
                    "clientJour": dt.getDate()
                },
                method: "get",
                success: function(retour) {
                    retour+='';
                    if (parseInt(retour) == 1) {
                        $('.anti-countdown').removeClass('d-none').show();
                        $('.countdown').hide();
                    }
                }
            });
        }

        $('.footervox').click(function () {
           $(this).hide();
        });
        $('.footervox a').on('click', function (e) {
            e.stopPropagation(); // empêche le click de remonter au parent
        });

        $('.sortable').sortable();
        $('.sortable').disableSelection();

        $('.copyArea').click(function () {
            var clone = $($(this).data('areatocopy')).clone();
            $($(this).data('areatopaste')).append(clone);
            // Gestionnaires de la seule ligne ajoutée (.clone() ne copie pas
            // les gestionnaires ; les relier sur toute la page les doublerait
            // sur les lignes existantes). La confirmation de la corbeille
            // (data-confirm) est déléguée au document.
            $('.dropzone', clone).click(function () {
                $('input[type="file"]', $(this).parent()).trigger('click');
            });
            $('.fileupload', clone).each(function (index, elem) {
                app.initUpload(elem);
            });
        });

        let formatDateTime = $('body').hasClass('organisateur') ? 'DD/MM/YYYY HH:mm' : 'YYYY-MM-DD HH:mm';

        $('.datetime').each(function () {
            $(this).datetimepicker({
                locale: 'fr',
                format: formatDateTime,
                icons: {
                    time: "fa-regular fa-clock",
                    date: "fa-regular fa-calendar"
                }
            });
        });

        $('.dropzone').click(function () {
            $('input[type="file"]', $(this).parent()).trigger('click');
        });

        $('.fileupload').each(function (index, elem) {
            app.initUpload(elem);
        });

        $('#memberKeys .start').click(function () {
            var area = $(this).closest('.oneStep');
            area.trigger('nextStep');
        });

        $('#memberKeys .validKey').click(function () {
            var area = $(this).closest('.oneStep');
            if ($('input.pass1', area).val().length < 6) {
                swal({
                    title: "Le mot de passe saisi n'est pas conforme.",
                    text: "Veuillez saisir un mot de passe d'au moins 6 caractères.",
                    type: 'warning'
                });
                return;
            }
            area.trigger('nextStep');
        });

        $('#memberKeys .skipMember').click(function () {
            var area = $(this).closest('.oneStep');
            $('input', area).remove();
            area.trigger('nextStep');
        });

        $('#memberKeys .validMember').click(function () {
            var area = $(this).closest('.oneStep');
            if ($('input.pass1', area).val().length < 6) {
                swal({
                    title: "Le mot de passe saisi n'est pas conforme.",
                    text: "Veuillez saisir un mot de passe d'au moins 6 caractères.",
                    type: 'warning'
                });
                return;
            }
            if ($('input.pass1', area).val() != $('input.pass2', area).val()) {
                swal({
                    title: "Le mot de passe saisi n'est pas conforme.",
                    text: 'Les deux mots de passe ne sont pas identiques.',
                    type: 'warning'
                });
                return;
            }
            area.trigger('nextStep');
        });

        $('#memberKeys .oneStep').on('nextStep', function () {
            $(this).css('display', 'none');
            $(this).next().css('display', 'block');
            $(this).next().find('.pass1').focus();
        });

        $('#memberKeys .oneStep .pass2').keyup(function( event ) {
            if ( event.which == 13) {
                $(this).parents('.oneStep').find('.validMember').trigger('click');
            }
        });

        $('#memberKeys .end').click(function () {
            if ($(this).data('confirm')) return;
            $(this).closest('form').submit();
        });

        $('#step1 .onechoice input[type=radio]').click(function () {
            $('#step1 .onechoice .card-body,#step1 .onechoice .card-footer').hide();
            $('#step1 .onechoice.active-choice').removeClass('active-choice');
            var parentArea = $(this).closest('.onechoice');
            $('.card-body,.card-footer', parentArea).show();
            parentArea.addClass('active-choice');
        });

        $('.popup').click(function () {
            var modalid = $(this).data('modalid');
            var href = $(this).data('href');
            if (!href) {
                href = $(this).attr('href');
            }
            if ($(this).data('title')) {
                // Texte, pas HTML : jQuery décode data-title (nom de liste saisi par l'organisateur).
                $('#' + modalid + '_title').text($(this).data('title'));
            }
            $('#' + modalid + '_content').html('<iframe title="feneêtre modale sélection option" style="width:100%;height:' + ($(window).height() - 300) + 'px;border:none;" src="' + href + '"></iframe>');
            $.get("html/loading.html", function (html_string) {
                $('#' + modalid + '_content').find('iframe').contents().find('body').html(html_string);
            }, 'html');
            $('#' + modalid).modal('show');
            if (window.location.href.search("/vote") !== -1) {
                $('#' + modalid + '_content').find('iframe').on("load", function () {
                    $('#' + modalid + '_content').find('iframe').contents().find('#roleselection').addClass('overview');
                    $('#' + modalid + '_content').find('iframe').contents().find('#choice_type_membre').show();
                });
            }
            $('#' + modalid).on("hidden.bs.modal", function () {
                if ($('#btnThinkSave').length === 1) {
                    if (!$('#btnThinkSave').hasClass('thinkSave')) {
                        $('#btnThinkSave').addClass('thinkSave');
                        $('#msgThinkSave').show();
                    }
                }
            });
            return false;
        });

        if ($('#btnThinkSave').length === 1) {
            $('#btnThinkSave').click(function () {
                $(this).removeClass('thinkSave');
            });
        }

        $('.closepopup').click(function () {
            window.parent.$('.modal.show').modal('hide');
        });

        $('.modal.autorefresh').on('hidden.bs.modal', function () {
            location.reload();
        });

        $('#sendvote').click(function () {
            if ($(this).data('confirm')) return;
            $('#sendvote').trigger('sendVote');
        });

        $('#step1 .oneoption input').click(function () {
            if ($(this).hasClass('nostrike-choice')) {
                return;
            }
            if ($(this).prop('checked')) {
                $('label', $(this).closest('div')).removeClass('opacity-unchecked');
                checkMax($(this));
            } else {
                $(this).parents('.card-body').find('.alert-max-select').hide();
                $('label', $(this).closest('div')).addClass('opacity-unchecked');
            }
        });

        $('#step1 .vote').click(function () {
            var isblanc = parseInt($(this).data('isblanc')) == 1;
            $('#step1').hide();

            app.myvote = { 'choice': '', 'options': [], 'strike': [] };
            app.myvote = { 'choice': '', 'options': [], 'strike': [], 'ponderation': 1 };
            
            var ponderation = parseInt($('#ponderation').val());
            if (isNaN(ponderation)) { ponderation = 0; }
            app.myvote.ponderation = ponderation; 

            var parentArea = $(this).closest('.onechoice');
            $('#step2 .choice_name').html($('.choice_name', parentArea).html());
            $('#step2 .choice_description').html($('.choice_description', parentArea).html());

            app.myvote.choice = $('input[type="radio"]', parentArea).val();

            var checked = $('<div class="checked">');
            var unchecked = $('<div class="strike">');

            $('.oneoption', parentArea).each(function () {
                var elem = $('<div>');
                elem.html($('label', this).html());
                if ($('input:checked', this).length >= 1) {
                    app.myvote.options.push($('input[type="checkbox"]', this).val());
                    checked.append(elem);
                } else {
                    app.myvote.strike.push($('input[type="checkbox"]', this).val());
                    unchecked.append(elem);
                }
            });

            $('#step2 .choice_options').html('').append(checked).append(unchecked);
            $('#step2 .choice_options p').addClass('step2-choice-option');
           
            $('#step2 .photos-container').addClass('d-none');
            $('#step2 .choice_options p').removeClass('float-right').addClass('d-inline-block mb-0');
            $('#step2 .choice_options .photo').addClass('photo-small mr-1');

            if ($('#step1 .strike-candidats').length > 0) {
                $('#step2 .choice_options .strike p').addClass('opacity-unchecked');
            } else {
                $('#step2 .choice_options .strike p').append('<span class="small text-warning ml-2"><i class="fa-solid fa-user-alt-slash"></i></span>');
            }

            var blancsNuls  = parseInt($('#step1 .choixcol:first').data('blancs_nuls')) === 1; 
            var msgMinChoix = $('#step1 .msgminchoix').length; 

            if (msgMinChoix || blancsNuls) {
                var nb_min_choix_alerte = $('#step1 .msgminchoix:first').data('min-choix-alerte');
                var nbsieges = $('#step1 .msgminchoix:first').data('nbsieges');

                if (nbsieges === undefined) { nbsieges = 0; }
                nbsieges = parseInt(nbsieges);
                if (blancsNuls || (nb_min_choix_alerte !== undefined && parseInt(nb_min_choix_alerte) > 1)) {
                    if (trad === undefined) {
                        var lang = $('.btnTraduction').data('lang');
                        if (lang == undefined) { lang = 'fr'; }
                        var trad = getTraductions();
                    }

                    var choixTxt = parseInt($('#step1 .msgminchoix:first').data('binomes')) === 1 
                        ? trad.binome[lang] : trad.candidat[lang];
                    var blancNulTxt = parseInt($('#step1 .msgminchoix:first').data('blancs_nuls')) === 1 
                        ? trad.blanc[lang] : trad.nul[lang]; 

                    var nb = $('#step1 input[name^=options]:checked').length;
                    if (nb === undefined) { nb = 0; }

                    var showMsg = true;
                    
                    var msg_min_choix = nb == 0 ? trad.msg_aucun_choix[lang] : trad.msg_min_choix[lang];
                    if (nb == 0 && !isblanc) {
                        var msg_min_choix =  trad.msg_aucun_choix[lang];
                        msg_min_choix = msg_min_choix.replace('#_choix_#', choixTxt);
                        msg_min_choix = msg_min_choix.replace('#_blancnul_#', blancNulTxt);
                    } else if (nbsieges > 1 && nb < nb_min_choix_alerte) {
                        var msg_min_choix =  trad.msg_min_choix[lang];
                        msg_min_choix = msg_min_choix.replace('#_nb_#', nb_min_choix_alerte);
                        msg_min_choix = msg_min_choix.replace('#_choix_#', choixTxt);
                    } else {
                        showMsg = false;
                    }

                    $('#step2 .msgminchoix').remove();
                   if (showMsg) {
                       $('#step2 .alert.alert-info div').append('<p class="msgminchoix"><i class="fa-solid fa-exclamation-triangle"></i> '+msg_min_choix+'</p>');
                    }
                }
            }

            $('#step2').show();
        });

        if ($('#step1').length) {

            var max_select = parseInt($('#step1').data('max'));
            if (max_select > 0) {
                $('.oneoption input[type=checkbox]').prop('checked', false);
                $('label',$('.oneoption input[type=checkbox]').closest('div')).addClass('opacity-unchecked'); 
            }
        }

        $('.btn.step1').click(function () {
            $('#step2').hide();
            $('#step1').show();
        });

        $('form#formSendTestMail button[type=submit]').click(function () {
            return app.sendConfirmationEmail(jQuery('form#formSendTestMail'));
        });

        app.displayFields();
        $('input,select').on('change', function () {
            app.displayFields();
        });

        var lang = $('.btnTraduction').data('lang');
        if (lang == undefined) { lang = 'fr'; }
        var trad = getTraductions();

        function getTraductions(){
            var result = null;
            $.ajax({
                async:false,
                url: 'js/traductions-js.json',
                dataType: "json",
                success: function(data){
                    result = data;
                }
            });
            return result;
        }
        // Textes de la confirmation (app.confirmer).
        app.lang = lang;
        app.trad = trad;

        // Confirmation des éléments présents au chargement : liée directement
        // pour passer avant leurs autres gestionnaires. Les éléments ajoutés
        // ensuite (lignes clonées, fragments chargés en Ajax) sont couverts
        // par le gestionnaire délégué en fin de fichier.
        $('.action').click(function (event) {
            if (!$(this).data('confirm')) return true;
            event.stopImmediatePropagation();
            app.confirmer($(this));
            return false;
        });

        $('#votevoteend').on('dp.change', function (e) {
            var oldDateObj = new Date(e.date);
            var t = new Date();
            t.setTime(oldDateObj.getTime() + (10 * 60 * 1000));
            var newDate = t.getFullYear() + '-' + ('0' + (t.getMonth() + 1)).slice(-2) + '-' + ('0' + t.getDate()).slice(-2) + ' ' + ('0' + t.getHours()).slice(-2) + ':' + ('0' + t.getMinutes()).slice(-2);
            $('#votevotedepouillement').val(newDate);
        });

        $('#votevotestart').on('dp.change', function () {
            $('#votevoteemargement').val($(this).val());
        });

        if ($('#btnResetDefaultPhotoSizes').length > 0) {
            $('#btnResetDefaultPhotoSizes').click(function () {
                $('#photoSmallSize').val('40');
                $('#photoLargeSize').val('100');
            });
        }

        $('.btnSignerCerfa').click(function() {
           $(this).find('i').removeClass('fa-signature').addClass('fa-spinner fa-spin');
        });

        $('.showhidepw').click(function() {
            $(this).find('i').toggleClass('fa-eye fa-eye-slash');
            if ($(this).prev().attr('type') === 'password') {
                $(this).prev().attr('type', 'text');
            } else {
                $(this).prev().attr('type', 'password');
            }
        });

        if ($('.btnAddOtherSiret').length) {
            otherSiretsListener();
        }

        $('.btnSaveElection').click(function() {
            // Un champ invalide dans un onglet masqué bloque l'envoi du formulaire
            // sans que le navigateur puisse afficher d'erreur (VOX-503) : on le
            // signale nous-mêmes et on ouvre son onglet.
            var form = $(this).closest('form');
            form.find('[data-format=siret]').each(function() {
                formaterSiret(this);
            });
            var invalides = form.find('input, select, textarea').filter(function() {
                return !this.checkValidity();
            });

            $('#alerteChampsInvalides').remove();
            form.find('.is-invalid').removeClass('is-invalid');

            if (invalides.length === 0) {
                $('#nav-tab a:first-child').tab('show');
                return true;
            }

            // Champs fautifs, au format « [ONGLET] - SECTION - Champ » (un par champ fautif)
            var libelles = [];
            invalides.each(function() {
                $(this).addClass('is-invalid');
                libelles.push(libelleChampFormulaire(this));
            });
            var texte = libelles.length > 1
                ? 'Les champs suivants ne sont pas bien formés. Sauvegarde non effectuée.'
                : 'Le champ suivant n\'est pas bien formé. Sauvegarde non effectuée.';

            // Même bandeau que les messages d'erreur du serveur (templates/app.twig), au même endroit
            var alerte = $('<div id="alerteChampsInvalides" class="alert alert-danger" role="alert">'
                + '<span class="alert-icon"><i class="fa fa-exclamation-triangle"></i></span><div><p class="mb-1"></p><ul class="mb-0"></ul></div></div>');
            alerte.find('p').text(texte);
            $.each(libelles, function(i, libelle) {
                alerte.find('ul').append($('<li></li>').text(libelle));
            });
            $('.mainarea > .alert-success').remove(); // un « sauvegardé avec succès » précédent serait trompeur
            $('.mainarea').prepend(alerte);

            var premier = invalides.first();
            $('#nav-tab a[href="#' + premier.closest('.tab-pane').attr('id') + '"]').tab('show');
            premier[0].focus({ preventScroll: true });
            window.scrollTo(0, 0);
            return false;
        });

        $('#nav-tabContent').on('change blur', '[data-format=siret]', function() {
            formaterSiret(this);
        });

        $('#nav-tabContent').on('input', '.is-invalid', function() {
            if (this.checkValidity()) {
                $(this).removeClass('is-invalid');
            }
        });

        $('.btnAddOtherSiret').off('click.btnAddOtherSiret').on('click.btnAddOtherSiret', function() {
            var nbSirets = $('#otherSirets .otherSiret').length;
            if (nbSirets >= 11) {
                swal({
                    title: "Sirets autres établissements",
                    text: "Nombre maximum de Sirets atteint !",
                    type: 'warning'
                });
                return false;
            }
            var emptys = false;
            $('#otherSirets .otherSiret').each(function() {
                if ($(this).val().length === 0) {
                    emptys = true;
                    return false;
                }
            });
            if (emptys) {
                swal({
                    title: "Sirets autres établissements",
                    text: "Des champs disponibles sont vides.",
                    type: 'warning'
                });
                return false;
            }
            $('#otherSirets').append('<div class="input-group mb-2"><input type="text" class="otherSiret form-control" placeholder="000 000 000 00000"><div class="input-group-append"><button class="btn btn-danger btnRemoveSiret" type="button"><i class="fa-solid fa-trash-alt"></i></button> </div></div>');
            otherSiretsListener();
        });

        if ($('#votevotenbtours').length) {
            $('#votevotenbtours').change(function() {
                var nbTours = parseInt($(this).val());
                if (isNaN(nbTours)) { return false; }

                if (nbTours > 4) {
                    $('#votevotetour_1').parents('fieldset').find('.custom-radio').show();
                } else {
                    $('#votevotetour_1').parents('fieldset').find('.custom-radio').hide();

                    var valTour = parseInt($('input[name=vote\\[vote_tour\\]]:checked').val());
                    if (valTour > nbTours) {
                        $("#votevotetour_"+nbTours).prop("checked", true);
                    }
                
                    if (nbTours == 4) {
                        $('#votevotetour_0').parent().show();
                        $('#votevotetour_1').parent().show();
                        $('#votevotetour_2').parent().show();
                        $('#votevotetour_3').parent().show();
                        $('#votevotetour_4').parent().show();
                    }
                    if (nbTours == 3) {
                        $('#votevotetour_0').parent().show();
                        $('#votevotetour_1').parent().show();
                        $('#votevotetour_2').parent().show();
                        $('#votevotetour_3').parent().show();
                    }
                    if (nbTours == 2) {
                        $('#votevotetour_0').parent().show();
                        $('#votevotetour_1').parent().show();
                        $('#votevotetour_2').parent().show();
                    }
                    if (nbTours == 1) {
                        $('#votevotetour_0').parent().show();
                        $('#votevotetour_1').parent().show();
                    }
                    if (nbTours == 0) {
                        $('#votevotetour_0').parent().show();
                    }
                }
  
            });
        }

        $('.btnModifierElecteur').off('click.modifierElecteur').on('click.modifierElecteur', function() {
            $('.modal').modal('hide');
            var url = $(this).data('url');
            $.ajax({
                url: url,
                processData: false,
                contentType: false,
                method: "get",
                success: function(retour) {
                    $('#modalModifElecteurBody').html(retour);
                    $('#modalModifElecteur').modal('show');
                    modifElecteurListener();
                }
            });
        });
      
        $('#envoiMailRappel').off('click.envoiMailRappel').on('click.envoiMailRappel', function() {

            var url = $(this).data('url');
            
            let Datas = new FormData();
            Datas.append("csrf_name", $(this).parent().find('input.csrf[name=csrf_name]').val());
            Datas.append("csrf_value", $(this).parent().find('input.csrf[name=csrf_value]').val());
            
            var bouton = $(this);
            var ifa = $(this).find('i.fa');
            ifa.removeClass('fa-paper-plane').addClass('fa-spin fa-spinner');

            $.ajax({
                url: url,
                data: Datas,
                processData: false,
                contentType: false,
                method: "get",
                success: function(nb) {
                    nb+='';
                    var nb = parseInt(nb);
                    if (isNaN(nb) || nb == 0) {
                        swal({
                            title: "Echec !",
                            text: "Aucun e-mail n'a pu être envoyé.",
                            type: 'error'
                        });
                        return false;
                    }
                    let txt = nb == 1 ? " e-mail a bien été envoyé." : " e-mails ont bien été envoyés.";
                    swal({
                        title: "E-mail de rappel",
                        text: nb + txt,
                        type: 'success'
                    });
                }
            })
            .fail(function(error){
                swal({
                    title: "Rappel non envoyé",
                    text: error.responseText,
                    type: 'error'
                });
                return false;
            })
            .always(function() {
                ifa.removeClass('fa-spin fa-spinner').addClass('fa-bell');
                // La confirmation (app.confirmer) vide data-confirm : elle est
                // réarmée pour le prochain envoi.
                bouton.data('confirm', 1);
            });
        });


        $('input[type=email]#username, input[type=text]#username').focus(function() {
            $(this).removeClass('is-invalid');
        });

        $('input[type=email]#username').blur(function() {
            $(this).removeClass('is-invalid');
            if ($(this).val() === '') { return false; }
            var regexMail = /^([\w-+]+(?:\.[\w-+]+)*)@((?:[\w-]+\.)*\w[\w-]{0,66})\.([a-z]{2,63}(?:\.[a-z]{2})?)$/i;
            if (!regexMail.test($(this).val())) {
                $(this).addClass('is-invalid');
            }
        });

        $('form[action*=login]').submit(function() {
            // Formulaires « login » sans identifiant ni mot de passe (seconde
            // étape de l'électeur, /electeur/confirmlogin) : rien à contrôler
            // ici (le contrôle levait une erreur et laissait partir l'envoi).
            if (!$('input#username').length || !$('input[type=password]#password').length) {
                return;
            }
            var id = $('input#username').val();
            var pw = $('input[type=password]#password').val();
            let $objdom = $(this).find('[type="submit"]');

            if ($('input[type=email]#username').length) {
                if (id.length < 6 || pw.length < 6) { return false; }
            } else {
                var regexMail = /^([\w-+]+(?:\.[\w-+]+)*)@((?:[\w-]+\.)*\w[\w-]{0,66})\.([a-z]{2,63}(?:\.[a-z]{2})?)$/i;
                if (regexMail.test(id)) {
                    $('input#username').addClass('is-invalid');
                    return false;
                }
                if (id.length < 6 || pw.length < 6) { return false; }
            }

            $objdom.attr('disabled', 'disabled');
            $objdom.addClass('disabled');
            $objdom.html('<i class="fa-solid fa-spinner fa-spin fa-2x p-2"></i>');
        });

        if ( typeof DataTable === 'function' ) {

            $('.datatable-members').DataTable({"columnDefs": [ {
                "targets": 5,
                "orderable": false
                } ],
                "lengthMenu": [[10, 25, 50, -1], [10, 25, 50, "Tous"]],
                "fnDrawCallback": function( oSettings ) {
                    $('#DataTables_Table_0_previous').html('<i class="fa-solid fa-angle-left"></i>');
                    $('#DataTables_Table_0_previous').html('<i class="fa-solid fa-angle-left"></i>');
                    $('#DataTables_Table_0_next').html('<i class="fa-solid fa-angle-right"></i>');
                    $('#DataTables_Table_0_last').html('<i class="fa-solid fa-angle-double-right"></i>');
                    $('#DataTables_Table_0_first').html('<i class="fa-solid fa-angle-double-left"></i>');
                }
            });
            $('.datatable-electeurs').DataTable({"columnDefs": [ {
                "targets": [5,6,7],
                "orderable": false
                } ], 
            "lengthMenu": [[10, 25, 50, -1], [10, 25, 50, "Tous"]],
            "fnDrawCallback": function( oSettings ) {
                $('#DataTables_Table_0_previous').html('<i class="fa-solid fa-angle-left"></i>');
                $('#DataTables_Table_0_next').html('<i class="fa-solid fa-angle-right"></i>');
                $('#DataTables_Table_0_last').html('<i class="fa-solid fa-angle-double-right"></i>');
                $('#DataTables_Table_0_first').html('<i class="fa-solid fa-angle-double-left"></i>');
            }
            });
            $('.table-fichiers').DataTable({searching: false, paging: false, info:false, "columnDefs": [ {
                "targets": [3,4],
                "orderable": false
                } ]
            });

            let elem_datatable_filterinput = $('.dataTables_wrapper .dataTables_filter input');
            $(elem_datatable_filterinput).attr('placeholder', 'Rechercher...');
            $('.dataTables_length').appendTo('#contentDataTableHeader');
            $('.dataTables_filter').appendTo('#contentDataTableHeader');
            $('.dataTables_filter input').addClass('form-control');
        }

        $('input[name="election[election_connexion]"], input[name="election[election_code]"]').change(function() {
            let log = $('input[name="election[election_connexion]"]:checked').val();
            let mdp = $('input[name="election[election_code]"]:checked').val();
            if (log == mdp) {
                $('#cnilinfocanaux.alert-warning, #cnilinfocanaux.alert-success').removeClass('alert-warning alert-success').addClass('alert-danger');
                blink();
            } else {
                $('#cnilinfocanaux.alert-danger').removeClass('alert-danger').addClass('alert-success');
            }
        });

        $('.supprime-fichier').click(function() {
            let objDom = $(this);
            swal({
                title: 'Supprimer ce fichier ?',
                text: 'Il ne sera plus disponible pour tous les utilisateurs concernés !',
                type: 'warning',
                customClass: 'swal-suppr',
                showCancelButton: true,
                confirmButtonText: 'Supprimer',
                cancelButtonText: 'Annuler'
            },
                function () {
                 window.location.href = objDom.attr('href');
                });
            return false;
        });

    }, // FIN init App **************************

    /*
     * Aléa cryptographique du navigateur (écart E5 de l'audit CNIL). Math.random
     * n'est pas fait pour des secrets. Sans crypto.getRandomValues, on s'arrête
     * plutôt que de produire un secret prévisible.
     */
    octetsAleatoires: function (nombre) {
        var cryptoNavigateur = window.crypto || window.msCrypto;
        if (!cryptoNavigateur || !cryptoNavigateur.getRandomValues) {
            throw new Error("Générateur aléatoire sécurisé indisponible dans ce navigateur.");
        }
        var octets = new Uint8Array(nombre);
        cryptoNavigateur.getRandomValues(octets);
        return octets;
    },

    /* Alphabet unique des secrets, le même que Main::ALPHABET côté PHP (31 caractères). */
    ALPHABET: "23456789ABCDEFGHJKLMNPQRSTUWXYZ",

    /* Chaîne de longueur caractères tirés uniformément de alphabet (tirage par rejet). */
    texteAleatoire: function (alphabet, longueur) {
        var texte = "";
        var limite = 256 - (256 % alphabet.length);
        while (texte.length < longueur) {
            var octets = app.octetsAleatoires(longueur * 2);
            for (var i = 0; i < octets.length && texte.length < longueur; i++) {
                if (octets[i] < limite) {
                    texte += alphabet.charAt(octets[i] % alphabet.length);
                }
            }
        }
        return texte;
    },

    initUpload: function (elem) {
        var url = $(elem).data('url');
        var folder = $(elem).data('folder');

        var parent = $(elem).parent();

        $(elem).on('click', function () {
            $('.progress-bar', parent).css('width', '0%');
            $('.progress-bar', parent).removeClass().addClass('progress-bar');
            $('.answer', parent).html('').removeClass().addClass('answer');
        });

        var formData = {};
        $('input.csrf', $(elem).closest('form')).each(function () {
            formData[$(this).attr('name')] = $(this).val();
        });

        $(elem).fileupload({
            url: url,
            dataType: 'json',
            formData: formData,
            dropZone: $('.dropzone', parent),
            done: function (e, data) {
                if (data.result.status == 'success') {
                    $('.progress-bar', parent).removeClass().addClass('progress-bar bg-success');
                    $('input[type="hidden"]', parent).val(data.result.data.filename);
                    $('.previewarea', parent.parent()).html('<img src="' + folder + data.result.data.filename + '" style="max-width:100%" />');
                    $('.answer', parent).html(data.result.message).removeClass().addClass('answer alert alert-success');
                    if ($(this).hasClass('fileupload-photo')) {
                        $(this).parent().find('.dropzone').html('<span class="fa-stack"><i class="fa-solid fa-circle fa-stack-2x text-info"></i><i title="Modifier la photo" class="action text-white photostate fa-solid fa-check fa-stack-1x fa-inverse"></i></span>');
                    }
                    if ($(this).hasClass('organisateur-electeurs-csv')) {
                        $('.btnGoImport').removeClass('disabled').prop('disabled', false);
                    }
                    parent.closest('form.autosubmit').submit();
                } else {
                    $('.progress-bar', parent).removeClass().addClass('progress-bar bg-danger');
                    $('.answer', parent).html(data.result.message).removeClass().addClass('answer alert alert-danger');
                    if ($(this).hasClass('fileupload-photo')) {
                        swal({
                            title: "Photo du candidat",
                            text: "La photo n'a pas pu être chargée !",
                            type: 'warning'
                        });
                    }
                }
            },
            error: function (e, data) {
                $('.progress-bar', parent).removeClass().addClass('progress-bar bg-danger');
                $('.answer', parent).html(e.responseJSON.message).removeClass().addClass('answer alert alert-danger');
                if ($(elem).hasClass('fileupload-photo')) {
                    swal({
                        title: "Photo du candidat",
                        text: "La photo n'a pas pu être chargée !",
                        type: 'warning'
                    });
                }
            },
            progressall: function (e, data) {
                var progress = parseInt(data.loaded / data.total * 100, 10);
                $('.progress-bar', parent).css('width', progress + '%');
            }
        }).prop('disabled', !$.support.fileInput).parent().addClass($.support.fileInput ? undefined : 'disabled');
    },

    /*
     * Demande confirmation (data-confirm) avant l'action d'un élément : textes
     * data-title, data-text, data-type, data-confirmbuttontext et
     * data-cancelbuttontext. Une fois confirmé, data-confirm est vidé puis le
     * lien est suivi ou le clic relancé : l'action (data-action, gestionnaire
     * propre à l'élément ou envoi du formulaire) s'exécute alors.
     */
    confirmer: function (button) {
        var lang = app.lang || 'fr';
        var trad = app.trad || {};
        var libelle = function (cle, defaut) {
            return trad[cle] && trad[cle][lang] ? trad[cle][lang] : defaut;
        };

        var title = button.data('title');
        if (!title) title = libelle('etes_vous_sur', 'Êtes-vous sûr ?');

        var text = button.data('text');

        var type = button.data('type');
        if (!type) type = "warning";

        var confirmButtonText = button.data('confirmbuttontext');
        if (!confirmButtonText) confirmButtonText = libelle('oui', 'Oui');

        var cancelButtonText = button.data('cancelbuttontext');
        if (!cancelButtonText) cancelButtonText = libelle('annuler', 'Annuler');

        swal({
            title: title,
            text: text,
            type: type,
            showCancelButton: true,
            confirmButtonText: confirmButtonText,
            cancelButtonText: cancelButtonText
        },
            function () {
                button.data('confirm', '');
                var href = button.attr('href');

                if (href) {
                    window.location.href = href;
                } else {
                    button.trigger('click');
                }
            });
    },

    /*
     * Condition d'affichage d'un champ (attribut data-condition), évaluée sans
     * eval (CSP stricte, T16) par js/condition-affichage.js, qui décrit les
     * formes reconnues. Une forme inconnue vaut faux et est signalée dans la
     * console.
     */
    evaluerCondition: function (condition) {
        return ConditionAffichage.evaluer(condition, {
            valeur: function (selecteur, duParent) {
                return $(selecteur, duParent ? parent.document : document).val();
            },
            coche: function (selecteur, duParent) {
                return $(selecteur, duParent ? parent.document : document).is(':checked');
            },
            auth1Checked: typeof window.auth1Checked === 'function' ? window.auth1Checked : null,
            signaler: function (message) {
                if (window.console) { console.warn(message); }
            }
        });
    },

    displayFields: function () {
        $('.displayon').each(function () {
            var condition = $(this).data('condition');
            if (app.evaluerCondition(condition)) {
                $(this).show();
            } else {
                $(this).hide();
            }
        });

        $("input:radio[name=election\\[election_cnil\\]]")
        .off('change.electionmdpsms')
        .on('change.electionmdpsms', function() {
            if (parseInt($(this).val()) == 0) {
                $('.alertInfoSmsInstall.alert-warning').show();
                $('.alertInfoSmsInstall.alert-info').hide();
            } else {
                $('.alertInfoSmsInstall.alert-warning').hide();
                $('.alertInfoSmsInstall.alert-info').show();
            }
        });

        $('.btnGenereMdpAdmin').click(function() {
            let mdpadmin = app.texteAleatoire(app.ALPHABET, 15);
            $("input:password[name=member\\[member_password\\]]").prop('type', 'text');
            $("input:text[name=member\\[member_password\\]]").val(mdpadmin);
        });

        $('.btnGenereMdpHotline').click(function() {
            let mdpadmin = app.texteAleatoire(app.ALPHABET, 15);
            $("input:password[name=hotline\\[member_password\\]]").prop('type', 'text');
            $("input:text[name=hotline\\[member_password\\]]").val(mdpadmin);
        });

    },

    onSelectCbChange: function (elem) {

        if ($(elem).prop('checked')) {
            $("tbody input:checkbox").each(function () {
                if (!$(this).prop('checked')) {
                    $(this).prop('checked', true);
                }
            });
        } else {
            $("tbody input:checked").each(function () {
                $(this).prop('checked', false);
            });
        }
    },

    sendConfirmationEmail: function (form) {
        let usernames = [];
        $("tbody input.confirmation-mail-checkbox:checked").each(function () {
            usernames.push($(this).data("username"));
        });
        for (var i in usernames) {
            $(form).append('<input type="hidden" name="' + $(form).data('inputname') + '" value="' + usernames[i] + '" />')
        }
        return form.submit();
    },
}

/**
 * Remet un SIRET au format « 111 111 111 00016 » quand la saisie ne contient que
 * des chiffres et des séparateurs (espaces, points, tirets, barres obliques) et
 * compte exactement 14 chiffres. Sinon la saisie est laissée telle quelle : le
 * contrôle du formulaire la signalera (VOX-503).
 */
function formaterSiret(champ) {
    var saisie = $(champ).val();
    if (!/^[\d\s.\-\/]+$/.test(saisie)) { return; }
    var chiffres = saisie.replace(/\D/g, '');
    if (chiffres.length !== 14) { return; }
    $(champ).val(chiffres.substr(0, 3) + ' ' + chiffres.substr(3, 3) + ' ' + chiffres.substr(6, 3) + ' ' + chiffres.substr(9, 5));
}

/**
 * Libellé d'un champ de formulaire à onglets : « [ONGLET] - SECTION - Champ » (VOX-503).
 * - onglet : texte de l'onglet, sans le numéro de sa pastille ;
 * - section : titre de la carte, sans le numéro de sa pastille ;
 * - champ : data-libelle, sinon le label du champ, l'étiquette affichée devant
 *   lui, son placeholder… à défaut « sans nom ».
 */
function libelleChampFormulaire(champ) {
    var nettoyer = function(texte) { return $.trim((texte || '').replace(/\s+/g, ' ').replace(/:$/, '')); };
    var sansPastille = function(element) { return nettoyer(element.clone().find('.fa-stack').remove().end().text()); };
    var $champ = $(champ);

    var lienOnglet = $('#nav-tab a[href="#' + $champ.closest('.tab-pane').attr('id') + '"]');
    var onglet = lienOnglet.find('p').length ? nettoyer(lienOnglet.find('p').text()) : sansPastille(lienOnglet);
    var section = sansPastille($champ.closest('.card').find('.card-header h2').first());

    var nom = $champ.data('libelle')
        || (champ.id && nettoyer($('label[for="' + champ.id + '"]').first().text()))
        || nettoyer($champ.closest('.form-group').find('label').first().text())
        || nettoyer($champ.closest('.input-group').find('.input-group-text').first().text())
        || nettoyer($champ.attr('placeholder'))
        || 'sans nom';

    return '[' + onglet.toUpperCase() + '] - ' + section.toUpperCase() + ' - ' + nom;
}

function otherSiretsListener() {
    $('.otherSiret').keyup(function() {
        updateOthersSirets();
    });
    $('.btnRemoveSiret').off('click.btnRemoveSiret').on('click.btnRemoveSiret', function() {
  
       $(this).parents('div.input-group').remove();
       updateOthersSirets();
    });     
  }

function updateOthersSirets() {
    var sirets = '';
    $('#otherSirets .otherSiret').each(function() {
        sirets+= $(this).val()+',';
    });
    $('input#electionSiretsOthers').val(sirets);
}

function checkMax(elm) {
    elm.parents('.card-body').find('.alert-max-select').hide();
    var max_select = elm.parents('.card-body').data('max');
    if (max_select == 0) { return true; }
    var candidats_selected = elm.parents('.options').find('input[type=checkbox]:checked').length;
    if (candidats_selected > max_select) {
        elm.prop('checked', false);
        $('label', elm.closest('div')).addClass('opacity-unchecked');
        elm.parents('.card-body').find('.alert-max-select').show();
    }
}

function blink(){
    $('#cnilinfocanaux.alert-danger i.fa').delay(100).fadeTo(100,0.5).delay(100).fadeTo(100,1, blink);
}

function modifElecteurListener() {

    $('.carac-adresse').characterCounter({
        maxChars: 45,
        postCountMessage: "caractères restants",
        postCountMessageSingular: "caractères restants",
        zeroRemainingMessage: "Aucun caractère restant",
        overrunPreCountMessage: "Suppimez",
        overrunPostCountMessage: "caractères",
        overrunPostCountMessageSingular: "caractère",
        positiveOverruns: true
    });

    $('#btnSaveElecteur').off('click.btnSaveElecteur').on('click.btnSaveElecteur', function() {
        var url = $(this).data('url');

        let Datas = new FormData()
        Datas.append("csrf_name", $('#modalModifElecteur input.csrf[name=csrf_name]').val());
        Datas.append("csrf_value", $('#modalModifElecteur input.csrf[name=csrf_value]').val());

        $('#modalModifElecteurBody').find('input').each(function() {
            Datas.append($(this).attr('name'), $(this).val());
        });
        Datas.append('college', $('#modalModifElecteurBody select[name="college"]').val());

        $.ajax({
            url: url,
            data: Datas,
            processData: false,
            contentType: false,
            method: "post",
            success: function(retour) {

                retour+='';
                if (retour == 'err_user') {
                    alert('Electeur non identifé !');
                    return false;
                }
                if (retour == 'err_vote') {
                    alert('Un vote est déjà en cours pour cet électeur ! Modification impossible.');
                    return false;
                }
                if (retour == 'err_mail') {
                    alert("L'adresse e-mail saisie n'est pas valide !");
                    return false;
                }
                if (retour == 'err_tel') {
                    alert("Le numéro de téléphone n'est pas valide !");
                    return false;
                }
                if (retour == 'err_sql') {
                    alert("L'enregistrement des données à échouée !");
                    return false;
                }
                if (retour == 'err_votes') {
                    alert("Impossible de changer le collège, des votes associés sont impactés ! (supprimés ou archivés)");
                    return false;
                }
                if (retour == 'err_votes_0') {
                    alert("Impossible de changer le collège : aucun vote trouvé pour ce collège");
                    return false;
                }

                $('#modalModifElecteur').modal('hide');
                location.reload();
            }
        });
    });
}

/*
 * Actions déclarées par attribut (CSP stricte, T16) : plus de onclick ni de
 * onfocus dans les gabarits. Un élément data-confirm n'agit qu'une fois la
 * confirmation donnée (app.confirmer, qui remet data-confirm à vide puis
 * relance le clic). Délégué au document : couvre aussi les éléments ajoutés
 * après le chargement.
 */
$(document).on('click', '.action, [data-action]', function (event) {
    var $el = $(this);
    if ($el.data('confirm')) {
        // Élément ajouté après le chargement (ex. candidat ajouté par
        // « Ajouter un candidat », ligne clonée) : la confirmation liée au
        // chargement ne le couvre pas, elle est demandée ici.
        if ($el.hasClass('action')) {
            event.stopImmediatePropagation();
            app.confirmer($el);
            return false;
        }
        return;
    }
    switch ($el.data('action')) {
        case 'soumettre':
            $el.closest('form').submit();
            break;
        case 'aller':
            window.location.href = $el.data('href');
            break;
        case 'retirer':
            $($el.data('cible')).remove();
            break;
        case 'retirer-ligne':
            $el.closest('tr').remove();
            break;
        case 'fonction':
            // Fonctions globales de la page de connexion (aide), liste fermée.
            var nom = $el.data('fonction');
            if (['ouverturePopUp', 'fermeturePopUp', 'resetAide'].indexOf(nom) >= 0 && typeof window[nom] === 'function') {
                window[nom]();
            }
            break;
    }
});
$(document).on('focus', '[data-focus]', function () {
    if ($(this).data('focus') === 'mot-de-passe') { this.setAttribute('type', 'password'); }
    if ($(this).data('focus') === 'ecriture') { this.removeAttribute('readonly'); }
});
