// =============================================================
// ONBOARDING V2 - VERSION FINALE (Compatible sb & drapeau_emoji)
// =============================================================

console.log('✅ Onboarding - Chargement...');

// 1. Utilisation de 'sb' comme dans les autres fichiers
const { createClient } = window.supabase;
const sb = createClient(SUPABASE_CONFIG.URL, SUPABASE_CONFIG.KEY);

const selectionUtilisateur = {
    avatarUrl: null,
    managerId: null,
    equipeId: null,
    cellule: null
};

document.addEventListener('DOMContentLoaded', async function() {
    
    const { data: { user } } = await sb.auth.getUser();
    if (!user) { window.location.href = 'connexion-finale.html'; return; }

    // Vérifier si déjà onboardé
    const { data } = await sb.from('users').select('onboarding_complete').eq('id', user.id).maybeSingle();
    
    if (data?.onboarding_complete) { 
        window.location.href = 'dashboard.html'; 
        return; 
    }

    chargerAvatars();
    await chargerManagers();

    // Attacher l'événement final
    const btnTerminer = document.getElementById('btn-terminer');
    if(btnTerminer) btnTerminer.addEventListener('click', terminerOnboarding);
});

// -------------------------------------------------------------
// FONCTIONS GLOBALES (Accessibles via onclick HTML)
// -------------------------------------------------------------
window.allerEtape = function(num) {
    document.querySelectorAll('.etape').forEach(e => e.classList.remove('active'));
    document.getElementById('etape-' + num).classList.add('active');
    
    document.querySelectorAll('.indicateur-etape').forEach((ind, i) => {
        // Logique optionnelle si tu as des barres de progression
        if(ind) {
            ind.classList.toggle('completed', i < num);
            ind.classList.toggle('active', i + 1 === num);
        }
    });

    // Mise à jour de la barre latérale (si présente dans ton HTML)
    document.querySelectorAll('.step').forEach(s => s.classList.remove('active'));
    const step = document.querySelector(`.step[data-step="${num}"]`);
    if(step) step.classList.add('active');
};

window.validerAvatar = function() {
    if (!selectionUtilisateur.avatarUrl) {
        afficherErreur('erreur-avatar', '⚠️ Choisissez un avatar');
        return;
    }
    window.allerEtape(3);
};

window.validerManager = function() {
    if (!selectionUtilisateur.managerId) {
        afficherErreur('erreur-manager', '⚠️ Choisissez un manager');
        return;
    }
    window.allerEtape(4);
};

window.selectionnerCellule = function(celluleNom) {
    // Retirer la classe selected de toutes les cartes
    document.querySelectorAll('.cellule-carte').forEach(d => d.classList.remove('selected'));
    
    // Ajouter la classe selected à la carte cliquée (hack visuel simple)
    // On cherche l'élément qui contient le data-cellule correspondant
    const carte = document.querySelector(`.cellule-carte[data-cellule="${celluleNom}"]`);
    if(carte) carte.classList.add('selected');

    selectionUtilisateur.cellule = celluleNom;
    const err = document.getElementById('erreur-cellule');
    if(err) err.classList.remove('visible');
};

// -------------------------------------------------------------
// LOGIQUE INTERNE
// -------------------------------------------------------------
function afficherErreur(id, msg) {
    const el = document.getElementById(id);
    if(el) {
        el.textContent = msg;
        el.classList.add('visible');
    }
}

function chargerAvatars() {
    const grid = document.getElementById('avatars-grid');
    if(!grid) return;

    // Liste EXACTE basée sur votre capture d'écran Windows
    const mesImages = [
        'man1.png', 'man2.png', 'man3.png', 'man4.png', 'man5.png',
        'woman.png', 'woman1.png', 'woman2.png',
        'chicken.png', 'lion.png', 'panda.png', 'parrot.png',
        'tiger.png', 'sea-lion.png'
    ];
    
    grid.innerHTML = '';
    
    mesImages.forEach(nomImage => {
        const cheminComplet = `assets/${nomImage}`;
        
        const div = document.createElement('div');
        div.className = 'avatar-item';
        div.innerHTML = `<img src="${cheminComplet}" alt="Avatar">`;
        
        div.onclick = () => {
            document.querySelectorAll('.avatar-item').forEach(d => d.classList.remove('selected'));
            div.classList.add('selected');
            selectionUtilisateur.avatarUrl = nomImage; // On garde le nom propre
            
            const err = document.getElementById('erreur-avatar');
            if(err) err.classList.remove('visible');
        };
        grid.appendChild(div);
    });
}

async function chargerManagers() {
    const select = document.getElementById('select-manager');
    if(!select) return;

    try {
        // CORRECTION : On utilise bien drapeau_emoji
        const { data: managers, error } = await sb
            .from('users')
            .select('id, nom, prenom, equipe_id, role, equipes(nom, drapeau_emoji)')
            .in('role', ['manager', 'admin'])
            .order('nom');

        if(error) throw error;

        managers.forEach(m => {
            const opt = document.createElement('option');
            opt.value = m.id;
            opt.textContent = `${m.prenom} ${m.nom}`;
            
            // Stockage des données d'équipe dans les attributs data
            opt.dataset.eid = m.equipe_id;
            opt.dataset.enom = m.equipes ? m.equipes.nom : 'Sans équipe';
            opt.dataset.edrapeau = m.equipes ? (m.equipes.drapeau_emoji || '🚩') : '';
            
            select.appendChild(opt);
        });

        select.onchange = function() {
            const opt = this.options[this.selectedIndex];
            if (opt.value) {
                selectionUtilisateur.managerId = opt.value;
                selectionUtilisateur.equipeId = opt.dataset.eid;
                
                const elNom = document.getElementById('nom-equipe-affectee');
                const elDrap = document.getElementById('drapeau-equipe-affectee');
                const elInfo = document.getElementById('info-equipe');

                if(elNom) elNom.textContent = opt.dataset.enom;
                if(elDrap) elDrap.textContent = opt.dataset.edrapeau;
                if(elInfo) elInfo.style.display = 'flex';
                
                const err = document.getElementById('erreur-manager');
                if(err) err.classList.remove('visible');
            }
        };
    } catch (e) {
        console.error("Erreur chargement managers", e);
    }
}

async function terminerOnboarding() {
    if (!selectionUtilisateur.cellule) {
        afficherErreur('erreur-cellule', '⚠️ Choisissez une cellule');
        return;
    }
    
    const { data: { user } } = await sb.auth.getUser();
    
    const btn = document.getElementById('btn-terminer');
    const txt = document.getElementById('btn-terminer-texte');
    const spin = document.getElementById('spinner-terminer');
    
    if(btn) btn.disabled = true;
    if(txt) txt.textContent = 'Configuration...';
    if(spin) spin.style.display = 'inline-block';

    try {
        const { error } = await sb.from('users').update({
            avatar_url: selectionUtilisateur.avatarUrl,
            manager_id: selectionUtilisateur.managerId,
            equipe_id: selectionUtilisateur.equipeId,
            cellule: selectionUtilisateur.cellule,
            onboarding_complete: true
        }).eq('id', user.id);

        if (error) throw error;

        // Redirection vers le dashboard
        window.location.href = 'dashboard.html';

    } catch (error) {
        alert('Erreur: ' + error.message);
        if(btn) btn.disabled = false;
        if(txt) txt.textContent = 'Terminer →';
        if(spin) spin.style.display = 'none';
    }
}