
// Compte à rebours du vote (jquery.countdown). Pas de gabarit lodash
// (_.template compile avec new Function, refusé par la CSP stricte, T16) :
// le texte est écrit à chaque mise à jour.
$('[data-countdown]').each(function () {
    var $this = $(this),
        finalDate = $(this).data('countdown');

    // Gestionnaires reliés AVANT le démarrage : jquery.countdown publie sa
    // première mise à jour dès l'initialisation, sinon le compteur resterait
    // vide jusqu'à la mise à jour suivante.
    $this.on('update.countdown', function(event) {
        var format = '%-H h %M min';

        var lang = $('.btnTraduction').data('lang');
        let txtJour = lang == 'en' ? 'day' : 'jour';
        let txtMoins = lang == 'en' ? 'less than a minute' : 'moins d\'une minute';

        if(event.offset.totalDays > 0) {
          format = '%-D '+txtJour+'%!D ' + format;
        }
        if(event.offset.totalHours < 1) {
            format = '%-M min';
        }
        if(event.offset.totalMinutes < 1) {
            format = txtMoins;
        }
        $(this).html(event.strftime(format));
      }).on('finish.countdown', function(event) {
        $(this).parents('.countdown').hide();
        //location.reload(); // Problème de boucle de refreshs sans fin...
        return false;
      }).countdown(finalDate);

});
