// =============================================================
// FICHIER : manager.js
// DESCRIPTION : Logique du Dashboard Manager
//
// FONCTIONNALITÉS :
//   1. Charger les données de l'équipe du manager
//   2. Afficher les contrats en attente
//   3. Valider/Rejeter les contrats
//   4. Calculer les 3 classements (global, équipe, cellule)
//   5. Afficher performance par cellule
//   6. Tableau détaillé des agents
//   7. Actions rapides (attribution points, badges)
// =============================================================


// -------------------------------------------------------------
// PARTIE 1 : DONNÉES DE TEST (Mock Data)
// -------------------------------------------------------------
const MOCK_DATA_MANAGER = {
    manager: {
        id: 'm1',
        nom: 'Sophie Martin',
        email: 'sophie.martin@papernest.com',
        equipe: 'France',
        equipeId: 2,
        drapeau: '🇫🇷',
        avatar: 'assets/woman.png'
    },
    
    equipe: {
        nom: 'France',
        position: 2,
        scoreTotal: 1247,
        nombreAgents: 10,
        contratsValides: 127
    },
    
    // Contrats en attente de validation
    contratsAttente: [
        {
            id: 'c1',
            agentNom: 'Gerald Mercier',
            agentCellule: 'Mover',
            type: 'Telco',
            lien: 'https://salesforce.com/piste/12345',
            date: 'Aujourd\'hui à 14:32'
        },
        {
            id: 'c2',
            agentNom: 'Pierre Dubois',
            agentCellule: 'Switcher',
            type: 'Mobile',
            lien: 'https://salesforce.com/piste/67890',
            date: 'Aujourd\'hui à 11:15'
        },
        {
            id: 'c3',
            agentNom: 'Marie Laurent',
            agentCellule: 'Mover',
            type: 'MRH',
            lien: 'https://salesforce.com/piste/54321',
            date: 'Hier à 18:45'
        }
    ],
    
    // Agents de l'équipe avec triple classement
    agents: [
        {
            id: 'a1',
            nom: 'Sophie Martin',
            prenom: 'Sophie',
            avatar: '🦁',
            cellule: 'Mover',
            score: 298,
            rangGlobal: 3,
            rangEquipe: 1,
            rangCellule: 1,  // 1er des Movers de l'équipe
            contratsValides: 45,
            contratsAttente: 0
        },
        {
            id: 'a2',
            nom: 'Pierre Dubois',
            prenom: 'Pierre',
            avatar: '🐯',
            cellule: 'Switcher',
            score: 267,
            rangGlobal: 8,
            rangEquipe: 2,
            rangCellule: 1,  // 1er des Switchers
            contratsValides: 38,
            contratsAttente: 2
        },
        {
            id: 'a3',
            nom: 'Gerald Mercier',
            prenom: 'Gerald',
            avatar: '🐼',
            cellule: 'Mover',
            score: 245,
            rangGlobal: 12,
            rangEquipe: 3,
            rangCellule: 2,  // 2ème des Movers
            contratsValides: 32,
            contratsAttente: 1
        },
        {
            id: 'a4',
            nom: 'Marie Laurent',
            prenom: 'Marie',
            avatar: '🐔',
            cellule: 'Mover',
            score: 198,
            rangGlobal: 25,
            rangEquipe: 4,
            rangCellule: 3,  // 3ème des Movers
            contratsValides: 28,
            contratsAttente: 1
        },
        {
            id: 'a5',
            nom: 'Jean Martin',
            prenom: 'Jean',
            avatar: '🦜',
            cellule: 'Switcher',
            score: 189,
            rangGlobal: 28,
            rangEquipe: 5,
            rangCellule: 2,  // 2ème des Switchers
            contratsValides: 25,
            contratsAttente: 0
        },
        {
            id: 'a6',
            nom: 'Claire Dupont',
            prenom: 'Claire',
            avatar: '🐨',
            cellule: 'Coach',
            score: 215,
            rangGlobal: 18,
            rangEquipe: 6,
            rangCellule: 1,  // 1ère des Coachs
            contratsValides: 30,
            contratsAttente: 0
        },
        {
            id: 'a7',
            nom: 'Paul Simon',
            prenom: 'Paul',
            avatar: '🦊',
            cellule: 'Coach',
            score: 178,
            rangGlobal: 32,
            rangEquipe: 7,
            rangCellule: 2,  // 2ème des Coachs
            contratsValides: 22,
            contratsAttente: 0
        },
        {
            id: 'a8',
            nom: 'Anne Petit',
            prenom: 'Anne',
            avatar: '🐰',
            cellule: 'Coach',
            score: 141,
            rangGlobal: 41,
            rangEquipe: 8,
            rangCellule: 3,  // 3ème des Coachs
            contratsValides: 18,
            contratsAttente: 0
        },
        {
            id: 'a9',
            nom: 'Luc Bernard',
            prenom: 'Luc',
            avatar: '🐻',
            cellule: 'Pépinière',
            score: 167,
            rangGlobal: 35,
            rangEquipe: 9,
            rangCellule: 1,  // 1er de la Pépinière
            contratsValides: 20,
            contratsAttente: 0
        },
        {
            id: 'a10',
            nom: 'Emma Rousseau',
            prenom: 'Emma',
            avatar: '🐱',
            cellule: 'Pépinière',
            score: 145,
            rangGlobal: 39,
            rangEquipe: 10,
            rangCellule: 2,  // 2ème de la Pépinière
            contratsValides: 17,
            contratsAttente: 0
        }
    ],
    
    // Performance quotidienne de l'équipe
    calendrier: [
        { date: '9 Fév', score: 156, medaille: '🥉' },
        { date: '10 Fév', score: 187, medaille: '🥈' },
        { date: '11 Fév', score: 142, medaille: null },
        { date: '12 Fév', score: 203, medaille: '🥇' },
        { date: '13 Fév', score: 178, medaille: null },
        { date: '16 Fév', score: 0, medaille: null },
        { date: '17 Fév', score: 0, medaille: null },
        { date: '18 Fév', score: 0, medaille: null },
        { date: '19 Fév', score: 0, medaille: null },
        { date: '20 Fév', score: 0, medaille: null }
    ]
};


// -------------------------------------------------------------
// PARTIE 2 : INITIALISATION
// -------------------------------------------------------------
document.addEventListener('DOMContentLoaded', function() {
    console.log('👔 Dashboard Manager — Chargement...');

    // Afficher les infos du manager
    afficherProfilManager();

    // Afficher les statistiques de l'équipe
    afficherStatsEquipe();

    // Afficher les contrats en attente
    afficherContratsAttente();

    // Afficher la performance par cellule
    afficherPerformanceCellules();

    // Afficher le tableau des agents
    afficherTableauAgents();

    // Afficher le calendrier
    afficherCalendrierEquipe();

    // Initialiser les selects des modals
    initialiserModals();

    // NOUVEAU : Bouton Vue Plateau
    document.getElementById('btn-vue-plateau').addEventListener('click', function() {
        window.location.href = 'plateau.html';
    });

    // NOUVEAU : Initialiser le menu Équipes si admin
    initialiserMenuEquipes();

    // Bouton déconnexion
    document.getElementById('btn-deconnexion').addEventListener('click', deconnexion);

    console.log('✅ Dashboard Manager initialisé');
});


// -------------------------------------------------------------
// PARTIE 3 : AFFICHAGE PROFIL MANAGER
// -------------------------------------------------------------
function afficherProfilManager() {
    const manager = MOCK_DATA_MANAGER.manager;
    
    document.getElementById('nom-manager').textContent = manager.nom;
    document.getElementById('equipe-manager').textContent = `Manager — Équipe ${manager.equipe} ${manager.drapeau}`;
    document.getElementById('score-equipe').textContent = MOCK_DATA_MANAGER.equipe.scoreTotal;
    document.getElementById('notif-count').textContent = MOCK_DATA_MANAGER.contratsAttente.length;
}


// -------------------------------------------------------------
// PARTIE 4 : AFFICHAGE STATISTIQUES ÉQUIPE
// -------------------------------------------------------------
function afficherStatsEquipe() {
    const equipe = MOCK_DATA_MANAGER.equipe;
    const agents = MOCK_DATA_MANAGER.agents;
    
    // Position
    document.getElementById('position-equipe').textContent = `${equipe.position}ème`;
    
    // Agents actifs
    document.getElementById('agents-actifs').textContent = `${equipe.nombreAgents}/${equipe.nombreAgents}`;
    
    // Score moyen
    const scoreMoyen = (equipe.scoreTotal / equipe.nombreAgents).toFixed(1);
    document.getElementById('score-moyen').textContent = scoreMoyen;
    
    // Contrats validés
    document.getElementById('contrats-valides').textContent = equipe.contratsValides;
}


// -------------------------------------------------------------
// PARTIE 5 : AFFICHAGE CONTRATS EN ATTENTE
// -------------------------------------------------------------
function afficherContratsAttente() {
    const contrats = MOCK_DATA_MANAGER.contratsAttente;
    const liste = document.getElementById('contrats-validation-liste');
    const aucunMessage = document.getElementById('aucun-contrat');
    const badge = document.getElementById('contrats-attente-count');
    
    badge.textContent = contrats.length;
    
    if (contrats.length === 0) {
        liste.style.display = 'none';
        aucunMessage.style.display = 'block';
        return;
    }
    
    liste.innerHTML = '';
    
    contrats.forEach(contrat => {
        const div = document.createElement('div');
        div.className = 'contrat-validation-item';
        div.innerHTML = `
            <div class="contrat-validation-info">
                <div class="contrat-type-badge">${getIconeType(contrat.type)} ${contrat.type}</div>
                <div class="contrat-details">
                    <div class="contrat-agent">${contrat.agentNom} (${contrat.agentCellule})</div>
                    <div class="contrat-date">${contrat.date}</div>
                </div>
            </div>
            <div class="contrat-validation-actions">
                <button class="btn-lien" onclick="ouvrirLien('${contrat.lien}')">
                    🔗 Voir piste
                </button>
                <button class="btn-valider" onclick="validerContrat('${contrat.id}')">
                    ✅ Valider
                </button>
                <button class="btn-rejeter" onclick="rejeterContrat('${contrat.id}')">
                    ❌ Rejeter
                </button>
            </div>
        `;
        liste.appendChild(div);
    });
}


// -------------------------------------------------------------
// PARTIE 6 : AFFICHAGE PERFORMANCE PAR CELLULE
// -------------------------------------------------------------
function afficherPerformanceCellules() {
    const agents = MOCK_DATA_MANAGER.agents;
    const grid = document.getElementById('cellules-grid');
    
    // Grouper les agents par cellule
    const parCellule = {
        'Mover': [],
        'Switcher': [],
        'Coach': [],
        'Pépinière': []
    };
    
    agents.forEach(agent => {
        if (parCellule[agent.cellule]) {
            parCellule[agent.cellule].push(agent);
        }
    });
    
    grid.innerHTML = '';
    
    // Créer un bloc pour chaque cellule
    Object.keys(parCellule).forEach(cellule => {
        const agentsCellule = parCellule[cellule];
        if (agentsCellule.length === 0) return;
        
        // Trier par rang dans la cellule
        agentsCellule.sort((a, b) => a.rangCellule - b.rangCellule);
        
        // Calculer la moyenne
        const scoreMoyen = (agentsCellule.reduce((sum, a) => sum + a.score, 0) / agentsCellule.length).toFixed(1);
        
        const div = document.createElement('div');
        div.className = 'cellule-block';
        div.innerHTML = `
            <div class="cellule-block-header">
                <div class="cellule-block-titre">${getIconeCellule(cellule)} ${cellule}s (${agentsCellule.length} agents)</div>
                <div class="cellule-block-moyenne">Moy: ${scoreMoyen} pts</div>
            </div>
            <div class="cellule-agents-liste" id="cellule-${cellule}">
            </div>
        `;
        
        grid.appendChild(div);
        
        // Ajouter les agents
        const listeAgents = document.getElementById(`cellule-${cellule}`);
        agentsCellule.forEach(agent => {
            const agentDiv = document.createElement('div');
            agentDiv.className = 'cellule-agent-item';
            agentDiv.innerHTML = `
                <div class="cellule-agent-info">
                    <div class="cellule-agent-rang">${agent.rangCellule}.</div>
                    <div class="agent-avatar">${agent.avatar}</div>
                    <div class="cellule-agent-nom">${agent.prenom} ${agent.nom}</div>
                </div>
                <div>
                    <div class="cellule-agent-score">${agent.score} pts</div>
                    <div class="cellule-agent-global">(${agent.rangGlobal}/50 global)</div>
                </div>
            `;
            listeAgents.appendChild(agentDiv);
        });
    });
}


// -------------------------------------------------------------
// PARTIE 7 : AFFICHAGE TABLEAU DES AGENTS
// -------------------------------------------------------------
function afficherTableauAgents() {
    const agents = MOCK_DATA_MANAGER.agents;
    const tbody = document.getElementById('tableau-agents-body');
    
    tbody.innerHTML = '';
    
    agents.forEach(agent => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>
                <div class="agent-cell">
                    <span class="agent-avatar">${agent.avatar}</span>
                    <span class="agent-nom">${agent.prenom} ${agent.nom}</span>
                </div>
            </td>
            <td>
                <span class="cellule-badge">${agent.cellule}</span>
            </td>
            <td class="score-cell">${agent.score}</td>
            <td class="rang-cell">${agent.rangGlobal}/50</td>
            <td class="rang-cell">${agent.rangEquipe}/10</td>
            <td class="rang-cell">${agent.rangCellule}/${getTotalCellule(agent.cellule)}</td>
            <td>
                <div class="contrats-cell">
                    <span class="contrats-valides">${agent.contratsValides}✅</span>
                    ${agent.contratsAttente > 0 ? `<span class="contrats-attente">${agent.contratsAttente}⏳</span>` : ''}
                </div>
            </td>
            <td>
                <button class="btn-action-agent" onclick="ouvrirModalPointsAgent('${agent.id}')">
                    +pts
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}


// -------------------------------------------------------------
// PARTIE 8 : AFFICHAGE CALENDRIER ÉQUIPE
// -------------------------------------------------------------
function afficherCalendrierEquipe() {
    const calendrier = MOCK_DATA_MANAGER.calendrier;
    const grid = document.getElementById('calendrier-equipe-grid');
    
    grid.innerHTML = '';
    
    calendrier.forEach((jour, index) => {
        const div = document.createElement('div');
        div.className = 'jour-equipe-item';
        if (index === 4) div.classList.add('actif');  // Jour actuel
        
        div.innerHTML = `
            <div class="jour-equipe-date">${jour.date}</div>
            <div class="jour-equipe-score">${jour.score > 0 ? jour.score + ' pts' : '—'}</div>
            ${jour.medaille ? `<div class="jour-equipe-medaille">${jour.medaille}</div>` : ''}
        `;
        
        grid.appendChild(div);
    });
}


// -------------------------------------------------------------
// PARTIE 9 : VALIDATION / REJET DE CONTRAT
// -------------------------------------------------------------
function validerContrat(contratId) {
    if (!confirm('Êtes-vous sûr de vouloir VALIDER ce contrat ?')) return;
    
    console.log('✅ Validation contrat:', contratId);
    
    // Retirer de la liste des contrats en attente
    const index = MOCK_DATA_MANAGER.contratsAttente.findIndex(c => c.id === contratId);
    if (index > -1) {
        MOCK_DATA_MANAGER.contratsAttente.splice(index, 1);
    }
    
    // Rafraîchir l'affichage
    afficherContratsAttente();
    
    // Message de succès
    alert('✅ Contrat validé avec succès ! Les points ont été attribués.');
}

function rejeterContrat(contratId) {
    const raison = prompt('Raison du rejet (optionnel) :');
    
    console.log('❌ Rejet contrat:', contratId, 'Raison:', raison);
    
    // Retirer de la liste
    const index = MOCK_DATA_MANAGER.contratsAttente.findIndex(c => c.id === contratId);
    if (index > -1) {
        MOCK_DATA_MANAGER.contratsAttente.splice(index, 1);
    }
    
    // Rafraîchir l'affichage
    afficherContratsAttente();
    
    // Message
    alert('❌ Contrat rejeté. L\'agent a été notifié.');
}


// -------------------------------------------------------------
// PARTIE 10 : ACTIONS RAPIDES
// -------------------------------------------------------------
function ouvrirModalPoints() {
    document.getElementById('modal-points').classList.add('active');
}

function ouvrirModalBadge() {
    document.getElementById('modal-badge').classList.add('active');
}

function fermerModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

function ouvrirModalPointsAgent(agentId) {
    ouvrirModalPoints();
    const select = document.getElementById('select-agent-points');
    select.value = agentId;
}

function soumettrePoints(event) {
    event.preventDefault();
    
    const agentId = document.getElementById('select-agent-points').value;
    const points = parseInt(document.getElementById('input-points').value);
    const raison = document.getElementById('textarea-raison').value;
    
    console.log('➕ Attribution points:', { agentId, points, raison });
    
    alert(`✅ ${points > 0 ? '+' : ''}${points} points attribués avec succès !`);
    
    fermerModal('modal-points');
    document.getElementById('form-points').reset();
    
    return false;
}

function soumettreBadge(event) {
    event.preventDefault();
    
    const agentId = document.getElementById('select-agent-badge').value;
    const badgeId = document.getElementById('select-badge').value;
    
    console.log('🏅 Déblocage badge:', { agentId, badgeId });
    
    alert('✅ Badge débloqué avec succès !');
    
    fermerModal('modal-badge');
    document.getElementById('form-badge').reset();
    
    return false;
}

function genererRapport() {
    alert('📊 Génération du rapport en cours...\n(Fonctionnalité à implémenter)');
}

function envoyerNotification() {
    const message = prompt('Message à envoyer à toute l\'équipe :');
    if (message) {
        alert('📢 Notification envoyée à tous les agents de l\'équipe !');
    }
}

function exporterCSV() {
    alert('📥 Export CSV en cours...\n(Fonctionnalité à implémenter)');
}


// -------------------------------------------------------------
// PARTIE 11 : FONCTIONS UTILITAIRES
// -------------------------------------------------------------
function ouvrirLien(url) {
    window.open(url, '_blank');
}

function getIconeType(type) {
    const icones = {
        'Telco': '📞',
        'Mobile': '📱',
        'MRH': '🏠',
        'Compensation Carbone': '🌱',
        'Premium': '⭐',
        'Autre': '📄'
    };
    return icones[type] || '📄';
}

function getIconeCellule(cellule) {
    const icones = {
        'Mover': '📞',
        'Switcher': '📱',
        'Coach': '⭐',
        'Pépinière': '🌱'
    };
    return icones[cellule] || '📊';
}

function getTotalCellule(cellule) {
    return MOCK_DATA_MANAGER.agents.filter(a => a.cellule === cellule).length;
}

function trierTableau(colonne) {
    console.log('Tri par:', colonne);
    // Fonctionnalité à implémenter
}

function initialiserModals() {
    const agents = MOCK_DATA_MANAGER.agents;
    
    // Remplir les selects des agents
    const selectPoints = document.getElementById('select-agent-points');
    const selectBadge = document.getElementById('select-agent-badge');
    
    agents.forEach(agent => {
        const option1 = document.createElement('option');
        option1.value = agent.id;
        option1.textContent = `${agent.prenom} ${agent.nom}`;
        selectPoints.appendChild(option1);
        
        const option2 = document.createElement('option');
        option2.value = agent.id;
        option2.textContent = `${agent.prenom} ${agent.nom}`;
        selectBadge.appendChild(option2);
    });
    
    // Remplir les badges disponibles
    const selectBadges = document.getElementById('select-badge');
    const badges = [
        { id: 'b1', nom: '🎯 Premier Contrat' },
        { id: 'b2', nom: '🔥 Série de 5' },
        { id: 'b3', nom: '🥇 Podium du Jour' },
        { id: 'b4', nom: '📝 10 Contrats' },
        { id: 'b5', nom: '🏅 Top 3 Global' }
    ];
    
    badges.forEach(badge => {
        const option = document.createElement('option');
        option.value = badge.id;
        option.textContent = badge.nom;
        selectBadges.appendChild(option);
    });
}

function deconnexion() {
    if (confirm('Voulez-vous vraiment vous déconnecter ?')) {
        window.location.href = 'index.html';
    }
}


// -------------------------------------------------------------
// NOUVEAU : INITIALISER MENU ÉQUIPES (pour admins)
// -------------------------------------------------------------
function initialiserMenuEquipes() {
    // TODO: Vérifier si l'utilisateur est admin
    // Pour l'instant, on cache toujours le menu (sera activé plus tard)
    const isAdmin = false; // À remplacer par: utilisateurActuel.role === 'admin'

    if (isAdmin) {
        document.getElementById('dropdown-equipes').style.display = 'block';

        const equipes = [
            { id: 1, nom: 'Norvège', drapeau: '🇳🇴' },
            { id: 2, nom: 'France', drapeau: '🇫🇷' },
            { id: 3, nom: 'Canada', drapeau: '🇨🇦' },
            { id: 4, nom: 'Autriche', drapeau: '🇦🇹' },
            { id: 5, nom: 'États-Unis', drapeau: '🇺🇸' }
        ];

        const menu = document.getElementById('menu-equipes');
        menu.innerHTML = '';

        equipes.forEach(equipe => {
            const div = document.createElement('div');
            div.className = 'dropdown-item';
            div.textContent = `${equipe.drapeau} Équipe ${equipe.nom}`;
            div.onclick = function() {
                changerEquipe(equipe.id);
            };
            menu.appendChild(div);
        });
    }
}

function changerEquipe(equipeId) {
    // Recharger la page avec le paramètre équipe
    window.location.href = `manager.html?equipe=${equipeId}`;
}


console.log('✅ manager.js chargé');
