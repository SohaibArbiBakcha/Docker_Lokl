# Lokl — Landing page (téléchargement APK)

Page statique unique (`index.html`, aucun build) avec le bouton de
téléchargement pointant vers `lokl.apk` dans ce même dossier.

Cette page est déployée avec le back-office en **un seul site Netlify** :
`npm run build:site` (racine du repo) assemble `site/` avec la landing à `/`,
le back-office à `/admin` et l'APK à `/lokl.apk`. Voir `../DEPLOYMENT.md` Step 4.

## Mettre à jour l'APK

L'APK est **gitignoré** (binaire ~34 Mo, rien à faire dans l'historique git).
Pour (re)générer celui distribué au public, l'URL de l'API doit être l'URL
publique du backend (Render), pas celle de dev :

```bash
cd ../mobile
flutter build apk --release \
  --dart-define=API_BASE_URL=https://VOTRE-BACKEND.onrender.com/api/v1 \
  --dart-define=GOOGLE_SERVER_CLIENT_ID=885554850806-5rakajfpqd8rp03d72b28in6lm089pvj.apps.googleusercontent.com
cp build/app/outputs/flutter-apk/app-release.apk ../landing/lokl.apk
cd .. && npm run build:site   # ré-assemble site/ avec le nouvel APK
```

⚠️ Tant que vous n'avez pas de keystore de release (voir `../DEPLOYMENT.md`),
l'APK est signé avec la clé de debug : installable pour les tests, mais la
connexion Google exige que le SHA-1 de la clé utilisée soit déclaré sur le
client OAuth Android — le SHA-1 debug de cette machine l'est déjà.

## Déployer

Le plus simple (l'APK n'étant pas dans git) : [app.netlify.com/drop](https://app.netlify.com/drop)
→ glissez-déposez le dossier **`site/`** (pas `landing/`). Chaque mise à jour
= re-lancer `npm run build:site` puis re-glisser `site/`.
