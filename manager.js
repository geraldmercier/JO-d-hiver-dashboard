// =============================================================
// MANAGER - VERSION CORRIGÉE (Fix Colonne Drapeau)
// =============================================================

console.log('👔 Dashboard Manager - Chargement...');

const { createClient } = window.supabase;
const sb = createClient(SUPABASE_CONFIG.URL, SUPABASE_CONFIG.KEY);

let managerActuel = null;
let equipeActuelle = null;
let tousLesAgents = [];
let tousLesContrats = [];

// -------------------------------------------------------------
// INITIALISATION
// -------------------------------------------------------------
document.addEventListener('DOMContentLoaded', async function() {
    
    const { data: { user }, error } = await sb.auth.getUser();
    
    if (error || !user) {
        console.error('❌ Utilisateur non connecté');
        window.location.href = 'connexion-finale.html';
        return;
    }

    // 1. Charger le manager (C'est ici que ça plantait avant)
    await chargerDonneesManager(user.id);

    // 2. Vérification de sécurité
    if (!managerActuel || (managerActuel.role !== 'manager' && managerActuel.role !== 'admin')) {
        alert('❌ Accès refusé. Réservé aux managers.');
        window.location.href = 'dashboard.html';
        return;
    }

    // 3. Charger le reste
    await chargerTousLesAgents();
    await chargerTousLesContrats();

    afficherInformationsHeader();
    await calculerPerformanceEquipe();
    await chargerContratsAttente();
    await chargerAgentsEquipe();

    document.getElementById('btn-vue-plateau').addEventListener('click', function() {
        window.location.href = 'plateau.html';
    });

    if (managerActuel.role === 'admin') {
        initialiserMenuEquipes();
    }

    document.getElementById('btn-deconnexion').addEventListener('click', deconnexion);

    console.log('✅ Dashboard Manager initialisé');
});


// -------------------------------------------------------------
// CHARGER DONNÉES MANAGER
// -------------------------------------------------------------
async function chargerDonneesManager(userId) {
    try {
        // CORRECTION : on demande 'drapeau_emoji'
        const { data, error } = await sb
            .from('users')
            .select(`*, equipes (id, nom, drapeau_emoji)`) 
            .eq('id', userId)
            .single();

        if (error) throw error;

        managerActuel = data;
        equipeActuelle = data.equipes;
        console.log('✅ Manager chargé:', managerActuel);

    } catch (error) {
        console.error('❌ Erreur chargement manager:', error);
    }
}


// -------------------------------------------------------------
// CHARGER TOUS LES AGENTS
// -------------------------------------------------------------
async function chargerTousLesAgents() {
    try {
        const { data, error } = await sb
            .from('users')
            .select('*')
            .eq('role', 'agent');

        if (error) throw error;
        tousLesAgents = data;

    } catch (error) {
        console.error('❌ Erreur chargement agents:', error);
    }
}


// -------------------------------------------------------------
// CHARGER TOUS LES CONTRATS
// -------------------------------------------------------------
async function chargerTousLesContrats() {
    try {
        const { data, error } = await sb
            .from('contrats')
            .select('*');

        if (error) throw error;
        tousLesContrats = data;

    } catch (error) {
        console.error('❌ Erreur chargement contrats:', error);
    }
}


// -------------------------------------------------------------
// AFFICHER HEADER
// -------------------------------------------------------------
function afficherInformationsHeader() {
    if (!managerActuel) return;

    document.getElementById('nom-manager').textContent = 
        managerActuel.prenom + ' ' + managerActuel.nom;
    
    const roleText = managerActuel.role === 'admin' ? 'Administrateur' : 'Manager';
    // CORRECTION : drapeau_emoji
    const drapeau = equipeActuelle ? (equipeActuelle.drapeau_emoji || '🏳️') : '';
    const nomEquipe = equipeActuelle ? equipeActuelle.nom : 'Aucune';
    
    document.getElementById('equipe-manager').textContent = 
        `${roleText} — Équipe ${nomEquipe} ${drapeau}`;
}


// -------------------------------------------------------------
// CALCULER PERFORMANCE ÉQUIPE
// -------------------------------------------------------------
async function calculerPerformanceEquipe() {
    if (!equipeActuelle) return;

    const agentsEquipe = tousLesAgents.filter(a => a.equipe_id === equipeActuelle.id);
    const contratsEquipe = tousLesContrats.filter(c => 
        c.statut === 'valide' && 
        agentsEquipe.find(a => a.id === c.agent_id)
    );

    const scoreTotal = contratsEquipe.length * 10;
    const nbContratsValides = contratsEquipe.length;

    document.getElementById('score-equipe-total').textContent = scoreTotal.toLocaleString() + ' pts';
    document.getElementById('contrats-valides').textContent = nbContratsValides;

    // Calculer position équipe
    const { data: equipes } = await sb.from('equipes').select('*');
    if (equipes) {
        const scoresEquipes = equipes.map(eq => {
            const agentsEq = tousLesAgents.filter(a => a.equipe_id === eq.id);
            const contratsEq = tousLesContrats.filter(c => 
                c.statut === 'valide' && 
                agentsEq.find(a => a.id === c.agent_id)
            );
            return { equipeId: eq.id, score: contratsEq.length * 10 };
        });

        scoresEquipes.sort((a, b) => b.score - a.score);
        const position = scoresEquipes.findIndex(s => s.equipeId === equipeActuelle.id) + 1;
        document.getElementById('position-equipe').textContent = `${position}ème/${equipes.length}`;
    }
}


// -------------------------------------------------------------
// CHARGER CONTRATS EN ATTENTE
// -------------------------------------------------------------
async function chargerContratsAttente() {
    try {
        const agentsEquipe = tousLesAgents.filter(a => a.equipe_id === equipeActuelle.id);
        const contratsAttente = tousLesContrats.filter(c => 
            c.statut === 'en_attente' && 
            agentsEquipe.find(a => a.id === c.agent_id)
        );

        const liste = document.getElementById('contrats-attente-liste');
        const badge = document.getElementById('badge-attente');
        
        if (contratsAttente.length === 0) {
            liste.innerHTML = '<div class="aucun-contrat">✅ Aucun contrat en attente</div>';
            badge.style.display = 'none';
            return;
        }

        badge.textContent = contratsAttente.length;
        badge.style.display = 'inline-block';

        liste.innerHTML = '';
        contratsAttente.forEach(contrat => {
            const agent = agentsEquipe.find(a => a.id === contrat.agent_id);
            if (!agent) return;

            const div = document.createElement('div');
            div.className = 'contrat-attente-item';
            
            const date = new Date(contrat.created_at);
            const dateText = date.toLocaleDateString('fr-FR');
            
            const icones = {'Telco':'📞', 'Mobile':'📱', 'MRH':'🏠', 'Premium':'⭐', 'Compensation Carbone':'🌱'};
            const icone = icones[contrat.type_contrat] || '📄';

            div.innerHTML = `
                <div class="contrat-attente-info">
                    <div class="contrat-attente-agent">
                        <strong>${agent.prenom} ${agent.nom}</strong>
                        <span class="cellule-badge">${agent.cellule}</span>
                    </div>
                    <div class="contrat-attente-details">
                        ${icone} ${contrat.type_contrat} • ${dateText}
                        ${contrat.api_app ? '<span class="badge-apiapp">📱 ApiApp</span>' : ''}
                    </div>
                    <a href="${contrat.lien_piste}" class="contrat-lien" target="_blank">🔗 Voir la piste</a>
                </div>
                <div class="contrat-attente-actions">
                    <button class="btn-valider" onclick="validerContrat('${contrat.id}')">✅</button>
                    <button class="btn-rejeter" onclick="rejeterContrat('${contrat.id}')">❌</button>
                </div>
            `;
            liste.appendChild(div);
        });

    } catch (error) {
        console.error('❌ Erreur chargement contrats:', error);
    }
}


// -------------------------------------------------------------
// VALIDER / REJETER (Global)
// -------------------------------------------------------------
window.validerContrat = async function(contratId) {
    try {
        const { error } = await sb
            .from('contrats')
            .update({
                statut: 'valide',
                valide_par: managerActuel.id,
                valide_le: new Date().toISOString()
            })
            .eq('id', contratId);

        if (error) throw error;
        
        await Promise.all([
            chargerTousLesContrats(),
            calculerPerformanceEquipe(),
            chargerContratsAttente(),
            chargerAgentsEquipe()
        ]);

    } catch (error) {
        alert('❌ Erreur validation: ' + error.message);
    }
};

window.rejeterContrat = async function(contratId) {
    const raison = prompt('⚠️ Raison du rejet :');
    if (!raison) return;

    try {
        const { error } = await sb
            .from('contrats')
            .update({
                statut: 'rejete',
                valide_par: managerActuel.id,
                valide_le: new Date().toISOString(),
                commentaire: raison
            })
            .eq('id', contratId);

        if (error) throw error;

        await Promise.all([
            chargerTousLesContrats(),
            calculerPerformanceEquipe(),
            chargerContratsAttente(),
            chargerAgentsEquipe()
        ]);

    } catch (error) {
        alert('❌ Erreur rejet: ' + error.message);
    }
};


// -------------------------------------------------------------
// CHARGER AGENTS ÉQUIPE
// -------------------------------------------------------------
async function chargerAgentsEquipe() {
    try {
        const agentsEquipe = tousLesAgents.filter(a => a.equipe_id === equipeActuelle.id);

        const agentsAvecScores = agentsEquipe.map(agent => {
            const contratsAgent = tousLesContrats.filter(c => c.agent_id === agent.id && c.statut === 'valide');
            return {
                ...agent,
                nbContrats: contratsAgent.length,
                score: contratsAgent.length * 10
            };
        });

        agentsAvecScores.sort((a, b) => b.score - a.score);

        const tbody = document.getElementById('tableau-agents-body');
        tbody.innerHTML = '';

        agentsAvecScores.forEach((agent, index) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${index + 1}</td>
                <td>${agent.prenom} ${agent.nom}</td>
                <td><span class="cellule-badge">${agent.cellule}</span></td>
                <td class="score-cell">${agent.score} pts</td>
                <td>${agent.nbContrats}</td>
                <td>
                    <button class="btn-actions" title="Voir détails">👁️</button>
                </td>
            `;
            tbody.appendChild(tr);
        });

    } catch (error) {
        console.error('❌ Erreur chargement agents:', error);
    }
}


// -------------------------------------------------------------
// MENU ÉQUIPES (ADMIN)
// -------------------------------------------------------------
function initialiserMenuEquipes() {
    document.getElementById('dropdown-equipes-admin').style.display = 'block';

    sb.from('equipes').select('*').order('id')
        .then(({ data: equipes }) => {
            const menu = document.getElementById('menu-equipes-admin');
            menu.innerHTML = '';
            equipes.forEach(equipe => {
                const div = document.createElement('div');
                div.className = 'dropdown-item';
                // CORRECTION : drapeau_emoji ici aussi
                const drapeau = equipe.drapeau_emoji || '🚩';
                div.textContent = `${drapeau} Équipe ${equipe.nom}`;
                div.onclick = () => window.location.href = `manager.html?equipe=${equipe.id}`;
                menu.appendChild(div);
            });
        });
}


// -------------------------------------------------------------
// DÉCONNEXION
// -------------------------------------------------------------
async function deconnexion() {
    if (confirm('Se déconnecter ?')) {
        await sb.auth.signOut();
        window.location.href = 'connexion-finale.html';
    }
}