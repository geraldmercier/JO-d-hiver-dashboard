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

    // Chargement des données principales
    await Promise.all([
        chargerTousLesAgents(),
        chargerTousLesContrats(),
        chargerToutesLesEquipes()
    ]); 

    // On charge le menu déroulant JUSTE APRÈS (Sécurité anti-bug)
    await chargerListeChallengesManuels();

    // Affichage complet
    afficherInformationsHeader();

    // Affichage complet
    afficherInformationsHeader();
    await calculerEtAfficherPerformanceEquipe();
    await chargerContratsAttente();
    await chargerChallengesAttente();
    await chargerAgentsEquipe();
    await chargerGraphiquesManager();
    await chargerChallengesActifsManager();if(typeof chargerClassementDetailleManager === 'function') await chargerClassementDetailleManager();

    console.log('✅ Manager initialisé');
});


    // Boutons
   const btnPlateau = document.getElementById('btn-vue-plateau');
if (btnPlateau) {
    // Si je suis Admin, je vois le bouton et je peux cliquer
    if (managerActuel.role === 'admin') {
        btnPlateau.style.display = 'inline-block'; // Ou 'block' selon votre design
        btnPlateau.addEventListener('click', () => window.location.href = 'plateau.html');
    } 
    // Sinon (Manager simple), je cache le bouton
    else {
        btnPlateau.style.display = 'none';
    }
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

    // 8. Temps Réel
    ecouterRealtimeManager();

    console.log('✅ Dashboard Manager initialisé');

// =============================================================
// 📡 TEMPS RÉEL (REALTIME)
// =============================================================

/**
 * Écoute les changements sur les tables clés pour le manager
 */
function ecouterRealtimeManager() {
    console.log('📡 Activation du temps réel pour le Manager...');
    
    sb.channel('flux-manager')
        .on(
            'postgres_changes', 
            { event: '*', schema: 'public', table: 'contrats' }, 
            async () => {
                console.log('🔔 Nouveau contrat détecté (Realtime)');
                await chargerTousLesContrats();
                await calculerEtAfficherPerformanceEquipe();
                await chargerContratsAttente();
                await chargerAgentsEquipe();
            }
        )
        .on(
            'postgres_changes', 
            { event: '*', schema: 'public', table: 'challenges_flash' }, 
            async () => {
                console.log('🔔 Mise à jour challenge détectée (Realtime)');
                await chargerChallengesActifsManager();
            }
        )
        .on(
            'postgres_changes', 
            { event: '*', schema: 'public', table: 'challenge_reussites' }, 
            async () => {
                console.log('🔔 Nouvelle réussite challenge détectée (Realtime)');
                await chargerChallengesAttente();
                await calculerEtAfficherPerformanceEquipe();
            }
        )
        .subscribe();
}

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
    // On demande TOUT (*) + le nom et le drapeau dans la table 'equipes'
    const { data } = await sb.from('users')
        .select('*, equipes (nom, drapeau_emoji)')
        .eq('role', 'agent');
    
    tousLesAgents = data || [];
    
    // Une fois chargé, on met à jour le menu déroulant immédiatement
    if (typeof remplirSelectAgentsManuels === 'function') {
        remplirSelectAgentsManuels();
    }
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
            
           // ... à l'intérieur de mesReussites.forEach ...

        // 👇 REMPLACEZ LE BLOC div.innerHTML PAR CECI 👇
        
        const isFlash = reussite.challenges_flash.type_challenge === 'flash';
        
        // Bouton différent selon si c'est un Flash ou un défi normal
        let btnAction = '';
        if (isFlash) {
            // Le bouton spécial qui appelle la nouvelle fonction
            btnAction = `<button class="btn-valider" style="background: gold; color: black; font-weight:bold; border: 1px solid #e6b800;" onclick="validerVainqueurFlash('${reussite.id}', '${reussite.challenges_flash.id}', '${reussite.users.prenom} ${reussite.users.nom}')">🏆 Valider & Gagner</button>`;
        } else {
            btnAction = `<button class="btn-valider" onclick="validerChallenge('${reussite.id}')">✅ Valider</button>`;
        }

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
                ${btnAction}
                <button class="btn-rejeter" onclick="rejeterChallenge('${reussite.id}')">❌ Rejeter</button>
            </div>
        `;
        liste.appendChild(div);
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

window.validerVainqueurFlash = async function(reussiteId, challengeId, nomGagnant) {
    if (!confirm(`🏆 Confirmer que ${nomGagnant} remporte ce challenge ?\n\nCela attribuera les points ET clôturera le challenge pour tout le monde.`)) {
        return;
    }

    try {
        // 1. Valider la réussite de l'agent (donner les points)
        const { error: errorReussite } = await sb.from('challenge_reussites')
            .update({ statut: 'valide' })
            .eq('id', reussiteId);

        if (errorReussite) throw errorReussite;

        // 2. Clôturer le challenge Flash (statut 'termine' + nom du gagnant)
        const { error: errorFlash } = await sb.from('challenges_flash')
            .update({ 
                statut: 'termine',
                gagnant_nom: nomGagnant,
                date_fin: new Date().toISOString() // On met à jour la date de fin réelle
            })
            .eq('id', challengeId);

        if (errorFlash) throw errorFlash;

        afficherNotification(`🏆 Challenge remporté par ${nomGagnant} !`, 'success');
        
        // Rafraîchir
        await chargerChallengesAttente();
        await calculerEtAfficherPerformanceEquipe();

    } catch (error) {
        console.error('❌ Erreur validation flash:', error);
        afficherNotification('Erreur système', 'error');
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
// =============================================================
// ⚡ GESTION CRÉATION CHALLENGE (AJOUT)
// =============================================================

window.ouvrirModalChallenge = function() {
    const modal = document.getElementById('modal-challenge');
    if (modal) {
        modal.style.display = 'flex';
        // Pré-remplir la date de début à "maintenant"
        const now = new Date();
        now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
        const dateInput = document.getElementById('challenge-debut');
        if (dateInput) dateInput.value = now.toISOString().slice(0, 16);
    }
};

window.fermerModalChallenge = function() {
    const modal = document.getElementById('modal-challenge');
    if (modal) modal.style.display = 'none';
};

// ==========================================
// VERSION FINALE : CRÉATION CHALLENGE CIBLÉ
// ==========================================
window.creerChallenge = async function(e) {
    e.preventDefault();
    const btn = document.getElementById('btn-submit-challenge');
    btn.textContent = 'Création...';
    btn.disabled = true;

    try {
        const { error } = await sb.from('challenges_flash').insert({
            titre: document.getElementById('challenge-titre').value,
            description: document.getElementById('challenge-description').value,
            type_challenge: document.getElementById('challenge-type').value,
            points_attribues: document.getElementById('challenge-points').value,
            date_debut: document.getElementById('challenge-debut').value,
            date_fin: document.getElementById('challenge-fin').value,
            
            // 👇 C'EST ICI QUE ÇA CHANGE
            cible: 'global', // TOUJOURS GLOBAL (Pour tout le monde)
            cellule_cible: document.getElementById('challenge-cible-cellule').value, // Filtrage par cellule
            
            statut: 'actif'
        });

        if (error) throw error;
        
        // Message adapté selon le ciblage
        const cibleTexte = document.getElementById('challenge-cible-cellule').value === 'toutes' ? 'tout le monde' : document.getElementById('challenge-cible-cellule').value;
        alert(`✅ Challenge lancé pour ${cibleTexte} !`);
        
        fermerModalChallenge();
        document.getElementById('form-challenge').reset();

    } catch (err) {
        alert('Erreur : ' + err.message);
    } finally {
        btn.textContent = '⚡ Créer le défi';
        btn.disabled = false;
    }
};

console.log('✅ Manager COMPLET chargé');
// =============================================================
// 📈 GESTION FIL ROUGE (SAISIE)
// =============================================================

window.ouvrirModalFilRouge = function() {
    const modal = document.getElementById('modal-fil-rouge');
    if (modal) {
        modal.style.display = 'flex';
        // Date par défaut : Hier
        const hier = new Date();
        hier.setDate(hier.getDate() - 1);
        document.getElementById('date-fil-rouge').value = hier.toISOString().split('T')[0];
    }
};

window.sauvegarderFilRouge = async function(e) {
    e.preventDefault();
    const btn = document.getElementById('btn-save-fil-rouge');
    btn.textContent = 'Enregistrement...';
    btn.disabled = true;

    const date = document.getElementById('date-fil-rouge').value;
    const cellules = ['Mover', 'Switcher', 'Coach', 'Pépinière'];
    const inserts = [];

    // On prépare les données pour chaque cellule
    cellules.forEach(cell => {
        const valJour = document.getElementById(`val-jour-${cell}`).value;
        const valCumul = document.getElementById(`val-cumul-${cell}`).value;

        // On n'enregistre que si au moins une valeur est remplie
        if (valJour || valCumul) {
            inserts.push({
                equipe_id: equipeActuelle.id,
                date_kpi: date,
                cellule: cell,
                valeur_jour: valJour || 0,
                valeur_cumul: valCumul || 0
            });
        }
    });

    try {
        if (inserts.length > 0) {
            const { error } = await sb.from('kpi_equipe_journalier').insert(inserts);
            if (error) throw error;
            afficherNotification('📈 Données Fil Rouge enregistrées !', 'success');
            document.getElementById('modal-fil-rouge').style.display = 'none';
            // Vider les champs
            document.querySelectorAll('#modal-fil-rouge input[type=number]').forEach(i => i.value = '');
        } else {
            alert("Veuillez remplir au moins une valeur.");
        }
    } catch (err) {
        console.error(err);
        afficherNotification('Erreur : ' + err.message, 'error');
    } finally {
        btn.textContent = 'Enregistrer';
        btn.disabled = false;
    }
};
// =============================================================
// 📊 AFFICHAGE GRAPHIQUES MANAGER
// =============================================================

async function chargerGraphiquesManager() {
    // Vérification de sécurité
    if (!equipeActuelle || !equipeActuelle.id) return;

    // 1. On récupère TOUTES les données de l'équipe
    const { data: kpis } = await sb.from('kpi_equipe_journalier')
        .select('*')
        .eq('equipe_id', equipeActuelle.id)
        .order('date_kpi', { ascending: true });

    if (!kpis) return;

    // 2. Liste des cellules à traiter
    const cellules = ['Mover', 'Switcher', 'Coach', 'Pépinière'];

    cellules.forEach(cell => {
        // Filtrer les données pour cette cellule spécifique
        const dataCell = kpis.filter(k => k.cellule === cell);
        
        // Préparer les axes
        const labels = dataCell.map(k => {
            const d = new Date(k.date_kpi);
            return `${d.getDate()}/${d.getMonth()+1}`;
        });
        const valJour = dataCell.map(k => k.valeur_jour);
        const valCumul = dataCell.map(k => k.valeur_cumul);

        // Unité (%) ou (Vol)
        const isPercent = ['Mover', 'Switcher'].includes(cell);
        const labelUnit = isPercent ? '%' : ' Cts';
        const color = isPercent ? '#9C27B0' : '#FF9800'; // Violet pour % / Orange pour Volume

        // Dessiner (ou mettre à jour) le graphique
        const ctx = document.getElementById(`chart-manager-${cell}`);
        if (ctx) {
            // Si un graph existe déjà, on le détruit pour éviter les bugs de surimpression
            const existingChart = Chart.getChart(ctx);
            if (existingChart) existingChart.destroy();

            new Chart(ctx, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [
                        {
                            label: 'Jour',
                            data: valJour,
                            borderColor: '#ccc',
                            backgroundColor: '#eee',
                            type: 'bar',
                            order: 2
                        },
                        {
                            label: 'Cumul/Global',
                            data: valCumul,
                            borderColor: color,
                            backgroundColor: color + '33', // Transparence
                            borderWidth: 2,
                            fill: true,
                            tension: 0.3,
                            type: 'line',
                            order: 1
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } }, // On cache la légende pour gagner de la place
                    scales: { 
                        y: { 
                            beginAtZero: true,
                            grid: { display: false } // Grille épurée
                        },
                        x: {
                            grid: { display: false }
                        }
                    }
                }
            });
        }
    });
}

// =============================================================
// ⚡ NOUVELLE FONCTIONNALITÉ : ATTRIBUTION MANUELLE
// =============================================================

// 1. Charger la liste des challenges dans le menu déroulant
async function chargerListeChallengesManuels() {
    const select = document.getElementById('select-challenge-manuel');
    if (!select) return;

    const { data: challenges } = await sb
        .from('challenges_flash')
        .select('*')
        .eq('statut', 'actif')
        .order('date_debut', { ascending: false });

    // On remet l'option par défaut
    select.innerHTML = '<option value="">-- Choisir une épreuve --</option>';
    
    // 👇 AJOUT : L'option BONUS magique qui manquait
    select.innerHTML += '<option value="bonus" style="font-weight:bold; color:#E91E63;">🎁 BONUS MANUEL (Hors Challenge)</option>';

    if (challenges) {
        challenges.forEach(c => {
            const dateStr = new Date(c.date_debut).toLocaleDateString('fr-FR', {day:'numeric', month:'short'});
            select.innerHTML += `<option value="${c.id}">[${dateStr}] ${c.titre}</option>`;
        });
    }
}

// 2. Remplir la liste des agents (on réutilise la variable globale déjà existante)
function remplirSelectAgentsManuels() {
    const select = document.getElementById('select-agent-manuel');
    if (!select || !tousLesAgents) return;

    select.innerHTML = '<option value="">-- Choisir un agent --</option>';
    
    // Tri alphabétique
    const agentsTries = [...tousLesAgents].sort((a, b) => a.nom.localeCompare(b.nom));

    agentsTries.forEach(agent => {
        // --- DÉTECTION INTELLIGENTE DE L'ÉQUIPE ---
        let nomEquipe = 'Sans équipe';
        
        // Cas 1 : Supabase renvoie "equipes" (objet)
        if (agent.equipes && agent.equipes.nom) {
            nomEquipe = `${agent.equipes.nom} ${agent.equipes.drapeau_emoji || ''}`;
        }
        // Cas 2 : Supabase renvoie "equipes" (tableau)
        else if (Array.isArray(agent.equipes) && agent.equipes[0]) {
            nomEquipe = `${agent.equipes[0].nom} ${agent.equipes[0].drapeau_emoji || ''}`;
        }
        
        select.innerHTML += `<option value="${agent.id}">${agent.nom} ${agent.prenom} (${nomEquipe})</option>`;
    });
}

// 3. L'action du bouton "Envoyer"
// 3. L'action du bouton "Envoyer" (VERSION CORRIGÉE agent_id)
// 3. L'action du bouton "Envoyer" (VERSION FLEXIBLE & BONUS)
window.attribuerPointsManuels = async function() {
    const challengeId = document.getElementById('select-challenge-manuel').value;
    const agentId = document.getElementById('select-agent-manuel').value;
    const pointsInput = document.getElementById('input-points-manuel').value;

    if (!challengeId || !agentId || !pointsInput) {
        alert("❌ Merci de tout remplir (Épreuve, Agent et Points).");
        return;
    }

    if (!confirm(`Confirmer l'ajout de ${pointsInput} points à cet agent ?`)) return;

    try {
        // Préparation des données
        // Si c'est "bonus", on envoie NULL comme ID de challenge, sinon l'ID réel
        const idPourLaBase = (challengeId === 'bonus') ? null : challengeId;

        const { error } = await sb.from('challenge_reussites').insert([
            {
                agent_id: agentId,
                challenge_flash_id: idPourLaBase, // null si bonus, uuid si challenge
                statut: 'valide',
                date_validation: new Date().toISOString(),
                points_manuel: parseInt(pointsInput),
                commentaire: (challengeId === 'bonus') ? 'Bonus Manager' : null // Petit commentaire pour s'y retrouver
            }
        ]);

        if (error) throw error;

        // Notification et rafraîchissement
        // On vérifie si la fonction de notification existe, sinon alert simple
        if (typeof afficherNotification === 'function') {
            afficherNotification(`✅ Succès ! ${pointsInput} points attribués.`, 'success');
        } else {
            alert(`✅ Succès ! ${pointsInput} points attribués.`);
        }
        
        // Rafraîchissement des tableaux
        if (typeof chargerAgentsEquipe === 'function') await chargerAgentsEquipe();
        if (typeof calculerEtAfficherPerformanceEquipe === 'function') await calculerEtAfficherPerformanceEquipe();
        if (typeof chargerClassementDetailleManager === 'function') await chargerClassementDetailleManager();

    } catch (err) {
        console.error(err);
        alert("Erreur lors de l'attribution : " + err.message);
    }
};
async function chargerChallengesActifsManager() {
    // 1. On cible la zone d'affichage
    const container = document.getElementById('liste-challenges-actifs'); 
    if (!container) return;

    // 2. On récupère TOUS les challenges (sauf les terminés/supprimés)
    // On trie par date pour avoir les prochains en premier
    const { data: challenges } = await sb.from('challenges_flash')
        .select('*')
        .neq('statut', 'supprime')
        .neq('statut', 'termine')
        .order('date_debut', { ascending: true });

    if (!challenges) return;

    container.innerHTML = ''; // On vide la boîte
    
    // 3. Préparation Date locale (pour bien comparer)
    const date = new Date();
    date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
    const now = date.toISOString();

    let futursAffiches = 0; // Compteur pour limiter le teasing

    challenges.forEach(ch => {
        // Est-ce qu'il est en cours ? (Date début passée ET Date fin pas encore passée)
        const estActif = ch.statut === 'actif' && ch.date_debut <= now && ch.date_fin >= now;
        // Est-ce qu'il est dans le futur ?
        const estFutur = ch.date_debut > now;

        // --- 🧹 LE FILTRE DE NETTOYAGE ---
        // 1. Si c'est un futur et qu'on en a déjà affiché un -> On zappe (on masque les suivants)
        if (estFutur && futursAffiches >= 1) return;
        
        // 2. Si c'est un futur, on compte +1
        if (estFutur) futursAffiches++;

        // 3. Si ce n'est ni actif ni futur (ex: un vieux buggé), on zappe
        if (!estActif && !estFutur) return;
        // ----------------------------------

        // 4. Création visuelle (HTML)
        const div = document.createElement('div');
        
        // Style différent si Actif (Blanc/Vert) ou Futur (Gris)
        div.style.background = estActif ? "white" : "#f0f2f5";
        div.style.padding = "15px";
        div.style.marginBottom = "10px";
        div.style.borderRadius = "8px";
        div.style.borderLeft = estActif ? "5px solid #4CAF50" : "5px solid #bbb"; // Vert vs Gris
        div.style.boxShadow = "0 2px 5px rgba(0,0,0,0.05)";
        div.style.display = "flex";
        div.style.justifyContent = "space-between";
        div.style.alignItems = "center";
        if(estFutur) div.style.opacity = "0.8";

        // Heure formatée (ex: 14:30)
        const dateDeb = new Date(ch.date_debut);
        const heure = dateDeb.toLocaleTimeString('fr-FR', {hour: '2-digit', minute:'2-digit'});

        div.innerHTML = `
            <div>
                <strong style="font-size:1.1em; color: ${estActif ? '#2e7d32' : '#666'}">
                    ${estActif ? '🔥 EN COURS' : '⏳ BIENTÔT (' + heure + ')'}
                </strong>
                <div style="font-weight:bold; margin:4px 0; font-size:1.1em;">${ch.titre}</div>
                <div style="font-size:0.9em; color:#666;">${ch.description}</div>
            </div>
            <div style="text-align:right;">
                <div style="font-weight:bold; color:#1976D2; font-size:1.4em;">${ch.points_attribues} pts</div>
            </div>
        `;

        container.appendChild(div);
    });

    // Message vide
    if (container.innerHTML === '') {
        container.innerHTML = '<div style="padding:20px; text-align:center; color:#999;">Aucun challenge à l\'affiche 🎬</div>';
    }
}
window.stopperChallenge = async function(id) {
    if (!confirm("⚠️ Voulez-vous vraiment ARRÊTER ce challenge immédiatement ?\n\nIl disparaîtra des écrans des agents.")) return;

    const { error } = await sb.from('challenges_flash')
        .update({ statut: 'termine' }) // 👈 REMPLACEZ 'supprime' PAR 'termine' ICI
        .eq('id', id);

    if (error) {
        alert("Erreur technique : " + error.message);
    } else {
        alert("Challenge arrêté avec succès.");
        chargerChallengesActifsManager(); 
        if(typeof chargerListeChallengesManuels === 'function') chargerListeChallengesManuels();
    }
};


// =============================================================
// 📡 TEMPS RÉEL GLOBAL (MANAGER) - VERSION ULTIME
// =============================================================
(function activerTempsReelManager() {
    console.log("📡 Manager : Mode Temps Réel activé !");

    const channel = sb.channel('manager-global-updates')
    
    // 1. Si un CHALLENGE change (création, stop, modif)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'challenges_flash' }, async (payload) => {
        console.log("⚡ Challenge modifié !", payload);
        if(typeof chargerChallengesActifsManager === 'function') await chargerChallengesActifsManager();
    })

    // 2. Si un CONTRAT est ajouté ou validé
    .on('postgres_changes', { event: '*', schema: 'public', table: 'contrats' }, async (payload) => {
        console.log("📝 Mouvement de contrats !", payload);
        if(typeof chargerTousLesAgents === 'function') await chargerTousLesAgents();
        if(typeof chargerGraphiquesManager === 'function') await chargerGraphiquesManager();
        // Si vous avez une liste de validations en attente
        if(typeof chargerContratsAttente === 'function') await chargerContratsAttente();
        if(typeof chargerClassementDetailleManager === 'function') await chargerClassementDetailleManager(); 
    })

    // 3. Si une RÉUSSITE de challenge arrive
    .on('postgres_changes', { event: '*', schema: 'public', table: 'challenge_reussites' }, async () => {
        console.log("🏆 Quelqu'un a réussi un challenge !");
        if(typeof chargerChallengesActifsManager === 'function') await chargerChallengesActifsManager();
    })

    .subscribe();
})();

// =============================================================
// 👥 CLASSEMENT DÉTAILLÉ (Double Rang : Équipe + Global)
// =============================================================
async function chargerClassementDetailleManager() {
    // 1. On cherche la zone d'affichage (Assurez-vous d'avoir une <div id="liste-agents-detail"> dans votre HTML)
    const container = document.getElementById('liste-agents-detail');
    if (!container) return; // Sécurité

    // 2. On récupère TOUS les agents de l'entreprise (pour le rang global)
    const { data: tousLesAgents } = await sb.from('users')
        .select('*, equipes(nom)')
        .eq('role', 'agent');

    // 3. On récupère les scores (via la vue ou calcul)
    // Pour simplifier, on suppose que 'tousLesAgents' a déjà les scores ou on les recalcule vite fait
    // Ici, on va simuler que le calcul des scores est fait (souvent stocké dans une variable globale 'agentsGlobal' si vous l'avez)
    // Si vous n'avez pas de variable globale, on peut refaire un appel rapide aux contrats :
    const { data: contrats } = await sb.from('contrats').select('*').in('statut', ['valide', 'en_attente']);
    
    // Calcul des scores pour tout le monde
    tousLesAgents.forEach(agent => {
        const sesContrats = contrats.filter(c => c.agent_id === agent.id);
        agent.scoreTotal = sesContrats.reduce((sum, c) => sum + (c.created_at.includes('2026-02-20') ? 20 : 10), 0);
        // Ajoutez ici la logique des points challenges si nécessaire
    });

    // 4. TRI GLOBAL (Du 1er au dernier de l'entreprise)
    tousLesAgents.sort((a, b) => b.scoreTotal - a.scoreTotal);

    // On attribue le rang global à chacun
    tousLesAgents.forEach((agent, index) => {
        agent.rangGlobal = index + 1;
    });

    // 5. FILTRE ÉQUIPE (On ne garde que MES agents)
    // (utilisateurCourant doit être défini au début du fichier manager.js)
    if (!equipeActuelle || !equipeActuelle.id) return;
    
    const mesAgents = tousLesAgents.filter(a => a.equipe_id === equipeActuelle.id);
    
    // On les trie (le 1er de l'équipe en haut)
    mesAgents.sort((a, b) => b.scoreTotal - a.scoreTotal);

    // 6. AFFICHAGE HTML
    let html = `
        <table style="width:100%; border-collapse:collapse; margin-top:10px;">
            <thead>
                <tr style="background:#f4f6f8; color:#666; font-size:0.9em; text-align:left;">
                    <th style="padding:10px; border-radius:8px 0 0 8px;">Agent</th>
                    <th style="padding:10px; text-align:center;">Score</th>
                    <th style="padding:10px; text-align:center;">Rang Team</th>
                    <th style="padding:10px; text-align:center; border-radius:0 8px 8px 0;">Rang Global</th>
                </tr>
            </thead>
            <tbody>
    `;

    mesAgents.forEach((agent, index) => {
        const rangTeam = index + 1; // Son rang dans l'équipe
        
        // Médailles Team
        let medaille = `<span style="font-weight:bold; color:#666;">#${rangTeam}</span>`;
        if (rangTeam === 1) medaille = '🥇';
        if (rangTeam === 2) medaille = '🥈';
        if (rangTeam === 3) medaille = '🥉';

        html += `
            <tr style="border-bottom:1px solid #eee;">
                <td style="padding:12px 5px; display:flex; align-items:center; gap:10px;">
                    <div style="background:#e3f2fd; width:30px; height:30px; border-radius:50%; display:flex; align-items:center; justify-content:center;">👤</div>
                    <strong>${agent.prenom} ${agent.nom}</strong>
                </td>
                <td style="text-align:center; font-weight:bold; color:#1565C0;">${agent.scoreTotal} pts</td>
                <td style="text-align:center; font-size:1.2em;">${medaille}</td>
                <td style="text-align:center;">
                    <span style="background:#f5f5f5; border:1px solid #ddd; padding:2px 8px; border-radius:12px; font-size:0.85em; color:#555;">
                        🌍 ${agent.rangGlobal}ème
                    </span>
                </td>
            </tr>
        `;
    });

    html += '</tbody></table>';
    
    // Si l'équipe est vide
    if (mesAgents.length === 0) html = '<p style="text-align:center; padding:20px; color:#999;">Aucun agent dans votre équipe pour le moment.</p>';

    container.innerHTML = html;
}