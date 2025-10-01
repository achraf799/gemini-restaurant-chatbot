import os
from flask import Flask, render_template, request, jsonify
from google import genai
from google.genai.errors import APIError

app = Flask(__name__)

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
chat = None 

SYSTEM_INSTRUCTION = (
    "Vous êtes 'Mon Restaurant IA', un assistant de traiteur. "
    "Vous répondez aux questions sur le menu, les horaires (Mar-Dim: 12h-14h30, 19h-22h30) et les services. "
    "Si l'utilisateur demande un 'devis' ou une 'proposition de menu', vous DEVEZ utiliser la mise en forme Markdown "
    "pour un format structuré et détaillé, incluant des désignations, prix HT, TVA (5.5%) et TTC. "
    "Exemple de format à suivre pour un devis : "
    "\n\n---DEVIS START---\n"
    "Saint-Quentin, le [Date du jour]\n"
    "Date de Validité : 30 jours\n\n"
    "DÉSIGNATIONS DES PRESTATIONS :\n"
    "* Avocat aux Crevettes sauce Aurore - 8.50€ HT\n"
    "* Rôti de Porc cuit (avec Pommes de Terre Piémontaise) - 14.50€ HT\n"
    "* Tarte aux Fruits - 5.00€ HT\n"
    "* Forfait Service à 160.00€ HT pour 8h de Travail\n\n"
    "Lieu : À Définir – Frais Kilométrique selon Secteur\n"
    "Prix par personne HT : [Calcul HT Total]\n"
    "TVA à 5.5% : [Calcul TVA]\n"
    "Prix par personne TTC : [Calcul TTC Total]\n"
    "Votre traiteur, requiert un chèque de caution et la totalité du règlement soient remis 10 jours avant la réception."
    "---DEVIS END---\n\n"
    "Maintenez une tonalité professionnelle."
)

if not GEMINI_API_KEY:
    print("FATAL ERROR: GEMINI_API_KEY variable d'environnement non trouvée. Le Chatbot sera désactivé.")
else:
    try:
        client = genai.Client(api_key=GEMINI_API_KEY)
        
        config = genai.types.GenerateContentConfig(
            system_instruction=SYSTEM_INSTRUCTION
        )

        chat = client.chats.create(
            model="gemini-2.5-flash",
            config=config 
        )
        print("INFO: Client Gemini initialisé avec succès et chatbot prêt.")
        
    except Exception as e:
        print(f"Erreur d'initialisation de l'API Gemini : {e}. Le Chatbot sera désactivé.")
        chat = None

@app.route('/')
def index():
    """Route principale affichant l'interface du restaurant."""
    return render_template('index.html')

@app.route('/send_message', methods=['POST'])
def send_message():
    """Route pour envoyer le message de l'utilisateur à Gemini."""
    
    if chat is None:
        return jsonify({'error': 'Le service chatbot est indisponible (API non configurée).'}), 503

    user_message = request.json.get('message')

    if not user_message:
        return jsonify({'error': 'Message manquant'}), 400

    try:
        response = chat.send_message(user_message)
        
        bot_response = response.text
        
        return jsonify({'response': bot_response})
    
    except APIError as e:
        return jsonify({'error': f"Erreur de l'API Gemini : {e}"}), 500
    except Exception as e:
        return jsonify({'error': f"Une erreur inattendue est survenue : {e}"}), 500

if __name__ == '__main__':
    app.run(debug=True)
