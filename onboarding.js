// =============================================================
// FICHIER : onboarding.js - VERSION PRODUCTION PROPRE
// =============================================================

console.log('✅ onboarding.js chargé');

// Créer l'instance Supabase
const supabase = window.supabase.createClient(SUPABASE_CONFIG.URL, SUPABASE_CONFIG.KEY);

const selectionUtilisateur = {
    avatarUrl: null,
    managerId: null,
    equipeId: null,
    cellule: null
};

const AVATARS_DISPONIBLES = [
    'chicken.png', 'woman.png', 'lion.png', 'man (1).png', 'man (2).png',
    'man (3).png', 'man (4).png', 'man (5).png', 'man.png', 'panda.png',
    'parrot.png', 'sea-lion.png', 'tiger.png', 'woman (1).png', 'woman (2).png'
];

// Fonction pour changer d'étape - DOIT ÊTRE GLOBALE
window.allerEtape = function(numeroEtape) {
    document.querySelectorAll('.etape').forEach(e => e.classList.remove('active'));
    document.getElementById('etape-' + numeroEtape).classList.add('active');
    
    document.querySelectorAll('.indicateur-etape').forEach((ind, i) => {
        ind.classList.toggle('completed', i < numeroEtape);
        ind.classList.toggle('active', i + 1 === numeroEtape);
    });
};

window.validerAvatar = function() {
    if (!selectionUtilisateur.avatarUrl) {
        document.getElementById('erreur-avatar').textContent = '⚠️ Choisissez un avatar';
        document.getElementById('erreur-avatar').classList.add('visible');
        return;
    }
    window.allerEtape(3);
};

window.validerManager = function() {
    if (!selectionUtilisateur.managerId) {
        document.getElementById('erreur-manager').textContent = '⚠️ Choisissez un manager';
        document.getElementById('erreur-manager').classList.add('visible');
        return;
    }
    window.allerEtape(4);
};

window.selectionnerAvatar = function(filename) {
    document.querySelectorAll('.avatar-option').forEach(d => d.classList.remove('selected'));
    event.currentTarget.classList.add('selected');
    selectionUtilisateur.avatarUrl = 'assets/' + filename;
    document.getElementById('erreur-avatar').classList.remove('visible');
};

window.selectionnerCellule = function(celluleNom) {
    document.querySelectorAll('.cellule-carte').forEach(d => d.classList.remove('selected'));
    event.currentTarget.classList.add('selected');
    selectionUtilisateur.cellule = celluleNom;
    document.getElementById('erreur-cellule').classList.remove('visible');
};

window.terminerOnboarding = async function() {
    if (!selectionUtilisateur.cellule) {
        document.getElementById('erreur-cellule').textContent = '⚠️ Choisissez une cellule';
        document.getElementById('erreur-cellule').classList.add('visible');
        return;
    }

    const btn = document.getElementById('btn-terminer');
    btn.disabled = true;
    btn.textContent = '⏳ Enregistrement...';

    try {
        const { data: { user } } = await supabase.auth.getUser();
        
        const { error } = await supabase
            .from('users')
            .update({
                avatar_url: selectionUtilisateur.avatarUrl,
                manager_id: selectionUtilisateur.managerId,
                equipe_id: selectionUtilisateur.equipeId,
                cellule: selectionUtilisateur.cellule,
                onboarding_complete: true
            })
            .eq('id', user.id);

        if (error) throw error;

        alert('✅ Bienvenue !');
        window.location.href = 'dashboard.html';
    } catch (error) {
        alert('❌ Erreur : ' + error.message);
        btn.disabled = false;
        btn.textContent = '✅ Terminer';
    }
};

// Initialisation
document.addEventListener('DOMContentLoaded', async function() {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
        window.location.href = 'index.html';
        return;
    }

    const { data: userData } = await supabase
        .from('users')
        .select('onboarding_complete')
        .eq('id', user.id)
        .single();

    if (userData?.onboarding_complete) {
        window.location.href = 'dashboard.html';
        return;
    }

    chargerAvatars();
    await chargerManagersReels();
});

function chargerAvatars() {
    const grid = document.getElementById('avatars-grid');
    grid.innerHTML = '';

    AVATARS_DISPONIBLES.forEach(filename => {
        const div = document.createElement('div');
        div.className = 'avatar-option';
        div.onclick = () => window.selectionnerAvatar(filename);
        
        const img = document.createElement('img');
        img.src = 'assets/' + filename;
        
        div.appendChild(img);
        grid.appendChild(div);
    });
}

async function chargerManagersReels() {
    const select = document.getElementById('select-manager');

    try {
        const { data: managers, error } = await supabase
            .from('users')
            .select('id, nom, prenom, equipe_id, equipes(nom, drapeau)')
            .eq('role', 'manager')
            .order('nom');

        if (error) throw error;

        select.innerHTML = '<option value="">-- Choisissez votre manager --</option>';

        managers.forEach(m => {
            const opt = document.createElement('option');
            opt.value = m.id;
            opt.textContent = `${m.prenom} ${m.nom} (Équipe ${m.equipes.nom} ${m.equipes.drapeau})`;
            opt.setAttribute('data-equipe-id', m.equipe_id);
            opt.setAttribute('data-equipe-nom', m.equipes.nom);
            opt.setAttribute('data-equipe-drapeau', m.equipes.drapeau);
            select.appendChild(opt);
        });

        select.addEventListener('change', function() {
            const opt = this.options[this.selectedIndex];
            if (opt.value) {
                selectionUtilisateur.managerId = opt.value;
                selectionUtilisateur.equipeId = opt.getAttribute('data-equipe-id');
                
                document.getElementById('nom-equipe-affectee').textContent = opt.getAttribute('data-equipe-nom');
                document.getElementById('drapeau-equipe-affectee').textContent = opt.getAttribute('data-equipe-drapeau');
                document.getElementById('info-equipe').style.display = 'flex';
                document.getElementById('erreur-manager').classList.remove('visible');
            }
        });
    } catch (error) {
        alert('❌ Erreur chargement managers');
    }
}

console.log('✅ onboarding.js initialisé');
