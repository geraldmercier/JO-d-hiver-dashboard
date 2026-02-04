// =============================================================
// CONFIGURATION GLOBALE
// À inclure avant tous les autres scripts dans le HTML
// =============================================================

const SUPABASE_CONFIG = {
    // Remplace ces valeurs par celles de ton projet Supabase
    URL: "https://zmzwuutqyxgwjcbifpfq.supabase.co", 
    KEY: "sb_publishable_msCpyUW2rsUWj4Zaec1Mbw_I5xck_Xu" 
};

// Fonction utilitaire pour obtenir la date locale au format YYYY-MM-DD
// Cela évite les bugs de fuseau horaire (contrats validés le soir)
window.getAujourdhui = function() {
    return new Date().toLocaleDateString('fr-CA'); 
};