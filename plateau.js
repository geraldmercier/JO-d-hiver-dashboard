// =============================================================
// PLATEAU - VERSION CORRIGÉE
// =============================================================

console.log('🏔️ Vue Plateau - Chargement...');
const supabase = window.supabase.createClient(SUPABASE_CONFIG.URL, SUPABASE_CONFIG.KEY);

let tousLesAgents = [];
let toutesLesEquipes = [];
let tousLesContrats = [];

document.addEventListener('DOMContentLoaded', async function() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { window.location.href = 'connexion-finale.html'; return; }

    // Vérif droits manager/admin
    const { data: profil } = await supabase.from('users').select('role').eq('id', user.id).single();
    if (!['manager', 'admin'].includes(profil.role)) {
        window.location.href = 'dashboard.html';
        return;
    }

    await chargerDonnees();
    calculerClassements();
    
    // Tabs
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.tab-btn, .tab-content').forEach(el => el.classList.remove('active'));
            this.classList.add('active');
            document.getElementById('tab-' + this.dataset.tab).classList.add('active');
        });
    });
});

async function chargerDonnees() {
    const p1 = supabase.from('users').select(`*, equipes (nom, drapeau)`).eq('role', 'agent');
    const p2 = supabase.from('equipes').select('*');
    const p3 = supabase.from('contrats').select('*').eq('statut', 'valide');
    
    const [r1, r2, r3] = await Promise.all([p1, p2, p3]);
    
    tousLesAgents = r1.data || [];
    toutesLesEquipes = r2.data || [];
    tousLesContrats = r3.data || [];
}

function calculerClassements() {
    // 1. Classement Global
    const agentsScores = tousLesAgents.map(agent => ({
        ...agent,
        score: tousLesContrats.filter(c => c.agent_id === agent.id).length * 10
    })).sort((a, b) => b.score - a.score);

    const tbodyGlobal = document.getElementById('tableau-global-body');
    if(tbodyGlobal) {
        tbodyGlobal.innerHTML = agentsScores.map((a, i) => `
            <tr>
                <td>${i+1} ${i===0?'🥇':i===1?'🥈':i===2?'🥉':''}</td>
                <td>${a.prenom} ${a.nom}</td>
                <td>${a.equipes?.drapeau}</td>
                <td>${a.score} pts</td>
            </tr>
        `).join('');
    }

    // 2. Classement Équipes
    const equipesScores = toutesLesEquipes.map(eq => {
        const agentsIds = tousLesAgents.filter(a => a.equipe_id === eq.id).map(a => a.id);
        const score = tousLesContrats.filter(c => agentsIds.includes(c.agent_id)).length * 10;
        return { ...eq, score };
    }).sort((a, b) => b.score - a.score);

    const divEquipes = document.getElementById('equipes-classement');
    if(divEquipes) {
        divEquipes.innerHTML = equipesScores.map((eq, i) => `
            <div class="equipe-item">
                <div class="equipe-rang">${i+1}</div>
                <div>${eq.drapeau} ${eq.nom} - <strong>${eq.score} pts</strong></div>
            </div>
        `).join('');
    }
}