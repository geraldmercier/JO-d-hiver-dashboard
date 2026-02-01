# 🎯 GUIDE COMPLET — Installation du Système d'Onboarding
## Projet "JO d'Hiver" — Dashboard Commercial

---

## 📋 CE QUI A ÉTÉ CRÉÉ

Vous avez maintenant un **système d'onboarding complet** qui permet à chaque agent de :
1. ✅ Choisir son avatar parmi 15 options
2. ✅ Choisir son manager (l'équipe est affectée automatiquement)
3. ✅ Choisir sa cellule (Mover / Switcher / Coach / Pépinière)

---

## 📦 FICHIERS CRÉÉS

Vous avez **6 nouveaux fichiers** :

1. `update_database_onboarding.sql` — Mise à jour de la base de données
2. `onboarding.html` — Page d'onboarding (structure)
3. `onboarding.css` — Styles de l'onboarding
4. `onboarding.js` — Logique de l'onboarding
5. `auth-callback.html` — Page de redirection après le magic link
6. `login.js` — (Modifié) pour rediriger vers auth-callback

---

## 🚀 INSTALLATION — ÉTAPE PAR ÉTAPE

### **ÉTAPE 1 : Mettre à jour la base de données Supabase**

1. Allez sur **app.supabase.com**
2. Ouvrez votre projet
3. Cliquez sur **SQL Editor** dans le menu gauche
4. Ouvrez le fichier `update_database_onboarding.sql` que vous avez téléchargé
5. **Copiez tout le contenu** du fichier
6. **Collez** dans l'éditeur SQL de Supabase
7. Cliquez **Run** (ou Ctrl+Enter)
8. ✅ Vérifiez qu'il n'y a pas d'erreurs

**Ce que ce script fait :**
- Ajoute les colonnes `avatar_url`, `cellule`, `manager_id`, `onboarding_complete` à la table `users`
- Crée 5 managers (un par équipe) :
  - Lars Olsen (Norvège 🇳🇴)
  - Sophie Martin (France 🇫🇷)
  - John Smith (Canada 🇨🇦)
  - Maria Garcia (Autriche 🇦🇹)
  - Jennifer Brown (États-Unis 🇺🇸)

---

### **ÉTAPE 2 : Placer les fichiers dans votre projet**

Dans VS Code, placez les fichiers téléchargés dans votre dossier `JO-d-hiver-dashboard` :

```
JO-d-hiver-dashboard/
├── assets/                    ← Vos 15 avatars (déjà présent)
├── index.html                 ← Page de connexion (déjà créé)
├── auth-callback.html         ← 🆕 NOUVEAU
├── onboarding.html            ← 🆕 NOUVEAU
├── onboarding.css             ← 🆕 NOUVEAU
├── onboarding.js              ← 🆕 NOUVEAU
├── dashboard.html             ← Déjà créé
├── dashboard.css              ← Déjà créé
├── dashboard.js               ← Déjà créé
├── styles.css                 ← Déjà créé
├── login.js                   ← 🔄 MODIFIÉ (remplacez l'ancien)
└── config.js                  ← Déjà créé
```

**⚠️ IMPORTANT :** Remplacez l'ancien `login.js` par le nouveau !

---

### **ÉTAPE 3 : Vérifier que le dossier assets est bien placé**

Votre dossier `assets` doit contenir vos 15 avatars PNG :
- chicken.png
- woman.png
- lion.png
- man (1).png à man (5).png
- man.png
- panda.png
- parrot.png
- sea-lion.png
- tiger.png
- woman (1).png
- woman (2).png

Si ce n'est pas le cas, assurez-vous que le dossier `assets` est bien au même niveau que `index.html`.

---

### **ÉTAPE 4 : Tester le flux complet**

#### **Test 1 : Connexion d'un nouvel agent**

1. Ouvrez `index.html` dans votre navigateur
2. Entrez un email : `test.agent@papernest.com`
3. Cliquez "Se Connecter"
4. ✅ Message "Email envoyé !" apparaît

**⚠️ LIMITATION ACTUELLE :**
Pour tester l'onboarding SANS attendre l'email, faites ceci :

1. Dans votre navigateur, **ouvrez directement** `auth-callback.html`
2. Ou allez sur votre projet et **modifiez temporairement** `login.js` pour rediriger directement vers `onboarding.html` après connexion

#### **Test 2 : Onboarding complet**

1. Sur la page onboarding, vous verrez 4 étapes en haut
2. **Étape 1** : Cliquez "Commencer →"
3. **Étape 2** : Cliquez sur un avatar (il devient orange avec une coche ✓)
4. Cliquez "Continuer →"
5. **Étape 3** : Sélectionnez un manager dans le menu déroulant
6. Un message bleu apparaît : "Vous serez affecté à l'équipe : France 🇫🇷"
7. Cliquez "Continuer →"
8. **Étape 4** : Cliquez sur une cellule (elle devient orange)
9. Cliquez "Terminer et accéder au dashboard →"
10. ✅ Vous êtes redirigé vers le dashboard !

---

### **ÉTAPE 5 : Vérifier dans Supabase**

1. Allez sur **app.supabase.com**
2. Ouvrez votre projet
3. Cliquez **Table Editor** → **users**
4. Trouvez votre agent
5. Vérifiez que les colonnes sont remplies :
   - `avatar_url` : "assets/panda.png" (ou celui choisi)
   - `cellule` : "Mover" (ou celle choisie)
   - `manager_id` : UUID du manager choisi
   - `equipe_id` : ID de l'équipe du manager
   - `onboarding_complete` : TRUE

---

## 🎨 CE QUE L'UTILISATEUR VOIT

### **Page d'onboarding — Design :**

- Fond bleu dégradé avec particules de neige
- Indicateur de progression en haut (1/4, 2/4, 3/4, 4/4)
- Carte blanche centrale avec animations fluides
- Transitions douces entre les étapes

### **Étape 2 - Avatars :**
- Grille de 15 avatars
- Au survol : agrandissement
- Au clic : bordure orange + coche ✓

### **Étape 3 - Manager :**
- Menu déroulant stylé
- Format : "Sophie Martin (Équipe France 🇫🇷)"
- Message d'info bleu qui apparaît après sélection

### **Étape 4 - Cellules :**
- 4 cartes en grille (2x2)
- Chaque carte avec icône, nom, description des KPIs
- Au clic : fond orange, texte blanc

---

## 🔄 FLUX COMPLET DE CONNEXION

```
1. Agent entre son email sur index.html
   ↓
2. Supabase envoie un magic link par email
   ↓
3. Agent clique le lien dans l'email
   ↓
4. Redirection vers auth-callback.html
   ↓
5. Vérification : onboarding_complete ?
   ↓
6a. SI FALSE → onboarding.html (première connexion)
   ↓
   • Choix avatar, manager, cellule
   ↓
   • Sauvegarde dans Supabase
   ↓
   • onboarding_complete = TRUE
   ↓
6b. SI TRUE → dashboard.html directement
```

---

## ⚠️ PROBLÈMES COURANTS

### **Problème 1 : Les avatars ne s'affichent pas**
- Vérifiez que le dossier `assets` est au bon endroit
- Vérifiez que les noms de fichiers correspondent exactement (avec les espaces et parenthèses)

### **Problème 2 : Aucun manager dans le menu déroulant**
- Vérifiez que le script SQL a bien créé les 5 managers
- Dans Supabase → Table Editor → users → vérifiez que role='manager'

### **Problème 3 : "Erreur lors de la sauvegarde"**
- Ouvrez la console du navigateur (F12 → Console)
- Regardez les messages d'erreur en rouge
- Vérifiez que vos identifiants Supabase dans config.js sont corrects

### **Problème 4 : Redirection infinie**
- Videz le cache du navigateur (Ctrl+Shift+Del)
- Ou ouvrez en navigation privée

---

## 📸 CAPTURE D'ÉCRAN ATTENDUE

Quand vous ouvrez `onboarding.html`, vous devriez voir :

```
┌─────────────────────────────────────────────┐
│  ●────●────○────○                           │
│  1     2    3    4                          │
│  Bienvenue Avatar Manager Cellule           │
├─────────────────────────────────────────────┤
│                                             │
│              🏔️                             │
│                                             │
│  Bienvenue au Challenge JO d'Hiver 2026 !  │
│                                             │
│  Bonjour Test ! 👋                          │
│                                             │
│  Avant de commencer le challenge,           │
│  configurons votre profil en quelques       │
│  étapes simples.                            │
│                                             │
│          [ Commencer → ]                    │
│                                             │
└─────────────────────────────────────────────┘
```

---

## 🎯 PROCHAINE ÉTAPE

Une fois l'onboarding fonctionnel, vous pourrez :
- Connecter le dashboard aux vraies données Supabase
- Créer le dashboard Manager
- Créer la vue Générale

---

**Testez et envoyez-moi une capture d'écran !** 🚀
