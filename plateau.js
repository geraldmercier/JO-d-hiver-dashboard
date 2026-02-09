// =============================================================
// 👑 PLATEAU ADMIN (COCKPIT)
// =============================================================

console.log('👑 Admin Cockpit - Chargement...');

const { createClient } = window.supabase;
const sb = createClient(SUPABASE_CONFIG.URL, SUPABASE_CONFIG.KEY);

let globalData = {
    agents: [],
    contrats: [],
    equipes: [],
    challenges: [],
    kpis: [] // Pour le Fil Rouge
};

document.addEventListener('DOMContentLoaded', async function() {
    // 1. Auth & Rôle
    const { data: { user } } = await sb.auth.getUser();
    if (!user) { window.location.href = 'connexion-finale.html'; return; }
    const { data: userData } = await sb.from('users').select('role').eq('id', user.id).single();
    if (!userData || userData.role !== 'admin') {
        alert("⛔ Accès refusé."); window.location.href = 'dashboard.html'; return;
    }

    // 2. Chargement
    await chargerTout();
    await chargerChallengesActifsManager();

    // 3. UI Init
    remplirFiltresEquipes();
    remplirSelectsAction();
    document.getElementById('btn-deconnexion').addEventListener('click', async () => {
        await sb.auth.signOut(); window.location.href = 'connexion-finale.html';
    });

    // 4. Temps Réel
    ecouterRealtimePlateau();
});

// =============================================================
// 📡 TEMPS RÉEL (REALTIME)
// =============================================================
function ecouterRealtimePlateau() {
    console.log('📡 Activation du temps réel sur le plateau...');
    
    // Écouter TOUT (contrats, challenges, réussites)
    sb.channel('flux-plateau')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'contrats' }, () => chargerTout())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'challenges_flash' }, () => chargerTout())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'challenge_reussites' }, () => chargerTout())
        .subscribe();
}

// =============================================================
// 📡 CHARGEMENT DES DONNÉES
// =============================================================
async function chargerTout() {
    const loader = document.getElementById('loading-indicator');
    if(loader) loader.style.display = 'block';

    try {
        const [agentsRes, contratsRes, equipesRes, scoresRes, challengesRes, kpisRes] = await Promise.all([
            sb.from('users').select('*, equipes(nom, drapeau_emoji)').eq('role', 'agent'),
            sb.from('contrats').select('*').order('created_at', { ascending: false }),
            sb.from('equipes').select('*'),
            sb.from('view_classement_general').select('user_id, total_points, points_challenges'), 
            sb.from('challenges_flash').select('*').order('date_debut', { ascending: false }),
            sb.from('kpi_equipe_journalier').select('*, equipes(nom, drapeau_emoji)').order('date_kpi', { ascending: true }) // 👈 Pour le Fil Rouge
        ]);

        globalData.agents = agentsRes.data || [];
        globalData.contrats = contratsRes.data || [];
        globalData.equipes = equipesRes.data || [];
        globalData.challenges = challengesRes.data || [];
        globalData.kpis = kpisRes.data || [];

        // Fusion scores
        const scores = scoresRes.data || [];
        globalData.agents.forEach(agent => {
            const scoreRow = scores.find(s => s.user_id === agent.id);
            agent.scoreTotal = scoreRow ? scoreRow.total_points : 0;
        });

        refreshUI();

    } catch (err) {
        console.error("Erreur:", err);
    } finally {
        if(loader) loader.style.display = 'none';
    }
}

function refreshUI() {
    calculerKPIs();
    afficherTableauxPilotage();
    afficherClassements();
    afficherChallengesActifs();
    afficherGraphiquesFilRouge(); // 👈 Lancement des graphes
}

// =============================================================
// 📈 GRAPHIQUES FIL ROUGE
// =============================================================
function afficherGraphiquesFilRouge() {
    const cellules = ['Mover', 'Switcher', 'Coach', 'Pépinière'];
    // Palette de couleurs pour les équipes (Brésil, Italie, France...)
    // Vous pouvez ajuster les couleurs si besoin
    const teamColors = ['#FFD700', '#0000FF', '#FF0000', '#008000', '#FFA500', '#800080']; 

    cellules.forEach(cell => {
        const ctx = document.getElementById(`chart-${cell}`);
        if (!ctx) return;

        // Filtrer les données pour cette cellule
        const kpisCellule = globalData.kpis.filter(k => k.cellule === cell);
        
        // Récupérer toutes les dates uniques (axe X)
        const datesUniques = [...new Set(kpisCellule.map(k => k.date_kpi))].sort();
        const labels = datesUniques.map(d => {
            const dateObj = new Date(d);
            return `${dateObj.getDate()}/${dateObj.getMonth()+1}`;
        });

        // Préparer les datasets (un par équipe)
        const datasets = [];
        const equipesConcernees = [...new Set(kpisCellule.map(k => k.equipe_id))];

        equipesConcernees.forEach((eqId, index) => {
            const equipe = globalData.equipes.find(e => e.id === eqId);
            const nomEquipe = equipe ? equipe.nom : 'Equipe ' + eqId;
            const color = teamColors[index % teamColors.length];

            // Pour chaque date, trouver la valeur de cette équipe (ou null)
            const dataPoints = datesUniques.map(date => {
                const entry = kpisCellule.find(k => k.date_kpi === date && k.equipe_id === eqId);
                return entry ? entry.valeur_cumul : null; 
                // On utilise valeur_cumul pour voir la progression (Fil Rouge)
            });

            datasets.push({
                label: nomEquipe,
                data: dataPoints,
                borderColor: color,
                backgroundColor: color,
                tension: 0.3,
                fill: false,
                borderWidth: 3,
                pointRadius: 4
            });
        });

        // Si graphique existant, le détruire proprement
        const chartInstance = Chart.getChart(ctx);
        if (chartInstance) chartInstance.destroy();

        // Créer le nouveau graphique
        new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    intersect: false,
                },
                plugins: {
                    legend: { position: 'bottom' },
                    tooltip: { enabled: true }
                },
                scales: {
                    y: { beginAtZero: true }
                }
            }
        });
    });
}

// =============================================================
// 📊 KPIS GENERAUX
// =============================================================
function calculerKPIs() {
    const contratsValides = globalData.contrats.filter(c => c.statut === 'valide');
    document.getElementById('kpi-total-contrats').textContent = contratsValides.length;

    const totalPoints = globalData.agents.reduce((acc, a) => acc + a.scoreTotal, 0);
    document.getElementById('kpi-total-points').textContent = totalPoints.toLocaleString();

    const scoresEquipes = globalData.equipes.map(eq => {
        const agentsEq = globalData.agents.filter(a => a.equipe_id === eq.id);
        const total = agentsEq.reduce((sum, a) => sum + a.scoreTotal, 0);
        return { ...eq, score: total };
    }).sort((a, b) => b.score - a.score);

    if (scoresEquipes.length > 0) {
        document.getElementById('kpi-top-equipe').textContent = `${scoresEquipes[0].drapeau_emoji} ${scoresEquipes[0].nom}`;
    }

    const topAgent = [...globalData.agents].sort((a, b) => b.scoreTotal - a.scoreTotal)[0];
    if (topAgent) {
        document.getElementById('kpi-top-agent').textContent = `${topAgent.prenom} ${topAgent.nom}`;
    }
}

// =============================================================
// 🚨 PILOTAGE
// =============================================================
function afficherTableauxPilotage() {
    const enAttente = globalData.contrats.filter(c => c.statut === 'en_attente');
    const tbodyAttente = document.getElementById('tbody-attente');
    const panelAttente = document.getElementById('panel-attente');
    
    if (enAttente.length > 0) {
        panelAttente.style.display = 'block';
        document.getElementById('count-attente').textContent = enAttente.length;
        tbodyAttente.innerHTML = '';
        enAttente.forEach(c => {
            const agent = globalData.agents.find(a => a.id === c.agent_id);
            const nomAgent = agent ? `${agent.prenom} ${agent.nom}` : 'Inconnu';
            const date = new Date(c.created_at).toLocaleTimeString('fr-FR', {hour:'2-digit', minute:'2-digit'});
            tbodyAttente.innerHTML += `
                <tr>
                    <td>${date}</td><td>${nomAgent}</td><td>${agent?.equipes?.nom||'-'}</td><td>${c.type_contrat}</td>
                    <td>
                        <button onclick="adminValiderContrat('${c.id}')" style="background:#4CAF50; color:white; border:none; padding:4px 8px; border-radius:4px; cursor:pointer;">OK</button>
                        <button onclick="adminRejeterContrat('${c.id}')" style="background:#F44336; color:white; border:none; padding:4px 8px; border-radius:4px; cursor:pointer;">Non</button>
                    </td>
                </tr>`;
        });
    } else { panelAttente.style.display = 'none'; }
    filtrerHistorique();
}

function filtrerHistorique() {
    const filtreEq = document.getElementById('filtre-equipe').value;
    const filtreStatut = document.getElementById('filtre-statut').value;
    const tbody = document.getElementById('tbody-historique');
    tbody.innerHTML = '';
    let liste = globalData.contrats;
    if (filtreEq !== 'all') liste = liste.filter(c => { const a = globalData.agents.find(ag=>ag.id===c.agent_id); return a && a.equipe_id == filtreEq; });
    if (filtreStatut !== 'all') liste = liste.filter(c => c.statut === filtreStatut);
    
    liste.slice(0, 100).forEach(c => {
        const agent = globalData.agents.find(a => a.id === c.agent_id);
        const date = new Date(c.created_at).toLocaleDateString() + ' ' + new Date(c.created_at).toLocaleTimeString().slice(0,5);
        let badge = c.statut==='valide'?'✅':(c.statut==='rejete'?'❌':'⏳');
        tbody.innerHTML += `<tr><td>${date}</td><td>${agent?.prenom} ${agent?.nom}</td><td>${agent?.equipes?.nom}</td><td>${c.type_contrat}</td><td>${badge}</td><td><a href="${c.lien_piste}" target="_blank">🔗</a></td></tr>`;
    });
}

// =============================================================
// 🏆 CLASSEMENTS (LISTE COMPLÈTE)
// =============================================================
function afficherClassements() {
    // Equipes
    const tbodyEq = document.getElementById('tbody-classement-equipes');
    tbodyEq.innerHTML = '';
    const scoresEquipes = globalData.equipes.map(eq => {
        const agentsEq = globalData.agents.filter(a => a.equipe_id === eq.id);
        const total = agentsEq.reduce((sum, a) => sum + a.scoreTotal, 0);
        const nbContrats = globalData.contrats.filter(c => c.statut === 'valide' && agentsEq.find(a => a.id === c.agent_id)).length;
        return { ...eq, score: total, nbContrats: nbContrats };
    }).sort((a, b) => b.score - a.score);

    scoresEquipes.forEach((eq, idx) => {
        let medaille = idx===0?'🥇':(idx===1?'🥈':(idx===2?'🥉':idx+1));
        tbodyEq.innerHTML += `<tr><td style="font-size:1.2em;">${medaille}</td><td><span style="font-size:1.5em;">${eq.drapeau_emoji}</span> <strong>${eq.nom}</strong></td><td style="font-weight:bold; color:#1565C0;">${eq.score}</td><td>${eq.nbContrats}</td></tr>`;
    });

    // Agents (TOUS)
    const tbodyAg = document.getElementById('tbody-classement-agents');
    tbodyAg.innerHTML = '';
    // PAS DE SLICE ICI -> On affiche tout le monde
    const topAgents = [...globalData.agents].sort((a, b) => b.scoreTotal - a.scoreTotal);
    
    topAgents.forEach((ag, idx) => {
        let medaille = idx===0?'🥇':(idx===1?'🥈':(idx===2?'🥉':idx+1));
        tbodyAg.innerHTML += `<tr><td>${medaille}</td><td><strong>${ag.prenom} ${ag.nom}</strong></td><td>${ag.equipes?.nom||'-'}</td><td style="font-weight:bold; color:#1565C0;">${ag.scoreTotal}</td></tr>`;
    });
}

// =============================================================
// ⚡ ACTIONS
// =============================================================
function afficherChallengesActifs() {
    const div = document.getElementById('liste-challenges-actifs');
    if (!globalData.challenges.length) { div.innerHTML = '<i>Aucun challenge actif.</i>'; return; }
    div.innerHTML = '';
    globalData.challenges.forEach(c => {
        div.innerHTML += `<div style="background:#f9f9f9; padding:10px; margin-bottom:5px; border-left:3px solid #2196F3;"><strong>${c.titre}</strong> (${c.points_attribues} pts) <br><small>${c.description}</small></div>`;
    });
}

window.adminValiderContrat = async function(id) { if(confirm("Valider?")) { await sb.from('contrats').update({statut:'valide'}).eq('id',id); chargerTout(); }};
window.adminRejeterContrat = async function(id) { if(confirm("Rejeter?")) { await sb.from('contrats').update({statut:'rejete'}).eq('id',id); chargerTout(); }};

// Bonus Manuel
window.adminAttribuerPoints = async function() {
    const challengeId = document.getElementById('select-admin-epreuve').value;
    const agentId = document.getElementById('select-admin-agent').value;
    const points = document.getElementById('input-admin-points').value;
    if (!agentId || !points) return alert("Remplissez tout !");
    if (!confirm(`Donner ${points} points ?`)) return;

    let finalChallengeId = challengeId;
    if (!challengeId || challengeId === 'bonus') {
        const bonusCh = globalData.challenges.find(c => c.titre.includes("Autre") || c.titre.includes("Bonus"));
        if (bonusCh) finalChallengeId = bonusCh.id;
    }
    const { error } = await sb.from('challenge_reussites').insert([{ agent_id: agentId, challenge_flash_id: finalChallengeId, statut: 'valide', date_validation: new Date().toISOString(), points_manuel: parseInt(points) }]);
    if (error) alert("Erreur: " + error.message); else { alert("✅ Envoyé !"); chargerTout(); }
};

// =============================================================
// 🛠️ FORMULAIRES & MODALES
// =============================================================
function remplirFiltresEquipes() {
    const select = document.getElementById('filtre-equipe');
    globalData.equipes.forEach(eq => select.innerHTML += `<option value="${eq.id}">${eq.nom}</option>`);
}
function remplirSelectsAction() {
    const selEpreuve = document.getElementById('select-admin-epreuve');
    selEpreuve.innerHTML = '<option value="bonus">🎁 AUTRE / BONUS</option>';
    globalData.challenges.forEach(c => selEpreuve.innerHTML += `<option value="${c.id}">${c.titre}</option>`);
    const selAgent = document.getElementById('select-admin-agent');
    selAgent.innerHTML = '<option value="">-- Choisir agent --</option>';
    [...globalData.agents].sort((a,b)=>a.nom.localeCompare(b.nom)).forEach(a => selAgent.innerHTML += `<option value="${a.id}">${a.nom} ${a.prenom}</option>`);
}

window.ouvrirModalChallenge = function() { document.getElementById('modal-challenge').style.display='flex'; document.getElementById('challenge-debut').value = new Date(new Date().getTime() - new Date().getTimezoneOffset()*60000).toISOString().slice(0,16); };
window.fermerModalChallenge = function() { document.getElementById('modal-challenge').style.display='none'; };
window.creerChallenge = async function(e) {
    e.preventDefault();
    try {
        const { error } = await sb.from('challenges_flash').insert({
            titre: document.getElementById('challenge-titre').value, description: document.getElementById('challenge-description').value,
            type_challenge: document.getElementById('challenge-type').value, points_attribues: document.getElementById('challenge-points').value,
            date_debut: document.getElementById('challenge-debut').value, date_fin: document.getElementById('challenge-fin').value,
            cible: 'global', cellule_cible: document.getElementById('challenge-cible-cellule').value, statut: 'actif'
        });
        if (error) throw error; alert("✅ Challenge lancé !"); fermerModalChallenge(); chargerTout();
    } catch (err) { alert('Erreur : ' + err.message); }
};
async function chargerChallengesActifsManager() {
    // 1. On cible la zone d'affichage
    const container = document.getElementById('liste-challenges-actifs'); 
    if (!container) return;

    // 2. On récupère TOUS les challenges (sauf les terminés/supprimés)
    // On trie par date pour avoir les prochains en premier
    const { data: challenges } = await sb.from('challenges_flash')
        .select('*')
        .neq('statut', 'supprime')
        .neq('statut', 'termine')
        .order('date_debut', { ascending: true });

    if (!challenges) return;

    container.innerHTML = ''; // On vide la boîte
    
    // 3. Préparation Date locale (pour bien comparer)
    const date = new Date();
    date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
    const now = date.toISOString();

    let futursAffiches = 0; // Compteur pour limiter le teasing

    challenges.forEach(ch => {
        // Est-ce qu'il est en cours ? (Date début passée ET Date fin pas encore passée)
        const estActif = ch.statut === 'actif' && ch.date_debut <= now && ch.date_fin >= now;
        // Est-ce qu'il est dans le futur ?
        const estFutur = ch.date_debut > now;

        // --- 🧹 LE FILTRE DE NETTOYAGE ---
        // 1. Si c'est un futur et qu'on en a déjà affiché un -> On zappe (on masque les suivants)
        if (estFutur && futursAffiches >= 1) return;
        
        // 2. Si c'est un futur, on compte +1
        if (estFutur) futursAffiches++;

        // 3. Si ce n'est ni actif ni futur (ex: un vieux buggé), on zappe
        if (!estActif && !estFutur) return;
        // ----------------------------------

        // 4. Création visuelle (HTML)
        const div = document.createElement('div');
        
        // Style différent si Actif (Blanc/Vert) ou Futur (Gris)
        div.style.background = estActif ? "white" : "#f0f2f5";
        div.style.padding = "15px";
        div.style.marginBottom = "10px";
        div.style.borderRadius = "8px";
        div.style.borderLeft = estActif ? "5px solid #4CAF50" : "5px solid #bbb"; // Vert vs Gris
        div.style.boxShadow = "0 2px 5px rgba(0,0,0,0.05)";
        div.style.display = "flex";
        div.style.justifyContent = "space-between";
        div.style.alignItems = "center";
        if(estFutur) div.style.opacity = "0.8";

        // Heure formatée (ex: 14:30)
        const dateDeb = new Date(ch.date_debut);
        const heure = dateDeb.toLocaleTimeString('fr-FR', {hour: '2-digit', minute:'2-digit'});

        div.innerHTML = `
            <div>
                <strong style="font-size:1.1em; color: ${estActif ? '#2e7d32' : '#666'}">
                    ${estActif ? '🔥 EN COURS' : '⏳ BIENTÔT (' + heure + ')'}
                </strong>
                <div style="font-weight:bold; margin:4px 0; font-size:1.1em;">${ch.titre}</div>
                <div style="font-size:0.9em; color:#666;">${ch.description}</div>
            </div>
            <div style="text-align:right;">
                <div style="font-weight:bold; color:#1976D2; font-size:1.4em;">${ch.points_attribues} pts</div>
            </div>
        `;

        container.appendChild(div);
    });

    // Message vide
    if (container.innerHTML === '') {
        container.innerHTML = '<div style="padding:20px; text-align:center; color:#999;">Aucun challenge à l\'affiche 🎬</div>';
    }
}
window.stopperChallenge = async function(id) {
    if (!confirm("⚠️ Voulez-vous vraiment ARRÊTER ce challenge immédiatement ?\n\nIl disparaîtra des écrans des agents.")) return;

    const { error } = await sb.from('challenges_flash')
        .update({ statut: 'termine' }) // 👈 REMPLACEZ 'supprime' PAR 'termine' ICI
        .eq('id', id);

    if (error) {
        alert("Erreur technique : " + error.message);
    } else {
        alert("Challenge arrêté avec succès.");
        chargerChallengesActifsManager(); 
        if(typeof chargerListeChallengesManuels === 'function') chargerListeChallengesManuels();
    }
};

// =============================================================
// 📡 TEMPS RÉEL (AUTO-REFRESH PLATEAU)
// =============================================================
(function activerTempsReelPlateau() {
    console.log("📡 Activation du Temps Réel Plateau...");

    sb.channel('plateau-updates')
        .on('postgres_changes', { event: '*', schema: 'public' }, async () => {
            console.log("👑 Mise à jour du plateau...");
            
            // La fonction magique qui recharge tout existe déjà
            if(typeof chargerTout === 'function') await chargerTout();
            if(typeof chargerChallengesActifsManager === 'function') await chargerChallengesActifsManager();
        })
        .subscribe();
})();

// =============================================================
// 📡 TEMPS RÉEL GLOBAL (PLATEAU) - VERSION ULTIME
// =============================================================
(function activerTempsReelPlateau() {
    console.log("📡 Plateau : Mode Temps Réel activé !");

    const channel = sb.channel('plateau-global-updates')

    // On écoute n'importe quel changement sur les tables clés
    .on('postgres_changes', { event: '*', schema: 'public', table: 'contrats' }, rafraichirPlateau)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'challenges_flash' }, rafraichirPlateau)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'challenge_reussites' }, rafraichirPlateau)
    .subscribe();

    async function rafraichirPlateau() {
        console.log("♻️ Actualisation du Plateau...");
        // Appel de vos fonctions de chargement existantes
        if(typeof chargerTout === 'function') await chargerTout();
        // Si vous avez d'autres fonctions spécifiques, ajoutez-les ici
        if(typeof chargerChallengesActifsManager === 'function') await chargerChallengesActifsManager();
    }
})();