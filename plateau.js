// =============================================================
// FICHIER : plateau.js
// DESCRIPTION : Logique complète de la Vue Plateau
// VERSION : Mock Data (données de test)
// =============================================================

console.log('🏔️ Vue Plateau — Chargement...');

// -------------------------------------------------------------
// PARTIE 1 : DONNÉES DE TEST (Mock Data)
// -------------------------------------------------------------

const MOCK_DATA_PLATEAU = {
    // 50 agents répartis sur 5 équipes
    agents: [
        { id: 1, nom: 'Anna Karlsen', prenom: 'Anna', avatar: '🦁', equipe: 'Norvège', drapeau: '🇳🇴', cellule: 'Switcher', score: 324, contrats: 52, medailles: '🥇🥇🥈' },
        { id: 2, nom: 'Tom Johnson', prenom: 'Tom', avatar: '🐯', equipe: 'Canada', drapeau: '🇨🇦', cellule: 'Coach', score: 312, contrats: 48, medailles: '🥇🥈🥈' },
        { id: 3, nom: 'Sophie Martin', prenom: 'Sophie', avatar: '🐼', equipe: 'France', drapeau: '🇫🇷', cellule: 'Mover', score: 298, contrats: 45, medailles: '🥈🥉🥉' },
        { id: 4, nom: 'Maria Lopez', prenom: 'Maria', avatar: '🐨', equipe: 'Autriche', drapeau: '🇦🇹', cellule: 'Mover', score: 285, contrats: 42, medailles: '🥉🥉' },
        { id: 5, nom: 'John Smith', prenom: 'John', avatar: '🦊', equipe: 'Canada', drapeau: '🇨🇦', cellule: 'Switcher', score: 278, contrats: 40, medailles: '🥈🥉' },
        { id: 6, nom: 'Lars Olsen', prenom: 'Lars', avatar: '🐺', equipe: 'Norvège', drapeau: '🇳🇴', cellule: 'Mover', score: 273, contrats: 41, medailles: '🥉' },
        { id: 7, nom: 'Emma Wilson', prenom: 'Emma', avatar: '🐱', equipe: 'États-Unis', drapeau: '🇺🇸', cellule: 'Coach', score: 269, contrats: 38, medailles: '🥈' },
        { id: 8, nom: 'Pierre Dubois', prenom: 'Pierre', avatar: '🦜', equipe: 'France', drapeau: '🇫🇷', cellule: 'Switcher', score: 267, contrats: 39, medailles: '🥉' },
        { id: 9, nom: 'Hans Mueller', prenom: 'Hans', avatar: '🐻', equipe: 'Autriche', drapeau: '🇦🇹', cellule: 'Coach', score: 261, contrats: 36, medailles: '' },
        { id: 10, nom: 'Sarah Brown', prenom: 'Sarah', avatar: '🐰', equipe: 'États-Unis', drapeau: '🇺🇸', cellule: 'Switcher', score: 256, contrats: 37, medailles: '' },
        { id: 11, nom: 'Luca Rossi', prenom: 'Luca', avatar: '🦝', equipe: 'Canada', drapeau: '🇨🇦', cellule: 'Mover', score: 252, contrats: 35, medailles: '' },
        { id: 12, nom: 'Gerald Mercier', prenom: 'Gerald', avatar: '🐼', equipe: 'France', drapeau: '🇫🇷', cellule: 'Mover', score: 245, contrats: 32, medailles: '' },
        { id: 13, nom: 'Ingrid Berg', prenom: 'Ingrid', avatar: '🦉', equipe: 'Norvège', drapeau: '🇳🇴', cellule: 'Pépinière', score: 241, contrats: 34, medailles: '' },
        { id: 14, nom: 'Michael Davis', prenom: 'Michael', avatar: '🐺', equipe: 'États-Unis', drapeau: '🇺🇸', cellule: 'Mover', score: 238, contrats: 33, medailles: '' },
        { id: 15, nom: 'Anna Schmidt', prenom: 'Anna', avatar: '🦁', equipe: 'Autriche', drapeau: '🇦🇹', cellule: 'Switcher', score: 235, contrats: 31, medailles: '' },
        // ... Continuer jusqu'à 50 (simplifié ici pour la lisibilité)
        { id: 16, nom: 'Robert Taylor', prenom: 'Robert', avatar: '🐯', equipe: 'Canada', drapeau: '🇨🇦', cellule: 'Pépinière', score: 229, contrats: 30, medailles: '' },
        { id: 17, nom: 'Claire Petit', prenom: 'Claire', avatar: '🐨', equipe: 'France', drapeau: '🇫🇷', cellule: 'Coach', score: 225, contrats: 29, medailles: '' },
        { id: 18, nom: 'Erik Hansen', prenom: 'Erik', avatar: '🦊', equipe: 'Norvège', drapeau: '🇳🇴', cellule: 'Coach', score: 220, contrats: 28, medailles: '' },
        { id: 19, nom: 'Lisa Anderson', prenom: 'Lisa', avatar: '🐱', equipe: 'États-Unis', drapeau: '🇺🇸', cellule: 'Pépinière', score: 215, contrats: 27, medailles: '' },
        { id: 20, nom: 'Franz Weber', prenom: 'Franz', avatar: '🐻', equipe: 'Autriche', drapeau: '🇦🇹', cellule: 'Pépinière', score: 210, contrats: 26, medailles: '' },
        // Agents 21-50 (scores de 205 à 45)
        { id: 21, nom: 'Agent 21', prenom: 'A21', avatar: '🦝', equipe: 'Canada', drapeau: '🇨🇦', cellule: 'Coach', score: 205, contrats: 25, medailles: '' },
        { id: 22, nom: 'Agent 22', prenom: 'A22', avatar: '🦉', equipe: 'France', drapeau: '🇫🇷', cellule: 'Pépinière', score: 200, contrats: 24, medailles: '' },
        { id: 23, nom: 'Agent 23', prenom: 'A23', avatar: '🐺', equipe: 'Norvège', drapeau: '🇳🇴', cellule: 'Mover', score: 195, contrats: 23, medailles: '' },
        { id: 24, nom: 'Agent 24', prenom: 'A24', avatar: '🦁', equipe: 'États-Unis', drapeau: '🇺🇸', cellule: 'Coach', score: 190, contrats: 22, medailles: '' },
        { id: 25, nom: 'Agent 25', prenom: 'A25', avatar: '🐯', equipe: 'Autriche', drapeau: '🇦🇹', cellule: 'Coach', score: 185, contrats: 21, medailles: '' },
        { id: 26, nom: 'Agent 26', prenom: 'A26', avatar: '🐼', equipe: 'Canada', drapeau: '🇨🇦', cellule: 'Pépinière', score: 180, contrats: 20, medailles: '' },
        { id: 27, nom: 'Agent 27', prenom: 'A27', avatar: '🐨', equipe: 'France', drapeau: '🇫🇷', cellule: 'Switcher', score: 175, contrats: 19, medailles: '' },
        { id: 28, nom: 'Agent 28', prenom: 'A28', avatar: '🦊', equipe: 'Norvège', drapeau: '🇳🇴', cellule: 'Switcher', score: 170, contrats: 18, medailles: '' },
        { id: 29, nom: 'Agent 29', prenom: 'A29', avatar: '🐱', equipe: 'États-Unis', drapeau: '🇺🇸', cellule: 'Mover', score: 165, contrats: 17, medailles: '' },
        { id: 30, nom: 'Agent 30', prenom: 'A30', avatar: '🐻', equipe: 'Autriche', drapeau: '🇦🇹', cellule: 'Mover', score: 160, contrats: 16, medailles: '' },
        { id: 31, nom: 'Agent 31', prenom: 'A31', avatar: '🦝', equipe: 'Canada', drapeau: '🇨🇦', cellule: 'Mover', score: 155, contrats: 15, medailles: '' },
        { id: 32, nom: 'Agent 32', prenom: 'A32', avatar: '🦉', equipe: 'France', drapeau: '🇫🇷', cellule: 'Mover', score: 150, contrats: 14, medailles: '' },
        { id: 33, nom: 'Agent 33', prenom: 'A33', avatar: '🐺', equipe: 'Norvège', drapeau: '🇳🇴', cellule: 'Coach', score: 145, contrats: 13, medailles: '' },
        { id: 34, nom: 'Agent 34', prenom: 'A34', avatar: '🦁', equipe: 'États-Unis', drapeau: '🇺🇸', cellule: 'Pépinière', score: 140, contrats: 12, medailles: '' },
        { id: 35, nom: 'Agent 35', prenom: 'A35', avatar: '🐯', equipe: 'Autriche', drapeau: '🇦🇹', cellule: 'Switcher', score: 135, contrats: 11, medailles: '' },
        { id: 36, nom: 'Agent 36', prenom: 'A36', avatar: '🐼', equipe: 'Canada', drapeau: '🇨🇦', cellule: 'Switcher', score: 130, contrats: 10, medailles: '' },
        { id: 37, nom: 'Agent 37', prenom: 'A37', avatar: '🐨', equipe: 'France', drapeau: '🇫🇷', cellule: 'Coach', score: 125, contrats: 10, medailles: '' },
        { id: 38, nom: 'Agent 38', prenom: 'A38', avatar: '🦊', equipe: 'Norvège', drapeau: '🇳🇴', cellule: 'Pépinière', score: 120, contrats: 10, medailles: '' },
        { id: 39, nom: 'Agent 39', prenom: 'A39', avatar: '🐱', equipe: 'États-Unis', drapeau: '🇺🇸', cellule: 'Switcher', score: 115, contrats: 9, medailles: '' },
        { id: 40, nom: 'Agent 40', prenom: 'A40', avatar: '🐻', equipe: 'Autriche', drapeau: '🇦🇹', cellule: 'Pépinière', score: 110, contrats: 9, medailles: '' },
        { id: 41, nom: 'Agent 41', prenom: 'A41', avatar: '🦝', equipe: 'Canada', drapeau: '🇨🇦', cellule: 'Coach', score: 105, contrats: 9, medailles: '' },
        { id: 42, nom: 'Agent 42', prenom: 'A42', avatar: '🦉', equipe: 'France', drapeau: '🇫🇷', cellule: 'Pépinière', score: 100, contrats: 8, medailles: '' },
        { id: 43, nom: 'Agent 43', prenom: 'A43', avatar: '🐺', equipe: 'Norvège', drapeau: '🇳🇴', cellule: 'Mover', score: 95, contrats: 8, medailles: '' },
        { id: 44, nom: 'Agent 44', prenom: 'A44', avatar: '🦁', equipe: 'États-Unis', drapeau: '🇺🇸', cellule: 'Coach', score: 90, contrats: 8, medailles: '' },
        { id: 45, nom: 'Agent 45', prenom: 'A45', avatar: '🐯', equipe: 'Autriche', drapeau: '🇦🇹', cellule: 'Coach', score: 85, contrats: 7, medailles: '' },
        { id: 46, nom: 'Agent 46', prenom: 'A46', avatar: '🐼', equipe: 'Canada', drapeau: '🇨🇦', cellule: 'Pépinière', score: 75, contrats: 7, medailles: '' },
        { id: 47, nom: 'Agent 47', prenom: 'A47', avatar: '🐨', equipe: 'France', drapeau: '🇫🇷', cellule: 'Switcher', score: 65, contrats: 6, medailles: '' },
        { id: 48, nom: 'Agent 48', prenom: 'A48', avatar: '🦊', equipe: 'Norvège', drapeau: '🇳🇴', cellule: 'Switcher', score: 55, contrats: 6, medailles: '' },
        { id: 49, nom: 'Agent 49', prenom: 'A49', avatar: '🐱', equipe: 'États-Unis', drapeau: '🇺🇸', cellule: 'Mover', score: 50, contrats: 5, medailles: '' },
        { id: 50, nom: 'Agent 50', prenom: 'A50', avatar: '🐻', equipe: 'Autriche', drapeau: '🇦🇹', cellule: 'Pépinière', score: 45, contrats: 5, medailles: '' }
    ],
    
    // 5 équipes
    equipes: [
        { rang: 1, nom: 'Canada', drapeau: '🇨🇦', score: 1456, agents: 10 },
        { rang: 2, nom: 'France', drapeau: '🇫🇷', score: 1247, agents: 10 },
        { rang: 3, nom: 'Norvège', drapeau: '🇳🇴', score: 1189, agents: 10 },
        { rang: 4, nom: 'Autriche', drapeau: '🇦🇹', score: 1067, agents: 10 },
        { rang: 5, nom: 'États-Unis', drapeau: '🇺🇸', score: 998, agents: 10 }
    ],
    
    // Challenges actifs
    challengesActifs: [
        {
            id: 'ch1',
            titre: 'Sprint du vendredi',
            type: 'Premier à 5 contrats',
            dateDebut: '01/02/2026 14:00',
            dateFin: '01/02/2026 18:00',
            points: 50,
            tempsRestant: '2h 15min'
        }
    ],
    
    // Challenges à valider (admin)
    challengesAValider: []
};


// -------------------------------------------------------------
// PARTIE 2 : INITIALISATION
// -------------------------------------------------------------
document.addEventListener('DOMContentLoaded', function() {
    console.log('✅ Initialisation Vue Plateau');

    // Détecter le rôle (manager ou admin)
    detecterRole();

    // Charger les classements
    chargerClassementGlobal();
    chargerClassementEquipes();
    chargerClassementCellules();
    chargerPerformanceJour();
    chargerRecords();

    // Charger les challenges
    chargerChallengesActifs();

    // Event listeners
    document.getElementById('btn-deconnexion').addEventListener('click', deconnexion);
    
    const btnRetour = document.getElementById('btn-retour-manager');
    if (btnRetour && btnRetour.style.display !== 'none') {
        btnRetour.addEventListener('click', function() {
            window.location.href = 'manager.html';
        });
    }

    const btnCreer = document.getElementById('btn-creer-challenge');
    if (btnCreer && btnCreer.style.display !== 'none') {
        btnCreer.addEventListener('click', function() {
            ouvrirModal('modal-challenge');
        });
    }

    console.log('✅ Vue Plateau initialisée');
});


// -------------------------------------------------------------
// PARTIE 3 : DÉTECTION DU RÔLE
// -------------------------------------------------------------
function detecterRole() {
    // TODO: Récupérer depuis Supabase
    const role = 'manager'; // ou 'admin'
    
    document.getElementById('nom-utilisateur').textContent = role === 'admin' ? 'Direction' : 'Sophie Martin';
    document.getElementById('role-utilisateur').textContent = role === 'admin' ? 'Administrateur' : 'Manager';

    if (role === 'admin') {
        document.getElementById('btn-creer-challenge').style.display = 'block';
        document.getElementById('dropdown-equipes-admin').style.display = 'block';
        document.getElementById('section-challenges-validation').style.display = 'block';
        
        // Charger menu équipes
        chargerMenuEquipes();
    } else {
        document.getElementById('btn-retour-manager').style.display = 'block';
    }
}


// -------------------------------------------------------------
// PARTIE 4 : CHARGEMENT CLASSEMENTS
// -------------------------------------------------------------
function chargerClassementGlobal() {
    const agents = MOCK_DATA_PLATEAU.agents;
    
    // Podium top 3
    for (let i = 0; i < 3; i++) {
        const agent = agents[i];
        const place = i + 1;
        document.getElementById(`podium-${place}-avatar`).textContent = agent.avatar;
        document.getElementById(`podium-${place}-nom`).textContent = agent.prenom + ' ' + agent.nom.charAt(0) + '.';
        document.getElementById(`podium-${place}-equipe`).textContent = agent.drapeau + ' ' + agent.equipe;
        document.getElementById(`podium-${place}-score`).textContent = agent.score + ' pts';
    }
    
    // Tableau complet
    const tbody = document.getElementById('tableau-global-body');
    tbody.innerHTML = '';
    
    agents.forEach((agent, index) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td class="rang-cell">${index + 1}</td>
            <td>
                <div class="agent-cell">
                    <span class="agent-avatar-table">${agent.avatar}</span>
                    <span class="agent-nom-table">${agent.prenom} ${agent.nom}</span>
                </div>
            </td>
            <td><span class="equipe-badge">${agent.drapeau} ${agent.equipe}</span></td>
            <td><span class="cellule-badge">${agent.cellule}</span></td>
            <td class="score-table">${agent.score}</td>
            <td>${agent.contrats}</td>
            <td class="medailles-cell">${agent.medailles}</td>
        `;
        tbody.appendChild(tr);
    });
}

function chargerClassementEquipes() {
    const equipes = MOCK_DATA_PLATEAU.equipes;
    const container = document.getElementById('equipes-classement');
    container.innerHTML = '';
    
    equipes.forEach(equipe => {
        const div = document.createElement('div');
        div.className = 'equipe-item';
        div.innerHTML = `
            <div class="equipe-rang">${equipe.rang}</div>
            <div class="equipe-info">
                <div class="equipe-nom">${equipe.drapeau} ${equipe.nom}</div>
                <div class="equipe-score">${equipe.score} pts</div>
            </div>
        `;
        container.appendChild(div);
    });
}

function chargerClassementCellules() {
    const agents = MOCK_DATA_PLATEAU.agents;
    const cellules = ['Mover', 'Switcher', 'Coach', 'Pépinière'];
    
    cellules.forEach(cellule => {
        const agentsCellule = agents.filter(a => a.cellule === cellule).slice(0, 10);
        const tbody = document.getElementById(`tableau-${cellule.toLowerCase()}s`);
        if (!tbody) return;
        
        tbody.innerHTML = '';
        agentsCellule.forEach((agent, index) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td class="rang-cell">${index + 1}</td>
                <td>
                    <div class="agent-cell">
                        <span class="agent-avatar-table">${agent.avatar}</span>
                        <span class="agent-nom-table">${agent.prenom} ${agent.nom}</span>
                    </div>
                </td>
                <td>${agent.drapeau} ${agent.equipe}</td>
                <td class="score-table">${agent.score}</td>
                <td>-</td>
            `;
            tbody.appendChild(tr);
        });
    });
}

function chargerPerformanceJour() {
    // TODO: Implémenter
}

function chargerRecords() {
    // TODO: Implémenter
}


// -------------------------------------------------------------
// PARTIE 5 : CHALLENGES
// -------------------------------------------------------------
function chargerChallengesActifs() {
    const challenges = MOCK_DATA_PLATEAU.challengesActifs;
    const liste = document.getElementById('challenges-actifs-liste');
    
    if (challenges.length === 0) {
        liste.innerHTML = '<div class="aucun-challenge">Aucun challenge actif pour le moment</div>';
        return;
    }
    
    liste.innerHTML = '';
    challenges.forEach(ch => {
        const div = document.createElement('div');
        div.className = 'challenge-item';
        div.innerHTML = `
            <div class="challenge-info">
                <div class="challenge-titre">⚡ ${ch.titre}</div>
                <div class="challenge-details">${ch.type} • ${ch.points} points • ${ch.dateDebut} → ${ch.dateFin}</div>
            </div>
            <div class="challenge-timer">${ch.tempsRestant}</div>
        `;
        liste.appendChild(div);
    });
}

function afficherCriteres() {
    const type = document.getElementById('challenge-type').value;
    const groupe = document.getElementById('groupe-critere');
    const label = document.getElementById('label-critere');
    const input = document.getElementById('challenge-critere');
    
    if (type === 'nb_contrats') {
        groupe.style.display = 'block';
        label.textContent = 'Nombre de contrats :';
        input.required = true;
    } else {
        groupe.style.display = 'none';
        input.required = false;
    }
}

function creerChallenge(event) {
    event.preventDefault();
    
    const titre = document.getElementById('challenge-titre').value;
    const type = document.getElementById('challenge-type').value;
    const debut = document.getElementById('challenge-debut').value;
    const fin = document.getElementById('challenge-fin').value;
    const points = document.getElementById('challenge-points').value;
    
    console.log('Création challenge:', { titre, type, debut, fin, points });
    
    alert('✅ Challenge créé avec succès !\n\nLes agents ont été notifiés par popup et email.');
    
    fermerModal('modal-challenge');
    document.getElementById('form-challenge').reset();
    
    return false;
}

function validerChallengeResultat() {
    alert('✅ Challenge validé ! Les points ont été attribués au gagnant.');
    fermerModal('modal-validation-challenge');
}


// -------------------------------------------------------------
// PARTIE 6 : NAVIGATION
// -------------------------------------------------------------
function changerTab(tabName) {
    // Cacher tous les onglets
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Afficher l'onglet sélectionné
    document.getElementById('tab-' + tabName).classList.add('active');
    event.currentTarget.classList.add('active');
}

function changerCellule(celluleName) {
    // Cacher tous les contenus de cellules
    document.querySelectorAll('.cellule-content').forEach(content => {
        content.classList.remove('active');
    });
    document.querySelectorAll('.cellule-tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Afficher la cellule sélectionnée
    document.getElementById('cellule-' + celluleName).classList.add('active');
    event.currentTarget.classList.add('active');
}

function chargerMenuEquipes() {
    const equipes = [
        { id: 1, nom: 'Norvège', drapeau: '🇳🇴' },
        { id: 2, nom: 'France', drapeau: '🇫🇷' },
        { id: 3, nom: 'Canada', drapeau: '🇨🇦' },
        { id: 4, nom: 'Autriche', drapeau: '🇦🇹' },
        { id: 5, nom: 'États-Unis', drapeau: '🇺🇸' }
    ];
    
    const menu = document.getElementById('menu-equipes-admin');
    menu.innerHTML = '';
    
    equipes.forEach(equipe => {
        const div = document.createElement('div');
        div.className = 'dropdown-item';
        div.textContent = `${equipe.drapeau} Équipe ${equipe.nom}`;
        div.onclick = function() {
            window.location.href = `manager.html?equipe=${equipe.id}`;
        };
        menu.appendChild(div);
    });
}


// -------------------------------------------------------------
// PARTIE 7 : MODALS
// -------------------------------------------------------------
function ouvrirModal(modalId) {
    document.getElementById(modalId).classList.add('actif');
}

function fermerModal(modalId) {
    document.getElementById(modalId).classList.remove('actif');
}


// -------------------------------------------------------------
// PARTIE 8 : UTILITAIRES
// -------------------------------------------------------------
function deconnexion() {
    if (confirm('Voulez-vous vraiment vous déconnecter ?')) {
        window.location.href = 'index.html';
    }
}

console.log('✅ plateau.js chargé');
