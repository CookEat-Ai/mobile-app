# Frigo → semaine protéinée

Parcours approuvé : entrée facultative depuis la configuration du planning, photo des ingrédients, reconnaissance réelle, correction des ingrédients, génération avec les préférences existantes, planning et courses.

Design : conserver crème/encre/jaune et les typographies CookEat. Photo carrée quadrillée, quatre coins de viseur, balayage jaune continu, compteur après réception des données, apparition successive des ingrédients avec retour haptique. La grille est un effet visuel : aucune boîte ne prétend localiser un aliment. Retour sans perte vers les réglages pour confirmer les jours et objectifs. Les ingrédients remontent via le stockage existant, puis deviennent les paramètres du générateur.

Pendant la génération : ingrédients au-dessus d’une grille de sept colonnes et quatre repas, jours non sélectionnés atténués, balayage tant que la requête est en attente. Aucun pourcentage ni protéines inventés. Validation du résultat avant passage en état terminé, puis révélation existante des véritables cartes repas. Réduction des animations et lecteur d’écran respectés. Échecs de reconnaissance et de stockage récupérables ; résultat vide permet de reprendre la photo.

Prévisualisation de développement : cookeat://dev/pantry-preview (résultat), ?state=scan, ?state=empty, ?state=week, ?state=ready. Données de démonstration uniquement sur cette route ; redirection en production.

Validation : TypeScript ; contrôle natif sur iPhone 16 Pro. Le serveur indique une maintenance dans le simulateur, ce qui empêche une vérification de reconnaissance et de génération réelles. Tester ensuite photo réelle, corrections, retour configuration, génération, détail et courses, Android, petit écran, grands caractères.
