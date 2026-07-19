// Single source of truth for the app's public version + changelog.
// RULE: every release (any user-visible change pushed to production) bumps
// LATEST_VERSION and prepends an entry here. The mobile app compares its
// baked-in version against /api/v1/meta/version and shows an update banner
// linking to DOWNLOAD_URL when they differ. Keep entries user-facing and in
// French (app-wide convention for server-sourced text).

export const LATEST_VERSION = '1.5.1';
export const DOWNLOAD_URL = 'https://lokl-roan.vercel.app/';
// Direct APK link: the in-app "Mettre à jour" button downloads this straight
// away instead of sending users through the website.
export const APK_URL = 'https://lokl-roan.vercel.app/lokl.apk';

export const CHANGELOG = [
  {
    version: '1.5.1',
    date: '2026-07-19',
    changes: [
      "Le fil d'accueil peut désormais afficher une annonce habillée comme une carte d'événement (avec un repère « Annonce ») après les premiers événements — comme sur la page événement, jamais avant que le fil ait assez de contenu réel",
      "« À propos de Lokl » n'est plus une simple fenêtre : la page explique maintenant ce qu'est l'application et pourquoi, avec un accès direct à la politique de confidentialité et au journal des versions",
      "Aide & Support mis à jour : les questions fréquentes reflètent les fonctionnalités actuelles (création d'événement, Premium, suppression de compte avec délai de 30 jours...) et l'e-mail de support s'ouvre directement dans votre messagerie",
    ],
  },
  {
    version: '1.5.0',
    date: '2026-07-19',
    changes: [
      "Suppression de compte repensée : dites-nous pourquoi vous partez, puis votre compte est suspendu (non supprimé tout de suite) — reconnectez-vous dans les 30 jours et tout est annulé automatiquement, rien n'est perdu",
      "Sans reconnexion dans ce délai, la suppression définitive et l'anonymisation des données ont lieu automatiquement",
    ],
  },
  {
    version: '1.4.9',
    date: '2026-07-18',
    changes: [
      "Connexion avec Facebook et GitHub : deux nouvelles façons de rejoindre Lokl, en plus de Google et de l'email",
      "L'icône Google est plus nette (elle ne change plus de couleur en dégradé)",
    ],
  },
  {
    version: '1.4.8',
    date: '2026-07-18',
    changes: [
      "Page événement : le titre est centré sous la photo, avec plus d'espace pour respirer — l'œil tombe directement dessus en arrivant sur la page",
      'Profil : la photo de profil est mieux détachée de la couverture',
    ],
  },
  {
    version: '1.4.7',
    date: '2026-07-18',
    changes: [
      "Les annonces sont actives : une seule carte, clairement marquée « Annonce », en tête des « Suggestions pour vous » sur la page événement — jamais dans le fil d'accueil, jamais dans les discussions. Elles financent l'hébergement et le développement de l'application",
      'Les comptes Premium ne voient aucune publicité — cet avantage est détaillé sur la page Devenir Premium',
    ],
  },
  {
    version: '1.4.6',
    date: '2026-07-18',
    changes: [
      "Toucher un événement dans le fil ouvre maintenant sa page complète (carte, avis, suggestions, inscription) au lieu d'un aperçu partiel — la section « Suggestions pour vous » devient enfin visible en navigation normale",
    ],
  },
  {
    version: '1.4.5',
    date: '2026-07-18',
    changes: [
      "Profil réorganisé : vos statistiques (événements, tickets) passent juste sous votre identité — vos propres chiffres avant toute autre carte",
      "Profil : couverture raccourcie pour que l'essentiel tienne sur le premier écran, et le bas de page ne se cache plus derrière la barre de navigation",
      "Annonces (toujours inactives) : le mécanisme de consentement ne bloque plus le chargement quand la vérification échoue — le comportement suit désormais la région de l'utilisateur",
    ],
  },
  {
    version: '1.4.4',
    date: '2026-07-17',
    changes: [
      "Préparation technique des futures annonces sur la page événement : elles s'afficheront habillées comme une carte d'événement (avec un repère « Annonce »), glissée dans « Suggestions pour vous » plutôt qu'en bannière classique — toujours inactif, aucune publicité ne s'affiche pour l'instant",
      'Site web : la maquette du téléphone en page d\'accueil affiche maintenant les vraies icônes de navigation (Accueil / Notifications / Messages / Profil)',
    ],
  },
  {
    version: '1.4.3',
    date: '2026-07-17',
    changes: [
      "Guide interactif de démarrage : créez un événement d'essai, apprenez à le gérer, puis supprimez-le — chaque étape attend votre action réelle, et l'événement d'essai est réellement effacé à la fin (relançable depuis Paramètres)",
      'Correction : la photo de profil ne se coupe plus en deux pendant le défilement',
      'Cartes : le nord reste toujours en haut — la rotation est désactivée pour ne jamais perdre le sens de lecture',
      "Suppression d'un événement : ses billets, discussions et avis sont maintenant supprimés avec lui — aucune donnée orpheline",
      "Le fil d'accueil restera sans publicité : l'emplacement d'annonce (encore inactif) vit uniquement sur la page événement",
    ],
  },
  {
    version: '1.4.2',
    date: '2026-07-16',
    changes: [
      "Profil : la photo devient une couverture qui se replie en barre quand vous faites défiler — votre identité reste visible pendant la navigation",
      "Connexion : boutons Facebook et GitHub ajoutés (bientôt actifs) pour préparer plusieurs façons de se connecter avec un seul écran d'accueil clair",
      "Page événement : l'image se replie en barre au défilement et la section « Suggestions pour vous » propose 2 événements — un sponsorisé et un choisi selon vos centres d'intérêt, pour continuer à découvrir sans revenir en arrière",
      'Notifications : toucher une notification de message ouvre maintenant la conversation (ou votre liste de messages) — chaque notification mène à sa source',
      'Une seule identité visuelle partout : boutons arrondis et champs de saisie unifiés sur tous les écrans, y compris les formulaires de création et modification',
      'Politique de confidentialité publiée (site + Paramètres) : elle explique quelles données sont collectées, pourquoi, et comment les exporter ou les supprimer',
      "Événements en ligne : la ville n'est plus demandée — un événement en ligne n'a pas de lieu physique",
      'Cartes plus rapides : les chargements inutiles sont annulés pendant le déplacement, la carte suit votre doigt sans traîner',
      'Préparation des annonces : rien ne s\'affiche encore, et les comptes Premium ne verront jamais de publicité (avantage ajouté à la page Premium)',
    ],
  },
  {
    version: '1.4.1',
    date: '2026-07-16',
    changes: [
      'Correction : les centres d\'intérêt et la bio s\'affichent maintenant correctement sur le profil (ils étaient enregistrés mais pas relus)',
      'Événements en ligne : choisissez « En présentiel » ou « En ligne » à la création, avec lien visio — badge et bouton « Rejoindre en ligne » sur la page',
      'Page événement animée + section « Événements similaires » en bas (même catégorie et sponsorisés)',
      'Cartes : fond plus détaillé (lieux et repères connus) et zoom encadré',
      'Notifications repensées : cartes propres, couleur par type, heure alignée à droite',
      'Modifier le profil repensé : photo en grand, champs modernisés',
      'Profil : indicateur de complétion, photo modifiable d\'un tap, retour haptique sur les centres d\'intérêt',
    ],
  },
  {
    version: '1.4.0',
    date: '2026-07-15',
    changes: [
      'Nouvelle interface : connexion, accueil, page événement, profil et paramètres repensés pour rendre la découverte et l\'inscription plus rapides',
      "Accueil : barre de recherche, filtres par date (Aujourd'hui / Demain / Week-end) et catégories illustrées",
      'Carte des événements : le bouton « Voir la carte » affiche tous les événements géolocalisés autour de vous',
      "Profil : centres d'intérêt (à ajouter d'un tap), bio mise en avant, espace organisateur — tous les réglages regroupés dans un écran Paramètres",
      'Mise à jour directe : « Mettre à jour » télécharge la nouvelle version immédiatement, sans passer par le site web',
      'Site web repensé, avec badges Play Store / App Store (bientôt disponibles)',
    ],
  },
  {
    version: '1.3.5',
    date: '2026-07-12',
    changes: [
      'Supprimer une conversation privée (glisser vers la gauche) — elle réapparaît si l\'autre personne vous réécrit',
      'Toucher un nom ou une photo dans une discussion ouvre le profil de la personne',
      'Correction : le clavier ne se fermait plus après un envoi de message',
      'Les notifications (dans l\'app et sur le téléphone) ouvrent maintenant directement la discussion ou l\'événement concerné',
      'Plusieurs messages du même expéditeur sont regroupés en une seule notification au lieu d\'une par message',
      'La liste des messages se met à jour automatiquement, sans tirer pour rafraîchir',
    ],
  },
  {
    version: '1.3.4',
    date: '2026-07-12',
    changes: [
      "Nouveau : « Devenir Premium » (Profil et sur la liste des participants) explique les avantages premium et permet d'envoyer une demande à notre équipe — sans paiement, validée manuellement",
      'Cartes plus lisibles : fond épuré qui met les épingles en avant et s\'assombrit automatiquement en mode sombre',
    ],
  },
  {
    version: '1.3.3',
    date: '2026-07-12',
    changes: [
      'Recherche de lieu sur la carte : cherchez une adresse ou tapez sur la carte, le lieu choisi remplit automatiquement le champ « Lieu »',
      "Les organisateurs peuvent maintenant modifier leur événement (lieu, date, description, ville, catégorie, capacité, photo)",
      "Correction : les organisateurs ne voient plus le bouton « S'inscrire » sur leur propre événement (ils y sont déjà inscrits automatiquement)",
    ],
  },
  {
    version: '1.3.2',
    date: '2026-07-12',
    changes: [
      "Alerte de mise à jour envoyée aussi en notification système (barre de statut), même app fermée — avant, l'alerte n'apparaissait que si l'application était ouverte",
    ],
  },
  {
    version: '1.3.1',
    date: '2026-07-07',
    changes: [
      'Cartes : le lieu de l\'événement s\'affiche sur une carte (OpenStreetMap) et se choisit d\'un tap lors de la création',
      'Les groupes disparaissent complètement de l\'application (onglet Explorer retiré, Messages simplifié en Événements / Privé)',
      'Le bouton « Promouvoir » est maintenant aussi sur la page de l\'événement (pour son créateur)',
      'Statut premium vérifié en direct : couronne et messages privés actifs dès que l\'équipe vous passe premium, sans reconnexion',
      'L\'alerte de mise à jour vérifie aussi au retour de l\'application (pas seulement au démarrage)',
    ],
  },
  {
    version: '1.3.0',
    date: '2026-07-07',
    changes: [
      'Comptes Premium (attribués par l\'équipe) : couronne dorée à côté du nom',
      'Premium : voir la liste des participants d\'un événement (floutée sinon)',
      'Premium : messages privés — écrivez aux participants, ils peuvent répondre librement',
      'Premium : promouvoir votre événement en haut du fil avec le badge « Sponsorisé »',
      'Profils publics : nom, photo, description et ancienneté visibles par tous',
      'Photo de profil modifiable depuis « Modifier le profil »',
      'Discussions repensées : bulles, avatars, séparateurs de dates et envoi instantané, pour suivre une conversation d\'un coup d\'œil',
      'Notifications système sur le téléphone (barre de statut + pastille), même app fermée',
      'Création d\'événement simplifiée : la notion de groupe disparaît de l\'interface',
    ],
  },
  {
    version: '1.2.0',
    date: '2026-07-06',
    changes: [
      "Notifications dans l'application : inscriptions à vos événements et nouveaux messages",
      "Alerte de mise à jour avec lien de téléchargement quand une nouvelle version est disponible",
      'Journal des versions (Profil → Journal des versions)',
      "Création d'événement simplifiée : plus besoin de créer un groupe avant — il est créé automatiquement",
      'Correction : création d\'événement depuis le panneau admin (catégorie manquante)',
    ],
  },
  {
    version: '1.1.0',
    date: '2026-07-05',
    changes: [
      "Chat d'événement : chaque événement a sa discussion, ouverte aux inscrits et à l'organisateur",
      "L'organisateur est automatiquement inscrit à son propre événement (ticket déjà validé, sans scan)",
      'Photos pour les événements et les groupes (téléversées depuis la galerie)',
      'Filtre par catégorie corrigé sur l\'accueil : chaque événement a désormais sa catégorie',
      "Nouvelle icône de l'application et écran de démarrage (logo « L »)",
      'Mode sombre (Profil → Apparence : Système / Clair / Sombre)',
      'Corrections du panneau admin : écran gris après connexion, liens directs, déconnexion',
    ],
  },
  {
    version: '1.0.0',
    date: '2026-07-05',
    changes: [
      'Lancement de Lokl : plateforme communautaire marocaine (événements et groupes)',
      'Comptes : inscription, connexion, Google Sign-In, profil, langues FR / AR / EN',
      'Groupes : création, adhésion, recherche, chat de groupe',
      'Événements : création, inscription avec ticket QR, scan de billets par l\'organisateur',
      'Avis après événement (notes et commentaires)',
      'Panneau admin : utilisateurs, groupes, événements, tickets, paiements, modération, journal d\'audit',
      'Export de données personnelles et suppression de compte (conformité CNDP)',
      'Déploiement public : backend + admin + site sur Vercel, base MongoDB Atlas',
    ],
  },
];
