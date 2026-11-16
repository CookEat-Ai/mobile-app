# Suivi photo — contrat courant

Révision du 20 octobre 2026 : photo en tête, bilan arrondi, ajout automatique au journal, compositions personnelles réutilisables et renouvellement après le dernier jour choisi.

## Parcours et présentation

« Je photographie mon assiette, puis sa photo et ses aliments restent dans mon bilan nutritionnel. »

La route `tracking/capture` utilise une seule surface animée. La caméra commence en bottom sheet ; dès que le vrai résultat arrive, la même surface s’agrandit en conservant un retrait supérieur et ses coins arrondis de bottom sheet. Le bilan possède une unique zone de défilement contenant la photo et les aliments.

1. Avant la réponse, la photo originale remplace le flux de caméra et le scanner parcourt la photo figée. Aucun bilan n’est inventé pendant l’analyse.
2. À l’arrivée du résultat, `PhotoMealReview` s’ouvre dans toute la surface disponible. Pendant la révélation, son titre, l’état de reconnaissance, la photo, les nutriments, les aliments et le bouton en cours appartiennent tous au même `ScrollView`.
3. Les contours restent dans la photo ; les fragments rejoignent la cible de reconnaissance et chaque arrivée complète les vrais nutriments. La photo reste la première section du bilan, en pleine largeur et sans cadre propre. Son recadrage `cover` et sa hauteur reprennent la fiche recette (40 % de l’écran sur téléphone, 32 % sur tablette). Le contenu crème forme une fiche aux coins supérieurs arrondis, légèrement superposée à la photo. Ses coordonnées et celles de la cible sont remesurées au défilement.
4. L’animation ne gouverne plus indéfiniment l’utilisabilité : une interruption ou un callback manquant révèle les données réelles déjà reçues. Chaque étape est bornée, avec une limite globale de 12 secondes. Fermer invalide les callbacks et annule les délais. La réduction des animations et le passage en arrière-plan révèlent directement le résultat, sans le rejouer au retour.
5. Le bouton « Passer » est supprimé. Pendant et après la révélation, la photo, le titre, les valeurs, les aliments et l’action principale restent dans le même défilement.
6. Les corrections d’aliments et de nutriments restent disponibles à la fin, avant et après enregistrement. Une erreur d’analyse conserve la photo et propose une reprise ; une erreur d’enregistrement conserve toutes les corrections.

Les dates, streaks et repas enregistrés restent locaux et séparés par utilisateur.

## Catégorie du repas

L’analyse IA renvoie `mealType` et une raison courte fondée sur les aliments et la présentation. Elle ne reçoit aucune consigne pour choisir selon l’heure et ne doit utiliser ni horloge, nom de fichier ni EXIF. Petit déjeuner, collation, déjeuner ou dîner correspondent à la nature probable du plat ; déjeuner/dîner restent une inférence quand l’image ne permet pas de les distinguer.

Le client utilise cette catégorie ; le serveur la conserve même si une requête propose une autre catégorie. Un repas déjà enregistré conserve sa catégorie lors d’une modification. L’heure ne sert plus qu’à dater la capture et à déterminer le jour du journal.

## Nutrition et catalogue

La vision estime aliments et poids ; le serveur calcule les nutriments depuis les références, en distinguant poids cuits et crus/secs. Si la composition exacte manque, il utilise un profil alimentaire approximatif adapté (notamment sauces crémeuses, tomate, vinaigrette, mayonnaise, yaourt et sauces sucrées). Chaque composant détecté contribue au total final ; aucune sauce n’est écartée ou laissée à zéro pour faute de référence exacte. Les profils portent `nutritionEstimated=true` et une provenance `COOKEAT_ESTIMATE`, distincte des compositions vérifiées. Les aliments et quantités restent corrigeables manuellement ou via le chatbot, avant et après enregistrement. Les estimations de composition ne sont pas publiées comme des recettes à nutrition vérifiée. Voir [les règles et tests des estimations](../features/tracking-estimates-2026-10-20.md).

Les plats éligibles sont automatiquement ajoutés à la file privée après confirmation du repas ; aucune photo personnelle ne devient un asset public. La version de collecte du nouveau client est `tracking-confirmation-v1`. Le workflow manuel Codex avec l’abonnement GPT produit ensuite une nouvelle photo et requiert une vraie revue avant publication. Voir `api/docs/photo-recipes-manual-codex.md`.

## Vérification

Les captures des révisions précédentes sont historiques. La validation courante est décrite dans [le contrôle du bilan avec photo conservée](qa/photo-retained-2026-10-20/README.md). Les captures plus anciennes avec photo masquée sont historiques. Les tests du contrôleur vérifient aussi que la photo se fige avant la compression et qu’une exception réseau permet de réessayer.

[Compte rendu et captures natives du 20 octobre](qa/frozen-scanner-2026-10-20/README.md). Les animations sont rejouées avec une réponse réelle préenregistrée ; cette validation ne prétend pas être une nouvelle capture physique ou un nouveau test de vision IA.

## Ajout sans photo — 20 octobre 2026

Le journal propose « Ajouter sans photo », même lorsqu’il contient déjà des repas. La caméra propose aussi « Sans photo », sauf dans la démo photo de l’onboarding ; elle est remplacée par la route `tracking/manual`, sans empiler une seconde caméra.

Le formulaire réutilise `PhotoMealReview`, ses références alimentaires, ses quantités, son résumé nutritionnel et ses contrôles partagés. Il ne nécessite ni autorisation caméra, ni scan, ni confirmation photo serveur. L’utilisateur choisit la catégorie, ajoute ses aliments et corrige leurs poids ; le premier aliment préremplit le titre, qui reste modifiable. Les ingrédients sont directement visibles. Un formulaire vide ne montre pas de bilan partiel. L’ajout est bloqué sans catégorie, sans titre, sans aliment référencé ou avec une quantité hors de 1–2000 g.

La date est celle sélectionnée dans le journal (dont les jours précédents accessibles dans la semaine), et reste affichée dans le formulaire. Les dates invalides ou futures transmises à la route reviennent à aujourd’hui. Le chemin photo depuis le journal conserve également le jour sélectionné.

Les entrées portent `source: manual`, sans photo artificielle ni statut catalogue. Elles utilisent le même stockage local par utilisateur, les mêmes totaux, streaks, modifications et suppressions. Les anciennes entrées photo restent compatibles. Une modification conserve l’identifiant, la date et la date de création ; un double appui ne crée pas de doublon. Une erreur d’enregistrement conserve la saisie et permet de réessayer.

Rôles UI : fond/cartes/textes et bouton secondaire dans `AppTheme`, fermeture dans `NavigationIconButton`, recherche dans `AppModal`, récapitulatif et champs dans `PhotoMealReview`. Les appels photo existants réutilisent le même composant, avec leur photo et leur catégorie d’analyse.

Validation automatique : `yarn test:meal-tracking` inclut recherche sans photo, sélection de catégorie, quantités invalides, calcul des totaux, date antérieure, erreur/reprise, double appui, modification persistée, suppression et isolation utilisateur. `yarn test:photo-reveal` couvre le parcours photo, dont l’ajout automatique décrit ci-dessous. TypeScript et ESLint ciblé complètent ces contrôles (aucune erreur ; deux avertissements de nettoyage de refs déjà présents). Exports Hermes iOS et Android réussis dans `/tmp/cookeat-manual-export`.

Validation visuelle : non confirmée sur iOS/Android pour cette extension. Le binaire iOS de QA se lance avec Metro, mais l’interface Device Hub est inaccessible via l’automatisation (expiration de lecture d’accessibilité) ; aucun émulateur Android n’était lancé. Le rendu web de l’app complète est bloqué par l’import natif existant `ExpoTrackingTransparency`. Ces limites ne constituent pas une preuve de parité visuelle ; caméra → formulaire, recherche modale, clavier et retour journal restent à observer sur les deux plateformes.

## Aliments libres et valeurs modifiables — 20 octobre 2026

« Créer un aliment » permet de saisir un nom, un poids consommé et quatre valeurs : calories, protéines, glucides, lipides. Ce chemin reste accessible sans résultat de recherche et hors connexion. Chaque aliment, reconnu ou libre, propose le même éditeur. Les valeurs saisies correspondent à la portion indiquée ; sa composition est conservée proportionnellement lorsque le poids change. Les zéros et décimales avec virgule sont acceptés ; les champs vides, valeurs négatives ou non finies bloquent l’application. Annuler ferme le formulaire sans modifier les données.

« Modifier le total du repas » ouvre les quatre valeurs globales, indépendamment des aliments. Un repas manuel peut être enregistré avec son titre, sa catégorie et ses valeurs, sans détailler ses aliments. Le total personnalisé est persisté dans `nutritionOverride` et utilisé dans le journal. « Recalculer depuis les aliments » le retire ; toute modification des aliments le retire également, comme indiqué dans l’interface. Une modification du titre seule conserve le total.

L’éditeur réutilise les champs, actions et fermeture partagés. Il occupe le même `AppModal` que la recherche, avec remplacement de son contenu : aucun second modal local n’est empilé. Pendant la révélation photo, toutes les actions de modification restent bloquées.

Les valeurs personnalisées portent `nutritionEdited` et `sourceId: USER_PROVIDED`. L’API accepte seulement les compositions explicitement marquées et validées, les conserve à la confirmation photo et pendant une correction de quantité par chat. Les valeurs non marquées continuent de provenir des références serveur. Les valeurs saisies à la main et les totaux remplacés ne peuvent pas alimenter une recette du catalogue à nutrition vérifiée.

Vérifications : tests du formulaire (virgules, zéro, champs vides, nombres négatifs), aliment hors liste, modification d’un aliment reconnu/libre, proportionnalité des quantités, sauvegarde/relecture, total personnalisé, retour au calcul, repas sans ingrédients, confirmation API et maintien des compositions lors d’une correction par chat. Le bilan en cours et le résultat final sont désormais observés sur iOS avec une fixture. Les gestes de défilement, le clavier, le grand texte, le remplacement recherche/éditeur et le rendu Android restent à observer. TypeScript app et API, ESLint ciblé (sans erreur), tests du journal/photo/chat et exports Hermes iOS/Android ont réussi. Aucune publication ni opération de production n’est incluse.

## Ajout automatique et valeurs par défaut — dernière correction du 20 octobre 2026

Une analyse exploitable (aliment, catégorie, titre, quantités et composition valides) déclenche immédiatement la confirmation et l’enregistrement dans le jour sélectionné, sans attendre la fin de l’animation ni un appui. Le CTA devient « Voir ma journée » et laisse le bilan ouvert jusqu’à cet appui. Un échec affiche une reprise ; un résultat non alimentaire ne crée aucune entrée.

Un contrôleur sérialise les écritures par scan : confirmation initiale, copie privée de la photo puis upsert du journal. Les corrections sont regroupées sur 350 ms ; le CTA et la fermeture terminent également l’enregistrement courant. Une modification conserve l’identifiant, la photo, la date et la création. Elle ne soumet pas une seconde recette au catalogue. Les tests vérifient concurrence, double appui, fermeture avant le délai, reprise après erreur et modifications d’anciennes entrées.

« Appliquer » dans l’éditeur d’un aliment enregistre sa composition par 100 g dans un stockage personnel séparé du journal. La recherche retrouve aussi les aliments libres hors connexion. La prochaine sélection ou analyse utilise ces valeurs pour cette référence ; une détection sans référence peut réutiliser un aliment libre au nom identique. Un aliment reconnu conserve sa référence stable, même si son libellé est corrigé. L’historique n’est jamais recalculé. Modifier uniquement les quatre totaux du repas reste propre à cette entrée et ne change aucun aliment.

Le changement est local au compte/appareil, comme le journal actuel ; aucune synchronisation entre appareils n’est ajoutée. Une erreur de stockage laisse l’éditeur ouvert et conserve les valeurs précédentes.

## Fin réelle d’un planning

Le dernier jour est le plus tardif des jours configurés et occupés. Dès le lendemain dans le calendrier local, l’accueil propose un nouveau planning ; l’ancien reste dans l’historique et son détail propose aussi la création. Les jours configurés restent pris en compte après suppression de leurs repas. Les anciens plannings à horizon enregistré de sept jours sont évalués avec leurs jours réels ; seuls ceux sans métadonnées de jours conservent leur date de fin sauvegardée. L’affichage reste actif jusqu’à la fin du dernier jour, y compris après 22 h.

L’API écrit désormais cette fin réelle et l’utilise aussi pour la lecture courante. Les résumés d’historique incluent `preferences.cookingDays`. App et API partagent exactement `planning-time.ts`. Les règles Premium et la restauration de l’aperçu gratuit restent appliquées.

Validation finale : tests du journal, des valeurs par défaut, de la révélation et de l’ajout automatique, de l’organisation/renouvellement et de la configuration du planning ; tests API de restauration, lecture courante, planification, photo, chat et rappels. TypeScript app/API et exports Hermes iOS/Android réussis. ESLint ciblé sans erreur (avertissements sur des compteurs de génération en cleanup). Rendu photo et contours observés sur iOS avec une fixture ; gestes, clavier, grand texte et rendu Android non observés pour cette dernière révision. Aucun déploiement de production.
