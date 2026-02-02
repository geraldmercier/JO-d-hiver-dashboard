// Login v3 - Version finale absolue
console.log('Login v3 chargé');

let emailSaisi = '';

document.addEventListener('DOMContentLoaded', function() {
    
    // Utiliser window.supabase créé par config.js
    const supaClient = window.supabase.createClient(SUPABASE_CONFIG.URL, SUPABASE_CONFIG.KEY);

    const formEtape1 = document.getElementById('form-etape1');
    const formPremiereConnexion = document.getElementById('form-premiere-connexion');
    const formConnexionNormale = document.getElementById('form-connexion-normale');

    if (formEtape1) {
        formEtape1.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            emailSaisi = document.getElementById('email').value.trim();
            
            if (!emailSaisi.toLowerCase().endsWith('@papernest.com')) {
                afficherErreur('erreur-etape1', 'Email doit se terminer par @papernest.com');
                return;
            }

            cacherErreur('erreur-etape1');
            const btn = document.getElementById('btn-etape1');
            btn.textContent = 'Vérification...';
            btn.disabled = true;

            try {
                const resultat = await supaClient
                    .from('users')
                    .select('id')
                    .eq('email', emailSaisi)
                    .maybeSingle();

                btn.textContent = 'Continuer';
                btn.disabled = false;

                if (resultat.data) {
                    console.log('Utilisateur existant');
                    afficherFormConnexionNormale();
                } else {
                    console.log('Nouvel utilisateur');
                    afficherFormPremiereConnexion();
                }

            } catch (error) {
                console.error('Erreur:', error);
                btn.textContent = 'Continuer';
                btn.disabled = false;
            }
        });
    }

    if (formPremiereConnexion) {
        formPremiereConnexion.addEventListener('submit', async function(e) {
            e.preventDefault();

            const nouveauMdp = document.getElementById('nouveau-mdp').value;
            const confirmMdp = document.getElementById('confirm-mdp').value;

            if (nouveauMdp.length < 8) {
                afficherErreur('erreur-creation', 'Minimum 8 caractères');
                return;
            }

            if (nouveauMdp !== confirmMdp) {
                afficherErreur('erreur-creation', 'Mots de passe différents');
                return;
            }

            cacherErreur('erreur-creation');
            const btn = document.getElementById('btn-creer');
            btn.textContent = 'Création...';
            btn.disabled = true;

            try {
                console.log('Création pour:', emailSaisi);
                
                const authResult = await supaClient.auth.signUp({
                    email: emailSaisi,
                    password: nouveauMdp
                });

                if (authResult.error) throw authResult.error;

                console.log('Auth créé');

                const parts = emailSaisi.split('@')[0].split('.');
                const prenom = parts[0] ? parts[0].charAt(0).toUpperCase() + parts[0].slice(1) : '';
                const nom = parts[1] ? parts[1].toUpperCase() : '';

                await supaClient.from('users').insert({
                    id: authResult.data.user.id,
                    email: emailSaisi,
                    prenom: prenom,
                    nom: nom,
                    role: 'agent',
                    onboarding_complete: false
                });

                console.log('Profil créé');
                
                setTimeout(function() {
                    window.location.href = 'onboarding.html';
                }, 500);

            } catch (error) {
                console.error('Erreur:', error);
                afficherErreur('erreur-creation', error.message);
                btn.textContent = 'Créer mon compte';
                btn.disabled = false;
            }
        });
    }

    if (formConnexionNormale) {
        formConnexionNormale.addEventListener('submit', async function(e) {
            e.preventDefault();

            const mdp = document.getElementById('mdp-connexion').value;
            cacherErreur('erreur-connexion');
            const btn = document.getElementById('btn-connexion');
            btn.textContent = 'Connexion...';
            btn.disabled = true;

            try {
                const resultat = await supaClient.auth.signInWithPassword({
                    email: emailSaisi,
                    password: mdp
                });

                if (resultat.error) {
                    afficherErreur('erreur-connexion', 'Mot de passe incorrect');
                    btn.textContent = 'Se Connecter';
                    btn.disabled = false;
                    return;
                }

                const user = await supaClient.from('users').select('*').eq('id', resultat.data.user.id).single();

                if (!user.data || !user.data.onboarding_complete) {
                    window.location.href = 'onboarding.html';
                } else if (user.data.role === 'manager' || user.data.role === 'admin') {
                    window.location.href = 'manager.html';
                } else {
                    window.location.href = 'dashboard.html';
                }

            } catch (error) {
                afficherErreur('erreur-connexion', 'Erreur');
                btn.textContent = 'Se Connecter';
                btn.disabled = false;
            }
        });
    }

    const btnRetour1 = document.getElementById('btn-retour1');
    const btnRetour2 = document.getElementById('btn-retour2');
    
    if (btnRetour1) btnRetour1.addEventListener('click', retourEtape1);
    if (btnRetour2) btnRetour2.addEventListener('click', retourEtape1);

    function afficherFormPremiereConnexion() {
        document.getElementById('form-etape1').style.display = 'none';
        document.getElementById('form-premiere-connexion').style.display = 'block';
        document.getElementById('form-connexion-normale').style.display = 'none';
    }

    function afficherFormConnexionNormale() {
        document.getElementById('form-etape1').style.display = 'none';
        document.getElementById('form-premiere-connexion').style.display = 'none';
        document.getElementById('form-connexion-normale').style.display = 'block';
    }

    function retourEtape1() {
        document.getElementById('form-etape1').style.display = 'block';
        document.getElementById('form-premiere-connexion').style.display = 'none';
        document.getElementById('form-connexion-normale').style.display = 'none';
    }

    function afficherErreur(id, texte) {
        const elem = document.getElementById(id);
        if (elem) {
            elem.textContent = texte;
            elem.classList.add('visible');
        }
    }

    function cacherErreur(id) {
        const elem = document.getElementById(id);
        if (elem) elem.classList.remove('visible');
    }

    console.log('Login v3 initialisé');
});
