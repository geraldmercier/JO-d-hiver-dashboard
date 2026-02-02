// =============================================================
// FICHIER : dashboard.js - VERSION PRODUCTION
// Connexion Supabase RÉELLE
// =============================================================

console.log('🏔️ Dashboard Agent PRODUCTION — Chargement...');

let utilisateurActuel = null;

// -------------------------------------------------------------
// INITIALISATION
// -------------------------------------------------------------
document.addEventListener('DOMContentLoaded', async function() {
    
    // 1. Vérifier que l'utilisateur est connecté
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) {
        console.error('❌ Utilisateur non connecté');
        window.location.href = 'index.html';
        return;
    }

    console.log('✅ Utilisateur connecté:', user.email);

    // 2. Charger les données de l'utilisateur
    await chargerDonneesUtilisateur(user.id);

    // 3. Initialiser les sections
    afficherInformationsHeader();
    afficherPosition();
    afficherSkiFond();
    afficherPerformanceJour();
    afficherEquipe();
    await chargerContratsJour();
    afficherCalendrier();
    afficherBadges();

    // 4. Initialiser le formulaire
    document.getElementById('formulaire-contrat').addEventListener('submit', enregistrerContrat);

    // 5. Bouton déconnexion
    document.getElementById('btn-deconnexion').addEventListener('click', deconnexion);

    console.log('✅ Dashboard initialisé');
});


// -------------------------------------------------------------
// CHARGER LES DONNÉES DE L'UTILISATEUR
// -------------------------------------------------------------
async function chargerDonneesUtilisateur(userId) {
    try {
        const { data, error } = await supabase
            .from('users')
            .select(`
                *,
                equipes (
                    nom,
                    drapeau
                )
            `)
            .eq('id', userId)
            .single();

        if (error) throw error;

        utilisateurActuel = data;
        console.log('✅ Données utilisateur chargées:', utilisateurActuel);

    } catch (error) {
        console.error('❌ Erreur chargement utilisateur:', error);
        alert('Erreur lors du chargement de vos données');
    }
}


// -------------------------------------------------------------
// AFFICHER LES INFORMATIONS (HEADER)
// -------------------------------------------------------------
function afficherInformationsHeader() {
    if (!utilisateurActuel) return;

    document.getElementById('nom-agent').textContent = 
        utilisateurActuel.prenom + ' ' + utilisateurActuel.nom;
    
    document.getElementById('equipe-agent').textContent = 
        'Équipe ' + utilisateurActuel.equipes.nom + ' ' + utilisateurActuel.equipes.drapeau;
    
    document.getElementById('cellule-agent').textContent = utilisateurActuel.cellule;

    // Avatar
    const avatar = document.getElementById('avatar-agent');
    if (utilisateurActuel.avatar_url) {
        avatar.src = utilisateurActuel.avatar_url;
    }
}


// -------------------------------------------------------------
// AFFICHER LA POSITION
// -------------------------------------------------------------
function afficherPosition() {
    // TODO: Calculer le vrai classement
    document.getElementById('rang-global').textContent = '12ème/50';
    document.getElementById('rang-equipe').textContent = '3ème/10';
    document.getElementById('points-manquants').textContent = '15 pts pour la 2ème place';
}


// -------------------------------------------------------------
// AFFICHER SKI DE FOND
// -------------------------------------------------------------
function afficherSkiFond() {
    if (!utilisateurActuel) return;

    const cellule = utilisateurActuel.cellule;
    let kpi = 'Volume de contrats';
    
    if (cellule === 'Mover') kpi = 'Taux de Rétention (TR)';
    if (cellule === 'Switcher') kpi = 'Volume Homeserve';
    if (cellule === 'Coach') kpi = 'Volume Premium';

    document.querySelector('.kpi-label').textContent = kpi;
    document.getElementById('ski-fond-valeur').textContent = '67%';
}


// -------------------------------------------------------------
// AFFICHER PERFORMANCE DU JOUR
// -------------------------------------------------------------
function afficherPerformanceJour() {
    document.getElementById('score-jour').textContent = '18 pts';
    document.getElementById('classement-jour').textContent = '5ème';
}


// -------------------------------------------------------------
// AFFICHER ÉQUIPE
// -------------------------------------------------------------
function afficherEquipe() {
    if (!utilisateurActuel) return;

    document.getElementById('score-equipe').textContent = '1,247 pts';
    
    // TODO: Charger le vrai top 3
    const top3Html = `
        <li><span class="top3-nom">Sophie Martin</span><span class="top3-score">298 pts</span></li>
        <li><span class="top3-nom">Pierre Dubois</span><span class="top3-score">267 pts</span></li>
        <li class="vous"><span class="top3-nom">Vous</span><span class="top3-score">245 pts</span></li>
    `;
    document.getElementById('top3-equipe').innerHTML = top3Html;
}


// -------------------------------------------------------------
// CHARGER LES CONTRATS DU JOUR
// -------------------------------------------------------------
async function chargerContratsJour() {
    try {
        const aujourdhui = new Date().toISOString().split('T')[0];

        const { data: contrats, error } = await supabase
            .from('contrats')
            .select('*')
            .eq('agent_id', utilisateurActuel.id)
            .gte('created_at', aujourdhui + 'T00:00:00')
            .order('created_at', { ascending: false });

        if (error) throw error;

        const liste = document.getElementById('contrats-liste');
        
        if (!contrats || contrats.length === 0) {
            liste.innerHTML = '<div class="contrat-vide">Aucun contrat enregistré pour aujourd\'hui</div>';
            return;
        }

        liste.innerHTML = '';
        contrats.forEach(contrat => {
            const div = document.createElement('div');
            div.className = 'contrat-item';
            
            const heure = new Date(contrat.created_at).toLocaleTimeString('fr-FR', { 
                hour: '2-digit', 
                minute: '2-digit' 
            });

            const icone = {
                'Telco': '📞',
                'Mobile': '📱',
                'MRH': '🏠',
                'Premium': '⭐',
                'Compensation Carbone': '🌱'
            }[contrat.type_contrat] || '📄';

            div.innerHTML = `
                <span class="contrat-icone">${icone}</span>
                <div class="contrat-info">
                    <span class="contrat-type">${contrat.type_contrat}</span>
                    <span class="contrat-heure">${heure}</span>
                    ${contrat.api_app ? '<span class="badge-apiapp">📱 ApiApp</span>' : ''}
                </div>
                <div class="contrat-actions">
                    <a href="${contrat.lien_piste}" class="contrat-lien" target="_blank" title="Voir la piste">🔗</a>
                    <button class="btn-supprimer-contrat" onclick="supprimerContrat('${contrat.id}')" title="Supprimer">🗑️</button>
                </div>
            `;
            liste.appendChild(div);
        });

        console.log('✅ Contrats chargés:', contrats.length);

    } catch (error) {
        console.error('❌ Erreur chargement contrats:', error);
    }
}


// -------------------------------------------------------------
// ENREGISTRER UN CONTRAT
// -------------------------------------------------------------
async function enregistrerContrat(event) {
    event.preventDefault();

    const typeContrat = document.getElementById('type-contrat').value;
    const lienPiste = document.getElementById('lien-piste').value;
    const apiApp = document.getElementById('contrat-apiapp').checked;

    const btn = document.getElementById('btn-enregistrer');
    btn.disabled = true;
    document.getElementById('btn-texte').textContent = '⏳ Enregistrement...';

    try {
        const { data, error } = await supabase
            .from('contrats')
            .insert({
                agent_id: utilisateurActuel.id,
                type_contrat: typeContrat,
                lien_piste: lienPiste,
                api_app: apiApp,
                statut: 'en_attente',
                created_at: new Date().toISOString()
            })
            .select();

        if (error) throw error;

        console.log('✅ Contrat enregistré:', data);

        // Afficher le message de succès
        const msgSucces = document.getElementById('message-succes');
        msgSucces.textContent = '✅ Contrat enregistré avec succès !';
        msgSucces.style.display = 'block';

        // Réinitialiser le formulaire
        document.getElementById('formulaire-contrat').reset();

        // Recharger la liste
        await chargerContratsJour();

        // Masquer le message après 3 secondes
        setTimeout(() => {
            msgSucces.style.display = 'none';
        }, 3000);

    } catch (error) {
        console.error('❌ Erreur enregistrement:', error);
        const msgErreur = document.getElementById('message-erreur-form');
        msgErreur.textContent = '❌ Erreur : ' + error.message;
        msgErreur.style.display = 'block';
    } finally {
        btn.disabled = false;
        document.getElementById('btn-texte').textContent = '✅ Enregistrer';
    }

    return false;
}


// -------------------------------------------------------------
// SUPPRIMER UN CONTRAT
// -------------------------------------------------------------
async function supprimerContrat(contratId) {
    if (!confirm('⚠️ Supprimer ce contrat ?\n\nCette action est irréversible.')) {
        return;
    }

    try {
        const { error } = await supabase
            .from('contrats')
            .delete()
            .eq('id', contratId);

        if (error) throw error;

        console.log('✅ Contrat supprimé');
        alert('✅ Contrat supprimé avec succès');

        // Recharger la liste
        await chargerContratsJour();

    } catch (error) {
        console.error('❌ Erreur suppression:', error);
        alert('❌ Erreur lors de la suppression');
    }
}


// -------------------------------------------------------------
// AFFICHER LE CALENDRIER
// -------------------------------------------------------------
function afficherCalendrier() {
    // TODO: Charger le vrai calendrier
    const calendrier = [
        { date: '9 Fév', score: 18, medaille: null },
        { date: '10 Fév', score: 22, medaille: '🥉' },
        { date: '11 Fév', score: 15, medaille: null },
        { date: '12 Fév', score: 28, medaille: '🥈' },
        { date: '13 Fév', score: 20, medaille: null },
        { date: '16 Fév', score: 0, medaille: null },
        { date: '17 Fév', score: 0, medaille: null },
        { date: '18 Fév', score: 0, medaille: null },
        { date: '19 Fév', score: 0, medaille: null },
        { date: '20 Fév', score: 0, medaille: null }
    ];

    const grid = document.getElementById('calendrier-grid');
    grid.innerHTML = '';

    calendrier.forEach(jour => {
        const div = document.createElement('div');
        div.className = 'jour-carte' + (jour.score === 0 ? ' jour-futur' : '');
        div.innerHTML = `
            <div class="jour-date">${jour.date}</div>
            <div class="jour-score">${jour.score > 0 ? jour.score + ' pts' : '—'}</div>
            ${jour.medaille ? '<div class="jour-medaille">' + jour.medaille + '</div>' : ''}
        `;
        grid.appendChild(div);
    });
}


// -------------------------------------------------------------
// AFFICHER LES BADGES
// -------------------------------------------------------------
function afficherBadges() {
    // TODO: Charger les vrais badges
    const badges = [
        { nom: 'Premier Contrat', icone: '🎯', deblocque: true },
        { nom: 'Série de 5', icone: '🔥', deblocque: true },
        { nom: 'Top 3 Global', icone: '🏅', deblocque: false },
        { nom: '10 Contrats', icone: '📝', deblocque: false },
        { nom: 'Podium du Jour', icone: '🥇', deblocque: true },
        { nom: 'Équipe Victorieuse', icone: '🏆', deblocque: false }
    ];

    const grid = document.getElementById('badges-grid');
    grid.innerHTML = '';

    badges.forEach(badge => {
        const div = document.createElement('div');
        div.className = 'badge-carte' + (badge.deblocque ? ' badge-deblocque' : ' badge-verrouille');
        div.innerHTML = `
            <div class="badge-icone">${badge.icone}</div>
            <div class="badge-nom">${badge.nom}</div>
        `;
        grid.appendChild(div);
    });
}


// -------------------------------------------------------------
// DÉCONNEXION
// -------------------------------------------------------------
async function deconnexion() {
    if (confirm('Voulez-vous vraiment vous déconnecter ?')) {
        await supabase.auth.signOut();
        window.location.href = 'index.html';
    }
}

console.log('✅ dashboard.js PRODUCTION chargé');
