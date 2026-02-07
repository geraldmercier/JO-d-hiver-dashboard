// =============================================================
// DASHBOARD AGENT - VERSION COMPLÈTE
// Backend stable + Toutes les fonctionnalités visuelles
// =============================================================

console.log('🏔️ Dashboard Agent COMPLET - Chargement...');

const { createClient } = window.supabase;
const sb = createClient(SUPABASE_CONFIG.URL, SUPABASE_CONFIG.KEY);

// --- UTILITAIRES ---

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
    if (!utilisateurActuel) return;

    // 3. Chargement global des données
    await Promise.all([
        chargerTousLesAgents(),
        chargerTousLesContrats(),
        chargerToutesLesReussites(),
        chargerFilRouge(), // 👈 AJOUTEZ CETTE LIGNE ICI
        verifierVainqueurFlash()
    ]);

    // 4. Calculs initiaux
    calculerScoresComplets();

    // 5. Vérification des challenges
    await detecterEtSoumettreChallenges();

    // 6. Affichage Initial COMPLET
    afficherInformationsHeader();
    afficherScoreEtRang();
    afficherPodiumDuJour();
    calculerEtAfficherSkiFond();
    calculerEtAfficherPerformanceJour();
    calculerEtAfficherEquipe();
    chargerContratsJour();
    afficherCalendrierComplet();
    afficherBadgesReels();
    chargerChallengesAffiches();

    // 7. Gestionnaires d'événements
    const form = document.getElementById('formulaire-contrat');
    if (form) form.addEventListener('submit', enregistrerContrat);
    
    const btnDeconnexion = document.getElementById('btn-deconnexion');
    if (btnDeconnexion) {
        btnDeconnexion.addEventListener('click', async () => {
            await sb.auth.signOut(); 
            window.location.href = 'connexion-finale.html';
        });
    }

    console.log('✅ Dashboard initialisé avec toutes les fonctionnalités');
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

async function chargerToutesLesReussites() {
    // On charge TOUT sans filtrer par utilisateur
    const { data } = await sb.from('challenge_reussites').select('*');
    // On stocke dans une variable globale pour que le calcul la trouve
    window.toutesLesReussites = data || [];
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

            // 3. Intégration des points Challenges
    if (typeof toutesLesReussites !== 'undefined') {
        toutesLesReussites.forEach(reussite => {
            // On ne compte que les challenges validés
            if (reussite.statut === 'valide') {
                const agent = tousLesAgents.find(a => a.id === reussite.agent_id);
                if (agent) {
                    // On ajoute les points (par défaut 10 si non précisé)
                    agent.scoreTotal += (reussite.points_gagnes || 0);
                }
            }
        });
    }
    
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

    // Mise à jour utilisateur courant
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

        // 1. Si ce n'est pas pour ma cellule (et que ce n'est pas "toutes"), je zappe
        if (ch.cellule_cible !== 'toutes' && ch.cellule_cible !== utilisateurActuel.cellule) {
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
// 🎨 FONCTIONS D'AFFICHAGE (UI COMPLÈTES)
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
    
    const elScoreTotal = document.getElementById('score-total');
    if (elScoreTotal) elScoreTotal.textContent = utilisateurActuel.scoreTotal;

    const rangGlobal = tousLesAgents.findIndex(a => a.id === utilisateurActuel.id) + 1;
    const elRangGlobal = document.getElementById('rang-global');
    if (elRangGlobal) elRangGlobal.textContent = `${rangGlobal}ème/${tousLesAgents.length}`;

    // Points manquants pour monter
    if (rangGlobal > 1) {
        const agentDevant = tousLesAgents[rangGlobal - 2];
        const pointsManquants = agentDevant.scoreTotal - utilisateurActuel.scoreTotal + 1;
        const elPointsManquants = document.getElementById('points-manquants');
        if (elPointsManquants) {
            elPointsManquants.textContent = `${pointsManquants} pts pour la ${rangGlobal - 1}${rangGlobal === 2 ? 'ère' : 'ème'} place`;
        }
    } else {
        const elPointsManquants = document.getElementById('points-manquants');
        if (elPointsManquants) elPointsManquants.textContent = '🥇 Vous êtes 1er !';
    }

    // Rang équipe
    if (utilisateurActuel.equipe_id) {
        const teamAgents = tousLesAgents.filter(a => a.equipe_id === utilisateurActuel.equipe_id);
        teamAgents.sort((a, b) => b.scoreTotal - a.scoreTotal);
        const rangTeam = teamAgents.findIndex(a => a.id === utilisateurActuel.id) + 1;
        const elRangEquipe = document.getElementById('rang-equipe');
        if (elRangEquipe) elRangEquipe.textContent = `${rangTeam}ème/${teamAgents.length}`;
    }
}

// =============================================================
// 🏆 PODIUM DU JOUR (NOUVEAU)
// =============================================================
function afficherPodiumDuJour() {
    const contratsAujourdhui = tousLesContrats.filter(c => estAujourdhui(c.created_at));
    
    const scoresJour = tousLesAgents.map(agent => {
        const contratsAgent = contratsAujourdhui.filter(c => c.agent_id === agent.id);
        return { agent, score: contratsAgent.length * 10 };
    });
    
    scoresJour.sort((a, b) => b.score - a.score);
    const top3 = scoresJour.slice(0, 3);

    // Afficher podium
    top3.forEach((item, index) => {
        const place = index + 1;
        const elAvatar = document.getElementById(`podium-jour-${place}-avatar`);
        const elNom = document.getElementById(`podium-jour-${place}-nom`);
        const elScore = document.getElementById(`podium-jour-${place}-score`);
        
        if (elAvatar) elAvatar.textContent = item.agent.avatar_url ? '👤' : '👤';
        if (elNom) elNom.textContent = `${item.agent.prenom} ${item.agent.nom.charAt(0)}.`;
        if (elScore) elScore.textContent = `${item.score} pts`;
    });

    // Position de l'agent actuel
    const maPositionJour = scoresJour.findIndex(s => s.agent.id === utilisateurActuel.id) + 1;
    const monScoreJour = scoresJour.find(s => s.agent.id === utilisateurActuel.id)?.score || 0;
    
    const elPositionAgent = document.getElementById('position-agent-jour');
    const elScoreAgent = document.getElementById('score-agent-jour');
    if (elPositionAgent) elPositionAgent.textContent = `${maPositionJour}ème`;
    if (elScoreAgent) elScoreAgent.textContent = `${monScoreJour} pts`;

    // Message encouragement
    const elEncouragement = document.getElementById('podium-encouragement');
    if (elEncouragement) {
        if (maPositionJour <= 3) {
            elEncouragement.textContent = '🏆 Vous êtes sur le podium !';
        } else if (maPositionJour === 4) {
            const pointsManquants = scoresJour[2].score - monScoreJour + 1;
            elEncouragement.textContent = `💪 Plus que ${pointsManquants} pts pour le podium !`;
        } else {
            elEncouragement.textContent = '🔥 Continuez, vous progressez !';
        }
    }
}

// =============================================================
// ⛷️ SKI DE FOND (KPI PAR CELLULE)
// =============================================================
function calculerEtAfficherSkiFond() {
    const cellule = utilisateurActuel.cellule;
    let kpiLabel = 'Volume de contrats';
    let valeur = '0';

    const mesContrats = tousLesContrats.filter(c => 
        c.agent_id === utilisateurActuel.id && 
        ['valide', 'en_attente'].includes(c.statut)
    );

    if (cellule === 'Mover') {
        kpiLabel = 'Taux de Rétention (TR)';
        const contratsRetention = mesContrats.filter(c => c.type_contrat === 'Telco' || c.type_contrat === 'MRH');
        const taux = mesContrats.length > 0 ? Math.round((contratsRetention.length / mesContrats.length) * 100) : 0;
        valeur = taux + '%';
    } else if (cellule === 'Switcher') {
        kpiLabel = 'Volume Homeserve';
        const contratsHomeserve = mesContrats.filter(c => c.type_contrat === 'Mobile' || c.type_contrat === 'Compensation Carbone');
        valeur = contratsHomeserve.length;
    } else if (cellule === 'Coach') {
        kpiLabel = 'Volume Premium';
        const contratsPremium = mesContrats.filter(c => c.type_contrat === 'Premium');
        valeur = contratsPremium.length;
    } else {
        kpiLabel = 'Volume de contrats';
        valeur = mesContrats.length;
    }

    const elLabel = document.querySelector('.kpi-label');
    if (elLabel) elLabel.textContent = kpiLabel;

    const elValeur = document.getElementById('ski-fond-valeur');
    if (elValeur) elValeur.textContent = valeur;
}

function calculerEtAfficherPerformanceJour() {
    // Date
    const optionsDate = { weekday: 'long', day: 'numeric', month: 'long' };
    const dateBrute = new Date().toLocaleDateString('fr-FR', optionsDate);
    const dateAffichee = dateBrute.charAt(0).toUpperCase() + dateBrute.slice(1);

    const elDate = document.getElementById('date-epreuve');
    if (elDate) elDate.textContent = dateAffichee;

    // Score
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

    const elScore = document.getElementById('score-jour');
    if (elScore) elScore.textContent = `${scoreJour} pts`;

    // Classement du jour
    const scoresJour = tousLesAgents.map(agent => {
        const contratsAgent = tousLesContrats.filter(c => 
            c.agent_id === agent.id && 
            estAujourdhui(c.created_at)
        );
        return { agentId: agent.id, score: contratsAgent.length * 10 };
    });
    scoresJour.sort((a, b) => b.score - a.score);
    const maPositionJour = scoresJour.findIndex(s => s.agentId === utilisateurActuel.id) + 1;

    const elClassementJour = document.getElementById('classement-jour');
    if (elClassementJour) elClassementJour.textContent = `${maPositionJour}ème`;
}

function calculerEtAfficherEquipe() {
    if (!utilisateurActuel.equipe_id) return;
    
    const mesCoequipiers = tousLesAgents.filter(a => a.equipe_id === utilisateurActuel.equipe_id);
    const scoreEquipe = mesCoequipiers.reduce((total, agent) => total + (agent.scoreTotal || 0), 0);

    const elScoreEquipe = document.getElementById('score-equipe');
    if (elScoreEquipe) elScoreEquipe.textContent = `${scoreEquipe} pts`;

    // Top 3 avec indication "Vous"
    const top3 = mesCoequipiers.sort((a, b) => b.scoreTotal - a.scoreTotal).slice(0, 3);
    const elTop3 = document.getElementById('top3-equipe');
    if (elTop3) {
        elTop3.innerHTML = top3.map((agent, index) => {
            const estMoi = agent.id === utilisateurActuel.id;
            const classe = estMoi ? ' class="vous"' : '';
            return `<li${classe}>
                <span class="top3-nom">${estMoi ? 'Vous' : agent.prenom + ' ' + agent.nom}</span>
                <span class="top3-score">${agent.scoreTotal} pts</span>
            </li>`;
        }).join('');
    }
}

// =============================================================
// 📝 CONTRATS DU JOUR (VERSION COMPLÈTE)
// =============================================================
function chargerContratsJour() {
    const liste = document.getElementById('contrats-liste');
    if (!liste) return;

    const mesContrats = tousLesContrats.filter(c => 
        c.agent_id === utilisateurActuel.id && 
        estAujourdhui(c.created_at)
    );

    if (mesContrats.length === 0) {
        liste.innerHTML = '<div class="contrat-vide">Aucun contrat enregistré pour aujourd\'hui</div>';
        return;
    }

    liste.innerHTML = '';
    mesContrats.forEach(contrat => {
        const div = document.createElement('div');
        div.className = 'contrat-item';
        
        const heure = new Date(contrat.created_at).toLocaleTimeString('fr-FR', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });

        const icone = {
            'Telco': '📞',
            'Mobile': '📱',
            'MRH': '🏠',
            'Premium': '⭐',
            'Compensation Carbone': '🌱'
        }[contrat.type_contrat] || '📄';

        const statutBadge = contrat.statut === 'valide' ? 
            '<span class="badge-valide">✅ Validé</span>' : 
            contrat.statut === 'rejete' ?
            '<span class="badge-rejete">❌ Rejeté</span>' :
            '<span class="badge-attente">⏳ En attente</span>';

        div.innerHTML = `
            <span class="contrat-icone">${icone}</span>
            <div class="contrat-info">
                <span class="contrat-type">${contrat.type_contrat}</span>
                <span class="contrat-heure">${heure}</span>
                ${contrat.api_app ? '<span class="badge-apiapp">📱 ApiApp</span>' : ''}
                ${statutBadge}
            </div>
            <div class="contrat-actions">
                <a href="${contrat.lien_piste}" class="contrat-lien" target="_blank" title="Voir la piste">🔗</a>
                ${contrat.statut === 'en_attente' ? `<button class="btn-supprimer-contrat" onclick="supprimerContrat('${contrat.id}')" title="Supprimer">🗑️</button>` : ''}
            </div>
        `;
        liste.appendChild(div);
    });
}

// =============================================================
// 📅 CALENDRIER 12 JOURS (NOUVEAU)
// =============================================================
function afficherCalendrierComplet() {
    const grid = document.getElementById('calendrier-grid');
    if (!grid) return;

    grid.innerHTML = '';
    
    const debut = new Date('2026-02-11'); // Mercredi 11 Février
const fin = new Date('2026-02-25');   // Mercredi 25 Février
    const aujourdhui = new Date().toISOString().split('T')[0];

    for (let d = new Date(debut); d <= fin; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split('T')[0];
        const estFutur = dateStr > aujourdhui;
        const estAujourdhui = dateStr === aujourdhui;

        // Compter mes contrats ce jour
        const contratsJour = tousLesContrats.filter(c => 
            c.agent_id === utilisateurActuel.id && 
            c.created_at.startsWith(dateStr) &&
            c.statut === 'valide'
        );
        const score = contratsJour.length * 10;

        // Vérifier si médaille (top 3 du jour dans ma cellule)
        let medaille = null;
        if (!estFutur && contratsJour.length > 0) {
            const agentsCellule = tousLesAgents.filter(a => a.cellule === utilisateurActuel.cellule);
            const classementJour = agentsCellule.map(agent => {
                const vol = tousLesContrats.filter(c => 
                    c.agent_id === agent.id && 
                    c.created_at.startsWith(dateStr) &&
                    c.statut === 'valide'
                ).length;
                return { agentId: agent.id, vol };
            }).sort((a, b) => b.vol - a.vol);

            const maPositionJour = classementJour.findIndex(c => c.agentId === utilisateurActuel.id);
            if (maPositionJour === 0) medaille = '🥇';
            else if (maPositionJour === 1) medaille = '🥈';
            else if (maPositionJour === 2) medaille = '🥉';
        }

        const div = document.createElement('div');
        div.className = 'jour-carte' + 
            (estFutur ? ' jour-futur' : '') + 
            (estAujourdhui ? ' jour-actuel' : '');
        
        div.innerHTML = `
            <div class="jour-date">${d.getDate()} Fév</div>
            <div class="jour-score">${estFutur ? '—' : score + ' pts'}</div>
            ${medaille ? '<div class="jour-medaille">' + medaille + '</div>' : ''}
        `;
        grid.appendChild(div);
    }
}

// =============================================================
// 🏅 BADGES (NOUVEAU)
// =============================================================
function afficherBadgesReels() {
    const grid = document.getElementById('badges-grid');
    if (!grid) return;

    const mesContrats = tousLesContrats.filter(c => 
        c.agent_id === utilisateurActuel.id && 
        c.statut === 'valide'
    );
    const nbContrats = mesContrats.length;

    // Calculer classement
    const agentsAvecScores = tousLesAgents.map(agent => {
        const contratsAgent = tousLesContrats.filter(c => 
            c.agent_id === agent.id && 
            c.statut === 'valide'
        );
        return { agentId: agent.id, score: contratsAgent.length * 10 };
    });
    agentsAvecScores.sort((a, b) => b.score - a.score);
    const maPosition = agentsAvecScores.findIndex(s => s.agentId === utilisateurActuel.id) + 1;

    const badges = [
        { nom: 'Premier Contrat', icone: '🎯', deblocque: nbContrats >= 1 },
        { nom: 'Série de 5', icone: '🔥', deblocque: nbContrats >= 5 },
        { nom: 'Top 3 Global', icone: '🏅', deblocque: maPosition <= 3 },
        { nom: '10 Contrats', icone: '📚', deblocque: nbContrats >= 10 },
        { nom: '20 Contrats', icone: '🎖️', deblocque: nbContrats >= 20 },
        { nom: '50 Contrats', icone: '👑', deblocque: nbContrats >= 50 }
    ];

    grid.innerHTML = '';
    badges.forEach(badge => {
        const div = document.createElement('div');
        div.className = 'badge-carte' + (badge.deblocque ? ' badge-deblocque' : ' badge-verrouille');
        div.innerHTML = `
            <div class="badge-icone">${badge.deblocque ? badge.icone : '🔒'}</div>
            <div class="badge-nom">${badge.nom}</div>
        `;
        grid.appendChild(div);
    });
}

// =============================================================
// ⚡ CHALLENGES FLASH (VERSION COMPLÈTE)
// =============================================================
async function chargerChallengesAffiches() {
    const container = document.getElementById('challenges-container');
    if (!container) return;

    const maintenant = new Date().toISOString();
    const { data: challenges } = await sb.from('challenges_flash')
        .select('*')
        .eq('statut', 'actif')
        .lte('date_debut', maintenant)
        .gte('date_fin', maintenant);

    if (!challenges || challenges.length === 0) {
        container.innerHTML = '<div class="aucun-challenge">Aucun challenge actif pour le moment 🎯</div>';
        return;
    }

    // Filtrer selon cible
    const challengesPourMoi = challenges.filter(ch => {
        // Si c'est pour tout le monde : OK
        if (ch.cellule_cible === 'toutes') return true;
        // Si c'est spécifiquement pour ma cellule : OK
        if (ch.cellule_cible === utilisateurActuel.cellule) return true;
        
        // Sinon : Non
        return false;
    });

    container.innerHTML = '';
    
    for (const challenge of challengesPourMoi) {
        // Calculer ma progression
        const mesContrats = tousLesContrats.filter(c => 
            c.agent_id === utilisateurActuel.id &&
            c.statut === 'valide' &&
            c.created_at >= challenge.date_debut &&
            c.created_at <= challenge.date_fin
        );
        
        const progression = mesContrats.length;
        const objectif = challenge.objectif || 1;
        const pourcentage = Math.min((progression / objectif) * 100, 100);
        const estComplete = progression >= objectif;
        
        // Calculer temps restant
        const fin = new Date(challenge.date_fin);
        const diffMs = fin - new Date();
        const diffMin = Math.floor(diffMs / 60000);
        let tempsRestant = '';
        
        if (diffMin < 0) {
            tempsRestant = 'Terminé';
        } else if (diffMin < 60) {
            tempsRestant = diffMin + ' min';
        } else {
            const heures = Math.floor(diffMin / 60);
            tempsRestant = heures + 'h ' + (diffMin % 60) + 'min';
        }
        
        const div = document.createElement('div');
        div.className = 'challenge-card' + (estComplete ? ' challenge-termine' : '');
        div.innerHTML = `
            <div class="challenge-header">
                <h3 class="challenge-titre">${challenge.titre}</h3>
                <div class="challenge-timer">${tempsRestant}</div>
            </div>
            
            <p class="challenge-description">${challenge.description}</p>
            
            <div class="challenge-progression">
                <div class="challenge-progression-label">
                    <span>Progression</span>
                    <span>${progression} / ${objectif}</span>
                </div>
                <div class="challenge-barre">
                    <div class="challenge-barre-remplie" style="width: ${pourcentage}%"></div>
                </div>
            </div>
            
            <div class="challenge-info-footer">
                <div><strong>${challenge.type_challenge}</strong></div>
                <div class="challenge-points">
                    ${estComplete ? '✅ ' : ''}+${challenge.points_attribues} pts
                </div>
            </div>
        `;
        
        container.appendChild(div);
    }
}

// =============================================================
// 🗑️ SUPPRESSION CONTRAT (NOUVEAU)
// =============================================================
async function supprimerContrat(contratId) {
    if (!confirm('⚠️ Supprimer ce contrat ?\n\nCette action est irréversible.')) {
        return;
    }

    try {
        const { error } = await sb.from('contrats').delete().eq('id', contratId);
        if (error) throw error;

        alert('✅ Contrat supprimé avec succès');

        // Recharger
        await chargerTousLesContrats();
        calculerScoresComplets();
        
        afficherScoreEtRang();
        afficherPodiumDuJour();
        calculerEtAfficherSkiFond();
        calculerEtAfficherPerformanceJour();
        calculerEtAfficherEquipe();
        chargerContratsJour();
        afficherCalendrierComplet();
        afficherBadgesReels();

    } catch (error) {
        console.error('❌ Erreur suppression:', error);
        alert('❌ Erreur lors de la suppression');
    }
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
        
        // Recharger tout
        await chargerTousLesContrats();
        calculerScoresComplets();
        
        afficherScoreEtRang();
        afficherPodiumDuJour();
        calculerEtAfficherSkiFond();
        calculerEtAfficherPerformanceJour();
        calculerEtAfficherEquipe();
        chargerContratsJour();
        afficherCalendrierComplet();
        afficherBadgesReels();
        
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

console.log('✅ Dashboard COMPLET chargé avec succès');


// =============================================================
// 📈 GRAPHIQUE FIL ROUGE (AGENT)
// =============================================================

async function chargerFilRouge() {
    // 1. Vérification basique
    if (!utilisateurActuel || !utilisateurActuel.equipe_id || !utilisateurActuel.cellule) return;

    // 2. Récupérer les données KPI
    const { data: kpis } = await sb.from('kpi_equipe_journalier')
        .select('*')
        .eq('equipe_id', utilisateurActuel.equipe_id)
        .eq('cellule', utilisateurActuel.cellule)
        .order('date_kpi', { ascending: true });

    if (!kpis || kpis.length === 0) return;

    // 3. Préparer les données
    const labels = kpis.map(k => {
        const d = new Date(k.date_kpi);
        return `${d.getDate()}/${d.getMonth()+1}`;
    });
    const donneesJour = kpis.map(k => k.valeur_jour);
    const donneesCumul = kpis.map(k => k.valeur_cumul);

    let labelUnit = ['Mover', 'Switcher'].includes(utilisateurActuel.cellule) ? '%' : ' Contrats';

    // 4. Dessiner le graphique
    const ctx = document.getElementById('graphiqueFilRouge');
    if(ctx) {
        new Chart(ctx.getContext('2d'), {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Quotidien',
                        data: donneesJour,
                        borderColor: '#FF9800',
                        backgroundColor: 'rgba(255, 152, 0, 0.5)',
                        type: 'bar',
                        yAxisID: 'y'
                    },
                    {
                        label: 'Global / Cumul',
                        data: donneesCumul,
                        borderColor: '#1976D2',
                        backgroundColor: 'rgba(25, 118, 210, 0.1)',
                        borderWidth: 3,
                        fill: true,
                        tension: 0.3,
                        yAxisID: 'y'
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: { y: { beginAtZero: true, title: { display: true, text: labelUnit } } }
            }
        });
    }
}
// À AJOUTER TOUT EN BAS DE DASHBOARD.JS

async function verifierVainqueurFlash() {
    // On cherche le dernier challenge terminé récemment (ex: dans les dernières 24h)
    const hier = new Date();
    hier.setDate(hier.getDate() - 1);

    const { data: challenges } = await sb.from('challenges_flash')
        .select('*')
        .eq('statut', 'termine')
        .gt('date_fin', hier.toISOString()) // Terminé il y a moins de 24h
        .order('date_fin', { ascending: false })
        .limit(1);

    if (challenges && challenges.length > 0) {
        const challenge = challenges[0];
        
        // On vérifie si on a déjà affiché cette info (via localStorage pour ne pas harceler l'agent)
        const cleMemoire = `vu_vainqueur_${challenge.id}`;
        if (!localStorage.getItem(cleMemoire)) {
            
            // Affichage
            const texte = `Le défi <strong>"${challenge.titre}"</strong> a été remporté par :<br><br><span style="font-size:1.5em; font-weight:bold; color:#d32f2f;">${challenge.gagnant_nom || 'Un agent'}</span>`;
            document.getElementById('popup-vainqueur-texte').innerHTML = texte;
            document.getElementById('popup-vainqueur').style.display = 'flex';

            // On marque comme vu
            localStorage.setItem(cleMemoire, 'true');
            
            // Lancer des confettis si vous avez une lib, sinon c'est déjà bien !
        }
    }
}