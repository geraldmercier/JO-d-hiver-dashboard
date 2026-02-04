// =============================================================
// DASHBOARD AGENT - VERSION CORRIGÉE
// =============================================================

console.log('🏔️ Dashboard Agent - Chargement...');

// Initialisation sécurisée
const supabase = window.supabase.createClient(SUPABASE_CONFIG.URL, SUPABASE_CONFIG.KEY);

let utilisateurActuel = null;
let tousLesAgents = [];
let tousLesContrats = [];

// -------------------------------------------------------------
// INITIALISATION
// -------------------------------------------------------------
document.addEventListener('DOMContentLoaded', async function() {
    
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) {
        console.error('❌ Utilisateur non connecté');
        window.location.href = 'connexion-finale.html';
        return;
    }

    console.log('✅ Utilisateur connecté:', user.email);

    // Charger les données
    await chargerDonneesUtilisateur(user.id);
    await chargerTousLesAgents();
    await chargerTousLesContrats();

    // Afficher toutes les sections
    afficherInformationsHeader();
    await calculerEtAfficherClassement();
    await calculerEtAfficherSkiFond();
    await calculerEtAfficherPerformanceJour();
    await calculerEtAfficherEquipe();
    await chargerContratsJour();
    await afficherCalendrierReel();
    await afficherBadgesReels();

    // Event Listeners
    const form = document.getElementById('formulaire-contrat');
    if(form) form.addEventListener('submit', enregistrerContrat);
    
    const btnDeco = document.getElementById('btn-deconnexion');
    if(btnDeco) btnDeco.addEventListener('click', deconnexion);

    console.log('✅ Dashboard initialisé');
});

// -------------------------------------------------------------
// CHARGEMENT DES DONNÉES
// -------------------------------------------------------------
async function chargerDonneesUtilisateur(userId) {
    const { data, error } = await supabase
        .from('users')
        .select(`*, equipes (nom, drapeau)`)
        .eq('id', userId)
        .single();

    if (error) console.error(error);
    else utilisateurActuel = data;
}

async function chargerTousLesAgents() {
    const { data } = await supabase
        .from('users')
        .select(`*, equipes (nom, drapeau)`)
        .eq('role', 'agent');
    tousLesAgents = data || [];
}

async function chargerTousLesContrats() {
    const { data } = await supabase
        .from('contrats')
        .select('*')
        .eq('statut', 'valide');
    tousLesContrats = data || [];
}

// -------------------------------------------------------------
// AFFICHAGE HEADER
// -------------------------------------------------------------
function afficherInformationsHeader() {
    if (!utilisateurActuel) return;
    document.getElementById('nom-agent').textContent = utilisateurActuel.prenom + ' ' + utilisateurActuel.nom;
    document.getElementById('equipe-agent').textContent = 'Équipe ' + utilisateurActuel.equipes.nom + ' ' + utilisateurActuel.equipes.drapeau;
    document.getElementById('cellule-agent').textContent = utilisateurActuel.cellule;
    if (utilisateurActuel.avatar_url) document.getElementById('avatar-agent').src = utilisateurActuel.avatar_url;
}

// -------------------------------------------------------------
// CALCULS & KPI
// -------------------------------------------------------------
async function calculerEtAfficherClassement() {
    const agentsAvecScores = tousLesAgents.map(agent => {
        const contratsAgent = tousLesContrats.filter(c => c.agent_id === agent.id);
        return { ...agent, score: contratsAgent.length * 10 };
    });

    agentsAvecScores.sort((a, b) => b.score - a.score);

    const maPositionGlobale = agentsAvecScores.findIndex(a => a.id === utilisateurActuel.id) + 1;
    document.getElementById('rang-global').textContent = `${maPositionGlobale}ème/${agentsAvecScores.length}`;

    const agentsMonEquipe = agentsAvecScores.filter(a => a.equipe_id === utilisateurActuel.equipe_id);
    const maPositionEquipe = agentsMonEquipe.findIndex(a => a.id === utilisateurActuel.id) + 1;
    document.getElementById('rang-equipe').textContent = `${maPositionEquipe}ème/${agentsMonEquipe.length}`;

    // Points manquants
    if (maPositionGlobale > 1) {
        const agentDevant = agentsAvecScores[maPositionGlobale - 2];
        const monScore = agentsAvecScores[maPositionGlobale - 1].score;
        const pointsManquants = agentDevant.score - monScore + 10; // +1 contrat
        document.getElementById('points-manquants').textContent = `${pointsManquants} pts pour monter`;
    } else {
        document.getElementById('points-manquants').textContent = '🥇 Vous êtes 1er !';
    }
}

async function calculerEtAfficherSkiFond() {
    const cellule = utilisateurActuel.cellule;
    let kpi = 'Volume', valeur = '0';
    const mesContrats = tousLesContrats.filter(c => c.agent_id === utilisateurActuel.id);

    if (cellule === 'Mover') {
        kpi = 'Taux de Rétention';
        const contratsRetention = mesContrats.filter(c => ['Telco', 'MRH'].includes(c.type_contrat));
        valeur = mesContrats.length > 0 ? Math.round((contratsRetention.length / mesContrats.length) * 100) + '%' : '0%';
    } else if (cellule === 'Switcher') {
        kpi = 'Volume Homeserve';
        valeur = mesContrats.filter(c => ['Mobile', 'Compensation Carbone'].includes(c.type_contrat)).length;
    } else if (cellule === 'Coach') {
        kpi = 'Volume Premium';
        valeur = mesContrats.filter(c => c.type_contrat === 'Premium').length;
    } else {
        kpi = 'Contrats Total';
        valeur = mesContrats.length;
    }
    
    document.querySelector('.kpi-label').textContent = kpi;
    document.getElementById('ski-fond-valeur').textContent = valeur;
}

async function calculerEtAfficherPerformanceJour() {
    const aujourdhui = window.getAujourdhui(); // Utilisation de la date corrigée

    const mesContratsJour = tousLesContrats.filter(c => c.agent_id === utilisateurActuel.id && c.created_at.startsWith(aujourdhui));
    const monScoreJour = mesContratsJour.length * 10;

    // Classement jour
    const scoresJour = tousLesAgents.map(agent => {
        const contratsJour = tousLesContrats.filter(c => c.agent_id === agent.id && c.created_at.startsWith(aujourdhui));
        return { id: agent.id, score: contratsJour.length * 10 };
    });
    scoresJour.sort((a, b) => b.score - a.score);
    const maPositionJour = scoresJour.findIndex(s => s.id === utilisateurActuel.id) + 1;

    document.getElementById('score-jour').textContent = monScoreJour + ' pts';
    document.getElementById('classement-jour').textContent = maPositionJour + 'ème';
}

async function calculerEtAfficherEquipe() {
    const agentsEquipe = tousLesAgents.filter(a => a.equipe_id === utilisateurActuel.equipe_id);
    
    // Score équipe total
    let scoreEquipe = 0;
    agentsEquipe.forEach(agent => {
        const nb = tousLesContrats.filter(c => c.agent_id === agent.id).length;
        scoreEquipe += (nb * 10);
    });
    document.getElementById('score-equipe').textContent = scoreEquipe.toLocaleString() + ' pts';

    // Top 3 Équipe
    const classementEquipe = agentsEquipe.map(agent => ({
        ...agent,
        score: tousLesContrats.filter(c => c.agent_id === agent.id).length * 10
    })).sort((a, b) => b.score - a.score).slice(0, 3);

    const top3Html = classementEquipe.map(agent => `
        <li ${agent.id === utilisateurActuel.id ? 'class="vous"' : ''}>
            <span class="top3-nom">${agent.id === utilisateurActuel.id ? 'Vous' : agent.prenom}</span>
            <span class="top3-score">${agent.score} pts</span>
        </li>
    `).join('');
    document.getElementById('top3-equipe').innerHTML = top3Html;
}

// -------------------------------------------------------------
// GESTION CONTRATS
// -------------------------------------------------------------
async function chargerContratsJour() {
    const aujourdhui = window.getAujourdhui();
    
    // Note: On charge aussi les "en_attente" pour l'affichage personnel
    const { data: contrats } = await supabase
        .from('contrats')
        .select('*')
        .eq('agent_id', utilisateurActuel.id)
        .gte('created_at', aujourdhui + 'T00:00:00')
        .order('created_at', { ascending: false });

    const liste = document.getElementById('contrats-liste');
    liste.innerHTML = '';
    
    if (!contrats || contrats.length === 0) {
        liste.innerHTML = '<div class="contrat-vide">Aucun contrat aujourd\'hui</div>';
        return;
    }

    contrats.forEach(contrat => {
        const div = document.createElement('div');
        div.className = 'contrat-item';
        const icone = {'Telco':'📞','Mobile':'📱','MRH':'🏠','Premium':'⭐'}[contrat.type_contrat] || '📄';
        const statut = contrat.statut === 'valide' ? '✅' : '⏳';
        
        div.innerHTML = `
            <span class="contrat-icone">${icone}</span>
            <div class="contrat-info">
                <span class="contrat-type">${contrat.type_contrat} ${contrat.api_app ? '(APP)' : ''}</span>
                <span class="contrat-heure">${new Date(contrat.created_at).toLocaleTimeString('fr-FR', {hour:'2-digit', minute:'2-digit'})}</span>
            </div>
            <div class="contrat-actions">
                <span>${statut}</span>
                ${contrat.statut === 'en_attente' ? `<button onclick="supprimerContrat('${contrat.id}')">🗑️</button>` : ''}
            </div>
        `;
        liste.appendChild(div);
    });
}

async function enregistrerContrat(event) {
    event.preventDefault();
    const btn = document.getElementById('btn-enregistrer');
    btn.disabled = true;
    document.getElementById('btn-texte').textContent = 'Enregistrement...';

    try {
        const { error } = await supabase.from('contrats').insert({
            agent_id: utilisateurActuel.id,
            type_contrat: document.getElementById('type-contrat').value,
            lien_piste: document.getElementById('lien-piste').value,
            api_app: document.getElementById('contrat-apiapp').checked,
            statut: 'en_attente' // Toujours en attente par défaut
        });

        if (error) throw error;

        document.getElementById('formulaire-contrat').reset();
        document.getElementById('message-succes').style.display = 'block';
        setTimeout(() => document.getElementById('message-succes').style.display = 'none', 3000);
        
        await chargerContratsJour(); // Rafraichir la liste
    } catch (error) {
        alert('Erreur: ' + error.message);
    } finally {
        btn.disabled = false;
        document.getElementById('btn-texte').textContent = '✅ Enregistrer';
    }
}

// Fonction globale pour le onclick
window.supprimerContrat = async function(id) {
    if(!confirm('Supprimer ce contrat ?')) return;
    await supabase.from('contrats').delete().eq('id', id);
    await chargerContratsJour();
};

async function deconnexion() {
    await supabase.auth.signOut();
    window.location.href = 'connexion-finale.html';
}

// NOTE: Le code de calcul automatique "verifierEtAttribuerChallenges" a été supprimé.
// Cette logique doit être dans une Edge Function Supabase, pas ici.