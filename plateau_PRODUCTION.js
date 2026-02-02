// =============================================================
// FICHIER : plateau.js - VERSION PRODUCTION
// Connexion Supabase RÉELLE
// =============================================================

console.log('🏔️ Vue Plateau PRODUCTION — Chargement...');

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

    // 2. Charger les données utilisateur
    await chargerUtilisateur(user.id);

    // 3. Vérifier les droits (manager ou admin)
    if (!utilisateurActuel || (utilisateurActuel.role !== 'manager' && utilisateurActuel.role !== 'admin')) {
        alert('❌ Accès refusé. Cette page est réservée aux managers.');
        window.location.href = 'dashboard.html';
        return;
    }

    // 4. Afficher le header
    afficherHeader();

    // 5. Charger les classements
    await chargerClassementGlobal();
    await chargerClassementEquipes();
    await chargerClassementCellules();

    // 6. Charger les challenges
    await chargerChallengesActifs();

    // 7. Boutons
    document.getElementById('btn-deconnexion').addEventListener('click', deconnexion);
    
    const btnRetour = document.getElementById('btn-retour-manager');
    if (btnRetour) {
        btnRetour.addEventListener('click', () => window.location.href = 'manager.html');
    }

    const btnCreer = document.getElementById('btn-creer-challenge');
    if (btnCreer && utilisateurActuel.role === 'admin') {
        btnCreer.style.display = 'block';
        btnCreer.addEventListener('click', () => ouvrirModal('modal-challenge'));
    }

    // 8. Navigation onglets
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            changerTab(this.dataset.tab);
        });
    });

    console.log('✅ Vue Plateau initialisée');
});


// -------------------------------------------------------------
// CHARGER UTILISATEUR
// -------------------------------------------------------------
async function chargerUtilisateur(userId) {
    try {
        const { data, error } = await supabase
            .from('users')
            .select(`
                *,
                equipes (nom, drapeau)
            `)
            .eq('id', userId)
            .single();

        if (error) throw error;

        utilisateurActuel = data;
        console.log('✅ Utilisateur chargé:', utilisateurActuel);

    } catch (error) {
        console.error('❌ Erreur chargement utilisateur:', error);
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

    // Afficher le bon bouton selon le rôle
    if (utilisateurActuel.role === 'admin') {
        document.getElementById('dropdown-equipes-admin').style.display = 'block';
        initialiserMenuEquipes();
    } else {
        document.getElementById('btn-retour-manager').style.display = 'block';
    }
}


// -------------------------------------------------------------
// CHARGER CLASSEMENT GLOBAL
// -------------------------------------------------------------
async function chargerClassementGlobal() {
    try {
        // Charger tous les agents avec leurs contrats
        const { data: agents, error: agentsError } = await supabase
            .from('users')
            .select(`
                *,
                equipes (nom, drapeau)
            `)
            .eq('role', 'agent')
            .order('nom');

        if (agentsError) throw agentsError;

        // Charger les contrats validés
        const { data: contrats, error: contratsError } = await supabase
            .from('contrats')
            .select('agent_id, id')
            .eq('statut', 'valide');

        if (contratsError) throw contratsError;

        // Compter les contrats par agent
        const contratsParAgent = {};
        contrats.forEach(c => {
            contratsParAgent[c.agent_id] = (contratsParAgent[c.agent_id] || 0) + 1;
        });

        // Calculer les scores et trier
        const agentsAvecScores = agents.map(agent => ({
            ...agent,
            contrats: contratsParAgent[agent.id] || 0,
            score: (contratsParAgent[agent.id] || 0) * 10 // 10 pts par contrat
        })).sort((a, b) => b.score - a.score);

        // Afficher le podium (top 3)
        for (let i = 0; i < 3 && i < agentsAvecScores.length; i++) {
            const agent = agentsAvecScores[i];
            const place = i + 1;
            
            document.getElementById(`podium-${place}-avatar`).textContent = agent.avatar_url ? '👤' : '🏃';
            document.getElementById(`podium-${place}-nom`).textContent = 
                agent.prenom + ' ' + agent.nom.charAt(0) + '.';
            document.getElementById(`podium-${place}-equipe`).textContent = 
                agent.equipes.drapeau + ' ' + agent.equipes.nom;
            document.getElementById(`podium-${place}-score`).textContent = agent.score + ' pts';
        }

        // Afficher le tableau complet
        const tbody = document.getElementById('tableau-global-body');
        tbody.innerHTML = '';

        agentsAvecScores.forEach((agent, index) => {
            const tr = document.createElement('tr');
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
                <td>${agent.contrats}</td>
                <td class="medailles-cell">—</td>
            `;
            tbody.appendChild(tr);
        });

        console.log('✅ Classement global chargé:', agentsAvecScores.length, 'agents');

    } catch (error) {
        console.error('❌ Erreur chargement classement:', error);
    }
}


// -------------------------------------------------------------
// CHARGER CLASSEMENT ÉQUIPES
// -------------------------------------------------------------
async function chargerClassementEquipes() {
    try {
        const { data: equipes, error } = await supabase
            .from('equipes')
            .select('*')
            .order('id');

        if (error) throw error;

        // Charger les contrats par équipe
        const { data: agents } = await supabase
            .from('users')
            .select('id, equipe_id')
            .eq('role', 'agent');

        const { data: contrats } = await supabase
            .from('contrats')
            .select('agent_id')
            .eq('statut', 'valide');

        // Calculer scores par équipe
        const scoresEquipes = {};
        contrats.forEach(c => {
            const agent = agents.find(a => a.id === c.agent_id);
            if (agent) {
                scoresEquipes[agent.equipe_id] = (scoresEquipes[agent.equipe_id] || 0) + 10;
            }
        });

        // Trier les équipes par score
        const equipesAvecScores = equipes.map(eq => ({
            ...eq,
            score: scoresEquipes[eq.id] || 0
        })).sort((a, b) => b.score - a.score);

        // Afficher
        const container = document.getElementById('equipes-classement');
        container.innerHTML = '';

        equipesAvecScores.forEach((equipe, index) => {
            const div = document.createElement('div');
            div.className = 'equipe-item';
            div.innerHTML = `
                <div class="equipe-rang">${index + 1}</div>
                <div class="equipe-info">
                    <div class="equipe-nom">${equipe.drapeau} ${equipe.nom}</div>
                    <div class="equipe-score">${equipe.score} pts</div>
                </div>
            `;
            container.appendChild(div);
        });

        console.log('✅ Classement équipes chargé');

    } catch (error) {
        console.error('❌ Erreur chargement équipes:', error);
    }
}


// -------------------------------------------------------------
// CHARGER CLASSEMENT CELLULES
// -------------------------------------------------------------
async function chargerClassementCellules() {
    try {
        const cellules = ['Mover', 'Switcher', 'Coach', 'Pépinière'];

        for (const cellule of cellules) {
            const { data: agents } = await supabase
                .from('users')
                .select(`
                    *,
                    equipes (nom, drapeau)
                `)
                .eq('cellule', cellule)
                .eq('role', 'agent');

            const { data: contrats } = await supabase
                .from('contrats')
                .select('agent_id')
                .eq('statut', 'valide')
                .in('agent_id', agents.map(a => a.id));

            const contratsParAgent = {};
            contrats.forEach(c => {
                contratsParAgent[c.agent_id] = (contratsParAgent[c.agent_id] || 0) + 1;
            });

            const agentsAvecScores = agents.map(a => ({
                ...a,
                contrats: contratsParAgent[a.id] || 0,
                score: (contratsParAgent[a.id] || 0) * 10
            })).sort((a, b) => b.score - a.score).slice(0, 10);

            const tbody = document.getElementById(`tableau-${cellule.toLowerCase()}s`);
            if (!tbody) continue;

            tbody.innerHTML = '';
            agentsAvecScores.forEach((agent, index) => {
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
                    <td>${agent.contrats}</td>
                `;
                tbody.appendChild(tr);
            });
        }

        console.log('✅ Classements cellules chargés');

    } catch (error) {
        console.error('❌ Erreur chargement cellules:', error);
    }
}


// -------------------------------------------------------------
// CHARGER CHALLENGES ACTIFS
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

        console.log('✅ Challenges actifs chargés');

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
// MODALS
// -------------------------------------------------------------
function ouvrirModal(modalId) {
    document.getElementById(modalId).classList.add('actif');
}

function fermerModal(modalId) {
    document.getElementById(modalId).classList.remove('actif');
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

console.log('✅ plateau.js PRODUCTION chargé');
