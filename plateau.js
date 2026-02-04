// =============================================================
// PLATEAU V2 - Leaderboard Complet (Code Corrigé)
// =============================================================

console.log('🏔️ Plateau V2 - Démarrage du script...');

// On attend que la page soit totalement chargée pour éviter les erreurs
document.addEventListener('DOMContentLoaded', async function() {

    // 1. VÉRIFICATION DE SÉCURITÉ : Supabase est-il là ?
    if (typeof supabase === 'undefined') {
        console.error("ERREUR CRITIQUE : La librairie Supabase n'est pas chargée.");
        alert("Erreur technique : Supabase non chargé. Vérifiez votre connexion.");
        return;
    }

    // 2. CONNEXION À LA BASE DE DONNÉES
    // On utilise "window.sbClient" pour éviter les conflits de noms avec d'autres fichiers
    const sb = supabase.createClient(SUPABASE_CONFIG.URL, SUPABASE_CONFIG.KEY);

    // 3. VÉRIFICATION DE L'UTILISATEUR
    const { data: { user } } = await sb.auth.getUser();

    // Si pas connecté -> retour à l'accueil
    if (!user) { 
        console.log("Utilisateur non connecté, redirection...");
        window.location.href = 'index.html'; 
        return; 
    }

    // 4. MISE À JOUR DU HEADER (Afficher le nom de l'utilisateur)
    // C'était manquant dans votre version précédente !
    const nomElement = document.getElementById('nom-utilisateur');
    const roleElement = document.getElementById('role-utilisateur');
    
    if (nomElement) nomElement.textContent = `${user.user_metadata.prenom || ''} ${user.user_metadata.nom || ''}`;
    if (roleElement) roleElement.textContent = `Rôle : ${user.user_metadata.role || 'Agent'}`;

    // 5. CHARGEMENT DES DONNÉES
    console.log('Chargement des données du plateau...');
    
    try {
        await chargerEtCalculer(sb);
        
        // 6. GESTION DES ONGLETS (Clics)
        activerGestionOnglets();
        
    } catch (erreur) {
        console.error("Erreur lors du chargement des données :", erreur);
        if (nomElement) nomElement.textContent = "Erreur de chargement";
    }
});

// -------------------------------------------------------------
// FONCTIONS DE LOGIQUE
// -------------------------------------------------------------

async function chargerEtCalculer(sb) {
    // A. Récupération des données depuis Supabase
    const { data: agents } = await sb.from('users').select(`*, equipes (nom, drapeau_emoji)`).eq('role', 'agent');
    const { data: contrats } = await sb.from('contrats').select('*').in('statut', ['valide', 'en_attente']);
const { data: reussites } = await sb.from('challenge_reussites').select('*').in('statut', ['valide', 'en_attente']);
    const { data: equipes } = await sb.from('equipes').select('*');

    const listeAgents = agents || [];
    const listeContrats = contrats || [];
    const listeReussites = reussites || [];
    const listeEquipes = equipes || [];

    // B. Calcul des scores (Même logique que le Dashboard)
    listeAgents.forEach(agent => {
        agent.scoreTotal = 0; // On remet à zéro

        // Points Contrats (10pts ou 20pts le vendredi)
        const contratsAgent = listeContrats.filter(c => c.agent_id === agent.id);
        contratsAgent.forEach(c => {
            const isFri = c.created_at.includes('2026-02-20'); // Date exemple du vendredi
            agent.scoreTotal += isFri ? 20 : 10;
        });

        // Points Challenges
        const challengesAgent = listeReussites.filter(r => r.agent_id === agent.id);
        challengesAgent.forEach(r => {
            agent.scoreTotal += (r.points_gagnes || 0);
        });
    });

    // C. Affichage
    afficherPodium(listeAgents);
    afficherTableauGlobal(listeAgents, listeContrats);
    afficherClassementEquipes(listeEquipes, listeAgents);
    
    // Si vous avez les fonctions pour "Par Cellule" et "Records", elles iront ici
}

function afficherPodium(agents) {
    // On trie les agents par score décroissant (du plus grand au plus petit)
    const top3 = [...agents].sort((a, b) => b.scoreTotal - a.scoreTotal).slice(0, 3);

    // Mise à jour du podium HTML
    // 1er (Au centre)
    updatePodiumSlot(1, top3[0]);
    // 2ème (À gauche)
    updatePodiumSlot(2, top3[1]);
    // 3ème (À droite)
    updatePodiumSlot(3, top3[2]);
}

function updatePodiumSlot(rang, agent) {
    if (!agent) return; // Si moins de 3 agents, on ne fait rien
    
    // On met à jour l'avatar, le nom, l'équipe et le score
    const avatarDiv = document.getElementById(`podium-${rang}-avatar`);
    if (avatarDiv) {
        // Si l'agent a une photo/avatar on pourrait la mettre, sinon on garde la médaille
        // avatarDiv.textContent = agent.prenom[0]; // Exemple : Initiale
    }
    
    const nomDiv = document.getElementById(`podium-${rang}-nom`);
    if (nomDiv) nomDiv.textContent = `${agent.prenom} ${agent.nom}`;

    const equipeDiv = document.getElementById(`podium-${rang}-equipe`);
    if (equipeDiv) equipeDiv.textContent = agent.equipes?.nom || '';

    const scoreDiv = document.getElementById(`podium-${rang}-score`);
    if (scoreDiv) scoreDiv.textContent = `${agent.scoreTotal} pts`;
}

function afficherTableauGlobal(agents, contrats) {
    const tbody = document.getElementById('tableau-global-body');
    if (!tbody) return;

    const classe = [...agents].sort((a, b) => b.scoreTotal - a.scoreTotal);

    tbody.innerHTML = classe.map((agent, index) => {
        // Compter les contrats de cet agent
        const nbContrats = contrats.filter(c => c.agent_id === agent.id).length;
        
        // Déterminer la médaille pour les 3 premiers
        let medaille = '';
        if (index === 0) medaille = '🥇';
        if (index === 1) medaille = '🥈';
        if (index === 2) medaille = '🥉';

        return `
            <tr>
                <td style="font-weight:bold;">${index + 1}</td>
                <td>
                    <div style="font-weight:600;">${agent.prenom} ${agent.nom}</div>
                </td>
                <td>${agent.equipes?.drapeau_emoji || '🏳️'} ${agent.equipes?.nom || ''}</td>
                <td><span class="badge-cellule">${agent.cellule || '-'}</span></td>
                <td style="color:#FF9F1C; font-weight:bold; font-size:1.1em;">${agent.scoreTotal} pts</td>
                <td>${nbContrats}</td>
                <td>${medaille}</td>
            </tr>
        `;
    }).join('');
}

function afficherClassementEquipes(equipes, agents) {
    const container = document.getElementById('equipes-classement');
    if (!container) return;

    // Calculer le score total de chaque équipe
    const scoreEquipes = equipes.map(eq => {
        const agentsDeLequipe = agents.filter(a => a.equipe_id === eq.id);
        const totalPoints = agentsDeLequipe.reduce((somme, a) => somme + a.scoreTotal, 0);
        return { ...eq, totalPoints };
    }).sort((a, b) => b.totalPoints - a.totalPoints); // Trier du plus grand au plus petit

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

function activerGestionOnglets() {
    const btns = document.querySelectorAll('.tab-btn');
    const contents = document.querySelectorAll('.tab-content');

    btns.forEach(btn => {
        btn.addEventListener('click', () => {
            // 1. On retire la classe 'active' de partout
            btns.forEach(b => b.classList.remove('active'));
            contents.forEach(c => c.classList.remove('active'));

            // 2. On l'ajoute sur l'élément cliqué
            btn.classList.add('active');
            
            // 3. On affiche le bon contenu
            const tabId = btn.getAttribute('data-tab');
            const targetContent = document.getElementById(`tab-${tabId}`);
            if (targetContent) targetContent.classList.add('active');
        });
    });
}