// =============================================================
// PLATEAU V5 - QUADRUPLE PISTE (Final)
// =============================================================

console.log('🏔️ Plateau V5 (Quadruple) - Démarrage...');

// VARIABLES GLOBALES
let donneesGlobales = {
    agents: [],
    contrats: [],
    utilisateur: null
};

const sb = window.supabase.createClient(SUPABASE_CONFIG.URL, SUPABASE_CONFIG.KEY);

// =============================================================
// 🏁 INITIALISATION
// =============================================================
document.addEventListener('DOMContentLoaded', async function() {

    // 1. Vérification Auth
    const { data: { user } } = await sb.auth.getUser();
    if (!user) { window.location.href = 'index.html'; return; }

    // 2. Chargement Profil
    await chargerProfilManager(user.id);

    // 3. Sécurité
    if (!donneesGlobales.utilisateur || 
       (donneesGlobales.utilisateur.role !== 'manager' && donneesGlobales.utilisateur.role !== 'admin')) {
        alert("⛔ Accès réservé aux Managers et Admins.");
        window.location.href = 'dashboard.html';
        return;
    }

    // 4. Affichage
    afficherHeaderEtBoutons();

    // 5. Chargement Données & Calculs
    await chargerEtCalculer();

    // 6. Gestion des onglets
    activerGestionOnglets();

    // 7. Initialisation Cellule
    if (window.changerCellule) window.changerCellule('Mover');

    // 8. FONCTIONS ADMIN (GRAPHIQUES + VALIDATION)
    await chargerGraphiquesQuadruple(); // <--- NOUVELLE FONCTION 4 GRAPHIQUES
    
    if (donneesGlobales.utilisateur.role === 'admin') {
        chargerValidationsAdmin();
        setInterval(chargerValidationsAdmin, 10000);
    }

    console.log("✅ Plateau V5 initialisé avec succès");
});

// =============================================================
// 🔐 GESTION UTILISATEUR & HEADER
// =============================================================

async function chargerProfilManager(userId) {
    const { data } = await sb.from('users').select('*').eq('id', userId).single();
    donneesGlobales.utilisateur = data;
}

function afficherHeaderEtBoutons() {
    const u = donneesGlobales.utilisateur;
    if (!u) return;

    document.getElementById('nom-utilisateur').textContent = `${u.prenom} ${u.nom}`;
    document.getElementById('role-utilisateur').textContent = u.role === 'admin' ? 'Administrateur' : 'Manager';

    const btnDeconnexion = document.getElementById('btn-deconnexion-plateau');
    if (btnDeconnexion) {
        btnDeconnexion.addEventListener('click', async () => {
            if (confirm("Se déconnecter ?")) {
                await sb.auth.signOut();
                window.location.href = 'index.html';
            }
        });
    }

    const btnCreer = document.getElementById('btn-creer-challenge-plateau');
    if (u.role === 'admin' && btnCreer) {
        btnCreer.style.display = 'inline-block';
    }
}

// =============================================================
// 🧠 MOTEUR DE DONNÉES & TABLEAUX
// =============================================================

async function chargerEtCalculer() {
    const { data: agents } = await sb.from('users').select(`*, equipes (nom, drapeau_emoji)`).eq('role', 'agent');
    const { data: contrats } = await sb.from('contrats').select('*').in('statut', ['valide', 'en_attente']);
    const { data: reussites } = await sb.from('challenge_reussites').select('*').eq('statut', 'valide');
    const { data: equipes } = await sb.from('equipes').select('*');

    donneesGlobales.agents = agents || [];
    donneesGlobales.contrats = contrats || [];

    donneesGlobales.agents.forEach(agent => {
        agent.scoreTotal = 0;
        const contratsAgent = donneesGlobales.contrats.filter(c => c.agent_id === agent.id);
        contratsAgent.forEach(c => {
            const isFri = c.created_at.includes('2026-02-20');
            agent.scoreTotal += isFri ? 20 : 10;
        });
        const challengesAgent = (reussites || []).filter(r => r.agent_id === agent.id);
        challengesAgent.forEach(r => {
            agent.scoreTotal += (r.points_gagnes || 0);
        });
    });

    afficherPodium(donneesGlobales.agents);
    afficherTableauGlobal(donneesGlobales.agents, donneesGlobales.contrats);
    afficherClassementEquipes(equipes || [], donneesGlobales.agents);
}

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
    const avatarDiv = document.getElementById(`podium-${rang}-avatar`);
    
    if (nomDiv) nomDiv.textContent = `${agent.prenom} ${agent.nom}`;
    if (scoreDiv) scoreDiv.textContent = `${agent.scoreTotal} pts`;
    if (equipeDiv) equipeDiv.textContent = agent.equipes?.nom || '';
    if (avatarDiv) avatarDiv.textContent = agent.avatar_url ? '👤' : (rang === 1 ? '🥇' : rang === 2 ? '🥈' : '🥉');
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

window.changerCellule = function(nomCellule) {
    document.querySelectorAll('.cellule-tab-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.innerText.includes(nomCellule)) btn.classList.add('active');
    });
    const titre = document.getElementById('titre-top-cellule');
    if (titre) titre.textContent = `📞 Top ${nomCellule}s`;
    const agentsFiltres = donneesGlobales.agents.filter(a => a.cellule === nomCellule);
    const tbody = document.getElementById('tableau-cellule-body');
    if (!tbody) return;
    const classe = [...agentsFiltres].sort((a, b) => b.scoreTotal - a.scoreTotal);
    if (classe.length === 0) { tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:20px;">Aucun agent dans cette cellule</td></tr>'; return; }
    tbody.innerHTML = classe.map((agent, index) => {
        return `
            <tr>
                <td style="font-weight:bold;">${index + 1}</td>
                <td><strong>${agent.prenom} ${agent.nom}</strong></td>
                <td>${agent.equipes?.nom || ''}</td>
                <td style="font-weight:bold; color:#1976D2;">${agent.scoreTotal} pts</td>
                <td>${donneesGlobales.contrats.filter(c => c.agent_id === agent.id).length}</td>
            </tr>
        `;
    }).join('');
};

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

// =============================================================
// 📈 NOUVEAU : GRAPHIQUES QUADRUPLE PISTE
// =============================================================

async function chargerGraphiquesQuadruple() {
    // 1. Récupérer TOUTES les données
    const { data: kpis } = await sb.from('kpi_equipe_journalier')
        .select('*, equipes(nom, drapeau_emoji)')
        .order('date_kpi', { ascending: true });

    if (!kpis || kpis.length === 0) return;

    // 2. Préparer les dates (Axe X commun)
    const labels = [...new Set(kpis.map(k => new Date(k.date_kpi).toLocaleDateString()))];
    const idsEquipes = [...new Set(kpis.map(k => k.equipe_id))];

    // 3. Boucler sur les 4 cellules pour créer les 4 graphiques
    const cellules = ['Mover', 'Switcher', 'Coach', 'Pépinière'];

    cellules.forEach(cell => {
        const datasets = [];

        idsEquipes.forEach(eqId => {
            // Filtrer données pour Équipe + Cellule
            const dataEquipeCell = kpis.filter(k => k.equipe_id === eqId && k.cellule === cell);
            
            if (dataEquipeCell.length > 0) {
                const info = dataEquipeCell[0].equipes;
                const color = `hsl(${(eqId * 50) % 360}, 70%, 50%)`;

                const dataPoints = labels.map(date => {
                    const entree = dataEquipeCell.find(k => new Date(k.date_kpi).toLocaleDateString() === date);
                    return entree ? entree.valeur_cumul : 0;
                });

                datasets.push({
                    label: `${info.drapeau_emoji} ${info.nom}`,
                    data: dataPoints,
                    borderColor: color,
                    backgroundColor: 'transparent',
                    tension: 0.3,
                    borderWidth: 2,
                    pointRadius: 3
                });
            }
        });

        // Dessiner le graphique spécifique à cette cellule
        const ctx = document.getElementById(`chart-${cell}`);
        if (ctx) {
            new Chart(ctx, {
                type: 'line',
                data: { labels, datasets },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { position: 'bottom', labels: { boxWidth: 10, font: {size: 10} } },
                    },
                    scales: { y: { beginAtZero: true } }
                }
            });
        }
    });
}

// =============================================================
// ⚡ FONCTIONS ADMIN
// =============================================================

window.ouvrirModalChallenge = function() {
    document.getElementById('modal-challenge').style.display = 'flex';
};
window.fermerModalChallenge = function() {
    document.getElementById('modal-challenge').style.display = 'none';
};

// ==========================================
// VERSION FINALE : CRÉATION CHALLENGE CIBLÉ
// ==========================================
window.creerChallenge = async function(e) {
    e.preventDefault();
    const btn = document.getElementById('btn-submit-challenge');
    btn.textContent = 'Création...';
    btn.disabled = true;

    try {
        const { error } = await sb.from('challenges_flash').insert({
            titre: document.getElementById('challenge-titre').value,
            description: document.getElementById('challenge-description').value,
            type_challenge: document.getElementById('challenge-type').value,
            points_attribues: document.getElementById('challenge-points').value,
            date_debut: document.getElementById('challenge-debut').value,
            date_fin: document.getElementById('challenge-fin').value,
            
            // 👇 C'EST ICI QUE ÇA CHANGE
            cible: 'global', // TOUJOURS GLOBAL (Pour tout le monde)
            cellule_cible: document.getElementById('challenge-cible-cellule').value, // Filtrage par cellule
            
            statut: 'actif'
        });

        if (error) throw error;
        
        // Message adapté selon le ciblage
        const cibleTexte = document.getElementById('challenge-cible-cellule').value === 'toutes' ? 'tout le monde' : document.getElementById('challenge-cible-cellule').value;
        alert(`✅ Challenge lancé pour ${cibleTexte} !`);
        
        fermerModalChallenge();
        document.getElementById('form-challenge').reset();

    } catch (err) {
        alert('Erreur : ' + err.message);
    } finally {
        btn.textContent = '⚡ Créer le défi';
        btn.disabled = false;
    }
};

async function chargerValidationsAdmin() {
    const panel = document.getElementById('admin-panel');
    const liste = document.getElementById('liste-validations-admin');
    
    const { data: reussites } = await sb.from('challenge_reussites')
        .select('*, users(prenom, nom, equipe_id), challenges_flash(titre, type_challenge)')
        .eq('statut', 'en_attente');

    if (!reussites || reussites.length === 0) {
        panel.style.display = 'none';
        return;
    }

    panel.style.display = 'block';
    liste.innerHTML = '';

    reussites.forEach(r => {
        const div = document.createElement('div');
        div.style.borderBottom = '1px solid #eee';
        div.style.padding = '10px 0';
        
        const isFlash = r.challenges_flash.type_challenge === 'flash';
        const btnColor = isFlash ? 'gold' : '#4CAF50';
        const btnText = isFlash ? '🏆 WIN' : '✅ OK';

        div.innerHTML = `
            <div style="font-size:0.9em;"><strong>${r.users.prenom} ${r.users.nom}</strong></div>
            <div style="font-size:0.8em; color:#666;">${r.challenges_flash.titre}</div>
            <div style="margin-top:5px;">
                <button onclick="adminValider('${r.id}', '${r.challenge_id}', '${isFlash}', '${r.users.prenom}')" style="background:${btnColor}; border:none; padding:5px 10px; cursor:pointer; border-radius:4px;">${btnText}</button>
                <button onclick="adminRejeter('${r.id}')" style="background:#f44336; color:white; border:none; padding:5px 10px; cursor:pointer; border-radius:4px;">❌</button>
            </div>
        `;
        liste.appendChild(div);
    });
}

window.adminValider = async function(reussiteId, challengeId, isFlash, nomGagnant) {
    if (isFlash === 'true') {
        if(!confirm(`🏆 DÉCLARER ${nomGagnant} VAINQUEUR ?\nCela ferme le challenge pour tout le monde.`)) return;
        await sb.from('challenge_reussites').update({ statut: 'valide' }).eq('id', reussiteId);
        await sb.from('challenges_flash').update({ statut: 'termine', gagnant_nom: nomGagnant }).eq('id', challengeId);
    } else {
        await sb.from('challenge_reussites').update({ statut: 'valide' }).eq('id', reussiteId);
    }
    chargerValidationsAdmin();
};

window.adminRejeter = async function(id) {
    if(!confirm("Rejeter ?")) return;
    await sb.from('challenge_reussites').update({ statut: 'rejete' }).eq('id', id);
    chargerValidationsAdmin();
};