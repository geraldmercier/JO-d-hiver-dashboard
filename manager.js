// =============================================================
// FICHIER : manager.js - VERSION PRODUCTION
// Connexion Supabase RÉELLE
// =============================================================

console.log('👔 Dashboard Manager PRODUCTION — Chargement...');

let managerActuel = null;
let equipeActuelle = null;

// -------------------------------------------------------------
// INITIALISATION
// -------------------------------------------------------------
document.addEventListener('DOMContentLoaded', async function() {
    
    // 1. Vérifier que l'utilisateur est connecté
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) {
        console.error('❌ Utilisateur non connecté');
        window.location.href = 'index.html';
        return;
    }

    console.log('✅ Utilisateur connecté:', user.email);

    // 2. Charger les données du manager
    await chargerDonneesManager(user.id);

    // 3. Vérifier que c'est bien un manager ou admin
    if (!managerActuel || (managerActuel.role !== 'manager' && managerActuel.role !== 'admin')) {
        alert('❌ Accès refusé. Cette page est réservée aux managers.');
        window.location.href = 'dashboard.html';
        return;
    }

    // 4. Initialiser les sections
    afficherInformationsHeader();
    afficherPerformanceEquipe();
    await chargerContratsAttente();
    await chargerAgentsEquipe();

    // 5. Boutons
    document.getElementById('btn-vue-plateau').addEventListener('click', function() {
        window.location.href = 'plateau.html';
    });

    if (managerActuel.role === 'admin') {
        initialiserMenuEquipes();
    }

    document.getElementById('btn-deconnexion').addEventListener('click', deconnexion);

    console.log('✅ Dashboard Manager initialisé');
});


// -------------------------------------------------------------
// CHARGER LES DONNÉES DU MANAGER
// -------------------------------------------------------------
async function chargerDonneesManager(userId) {
    try {
        const { data, error } = await supabase
            .from('users')
            .select(`
                *,
                equipes (
                    id,
                    nom,
                    drapeau
                )
            `)
            .eq('id', userId)
            .single();

        if (error) throw error;

        managerActuel = data;
        equipeActuelle = data.equipes;
        
        console.log('✅ Manager chargé:', managerActuel);
        console.log('✅ Équipe:', equipeActuelle);

    } catch (error) {
        console.error('❌ Erreur chargement manager:', error);
        alert('Erreur lors du chargement de vos données');
    }
}


// -------------------------------------------------------------
// AFFICHER LES INFORMATIONS (HEADER)
// -------------------------------------------------------------
function afficherInformationsHeader() {
    if (!managerActuel) return;

    document.getElementById('nom-manager').textContent = 
        managerActuel.prenom + ' ' + managerActuel.nom;
    
    const roleText = managerActuel.role === 'admin' ? 'Administrateur' : 'Manager';
    document.getElementById('equipe-manager').textContent = 
        roleText + ' — Équipe ' + equipeActuelle.nom + ' ' + equipeActuelle.drapeau;
}


// -------------------------------------------------------------
// AFFICHER PERFORMANCE ÉQUIPE
// -------------------------------------------------------------
function afficherPerformanceEquipe() {
    if (!equipeActuelle) return;

    document.getElementById('nom-equipe').textContent = 
        'Équipe ' + equipeActuelle.nom + ' ' + equipeActuelle.drapeau;
    
    // TODO: Calculer les vrais scores
    document.getElementById('score-equipe-total').textContent = '1,247 pts';
    document.getElementById('position-equipe').textContent = '2ème/5';
    document.getElementById('contrats-valides').textContent = '127';
}


// -------------------------------------------------------------
// CHARGER LES CONTRATS EN ATTENTE
// -------------------------------------------------------------
async function chargerContratsAttente() {
    try {
        const { data: contrats, error } = await supabase
            .from('contrats')
            .select(`
                *,
                users (
                    nom,
                    prenom,
                    cellule
                )
            `)
            .eq('statut', 'en_attente')
            .in('agent_id', 
                supabase
                    .from('users')
                    .select('id')
                    .eq('equipe_id', equipeActuelle.id)
            )
            .order('created_at', { ascending: false });

        if (error) throw error;

        const liste = document.getElementById('contrats-attente-liste');
        
        if (!contrats || contrats.length === 0) {
            liste.innerHTML = '<div class="aucun-contrat">✅ Aucun contrat en attente</div>';
            document.getElementById('badge-attente').style.display = 'none';
            return;
        }

        // Afficher le badge avec le nombre
        document.getElementById('badge-attente').textContent = contrats.length;
        document.getElementById('badge-attente').style.display = 'inline-block';

        liste.innerHTML = '';
        contrats.forEach(contrat => {
            const div = document.createElement('div');
            div.className = 'contrat-attente-item';
            
            const date = new Date(contrat.created_at);
            const dateText = date.toLocaleDateString('fr-FR') + ' à ' + 
                           date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

            const icone = {
                'Telco': '📞',
                'Mobile': '📱',
                'MRH': '🏠',
                'Premium': '⭐',
                'Compensation Carbone': '🌱'
            }[contrat.type_contrat] || '📄';

            div.innerHTML = `
                <div class="contrat-attente-info">
                    <div class="contrat-attente-agent">
                        <strong>${contrat.users.prenom} ${contrat.users.nom}</strong>
                        <span class="cellule-badge">${contrat.users.cellule}</span>
                    </div>
                    <div class="contrat-attente-details">
                        ${icone} ${contrat.type_contrat} • ${dateText}
                        ${contrat.api_app ? '<span class="badge-apiapp">📱 ApiApp</span>' : ''}
                    </div>
                    <a href="${contrat.lien_piste}" class="contrat-lien" target="_blank">🔗 Voir la piste</a>
                </div>
                <div class="contrat-attente-actions">
                    <button class="btn-valider" onclick="validerContrat('${contrat.id}')">✅ Valider</button>
                    <button class="btn-rejeter" onclick="rejeterContrat('${contrat.id}')">❌ Rejeter</button>
                </div>
            `;
            liste.appendChild(div);
        });

        console.log('✅ Contrats en attente chargés:', contrats.length);

    } catch (error) {
        console.error('❌ Erreur chargement contrats:', error);
    }
}


// -------------------------------------------------------------
// VALIDER UN CONTRAT
// -------------------------------------------------------------
async function validerContrat(contratId) {
    try {
        const { error } = await supabase
            .from('contrats')
            .update({
                statut: 'valide',
                valide_par: managerActuel.id,
                valide_le: new Date().toISOString()
            })
            .eq('id', contratId);

        if (error) throw error;

        console.log('✅ Contrat validé');
        
        // Afficher un message temporaire
        const msg = document.createElement('div');
        msg.className = 'notification-succes';
        msg.textContent = '✅ Contrat validé !';
        document.body.appendChild(msg);
        
        setTimeout(() => msg.remove(), 2000);

        // Recharger la liste
        await chargerContratsAttente();
        await chargerAgentsEquipe();

    } catch (error) {
        console.error('❌ Erreur validation:', error);
        alert('❌ Erreur lors de la validation');
    }
}


// -------------------------------------------------------------
// REJETER UN CONTRAT
// -------------------------------------------------------------
async function rejeterContrat(contratId) {
    const raison = prompt('⚠️ Raison du rejet (optionnel) :');
    
    if (raison === null) return; // Annulé

    try {
        const { error } = await supabase
            .from('contrats')
            .update({
                statut: 'rejete',
                valide_par: managerActuel.id,
                valide_le: new Date().toISOString(),
                commentaire: raison || 'Rejeté par le manager'
            })
            .eq('id', contratId);

        if (error) throw error;

        console.log('✅ Contrat rejeté');
        
        const msg = document.createElement('div');
        msg.className = 'notification-erreur';
        msg.textContent = '❌ Contrat rejeté';
        document.body.appendChild(msg);
        
        setTimeout(() => msg.remove(), 2000);

        // Recharger la liste
        await chargerContratsAttente();
        await chargerAgentsEquipe();

    } catch (error) {
        console.error('❌ Erreur rejet:', error);
        alert('❌ Erreur lors du rejet');
    }
}


// -------------------------------------------------------------
// CHARGER LES AGENTS DE L'ÉQUIPE
// -------------------------------------------------------------
async function chargerAgentsEquipe() {
    try {
        // Charger les agents de l'équipe
        const { data: agents, error: agentsError } = await supabase
            .from('users')
            .select('*')
            .eq('equipe_id', equipeActuelle.id)
            .eq('role', 'agent')
            .order('nom');

        if (agentsError) throw agentsError;

        // Charger les contrats validés de chaque agent
        const { data: contrats, error: contratsError } = await supabase
            .from('contrats')
            .select('agent_id, id')
            .eq('statut', 'valide')
            .in('agent_id', agents.map(a => a.id));

        if (contratsError) throw contratsError;

        // Compter les contrats par agent
        const contratsParAgent = {};
        contrats.forEach(c => {
            contratsParAgent[c.agent_id] = (contratsParAgent[c.agent_id] || 0) + 1;
        });

        // Afficher le tableau
        const tbody = document.getElementById('tableau-agents-body');
        tbody.innerHTML = '';

        agents.forEach((agent, index) => {
            const nbContrats = contratsParAgent[agent.id] || 0;
            const score = nbContrats * 10; // Simplifié : 10 pts par contrat

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${index + 1}</td>
                <td>${agent.prenom} ${agent.nom}</td>
                <td><span class="cellule-badge">${agent.cellule}</span></td>
                <td class="score-cell">${score} pts</td>
                <td>${nbContrats}</td>
                <td>—</td>
                <td>
                    <button class="btn-actions" onclick="voirDetailsAgent('${agent.id}')">👁️</button>
                </td>
            `;
            tbody.appendChild(tr);
        });

        console.log('✅ Agents chargés:', agents.length);

    } catch (error) {
        console.error('❌ Erreur chargement agents:', error);
    }
}


// -------------------------------------------------------------
// VOIR DÉTAILS AGENT
// -------------------------------------------------------------
function voirDetailsAgent(agentId) {
    // TODO: Ouvrir un modal avec les détails
    alert('Détails de l\'agent (à implémenter)');
}


// -------------------------------------------------------------
// MENU ÉQUIPES (ADMIN)
// -------------------------------------------------------------
function initialiserMenuEquipes() {
    document.getElementById('dropdown-equipes-admin').style.display = 'block';

    // Charger les équipes
    supabase
        .from('equipes')
        .select('*')
        .order('id')
        .then(({ data: equipes }) => {
            const menu = document.getElementById('menu-equipes-admin');
            menu.innerHTML = '';

            equipes.forEach(equipe => {
                const div = document.createElement('div');
                div.className = 'dropdown-item';
                div.textContent = `${equipe.drapeau} Équipe ${equipe.nom}`;
                div.onclick = () => changerEquipe(equipe.id);
                menu.appendChild(div);
            });
        });
}

function changerEquipe(equipeId) {
    window.location.href = `manager.html?equipe=${equipeId}`;
}


// -------------------------------------------------------------
// DÉCONNEXION
// -------------------------------------------------------------
async function deconnexion() {
    if (confirm('Voulez-vous vraiment vous déconnecter ?')) {
        await supabase.auth.signOut();
        window.location.href = 'index.html';
    }
}

console.log('✅ manager.js PRODUCTION chargé');
