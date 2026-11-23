

// Par défaut initialisation index à 0
let currentQuestionIndex = 0;
const questionElement = document.getElementById('questionIntro');
const chatPopup = document.getElementById('chatPopup');

// Initialisation questionnaire
montrerQuestion(currentQuestionIndex);

$('.question').click(function(e) {
    montrerQuestion();
});

$(document).ready(function() {
    setTimeout(() => {
       $('#chatIcon').addClass('bouge');
      }, "5000");
      
});

function montrerQuestion(newIndex) {

    // On récupére l'index suite au clic. Si non undefined on récupère le n° de la question adéquat
    if (newIndex !== undefined) {
        currentQuestionIndex = newIndex;
    }
    const options1 = document.getElementById('options1');
    const options2 = document.getElementById('options2');
    questionElement.textContent = questions[currentQuestionIndex].question;
    options1.innerHTML = '';
    options2.innerHTML = '';
    const currentQuestion = questions[currentQuestionIndex];
    // Si question définie on ajoute les informations adéquats. 
    // 10 affichage numéro
    // 9 redirection formulaire
    if (currentQuestion.options) {
        let i = 1;
        let antiloop = false
        currentQuestion.options.forEach((option, index, text) => {

            if (currentQuestionIndex == 10 || currentQuestionIndex == 8) {
                if (!antiloop) {
                    antiloop = true

                    const optionElement = document.createElement('a');
                    optionElement.href = "tel:"+text.toString().replace(/\D/g,'');
                    optionElement.classList.add('numtel');
                    options1.appendChild(optionElement);
                    optionElement.textContent = text;
                }

            } else if (currentQuestionIndex == 9) {
                if (!antiloop) {
                    antiloop = true

                    const optionElement = document.createElement('a');
                    optionElement.href = window.location.origin + '/electeur/lost';
                    optionElement.classList.add('btn');
                    optionElement.classList.add('btn-secondary');
                    options1.appendChild(optionElement);
                    optionElement.textContent = text[0];
                }

            } else {
                const optionElement = document.createElement('button');
                if (i === 1) {
                    optionElement.classList.add('btn');
                    optionElement.classList.add('btn-secondary');
                    optionElement.id = 'reponseButton1';
                    optionElement.dataset.id = currentQuestion.question1;
                    options1.appendChild(optionElement);
                } else {
                    optionElement.classList.add('btn');
                    optionElement.classList.add('btn-secondary');
                    optionElement.id = 'reponseButton2';
                    optionElement.dataset.id = currentQuestion.question2;
                    options2.appendChild(optionElement);
                }
                optionElement.textContent = option;
                optionElement.addEventListener('click', () => handleOptionClick(index));

            }
            i++;
        });
    }
}

function handleOptionClick(index) {
    const optionSelectionnee = questions[currentQuestionIndex].options[index];
    const questionSelectionnee = event.target.dataset.id;
    questionElement.textContent = optionSelectionnee;
    montrerQuestion(questionSelectionnee);
}


function ouverturePopUp() {
    chatPopup.style.display = (chatPopup.style.display === 'none' || chatPopup.style.display === '') ? 'block' : 'none';
    montrerQuestion(0);
    $('#chatIcon').removeClass('bouge');
    $('#chatIcon').hide();

    $.ajax({
        url: "/compteuraide",
        method: "get"
    });

}

function resetAide() {
    montrerQuestion(0);
}

function fermeturePopUp() {
    chatPopup.style.display = 'none';
    $('#chatIcon').show();
}