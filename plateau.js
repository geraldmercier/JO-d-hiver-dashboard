// =============================================================
// PLATEAU - VERSION FINALE (Nettoyée & Dynamique)
// =============================================================

console.log('🏔️ Vue Plateau FINAL - Chargement...');

// 1. Initialisation sécurisée (sb au lieu de supabase)
const { createClient } = window.supabase;
const sb = createClient(SUPABASE_CONFIG.URL, SUPABASE_CONFIG.KEY);

let tousLesAgents = [];
let toutesLesEquipes = [];
let tousLesContrats = [];

// -------------------------------------------------------------
// INITIALISATION
// -------------------------------------------------------------
document.addEventListener('DOMContentLoaded', async function() {
    
    // Vérification session
    const { data: { user }, error } = await sb.auth.getUser();
    if (error || !user) { 
        window.location.href = 'connexion-finale.html'; 
        return; 
    }

    // Vérification droits (Admin ou Manager uniquement)
    const { data: profil } = await sb
        .from('users')
        .select('role, prenom, nom')
        .eq('id', user.id)
        .single();
        
    if (!['manager', 'admin'].includes(profil.role)) {
        window.location.href = 'dashboard.html';
        return;
    }

    // Afficher infos user
    document.getElementById('nom-utilisateur').textContent = `${profil.prenom} ${profil.nom}`;
    document.getElementById('role-utilisateur').textContent = profil.role === 'admin' ? 'Administrateur' : 'Manager';

    // Charger les données
    await chargerDonnees();

    // Lancer les calculs
    calculerClassementGlobal();
    calculerClassementEquipes();
    calculerClassementCellules();
    afficherPodium();
    calculerHallOfFame();

    // Gestion des onglets
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            // Retirer 'active' partout
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            
            // Ajouter 'active' sur la cible
            this.classList.add('active');
            const targetId = 'tab-' + this.dataset.tab;
            document.getElementById(targetId).classList.add('active');
        });
    });

    // Bouton Déconnexion
    document.getElementById('btn-deconnexion').addEventListener('click', async () => {
        await sb.auth.signOut();
        window.location.href = 'connexion-finale.html';
    });

    console.log('✅ Plateau chargé avec succès');
});


// -------------------------------------------------------------
// CHARGEMENT DES DONNÉES
// -------------------------------------------------------------
async function chargerDonnees() {
    try {
        // CORRECTION : on demande bien 'drapeau_emoji'
        const p1 = sb.from('users').select(`*, equipes (nom, drapeau_emoji)`).eq('role', 'agent');
        const p2 = sb.from('equipes').select('*');
        const p3 = sb.from('contrats').select('*').eq('statut', 'valide');
        
        const [r1, r2, r3] = await Promise.all([p1, p2, p3]);
        
        tousLesAgents = r1.data || [];
        toutesLesEquipes = r2.data || [];
        tousLesContrats = r3.data || [];

    } catch (error) {
        console.error("Erreur chargement:", error);
    }
}


// -------------------------------------------------------------
// 1. CLASSEMENT GLOBAL (Tableau)
// -------------------------------------------------------------
function calculerClassementGlobal() {
    // Calcul des scores
    const agentsScores = tousLesAgents.map(agent => {
        const contrats = tousLesContrats.filter(c => c.agent_id === agent.id);
        return {
            ...agent,
            nbContrats: contrats.length,
            score: contrats.length * 10
        };
    }).sort((a, b) => b.score - a.score);

    const tbody = document.getElementById('tableau-global-body');
    if (!tbody) return;

    tbody.innerHTML = '';
    agentsScores.forEach((agent, index) => {
        const rang = index + 1;
        let medaille = '';
        if (rang === 1) medaille = '🥇';
        else if (rang === 2) medaille = '🥈';
        else if (rang === 3) medaille = '🥉';

        const drapeau = agent.equipes ? (agent.equipes.drapeau_emoji || '') : '';
        const nomEquipe = agent.equipes ? agent.equipes.nom : '-';

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${rang}</strong></td>
            <td>${agent.prenom} ${agent.nom}</td>
            <td>${drapeau} ${nomEquipe}</td>
            <td><span class="badge-cellule">${agent.cellule || '?'}</span></td>
            <td class="score-cell">${agent.score} pts</td>
            <td>${agent.nbContrats}</td>
            <td>${medaille}</td>
        `;
        tbody.appendChild(tr);
    });
}


// -------------------------------------------------------------
// 2. PODIUM (Les 3 grosses cartes)
// -------------------------------------------------------------
function afficherPodium() {
    const agentsScores = tousLesAgents.map(agent => ({
        ...agent,
        score: tousLesContrats.filter(c => c.agent_id === agent.id).length * 10
    })).sort((a, b) => b.score - a.score);

    const top3 = agentsScores.slice(0, 3);
    
    // Fonction helper pour remplir une carte podium
    const remplirPodium = (place, agent) => {
        if (!agent) return; // Si moins de 3 agents
        
        const drapeau = agent.equipes ? (agent.equipes.drapeau_emoji || '') : '';
        const nomEquipe = agent.equipes ? agent.equipes.nom : '';

        // On remplit les IDs spécifiques du HTML (ex: podium-1-nom)
        const elNom = document.getElementById(`podium-${place}-nom`);
        const elEquipe = document.getElementById(`podium-${place}-equipe`);
        const elScore = document.getElementById(`podium-${place}-score`);
        const elAvatar = document.getElementById(`podium-${place}-avatar`);

        if(elNom) elNom.textContent = `${agent.prenom} ${agent.nom}`;
        if(elEquipe) elEquipe.textContent = `${drapeau} ${nomEquipe}`;
        if(elScore) elScore.textContent = `${agent.score} pts`;
        
        // Avatar simple (initiales ou emoji si pas d'image)
        if(elAvatar) {
            if (agent.avatar_url) {
                elAvatar.innerHTML = `<img src="${agent.avatar_url}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">`;
            } else {
                elAvatar.textContent = agent.prenom.charAt(0);
            }
        }
    };

    // Attention : L'array est [1er, 2ème, 3ème]
    // Mais dans le HTML, les IDs sont podium-1 (Or), podium-2 (Argent), podium-3 (Bronze)
    if (top3[0]) remplirPodium(1, top3[0]);
    if (top3[1]) remplirPodium(2, top3[1]);
    if (top3[2]) remplirPodium(3, top3[2]);
}


// -------------------------------------------------------------
// 3. CLASSEMENT ÉQUIPES
// -------------------------------------------------------------
function calculerClassementEquipes() {
    const equipesScores = toutesLesEquipes.map(eq => {
        const agentsIds = tousLesAgents.filter(a => a.equipe_id === eq.id).map(a => a.id);
        const contratsEq = tousLesContrats.filter(c => agentsIds.includes(c.agent_id));
        return {
            ...eq,
            score: contratsEq.length * 10,
            nbContrats: contratsEq.length
        };
    }).sort((a, b) => b.score - a.score);

    const container = document.getElementById('equipes-classement');
    if (!container) return;

    container.innerHTML = '';
    equipesScores.forEach((eq, index) => {
        const div = document.createElement('div');
        div.className = 'equipe-item';
        div.innerHTML = `
            <div class="equipe-rang">${index + 1}</div>
            <div class="equipe-info">
                <span class="equipe-nom">${eq.drapeau_emoji || '🚩'} ${eq.nom}</span>
                <span class="equipe-score">${eq.score} pts</span>
            </div>
        `;
        container.appendChild(div);
    });
}


// -------------------------------------------------------------
// 4. CLASSEMENT PAR CELLULE
// -------------------------------------------------------------
function calculerClassementCellules() {
    const cellules = ['Mover', 'Switcher', 'Coach', 'Pépinière']; // Ajoute tes cellules ici

    cellules.forEach(cellule => {
        // Filtrer les agents de cette cellule
        const agentsCellule = tousLesAgents.filter(a => a.cellule === cellule);
        
        // Calculer scores
        const agentsScores = agentsCellule.map(agent => {
            const contrats = tousLesContrats.filter(c => c.agent_id === agent.id);
            return {
                ...agent,
                score: contrats.length * 10,
                kpi: calculerKPICellule(agent, contrats, cellule) // Fonction helper
            };
        }).sort((a, b) => b.score - a.score).slice(0, 10); // Top 10 seulement

        // Remplir le tableau correspondant (ex: id="tableau-Mover")
        const tbody = document.getElementById(`tableau-${cellule}`);
        if (!tbody) return;

        tbody.innerHTML = '';
        if (agentsScores.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center">Aucun agent</td></tr>';
            return;
        }

        agentsScores.forEach((agent, index) => {
            const drapeau = agent.equipes ? (agent.equipes.drapeau_emoji || '') : '';
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${index + 1}</td>
                <td>${agent.prenom} ${agent.nom}</td>
                <td>${drapeau}</td>
                <td><strong>${agent.score}</strong></td>
                <td>${agent.kpi}</td>
            `;
            tbody.appendChild(tr);
        });
    });
}

// Helper pour calculer le KPI spécifique selon la cellule
function calculerKPICellule(agent, contrats, cellule) {
    if (cellule === 'Mover') {
        // Ex: Taux de rétention (Simplifié)
        return contrats.length > 0 ? 'TR 100%' : '-'; 
    } else if (cellule === 'Switcher') {
        // Ex: Volume Mobile
        const nbMobile = contrats.filter(c => c.type_contrat === 'Mobile').length;
        return `${nbMobile} Mob.`;
    }
    return contrats.length + ' cont.';
}

// Fonction globale pour les boutons onclick HTML
window.changerCellule = function(cellule) {
    // Gestion des onglets "sous-menu"
    document.querySelectorAll('.cellule-tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.cellule-content').forEach(c => c.classList.remove('active'));
    
    // Activer le bon
    event.currentTarget.classList.add('active'); // Le bouton cliqué
    const content = document.getElementById(`cellule-${cellule}`);
    if (content) content.classList.add('active');
};

window.changerTab = function(tabName) {
    // Cette fonction est gérée par le addEventListener au début, 
    // mais on la garde pour compatibilité si le HTML a des onclick="changerTab()"
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    
    // Trouver le bouton correspondant (un peu hacky mais fonctionnel)
    const btn = Array.from(document.querySelectorAll('.tab-btn')).find(b => b.textContent.includes(tabName) || b.getAttribute('onclick').includes(tabName));
    if(btn) btn.classList.add('active');
    
    const content = document.getElementById(`tab-${tabName}`);
    if(content) content.classList.add('active');
};


// -------------------------------------------------------------
// 5. HALL OF FAME (Simplifié)
// -------------------------------------------------------------
function calculerHallOfFame() {
    // C'est ici qu'on calcule les records réels
    // Pour l'instant, on prend le meilleur scoreur comme "MVP"
    const agentsScores = tousLesAgents.map(agent => ({
        ...agent,
        score: tousLesContrats.filter(c => c.agent_id === agent.id).length * 10
    })).sort((a, b) => b.score - a.score);

    const mvp = agentsScores[0];

    if (mvp) {
        const elMedailles = document.getElementById('record-medailles');
        if(elMedailles) elMedailles.textContent = `${mvp.prenom} ${mvp.nom} - ${mvp.score} pts`;
        
        // Pour les autres records, on peut afficher "À définir" ou un autre calcul
        // Exemple : Record de contrats en un jour (nécessiterait plus de calculs)
        document.getElementById('record-points-jour').textContent = 'Calcul en cours...';
    }
}