// =============================================================
// PLATEAU V4 - FUSION COMPLÈTE (Stable & Sécurisé)
// =============================================================

console.log('🏔️ Plateau V4 (Fusion) - Démarrage...');

// VARIABLES GLOBALES (Crucial pour le filtrage par cellule)
let donneesGlobales = {
    agents: [],
    contrats: [],
    utilisateur: null // Pour stocker les infos du manager connecté
};

const sb = window.supabase.createClient(SUPABASE_CONFIG.URL, SUPABASE_CONFIG.KEY);

// =============================================================
// 🏁 INITIALISATION
// =============================================================
document.addEventListener('DOMContentLoaded', async function() {

    // 1. Vérification Auth (Sécurité)
    const { data: { user } } = await sb.auth.getUser();
    if (!user) { window.location.href = 'index.html'; return; }

    // 2. Chargement du profil Manager/Admin
    await chargerProfilManager(user.id);

    // 3. VÉRIFICATION DES DROITS (Sécurité stricte)
    if (!donneesGlobales.utilisateur || 
       (donneesGlobales.utilisateur.role !== 'manager' && donneesGlobales.utilisateur.role !== 'admin')) {
        alert("⛔ Accès réservé aux Managers et Admins.");
        window.location.href = 'dashboard.html';
        return;
    }

    // 4. Mise à jour Header & Boutons
    afficherHeaderEtBoutons();

    // 5. Chargement des données du plateau
    await chargerEtCalculer();

    // 6. Charger la liste VISUELLE des challenges (Info-bulle)
    await chargerChallengesActifsVisuels();

    // 7. Gestion des onglets (Global / Équipes / Cellules)
    activerGestionOnglets();

    // 8. Initialisation de la vue "Par Cellule" (Mover par défaut)
    if (window.changerCellule) window.changerCellule('Mover');

    // 9. Menu Équipes (Si Admin)
    if (donneesGlobales.utilisateur.role === 'admin') {
        initialiserMenuEquipes();
    }

    console.log("✅ Plateau V4 initialisé avec succès");
});

// =============================================================
// 🔐 GESTION UTILISATEUR & SÉCURITÉ
// =============================================================

async function chargerProfilManager(userId) {
    const { data } = await sb.from('users').select('*').eq('id', userId).single();
    donneesGlobales.utilisateur = data;
}

function afficherHeaderEtBoutons() {
    const u = donneesGlobales.utilisateur;
    if (!u) return;

    // Infos Header
    const elNom = document.getElementById('nom-utilisateur');
    const elRole = document.getElementById('role-utilisateur');
    if (elNom) elNom.textContent = `${u.prenom} ${u.nom}`;
    if (elRole) elRole.textContent = u.role === 'admin' ? 'Administrateur' : 'Manager';

    // Boutons d'action
    const btnRetour = document.getElementById('btn-retour-manager');
    if (btnRetour) {
        btnRetour.style.display = 'inline-block'; // On s'assure qu'il est visible
        btnRetour.addEventListener('click', () => window.location.href = 'manager.html');
    }

    const btnDeconnexion = document.getElementById('btn-deconnexion');
    if (btnDeconnexion) {
        btnDeconnexion.addEventListener('click', async () => {
            if (confirm("Se déconnecter ?")) {
                await sb.auth.signOut();
                window.location.href = 'index.html';
            }
        });
    }

    // Admin : Bouton Créer Challenge et Menu Équipes
    const btnCreer = document.getElementById('btn-creer-challenge');
    const menuEquipes = document.getElementById('dropdown-equipes-admin');
    
    if (u.role === 'admin') {
        if (btnCreer) {
            btnCreer.style.display = 'inline-block';
            btnCreer.addEventListener('click', () => window.location.href = 'manager.html'); // Ou ouvrir modal
        }
        if (menuEquipes) menuEquipes.style.display = 'block';
    }
}

// =============================================================
// 🧠 MOTEUR DE DONNÉES (Le cœur du V3)
// =============================================================

async function chargerEtCalculer() {
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

    // Affichage Initial des Tableaux
    afficherPodium(donneesGlobales.agents);
    afficherTableauGlobal(donneesGlobales.agents, donneesGlobales.contrats);
    afficherClassementEquipes(equipes || [], donneesGlobales.agents);
}

// =============================================================
// ⚡ CHALLENGES VISUELS (Le manque du V3 comblé)
// =============================================================

async function chargerChallengesActifsVisuels() {
    try {
        const { data: challenges } = await sb.from('challenges_flash')
            .select('*')
            .eq('statut', 'actif')
            .order('date_debut', { ascending: false });

        const liste = document.getElementById('challenges-actifs-liste');
        if (!liste) return; // Si l'élément n'existe pas dans le HTML, on ignore

        if (!challenges || challenges.length === 0) {
            liste.innerHTML = '<div class="aucun-challenge">Aucun challenge actif 😴</div>';
            return;
        }

        liste.innerHTML = '';
        challenges.forEach(ch => {
            const fin = new Date(ch.date_fin).toLocaleTimeString('fr-FR', {hour: '2-digit', minute:'2-digit'});
            
            const div = document.createElement('div');
            div.className = 'challenge-item'; // Assurez-vous d'avoir du CSS pour ça
            div.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:center; padding:10px; border-bottom:1px solid #eee;">
                    <div>
                        <strong>⚡ ${ch.titre}</strong><br>
                        <small style="color:#666;">${ch.type_challenge} • Fin à ${fin}</small>
                    </div>
                    <div style="background:#FF9800; color:white; padding:2px 8px; border-radius:10px; font-weight:bold;">
                        ${ch.points_attribues} pts
                    </div>
                </div>
            `;
            liste.appendChild(div);
        });

    } catch (e) { console.error("Erreur challenges visuels", e); }
}

// =============================================================
// 📊 AFFICHAGE TABLEAUX & PODIUM
// =============================================================

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
    const avatarDiv = document.getElementById(`podium-${rang}-avatar`); // Ajout avatar
    
    if (nomDiv) nomDiv.textContent = `${agent.prenom} ${agent.nom}`;
    if (scoreDiv) scoreDiv.textContent = `${agent.scoreTotal} pts`;
    if (equipeDiv) equipeDiv.textContent = agent.equipes?.nom || '';
    if (avatarDiv) avatarDiv.textContent = agent.avatar_url ? '👤' : '🏃';
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
                <div style="font-size:2em;">${eq.drapeau_emoji || '🏳️'}</div>
                <div style="font-weight:bold; font-size:1.1em;">${eq.nom}</div>
            </div>
            <div style="font-size:1.5em; font-weight:bold; color:#FF9F1C;">${eq.totalPoints} pts</div>
        </div>
    `).join('');
}

// =============================================================
// 📞 GESTION DES CELLULES (Le système dynamique)
// =============================================================

window.changerCellule = function(nomCellule) {
    // 1. Mise à jour visuelle des boutons
    const boutons = document.querySelectorAll('.cellule-tab-btn');
    boutons.forEach(btn => {
        btn.classList.remove('active');
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

    const classe = [...agents].sort((a, b) => b.scoreTotal - a.scoreTotal);

    if (classe.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:20px;">Aucun agent dans cette cellule</td></tr>';
        return;
    }

    tbody.innerHTML = classe.map((agent, index) => {
        const nbContrats = contrats.filter(c => c.agent_id === agent.id).length;
        let medaille = '';
        if (index === 0) medaille = '🥇'; else if (index === 1) medaille = '🥈'; else if (index === 2) medaille = '🥉';

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

// =============================================================
// 🛠 UTILITAIRES & MENU ADMIN
// =============================================================

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

function initialiserMenuEquipes() {
    sb.from('equipes').select('*').order('id')
      .then(({ data: equipes }) => {
            const menu = document.getElementById('menu-equipes-admin');
            if(!menu) return;
            
            menu.innerHTML = '';
            equipes.forEach(equipe => {
                const div = document.createElement('div');
                div.className = 'dropdown-item';
                div.textContent = `${equipe.drapeau_emoji || '🏳️'} Équipe ${equipe.nom}`;
                div.onclick = () => window.location.href = `manager.html?equipe=${equipe.id}`;
                menu.appendChild(div);
            });
      });
}