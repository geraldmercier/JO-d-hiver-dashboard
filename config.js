// =============================================================
// FICHIER : config.js
// DESCRIPTION : Configuration de la connexion à Supabase
//
// ⚠️ IMPORTANT : Vous devez remplacer les valeurs ci-dessous
//    par vos propres identifiants Supabase.
//    Voir la Partie D du guide pour savoir où les trouver.
// =============================================================

const SUPABASE_CONFIG = {

    // Votre URL de projet Supabase
    // Exemple : https://abcdefghijk.supabase.co
    URL: "https://zmzwuutqyxgwjcbifpfq.supabase.co",

    // Votre clé API "anon" (la clé publique)
    // Elle ressemble à : eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
    KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inptend1dXRxeXhnd2pjYmlmcGZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk4NDI0OTAsImV4cCI6MjA4NTQxODQ5MH0.yJvJf71P3frQhhTgmKx5vLCz6NGP-_YQfQuyU-G8E3M"

};

// =============================================================
// Ne touchez PAS au code ci-dessous.
// Il sert à créer la connexion à Supabase automatiquement.
// =============================================================

// On vérifie d'abord que vous avez bien mis vos identifiants
if (SUPABASE_CONFIG.URL === "VOTRE_URL_ICI" || SUPABASE_CONFIG.KEY === "VOTRE_KEY_ICI") {
    console.warn("⚠️ ATTENTION : Vous n'avez pas encore configuré vos identifiants Supabase dans config.js");
    console.warn("   Regardez la Partie D du guide pour comment faire.");
}