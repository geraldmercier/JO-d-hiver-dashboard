// =============================================================
// FICHIER : login.js - SYSTÈME INTELLIGENT
// Détecte si première connexion ou pas
// =============================================================

console.log('🔐 Système de connexion intelligent — Chargement...');

let emailSaisi = '';

document.addEventListener('DOMContentLoaded', function() {

    const supabase = window.supabase.createClient(
        SUPABASE_CONFIG.URL,
        SUPABASE_CONFIG.KEY
    );

    // Éléments DOM
    const formEtape1 = document.getElementById('form-etape1');
    const formPremiereConnexion = document.getElementById('form-premiere-connexion');
    const formConnexionNormale = document.getElementById('form-connexion-normale');

    // -------------------------------------------------------------
    // ÉTAPE 1 : Vérifier si l'email existe
    // -------------------------------------------------------------
    formEtape1.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        emailSaisi = document.getElementById('email').value.trim();
        
        // Validation
        if (!emailSaisi.toLowerCase().endsWith('@papernest.com')) {
            afficherErreur('erreur-etape1', '❌ Email doit se terminer par @papernest.com');
            return;
        }

        cacherErreur('erreur-etape1');
        document.getElementById('btn-etape1').textContent = '⏳ Vérification...';
        document.getElementById('btn-etape1').disabled = true;

        try {
            // Vérifier si l'utilisateur existe dans la table users
            const { data: userData, error } = await supabase
                .from('users')
                .select('id, email')
                .eq('email', emailSaisi)
                .maybeSingle();

            document.getElementById('btn-etape1').textContent = 'Continuer →';
            document.getElementById('btn-etape1').disabled = false;

            if (userData) {
                // L'utilisateur existe → Connexion normale
                console.log('✅ Utilisateur existant, connexion normale');
                afficherFormConnexionNormale();
            } else {
                // Nouvel utilisateur → Créer mot de passe
                console.log('✨ Nouvel utilisateur, création mot de passe');
                afficherFormPremiereConnexion();
            }

        } catch (error) {
            console.error('❌ Erreur:', error);
            afficherErreur('erreur-etape1', '❌ Erreur de connexion. Vérifiez votre connexion Internet.');
            document.getElementById('btn-etape1').textContent = 'Continuer →';
            document.getElementById('btn-etape1').disabled = false;
        }
    });

    // -------------------------------------------------------------
    // PREMIÈRE CONNEXION : Créer le compte
    // -------------------------------------------------------------
    formPremiereConnexion.addEventListener('submit', async function(e) {
        e.preventDefault();

        const nouveauMdp = document.getElementById('nouveau-mdp').value;
        const confirmMdp = document.getElementById('confirm-mdp').value;

        // Validation
        if (nouveauMdp.length < 8) {
            afficherErreur('erreur-creation', '❌ Le mot de passe doit contenir au moins 8 caractères');
            return;
        }

        if (nouveauMdp !== confirmMdp) {
            afficherErreur('erreur-creation', '❌ Les mots de passe ne correspondent pas');
            return;
        }

        cacherErreur('erreur-creation');
        document.getElementById('btn-creer').textContent = '⏳ Création du compte...';
        document.getElementById('btn-creer').disabled = true;

        try {
            // 1. Créer le compte dans Supabase Auth
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email: emailSaisi,
                password: nouveauMdp,
                options: {
                    data: {
                        email: emailSaisi
                    }
                }
            });

            if (authError) {
                console.error('❌ Erreur Auth:', authError);
                afficherErreur('erreur-creation', '❌ ' + authError.message);
                document.getElementById('btn-creer').textContent = '✅ Créer mon compte';
                document.getElementById('btn-creer').disabled = false;
                return;
            }

            console.log('✅ Compte Auth créé:', authData.user.email);

            // 2. Créer le profil dans notre table users
            const emailParts = emailSaisi.split('@')[0].split('.');
            const prenom = emailParts[0] ? emailParts[0].charAt(0).toUpperCase() + emailParts[0].slice(1) : '';
            const nom = emailParts[1] ? emailParts[1].toUpperCase() : '';

            const { error: dbError } = await supabase
                .from('users')
                .insert({
                    id: authData.user.id,
                    email: emailSaisi,
                    prenom: prenom,
                    nom: nom,
                    role: 'agent',
                    onboarding_complete: false,
                    created_at: new Date().toISOString()
                });

            if (dbError) {
                console.error('❌ Erreur DB:', dbError);
            }

            console.log('✅ Profil créé, redirection vers onboarding');
            
            // Rediriger vers l'onboarding
            window.location.href = 'onboarding.html';

        } catch (error) {
            console.error('❌ Erreur:', error);
            afficherErreur('erreur-creation', '❌ Erreur : ' + error.message);
            document.getElementById('btn-creer').textContent = '✅ Créer mon compte';
            document.getElementById('btn-creer').disabled = false;
        }
    });

    // -------------------------------------------------------------
    // CONNEXION NORMALE : Se connecter
    // -------------------------------------------------------------
    formConnexionNormale.addEventListener('submit', async function(e) {
        e.preventDefault();

        const mdp = document.getElementById('mdp-connexion').value;

        cacherErreur('erreur-connexion');
        document.getElementById('btn-connexion').textContent = '⏳ Connexion...';
        document.getElementById('btn-connexion').disabled = true;

        try {
            // Connexion
            const { data, error } = await supabase.auth.signInWithPassword({
                email: emailSaisi,
                password: mdp
            });

            if (error) {
                console.error('❌ Erreur connexion:', error);
                
                let message = 'Erreur de connexion';
                if (error.message.includes('Invalid login credentials')) {
                    message = '❌ Mot de passe incorrect';
                } else {
                    message = '❌ ' + error.message;
                }
                
                afficherErreur('erreur-connexion', message);
                document.getElementById('btn-connexion').textContent = 'Se Connecter →';
                document.getElementById('btn-connexion').disabled = false;
                return;
            }

            console.log('✅ Connexion réussie:', data.user.email);

            // Rediriger selon le profil
            await redirigerSelonProfil(data.user.id);

        } catch (error) {
            console.error('❌ Erreur:', error);
            afficherErreur('erreur-connexion', '❌ ' + error.message);
            document.getElementById('btn-connexion').textContent = 'Se Connecter →';
            document.getElementById('btn-connexion').disabled = false;
        }
    });

    // -------------------------------------------------------------
    // BOUTONS RETOUR
    // -------------------------------------------------------------
    document.getElementById('btn-retour1').addEventListener('click', retourEtape1);
    document.getElementById('btn-retour2').addEventListener('click', retourEtape1);

    // -------------------------------------------------------------
    // FONCTIONS UTILITAIRES
    // -------------------------------------------------------------
    function afficherFormPremiereConnexion() {
        formEtape1.style.display = 'none';
        formPremiereConnexion.style.display = 'block';
        formConnexionNormale.style.display = 'none';
        document.getElementById('nouveau-mdp').focus();
    }

    function afficherFormConnexionNormale() {
        formEtape1.style.display = 'none';
        formPremiereConnexion.style.display = 'none';
        formConnexionNormale.style.display = 'block';
        document.getElementById('mdp-connexion').focus();
    }

    function retourEtape1() {
        formEtape1.style.display = 'block';
        formPremiereConnexion.style.display = 'none';
        formConnexionNormale.style.display = 'none';
        cacherErreur('erreur-creation');
        cacherErreur('erreur-connexion');
    }

    function afficherErreur(id, texte) {
        const elem = document.getElementById(id);
        elem.textContent = texte;
        elem.classList.add('visible');
    }

    function cacherErreur(id) {
        const elem = document.getElementById(id);
        elem.classList.remove('visible');
    }

    async function redirigerSelonProfil(userId) {
        try {
            const { data: userData } = await supabase
                .from('users')
                .select('*')
                .eq('id', userId)
                .single();

            if (!userData) {
                window.location.href = 'onboarding.html';
                return;
            }

            if (!userData.onboarding_complete) {
                window.location.href = 'onboarding.html';
                return;
            }

            if (userData.role === 'manager' || userData.role === 'admin') {
                window.location.href = 'manager.html';
            } else {
                window.location.href = 'dashboard.html';
            }

        } catch (error) {
            console.error('❌ Erreur redirection:', error);
            window.location.href = 'dashboard.html';
        }
    }

    console.log('✅ Système de connexion initialisé');
});
