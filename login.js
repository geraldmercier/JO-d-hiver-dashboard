// =============================================================
// FICHIER : login.js
// DESCRIPTION : Logique de la page de connexion
//
// COMMENT ÇA MARCHE :
//   1. L'utilisateur tape son email (@papernest.com)
//   2. On vérifie que l'email est au bon format
//   3. On envoie une demande à Supabase pour créer un "magic link"
//      (un lien spécial envoyé par email qui connecte automatiquement)
//   4. On affiche un message de confirmation
//
// MAGIC LINK = pas besoin de mot de passe !
//   L'utilisateur reçoit un email avec un lien.
//   Il clique dessus et il est connecté. C'est tout.
// =============================================================


// -------------------------------------------------------------
// PARTIE 1 : ATTENDRE QUE LA PAGE SOIT CHARGÉE
//
// document.addEventListener('DOMContentLoaded', ...)
// = "Exécute ce code seulement quand toute la page HTML
//    est chargée et prête à être utilisée"
// -------------------------------------------------------------
document.addEventListener('DOMContentLoaded', function() {

    // -------------------------------------------------------------
    // PARTIE 2 : RÉCUPÉRER LES ÉLÉMENTS DE LA PAGE
    //
    // On cherche les éléments HTML par leur "id" pour pouvoir
    // les manipuler depuis le JavaScript.
    // document.getElementById('nom-du-id') = trouver l'élément avec id="nom-du-id"
    // -------------------------------------------------------------
    const formulaire    = document.getElementById('formulaire-login');
    const champEmail    = document.getElementById('champ-email');
    const btnConnexion  = document.getElementById('btn-connexion');
    const spinner       = document.getElementById('spinner');
    const texteBtn      = document.getElementById('texte-btn');
    const messageErreur = document.getElementById('message-erreur');


    // -------------------------------------------------------------
    // PARTIE 3 : FONCTION DE VALIDATION DE L'EMAIL
    //
    // On vérifie que l'email :
    //   - N'est pas vide
    //   - Se termine par @papernest.com
    //   - A un prénom et un nom avant le @
    //     (format attendu : nom.prénom@papernest.com)
    // -------------------------------------------------------------
    function validerEmail(email) {
        // Vérification 1 : est-ce que le champ est vide ?
        if (!email || email.trim() === '') {
            return { valide: false, message: '📧 Veuillez entrer votre email.' };
        }

        // Vérification 2 : se termine-t-il par @papernest.com ?
        if (!email.toLowerCase().endsWith('@papernest.com')) {
            return {
                valide: false,
                message: '❌ Votre email doit se terminer par @papernest.com'
            };
        }

        // Vérification 3 : y a-t-il un texte avant le @ ?
        // On découpe l'email en deux parties autour du @
        const partiesEmail = email.split('@');
        const partieAvantAt = partiesEmail[0];  // Tout ce qui est avant le @

        if (partieAvantAt.length === 0) {
            return {
                valide: false,
                message: '❌ Format incorrect. Utilisez : prénom.nom@papernest.com'
            };
        }

        // Vérification 4 : y a-t-il un point dans la partie avant le @ ?
        // (pour s'assurer du format prénom.nom)
        if (!partieAvantAt.includes('.')) {
            return {
                valide: false,
                message: '❌ Format attendu : prénom.nom@papernest.com'
            };
        }

        // Si on arrive ici, l'email est valide ! ✅
        return { valide: true, message: '' };
    }


    // -------------------------------------------------------------
    // PARTIE 4 : AFFICHER / CACHER UN MESSAGE D'ERREUR
    //
    // Cette fonction est utilisée pour montrer ou cacher
    // le bloc rouge d'erreur sous le formulaire.
    // -------------------------------------------------------------
    function afficherErreur(texte) {
        messageErreur.textContent = texte;   // Mettre le texte dedans
        messageErreur.classList.add('visible');  // Ajouter la classe "visible" pour l'afficher
    }

    function cacherErreur() {
        messageErreur.classList.remove('visible');  // Retirer la classe pour le cacher
    }


    // -------------------------------------------------------------
    // PARTIE 5 : GÉRER L'ÉTAT DU BOUTON (chargement en cours)
    //
    // Quand on envoie la requête à Supabase, on désactive le bouton
    // et on montre un spinner pour que l'utilisateur sache qu'il
    // doit attendre.
    // -------------------------------------------------------------
    function mettreBoutonEnChargement(enChargement) {
        if (enChargement) {
            // En cours de chargement : désactiver le bouton, montrer le spinner
            btnConnexion.disabled = true;
            texteBtn.style.display = 'none';       // Cacher le texte "Se Connecter"
            spinner.classList.add('actif');          // Montrer le spinner (cercle qui tourne)
        } else {
            // Chargement terminé : réactiver le bouton, cacher le spinner
            btnConnexion.disabled = false;
            texteBtn.style.display = 'inline';     // Remontrer le texte
            spinner.classList.remove('actif');       // Cacher le spinner
        }
    }


    // -------------------------------------------------------------
    // PARTIE 6 : LA FONCTION PRINCIPALE — ENVOYER LE MAGIC LINK
    //
    // Cette fonction s'exécute quand l'utilisateur clique
    // sur le bouton "Se Connecter".
    //
    // Elle fait ces étapes :
    //   1. Récupérer l'email tapé
    //   2. Le valider
    //   3. Envoyer la requête à Supabase
    //   4. Afficher le résultat (succès ou erreur)
    // -------------------------------------------------------------
    async function envoyer_magic_link(event) {

        // "event.preventDefault()" empêche la page de se rafraîchir
        // quand on soumet un formulaire (comportement par défaut du navigateur)
        event.preventDefault();

        // Étape 1 : Récupérer la valeur du champ email
        const emailSaisi = champEmail.value.trim();  // .trim() retire les espaces avant/après

        // Cacher toute erreur précédente
        cacherErreur();

        // Étape 2 : Valider l'email
        const validation = validerEmail(emailSaisi);
        if (!validation.valide) {
            // Si l'email n'est pas valide, on affiche l'erreur et on s'arrête
            afficherErreur(validation.message);
            return;  // "return" = on sort de la fonction ici
        }

        // Étape 3 : Mettre le bouton en mode chargement
        mettreBoutonEnChargement(true);

        try {
            // -------------------------------------------------------------
            // APPEL À SUPABASE — Envoi du Magic Link
            //
            // On fait une requête HTTP POST vers l'API Supabase.
            // "fetch" est une fonction du navigateur pour faire des
            // requêtes réseau.
            //
            // POST /magiclink signifie : "envoie un magic link à cet email"
            // -------------------------------------------------------------
            const reponse = await fetch(
                SUPABASE_CONFIG.URL + '/supabase/v1/magiclink',
                {
                    method: 'POST',                    // Type de requête
                    headers: {                         // En-têtes de la requête
                        'Content-Type': 'application/json',   // On envoie du JSON
                        'apikey': SUPABASE_CONFIG.KEY,         // Notre clé API
                    },
                    body: JSON.stringify({             // Le corps de la requête (en JSON)
                        email: emailSaisi
                    })
                }
            );

            // -------------------------------------------------------------
            // GÉRER LA RÉPONSE DE SUPABASE
            //
            // reponse.ok = true si Supabase a répondu avec succès (code 200)
            // reponse.ok = false s'il y a eu une erreur
            // -------------------------------------------------------------
            if (reponse.ok) {
                // ✅ SUCCÈS ! Le magic link a été envoyé.
                // On remplace tout le formulaire par un message de confirmation.
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
                            Le lien est valable pendant <strong>10 minutes</strong>.<br>
                            Si vous ne le trouvez pas, regardez dans les <em>Spam</em>.
                        </p>
                        <button 
                            onclick="location.reload()" 
                            style="margin-top: 24px; padding: 10px 24px; background: var(--bleu-sombre); color: white; border: none; border-radius: 8px; font-size: 14px; cursor: pointer; border-radius: var(--arrondi-petit);"
                        >
                            ← Retour
                        </button>
                    </div>
                `;
            } else {
                // ❌ ERREUR de Supabase
                // On essaie de lire le message d'erreur retourné
                let messageErreurTexte = 'Une erreur est survenue. Réessayez dans quelques instants.';
                try {
                    const donneeErreur = await reponse.json();
                    if (donneeErreur && donneeErreur.msg) {
                        messageErreurTexte = donneeErreur.msg;
                    }
                } catch (e) {
                    // Si on ne peut pas lire l'erreur, on garde le message par défaut
                }
                afficherErreur('❌ ' + messageErreurTexte);
                mettreBoutonEnChargement(false);
            }

        } catch (erreur) {
            // -------------------------------------------------------------
            // ERREUR RÉSEAU
            // Cette partie s'exécute si le navigateur ne peut pas
            // joindre Supabase (ex: pas d'Internet, URL incorrecte)
            // -------------------------------------------------------------
            console.error('Erreur réseau :', erreur);  // Afficher dans la console pour débogage
            afficherErreur('🌐 Impossible de se connecter au serveur. Vérifiez votre connexion Internet.');
            mettreBoutonEnChargement(false);
        }
    }


    // -------------------------------------------------------------
    // PARTIE 7 : CONNECTER LE BOUTON À LA FONCTION
    //
    // On dit au navigateur : "Quand quelqu'un soumet le formulaire,
    // appelle la fonction envoyer_magic_link"
    // -------------------------------------------------------------
    formulaire.addEventListener('submit', envoyer_magic_link);


    // -------------------------------------------------------------
    // PARTIE 8 : FOCUS AUTOMATIQUE SUR LE CHAMP EMAIL
    //
    // Quand la page se charge, on met automatiquement le curseur
    // dans le champ email pour que l'utilisateur puisse taper
    // immédiatement.
    // -------------------------------------------------------------
    champEmail.focus();

});  // Fin du document.addEventListener('DOMContentLoaded')
