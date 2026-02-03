// =============================================================
// DASHBOARD AGENT - VERSION FINALE STABILISÉE
// Tous les calculs sont réels depuis Supabase (Contrats + Bonus)
// =============================================================

(function() {
    console.log('🏔️ Dashboard Agent FINAL - Chargement...');

    // Instance Supabase locale à l'IIFE pour éviter les conflits
    const supabase = window.supabase.createClient(SUPABASE_CONFIG.URL, SUPABASE_CONFIG.KEY);

    let utilisateurActuel = null;
    let tousLesAgents = [];
    let tousLesContrats = [];
    let tousLesBonus = [];

    // -------------------------------------------------------------
    // INITIALISATION
    // -------------------------------------------------------------
    document.addEventListener('DOMContentLoaded', async function() {
        
        const { data: { user }, error } = await supabase.auth.getUser();
        
        if (error || !user) {
            console.error('❌ Utilisateur non connecté');
            window.location.href = 'connexion-finale.html';
            return;
        }

        console.log('✅ Utilisateur connecté:', user.email);

        // Charger les données en parallèle pour plus de rapidité
        await Promise.all([
            chargerDonneesUtilisateur(user.id),
            chargerTousLesAgents(),
            chargerTousLesContrats(),
            chargerTousLesBonus()
        ]);

        if (!utilisateurActuel) return;

        // Afficher toutes les sections
        afficherInformationsHeader();
        calculerEtAfficherClassement();
        calculerEtAfficherSkiFond();
        calculerEtAfficherPerformanceJour();
        calculerEtAfficherEquipe();
        await chargerContratsJour();
        afficherCalendrierReel();
        afficherBadgesReels();

        // Événements
        const form = document.getElementById('formulaire-contrat');
        if (form) form.addEventListener('submit', enregistrerContrat);
        
        const btnDeconnexion = document.getElementById('btn-deconnexion');
        if (btnDeconnexion) btnDeconnexion.addEventListener('click', window.deconnexion);

        // Lancer la vérification des challenges
        setTimeout(verifierEtAttribuerChallenges, 2000);
        setInterval(verifierEtAttribuerChallenges, 60000);

        console.log('✅ Dashboard initialisé');
    });

    // -------------------------------------------------------------
    // CHARGEMENT DES DONNÉES
    // -------------------------------------------------------------

    async function chargerDonneesUtilisateur(userId) {
        try {
            const { data, error } = await supabase
                .from('users')
                .select('*, equipes (nom, drapeau)')
                .eq('id', userId)
                .single();

            if (error) throw error;
            utilisateurActuel = data;
        } catch (error) {
            console.error('❌ Erreur chargement utilisateur:', error);
        }
    }

    async function chargerTousLesAgents() {
        try {
            const { data, error } = await supabase
                .from('users')
                .select('*, equipes (nom, drapeau)')
                .eq('role', 'agent');

            if (error) throw error;
            tousLesAgents = data;
        } catch (error) {
            console.error('❌ Erreur chargement agents:', error);
        }
    }

    async function chargerTousLesContrats() {
        try {
            const { data, error } = await supabase
                .from('contrats')
                .select('*')
                .eq('statut', 'valide');

            if (error) throw error;
            tousLesContrats = data;
        } catch (error) {
            console.error('❌ Erreur chargement contrats:', error);
        }
    }

    async function chargerTousLesBonus() {
        try {
            const { data, error } = await supabase
                .from('challenges_gagnants')
                .select('*');

            if (error) throw error;
            tousLesBonus = data;
        } catch (error) {
            console.error('❌ Erreur chargement bonus:', error);
        }
    }

    // -------------------------------------------------------------
    // FONCTIONS DE CALCUL DE SCORE
    // -------------------------------------------------------------

    function calculerScoreAgent(agentId) {
        const nbContrats = tousLesContrats.filter(c => c.agent_id === agentId).length;
        const pointsContrats = nbContrats * 10;
        const pointsBonus = tousLesBonus
            .filter(b => b.agent_id === agentId)
            .reduce((sum, b) => sum + b.points_gagnes, 0);
        
        return pointsContrats + pointsBonus;
    }

    // -------------------------------------------------------------
    // AFFICHAGE DES SECTIONS
    // -------------------------------------------------------------

    function afficherInformationsHeader() {
        if (!utilisateurActuel) return;

        const nomElem = document.getElementById('nom-agent');
        if (nomElem) nomElem.textContent = utilisateurActuel.prenom + ' ' + utilisateurActuel.nom;
        
        const equipeElem = document.getElementById('equipe-agent');
        if (equipeElem && utilisateurActuel.equipes) {
            equipeElem.textContent = 'Équipe ' + utilisateurActuel.equipes.nom + ' ' + utilisateurActuel.equipes.drapeau;
        }
        
        const celluleElem = document.getElementById('cellule-agent');
        if (celluleElem) celluleElem.textContent = utilisateurActuel.cellule;

        const avatar = document.getElementById('avatar-agent');
        if (avatar && utilisateurActuel.avatar_url) {
            avatar.src = utilisateurActuel.avatar_url;
        }
    }

    function calculerEtAfficherClassement() {
        const agentsAvecScores = tousLesAgents.map(agent => ({
            ...agent,
            score: calculerScoreAgent(agent.id)
        }));

        agentsAvecScores.sort((a, b) => b.score - a.score);

        const maPositionGlobale = agentsAvecScores.findIndex(a => a.id === utilisateurActuel.id) + 1;
        const totalAgents = agentsAvecScores.length;
        
        const rangGlobalElem = document.getElementById('rang-global');
        if (rangGlobalElem) rangGlobalElem.textContent = `${maPositionGlobale}ème/${totalAgents}`;

        const agentsMonEquipe = agentsAvecScores.filter(a => a.equipe_id === utilisateurActuel.equipe_id);
        const maPositionEquipe = agentsMonEquipe.findIndex(a => a.id === utilisateurActuel.id) + 1;
        
        const rangEquipeElem = document.getElementById('rang-equipe');
        if (rangEquipeElem) rangEquipeElem.textContent = `${maPositionEquipe}ème/${agentsMonEquipe.length}`;

        const ptsManquantsElem = document.getElementById('points-manquants');
        if (ptsManquantsElem) {
            if (maPositionGlobale > 1) {
                const agentDevant = agentsAvecScores[maPositionGlobale - 2];
                const monScore = agentsAvecScores[maPositionGlobale - 1].score;
                const pointsManquants = agentDevant.score - monScore + 1;
                ptsManquantsElem.textContent = `${pointsManquants} pts pour la ${maPositionGlobale - 1}${maPositionGlobale === 2 ? 'ère' : 'ème'} place`;
            } else {
                ptsManquantsElem.textContent = '🥇 Vous êtes 1er !';
            }
        }
    }

    function calculerEtAfficherSkiFond() {
        const cellule = utilisateurActuel.cellule;
        let kpi = 'Volume de contrats';
        let valeur = '0';

        const mesContrats = tousLesContrats.filter(c => c.agent_id === utilisateurActuel.id);

        if (cellule === 'Mover') {
            kpi = 'Taux de Rétention (TR)';
            const contratsRetention = mesContrats.filter(c => c.type_contrat === 'Telco' || c.type_contrat === 'MRH');
            const taux = mesContrats.length > 0 ? Math.round((contratsRetention.length / mesContrats.length) * 100) : 0;
            valeur = taux + '%';
        } else if (cellule === 'Switcher') {
            kpi = 'Volume Homeserve';
            const contratsHomeserve = mesContrats.filter(c => c.type_contrat === 'Mobile' || c.type_contrat === 'Compensation Carbone');
            valeur = contratsHomeserve.length;
        } else if (cellule === 'Coach') {
            kpi = 'Volume Premium';
            const contratsPremium = mesContrats.filter(c => c.type_contrat === 'Premium');
            valeur = contratsPremium.length;
        } else {
            valeur = mesContrats.length;
        }

        const labelElem = document.querySelector('.kpi-label');
        if (labelElem) labelElem.textContent = kpi;
        
        const valeurElem = document.getElementById('ski-fond-valeur');
        if (valeurElem) valeurElem.textContent = valeur;
    }

    function calculerEtAfficherPerformanceJour() {
        const aujourdhui = new Date().toLocaleDateString('en-CA'); // format YYYY-MM-DD local

        const monScoreJour = (tousLesContrats.filter(c => 
            c.agent_id === utilisateurActuel.id && c.created_at.startsWith(aujourdhui)
        ).length * 10) + tousLesBonus.filter(b => 
            b.agent_id === utilisateurActuel.id && b.created_at?.startsWith(aujourdhui)
        ).reduce((sum, b) => sum + b.points_gagnes, 0);

        const scoresJour = tousLesAgents.map(agent => {
            const contrats = tousLesContrats.filter(c => c.agent_id === agent.id && c.created_at.startsWith(aujourdhui)).length;
            const bonus = tousLesBonus.filter(b => b.agent_id === agent.id && b.created_at?.startsWith(aujourdhui))
                .reduce((sum, b) => sum + b.points_gagnes, 0);
            return { agentId: agent.id, score: (contrats * 10) + bonus };
        });

        scoresJour.sort((a, b) => b.score - a.score);
        const maPositionJour = scoresJour.findIndex(s => s.agentId === utilisateurActuel.id) + 1;

        const scoreJourElem = document.getElementById('score-jour');
        if (scoreJourElem) scoreJourElem.textContent = monScoreJour + ' pts';
        
        const classementJourElem = document.getElementById('classement-jour');
        if (classementJourElem) classementJourElem.textContent = (maPositionJour || '-') + 'ème';
    }

    function calculerEtAfficherEquipe() {
        const agentsEquipe = tousLesAgents.filter(a => a.equipe_id === utilisateurActuel.equipe_id);
        const scoreEquipe = agentsEquipe.reduce((sum, a) => sum + calculerScoreAgent(a.id), 0);
        
        const scoreEquipeElem = document.getElementById('score-equipe');
        if (scoreEquipeElem) scoreEquipeElem.textContent = scoreEquipe.toLocaleString() + ' pts';

        const agentsAvecScores = agentsEquipe.map(agent => ({
            ...agent,
            score: calculerScoreAgent(agent.id)
        }));
        
        agentsAvecScores.sort((a, b) => b.score - a.score);
        const top3 = agentsAvecScores.slice(0, 3);

        const top3Html = top3.map(agent => {
            const estMoi = agent.id === utilisateurActuel.id;
            return `<li ${estMoi ? 'class="vous"' : ''}>
                <span class="top3-nom">${estMoi ? 'Vous' : agent.prenom + ' ' + agent.nom}</span>
                <span class="top3-score">${agent.score} pts</span>
            </li>`;
        }).join('');

        const top3Elem = document.getElementById('top3-equipe');
        if (top3Elem) top3Elem.innerHTML = top3Html;
    }

    async function chargerContratsJour() {
        try {
            const aujourdhui = new Date().toLocaleDateString('en-CA');

            const { data: contrats, error } = await supabase
                .from('contrats')
                .select('*')
                .eq('agent_id', utilisateurActuel.id)
                .gte('created_at', aujourdhui + 'T00:00:00')
                .order('created_at', { ascending: false });

            if (error) throw error;

            const liste = document.getElementById('contrats-liste');
            if (!liste) return;
            
            if (!contrats || contrats.length === 0) {
                liste.innerHTML = '<div class="contrat-vide">Aucun contrat enregistré pour aujourd\'hui</div>';
                return;
            }

            liste.innerHTML = '';
            contrats.forEach(contrat => {
                const div = document.createElement('div');
                div.className = 'contrat-item';
                
                const heure = new Date(contrat.created_at).toLocaleTimeString('fr-FR', { 
                    hour: '2-digit', minute: '2-digit' 
                });

                const icone = {
                    'Telco': '📞', 'Mobile': '📱', 'MRH': '🏠', 'Premium': '⭐', 'Compensation Carbone': '🌱'
                }[contrat.type_contrat] || '📄';

                const statutBadge = contrat.statut === 'valide' ? 
                    '<span class="badge-valide">✅ Validé</span>' : 
                    '<span class="badge-attente">⏳ En attente</span>';

                div.innerHTML = `
                    <span class="contrat-icone">${icone}</span>
                    <div class="contrat-info">
                        <span class="contrat-type">${contrat.type_contrat}</span>
                        <span class="contrat-heure">${heure}</span>
                        ${contrat.api_app ? '<span class="badge-apiapp">📱 ApiApp</span>' : ''}
                        ${statutBadge}
                    </div>
                    <div class="contrat-actions">
                        <a href="${contrat.lien_piste}" class="contrat-lien" target="_blank" title="Voir la piste">🔗</a>
                        ${contrat.statut === 'en_attente' ? `<button class="btn-supprimer-contrat" onclick="window.supprimerContrat('${contrat.id}')" title="Supprimer">🗑️</button>` : ''}
                    </div>
                `;
                liste.appendChild(div);
            });
        } catch (error) {
            console.error('❌ Erreur chargement contrats jour:', error);
        }
    }

    // -------------------------------------------------------------
    // GESTION DES CONTRATS
    // -------------------------------------------------------------

    async function enregistrerContrat(event) {
        event.preventDefault();

        const typeContrat = document.getElementById('type-contrat').value;
        const lienPiste = document.getElementById('lien-piste').value;
        const apiApp = document.getElementById('contrat-apiapp').checked;

        const btn = document.getElementById('btn-enregistrer');
        const btnTexte = document.getElementById('btn-texte');
        
        if (btn) btn.disabled = true;
        if (btnTexte) btnTexte.textContent = '⏳ Enregistrement...';

        try {
            const { error } = await supabase
                .from('contrats')
                .insert({
                    agent_id: utilisateurActuel.id,
                    type_contrat: typeContrat,
                    lien_piste: lienPiste,
                    api_app: apiApp,
                    statut: 'en_attente',
                    created_at: new Date().toISOString()
                });

            if (error) throw error;

            const msgSucces = document.getElementById('message-succes');
            if (msgSucces) {
                msgSucces.textContent = '✅ Contrat enregistré avec succès !';
                msgSucces.style.display = 'block';
                setTimeout(() => { msgSucces.style.display = 'none'; }, 3000);
            }

            const form = document.getElementById('formulaire-contrat');
            if (form) form.reset();
            
            await chargerTousLesContrats();
            await chargerContratsJour();
            calculerEtAfficherClassement();
            calculerEtAfficherSkiFond();
            calculerEtAfficherPerformanceJour();

        } catch (error) {
            console.error('❌ Erreur enregistrement:', error);
            const msgErreur = document.getElementById('message-erreur-form');
            if (msgErreur) {
                msgErreur.textContent = '❌ Erreur : ' + error.message;
                msgErreur.style.display = 'block';
            }
        } finally {
            if (btn) btn.disabled = false;
            if (btnTexte) btnTexte.textContent = '✅ Enregistrer';
        }
    }

    window.supprimerContrat = async function(contratId) {
        if (!confirm('⚠️ Supprimer ce contrat ?\n\nCette action est irréversible.')) return;

        try {
            const { error } = await supabase.from('contrats').delete().eq('id', contratId);
            if (error) throw error;

            await chargerTousLesContrats();
            await chargerContratsJour();
            calculerEtAfficherClassement();
        } catch (error) {
            console.error('❌ Erreur suppression:', error);
            alert('❌ Erreur lors de la suppression');
        }
    };

    // -------------------------------------------------------------
    // CALENDRIER ET BADGES
    // -------------------------------------------------------------

    function afficherCalendrierReel() {
        const debut = new Date('2026-02-09');
        const fin = new Date('2026-02-20');
        const grid = document.getElementById('calendrier-grid');
        if (!grid) return;
        
        grid.innerHTML = '';
        const aujourdhuiStr = new Date().toLocaleDateString('en-CA');

        for (let d = new Date(debut); d <= fin; d.setDate(d.getDate() + 1)) {
            const jour = new Date(d);
            const jourStr = jour.toLocaleDateString('en-CA');
            const estFutur = jourStr > aujourdhuiStr;

            const score = (tousLesContrats.filter(c => 
                c.agent_id === utilisateurActuel.id && c.created_at.startsWith(jourStr)
            ).length * 10) + tousLesBonus.filter(b => 
                b.agent_id === utilisateurActuel.id && b.created_at?.startsWith(jourStr)
            ).reduce((sum, b) => sum + b.points_gagnes, 0);

            const div = document.createElement('div');
            div.className = 'jour-carte' + (estFutur ? ' jour-futur' : '');
            div.innerHTML = `
                <div class="jour-date">${jour.getDate()} Fév</div>
                <div class="jour-score">${estFutur ? '—' : score + ' pts'}</div>
            `;
            grid.appendChild(div);
        }
    }

    function afficherBadgesReels() {
        const scoreTotal = calculerScoreAgent(utilisateurActuel.id);
        const nbContrats = tousLesContrats.filter(c => c.agent_id === utilisateurActuel.id).length;

        const agentsAvecScores = tousLesAgents.map(agent => ({
            agentId: agent.id, score: calculerScoreAgent(agent.id)
        })).sort((a, b) => b.score - a.score);
        
        const maPosition = agentsAvecScores.findIndex(s => s.agentId === utilisateurActuel.id) + 1;

        const badges = [
            { nom: 'Premier Contrat', icone: '🎯', debloque: nbContrats >= 1 },
            { nom: 'Série de 5', icone: '🔥', debloque: nbContrats >= 5 },
            { nom: 'Top 3 Global', icone: '🏅', debloque: maPosition <= 3 && maPosition > 0 },
            { nom: '100 Points', icone: '💯', debloque: scoreTotal >= 100 },
            { nom: '20 Contrats', icone: '🎖️', debloque: nbContrats >= 20 },
            { nom: '50 Contrats', icone: '👑', debloque: nbContrats >= 50 }
        ];

        const grid = document.getElementById('badges-grid');
        if (!grid) return;
        grid.innerHTML = '';

        badges.forEach(badge => {
            const div = document.createElement('div');
            div.className = 'badge-carte' + (badge.debloque ? ' badge-deblocque' : ' badge-verrouille');
            div.innerHTML = `
                <div class="badge-icone">${badge.icone}</div>
                <div class="badge-nom">${badge.nom}</div>
            `;
            grid.appendChild(div);
        });
    }

    // -------------------------------------------------------------
    // SYSTÈME DE CHALLENGES
    // -------------------------------------------------------------

    async function verifierEtAttribuerChallenges() {
        try {
            const maintenant = new Date().toISOString();
            const { data: challenges, error } = await supabase
                .from('challenges_flash')
                .select('*')
                .eq('statut', 'actif')
                .lte('date_fin', maintenant);
            
            if (error || !challenges || challenges.length === 0) return;
            
            for (const challenge of challenges) {
                await traiterChallenge(challenge);
            }
            
            // Recharger les bonus après traitement
            await chargerTousLesBonus();
            calculerEtAfficherClassement();
            calculerEtAfficherPerformanceJour();
        } catch (error) {
            console.error('❌ Erreur vérification challenges:', error);
        }
    }

    async function traiterChallenge(challenge) {
        try {
            let agentsEligibles = [];
            if (challenge.cible === 'tous') {
                agentsEligibles = tousLesAgents;
            } else if (challenge.cible === 'equipe') {
                agentsEligibles = tousLesAgents.filter(a => a.equipe_id === challenge.equipe_id);
            } else if (challenge.cible === 'cellule') {
                agentsEligibles = tousLesAgents.filter(a => a.cellule === challenge.cellule_cible);
            }
            
            for (const agent of agentsEligibles) {
                const { data: contrats } = await supabase
                    .from('contrats')
                    .select('*', { count: 'exact' })
                    .eq('agent_id', agent.id)
                    .eq('statut', 'valide')
                    .gte('created_at', challenge.date_debut)
                    .lte('created_at', challenge.date_fin);
                
                const nb = contrats ? contrats.length : 0;
                if (nb >= (challenge.objectif || 1)) {
                    await supabase.from('challenges_gagnants').insert({
                        challenge_id: challenge.id,
                        agent_id: agent.id,
                        points_gagnes: challenge.points_attribues,
                        performance: nb
                    });
                }
            }
            
            await supabase.from('challenges_flash').update({ statut: 'termine' }).eq('id', challenge.id);
        } catch (error) {
            console.error('❌ Erreur traitement challenge:', error);
        }
    }

    window.deconnexion = async function() {
        if (confirm('Voulez-vous vraiment vous déconnecter ?')) {
            await supabase.auth.signOut();
            window.location.href = 'connexion-finale.html';
        }
    };

})();
