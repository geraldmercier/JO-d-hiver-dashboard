// =============================================================
// PLATEAU - VERSION FINALE
// Tous les classements calculés en temps réel
// =============================================================

console.log('🏔️ Vue Plateau FINAL - Chargement...');

let utilisateurActuel = null;
let tousLesAgents = [];
let toutesLesEquipes = [];
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

    await chargerUtilisateur(user.id);

    if (!utilisateurActuel || (utilisateurActuel.role !== 'manager' && utilisateurActuel.role !== 'admin')) {
        alert('❌ Accès refusé. Cette page est réservée aux managers.');
        window.location.href = 'dashboard.html';
        return;
    }

    // Charger toutes les données
    await chargerToutesLesDonnees();

    afficherHeader();
    await calculerEtAfficherClassementGlobal();
    await calculerEtAfficherClassementEquipes();
    await calculerEtAfficherClassementsCellules();
    await chargerChallengesActifs();

    document.getElementById('btn-deconnexion').addEventListener('click', deconnexion);
    
    const btnRetour = document.getElementById('btn-retour-manager');
    if (btnRetour) {
        btnRetour.addEventListener('click', () => window.location.href = 'manager.html');
    }

    const btnCreer = document.getElementById('btn-creer-challenge');
    if (btnCreer && utilisateurActuel.role === 'admin') {
        btnCreer.style.display = 'block';
    }

    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            changerTab(this.dataset.tab);
        });
    });

    console.log('✅ Vue Plateau initialisée');
});


// -------------------------------------------------------------
// CHARGER DONNÉES
// -------------------------------------------------------------
async function chargerUtilisateur(userId) {
    try {
        const { data, error } = await supabase
            .from('users')
            .select(`*, equipes (nom, drapeau)`)
            .eq('id', userId)
            .single();

        if (error) throw error;
        utilisateurActuel = data;

    } catch (error) {
        console.error('❌ Erreur chargement utilisateur:', error);
    }
}

async function chargerToutesLesDonnees() {
    try {
        // Agents
        const { data: agents } = await supabase
            .from('users')
            .select(`*, equipes (nom, drapeau)`)
            .eq('role', 'agent');
        tousLesAgents = agents || [];

        // Équipes
        const { data: equipes } = await supabase
            .from('equipes')
            .select('*')
            .order('id');
        toutesLesEquipes = equipes || [];

        // Contrats validés
        const { data: contrats } = await supabase
            .from('contrats')
            .select('*')
            .eq('statut', 'valide');
        tousLesContrats = contrats || [];

        console.log('✅ Données chargées:', tousLesAgents.length, 'agents,', tousLesContrats.length, 'contrats');

    } catch (error) {
        console.error('❌ Erreur chargement données:', error);
    }
}


// -------------------------------------------------------------
// AFFICHER HEADER
// -------------------------------------------------------------
function afficherHeader() {
    if (!utilisateurActuel) return;

    document.getElementById('nom-utilisateur').textContent = 
        utilisateurActuel.prenom + ' ' + utilisateurActuel.nom;
    
    const roleText = utilisateurActuel.role === 'admin' ? 'Administrateur' : 'Manager';
    document.getElementById('role-utilisateur').textContent = roleText;

    if (utilisateurActuel.role === 'admin') {
        document.getElementById('dropdown-equipes-admin').style.display = 'block';
        initialiserMenuEquipes();
    } else {
        document.getElementById('btn-retour-manager').style.display = 'block';
    }
}


// -------------------------------------------------------------
// CLASSEMENT GLOBAL
// -------------------------------------------------------------
async function calculerEtAfficherClassementGlobal() {
    // Calculer scores
    const agentsAvecScores = tousLesAgents.map(agent => {
        const contratsAgent = tousLesContrats.filter(c => c.agent_id === agent.id);
        return {
            ...agent,
            nbContrats: contratsAgent.length,
            score: contratsAgent.length * 10
        };
    });

    agentsAvecScores.sort((a, b) => b.score - a.score);

    // Afficher podium (top 3)
    for (let i = 0; i < 3 && i < agentsAvecScores.length; i++) {
        const agent = agentsAvecScores[i];
        const place = i + 1;
        
        document.getElementById(`podium-${place}-avatar`).textContent = '👤';
        document.getElementById(`podium-${place}-nom`).textContent = 
            agent.prenom + ' ' + agent.nom.charAt(0) + '.';
        document.getElementById(`podium-${place}-equipe`).textContent = 
            agent.equipes.drapeau + ' ' + agent.equipes.nom;
        document.getElementById(`podium-${place}-score`).textContent = agent.score + ' pts';
    }

    // Afficher tableau complet
    const tbody = document.getElementById('tableau-global-body');
    tbody.innerHTML = '';

    agentsAvecScores.forEach((agent, index) => {
        const tr = document.createElement('tr');
        
        // Médaille pour top 3
        let medaille = '';
        if (index === 0) medaille = '🥇';
        else if (index === 1) medaille = '🥈';
        else if (index === 2) medaille = '🥉';

        tr.innerHTML = `
            <td class="rang-cell">${index + 1}</td>
            <td>
                <div class="agent-cell">
                    <span class="agent-avatar-table">👤</span>
                    <span class="agent-nom-table">${agent.prenom} ${agent.nom}</span>
                </div>
            </td>
            <td><span class="equipe-badge">${agent.equipes.drapeau} ${agent.equipes.nom}</span></td>
            <td>${agent.cellule}</td>
            <td class="score-table">${agent.score}</td>
            <td>${agent.nbContrats}</td>
            <td class="medailles-cell">${medaille}</td>
        `;
        tbody.appendChild(tr);
    });

    console.log('✅ Classement global affiché');
}


// -------------------------------------------------------------
// CLASSEMENT ÉQUIPES
// -------------------------------------------------------------
async function calculerEtAfficherClassementEquipes() {
    // Calculer scores par équipe
    const equipesAvecScores = toutesLesEquipes.map(equipe => {
        const agentsEquipe = tousLesAgents.filter(a => a.equipe_id === equipe.id);
        const contratsEquipe = tousLesContrats.filter(c => 
            agentsEquipe.find(a => a.id === c.agent_id)
        );
        return {
            ...equipe,
            score: contratsEquipe.length * 10,
            nbContrats: contratsEquipe.length
        };
    });

    equipesAvecScores.sort((a, b) => b.score - a.score);

    const container = document.getElementById('equipes-classement');
    container.innerHTML = '';

    equipesAvecScores.forEach((equipe, index) => {
        const div = document.createElement('div');
        div.className = 'equipe-item';
        
        let medaille = '';
        if (index === 0) medaille = '🥇';
        else if (index === 1) medaille = '🥈';
        else if (index === 2) medaille = '🥉';

        div.innerHTML = `
            <div class="equipe-rang">${medaille || (index + 1)}</div>
            <div class="equipe-info">
                <div class="equipe-nom">${equipe.drapeau} ${equipe.nom}</div>
                <div class="equipe-score">${equipe.score} pts (${equipe.nbContrats} contrats)</div>
            </div>
        `;
        container.appendChild(div);
    });

    console.log('✅ Classement équipes affiché');
}


// -------------------------------------------------------------
// CLASSEMENTS PAR CELLULE
// -------------------------------------------------------------
async function calculerEtAfficherClassementsCellules() {
    const cellules = ['Mover', 'Switcher', 'Coach', 'Pépinière'];

    for (const cellule of cellules) {
        const agentsCellule = tousLesAgents.filter(a => a.cellule === cellule);
        
        const agentsAvecScores = agentsCellule.map(agent => {
            const contratsAgent = tousLesContrats.filter(c => c.agent_id === agent.id);
            return {
                ...agent,
                nbContrats: contratsAgent.length,
                score: contratsAgent.length * 10
            };
        });

        agentsAvecScores.sort((a, b) => b.score - a.score);
        const top10 = agentsAvecScores.slice(0, 10);

        const tbodyId = `tableau-${cellule.toLowerCase().replace('é', 'e').replace('è', 'e')}s`;
        const tbody = document.getElementById(tbodyId);
        
        if (!tbody) {
            console.warn(`Tableau ${tbodyId} non trouvé`);
            continue;
        }

        tbody.innerHTML = '';
        
        if (top10.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align: center;">Aucun agent dans cette cellule</td></tr>';
            continue;
        }

        top10.forEach((agent, index) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td class="rang-cell">${index + 1}</td>
                <td>
                    <div class="agent-cell">
                        <span class="agent-avatar-table">👤</span>
                        <span class="agent-nom-table">${agent.prenom} ${agent.nom}</span>
                    </div>
                </td>
                <td>${agent.equipes.drapeau} ${agent.equipes.nom}</td>
                <td class="score-table">${agent.score}</td>
                <td>${agent.nbContrats}</td>
            `;
            tbody.appendChild(tr);
        });
    }

    console.log('✅ Classements cellules affichés');
}


// -------------------------------------------------------------
// CHALLENGES ACTIFS
// -------------------------------------------------------------
async function chargerChallengesActifs() {
    try {
        const { data: challenges, error } = await supabase
            .from('challenges_flash')
            .select('*')
            .eq('statut', 'actif')
            .order('date_debut', { ascending: false });

        if (error) throw error;

        const liste = document.getElementById('challenges-actifs-liste');

        if (!challenges || challenges.length === 0) {
            liste.innerHTML = '<div class="aucun-challenge">Aucun challenge actif pour le moment</div>';
            return;
        }

        liste.innerHTML = '';
        challenges.forEach(ch => {
            const debut = new Date(ch.date_debut).toLocaleString('fr-FR');
            const fin = new Date(ch.date_fin).toLocaleString('fr-FR');

            const div = document.createElement('div');
            div.className = 'challenge-item';
            div.innerHTML = `
                <div class="challenge-info">
                    <div class="challenge-titre">⚡ ${ch.titre}</div>
                    <div class="challenge-details">
                        ${ch.type_challenge} • ${ch.points_attribues} points • ${debut} → ${fin}
                    </div>
                </div>
                <div class="challenge-timer">En cours</div>
            `;
            liste.appendChild(div);
        });

    } catch (error) {
        console.error('❌ Erreur chargement challenges:', error);
    }
}


// -------------------------------------------------------------
// NAVIGATION ONGLETS
// -------------------------------------------------------------
function changerTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });

    document.getElementById('tab-' + tabName).classList.add('active');
    event.currentTarget.classList.add('active');
}


// -------------------------------------------------------------
// MENU ÉQUIPES (ADMIN)
// -------------------------------------------------------------
function initialiserMenuEquipes() {
    supabase
        .from('equipes')
        .select('*')
        .order('id')
        .then(({ data: equipes }) => {
            const menu = document.getElementById('menu-equipes-admin');
            menu.innerHTML = '';

            equipes.forEach(equipe => {
                const div = document.createElement('div');
                div.className = 'dropdown-item';
                div.textContent = `${equipe.drapeau} Équipe ${equipe.nom}`;
                div.onclick = () => window.location.href = `manager.html?equipe=${equipe.id}`;
                menu.appendChild(div);
            });
        });
}


// -------------------------------------------------------------
// DÉCONNEXION
// -------------------------------------------------------------
async function deconnexion() {
    if (confirm('Voulez-vous vraiment vous déconnecter ?')) {
        await supabase.auth.signOut();
        window.location.href = 'connexion-finale.html';
    }
}

console.log('✅ plateau_FINAL.js chargé');
