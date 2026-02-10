// =============================================================
// 👑 PLATEAU ADMIN (COCKPIT) - VERSION FINALISÉE & VÉRIFIÉE
// =============================================================

console.log('👑 Admin Cockpit - Chargement...');

const { createClient } = window.supabase;
const sb = createClient(SUPABASE_CONFIG.URL, SUPABASE_CONFIG.KEY);

let globalData = {
    agents: [],
    contrats: [],
    equipes: [],
    challenges: [],
    reussites: [],
    kpis: []
};

// =============================================================
// 🏁 INITIALISATION SÉCURISÉE
// =============================================================
document.addEventListener('DOMContentLoaded', async function() {
    
    // 1. Vérification Utilisateur & Rôle
    const { data: { user } } = await sb.auth.getUser();
    if (!user) { window.location.href = 'connexion-finale.html'; return; }

    const { data: userData } = await sb.from('users').select('role').eq('id', user.id).single();

    if (!userData || userData.role !== 'admin') {
        if (userData && userData.role === 'manager') window.location.href = 'manager.html';
        else window.location.href = 'dashboard.html';
        return;
    }

    // 2. Chargement Initial
    await chargerTout();
    
    // 3. Initialisation Interface
    remplirFiltresEquipes();
    remplirSelectsAction();
    
    // Bouton Déconnexion
    const btnDeco = document.getElementById('btn-deconnexion');
    if(btnDeco) {
        btnDeco.addEventListener('click', async () => {
            if(confirm("Se déconnecter ?")) {
                await sb.auth.signOut(); 
                window.location.href = 'connexion-finale.html';
            }
        });
    }

    // 4. Lancement du Temps Réel
    ecouterRealtimePlateau();
});

// =============================================================
// 📡 TEMPS RÉEL (UNIQUE)
// =============================================================
function ecouterRealtimePlateau() {
    console.log('📡 Activation du temps réel sur le plateau...');
    
    sb.channel('flux-plateau-admin')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'contrats' }, () => {
            console.log("🔔 Changement Contrat -> Refresh"); chargerTout();
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'challenges_flash' }, () => {
            console.log("⚡ Changement Challenge -> Refresh"); chargerTout();
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'challenge_reussites' }, () => {
            console.log("🏆 Nouvelle Réussite -> Refresh"); chargerTout();
        })
        .subscribe();
}

// =============================================================
// 📡 CHARGEMENT ET CALCUL (CORRIGÉ)
// =============================================================
async function chargerTout() {
    const loader = document.getElementById('loading-indicator');
    if(loader) loader.style.display = 'block';

    try {
        // On charge tout en parallèle (Optimisation de vitesse)
        const [agentsRes, contratsRes, equipesRes, challengesRes, kpisRes, reussitesRes] = await Promise.all([
            sb.from('users').select('*, equipes(nom, drapeau_emoji)').eq('role', 'agent'),
            sb.from('contrats').select('*').order('created_at', { ascending: false }),
            sb.from('equipes').select('*'),
            // 👇 CORRECTION ICI : On trie par date CROISSANTE (ascending: true)
            // Comme ça, le premier challenge "futur" qu'on trouve sera bien le PROCHAIN, pas le dernier.
            sb.from('challenges_flash').select('*').order('date_debut', { ascending: true }),
            sb.from('kpi_equipe_journalier').select('*, equipes(nom, drapeau_emoji)').order('date_kpi', { ascending: true }),
            sb.from('challenge_reussites').select('*').eq('statut', 'valide')
        ]);

        globalData.agents = agentsRes.data || [];
        globalData.contrats = contratsRes.data || [];
        globalData.equipes = equipesRes.data || [];
        globalData.challenges = challengesRes.data || []; // Maintenant triés du plus proche au plus loin
        globalData.kpis = kpisRes.data || [];
        globalData.reussites = reussitesRes.data || [];

        // A. On charge les scores officiels depuis la Vue SQL (AJOUT)
        const { data: scoresOfficiels } = await sb.from('view_score_live').select('user_id, score_total');

        // B. On distribue le score officiel à chaque agent
        globalData.agents.forEach(agent => {
            // On cherche le score de cet agent dans la liste officielle
            const scoreRow = scoresOfficiels ? scoresOfficiels.find(s => s.user_id === agent.id) : null;
            
            // Si on trouve, on prend le score total (Contrats + Bonus). Sinon 0.
            agent.scoreTotal = scoreRow ? scoreRow.score_total : 0;
        });

        refreshUI();

    } catch (err) {
        console.error("Erreur chargement:", err);
    } finally {
        if(loader) loader.style.display = 'none';
    }
}

function refreshUI() {
    calculerKPIs();
    afficherTableauxPilotage();
    afficherClassements(); 
    afficherChallengesActifs();
    afficherGraphiquesFilRouge();
}

// =============================================================
// ⚡ ACTIONS & CHALLENGES
// =============================================================

// Bonus Manuel (Fonctionne et met à jour l'écran)
window.adminAttribuerPoints = async function() {
    const challengeId = document.getElementById('select-admin-epreuve').value;
    const agentId = document.getElementById('select-admin-agent').value;
    const pointsInput = document.getElementById('input-admin-points').value;

    if (!agentId || !pointsInput) return alert("Veuillez sélectionner un agent et entrer des points.");
    
    const points = parseInt(pointsInput); // Sécurité mathématique

    if (!confirm(`Attribuer ${points} points à l'agent sélectionné ?`)) return;

    let finalChallengeId = challengeId;
    if (!challengeId || challengeId === 'bonus') {
        finalChallengeId = null; 
    }

    const { error } = await sb.from('challenge_reussites').insert([{ 
        agent_id: agentId, 
        challenge_flash_id: finalChallengeId, 
        statut: 'valide', 
        date_validation: new Date().toISOString(), 
        points_gagnes: points,
        commentaire: 'Bonus Admin Plateau'
    }]);

    if (error) {
        alert("Erreur: " + error.message); 
    } else { 
        alert("✅ Points envoyés avec succès !"); 
        await chargerTout(); // Rafraîchissement immédiat
    }
};

window.stopperChallenge = async function(id) {
    if(confirm("Arrêter ce challenge prématurément ?")) {
        await sb.from('challenges_flash').update({statut:'termine', date_fin: new Date().toISOString()}).eq('id',id);
        await chargerTout();
    }
};

window.creerChallenge = async function(e) {
    e.preventDefault();
    try {
        const { error } = await sb.from('challenges_flash').insert({
            titre: document.getElementById('challenge-titre').value, 
            description: document.getElementById('challenge-description').value,
            type_challenge: document.getElementById('challenge-type').value, 
            points_attribues: document.getElementById('challenge-points').value,
            date_debut: document.getElementById('challenge-debut').value, 
            date_fin: document.getElementById('challenge-fin').value,
            cible: 'global', 
            cellule_cible: document.getElementById('challenge-cible-cellule').value, 
            statut: 'actif'
        });
        if (error) throw error; 
        alert("✅ Challenge lancé !"); 
        fermerModalChallenge(); 
        await chargerTout(); 
    } catch (err) { alert('Erreur : ' + err.message); }
};

// =============================================================
// 📊 AFFICHAGE & KPIS
// =============================================================

function afficherChallengesActifs() {
    const div = document.getElementById('liste-challenges-actifs');
    if(!div) return;
    
    if (!globalData.challenges.length) { div.innerHTML = '<i>Aucun challenge actif.</i>'; return; }
    div.innerHTML = '';
    
    const now = new Date().toISOString();
    let futursAffiches = 0; 

    // Grâce au tri "ascending: true", on parcourt du plus proche au plus loin
    globalData.challenges.forEach(c => {
        const estActif = c.statut === 'actif' && c.date_debut <= now && c.date_fin >= now;
        const estFutur = c.statut === 'actif' && c.date_debut > now;
        
        // On affiche le premier "Futur" qu'on croise (c'est le prochain !) et on stop les suivants
        if (estFutur && futursAffiches >= 1) return;
        if (estFutur) futursAffiches++;
        
        // On masque les vieux trucs terminés
        if (!estActif && !estFutur) return;

        const style = estActif ? "border-left:5px solid #4CAF50; background:white;" : "border-left:5px solid #ccc; background:#f0f2f5; opacity:0.8;";
        const badge = estActif ? "🔥 EN COURS" : "⏳ BIENTÔT";

        div.innerHTML += `
            <div style="padding:15px; margin-bottom:10px; border-radius:8px; box-shadow:0 2px 5px rgba(0,0,0,0.05); ${style}">
                <div style="display:flex; justify-content:space-between;">
                    <div>
                        <strong style="color:${estActif?'#2E7D32':'#666'}">${badge}</strong>
                        <div style="font-weight:bold; font-size:1.1em; margin:5px 0;">${c.titre}</div>
                        <small>${c.description}</small>
                    </div>
                    <div style="text-align:right;">
                        <strong style="color:#1976D2; font-size:1.2em;">${c.points_attribues} pts</strong>
                        <br>
                        ${estActif ? `<button onclick="stopperChallenge('${c.id}')" style="margin-top:5px; background:#F44336; color:white; border:none; padding:5px 10px; border-radius:4px; cursor:pointer; font-size:0.8em;">Arrêter</button>` : ''}
                    </div>
                </div>
            </div>`;
    });
}

function afficherClassements() {
    // Equipes
    const tbodyEq = document.getElementById('tbody-classement-equipes');
    if(tbodyEq) {
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
    }

    // Agents
    const tbodyAg = document.getElementById('tbody-classement-agents');
    const filtreCellule = document.getElementById('filtre-classement-cellule') ? document.getElementById('filtre-classement-cellule').value : 'all';

    if(tbodyAg) {
        tbodyAg.innerHTML = '';
        let agentsFiltres = [...globalData.agents];
        if (filtreCellule !== 'all') agentsFiltres = agentsFiltres.filter(a => a.cellule === filtreCellule);
        agentsFiltres.sort((a, b) => b.scoreTotal - a.scoreTotal);
        
        if (agentsFiltres.length === 0) {
            tbodyAg.innerHTML = `<tr><td colspan="4" style="text-align:center; color:#999;">Aucun agent trouvé dans cette cellule</td></tr>`;
        } else {
            agentsFiltres.forEach((ag, idx) => {
                let medaille = idx===0?'🥇':(idx===1?'🥈':(idx===2?'🥉':idx+1));
                tbodyAg.innerHTML += `<tr><td>${medaille}</td><td><strong>${ag.prenom} ${ag.nom}</strong><br><small style="color:#666">${ag.cellule}</small></td><td>${ag.equipes?.nom||'-'}</td><td style="font-weight:bold; color:#1565C0;">${ag.scoreTotal}</td></tr>`;
            });
        }
    }
}

function calculerKPIs() {
    const contratsValides = globalData.contrats.filter(c => c.statut === 'valide');
    const elTotal = document.getElementById('kpi-total-contrats');
    if(elTotal) elTotal.textContent = contratsValides.length;

    const totalPoints = globalData.agents.reduce((acc, a) => acc + a.scoreTotal, 0);
    const elPoints = document.getElementById('kpi-total-points');
    if(elPoints) elPoints.textContent = totalPoints.toLocaleString();

    const scoresEquipes = globalData.equipes.map(eq => {
        const agentsEq = globalData.agents.filter(a => a.equipe_id === eq.id);
        const total = agentsEq.reduce((sum, a) => sum + a.scoreTotal, 0);
        return { ...eq, score: total };
    }).sort((a, b) => b.score - a.score);

    const elTopEq = document.getElementById('kpi-top-equipe');
    if (scoresEquipes.length > 0 && elTopEq) elTopEq.textContent = `${scoresEquipes[0].drapeau_emoji} ${scoresEquipes[0].nom}`;

    const topAgent = [...globalData.agents].sort((a, b) => b.scoreTotal - a.scoreTotal)[0];
    const elTopAg = document.getElementById('kpi-top-agent');
    if (topAgent && elTopAg) elTopAg.textContent = `${topAgent.prenom} ${topAgent.nom}`;
}

function afficherTableauxPilotage() {
    const enAttente = globalData.contrats.filter(c => c.statut === 'en_attente');
    const tbodyAttente = document.getElementById('tbody-attente');
    const panelAttente = document.getElementById('panel-attente');
    
    if (tbodyAttente && panelAttente) {
        if (enAttente.length > 0) {
            panelAttente.style.display = 'block';
            document.getElementById('count-attente').textContent = enAttente.length;
            tbodyAttente.innerHTML = '';
            enAttente.forEach(c => {
                const agent = globalData.agents.find(a => a.id === c.agent_id);
                const nomAgent = agent ? `${agent.prenom} ${agent.nom}` : 'Inconnu';
                const date = new Date(c.created_at).toLocaleTimeString('fr-FR', {hour:'2-digit', minute:'2-digit'});
                tbodyAttente.innerHTML += `<tr><td>${date}</td><td>${nomAgent}</td><td>${agent?.equipes?.nom||'-'}</td><td>${c.type_contrat}</td><td><button onclick="adminValiderContrat('${c.id}')" style="background:#4CAF50; color:white; border:none; padding:4px 8px; border-radius:4px; cursor:pointer;">OK</button> <button onclick="adminRejeterContrat('${c.id}')" style="background:#F44336; color:white; border:none; padding:4px 8px; border-radius:4px; cursor:pointer;">Non</button></td></tr>`;
            });
        } else { panelAttente.style.display = 'none'; }
    }
    filtrerHistorique();
}

function filtrerHistorique() {
    const elFiltreEq = document.getElementById('filtre-equipe');
    const elFiltreStatut = document.getElementById('filtre-statut');
    const tbody = document.getElementById('tbody-historique');
    if(!tbody) return;

    const filtreEq = elFiltreEq ? elFiltreEq.value : 'all';
    const filtreStatut = elFiltreStatut ? elFiltreStatut.value : 'all';
    
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

function afficherGraphiquesFilRouge() {
    const cellules = ['Mover', 'Switcher', 'Coach', 'Pépinière'];
    const teamColors = ['#FFD700', '#0000FF', '#FF0000', '#008000', '#FFA500', '#800080']; 
    cellules.forEach(cell => {
        const ctx = document.getElementById(`chart-${cell}`);
        if (!ctx) return;
        const kpisCellule = globalData.kpis.filter(k => k.cellule === cell);
        const datesUniques = [...new Set(kpisCellule.map(k => k.date_kpi))].sort();
        const labels = datesUniques.map(d => { const dateObj = new Date(d); return `${dateObj.getDate()}/${dateObj.getMonth()+1}`; });
        const datasets = [];
        const equipesConcernees = [...new Set(kpisCellule.map(k => k.equipe_id))];
        equipesConcernees.forEach((eqId, index) => {
            const equipe = globalData.equipes.find(e => e.id === eqId);
            const dataPoints = datesUniques.map(date => { const entry = kpisCellule.find(k => k.date_kpi === date && k.equipe_id === eqId); return entry ? entry.valeur_cumul : null; });
            datasets.push({ label: equipe ? equipe.nom : 'Eq '+eqId, data: dataPoints, borderColor: teamColors[index%teamColors.length], backgroundColor: teamColors[index%teamColors.length], tension: 0.3, fill: false, borderWidth: 3, pointRadius: 4 });
        });
        const chartInstance = Chart.getChart(ctx);
        if (chartInstance) chartInstance.destroy();
        new Chart(ctx, { type: 'line', data: { labels: labels, datasets: datasets }, options: { responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false }, plugins: { legend: { position: 'bottom' } }, scales: { y: { beginAtZero: true } } } });
    });
}

// =============================================================
// 🛠️ OUTILS & FORMULAIRES
// =============================================================
function remplirFiltresEquipes() {
    const select = document.getElementById('filtre-equipe');
    if(select) {
        select.innerHTML = '<option value="all">Toutes équipes</option>';
        globalData.equipes.forEach(eq => select.innerHTML += `<option value="${eq.id}">${eq.nom}</option>`);
    }
}

function remplirSelectsAction() {
    const selEpreuve = document.getElementById('select-admin-epreuve');
    if(selEpreuve) {
        selEpreuve.innerHTML = '<option value="bonus">🎁 AUTRE / BONUS</option>';
        globalData.challenges.forEach(c => selEpreuve.innerHTML += `<option value="${c.id}">${c.titre}</option>`);
    }
    const selAgent = document.getElementById('select-admin-agent');
    if(selAgent) {
        selAgent.innerHTML = '<option value="">-- Choisir agent --</option>';
        [...globalData.agents].sort((a,b)=>a.nom.localeCompare(b.nom)).forEach(a => selAgent.innerHTML += `<option value="${a.id}">${a.nom} ${a.prenom}</option>`);
    }
}

window.ouvrirModalChallenge = function() { 
    const modal = document.getElementById('modal-challenge');
    if(modal) {
        modal.style.display='flex'; 
        const now = new Date(); now.setHours(now.getHours() - 1);
        const toLocalISO = (d) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
        const elDebut = document.getElementById('challenge-debut'); const elFin = document.getElementById('challenge-fin');
        if(elDebut) elDebut.value = toLocalISO(now);
        const demain = new Date(now); demain.setDate(demain.getDate() + 1);
        if(elFin) elFin.value = toLocalISO(demain);
    }
};

window.fermerModalChallenge = function() { 
    const modal = document.getElementById('modal-challenge');
    if(modal) modal.style.display='none'; 
};

window.adminValiderContrat = async function(id) { if(confirm("Valider ce contrat ?")) await sb.from('contrats').update({statut:'valide', valide_le: new Date().toISOString()}).eq('id',id); };
window.adminRejeterContrat = async function(id) { if(confirm("Rejeter ce contrat ?")) await sb.from('contrats').update({statut:'rejete', valide_le: new Date().toISOString()}).eq('id',id); };