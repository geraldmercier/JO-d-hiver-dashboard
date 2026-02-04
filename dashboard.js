// =============================================================
// DASHBOARD AGENT - VERSION "WINTER GAMES V2" (CORRIGÉE)
// =============================================================

console.log('🏔️ Dashboard Agent V2 - Chargement...');

const { createClient } = window.supabase;
const sb = createClient(SUPABASE_CONFIG.URL, SUPABASE_CONFIG.KEY);

// --- UTILITAIRES ---

// Fonction pour vérifier si une date est "Aujourd'hui" (ignorer les heures)
function estAujourdhui(dateString) {
    if (!dateString) return false;
    const date = new Date(dateString);
    const today = new Date();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
}

// --- VARIABLES GLOBALES ---
let utilisateurActuel = null;
let tousLesAgents = [];
let tousLesContrats = [];
let challengesReussis = []; 

// Dates clés
const DATE_DEBUT = "2026-02-09";
const DATE_FIN = "2026-02-20";
const DATE_SPRINT = "2026-02-20"; // Vendredi final (Points x2)

// =============================================================
// 🏁 INITIALISATION (AU CHARGEMENT DE LA PAGE)
// =============================================================
document.addEventListener('DOMContentLoaded', async function() {
    
    // 1. Vérification de connexion
    const { data: { user }, error } = await sb.auth.getUser();
    if (error || !user) { window.location.href = 'connexion-finale.html'; return; }

    // 2. Chargement de l'utilisateur courant
    await chargerDonneesUtilisateur(user.id);
    if (!utilisateurActuel) return; // Stop si échec

    // 3. Chargement global des données (Agents, Contrats, Challenges)
    await Promise.all([
        chargerTousLesAgents(),
        chargerTousLesContrats(),
        chargerMesChallengesReussis()
    ]);

    // 4. Calculs initiaux
    calculerScoresComplets();

    // 5. Vérification des challenges (Auto-détection)
    await detecterEtSoumettreChallenges();

    // 6. Affichage Initial
    afficherInformationsHeader();
    afficherScoreEtRang();
    calculerEtAfficherSkiFond();
    calculerEtAfficherPerformanceJour();
    calculerEtAfficherEquipe();
    chargerContratsJour();
    chargerChallengesAffiches();

    // 7. Gestionnaires d'événements (Boutons)
    const form = document.getElementById('formulaire-contrat');
    if (form) form.addEventListener('submit', enregistrerContrat);
    
    const btnDeconnexion = document.getElementById('btn-deconnexion');
    if (btnDeconnexion) {
        btnDeconnexion.addEventListener('click', async () => {
            await sb.auth.signOut(); 
            window.location.href = 'connexion-finale.html';
        });
    }
});

// =============================================================
// 📡 CHARGEMENT DES DONNÉES (SUPABASE)
// =============================================================

async function chargerDonneesUtilisateur(uid) {
    const { data, error } = await sb.from('users')
        .select(`*, equipes (nom, drapeau_emoji)`)
        .eq('id', uid)
        .maybeSingle();

    if (error || !data) {
        console.warn("⚠️ Compte fantôme ou erreur. Redirection...");
        await sb.auth.signOut();
        window.location.href = 'connexion-finale.html';
        return;
    }
    utilisateurActuel = data;
}

async function chargerTousLesAgents() {
    const { data } = await sb.from('users').select(`*, equipes (nom, drapeau_emoji)`).eq('role', 'agent');
    tousLesAgents = data || [];
}

async function chargerTousLesContrats() {
   const { data } = await sb.from('contrats').select('*').in('statut', ['valide', 'en_attente']);
    tousLesContrats = data || [];
}

async function chargerMesChallengesReussis() {
    const { data } = await sb.from('challenge_reussites').select('*').eq('agent_id', utilisateurActuel.id);
    challengesReussis = data || [];
}

// =============================================================
// 🧠 MOTEUR DE CALCUL (LOGIQUE MÉTIER)
// =============================================================

function calculerScoresComplets() {
    // Réinitialisation
    tousLesAgents.forEach(a => { a.scoreTotal = 0; a.scoreJour = 0; });

    // 1. Points de Volume
    tousLesContrats.forEach(c => {
        const agent = tousLesAgents.find(a => a.id === c.agent_id);
        if (agent) {
            const dateC = c.created_at.split('T')[0];
            const points = (dateC === DATE_SPRINT) ? 20 : 10;
            agent.scoreTotal += points;
        }
    });

    // 2. Bonus Médailles (Podiums quotidiens)
    const ajd = new Date().toISOString().split('T')[0];
    let dateCurseur = new Date(DATE_DEBUT);
    const dateFinObj = new Date(ajd < DATE_FIN ? ajd : DATE_FIN);

    while (dateCurseur <= dateFinObj) {
        const dateStr = dateCurseur.toISOString().split('T')[0];
        const estVendredi = (dateStr === DATE_SPRINT);
        const bonusOr = estVendredi ? 20 : 10;
        const bonusArg = estVendredi ? 10 : 5;
        const bonusBrz = estVendredi ? 4 : 2;

        ['Mover', 'Switcher', 'Coach', 'Pépinière'].forEach(cellule => {
            const agentsCellule = tousLesAgents.filter(a => a.cellule === cellule);
            // Classement du jour pour cette cellule
            const classementJour = agentsCellule.map(a => {
                const vol = tousLesContrats.filter(c => c.agent_id === a.id && c.created_at.startsWith(dateStr)).length;
                return { agent: a, vol: vol };
            }).sort((a, b) => b.vol - a.vol);

            if (classementJour[0] && classementJour[0].vol > 0) classementJour[0].agent.scoreTotal += bonusOr;
            if (classementJour[1] && classementJour[1].vol > 0) classementJour[1].agent.scoreTotal += bonusArg;
            if (classementJour[2] && classementJour[2].vol > 0) classementJour[2].agent.scoreTotal += bonusBrz;
        });
        dateCurseur.setDate(dateCurseur.getDate() + 1);
    }

    // 3. Points Challenges Flash
    challengesReussis.filter(cr => cr.statut === 'valide').forEach(cr => {
        if (utilisateurActuel) utilisateurActuel.scoreTotal += (cr.points_gagnes || 0);
    });

    // Mise à jour de l'objet utilisateur courant
    const moiCalcule = tousLesAgents.find(a => a.id === utilisateurActuel.id);
    if (moiCalcule) utilisateurActuel.scoreTotal = moiCalcule.scoreTotal;
}

// =============================================================
// 🎯 CHALLENGES AUTO
// =============================================================
async function detecterEtSoumettreChallenges() {
    const now = new Date().toISOString();
    const { data: challenges } = await sb.from('challenges_flash')
        .select('*')
        .eq('statut', 'actif')
        .lte('date_debut', now)
        .gte('date_fin', now);

    if (!challenges) return;

    for (const ch of challenges) {
        const dejaFait = challengesReussis.find(cr => cr.challenge_id === ch.id);
        if (dejaFait) continue;

        if (ch.cible !== 'tous' && 
           (ch.cible === 'equipe' && ch.equipe_id !== utilisateurActuel.equipe_id) ||
           (ch.cible === 'cellule' && ch.cellule_cible !== utilisateurActuel.cellule)) {
            continue;
        }

        const contratsPeriode = tousLesContrats.filter(c => 
            c.agent_id === utilisateurActuel.id &&
            c.created_at >= ch.date_debut &&
            c.created_at <= ch.date_fin
        );

        let reussi = false;
        if (ch.type_challenge === 'Nombre de contrats') {
            const objectif = ch.objectif || 3; 
            if (contratsPeriode.length >= objectif) reussi = true;
        }

        if (reussi) {
            await sb.from('challenge_reussites').insert({
                challenge_id: ch.id,
                agent_id: utilisateurActuel.id,
                statut: 'en_attente',
                points_gagnes: ch.points_attribues
            });
            challengesReussis.push({ challenge_id: ch.id, statut: 'en_attente' });
            alert(`🎉 Bravo ! Challenge "${ch.titre}" réussi ! En attente de validation.`);
        }
    }
}

// =============================================================
// 🎨 FONCTIONS D'AFFICHAGE (UI)
// =============================================================

function afficherInformationsHeader() {
    const elNom = document.getElementById('nom-agent');
    if (elNom) elNom.textContent = `${utilisateurActuel.prenom} ${utilisateurActuel.nom}`;

    const elEquipe = document.getElementById('nom-equipe');
    if (elEquipe && utilisateurActuel.equipes) {
        const emoji = utilisateurActuel.equipes.drapeau_emoji || '';
        elEquipe.textContent = `Équipe ${utilisateurActuel.equipes.nom} ${emoji}`;
    }
    
    const elAvatar = document.getElementById('avatar-agent');
    if (elAvatar && utilisateurActuel.avatar_url) {
        elAvatar.src = 'assets/' + utilisateurActuel.avatar_url;
    }

    const elCellule = document.getElementById('cellule-agent');
    if (elCellule) elCellule.textContent = utilisateurActuel.cellule || '-';
}

function afficherScoreEtRang() {
    tousLesAgents.sort((a, b) => b.scoreTotal - a.scoreTotal);
    
    document.getElementById('score-total').textContent = utilisateurActuel.scoreTotal;

    const rangGlobal = tousLesAgents.findIndex(a => a.id === utilisateurActuel.id) + 1;
    document.getElementById('rang-global').textContent = `${rangGlobal}ème/${tousLesAgents.length}`;

    if (utilisateurActuel.equipe_id) {
        const teamAgents = tousLesAgents.filter(a => a.equipe_id === utilisateurActuel.equipe_id);
        const rangTeam = teamAgents.findIndex(a => a.id === utilisateurActuel.id) + 1;
        document.getElementById('rang-equipe').textContent = `${rangTeam}ème/${teamAgents.length}`;
    }
}

function calculerEtAfficherSkiFond() {
    const monVolume = tousLesContrats.filter(c => 
        c.agent_id === utilisateurActuel.id && 
        ['valide', 'en_attente'].includes(c.statut)
    ).length;

    const elVolume = document.querySelector('.ski-fond-volume') || document.getElementById('volume-total');
    if (elVolume) elVolume.textContent = monVolume;

    const objectif = 20; 
    const pourcentage = Math.min((monVolume / objectif) * 100, 100);
    
    const elBarre = document.getElementById('ski-progress-bar');
    if (elBarre) elBarre.style.width = `${pourcentage}%`;
    
    const elTexte = document.getElementById('ski-text');
    if (elTexte) elTexte.textContent = `${monVolume} / ${objectif} ventes`;
}

function calculerEtAfficherPerformanceJour() {
    // 1. Mise à jour de la DATE
    const optionsDate = { weekday: 'long', day: 'numeric', month: 'long' };
    const dateBrute = new Date().toLocaleDateString('fr-FR', optionsDate);
    const dateAffichee = dateBrute.charAt(0).toUpperCase() + dateBrute.slice(1);

    const elDate = document.getElementById('date-epreuve');
    if (elDate) elDate.textContent = dateAffichee;

    // 2. Calcul du Score
    const contratsJour = tousLesContrats.filter(c => 
        c.agent_id === utilisateurActuel.id && 
        estAujourdhui(c.created_at) && 
        ['valide', 'en_attente'].includes(c.statut)
    );

    let scoreJour = 0;
    contratsJour.forEach(c => {
        const date = new Date(c.created_at);
        const isVendredi = date.getDay() === 5; 
        scoreJour += isVendredi ? 20 : 10;
    });

    // 3. Affichage
    const elScore = document.querySelector('.score-jour-valeur') || document.getElementById('score-jour');
    if (elScore) elScore.textContent = `${scoreJour} pts`;
}

function calculerEtAfficherEquipe() {
    if (!utilisateurActuel.equipe_id) return;
    const mesCoequipiers = tousLesAgents.filter(a => a.equipe_id === utilisateurActuel.equipe_id);
    const scoreEquipe = mesCoequipiers.reduce((total, agent) => total + (agent.scoreTotal || 0), 0);

    const elScoreEquipe = document.querySelector('.score-equipe-valeur') || document.getElementById('score-equipe');
    if (elScoreEquipe) elScoreEquipe.textContent = `${scoreEquipe} pts`;

    const top3 = mesCoequipiers.sort((a, b) => b.scoreTotal - a.scoreTotal).slice(0, 3);
    const elTop3 = document.getElementById('top3-equipe');
    if (elTop3) {
        elTop3.innerHTML = top3.map((a, index) => 
            `<div>${['🥇','🥈','🥉'][index]} ${a.prenom} (${a.scoreTotal} pts)</div>`
        ).join('');
    }
}

function chargerContratsJour() {
    const container = document.getElementById('liste-contrats-jour') || document.querySelector('.carte-contrats-jour');
    if (!container) return;

    container.innerHTML = '<h3>📄 Vos Contrats du Jour</h3>';

    const mesContrats = tousLesContrats.filter(c => 
        c.agent_id === utilisateurActuel.id && 
        estAujourdhui(c.created_at)
    );

    if (mesContrats.length === 0) {
        container.innerHTML += '<p style="color:#666; font-style:italic; padding:10px;">Aucun contrat aujourd\'hui.</p>';
        return;
    }

    mesContrats.forEach(c => {
        const div = document.createElement('div');
        div.style.padding = "10px";
        div.style.borderBottom = "1px solid #eee";
        div.style.display = "flex";
        div.style.justifyContent = "space-between";
        
        let icon = c.statut === 'valide' ? '✅' : (c.statut === 'rejete' ? '❌' : '⏳');

        div.innerHTML = `
            <span>${icon} <strong>${c.type_contrat}</strong></span>
            <span style="color:#888;">${new Date(c.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
        `;
        container.appendChild(div);
    });
}

function chargerChallengesAffiches() {
    const container = document.getElementById('challenges-container');
    if(!container) return;
    container.innerHTML = '<div style="padding:10px;text-align:center;color:#666">Challenges chargés...</div>';
}

// =============================================================
// 📝 ENREGISTREMENT (INTERACTION)
// =============================================================

async function enregistrerContrat(e) {
    e.preventDefault();
    const btn = document.getElementById('btn-enregistrer');
    
    if (btn) {
        btn.disabled = true;
        btn.textContent = 'Enregistrement...';
    }

    try {
        const { error } = await sb.from('contrats').insert({
            agent_id: utilisateurActuel.id,
            type_contrat: document.getElementById('type-contrat').value,
            lien_piste: document.getElementById('lien-piste').value,
            api_app: document.getElementById('contrat-apiapp') ? document.getElementById('contrat-apiapp').checked : false,
            statut: 'en_attente',
            created_at: new Date().toISOString()
        });

        if (error) throw error;

        document.getElementById('formulaire-contrat').reset();
        
        // --- MISE A JOUR IMMEDIATE ---
        await chargerTousLesContrats();      // Recharger
        calculerScoresComplets();            // Recalculer
        
        // Rafraîchir tout l'affichage
        afficherScoreEtRang();               
        calculerEtAfficherSkiFond();         
        calculerEtAfficherPerformanceJour(); 
        calculerEtAfficherEquipe();          
        chargerContratsJour();               
        
        await detecterEtSoumettreChallenges();
        
        alert('✅ Contrat enregistré avec succès !');

    } catch (err) { 
        alert("Erreur : " + err.message); 
    } finally { 
        if (btn) {
            btn.disabled = false;
            btn.textContent = 'Enregistrer';
        }
    }
}