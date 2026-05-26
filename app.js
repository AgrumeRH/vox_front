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
            $('.dropzone').click(function () {
                $('input[type="file"]', $(this).parent()).trigger('click');
            });
            $('.fileupload').each(function (index, elem) {
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
                $('#' + modalid + '_title').html($(this).data('title'));
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

        $('.action').click(function (event) {

            if (!$(this).data('confirm')) return true;

            event.stopImmediatePropagation();
            event.stopPropagation();

            var title = $(this).data('title');
            if (!title) title = trad.etes_vous_sur[lang];

            var text = $(this).data('text');

            var type = $(this).data('type');
            if (!type) type = "warning";

            var confirmButtonText = $(this).data('confirmbuttontext');
            if (!confirmButtonText) confirmButtonText = trad.oui[lang];

            var cancelButtonText = $(this).data('cancelbuttontext');
            if (!cancelButtonText) cancelButtonText = trad.annuler[lang];

            var button = $(this);

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
            $('#nav-tab a:first-child').tab('show');
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
            });
        });


        $('input[type=email]#username, input[type=text]#username').focus(function() {
            $(this).removeClass('is-invalid');
        });

        $('input[type=email]#username').blur(function() {
            $(this).removeClass('is-invalid');
            if ($(this).val() === '') { return false; }
            var regexMail = /^([\w-+]+(?:\.[\w-+]+)*)@((?:[\w-]+\.)*\w[\w-]{0,66})\.([a-z]{2,6}(?:\.[a-z]{2})?)$/i;
            if (!regexMail.test($(this).val())) {
                $(this).addClass('is-invalid');
            }
        });

        $('form[action*=login]').submit(function() {
            var id = $('input#username').val();
            var pw = $('input[type=password]#password').val();
            let $objdom = $(this).find('[type="submit"]');

            if ($('input[type=email]#username').length) {
                if (id.length < 6 || pw.length < 6) { return false; }
            } else {
                var regexMail = /^([\w-+]+(?:\.[\w-+]+)*)@((?:[\w-]+\.)*\w[\w-]{0,66})\.([a-z]{2,6}(?:\.[a-z]{2})?)$/i;
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

    AESEncrypt: function (passphrase, plain_text) {

        var salt = CryptoJS.lib.WordArray.random(256);
        var iv = CryptoJS.lib.WordArray.random(16);
        var key = CryptoJS.PBKDF2(passphrase, salt, { hasher: CryptoJS.algo.SHA512, keySize: 64 / 8, iterations: 999 });
        var encrypted = CryptoJS.AES.encrypt(plain_text, key, { iv: iv });

        if (!encrypted) return false;

        var data = {
            ciphertext: CryptoJS.enc.Base64.stringify(encrypted.ciphertext),
            salt: CryptoJS.enc.Hex.stringify(salt),
            iv: CryptoJS.enc.Hex.stringify(iv)
        }

        return JSON.stringify(data);
    },

    getPass: function (size) {
        var text = "";
        for (var i = 0; i < size; i++) {
            text += String.fromCharCode(Math.floor(Math.random() * 94) + 32);
        }
        return text;
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

    displayFields: function () {
        $('.displayon').each(function () {
            var condition = $(this).data('condition');
            if (eval(condition)) {
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
            let mdpadmin = Math.random().toString(36).slice(-8);
            $("input:password[name=member\\[member_password\\]]").prop('type', 'text');
            $("input:text[name=member\\[member_password\\]]").val(mdpadmin);
        });

        $('.btnGenereMdpHotline').click(function() {
            let mdpadmin = Math.random().toString(36).slice(-8);
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