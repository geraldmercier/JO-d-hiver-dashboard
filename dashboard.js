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
        verifierPopupsAlertes()
    ]);

    // 4. Calculs initiaux
    calculerScoresComplets();
    await chargerScoreLive();
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

    // 7. Écoute en temps réel
    ecouterChallengesRealtime();
    ecouterContratsRealtime();

    // 8. Gestionnaires d'événements
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
    // 1. On charge les agents
    const { data: agents } = await sb.from('users')
        .select('*, equipes (nom, drapeau_emoji)')
        .eq('role', 'agent');
    
    tousLesAgents = agents || [];

    // 2. MODE SQL MAÎTRE : On récupère le SCORE TOTAL OFFICIEL
    const { data: scores } = await sb.from('view_classement_general')
        .select('user_id, score_total'); 
    
    // 3. On injecte ce score officiel dans chaque agent
    if (scores) {
        tousLesAgents.forEach(agent => {
            const scoreRow = scores.find(s => s.user_id === agent.id);
            // On démarre avec le score officiel (Validé + Bonus)
            agent.scoreTotal = scoreRow ? scoreRow.score_total : 0;
        });
    }
}

async function chargerTousLesContrats() {
   const { data } = await sb.from('contrats').select('*').in('statut', ['valide', 'en_attente']);
    tousLesContrats = data || [];
}

async function chargerToutesLesReussites() {
    // CORRECTION : On demande aussi les points du challenge associé !
    const { data } = await sb.from('challenge_reussites')
        .select('*, challenges_flash (points_attribues)');
    
    window.toutesLesReussites = data || [];
}

async function chargerMesChallengesReussis() {
    const { data } = await sb.from('challenge_reussites').select('*').eq('agent_id', utilisateurActuel.id);
    challengesReussis = data || [];
}


// ==========================================
// 💰 NOUVEAU : LECTURE DU SCORE LIVE (SQL)
// ==========================================
async function chargerScoreLive() {
    const { data: { user } } = await sb.auth.getUser();
    
    // On lit la Super Vue SQL
    const { data, error } = await sb
        .from('view_score_live')
        .select('*')
        .eq('user_id', user.id)
        .single();

    if (data) {
        // Mise à jour de l'affichage
        // Note: Assurez-vous d'avoir un élément avec id="score-total" dans votre HTML
        const elScore = document.getElementById('score-total'); 
        
        if (elScore) {
            elScore.textContent = data.score_total + ' pts';
            
            // Petit effet visuel "Pop"
            elScore.style.animation = "none";
            elScore.offsetHeight; 
            elScore.style.animation = "pop 0.3s ease"; 
        }
        
        // On met aussi à jour la variable globale
        if (typeof utilisateurActuel !== 'undefined') {
            utilisateurActuel.scoreTotal = data.score_total;
        }
        console.log(`💰 Score Live chargé : ${data.score_total} pts`);
    }
}

// =============================================================
// 🧠 MOTEUR DE CALCUL (MODE SÉCURISÉ & COMPLET)
// =============================================================
function calculerScoresComplets() {
    
    // 1. INITIALISATION (On garde le score SQL officiel comme base)
    tousLesAgents.forEach(a => { 
        a.scoreTotal = a.scoreTotal || 0; 
        a.scoreJour = 0; // On remet le jour à 0 pour le recalculer
    });

    // 2. AJOUT SÉCURISÉ DES CONTRATS
    // (On n'ajoute que ce qui n'est PAS encore dans le SQL)
    tousLesContrats.forEach(c => {
        const agent = tousLesAgents.find(a => a.id === c.agent_id);
        
        if (agent) {
            const dateC = c.created_at.split('T')[0];
            const points = (dateC === DATE_SPRINT) ? 20 : 10;

            // A. TOTAL : On ajoute SEULEMENT si "en_attente"
            // (Si c'est "valide", c'est déjà dans le score SQL chargé au début)
            if (c.statut === 'en_attente') {
                agent.scoreTotal += points;
            }

            // B. JOUR : Pour le podium du jour, on compte tout (Validé + Attente)
            if (estAujourdhui(c.created_at) && (c.statut === 'valide' || c.statut === 'en_attente')) {
                agent.scoreJour += points;
            }
        }
    });

    // 3. BONUS MÉDAILLES (PODIUMS QUOTIDIENS) - CONSERVÉ INTÉGRALEMENT ✅
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
                const vol = tousLesContrats.filter(c => 
                    c.agent_id === a.id && c.created_at.startsWith(dateStr) && c.statut === 'valide'
                ).length;
                return { agent: a, vol: vol };
            }).sort((a, b) => b.vol - a.vol);

            if (classementJour[0] && classementJour[0].vol > 0) classementJour[0].agent.scoreTotal += bonusOr;
            if (classementJour[1] && classementJour[1].vol > 0) classementJour[1].agent.scoreTotal += bonusArg;
            if (classementJour[2] && classementJour[2].vol > 0) classementJour[2].agent.scoreTotal += bonusBrz;
        });
        dateCurseur.setDate(dateCurseur.getDate() + 1);
    }

    // 4. MISE À JOUR DE L'UTILISATEUR CONNECTÉ
    const moiCalcule = tousLesAgents.find(a => a.id === utilisateurActuel.id);
    if (moiCalcule) {
        utilisateurActuel.scoreTotal = moiCalcule.scoreTotal;
        if (utilisateurActuel.scoreJour !== undefined) utilisateurActuel.scoreJour = moiCalcule.scoreJour;
    }
}

// =============================================================
// 🎯 CHALLENGES AUTO
// =============================================================
async function detecterEtSoumettreChallenges() {
   const date = new Date();
    date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
    const now = date.toISOString();
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

// =============================================================
// 👥 GESTION ÉQUIPE (MODE LECTURE SIMPLE - CORRIGÉ)
// =============================================================
function calculerEtAfficherEquipe() {
    if (!utilisateurActuel || !utilisateurActuel.equipe_id) return;
    
    // 1. On récupère les copains de l'équipe
    const mesCoequipiers = tousLesAgents.filter(a => a.equipe_id === utilisateurActuel.equipe_id);

    // 2. On additionne simplement les scores DÉJÀ CALCULÉS
    // (Puisqu'ils sont justes maintenant, on ne recalcule rien !)
    const scoreEquipe = mesCoequipiers.reduce((total, agent) => {
        return total + (agent.scoreTotal || 0);
    }, 0);

    // 3. Affichage du gros score bleu
    const elScoreEquipe = document.getElementById('score-equipe');
    if (elScoreEquipe) elScoreEquipe.textContent = `${scoreEquipe} pts`;

    // 4. Gestion du Top 3 (Liste)
    // On trie par le score officiel corrigé
    const top3 = mesCoequipiers.sort((a, b) => (b.scoreTotal || 0) - (a.scoreTotal || 0)).slice(0, 3);
    
    const elTop3 = document.getElementById('top3-equipe');
    if (elTop3) {
        elTop3.innerHTML = top3.map((agent, index) => {
            const estMoi = agent.id === utilisateurActuel.id;
            const classe = estMoi ? ' class="vous"' : '';
            return `<li${classe}>
                <span class="top3-nom">${estMoi ? 'Vous' : agent.prenom + ' ' + agent.nom}</span>
                <span class="top3-score">${agent.scoreTotal || 0} pts</span>
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

// ==========================================
// 📅 CALENDRIER OLYMPIQUE (VERSION CORRIGÉE)
// ==========================================
async function afficherCalendrierComplet() {
    const grid = document.getElementById('calendrier-grid');
    if (!grid) return;

    grid.innerHTML = '<div style="text-align:center; col-span:4;">Chargement...</div>';

    // 1. Récupération des challenges depuis Supabase
    // On prend TOUT pour être sûr
    const { data: challenges, error } = await sb
        .from('challenges_flash')
        .select('*')
        .eq('statut', 'actif');

    if (error) {
        console.error("Erreur chargement challenges:", error);
        grid.innerHTML = "Erreur de chargement";
        return;
    }

    console.log("Challenges trouvés :", challenges); // Pour vérifier dans la console (F12)

    // 2. Configuration des dates (11 au 25 Février)
    grid.innerHTML = ''; // On vide
    const debut = new Date('2026-02-11');
    const fin = new Date('2026-02-25');
    const aujourdhuiStr = new Date().toISOString().split('T')[0];

    // 3. Boucle jour par jour
    for (let d = new Date(debut); d <= fin; d.setDate(d.getDate() + 1)) {
        // Formatage de la date du jour (YYYY-MM-DD)
        const dateBoucle = d.toISOString().split('T')[0];
        
        // Formatage pour l'affichage (ex: "11 Fév")
        const dateAffiche = d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });

        // 4. RECHERCHE DU CHALLENGE (Logique Floue)
        // On regarde si un challenge commence ou finit ce jour-là
        // On utilise .startsWith pour ignorer les heures (T00:00:00)
        const challengeDuJour = challenges.find(c => {
            const deb = c.date_debut.split('T')[0]; // On garde juste 2026-02-11
            const fin = c.date_fin.split('T')[0];
            return dateBoucle >= deb && dateBoucle <= fin;
        });

        // 5. Création de la case HTML
        const div = document.createElement('div');
        div.className = 'calendar-day';

        // Est-ce aujourd'hui ?
        if (dateBoucle === aujourdhuiStr) div.classList.add('today');

        // Contenu par défaut (Tiret)
        let iconHtml = `<div class="day-status empty">—</div>`;

        // Si on a trouvé un challenge !
        if (challengeDuJour) {
            // Choix de l'icône selon le titre ou le type
            let emoji = '⚡'; 
            if (challengeDuJour.titre.includes('Biathlon')) emoji = '🎿';
            else if (challengeDuJour.titre.includes('Patinage')) emoji = '⛸️';
            else if (challengeDuJour.titre.includes('Descente')) emoji = '⛷️';
            else if (challengeDuJour.titre.includes('Slalom')) emoji = '🚩';
            else if (challengeDuJour.titre.includes('Bobsleigh')) emoji = '🛷';
            else if (challengeDuJour.titre.includes('Snowboard')) emoji = '🏂';
            else if (challengeDuJour.titre.includes('Curling')) emoji = '🥌';
            else if (challengeDuJour.titre.includes('Cérémonie')) emoji = '🔥';
            else if (challengeDuJour.titre.includes('SPRINT')) emoji = '🚀';

            iconHtml = `<div class="day-status active" style="font-size: 24px;">${emoji}</div>`;
            
            // Clic pour ouvrir
            div.style.cursor = 'pointer';
            div.onclick = () => afficherDetailChallenge(challengeDuJour);
        }

        div.innerHTML = `
            <div class="day-date">${dateAffiche}</div>
            ${iconHtml}
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

    // CORRECTION HEURE LOCALE
    const date = new Date();
    date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
    const maintenant = date.toISOString();
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
// ==========================================
// 🕵️‍♂️ GESTION DU POPUP (MODAL)
// ==========================================
function afficherDetailChallenge(challenge) {
    const modal = document.getElementById('modal-challenge');
    if (!modal) {
        console.error("Erreur: Le modal HTML est introuvable !");
        return;
    }

    // 1. Remplissage des textes
    document.getElementById('modal-titre').innerText = challenge.titre;
    document.getElementById('modal-desc').innerText = challenge.description;
    
    // 2. Affichage des gains (Médailles)
    const gainsHtml = `
        <div class="medals-grid">
            <div class="medal-item">🥇 Or : +${challenge.gain_or || 0} pts</div>
            <div class="medal-item">🥈 Argent : +${challenge.gain_argent || 0} pts</div>
            <div class="medal-item">🥉 Bronze : +${challenge.gain_bronze || 0} pts</div>
        </div>
        <p style="margin-top:10px; font-size:0.9em; color:#666;">
            Type : <strong>${challenge.type_challenge || 'Standard'}</strong> | 
            Cible : <strong>${challenge.cible || 'Tous'}</strong>
        </p>
    `;
    document.getElementById('modal-gains').innerHTML = gainsHtml;

    // 3. Afficher le modal
    modal.style.display = 'flex';
}

// Fonction pour fermer le modal (à relier au bouton croix)
function fermerModal() {
    const modal = document.getElementById('modal-challenge');
    if (modal) modal.style.display = 'none';
}

// Fermer si on clique en dehors du contenu
window.onclick = function(event) {
    const modal = document.getElementById('modal-challenge');
    if (event.target == modal) {
        modal.style.display = "none";
    }
}

// Ajoutez cet appel dans le chargement initial (vers ligne 50) :
// await verifierPopupsAlertes();

// --- NOUVELLES FONCTIONS DE DÉTECTION ---

async function verifierPopupsAlertes() {
    // CORRECTION HEURE LOCALE
    const date = new Date();
    date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
    const now = date.toISOString();

    // 1. DÉTECTION NOUVEAUX CHALLENGES ACTIFS
    const { data: challengesActifs } = await sb.from('challenges_flash')
        .select('*')
        .eq('statut', 'actif')
        .lte('date_debut', now)
        .gte('date_fin', now);

    if (challengesActifs) {
        // On prend le plus récent
        const dernier = challengesActifs[0]; 
        if (dernier) {
            const cleMemoire = `vu_new_challenge_${dernier.id}`;
            // Si on ne l'a jamais vu
            if (!localStorage.getItem(cleMemoire)) {
                // Remplir Popup
                document.getElementById('popup-titre-challenge').innerText = dernier.titre;
                document.getElementById('popup-desc-challenge').innerText = dernier.description;
                document.getElementById('popup-points-challenge').innerText = dernier.points_attribues;
                
                // Afficher
                document.getElementById('popup-nouveau-challenge').style.display = 'flex';
                
                // Mémoriser qu'on l'a vu
                localStorage.setItem(cleMemoire, 'true');
            }
        }
    }

    // 2. DÉTECTION VICTOIRE RÉCENTE (Moins de 24h)
    const hier = new Date();
    hier.setDate(hier.getDate() - 1);
    
    const { data: challengesTermines } = await sb.from('challenges_flash')
        .select('*')
        .eq('statut', 'termine') // Statut mis par le manager quand il valide le vainqueur
        .gt('date_fin', hier.toISOString())
        .not('gagnant_nom', 'is', null) // S'il y a un gagnant
        .order('date_fin', { ascending: false });

    if (challengesTermines && challengesTermines.length > 0) {
        const victoire = challengesTermines[0];
        const cleVictoire = `vu_victoire_${victoire.id}`;

        if (!localStorage.getItem(cleVictoire)) {
            document.getElementById('popup-gagnant-nom').innerText = victoire.gagnant_nom;
            document.getElementById('popup-victoire').style.display = 'flex';
            localStorage.setItem(cleVictoire, 'true');
        }
    }
}

// =============================================================
// 🔔 TEMPS RÉEL (SUPABASE REALTIME)
// =============================================================

/**
 * Écoute les changements sur la table des challenges pour mettre à jour
 * le dashboard et afficher les popups instantanément.
 */
function ecouterChallengesRealtime() {
    console.log('📡 Activation de l\'écoute Realtime pour les challenges...');
    
    sb.channel('flux-challenges')
        .on(
            'postgres_changes', 
            { 
                event: '*', 
                schema: 'public', 
                table: 'challenges_flash' 
            }, 
            async (payload) => {
                console.log('🔔 Mise à jour Challenge reçue:', payload);
                
                // 1. Recharger la liste des challenges (pour qu'ils apparaissent dans le conteneur)
                await chargerChallengesAffiches();
                
                // 2. Vérifier s'il faut déclencher un popup (nouveau ou victoire)
                await verifierPopupsAlertes();

                // 3. Optionnel : Si c'est une insertion, on peut faire un petit effet sonore ou visuel
                if (payload.eventType === 'INSERT' && payload.new.statut === 'actif') {
                    console.log('✨ Nouveau challenge flash activé !');
                }
            }
        )
        .subscribe((status) => {
            console.log('🔌 Statut de la connexion Realtime (Challenges):', status);
        });
}

/**
 * Écoute les nouveaux contrats pour mettre à jour les scores et classements
 */
function ecouterContratsRealtime() {
    console.log('📡 Activation de l\'écoute Realtime pour les scores...');
    
    sb.channel('flux-scores')
        .on(
            'postgres_changes', 
            { 
                event: '*', 
                schema: 'public', 
                table: 'contrats' 
            }, 
            async (payload) => {
                console.log('📈 Mise à jour Score reçue:', payload);
                
                // Rechargement complet des données de calcul
                await Promise.all([
                    chargerTousLesAgents(),
                    chargerTousLesContrats(),
                    chargerToutesLesReussites()
                ]);

                // Recalcul et mise à jour UI
                calculerScoresComplets();
                afficherScoreEtRang();
                afficherPodiumDuJour();
                calculerEtAfficherSkiFond();
                calculerEtAfficherPerformanceJour();
                calculerEtAfficherEquipe();
                chargerContratsJour();
                afficherCalendrierComplet();
                
                // Vérifier si ce nouveau contrat valide un challenge
                await detecterEtSoumettreChallenges();
            }
        )
        .subscribe((status) => {
            console.log('🔌 Statut de la connexion Realtime (Scores):', status);
        });
}

// =============================================================
// 📡 TEMPS RÉEL (AUTO-REFRESH)
// =============================================================
(function activerTempsReel() {
    console.log("📡 Activation du Temps Réel...");

    const channel = sb.channel('dashboard-updates')
        .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'contrats' },
            () => { console.log("🔔 Changement Contrats !"); rafraichirTout(); }
        )
        .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'challenges_flash' },
            () => { console.log("⚡ Changement Challenges !"); rafraichirTout(); }
        )
        .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'challenge_reussites' },
            () => { console.log("🏆 Changement Réussites !"); rafraichirTout(); }
        )
        .subscribe();

    async function rafraichirTout() {
        // 1. Recharger les données brutes
        await Promise.all([
            chargerTousLesAgents(),
            chargerTousLesContrats(),
            chargerToutesLesReussites(),
            chargerFilRouge()
        ]);

        // 2. Refaire les calculs
        calculerScoresComplets();

        // 3. Mettre à jour l'affichage
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
        
        // 4. Vérifier les alertes (Popups)
        verifierPopupsAlertes(); 
        
        // 5. Vérifier les nouveaux challenges auto
        detecterEtSoumettreChallenges();
    }
})();

// =============================================================
// 📡 TEMPS RÉEL GLOBAL (AGENT) - VERSION ULTIME
// =============================================================
(function activerTempsReelAgent() {
    console.log("📡 Agent : Mode Temps Réel activé !");

    const channel = sb.channel('agent-global-updates')

    // 1. Écoute de TOUT (Contrats, Challenges, Victoires)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'challenges_flash' }, () => {
        console.log("⚡ Nouveau Challenge ou Victoire !");
        rechargerToutLeDashboard();
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'contrats' }, () => {
        console.log("📈 Score mis à jour !");
        rechargerToutLeDashboard();
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'challenge_reussites' }, () => {
        console.log("🏆 Validation challenge !");
        rechargerToutLeDashboard();
    })
    .subscribe();

    // Fonction qui relance toute la mécanique
    async function rechargerToutLeDashboard() {
        // On recharge les données
        await Promise.all([
            chargerTousLesAgents(),
            chargerTousLesContrats(),
            chargerToutesLesReussites(),
            chargerFilRouge()
        ]);
        // On refait les calculs
        calculerScoresComplets();
        // On réaffiche tout
        afficherInformationsHeader();
        afficherScoreEtRang();
        afficherPodiumDuJour();
        calculerEtAfficherSkiFond();
        calculerEtAfficherPerformanceJour();
        chargerContratsJour();
        chargerChallengesAffiches();
        verifierPopupsAlertes(); // Important pour les popups !
    }
})();