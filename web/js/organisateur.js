$(document).ready(function () {

    // Check session
    setInterval(checkSessionJs, 60000);

    $(function () {
        $('[data-toggle="popover"]').popover()
    });

    // Appel de la fonction de l'étape actuelle
    let etape = $('#etapeOrganisateur').data('slug');

    if (etape === undefined) {
        return false;
    }

    var funcName = "etape" + etape.charAt(0).toUpperCase() + etape.slice(1);
    chargerScriptEtape(etape);

    function chargerScriptEtape(nomEtape) {
        let nomFichier = nomEtape + ".js";

        if (!$('script[src*="/js/organisateur/' + nomFichier + '"]').length) {
            // CNIL E27 : le script n'est exécuté que si son empreinte est
            // celle du manifeste publié (attribut integrity, SRI). Sans
            // empreinte connue, il n'est pas chargé.
            let integrites = {};
            try {
                integrites = JSON.parse($('#integrite-etapes').text() || '{}');
            } catch (e) {
                integrites = {};
            }
            if (!integrites[nomFichier]) {
                console.error("Empreinte inconnue, script non chargé : " + nomFichier);
                return;
            }
            let element = document.createElement('script');
            // Paramètre de version : pas de copie en cache d'une version précédente.
            element.src = '/js/organisateur/' + nomFichier + '?v=' + encodeURIComponent(integrites[nomFichier].slice(7, 19));
            element.integrity = integrites[nomFichier];
            element.onload = function () {
                console.log(nomFichier + ' chargé avec succès.');
                let funcName = "main";
                if (typeof window[funcName] === "function") {
                    window[funcName]();
                } else {
                    console.warn("Fonction " + funcName + "() introuvable dans " + nomFichier);
                }
            };
            element.onerror = function () {
                console.error("Impossible de charger le fichier : " + nomFichier);
            };
            document.body.appendChild(element);
        } else {
            // déjà chargé, on appelle la fonction directement
            let funcName = "main";
            if (typeof window[funcName] === "function") {
                window[funcName]();
            }
        }
    }

}); // FIN ready

var word = "who";
var input = "";
document.body.addEventListener('keypress',function(ev){
    input += String.fromCharCode(ev.keyCode);
    if(input === word){
        $('.flier-off').toggleClass('flier-off flier');
        input = "";
    }
});

// reset input when pressing esc
document.body.addEventListener('keyup',function(ev){
    if(ev.keyCode == 27) input = "";
});

function isSiretValide(siret) {
    const chiffresSeulement = siret.replace(/\D/g, '');
    return chiffresSeulement.length === 14;
}

function isEmailValide(email) {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
}


function isFutureDate(dateStr) {
    // dateStr attendu : "dd/mm/yyyy hh:mm"
    let parts = dateStr.split(" ");
    if (parts.length !== 2) return false;

    let dateParts = parts[0].split("/");
    let timeParts = parts[1].split(":");

    if (dateParts.length !== 3 || timeParts.length !== 2) return false;

    let day = parseInt(dateParts[0], 10);
    let month = parseInt(dateParts[1], 10) - 1; // JS compte les mois à partir de 0
    let year = parseInt(dateParts[2], 10);
    let hour = parseInt(timeParts[0], 10);
    let minute = parseInt(timeParts[1], 10);

    let dt = new Date(year, month, day, hour, minute);

    return dt >= new Date();
}

function showOverlay() {
    $('#overlay').css('visibility', 'visible');
}

// Masquer l'overlay
function hideOverlay() {
    $('#overlay .text').text("Veuillez patienter...");
    $('#overlay').css('visibility', 'hidden');
}

function checkSessionJs() {

    let Datas = getCsrfData();
    $.ajax({
        url: '/organisateur/checksession',
        data: Datas,
        method: "post",
        success: function (retour) {
            retour+="";
            if (retour === 'out') {
                window.location.href = '/organisateur/login';
            }
        }
    });
}