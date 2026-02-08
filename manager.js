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
    await chargerChallengesActifsManager();

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

    // On récupère les challenges actifs (Flash, Business, Events...)
    // On trie pour avoir ceux d'aujourd'hui en premier ou par date
    const { data: challenges, error } = await sb
        .from('challenges_flash')
        .select('*')
        .eq('statut', 'actif')
        .order('date_debut', { ascending: false });

    select.innerHTML = '<option value="">-- Choisir une épreuve --</option>';

    if (challenges) {
        challenges.forEach(c => {
            // Petit formatage de date pour la lisibilité
            const dateStr = new Date(c.date_debut).toLocaleDateString('fr-FR', {day:'numeric', month:'short'});
            select.innerHTML += `<option value="${c.id}" data-points="${c.gain_or || 10}">[${dateStr}] ${c.titre}</option>`;
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
    const pointsInput = document.getElementById('input-points-manuel').value; // On récupère ce que vous avez tapé

    if (!challengeId || !agentId || !pointsInput) {
        alert("❌ Merci de tout remplir.");
        return;
    }

    if (!confirm(`Confirmer l'ajout de ${pointsInput} points à cet agent ?`)) return;

    try {
        // On envoie à la base de données AVEC la valeur manuelle
        const { error } = await sb.from('challenge_reussites').insert([
            {
                agent_id: agentId,
                challenge_flash_id: challengeId,
                statut: 'valide',
                date_validation: new Date().toISOString(),
                points_manuel: parseInt(pointsInput) // 👈 C'est ici la magie !
            }
        ]);

        if (error) throw error;

        afficherNotification(`✅ Succès ! ${pointsInput} points attribués.`, 'success');
        
        // Rafraîchissement des tableaux
        if (typeof chargerAgentsEquipe === 'function') await chargerAgentsEquipe();
        if (typeof calculerEtAfficherPerformanceEquipe === 'function') await calculerEtAfficherPerformanceEquipe();

    } catch (err) {
        console.error(err);
        alert("Erreur : " + err.message);
    }
};
async function chargerChallengesActifsManager() {
    // 1. On cherche la "boîte" HTML qu'on a créée à l'étape 1
    const container = document.getElementById('liste-challenges-actifs');
    
    // Sécurité : Si la boîte n'existe pas dans la page, on s'arrête là pour éviter un bug.
    if (!container) return;

    // 2. On interroge Supabase
    // "Donne-moi tous les challenges dont le statut est encore 'actif'"
    const { data: challenges } = await sb.from('challenges_flash')
        .select('*')
        .eq('statut', 'actif');

    // 3. On nettoie la boîte (on efface l'ancien contenu pour ne pas avoir de doublons)
    // Et on met un petit titre
    container.innerHTML = '<h3>🔥 Challenges en cours</h3>';
    
    // Si la liste est vide, on affiche un petit message et on s'arrête.
    if (!challenges || challenges.length === 0) {
        container.innerHTML += '<p style="color:#888;">Aucun challenge actif.</p>';
        return;
    }

    // 4. La Boucle : Pour chaque challenge trouvé...
    challenges.forEach(c => {
        // On crée un élément visuel (une div)
        const div = document.createElement('div');
        
        // On lui donne du style (bordure bleue, fond blanc...)
        div.style.cssText = "background:white; padding:15px; margin-bottom:10px; border-radius:8px; border-left:4px solid #2196F3; display:flex; justify-content:space-between; align-items:center; box-shadow:0 2px 5px rgba(0,0,0,0.05);";
        
        // On remplit l'intérieur de la div avec du HTML
        // Notez le bouton <button onclick="stopperChallenge('${c.id}')">
        // C'est lui qui contient l'ID unique du challenge à supprimer.
        div.innerHTML = `
            <div>
                <strong>${c.titre}</strong> 
                <span style="background:#e3f2fd; color:#1565C0; padding:2px 6px; border-radius:4px; font-size:0.8em;">${c.points_attribues} pts</span>
                <div style="font-size:0.85em; color:#666;">${c.description}</div>
            </div>
            
            <button onclick="stopperChallenge('${c.id}')" style="background:#ff5252; color:white; border:none; padding:8px 12px; border-radius:4px; cursor:pointer; font-weight:bold; font-size:0.8em;">
                🗑️ Arrêter
            </button>
        `;
        
        // On ajoute cette div dans la grande boîte principale
        container.appendChild(div);
    });
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