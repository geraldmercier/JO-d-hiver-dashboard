// =============================================================
// FICHIER : onboarding.js
// VERSION : Simplifiée pour test
// =============================================================

console.log('✅ Script onboarding.js chargé');

// -------------------------------------------------------------
// VARIABLES GLOBALES
// -------------------------------------------------------------
const selectionUtilisateur = {
    avatarUrl: null,
    managerId: null,
    equipeId: null,
    cellule: null
};

const AVATARS_DISPONIBLES = [
    'chicken.png',
    'woman.png',
    'lion.png',
    'man (1).png',
    'man (2).png',
    'man (3).png',
    'man (4).png',
    'man (5).png',
    'man.png',
    'panda.png',
    'parrot.png',
    'sea-lion.png',
    'tiger.png',
    'woman (1).png',
    'woman (2).png'
];


// -------------------------------------------------------------
// FONCTIONS GLOBALES (accessibles depuis onclick)
// -------------------------------------------------------------

function allerEtape(numeroEtape) {
    console.log('📍 Aller à l\'étape', numeroEtape);
    
    // Cacher toutes les étapes
    const etapes = document.querySelectorAll('.etape');
    etapes.forEach(etape => {
        etape.classList.remove('active');
    });

    // Afficher l'étape demandée
    const etapeCible = document.getElementById('etape-' + numeroEtape);
    if (etapeCible) {
        etapeCible.classList.add('active');
        console.log('✅ Étape ' + numeroEtape + ' affichée');
    } else {
        console.error('❌ Étape ' + numeroEtape + ' introuvable');
    }

    // Mettre à jour l'indicateur
    const steps = document.querySelectorAll('.step');
    steps.forEach(step => {
        const stepNum = parseInt(step.getAttribute('data-step'));
        step.classList.remove('active', 'completed');
        
        if (stepNum === numeroEtape) {
            step.classList.add('active');
        } else if (stepNum < numeroEtape) {
            step.classList.add('completed');
        }
    });

    // Scroll en haut
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function validerAvatar() {
    console.log('✅ Validation avatar');
    if (!selectionUtilisateur.avatarUrl) {
        document.getElementById('erreur-avatar').classList.add('visible');
        console.warn('⚠️ Aucun avatar sélectionné');
        return;
    }
    allerEtape(3);
}

function validerManager() {
    console.log('✅ Validation manager');
    if (!selectionUtilisateur.managerId) {
        document.getElementById('erreur-manager').classList.add('visible');
        console.warn('⚠️ Aucun manager sélectionné');
        return;
    }
    allerEtape(4);
}

function selectionnerAvatar(nomFichier) {
    console.log('🖼️ Avatar sélectionné:', nomFichier);
    
    // Retirer la sélection des autres
    const items = document.querySelectorAll('.avatar-item');
    items.forEach(item => {
        item.classList.remove('selected');
    });

    // Sélectionner celui cliqué
    if (event && event.currentTarget) {
        event.currentTarget.classList.add('selected');
    }
    
    selectionUtilisateur.avatarUrl = 'assets/' + nomFichier;

    // Cacher l'erreur
    document.getElementById('erreur-avatar').classList.remove('visible');
}

function selectionnerCellule(nomCellule) {
    console.log('📊 Cellule sélectionnée:', nomCellule);
    
    // Retirer la sélection des autres
    const cartes = document.querySelectorAll('.cellule-carte');
    cartes.forEach(carte => {
        carte.classList.remove('selected');
    });

    // Sélectionner celle cliquée
    if (event && event.currentTarget) {
        event.currentTarget.classList.add('selected');
    }
    
    selectionUtilisateur.cellule = nomCellule;

    // Cacher l'erreur
    document.getElementById('erreur-cellule').classList.remove('visible');
}

function terminerOnboarding() {
    console.log('🏁 Terminer onboarding');
    
    if (!selectionUtilisateur.cellule) {
        document.getElementById('erreur-cellule').classList.add('visible');
        console.warn('⚠️ Aucune cellule sélectionnée');
        return;
    }

    console.log('✅ Données collectées:', selectionUtilisateur);
    
    // Pour le test, on affiche juste un message
    alert('Onboarding terminé !\n\nAvatar: ' + selectionUtilisateur.avatarUrl + '\nCellule: ' + selectionUtilisateur.cellule);
    
    // En production, on sauvegarderait dans Supabase ici
    // et on redirigerait vers dashboard.html
}


// -------------------------------------------------------------
// INITIALISATION AU CHARGEMENT
// -------------------------------------------------------------
document.addEventListener('DOMContentLoaded', function() {
    console.log('🏔️ Onboarding — Initialisation...');

    // Afficher le nom d'utilisateur
    document.getElementById('nom-utilisateur').textContent = 'Agent';

    // Charger les avatars
    chargerAvatars();

    // Charger les managers (version simplifiée)
    chargerManagersTest();

    console.log('✅ Onboarding initialisé');
});


// -------------------------------------------------------------
// FONCTIONS INTERNES
// -------------------------------------------------------------

function chargerAvatars() {
    const grid = document.getElementById('avatars-grid');
    if (!grid) {
        console.error('❌ Grille avatars introuvable');
        return;
    }

    grid.innerHTML = '';

    AVATARS_DISPONIBLES.forEach(function(nomFichier) {
        const div = document.createElement('div');
        div.className = 'avatar-item';
        div.onclick = function() { selectionnerAvatar(nomFichier); };

        const img = document.createElement('img');
        img.src = 'assets/' + nomFichier;
        img.alt = nomFichier;
        img.onerror = function() {
            console.warn('⚠️ Avatar introuvable:', nomFichier);
            div.style.display = 'none';
        };

        div.appendChild(img);
        grid.appendChild(div);
    });

    console.log('✅ ' + AVATARS_DISPONIBLES.length + ' avatars chargés');
}

function chargerManagersTest() {
    const select = document.getElementById('select-manager');
    if (!select) {
        console.error('❌ Select manager introuvable');
        return;
    }

    // Version test avec managers fictifs
    const managersTest = [
        { id: '1', nom: 'Sophie Martin', equipe: 'France', drapeau: '🇫🇷', equipeId: 2 },
        { id: '2', nom: 'John Smith', equipe: 'Canada', drapeau: '🇨🇦', equipeId: 3 },
        { id: '3', nom: 'Lars Olsen', equipe: 'Norvège', drapeau: '🇳🇴', equipeId: 1 }
    ];

    select.innerHTML = '<option value="">-- Choisissez votre manager --</option>';

    managersTest.forEach(function(manager) {
        const option = document.createElement('option');
        option.value = manager.id;
        option.textContent = manager.nom + ' (Équipe ' + manager.equipe + ' ' + manager.drapeau + ')';
        option.setAttribute('data-equipe-id', manager.equipeId);
        option.setAttribute('data-equipe-nom', manager.equipe);
        option.setAttribute('data-equipe-drapeau', manager.drapeau);
        select.appendChild(option);
    });

    select.addEventListener('change', function() {
        const option = this.options[this.selectedIndex];
        
        if (option.value) {
            selectionUtilisateur.managerId = option.value;
            selectionUtilisateur.equipeId = option.getAttribute('data-equipe-id');

            const infoEquipe = document.getElementById('info-equipe');
            const nomEquipe = document.getElementById('nom-equipe-affectee');
            const drapeauEquipe = document.getElementById('drapeau-equipe-affectee');

            nomEquipe.textContent = option.getAttribute('data-equipe-nom');
            drapeauEquipe.textContent = option.getAttribute('data-equipe-drapeau');
            infoEquipe.style.display = 'flex';

            document.getElementById('erreur-manager').classList.remove('visible');

            console.log('✅ Manager sélectionné:', option.textContent);
        } else {
            document.getElementById('info-equipe').style.display = 'none';
        }
    });

    console.log('✅ Managers test chargés');
}

console.log('✅ Toutes les fonctions sont déclarées');
