-- =============================================================
-- FICHIER : update_database_onboarding.sql
-- DESCRIPTION : Mise à jour de la base de données pour l'onboarding
-- 
-- CE QUE CE FICHIER FAIT :
-- 1. Ajoute les colonnes nécessaires à la table users
-- 2. Crée 5 managers (un par équipe)
-- =============================================================


-- -------------------------------------------------------------
-- PARTIE 1 : AJOUT DES COLONNES À LA TABLE USERS
-- -------------------------------------------------------------

-- Colonne pour l'URL de l'avatar choisi
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Colonne pour la cellule (Mover, Switcher, Coach, Pépinière)
ALTER TABLE users ADD COLUMN IF NOT EXISTS cellule VARCHAR(20);

-- Colonne pour l'ID du manager (référence vers un autre user)
ALTER TABLE users ADD COLUMN IF NOT EXISTS manager_id UUID REFERENCES users(id);

-- Colonne pour savoir si l'onboarding est terminé
ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarding_complete BOOLEAN DEFAULT FALSE;

-- Contrainte : la cellule doit être une des valeurs autorisées
ALTER TABLE users DROP CONSTRAINT IF EXISTS chk_cellule;
ALTER TABLE users ADD CONSTRAINT chk_cellule 
    CHECK (cellule IN ('Mover', 'Switcher', 'Coach', 'Pépinière') OR cellule IS NULL);


-- -------------------------------------------------------------
-- PARTIE 2 : CRÉATION DES 5 MANAGERS (UN PAR ÉQUIPE)
-- 
-- Ces managers sont des comptes de test.
-- Ils ont déjà fait l'onboarding (onboarding_complete = TRUE)
-- Les agents pourront les sélectionner lors de leur onboarding.
-- -------------------------------------------------------------

-- Manager de l'équipe Norvège
INSERT INTO users (email, nom, prenom, equipe_id, role, onboarding_complete, avatar_url, cellule, actif)
VALUES (
    'lars.olsen@papernest.com',
    'Olsen',
    'Lars',
    (SELECT id FROM equipes WHERE nom = 'Norvège'),
    'manager',
    TRUE,
    'assets/lion.png',
    NULL,  -- Les managers n'ont pas de cellule
    TRUE
)
ON CONFLICT (email) DO UPDATE SET
    role = 'manager',
    onboarding_complete = TRUE;

-- Manager de l'équipe France
INSERT INTO users (email, nom, prenom, equipe_id, role, onboarding_complete, avatar_url, cellule, actif)
VALUES (
    'sophie.martin@papernest.com',
    'Martin',
    'Sophie',
    (SELECT id FROM equipes WHERE nom = 'France'),
    'manager',
    TRUE,
    'assets/woman.png',
    NULL,
    TRUE
)
ON CONFLICT (email) DO UPDATE SET
    role = 'manager',
    onboarding_complete = TRUE;

-- Manager de l'équipe Canada
INSERT INTO users (email, nom, prenom, equipe_id, role, onboarding_complete, avatar_url, cellule, actif)
VALUES (
    'john.smith@papernest.com',
    'Smith',
    'John',
    (SELECT id FROM equipes WHERE nom = 'Canada'),
    'manager',
    TRUE,
    'assets/tiger.png',
    NULL,
    TRUE
)
ON CONFLICT (email) DO UPDATE SET
    role = 'manager',
    onboarding_complete = TRUE;

-- Manager de l'équipe Autriche
INSERT INTO users (email, nom, prenom, equipe_id, role, onboarding_complete, avatar_url, cellule, actif)
VALUES (
    'maria.garcia@papernest.com',
    'Garcia',
    'Maria',
    (SELECT id FROM equipes WHERE nom = 'Autriche'),
    'manager',
    TRUE,
    'assets/woman (1).png',
    NULL,
    TRUE
)
ON CONFLICT (email) DO UPDATE SET
    role = 'manager',
    onboarding_complete = TRUE;

-- Manager de l'équipe États-Unis
INSERT INTO users (email, nom, prenom, equipe_id, role, onboarding_complete, avatar_url, cellule, actif)
VALUES (
    'jennifer.brown@papernest.com',
    'Brown',
    'Jennifer',
    (SELECT id FROM equipes WHERE nom = 'États-Unis'),
    'manager',
    TRUE,
    'assets/woman (2).png',
    NULL,
    TRUE
)
ON CONFLICT (email) DO UPDATE SET
    role = 'manager',
    onboarding_complete = TRUE;


-- -------------------------------------------------------------
-- PARTIE 3 : VÉRIFICATION
-- 
-- Affiche les managers créés pour vérifier que tout est OK
-- -------------------------------------------------------------
SELECT 
    u.email,
    u.prenom || ' ' || u.nom AS nom_complet,
    e.nom AS equipe,
    e.drapeau_emoji,
    u.role,
    u.onboarding_complete
FROM users u
JOIN equipes e ON u.equipe_id = e.id
WHERE u.role = 'manager'
ORDER BY e.nom;


-- =============================================================
-- RÉSUMÉ DES MODIFICATIONS :
--   ✅ Colonnes ajoutées : avatar_url, cellule, manager_id, onboarding_complete
--   ✅ 5 managers créés (un par équipe)
--   ✅ Les agents pourront sélectionner leur manager lors de l'onboarding
--   ✅ L'équipe de l'agent sera automatiquement celle de son manager
-- =============================================================
