// =============================================================
// ONBOARDING V2 - VERSION CORRIGÉE
// =============================================================

console.log('✅ Onboarding - Chargement...');

const supabase = window.supabase.createClient(SUPABASE_CONFIG.URL, SUPABASE_CONFIG.KEY);

const selectionUtilisateur = {
    avatarUrl: null,
    managerId: null,
    equipeId: null,
    cellule: null
};

document.addEventListener('DOMContentLoaded', async function() {
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { window.location.href = 'index.html'; return; }

    // Vérifier si déjà onboardé
    const { data } = await supabase.from('users').select('onboarding_complete').eq('id', user.id).maybeSingle();
    if (data?.onboarding_complete) { window.location.href = 'dashboard.html'; return; }

    chargerAvatars();
    chargerManagers();

    // Attacher l'événement final
    document.getElementById('btn-terminer').addEventListener('click', terminerOnboarding);
});

// -------------------------------------------------------------
// FONCTIONS GLOBALES (Pour les onclick HTML)
// -------------------------------------------------------------
window.allerEtape = function(num) {
    document.querySelectorAll('.etape').forEach(e => e.classList.remove('active'));
    document.getElementById('etape-' + num).classList.add('active');
    
    document.querySelectorAll('.indicateur-etape').forEach((ind, i) => {
        ind.classList.toggle('completed', i < num);
        ind.classList.toggle('active', i + 1 === num);
    });
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
    document.querySelectorAll('.cellule-carte').forEach(d => d.classList.remove('selected'));
    // L'élément cliqué est passé via event.currentTarget dans le onclick HTML, 
    // ou on peut le retrouver si on utilisait addEventListener.
    // Ici on suppose que le HTML fait: onclick="selectionnerCellule('Mover')"
    // Il faut ajouter "this" dans le HTML: onclick="selectionnerCellule('Mover', this)"
    // Ou plus simple, on cherche par texte ou on refait la logique JS:
    
    // Hack rapide compatible avec ton HTML actuel :
    const cartes = document.querySelectorAll('.cellule-carte');
    cartes.forEach(c => {
        if(c.textContent.includes(celluleNom)) c.classList.add('selected');
    });

    selectionUtilisateur.cellule = celluleNom;
    document.getElementById('erreur-cellule').classList.remove('visible');
};

// -------------------------------------------------------------
// LOGIQUE INTERNE
// -------------------------------------------------------------
function afficherErreur(id, msg) {
    const el = document.getElementById(id);
    el.textContent = msg;
    el.classList.add('visible');
}

function chargerAvatars() {
    const grid = document.getElementById('avatars-grid');
    const avatars = ['chicken.png', 'woman.png', 'man.png', 'lion.png', 'tiger.png']; // Liste raccourcie pour l'exemple
    
    grid.innerHTML = '';
    avatars.forEach(file => {
        const div = document.createElement('div');
        div.className = 'avatar-item';
        div.onclick = () => {
            document.querySelectorAll('.avatar-item').forEach(d => d.classList.remove('selected'));
            div.classList.add('selected');
            selectionUtilisateur.avatarUrl = 'assets/' + file;
            document.getElementById('erreur-avatar').classList.remove('visible');
        };
        div.innerHTML = `<img src="assets/${file}" alt="Avatar">`;
        grid.appendChild(div);
    });
}

async function chargerManagers() {
    const select = document.getElementById('select-manager');
    const { data: managers } = await supabase
        .from('users')
        .select('id, nom, prenom, equipe_id, role, equipes(nom, drapeau_emoji)')
        .in('role', ['manager', 'admin'])
        .order('nom');

    managers.forEach(m => {
        const opt = document.createElement('option');
        opt.value = m.id;
        opt.textContent = `${m.prenom} ${m.nom}`;
        opt.dataset.eid = m.equipe_id;
        opt.dataset.enom = m.equipes?.nom;
        opt.dataset.edrapeau = m.equipes?.drapeau_emoji;
        select.appendChild(opt);
    });

    select.onchange = function() {
        const opt = this.options[this.selectedIndex];
        if (opt.value) {
            selectionUtilisateur.managerId = opt.value;
            selectionUtilisateur.equipeId = opt.dataset.eid;
            document.getElementById('nom-equipe-affectee').textContent = opt.dataset.enom;
            document.getElementById('drapeau-equipe-affectee').textContent = opt.dataset.edrapeau;
            document.getElementById('info-equipe').style.display = 'flex';
        }
    };
}

async function terminerOnboarding() {
    if (!selectionUtilisateur.cellule) {
        afficherErreur('erreur-cellule', '⚠️ Choisissez une cellule');
        return;
    }
    
    const { data: { user } } = await supabase.auth.getUser();
    const btn = document.getElementById('btn-terminer');
    btn.textContent = '⏳ ...';

    const { error } = await supabase.from('users').update({
        avatar_url: selectionUtilisateur.avatarUrl,
        manager_id: selectionUtilisateur.managerId,
        equipe_id: selectionUtilisateur.equipeId,
        cellule: selectionUtilisateur.cellule,
        onboarding_complete: true
    }).eq('id', user.id);

    if (!error) window.location.href = 'dashboard.html';
    else alert(error.message);
}