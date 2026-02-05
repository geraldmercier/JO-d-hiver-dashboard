// =============================================================
// MANAGER - VERSION COMPLÈTE
// Validation + Dashboard équipe + Statistiques
// =============================================================

console.log('👔 Manager COMPLET - Chargement...');

const { createClient } = window.supabase;
const sb = createClient(SUPABASE_CONFIG.URL, SUPABASE_CONFIG.KEY);

let managerActuel = null;
let equipeActuelle = null;
let tousLesAgents = [];
let tousLesContrats = [];
let toutesLesEquipes = [];

// =============================================================
// 🏁 INITIALISATION
// =============================================================
document.addEventListener('DOMContentLoaded', async function() {
    const { data: { user } } = await sb.auth.getUser();
    if (!user) { window.location.href = 'connexion-finale.html'; return; }

    await chargerDonneesManager(user.id);
    
    if (!managerActuel || (managerActuel.role !== 'manager' && managerActuel.role !== 'admin')) {
        alert('❌ Accès refusé. Cette page est réservée aux managers.');
        window.location.href = 'dashboard.html';
        return;
    }

    await Promise.all([
        chargerTousLesAgents(),
        chargerTousLesContrats(),
        chargerToutesLesEquipes()
    ]);

    // Affichage complet
    afficherInformationsHeader();
    await calculerEtAfficherPerformanceEquipe();
    await chargerContratsAttente();
    await chargerChallengesAttente();
    await chargerAgentsEquipe();

    // Boutons
    const btnPlateau = document.getElementById('btn-vue-plateau');
    if (btnPlateau) {
        btnPlateau.addEventListener('click', () => window.location.href = 'plateau.html');
    }

    const btnDeconnexion = document.getElementById('btn-deconnexion');
    if (btnDeconnexion) {
        btnDeconnexion.addEventListener('click', async () => {
            if (confirm('Voulez-vous vraiment vous déconnecter ?')) {
                await sb.auth.signOut();
                window.location.href = 'connexion-finale.html';
            }
        });
    }

    // Menu équipes (admin)
    if (managerActuel.role === 'admin') {
        initialiserMenuEquipes();
    }

    console.log('✅ Dashboard Manager initialisé');
});

// =============================================================
// 📡 CHARGEMENT DES DONNÉES
// =============================================================

async function chargerDonneesManager(uid) {
    const { data, error } = await sb.from('users')
        .select(`*, equipes (id, nom, drapeau_emoji)`)
        .eq('id', uid)
        .single();

    if (error || !data) {
        console.error('❌ Erreur chargement manager');
        await sb.auth.signOut();
        window.location.href = 'connexion-finale.html';
        return;
    }

    managerActuel = data;
    equipeActuelle = data.equipes;
}

async function chargerTousLesAgents() {
    const { data } = await sb.from('users')
        .select('*')
        .eq('role', 'agent');
    tousLesAgents = data || [];
}

async function chargerTousLesContrats() {
    const { data } = await sb.from('contrats')
        .select('*')
        .in('statut', ['valide', 'en_attente', 'rejete']);
    tousLesContrats = data || [];
}

async function chargerToutesLesEquipes() {
    const { data } = await sb.from('equipes').select('*');
    toutesLesEquipes = data || [];
}

// =============================================================
// 🎨 AFFICHAGE HEADER
// =============================================================

function afficherInformationsHeader() {
    const elNom = document.getElementById('nom-manager');
    if (elNom) {
        elNom.textContent = `${managerActuel.prenom} ${managerActuel.nom}`;
    }

    const elEquipe = document.getElementById('equipe-manager');
    if (elEquipe && equipeActuelle) {
        const roleText = managerActuel.role === 'admin' ? 'Administrateur' : 'Manager';
        const emoji = equipeActuelle.drapeau_emoji || '';
        elEquipe.textContent = `${roleText} — Équipe ${equipeActuelle.nom} ${emoji}`;
    }

    const elAvatar = document.getElementById('avatar-manager');
    if (elAvatar && managerActuel.avatar_url) {
        elAvatar.src = 'assets/' + managerActuel.avatar_url;
    }
}

// =============================================================
// 📊 PERFORMANCE ÉQUIPE (KPIs)
// =============================================================

async function calculerEtAfficherPerformanceEquipe() {
    if (!equipeActuelle) return;

    // Agents de l'équipe
    const agentsEquipe = tousLesAgents.filter(a => a.equipe_id === equipeActuelle.id);
    
    // Contrats validés de l'équipe
    const contratsEquipe = tousLesContrats.filter(c => 
        c.statut === 'valide' && 
        agentsEquipe.find(a => a.id === c.agent_id)
    );

    const scoreTotal = contratsEquipe.length * 10;
    const nbContratsValides = contratsEquipe.length;
    const moyenneParAgent = agentsEquipe.length > 0 ? Math.round(scoreTotal / agentsEquipe.length) : 0;

    // Affichage
    const elNomEquipe = document.getElementById('nom-equipe');
    if (elNomEquipe) {
        elNomEquipe.textContent = `Équipe ${equipeActuelle.nom} ${equipeActuelle.drapeau_emoji || ''}`;
    }

    const elScoreTotal = document.getElementById('score-equipe-total');
    if (elScoreTotal) {
        elScoreTotal.textContent = `${scoreTotal.toLocaleString()} pts`;
    }

    const elContratsValides = document.getElementById('contrats-valides');
    if (elContratsValides) {
        elContratsValides.textContent = nbContratsValides;
    }

    const elMoyenne = document.getElementById('moyenne-agent');
    if (elMoyenne) {
        elMoyenne.textContent = `${moyenneParAgent} pts`;
    }

    // Calculer position équipe
    const scoresEquipes = toutesLesEquipes.map(eq => {
        const agentsEq = tousLesAgents.filter(a => a.equipe_id === eq.id);
        const contratsEq = tousLesContrats.filter(c => 
            c.statut === 'valide' && 
            agentsEq.find(a => a.id === c.agent_id)
        );
        return { equipeId: eq.id, score: contratsEq.length * 10 };
    });

    scoresEquipes.sort((a, b) => b.score - a.score);
    const position = scoresEquipes.findIndex(s => s.equipeId === equipeActuelle.id) + 1;
    
    const elPosition = document.getElementById('position-equipe');
    if (elPosition) {
        elPosition.textContent = `${position}ème/${toutesLesEquipes.length}`;
    }

    // Nombre d'agents actifs
    const elNbAgents = document.getElementById('nb-agents-equipe');
    if (elNbAgents) {
        elNbAgents.textContent = agentsEquipe.length;
    }
}

// =============================================================
// 📝 CONTRATS EN ATTENTE (VERSION COMPLÈTE)
// =============================================================

async function chargerContratsAttente() {
    try {
        const agentsEquipe = tousLesAgents.filter(a => a.equipe_id === equipeActuelle.id);
        const contratsAttente = tousLesContrats.filter(c => 
            c.statut === 'en_attente' && 
            agentsEquipe.find(a => a.id === c.agent_id)
        );

        const liste = document.getElementById('contrats-attente-liste');
        const badge = document.getElementById('badge-attente');
        
        if (badge) {
            badge.textContent = contratsAttente.length;
            badge.style.display = contratsAttente.length > 0 ? 'inline-block' : 'none';
        }

        if (!liste) return;

        if (contratsAttente.length === 0) {
            liste.innerHTML = '<div class="aucun-contrat">✅ Aucun contrat en attente</div>';
            return;
        }

        liste.innerHTML = '';
        
        contratsAttente.forEach(contrat => {
            const agent = agentsEquipe.find(a => a.id === contrat.agent_id);
            if (!agent) return;

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
                        <strong>${agent.prenom} ${agent.nom}</strong>
                        <span class="cellule-badge">${agent.cellule}</span>
                    </div>
                    <div class="contrat-attente-details">
                        ${icone} ${contrat.type_contrat} • ${dateText}
                        ${contrat.api_app ? '<span class="badge-apiapp">📱 ApiApp</span>' : ''}
                    </div>
                    <a href="${contrat.lien_piste}" class="contrat-lien" target="_blank" title="Voir la piste">🔗 Voir la piste</a>
                </div>
                <div class="contrat-attente-actions">
                    <button class="btn-valider" onclick="validerContrat('${contrat.id}')">✅ Valider</button>
                    <button class="btn-rejeter" onclick="rejeterContrat('${contrat.id}')">❌ Rejeter</button>
                </div>
            `;
            liste.appendChild(div);
        });

    } catch (error) {
        console.error('❌ Erreur chargement contrats:', error);
    }
}

// =============================================================
// ✅ VALIDATION CONTRAT (AVEC NOTIFICATION)
// =============================================================

window.validerContrat = async function(contratId) {
    try {
        const { error } = await sb.from('contrats').update({
            statut: 'valide',
            valide_par: managerActuel.id,
            valide_le: new Date().toISOString()
        }).eq('id', contratId);

        if (error) throw error;

        // Notification succès
        afficherNotification('✅ Contrat validé !', 'success');

        // Recharger
        await chargerTousLesContrats();
        await calculerEtAfficherPerformanceEquipe();
        await chargerContratsAttente();
        await chargerAgentsEquipe();

    } catch (error) {
        console.error('❌ Erreur validation:', error);
        afficherNotification('❌ Erreur lors de la validation', 'error');
    }
};

// =============================================================
// ❌ REJET CONTRAT (AVEC COMMENTAIRE)
// =============================================================

window.rejeterContrat = async function(contratId) {
    const raison = prompt('⚠️ Raison du rejet (optionnel) :\n\nCe message sera visible par l\'agent.');
    
    if (raison === null) return; // Annulé

    try {
        const { error } = await sb.from('contrats').update({
            statut: 'rejete',
            valide_par: managerActuel.id,
            valide_le: new Date().toISOString(),
            commentaire: raison || 'Rejeté par le manager'
        }).eq('id', contratId);

        if (error) throw error;

        afficherNotification('❌ Contrat rejeté', 'error');

        await chargerTousLesContrats();
        await calculerEtAfficherPerformanceEquipe();
        await chargerContratsAttente();
        await chargerAgentsEquipe();

    } catch (error) {
        console.error('❌ Erreur rejet:', error);
        afficherNotification('❌ Erreur lors du rejet', 'error');
    }
};

// =============================================================
// ⚡ CHALLENGES EN ATTENTE (VERSION COMPLÈTE)
// =============================================================

async function chargerChallengesAttente() {
    try {
        const { data: reussites } = await sb.from('challenge_reussites')
            .select(`
                *,
                challenges_flash (titre, points_attribues, description),
                users (id, prenom, nom, equipe_id, cellule)
            `)
            .eq('statut', 'en_attente');
        
        const mesReussites = (reussites || []).filter(r => 
            r.users && r.users.equipe_id === equipeActuelle?.id
        );

        const section = document.getElementById('section-challenges-validation');
        const liste = document.getElementById('challenges-attente-liste');
        const badge = document.getElementById('badge-challenges-attente');

        if (!section || !liste) return;

        if (badge) {
            badge.textContent = mesReussites.length;
            badge.style.display = mesReussites.length > 0 ? 'inline-block' : 'none';
        }

        if (mesReussites.length === 0) {
            section.style.display = 'none';
            return;
        }

        section.style.display = 'block';
        liste.innerHTML = '';

        mesReussites.forEach(reussite => {
            const div = document.createElement('div');
            div.className = 'challenge-attente-item';
            
            div.innerHTML = `
                <div class="challenge-attente-info">
                    <div class="challenge-attente-agent">
                        <strong>${reussite.users.prenom} ${reussite.users.nom}</strong>
                        <span class="cellule-badge">${reussite.users.cellule}</span>
                    </div>
                    <div class="challenge-attente-details">
                        ⚡ ${reussite.challenges_flash.titre}
                        <span class="badge-points">+${reussite.challenges_flash.points_attribues} pts</span>
                    </div>
                    <div class="challenge-attente-description">
                        ${reussite.challenges_flash.description}
                    </div>
                </div>
                <div class="challenge-attente-actions">
                    <button class="btn-valider" onclick="validerChallenge('${reussite.id}')">✅ Valider</button>
                    <button class="btn-rejeter" onclick="rejeterChallenge('${reussite.id}')">❌ Rejeter</button>
                </div>
            `;
            liste.appendChild(div);
        });

    } catch (error) {
        console.error('❌ Erreur chargement challenges:', error);
    }
}

window.validerChallenge = async function(reussiteId) {
    try {
        const { error } = await sb.from('challenge_reussites')
            .update({ statut: 'valide' })
            .eq('id', reussiteId);

        if (error) throw error;

        afficherNotification('✅ Challenge validé !', 'success');
        await chargerChallengesAttente();
        await calculerEtAfficherPerformanceEquipe();
        await chargerAgentsEquipe();

    } catch (error) {
        console.error('❌ Erreur validation challenge:', error);
        afficherNotification('❌ Erreur lors de la validation', 'error');
    }
};

window.rejeterChallenge = async function(reussiteId) {
    if (!confirm('⚠️ Rejeter ce challenge ?\n\nL\'agent ne recevra pas les points.')) {
        return;
    }

    try {
        const { error } = await sb.from('challenge_reussites')
            .update({ statut: 'rejete' })
            .eq('id', reussiteId);

        if (error) throw error;

        afficherNotification('❌ Challenge rejeté', 'error');
        await chargerChallengesAttente();

    } catch (error) {
        console.error('❌ Erreur rejet challenge:', error);
        afficherNotification('❌ Erreur lors du rejet', 'error');
    }
};

// =============================================================
// 👥 TABLEAU DES AGENTS (VERSION COMPLÈTE)
// =============================================================

async function chargerAgentsEquipe() {
    try {
        const agentsEquipe = tousLesAgents.filter(a => a.equipe_id === equipeActuelle.id);

        // Calculer scores de chaque agent
        const agentsAvecScores = agentsEquipe.map(agent => {
            const contratsAgent = tousLesContrats.filter(c => 
                c.agent_id === agent.id && c.statut === 'valide'
            );
            
            const contratsEnAttente = tousLesContrats.filter(c => 
                c.agent_id === agent.id && c.statut === 'en_attente'
            ).length;

            return {
                ...agent,
                nbContrats: contratsAgent.length,
                score: contratsAgent.length * 10,
                enAttente: contratsEnAttente
            };
        });

        agentsAvecScores.sort((a, b) => b.score - a.score);

        const tbody = document.getElementById('tableau-agents-body');
        if (!tbody) return;

        tbody.innerHTML = '';

        if (agentsAvecScores.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 20px; color: #999;">Aucun agent dans cette équipe</td></tr>';
            return;
        }

        agentsAvecScores.forEach((agent, index) => {
            const tr = document.createElement('tr');
            
            // Médaille pour le top 3
            let medaille = '';
            if (index === 0) medaille = '🥇';
            else if (index === 1) medaille = '🥈';
            else if (index === 2) medaille = '🥉';

            tr.innerHTML = `
                <td class="rang-cell">${medaille || (index + 1)}</td>
                <td>
                    <div class="agent-info-cell">
                        <strong>${agent.prenom} ${agent.nom}</strong>
                    </div>
                </td>
                <td><span class="cellule-badge">${agent.cellule}</span></td>
                <td class="score-cell"><strong>${agent.score} pts</strong></td>
                <td>${agent.nbContrats}</td>
                <td>
                    ${agent.enAttente > 0 ? `<span class="badge-attente-mini">${agent.enAttente}</span>` : '—'}
                </td>
                <td>
                    <button class="btn-details" onclick="voirDetailsAgent('${agent.id}')" title="Voir détails">👁️</button>
                </td>
            `;
            tbody.appendChild(tr);
        });

    } catch (error) {
        console.error('❌ Erreur chargement agents:', error);
    }
}

window.voirDetailsAgent = function(agentId) {
    const agent = tousLesAgents.find(a => a.id === agentId);
    if (!agent) return;

    const contratsAgent = tousLesContrats.filter(c => c.agent_id === agentId);
    const valides = contratsAgent.filter(c => c.statut === 'valide').length;
    const attente = contratsAgent.filter(c => c.statut === 'en_attente').length;
    const rejetes = contratsAgent.filter(c => c.statut === 'rejete').length;

    alert(`📊 Détails de ${agent.prenom} ${agent.nom}\n\n` +
          `Cellule: ${agent.cellule}\n` +
          `Score: ${valides * 10} pts\n\n` +
          `Contrats:\n` +
          `✅ Validés: ${valides}\n` +
          `⏳ En attente: ${attente}\n` +
          `❌ Rejetés: ${rejetes}\n\n` +
          `(Vue détaillée à implémenter)`);
};

// =============================================================
// 🔔 NOTIFICATIONS (TOAST)
// =============================================================

function afficherNotification(message, type = 'success') {
    const notif = document.createElement('div');
    notif.className = `notification notification-${type}`;
    notif.textContent = message;
    notif.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 16px 24px;
        background: ${type === 'success' ? '#4CAF50' : '#F44336'};
        color: white;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        z-index: 10000;
        font-weight: 600;
        animation: slideIn 0.3s ease;
    `;

    document.body.appendChild(notif);

    setTimeout(() => {
        notif.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notif.remove(), 300);
    }, 2000);
}

// =============================================================
// 👑 MENU ÉQUIPES (ADMIN)
// =============================================================

function initialiserMenuEquipes() {
    const dropdown = document.getElementById('dropdown-equipes-admin');
    if (!dropdown) return;

    dropdown.style.display = 'block';

    const menu = document.getElementById('menu-equipes-admin');
    if (!menu) return;

    menu.innerHTML = '';

    toutesLesEquipes.forEach(equipe => {
        const div = document.createElement('div');
        div.className = 'dropdown-item';
        div.textContent = `${equipe.drapeau_emoji || ''} Équipe ${equipe.nom}`;
        div.onclick = () => {
            // Recharger la page pour cette équipe
            window.location.href = `manager.html?equipe=${equipe.id}`;
        };
        menu.appendChild(div);
    });
}

console.log('✅ Manager COMPLET chargé');