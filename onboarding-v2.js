// =============================================================
// ONBOARDING V2 - VERSION FINALE PROPRE
// =============================================================

console.log('✅ onboarding-v2.js chargé');

// Attendre que tout soit chargé
document.addEventListener('DOMContentLoaded', async function() {
    
    // Créer l'instance Supabase ICI, dans le DOMContentLoaded
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

    // Vérifier connexion
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
        window.location.href = 'index.html';
        return;
    }

    const { data: userData } = await supabase
        .from('users')
        .select('onboarding_complete')
        .eq('id', user.id)
        .maybeSingle();

    if (userData?.onboarding_complete) {
        window.location.href = 'dashboard.html';
        return;
    }

    // Charger avatars
    chargerAvatars();
    await chargerManagers();

    // Fonctions locales
    function chargerAvatars() {
        const grid = document.getElementById('avatars-grid');
        if (!grid) return;
        
        grid.innerHTML = '';

        AVATARS_DISPONIBLES.forEach(filename => {
            const div = document.createElement('div');
            div.className = 'avatar-item';
            div.onclick = function() {
                document.querySelectorAll('.avatar-item').forEach(d => d.classList.remove('selected'));
                div.classList.add('selected');
                selectionUtilisateur.avatarUrl = 'assets/' + filename;
                document.getElementById('erreur-avatar').classList.remove('visible');
            };
            
            const img = document.createElement('img');
            img.src = 'assets/' + filename;
            img.alt = 'Avatar';
            
            div.appendChild(img);
            grid.appendChild(div);
        });
        
        console.log('✅ Avatars chargés');
    }

    async function chargerManagers() {
        const select = document.getElementById('select-manager');
        if (!select) return;

        try {
            console.log('🔄 Chargement des managers...');
            
            // Récupérer l'utilisateur connecté
            const { data: { user: currentUser } } = await supabase.auth.getUser();
            const { data: currentUserData } = await supabase
                .from('users')
                .select('role')
                .eq('id', currentUser.id)
                .single();
            
            // Si c'est un admin, inclure aussi les admins dans la liste
            let query = supabase
                .from('users')
                .select('id, nom, prenom, equipe_id, equipes(nom, drapeau_emoji)');
            
            if (currentUserData?.role === 'admin') {
                // Admin : voir les managers ET les autres admins
                query = query.in('role', ['manager', 'admin']);
            } else {
                // Utilisateur normal : voir seulement les managers
                query = query.eq('role', 'manager');
            }
            
            const { data: managers, error } = await query.order('nom');

            if (error) throw error;

            console.log('📋 Managers reçus de Supabase:', managers);

            select.innerHTML = '<option value="">-- Choisissez votre manager --</option>';

            managers.forEach(m => {
                const opt = document.createElement('option');
                opt.value = m.id;
                opt.textContent = `${m.prenom} ${m.nom} (Équipe ${m.equipes.nom} ${m.equipes.drapeau_emoji})`;
                opt.dataset.equipeId = m.equipe_id;
                opt.dataset.equipeNom = m.equipes.nom;
                opt.dataset.equipeDrapeau = m.equipes.drapeau_emoji;
                select.appendChild(opt);
            });

            select.onchange = function() {
                const opt = this.options[this.selectedIndex];
                if (opt.value) {
                    selectionUtilisateur.managerId = opt.value;
                    selectionUtilisateur.equipeId = opt.dataset.equipeId;
                    
                    document.getElementById('nom-equipe-affectee').textContent = opt.dataset.equipeNom;
                    document.getElementById('drapeau-equipe-affectee').textContent = opt.dataset.equipeDrapeau;
                    document.getElementById('info-equipe').style.display = 'flex';
                    document.getElementById('erreur-manager').classList.remove('visible');
                }
            };
            
            console.log('✅ Managers chargés');
        } catch (error) {
            console.error('❌ Erreur managers:', error.message);
            console.error('Détail erreur:', error);
        }
    }

    // Fonctions globales accessibles depuis le HTML
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

    console.log('✅ Onboarding initialisé');
});
