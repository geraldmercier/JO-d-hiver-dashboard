// =============================================================
// FICHIER : dashboard.js
// DESCRIPTION : Logique du dashboard agent
//
// FONCTIONNALITÉS :
//   1. Charger les données de l'agent (mock data pour l'instant)
//   2. Afficher les informations dans toutes les sections
//   3. Créer le graphique Ski de Fond avec Chart.js
//   4. Gérer le formulaire de saisie de contrat
//   5. Afficher la liste des contrats du jour
//   6. Générer le calendrier des 12 jours
//   7. Afficher les badges
//   8. Bouton de déconnexion
// =============================================================


// -------------------------------------------------------------
// PARTIE 1 : DONNÉES DE TEST (Mock Data)
//
// Pour l'instant, on utilise des données fictives.
// Plus tard (Étape 4), on les remplacera par les vraies
// données de Supabase.
// -------------------------------------------------------------
const MOCK_DATA = {
    agent: {
        id: 1,
        nom: "Gerald Mercier",
        email: "gerald.mercier@papernest.com",
        equipe: "France",
        drapeau: "🇫🇷",
        avatar: "https://ui-avatars.com/api/?name=Gerald+Mercier&background=1565C0&color=fff&size=80",
        categorie: "Mover",
        scoreTotal: 245,
        rangGlobal: 12,
        rangEquipe: 3,
        evolutionGlobal: +3,      // +3 places depuis hier
        pointsManquants: 15,
        
        // Ski de Fond (TR pour les Movers)
        skiFondValeur: 67,         // 67% de TR
        skiFondObjectif: 75,
        skiFondProgression: [45, 52, 58, 61, 64, 65, 67, 68, 70, 72, 73, 75]  // Progression sur 12 jours
    },
    
    epreuveJour: {
        nom: "Sprint Biathlon",
        date: "Vendredi 9 Février 2026",
        kpi: "Telco (Movers)",
        scoreJour: 18,
        classementJour: 5,
        messageMotivation: "🥉 Vous êtes à 2 contrats de la médaille de bronze !"
    },
    
    equipe: {
        nom: "France",
        position: 2,
        scoreTotal: 1247,
        top3: [
            { nom: "Sophie Martin", score: 298 },
            { nom: "Pierre Dubois", score: 267 },
            { nom: "Gerald Mercier", score: 245 }  // L'agent actuel
        ]
    },
    
    contratsJour: [
        { type: "Telco", heure: "14:32", lien: "https://salesforce.com/piste/12345", icone: "📞" },
        { type: "Mobile", heure: "11:15", lien: "https://salesforce.com/piste/67890", icone: "📱" }
    ],
    
    calendrier: [
        { date: "9 Fév", score: 18, medaille: null },
        { date: "10 Fév", score: 22, medaille: "🥉" },
        { date: "11 Fév", score: 15, medaille: null },
        { date: "12 Fév", score: 28, medaille: "🥈" },
        { date: "13 Fév", score: 20, medaille: null },
        { date: "16 Fév", score: 0, medaille: null },   // Jour à venir
        { date: "17 Fév", score: 0, medaille: null },
        { date: "18 Fév", score: 0, medaille: null },
        { date: "19 Fév", score: 0, medaille: null },
        { date: "20 Fév", score: 0, medaille: null }
    ],
    
    badges: [
        { code: "premier_contrat", nom: "Premier Contrat", icone: "🎯", deblocque: true },
        { code: "serie_5", nom: "Série de 5", icone: "🔥", deblocque: true },
        { code: "top3_global", nom: "Top 3 Global", icone: "🏅", deblocque: false },
        { code: "10_contrats", nom: "10 Contrats", icone: "📝", deblocque: false },
        { code: "podium_jour", nom: "Podium du Jour", icone: "🥇", deblocque: true },
        { code: "equipe_victoire", nom: "Équipe Victorieuse", icone: "🏆", deblocque: false }
    ]
};


// -------------------------------------------------------------
// PARTIE 2 : ATTENDRE QUE LA PAGE SOIT CHARGÉE
// -------------------------------------------------------------
document.addEventListener('DOMContentLoaded', function() {

    console.log('🏔️ Dashboard Agent — Chargement...');

    // Initialiser toutes les sections
    afficherProfilHeader();
    afficherPosition();
    afficherSkiFond();
    afficherPerformanceJour();
    afficherEquipe();
    afficherContratsJour();
    genererCalendrier();
    afficherBadges();
    
    // Initialiser le formulaire
    initialiserFormulaire();
    
    // Bouton déconnexion
    document.getElementById('btn-deconnexion').addEventListener('click', deconnexion);
    
    console.log('✅ Dashboard chargé avec succès !');
});


// -------------------------------------------------------------
// PARTIE 3 : AFFICHER LE PROFIL DANS LE HEADER
// -------------------------------------------------------------
function afficherProfilHeader() {
    const agent = MOCK_DATA.agent;
    
    // Avatar
    document.getElementById('avatar-agent').src = agent.avatar;
    document.getElementById('avatar-agent').alt = `Avatar de ${agent.nom}`;
    
    // Drapeau équipe
    document.getElementById('drapeau-equipe').textContent = agent.drapeau;
    
    // Nom et équipe
    document.getElementById('nom-agent').textContent = agent.nom;
    document.getElementById('nom-equipe').textContent = `Équipe ${agent.equipe}`;
    
    // Score total
    document.getElementById('score-total').textContent = agent.scoreTotal;
    
    // Médaille si top 3 global
    const medailleContainer = document.getElementById('medaille-container');
    if (agent.rangGlobal <= 3) {
        const medailles = ['🥇', '🥈', '🥉'];
        medailleContainer.innerHTML = medailles[agent.rangGlobal - 1];
    }
}


// -------------------------------------------------------------
// PARTIE 4 : AFFICHER LA POSITION
// -------------------------------------------------------------
function afficherPosition() {
    const agent = MOCK_DATA.agent;
    
    // Rang global
    document.getElementById('rang-global').textContent = `${agent.rangGlobal}ème/50`;
    
    // Évolution
    const evolutionEl = document.getElementById('evolution-global');
    const fleche = agent.evolutionGlobal > 0 ? '↑' : agent.evolutionGlobal < 0 ? '↓' : '→';
    const couleur = agent.evolutionGlobal > 0 ? 'var(--vert-succes)' : 'var(--rouge-erreur)';
    evolutionEl.innerHTML = `<span class="fleche">${fleche}</span> ${Math.abs(agent.evolutionGlobal)} places`;
    evolutionEl.style.color = couleur;
    
    // Rang dans l'équipe
    document.getElementById('rang-equipe').textContent = `${agent.rangEquipe}ème/10`;
    
    // Points manquants
    document.getElementById('points-manquants').textContent = 
        `${agent.pointsManquants} pts pour la ${agent.rangEquipe - 1}ème place`;
}


// -------------------------------------------------------------
// PARTIE 5 : AFFICHER SKI DE FOND + GRAPHIQUE
// -------------------------------------------------------------
function afficherSkiFond() {
    const agent = MOCK_DATA.agent;
    
    // Valeur actuelle
    document.getElementById('ski-fond-valeur').textContent = `${agent.skiFondValeur}%`;
    
    // Créer le graphique avec Chart.js
    const ctx = document.getElementById('graphique-ski-fond').getContext('2d');
    
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['J1', 'J2', 'J3', 'J4', 'J5', 'J6', 'J7', 'J8', 'J9', 'J10', 'J11', 'J12'],
            datasets: [{
                label: 'Votre progression',
                data: agent.skiFondProgression,
                borderColor: '#1565C0',
                backgroundColor: 'rgba(21, 101, 192, 0.1)',
                tension: 0.4,           // Courbe lissée
                fill: true,
                pointRadius: 4,
                pointHoverRadius: 6
            }, {
                label: 'Objectif',
                data: Array(12).fill(agent.skiFondObjectif),  // Ligne horizontale à 75%
                borderColor: '#FF9800',
                borderDash: [5, 5],     // Ligne pointillée
                fill: false,
                pointRadius: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'bottom'
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    ticks: {
                        callback: function(value) {
                            return value + '%';
                        }
                    }
                }
            }
        }
    });
}


// -------------------------------------------------------------
// PARTIE 6 : AFFICHER PERFORMANCE DU JOUR
// -------------------------------------------------------------
function afficherPerformanceJour() {
    const epreuve = MOCK_DATA.epreuveJour;
    
    document.getElementById('nom-epreuve').textContent = epreuve.nom;
    document.getElementById('date-epreuve').textContent = epreuve.date;
    document.getElementById('kpi-jour').textContent = epreuve.kpi;
    document.getElementById('score-jour').textContent = `${epreuve.scoreJour} pts`;
    document.getElementById('classement-jour').textContent = `${epreuve.classementJour}ème`;
    document.getElementById('medaille-potentielle').textContent = epreuve.messageMotivation;
}


// -------------------------------------------------------------
// PARTIE 7 : AFFICHER LA VUE ÉQUIPE
// -------------------------------------------------------------
function afficherEquipe() {
    const equipe = MOCK_DATA.equipe;
    
    // Position et score de l'équipe
    document.querySelector('.position-rang').textContent = `${equipe.position}ème`;
    document.getElementById('score-equipe').textContent = `${equipe.scoreTotal.toLocaleString()} pts`;
    
    // Top 3 de l'équipe
    const top3Liste = document.getElementById('top3-equipe');
    top3Liste.innerHTML = '';
    
    equipe.top3.forEach((membre, index) => {
        const li = document.createElement('li');
        if (membre.nom === MOCK_DATA.agent.nom) {
            li.classList.add('vous');
        }
        
        li.innerHTML = `
            <span class="top3-nom">${membre.nom}${membre.nom === MOCK_DATA.agent.nom ? ' (Vous)' : ''}</span>
            <span class="top3-score">${membre.score} pts</span>
        `;
        
        top3Liste.appendChild(li);
    });
}


// -------------------------------------------------------------
// PARTIE 8 : AFFICHER LES CONTRATS DU JOUR
// -------------------------------------------------------------
function afficherContratsJour() {
    const contrats = MOCK_DATA.contratsJour;
    const liste = document.getElementById('contrats-liste');
    
    // Vider la liste
    liste.innerHTML = '';
    
    if (contrats.length === 0) {
        liste.innerHTML = '<div class="contrat-vide">Aucun contrat enregistré pour aujourd\'hui</div>';
        return;
    }
    
    contrats.forEach(contrat => {
        const div = document.createElement('div');
        div.className = 'contrat-item';
        div.innerHTML = `
            <span class="contrat-icone">${contrat.icone}</span>
            <div class="contrat-info">
                <span class="contrat-type">${contrat.type}</span>
                <span class="contrat-heure">${contrat.heure}</span>
            </div>
            <a href="${contrat.lien}" class="contrat-lien" target="_blank" title="Ouvrir dans Salesforce">🔗</a>
        `;
        liste.appendChild(div);
    });
}


// -------------------------------------------------------------
// PARTIE 9 : GÉNÉRER LE CALENDRIER DES 12 JOURS
// -------------------------------------------------------------
function genererCalendrier() {
    const calendrier = MOCK_DATA.calendrier;
    const grid = document.getElementById('calendrier-grid');
    
    grid.innerHTML = '';
    
    calendrier.forEach((jour, index) => {
        const div = document.createElement('div');
        div.className = 'jour-item';
        
        // Marquer le jour actuel (jour 5 par exemple)
        if (index === 4) {
            div.classList.add('actif');
        }
        
        div.innerHTML = `
            <div class="jour-date">${jour.date}</div>
            <div class="jour-score">${jour.score > 0 ? jour.score + ' pts' : '—'}</div>
            ${jour.medaille ? `<div class="jour-medaille">${jour.medaille}</div>` : ''}
        `;
        
        grid.appendChild(div);
    });
}


// -------------------------------------------------------------
// PARTIE 10 : AFFICHER LES BADGES
// -------------------------------------------------------------
function afficherBadges() {
    const badges = MOCK_DATA.badges;
    const grid = document.getElementById('badges-grid');
    
    grid.innerHTML = '';
    
    badges.forEach(badge => {
        const div = document.createElement('div');
        div.className = `badge-item ${badge.deblocque ? 'deblocque' : 'verroui'}`;
        div.title = badge.nom;
        
        div.innerHTML = `
            <span class="badge-icone">${badge.deblocque ? badge.icone : '🔒'}</span>
            <span class="badge-nom">${badge.nom}</span>
        `;
        
        grid.appendChild(div);
    });
}


// -------------------------------------------------------------
// PARTIE 11 : FORMULAIRE D'ENREGISTREMENT DE CONTRAT
// -------------------------------------------------------------
function initialiserFormulaire() {
    const formulaire = document.getElementById('formulaire-contrat');
    
    formulaire.addEventListener('submit', async function(event) {
        event.preventDefault();
        
        // Récupérer les valeurs
        const typeContrat = document.getElementById('type-contrat').value;
        const lienPiste = document.getElementById('lien-piste').value;
        
        // Validation
        if (!typeContrat || !lienPiste) {
            afficherMessageErreurForm('Veuillez remplir tous les champs.');
            return;
        }
        
        // Vérifier que c'est bien une URL
        try {
            new URL(lienPiste);
        } catch (e) {
            afficherMessageErreurForm('Le lien doit être une URL valide (https://...)');
            return;
        }
        
        // Afficher le spinner
        const btnTexte = document.getElementById('btn-texte');
        const spinner = document.getElementById('spinner-form');
        const btn = document.getElementById('btn-enregistrer');
        
        btn.disabled = true;
        btnTexte.style.display = 'none';
        spinner.classList.add('actif');
        
        // Simuler l'envoi (2 secondes)
        // Plus tard, on enverra vraiment à Supabase
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Réactiver le bouton
        btn.disabled = false;
        btnTexte.style.display = 'inline';
        spinner.classList.remove('actif');
        
        // Afficher le message de succès
        afficherMessageSucces('✅ Contrat enregistré avec succès !');
        
        // Réinitialiser le formulaire
        formulaire.reset();
        
        // Ajouter le contrat à la liste (simulation)
        const maintenant = new Date();
        const heure = `${maintenant.getHours()}:${maintenant.getMinutes().toString().padStart(2, '0')}`;
        
        const icones = {
            'Telco': '📞',
            'Mobile': '📱',
            'MRH': '🏠',
            'Compensation Carbone': '🌱',
            'Premium': '⭐',
            'Autre': '📄'
        };
        
        MOCK_DATA.contratsJour.unshift({
            type: typeContrat,
            heure: heure,
            lien: lienPiste,
            icone: icones[typeContrat] || '📄'
        });
        
        // Rafraîchir la liste
        afficherContratsJour();
    });
}

function afficherMessageSucces(texte) {
    const messageSucces = document.getElementById('message-succes');
    messageSucces.textContent = texte;
    messageSucces.classList.add('visible');
    
    // Cacher le message d'erreur s'il était visible
    document.getElementById('message-erreur-form').classList.remove('visible');
    
    // Cacher après 5 secondes
    setTimeout(() => {
        messageSucces.classList.remove('visible');
    }, 5000);
}

function afficherMessageErreurForm(texte) {
    const messageErreur = document.getElementById('message-erreur-form');
    messageErreur.textContent = texte;
    messageErreur.classList.add('visible');
    
    // Cacher le message de succès s'il était visible
    document.getElementById('message-succes').classList.remove('visible');
}


// -------------------------------------------------------------
// PARTIE 12 : DÉCONNEXION
// -------------------------------------------------------------
function deconnexion() {
    if (confirm('Voulez-vous vraiment vous déconnecter ?')) {
        // Rediriger vers la page de connexion
        window.location.href = 'index.html';
    }
}


// -------------------------------------------------------------
// PARTIE 13 : FONCTIONS UTILITAIRES
// -------------------------------------------------------------

// Formater un nombre avec des espaces (1234 → 1 234)
function formaterNombre(nombre) {
    return nombre.toLocaleString('fr-FR');
}

// Obtenir la couleur de l'équipe
function getCouleurEquipe(nomEquipe) {
    const couleurs = {
        'Norvège': '#BA0C2F',
        'France': '#002395',
        'Canada': '#FF0000',
        'Autriche': '#ED2939',
        'États-Unis': '#3C3B6E'
    };
    return couleurs[nomEquipe] || '#1565C0';
}
