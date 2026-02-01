// =============================================================
// FICHIER : login.js
// DESCRIPTION : Logique de la page de connexion
//
// COMMENT ÇA MARCHE :
//   1. On charge la bibliothèque Supabase depuis un CDN
//   2. L'utilisateur tape son email (@papernest.com)
//   3. On vérifie que l'email est au bon format
//   4. On utilise Supabase Auth pour envoyer un magic link
//   5. On affiche un message de confirmation
// =============================================================


// -------------------------------------------------------------
// PARTIE 1 : ATTENDRE QUE LA PAGE SOIT CHARGÉE
// -------------------------------------------------------------
document.addEventListener('DOMContentLoaded', function() {

    // -------------------------------------------------------------
    // PARTIE 2 : INITIALISER SUPABASE
    //
    // On crée une connexion à Supabase en utilisant nos identifiants
    // du fichier config.js
    // -------------------------------------------------------------
    const supabase = window.supabase.createClient(
        SUPABASE_CONFIG.URL,
        SUPABASE_CONFIG.KEY
    );

    // -------------------------------------------------------------
    // PARTIE 3 : RÉCUPÉRER LES ÉLÉMENTS DE LA PAGE
    // -------------------------------------------------------------
    const formulaire    = document.getElementById('formulaire-login');
    const champEmail    = document.getElementById('champ-email');
    const btnConnexion  = document.getElementById('btn-connexion');
    const spinner       = document.getElementById('spinner');
    const texteBtn      = document.getElementById('texte-btn');
    const messageErreur = document.getElementById('message-erreur');


    // -------------------------------------------------------------
    // PARTIE 4 : FONCTION DE VALIDATION DE L'EMAIL
    // -------------------------------------------------------------
    function validerEmail(email) {
        if (!email || email.trim() === '') {
            return { valide: false, message: '📧 Veuillez entrer votre email.' };
        }

        if (!email.toLowerCase().endsWith('@papernest.com')) {
            return {
                valide: false,
                message: '❌ Votre email doit se terminer par @papernest.com'
            };
        }

        const partiesEmail = email.split('@');
        const partieAvantAt = partiesEmail[0];

        if (partieAvantAt.length === 0) {
            return {
                valide: false,
                message: '❌ Format incorrect. Utilisez : prénom.nom@papernest.com'
            };
        }

        if (!partieAvantAt.includes('.')) {
            return {
                valide: false,
                message: '❌ Format attendu : prénom.nom@papernest.com'
            };
        }

        return { valide: true, message: '' };
    }


    // -------------------------------------------------------------
    // PARTIE 5 : AFFICHER / CACHER UN MESSAGE D'ERREUR
    // -------------------------------------------------------------
    function afficherErreur(texte) {
        messageErreur.textContent = texte;
        messageErreur.classList.add('visible');
    }

    function cacherErreur() {
        messageErreur.classList.remove('visible');
    }


    // -------------------------------------------------------------
    // PARTIE 6 : GÉRER L'ÉTAT DU BOUTON (chargement en cours)
    // -------------------------------------------------------------
    function mettreBoutonEnChargement(enChargement) {
        if (enChargement) {
            btnConnexion.disabled = true;
            texteBtn.style.display = 'none';
            spinner.classList.add('actif');
        } else {
            btnConnexion.disabled = false;
            texteBtn.style.display = 'inline';
            spinner.classList.remove('actif');
        }
    }


    // -------------------------------------------------------------
    // PARTIE 7 : LA FONCTION PRINCIPALE — ENVOYER LE MAGIC LINK
    // -------------------------------------------------------------
    async function envoyerMagicLink(event) {
        event.preventDefault();

        const emailSaisi = champEmail.value.trim();
        cacherErreur();

        // Validation de l'email
        const validation = validerEmail(emailSaisi);
        if (!validation.valide) {
            afficherErreur(validation.message);
            return;
        }

        mettreBoutonEnChargement(true);

        try {
            // -------------------------------------------------------------
            // APPEL À SUPABASE AUTH — Envoi du Magic Link
            //
            // On utilise la méthode officielle signInWithOtp() de Supabase
            // qui envoie automatiquement un email avec un lien magique
            // -------------------------------------------------------------
            const { data, error } = await supabase.auth.signInWithOtp({
                email: emailSaisi,
                options: {
                    // On redirige vers une page de vérification qui décidera où aller
                    emailRedirectTo: window.location.origin + '/auth-callback.html'
                }
            });

            if (error) {
                // ❌ ERREUR de Supabase
                console.error('Erreur Supabase:', error);
                
                let messageErreurTexte = 'Une erreur est survenue.';
                
                // Messages d'erreur personnalisés selon le type
                if (error.message.includes('Email not allowed')) {
                    messageErreurTexte = '❌ Cet email n\'est pas autorisé. Contactez votre administrateur.';
                } else if (error.message.includes('rate limit')) {
                    messageErreurTexte = '⏱️ Trop de tentatives. Attendez quelques minutes.';
                } else {
                    messageErreurTexte = '❌ ' + error.message;
                }
                
                afficherErreur(messageErreurTexte);
                mettreBoutonEnChargement(false);
            } else {
                // ✅ SUCCÈS !
                formulaire.innerHTML = `
                    <div style="text-align: center; padding: 20px 0;">
                        <div style="font-size: 64px; margin-bottom: 16px; animation: pulse-douce 2s ease-in-out infinite;">✉️</div>
                        <h3 style="color: var(--bleu-tres-sombre); font-size: 20px; margin-bottom: 10px;">
                            Email envoyé !
                        </h3>
                        <p style="color: var(--gris-texte); font-size: 14px; line-height: 1.6;">
                            Nous avons envoyé un lien de connexion à :<br>
                            <strong style="color: var(--bleu-sombre);">${emailSaisi}</strong>
                        </p>
                        <p style="color: var(--gris-texte); font-size: 13px; margin-top: 16px; padding: 12px; background: var(--bleu-glace); border-radius: 8px;">
                            📬 Vérifiez votre boîte de réception.<br>
                            Le lien est valable pendant <strong>1 heure</strong>.<br>
                            Si vous ne le trouvez pas, regardez dans les <em>Spam</em>.
                        </p>
                        <button 
                            onclick="location.reload()" 
                            style="margin-top: 24px; padding: 10px 24px; background: var(--bleu-sombre); color: white; border: none; border-radius: 8px; font-size: 14px; cursor: pointer;"
                        >
                            ← Retour
                        </button>
                    </div>
                `;
            }

        } catch (erreur) {
            // -------------------------------------------------------------
            // ERREUR RÉSEAU ou autre erreur inattendue
            // -------------------------------------------------------------
            console.error('Erreur réseau:', erreur);
            afficherErreur('🌐 Impossible de se connecter au serveur. Vérifiez votre connexion Internet.');
            mettreBoutonEnChargement(false);
        }
    }


    // -------------------------------------------------------------
    // PARTIE 8 : CONNECTER LE BOUTON À LA FONCTION
    // -------------------------------------------------------------
    formulaire.addEventListener('submit', envoyerMagicLink);


    // -------------------------------------------------------------
    // PARTIE 9 : FOCUS AUTOMATIQUE SUR LE CHAMP EMAIL
    // -------------------------------------------------------------
    champEmail.focus();

});
