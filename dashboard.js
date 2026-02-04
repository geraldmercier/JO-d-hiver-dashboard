// =============================================================
// DASHBOARD AGENT - VERSION FINALE (Nettoyée & Intégrée)
// =============================================================

console.log('🏔️ Dashboard Agent FINAL - Chargement...');

const { createClient } = window.supabase;
const sb = createClient(SUPABASE_CONFIG.URL, SUPABASE_CONFIG.KEY);

let utilisateurActuel = null;
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

    console.log('✅ Utilisateur connecté:', user.email);

    // 1. Charger l'utilisateur
    await chargerDonneesUtilisateur(user.id);
    if (!utilisateurActuel) return; // Stop si échec

    // 2. Charger les données globales
    await chargerTousLesAgents();
    await chargerTousLesContrats();

    // 3. Afficher l'interface
    afficherInformationsHeader();
    await calculerEtAfficherClassement();
    await calculerEtAfficherSkiFond();
    await calculerEtAfficherPerformanceJour();
    await calculerEtAfficherEquipe();
    await chargerContratsJour();
    await chargerChallengesActifs(); // Nouvelle fonction intégrée ici
    
    // Placeholders pour le futur
    afficherCalendrierReel();
    afficherBadgesReels();

    // 4. Events
    const formContrat = document.getElementById('formulaire-contrat');
    if (formContrat) formContrat.addEventListener('submit', enregistrerContrat);
    
    const btnDeco = document.getElementById('btn-deconnexion');
    if (btnDeco) btnDeco.addEventListener('click', deconnexion);

    console.log('✅ Dashboard entièrement chargé');
});


// -------------------------------------------------------------
// CHARGEMENT DONNÉES
// -------------------------------------------------------------
async function chargerDonneesUtilisateur(userId) {
    try {
        const { data, error } = await sb
            .from('users')
            .select(`*, equipes (nom, drapeau_emoji)`)
            .eq('id', userId)
            .single();

        if (error) throw error;
        utilisateurActuel = data;
    } catch (error) {
        console.error('❌ Erreur utilisateur:', error);
    }
}

async function chargerTousLesAgents() {
    const { data } = await sb.from('users').select(`*, equipes (nom, drapeau_emoji)`).eq('role', 'agent');
    tousLesAgents = data || [];
}

async function chargerTousLesContrats() {
    const { data } = await sb.from('contrats').select('*').eq('statut', 'valide');
    tousLesContrats = data || [];
}


// -------------------------------------------------------------
// AFFICHAGE HEADER
// -------------------------------------------------------------
function afficherInformationsHeader() {
    if (!utilisateurActuel) return;

    // Nom
    const elNom = document.getElementById('nom-agent');
    if(elNom) elNom.textContent = utilisateurActuel.prenom + ' ' + utilisateurActuel.nom;
    
    // Équipe
    const elEquipe = document.getElementById('equipe-agent');
    const elNomEquipeProfil = document.getElementById('nom-equipe');
    const elDrapeau = document.getElementById('drapeau-equipe');

    if (utilisateurActuel.equipes) {
        const drapeau = utilisateurActuel.equipes.drapeau_emoji || '🏳️';
        const nomEquipe = utilisateurActuel.equipes.nom;
        
        if(elEquipe) elEquipe.textContent = `Équipe ${nomEquipe} ${drapeau}`;
        if(elNomEquipeProfil) elNomEquipeProfil.textContent = `Équipe ${nomEquipe}`;
        if(elDrapeau) elDrapeau.textContent = drapeau;
    } else {
        if(elEquipe) elEquipe.textContent = 'Sans équipe';
    }
    
    // Cellule
    const elCellule = document.getElementById('cellule-agent');
    if(elCellule) elCellule.textContent = utilisateurActuel.cellule || 'Non assigné';

    // Avatar
    const avatar = document.getElementById('avatar-agent');
    if (avatar && utilisateurActuel.avatar_url) {
        avatar.src = utilisateurActuel.avatar_url;
    }
}


// -------------------------------------------------------------
// CLASSEMENTS
// -------------------------------------------------------------
async function calculerEtAfficherClassement() {
    if (!tousLesAgents.length) return;

    const agentsScores = tousLesAgents.map(agent => {
        const contrats = tousLesContrats.filter(c => c.agent_id === agent.id);
        return { ...agent, score: contrats.length * 10 };
    }).sort((a, b) => b.score - a.score);

    // Score total header
    const moi = agentsScores.find(a => a.id === utilisateurActuel.id);
    const elScoreTotal = document.getElementById('score-total');
    if(elScoreTotal && moi) elScoreTotal.textContent = moi.score;

    // Rang Global
    const maPosition = agentsScores.findIndex(a => a.id === utilisateurActuel.id) + 1;
    const elRang = document.getElementById('rang-global');
    if(elRang) elRang.textContent = `${maPosition}ème/${agentsScores.length}`;

    // Rang Équipe
    if (utilisateurActuel.equipe_id) {
        const teamAgents = agentsScores.filter(a => a.equipe_id === utilisateurActuel.equipe_id);
        const maPosTeam = teamAgents.findIndex(a => a.id === utilisateurActuel.id) + 1;
        const elRangTeam = document.getElementById('rang-equipe');
        if(elRangTeam) elRangTeam.textContent = `${maPosTeam}ème/${teamAgents.length}`;
    }
}


// -------------------------------------------------------------
// KPI & SKI DE FOND
// -------------------------------------------------------------
async function calculerEtAfficherSkiFond() {
    const cellule = utilisateurActuel.cellule;
    let kpi = 'Volume', valeur = '0';
    const mesC = tousLesContrats.filter(c => c.agent_id === utilisateurActuel.id);

    if (cellule === 'Mover') {
        kpi = 'Taux Rétention';
        const ret = mesC.filter(c => ['Telco', 'MRH'].includes(c.type_contrat));
        valeur = mesC.length > 0 ? Math.round((ret.length/mesC.length)*100) + '%' : '0%';
    } else if (cellule === 'Switcher') {
        kpi = 'Vol. Homeserve';
        valeur = mesC.filter(c => ['Mobile', 'Compensation Carbone'].includes(c.type_contrat)).length;
    } else if (cellule === 'Coach') {
        kpi = 'Vol. Premium';
        valeur = mesC.filter(c => c.type_contrat === 'Premium').length;
    } else {
        valeur = mesC.length;
    }

    const elLabel = document.querySelector('.kpi-label');
    const elVal = document.getElementById('ski-fond-valeur');
    if(elLabel) elLabel.textContent = kpi;
    if(elVal) elVal.textContent = valeur;
}


// -------------------------------------------------------------
// PERF JOUR
// -------------------------------------------------------------
async function calculerEtAfficherPerformanceJour() {
    const ajd = window.getAujourdhui ? window.getAujourdhui() : new Date().toLocaleDateString('fr-CA');
    
    // Filtre contrats du jour
    const mesC_Jour = tousLesContrats.filter(c => c.agent_id === utilisateurActuel.id && c.created_at.startsWith(ajd));
    
    const elScoreJ = document.getElementById('score-jour');
    if(elScoreJ) elScoreJ.textContent = (mesC_Jour.length * 10) + ' pts';

    const elDate = document.getElementById('date-epreuve');
    if(elDate) elDate.textContent = new Date().toLocaleDateString('fr-FR', {weekday:'long', day:'numeric', month:'long'});
}


// -------------------------------------------------------------
// ÉQUIPE TOP 3
// -------------------------------------------------------------
async function calculerEtAfficherEquipe() {
    if (!utilisateurActuel.equipe_id) return;

    // Score global équipe
    const agentsTeam = tousLesAgents.filter(a => a.equipe_id === utilisateurActuel.equipe_id);
    const contratsTeam = tousLesContrats.filter(c => agentsTeam.find(a => a.id === c.agent_id));
    const scoreTeam = contratsTeam.length * 10;

    const elScoreEq = document.getElementById('score-equipe');
    if(elScoreEq) elScoreEq.textContent = scoreTeam.toLocaleString() + ' pts';

    // Top 3
    const classements = agentsTeam.map(a => ({
        ...a, score: tousLesContrats.filter(c => c.agent_id === a.id).length * 10
    })).sort((a,b) => b.score - a.score).slice(0, 3);

    const elTop3 = document.getElementById('top3-equipe');
    if(elTop3) {
        elTop3.innerHTML = classements.map(a => `
            <li ${a.id === utilisateurActuel.id ? 'class="vous"' : ''}>
                <span class="top3-nom">${a.prenom}</span>
                <span class="top3-score">${a.score} pts</span>
            </li>
        `).join('');
    }
}


// -------------------------------------------------------------
// CONTRATS DU JOUR (Liste)
// -------------------------------------------------------------
async function chargerContratsJour() {
    try {
        const ajd = window.getAujourdhui();
        const { data: contrats } = await sb
            .from('contrats')
            .select('*')
            .eq('agent_id', utilisateurActuel.id)
            .gte('created_at', ajd + 'T00:00:00')
            .order('created_at', { ascending: false });

        const liste = document.getElementById('contrats-liste');
        if (!liste) return;

        if (!contrats || contrats.length === 0) {
            liste.innerHTML = '<div class="contrat-vide">Aucun contrat aujourd\'hui</div>';
            return;
        }

        liste.innerHTML = '';
        contrats.forEach(c => {
            const div = document.createElement('div');
            div.className = 'contrat-item';
            
            const heure = new Date(c.created_at).toLocaleTimeString('fr-FR', {hour:'2-digit', minute:'2-digit'});
            const icones = {'Telco':'📞', 'Mobile':'📱', 'MRH':'🏠', 'Premium':'⭐', 'Compensation Carbone':'🌱'};
            
            // Badge statut
            let badge = '<span class="badge-attente">⏳ En attente</span>';
            if(c.statut === 'valide') badge = '<span class="badge-valide">✅ Validé</span>';
            if(c.statut === 'rejete') badge = '<span class="badge-rejete">❌ Rejeté</span>';

            div.innerHTML = `
                <span class="contrat-icone">${icones[c.type_contrat] || '📄'}</span>
                <div class="contrat-info">
                    <span class="contrat-type">${c.type_contrat}</span>
                    <span class="contrat-heure">${heure}</span>
                    ${c.api_app ? '<span class="badge-apiapp">📱 APP</span>' : ''}
                    ${badge}
                </div>
                <div class="contrat-actions">
                    ${c.statut === 'en_attente' ? `<button class="btn-supprimer-contrat" onclick="supprimerContrat('${c.id}')">🗑️</button>` : ''}
                </div>
            `;
            liste.appendChild(div);
        });
    } catch (e) { console.error(e); }
}


// -------------------------------------------------------------
// CHALLENGES FLASH (Nouveau - Intégré)
// -------------------------------------------------------------
async function chargerChallengesActifs() {
    try {
        const now = new Date().toISOString();
        const { data: challenges } = await sb
            .from('challenges_flash')
            .select('*')
            .eq('statut', 'actif')
            .lte('date_debut', now)
            .gte('date_fin', now);

        const container = document.getElementById('challenges-container');
        const badge = document.getElementById('badge-challenges-actifs');
        if(!container) return;

        // Filtrer pour mon équipe/cellule
        const mesChallenges = (challenges || []).filter(ch => {
            if(ch.cible === 'tous') return true;
            if(ch.cible === 'equipe' && ch.equipe_id === utilisateurActuel.equipe_id) return true;
            return false;
        });

        if (mesChallenges.length === 0) {
            container.innerHTML = '<div class="aucun-challenge">Aucun challenge actif 💤</div>';
            if(badge) badge.style.display = 'none';
            return;
        }

        if(badge) {
            badge.textContent = mesChallenges.length;
            badge.style.display = 'inline-block';
        }

        container.innerHTML = '';
        mesChallenges.forEach(ch => {
            // Calculer progression (Contrats validés pendant la période)
            const contratsPeriode = tousLesContrats.filter(c => 
                c.agent_id === utilisateurActuel.id &&
                c.created_at >= ch.date_debut &&
                c.created_at <= ch.date_fin
            );
            
            const prog = contratsPeriode.length;
            const obj = ch.objectif || 10; // Valeur par défaut si non définie
            const pct = Math.min((prog/obj)*100, 100);

            const div = document.createElement('div');
            div.className = 'challenge-card';
            div.innerHTML = `
                <div class="challenge-header">
                    <h3 class="challenge-titre">${ch.titre}</h3>
                    <div class="challenge-points">+${ch.points_attribues} pts</div>
                </div>
                <p class="challenge-description">${ch.description}</p>
                <div class="challenge-progression">
                    <div class="challenge-barre"><div class="challenge-barre-remplie" style="width:${pct}%"></div></div>
                    <div class="challenge-text">${prog} / ${obj} contrats</div>
                </div>
            `;
            container.appendChild(div);
        });

    } catch (e) { console.error('Erreur challenges', e); }
}


// -------------------------------------------------------------
// ACTIONS (Enregistrer / Supprimer / Déco)
// -------------------------------------------------------------
async function enregistrerContrat(e) {
    e.preventDefault();
    const btn = document.getElementById('btn-enregistrer');
    btn.disabled = true;

    try {
        const { error } = await sb.from('contrats').insert({
            agent_id: utilisateurActuel.id,
            type_contrat: document.getElementById('type-contrat').value,
            lien_piste: document.getElementById('lien-piste').value,
            api_app: document.getElementById('contrat-apiapp').checked,
            statut: 'en_attente',
            created_at: new Date().toISOString()
        });

        if (error) throw error;
        
        // Refresh
        document.getElementById('formulaire-contrat').reset();
        await Promise.all([
            chargerTousLesContrats(),
            chargerContratsJour(),
            calculerEtAfficherClassement(),
            chargerChallengesActifs()
        ]);
        alert('✅ Contrat enregistré !');

    } catch (err) {
        alert('Erreur: ' + err.message);
    } finally {
        btn.disabled = false;
    }
}

window.supprimerContrat = async function(id) {
    if(!confirm('Supprimer ?')) return;
    await sb.from('contrats').delete().eq('id', id);
    await chargerTousLesContrats();
    await chargerContratsJour();
};

async function deconnexion() {
    await sb.auth.signOut();
    window.location.href = 'connexion-finale.html';
}

// Fonctions vides pour éviter les erreurs si appelées
function afficherCalendrierReel() {}
function afficherBadgesReels() {}