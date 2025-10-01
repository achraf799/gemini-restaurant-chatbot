// static/script.js

document.addEventListener('DOMContentLoaded', () => {
    const voiceInputBtn = document.getElementById('voice-input-btn');
    const userInputText = document.getElementById('user-input-text'); 
    const chatDisplayArea = document.getElementById('chat-display-area');
    const botStatus = document.getElementById('bot-status');

    const converter = new showdown.Converter();

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const SpeechSynthesis = window.speechSynthesis;

    let recognition = null;
    let synth = null;


    function appendMessage(message, sender) {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message');
        
        if (sender === 'bot') {
            const htmlReply = converter.makeHtml(message);
            messageDiv.innerHTML = htmlReply;
            messageDiv.classList.add('bot-message');
            const cleanTextForSpeech = message.replace(/---DEVIS START---|---DEVIS END---/g, '');
            speakResponse(cleanTextForSpeech); 
        } else {
            messageDiv.textContent = message;
            messageDiv.classList.add('user-message');
        }
        
        chatDisplayArea.appendChild(messageDiv);
        
        chatDisplayArea.scrollTop = chatDisplayArea.scrollHeight;
    }

    async function sendToGemini(message) {
        if (!message) return;

        appendMessage(message, 'user');
        userInputText.value = ''; 

        const loadingDiv = document.createElement('div');
        loadingDiv.innerHTML = '...';
        loadingDiv.classList.add('message', 'bot-message', 'loading');
        loadingDiv.id = 'loading-indicator';
        chatDisplayArea.appendChild(loadingDiv);
        chatDisplayArea.scrollTop = chatDisplayArea.scrollHeight;

        userInputText.disabled = true;
        voiceInputBtn.disabled = true;

        try {
            const response = await fetch('/send_message', { 
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: message })
            });

            const data = await response.json();

            chatDisplayArea.removeChild(document.getElementById('loading-indicator'));

            if (response.ok) {
                appendMessage(data.response, 'bot');
            } else {
                appendMessage(`Erreur : ${data.error || 'Erreur inconnue'}`, 'bot');
            }
        } catch (error) {
            const indicator = document.getElementById('loading-indicator');
            if (indicator) indicator.remove();
            appendMessage(`Erreur de connexion : ${error.message}`, 'bot');
        } finally {
            userInputText.disabled = false;
            voiceInputBtn.disabled = false;
            userInputText.focus();
        }
    }

    window.sendTextMessage = function() {
        const message = userInputText.value.trim();
        if (message) {
            sendToGemini(message);
        }
    }

    userInputText.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault(); 
            window.sendTextMessage();
        }
    });
    
    
    if (SpeechRecognition) {
        recognition = new SpeechRecognition();
        recognition.lang = 'fr-FR'; 
        recognition.interimResults = false; 
        recognition.maxAlternatives = 1; 

        recognition.onstart = () => {
            botStatus.textContent = "Écoute en cours...";
            voiceInputBtn.classList.add('recording');
        };

        recognition.onresult = (event) => {
            const last = event.results.length - 1;
            const userSpeech = event.results[last][0].transcript;
            
            sendToGemini(userSpeech); 
            
            botStatus.textContent = "Traitement de votre message...";
            voiceInputBtn.classList.remove('recording');
            voiceInputBtn.disabled = true; 
        };

        recognition.onerror = (event) => {
            botStatus.textContent = `Erreur vocale. Réessayez.`;
            console.error('Speech Recognition Error:', event.error);
            voiceInputBtn.classList.remove('recording');
            voiceInputBtn.disabled = false;
        };

        recognition.onend = () => {
             if (!voiceInputBtn.disabled) { 
                botStatus.textContent = "ou cliquez sur le micro";
                voiceInputBtn.classList.remove('recording');
            }
        };

    } else {
        botStatus.textContent = "Fonction vocale non supportée.";
        voiceInputBtn.disabled = true;
    }

    if (SpeechSynthesis) {
        synth = SpeechSynthesis;
    }
    
    voiceInputBtn.addEventListener('click', () => {
        if (recognition && !voiceInputBtn.classList.contains('recording')) {
            recognition.start();
        }
    });


    function speakResponse(text) {
        if (synth) {
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = 'fr-FR'; 
            synth.speak(utterance);
        }
    }

});