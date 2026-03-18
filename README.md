# CookEat AI - Mobile App 🍳🥗

Bienvenue dans le dépôt de l'application mobile **CookEat AI**. Cette application multi-plateforme est développée avec [Expo](https://expo.dev) et React Native.

Elle permet aux utilisateurs de trouver des recettes intelligemment en fonction de ce qu'ils ont dans leur cuisine grâce à l'IA.

## ✨ Fonctionnalités Mobile

- **Reconnaissance Photo** : Utilise l'IA pour identifier les ingrédients via la caméra.
- **Saisie Vocale** : Reconnaissance vocale intégrée pour énumérer vos ingrédients.
- **Abonnements** : Gestion des abonnements Premium via RevenueCat.
- **Notifications** : Rappels personnalisés et suggestions quotidiennes.

## 🛠️ Pour commencer

1.  **Installer les dépendances** :

    ```bash
    npm install
    ```

2.  **Lancer l'application localement** :

    ```bash
    npx expo start
    ```

    Options disponibles dans l'interface de lancement :
    - [Build de développement](https://docs.expo.dev/develop/development-builds/introduction/)
    - [Émulateur Android](https://docs.expo.dev/workflow/android-studio-emulator/)
    - [Simulateur iOS](https://docs.expo.dev/workflow/ios-simulator/)
    - [Expo Go](https://expo.dev/go)

3.  **Tests unitaires et lints** :

    ```bash
    npm test
    npm run lint
    ```

## 📱 Plateformes Supportées

- **iOS** : [Télécharger sur l'App Store](https://apps.apple.com/fr/app/cookeat-ai/id6748924011)
- **Android** : [Télécharger sur le Play Store](https://play.google.com/store/apps/details?id=com.gokugen.cookeat)

## 📁 Structure du Dossier App

Le projet utilise le [routage basé sur les fichiers](https://docs.expo.dev/router/introduction) (Expo Router) dans le dossier `app/`.

- `app/(tabs)/` : Pages principales de l'application (navigation par onglets).
- `services/` : Intégrations API et services tiers (Sentry, Appsflyer, RevenueCat).
- `assets/` : Ressources graphiques (icônes, images, polices personnalisées).

---
*Plus d'informations sur [Expo Documentation](https://docs.expo.dev/).*
