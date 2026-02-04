// =============================================================
// MANAGER V2 - Validation Contrats & Challenges
// =============================================================

console.log('👔 Manager V2 - Chargement...');
const { createClient } = window.supabase;
const sb = createClient(SUPABASE_CONFIG.URL, SUPABASE_CONFIG.KEY);

let managerActuel = null;
let equipeActuelle = null;
let tousLesAgents = [];
let tousLesContrats = [];

document.addEventListener('DOMContentLoaded', async function() {
    const { data: { user } } = await sb.auth.getUser();
    if (!user) { window.location.href = 'connexion-finale.html'; return; }

    await chargerDonneesManager(user.id);
    if (!managerActuel || (managerActuel.role !== 'manager' && managerActuel.role !== 'admin')) {
        window.location.href = 'dashboard.html'; return;
    }

    await chargerTousLesAgents();
    await chargerTousLesContrats();

    afficherInfos();
    chargerContratsAttente();
    chargerChallengesAttente(); // Nouveau !
    chargerAgentsEquipe();
});

async function chargerDonneesManager(uid) {
    const { data } = await sb.from('users').select(`*, equipes (id, nom, drapeau_emoji)`).eq('id', uid).single();
    managerActuel = data;
    equipeActuelle = data.equipes;
}
async function chargerTousLesAgents() {
    const { data } = await sb.from('users').select('*').eq('role', 'agent');
    tousLesAgents = data;
}
async function chargerTousLesContrats() {
   // On garde VALIDE (pour les scores) et EN ATTENTE (pour la validation)
const { data } = await sb.from('contrats').select('*').in('statut', ['valide', 'en_attente']);
    tousLesContrats = data;
}

function afficherInfos() {
    document.getElementById('nom-manager').textContent = `${managerActuel.prenom} ${managerActuel.nom}`;
    if(equipeActuelle) {
        document.getElementById('equipe-manager').textContent = `Équipe ${equipeActuelle.nom} ${equipeActuelle.drapeau_emoji || ''}`;
    }
}

// -------------------------------------------------------------
// VALIDATION CONTRATS (Gardé)
// -------------------------------------------------------------
async function chargerContratsAttente() {
    const myAgents = tousLesAgents.filter(a => a.equipe_id === equipeActuelle?.id).map(a => a.id);
    const contrats = tousLesContrats.filter(c => c.statut === 'en_attente' && myAgents.includes(c.agent_id));
    
    const liste = document.getElementById('contrats-attente-liste');
    const badge = document.getElementById('badge-attente');
    
    if(badge) {
        badge.textContent = contrats.length;
        badge.style.display = contrats.length ? 'inline-block' : 'none';
    }

    liste.innerHTML = contrats.length ? '' : '<div class="aucun-contrat">Rien à valider ✅</div>';

    contrats.forEach(c => {
        const agent = tousLesAgents.find(a => a.id === c.agent_id);
        const div = document.createElement('div');
        div.className = 'contrat-attente-item';
        div.innerHTML = `
            <div>
                <strong>${agent?.prenom} ${agent?.nom}</strong> (${c.type_contrat})<br>
                <small>${new Date(c.created_at).toLocaleString()}</small>
            </div>
            <div>
                <a href="${c.lien_piste}" target="_blank">🔗</a>
                <button onclick="traiterContrat('${c.id}', 'valide')">✅</button>
                <button onclick="traiterContrat('${c.id}', 'rejete')">❌</button>
            </div>
        `;
        liste.appendChild(div);
    });
}

window.traiterContrat = async function(id, statut) {
    await sb.from('contrats').update({ statut, valide_par: managerActuel.id, valide_le: new Date() }).eq('id', id);
    await chargerTousLesContrats(); // Refresh local data
    chargerContratsAttente();
    chargerAgentsEquipe(); // Mettre à jour scores
};

// -------------------------------------------------------------
// VALIDATION CHALLENGES (Nouveau)
// -------------------------------------------------------------
async function chargerChallengesAttente() {
    // On doit ajouter une section HTML pour ça dans manager.html si pas fait,
    // ou on l'affiche à la suite des contrats.
    // Supposons qu'il y a un div id="challenges-validation-liste"
    
    // Récupérer les réussites en attente pour mon équipe
    const { data: reussites } = await sb.from('challenge_reussites')
        .select(`*, challenges_flash(titre, points_attribues), users(prenom, nom, equipe_id)`)
        .eq('statut', 'en_attente');
        
    // Filtrer pour mon équipe
    const mesReussites = (reussites || []).filter(r => r.users.equipe_id === equipeActuelle?.id);

    // On peut créer dynamiquement la section si elle n'existe pas
    let section = document.getElementById('section-challenges-manager');
    if (!section && mesReussites.length > 0) {
        // Création à la volée pour l'exemple
        const main = document.querySelector('.manager-container');
        section = document.createElement('section');
        section.id = 'section-challenges-manager';
        section.className = 'section-validation'; // même style
        section.innerHTML = `
            <div class="section-header"><h2 class="section-titre">⚡ Challenges à valider</h2></div>
            <div id="challenges-liste" class="contrats-validation-liste"></div>
        `;
        main.insertBefore(section, main.children[1]); // Après contrats
    }
    
    if (section) {
        const liste = document.getElementById('challenges-liste');
        liste.innerHTML = '';
        mesReussites.forEach(r => {
            const div = document.createElement('div');
            div.className = 'contrat-attente-item';
            div.style.borderLeft = '4px solid #FF9800'; // Orange pour distinguer
            div.innerHTML = `
                <div>
                    <strong>${r.users.prenom} ${r.users.nom}</strong><br>
                    Challenge : ${r.challenges_flash.titre} (+${r.challenges_flash.points_attribues} pts)
                </div>
                <div>
                    <button onclick="traiterChallenge('${r.id}', 'valide')">✅</button>
                    <button onclick="traiterChallenge('${r.id}', 'rejete')">❌</button>
                </div>
            `;
            liste.appendChild(div);
        });
        if (mesReussites.length === 0) section.remove();
    }
}

window.traiterChallenge = async function(id, statut) {
    await sb.from('challenge_reussites').update({ statut }).eq('id', id);
    chargerChallengesAttente();
};

async function chargerAgentsEquipe() {
    // ... Même logique qu'avant mais on peut appeler l'algo de calcul complet si on veut la précision
    // Pour simplifier ici, on affiche juste le volume, ou alors on duplique la fonction calculerScoresComplets() de dashboard.js
}