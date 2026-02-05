// =============================================================
// PLATEAU V3 - Leaderboard & Cellules (Fonctionnel)
// =============================================================

console.log('🏔️ Plateau V3 - Démarrage...');

// VARIABLES GLOBALES (Pour que les boutons puissent y accéder)
let donneesGlobales = {
    agents: [],
    contrats: []
};

document.addEventListener('DOMContentLoaded', async function() {

    // 1. Vérification Supabase
    if (typeof supabase === 'undefined') {
        console.error("ERREUR : Supabase non chargé.");
        return;
    }

    const sb = supabase.createClient(SUPABASE_CONFIG.URL, SUPABASE_CONFIG.KEY);

    // 2. Vérification Auth
    const { data: { user } } = await sb.auth.getUser();
    if (!user) { window.location.href = 'index.html'; return; }

    // 3. Mise à jour Header
    const nomElement = document.getElementById('nom-utilisateur');
    const roleElement = document.getElementById('role-utilisateur');
    if (nomElement) nomElement.textContent = `${user.user_metadata.prenom || ''} ${user.user_metadata.nom || ''}`;
    if (roleElement) roleElement.textContent = `Rôle : ${user.user_metadata.role || 'Agent'}`;

    // 4. Chargement des données
    await chargerEtCalculer(sb);

    // 5. Gestion des onglets principaux (Global / Équipes / Cellules)
    activerGestionOnglets();

    // 6. Initialisation de la vue "Par Cellule" (Mover par défaut)
    if (window.changerCellule) {
        window.changerCellule('Mover');
    }
});

// -------------------------------------------------------------
// FONCTIONS DE LOGIQUE
// -------------------------------------------------------------

async function chargerEtCalculer(sb) {
    // Récupération
    const { data: agents } = await sb.from('users').select(`*, equipes (nom, drapeau_emoji)`).eq('role', 'agent');
    const { data: contrats } = await sb.from('contrats').select('*').in('statut', ['valide', 'en_attente']);
    const { data: reussites } = await sb.from('challenge_reussites').select('*').eq('statut', 'valide');
    const { data: equipes } = await sb.from('equipes').select('*');

    // Stockage Global
    donneesGlobales.agents = agents || [];
    donneesGlobales.contrats = contrats || [];

    // Calcul des scores
    donneesGlobales.agents.forEach(agent => {
        agent.scoreTotal = 0;

        // Points Contrats
        const contratsAgent = donneesGlobales.contrats.filter(c => c.agent_id === agent.id);
        contratsAgent.forEach(c => {
            const isFri = c.created_at.includes('2026-02-20');
            agent.scoreTotal += isFri ? 20 : 10;
        });

        // Points Challenges
        const challengesAgent = (reussites || []).filter(r => r.agent_id === agent.id);
        challengesAgent.forEach(r => {
            agent.scoreTotal += (r.points_gagnes || 0);
        });
    });

    // Affichage Initial
    afficherPodium(donneesGlobales.agents);
    afficherTableauGlobal(donneesGlobales.agents, donneesGlobales.contrats);
    afficherClassementEquipes(equipes || [], donneesGlobales.agents);
}

// -------------------------------------------------------------
// FONCTIONS D'AFFICHAGE (GLOBAL & PODIUM)
// -------------------------------------------------------------

function afficherPodium(agents) {
    const top3 = [...agents].sort((a, b) => b.scoreTotal - a.scoreTotal).slice(0, 3);
    updatePodiumSlot(1, top3[0]);
    updatePodiumSlot(2, top3[1]);
    updatePodiumSlot(3, top3[2]);
}

function updatePodiumSlot(rang, agent) {
    if (!agent) return;
    const nomDiv = document.getElementById(`podium-${rang}-nom`);
    const scoreDiv = document.getElementById(`podium-${rang}-score`);
    const equipeDiv = document.getElementById(`podium-${rang}-equipe`);
    
    if (nomDiv) nomDiv.textContent = `${agent.prenom} ${agent.nom}`;
    if (scoreDiv) scoreDiv.textContent = `${agent.scoreTotal} pts`;
    if (equipeDiv) equipeDiv.textContent = agent.equipes?.nom || '';
}

function afficherTableauGlobal(agents, contrats) {
    const tbody = document.getElementById('tableau-global-body');
    if (!tbody) return;

    const classe = [...agents].sort((a, b) => b.scoreTotal - a.scoreTotal);

    tbody.innerHTML = classe.map((agent, index) => {
        const nbContrats = contrats.filter(c => c.agent_id === agent.id).length;
        let medaille = '';
        if (index === 0) medaille = '🥇'; else if (index === 1) medaille = '🥈'; else if (index === 2) medaille = '🥉';

        return `
            <tr>
                <td style="font-weight:bold;">${index + 1}</td>
                <td><strong>${agent.prenom} ${agent.nom}</strong></td>
                <td>${agent.equipes?.drapeau_emoji || ''} ${agent.equipes?.nom || ''}</td>
                <td><span class="badge-cellule">${agent.cellule || '-'}</span></td>
                <td style="color:#FF9F1C; font-weight:bold;">${agent.scoreTotal} pts</td>
                <td>${nbContrats}</td>
                <td>${medaille}</td>
            </tr>
        `;
    }).join('');
}

function afficherClassementEquipes(equipes, agents) {
    const container = document.getElementById('equipes-classement');
    if (!container) return;

    const scoreEquipes = equipes.map(eq => {
        const total = agents.filter(a => a.equipe_id === eq.id).reduce((sum, a) => sum + a.scoreTotal, 0);
        return { ...eq, totalPoints: total };
    }).sort((a, b) => b.totalPoints - a.totalPoints);

    container.innerHTML = scoreEquipes.map((eq, index) => `
        <div class="equipe-card" style="display:flex; justify-content:space-between; padding:15px; background:white; margin-bottom:10px; border-radius:10px; box-shadow:0 2px 4px rgba(0,0,0,0.05); align-items:center;">
            <div style="display:flex; align-items:center; gap:15px;">
                <div style="font-size:1.5em; font-weight:bold; color:#ccc; width:30px;">#${index + 1}</div>
                <div style="font-size:2em;">${eq.drapeau_emoji}</div>
                <div style="font-weight:bold; font-size:1.1em;">${eq.nom}</div>
            </div>
            <div style="font-size:1.5em; font-weight:bold; color:#FF9F1C;">${eq.totalPoints} pts</div>
        </div>
    `).join('');
}

// -------------------------------------------------------------
// ✨ NOUVEAU : GESTION DES CELLULES (Ce qui manquait)
// -------------------------------------------------------------

// Cette fonction est attachée à "window" pour être accessible depuis le HTML onclick="..."
window.changerCellule = function(nomCellule) {
    console.log("Changement de cellule :", nomCellule);

    // 1. Mise à jour visuelle des boutons
    const boutons = document.querySelectorAll('.cellule-tab-btn');
    boutons.forEach(btn => {
        btn.classList.remove('active');
        // On vérifie si le texte du bouton contient le nom de la cellule (ex: "Top Movers")
        if (btn.innerText.includes(nomCellule) || btn.getAttribute('onclick').includes(nomCellule)) {
            btn.classList.add('active');
        }
    });

    // 2. Mise à jour du titre
    const titre = document.getElementById('titre-top-cellule');
    if (titre) titre.textContent = `📞 Top ${nomCellule}s`;

    // 3. Filtrage des agents
    const agentsFiltres = donneesGlobales.agents.filter(a => a.cellule === nomCellule);

    // 4. Affichage du tableau
    afficherTableauCellule(agentsFiltres, donneesGlobales.contrats);
};

function afficherTableauCellule(agents, contrats) {
    const tbody = document.getElementById('tableau-cellule-body');
    if (!tbody) return;

    // Classement par score
    const classe = [...agents].sort((a, b) => b.scoreTotal - a.scoreTotal);

    if (classe.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:20px;">Aucun agent dans cette cellule</td></tr>';
        return;
    }

    tbody.innerHTML = classe.map((agent, index) => {
        const nbContrats = contrats.filter(c => c.agent_id === agent.id).length;
        
        let medaille = '';
        if (index === 0) medaille = '🥇';
        if (index === 1) medaille = '🥈';
        if (index === 2) medaille = '🥉';

        return `
            <tr>
                <td style="font-weight:bold;">${index + 1} ${medaille}</td>
                <td><strong>${agent.prenom} ${agent.nom}</strong></td>
                <td>${agent.equipes?.nom || ''}</td>
                <td style="font-weight:bold; color:#1976D2;">${agent.scoreTotal} pts</td>
                <td>${nbContrats}</td>
            </tr>
        `;
    }).join('');
}

// -------------------------------------------------------------
// UTILITAIRES
// -------------------------------------------------------------

function activerGestionOnglets() {
    const btns = document.querySelectorAll('.tab-btn');
    const contents = document.querySelectorAll('.tab-content');

    btns.forEach(btn => {
        btn.addEventListener('click', () => {
            btns.forEach(b => b.classList.remove('active'));
            contents.forEach(c => c.classList.remove('active'));
            
            btn.classList.add('active');
            const tabId = btn.getAttribute('data-tab');
            const targetContent = document.getElementById(`tab-${tabId}`);
            if (targetContent) targetContent.classList.add('active');
        });
    });
}