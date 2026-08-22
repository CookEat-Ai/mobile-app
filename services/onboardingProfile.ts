import AsyncStorage from '@react-native-async-storage/async-storage';
import type { EntryFeature } from './analytics';

/**
 * Profil dérivé des réponses d'onboarding.
 *
 * Ce module est la *seule* source de vérité pour tout ce que l'onboarding
 * affiche de personnalisé : preuve sociale contextuelle, engagement daté et
 * projection. Les écrans ne calculent rien eux-mêmes, ils consomment ce qui est
 * produit ici. Deux raisons :
 *
 * 1. Les chiffres affichés à l'utilisateur sont des promesses commerciales. Ils
 *    doivent tous être modifiables depuis un seul endroit (`TUNING` et
 *    `COMMUNITY_STATS` ci-dessous) le jour où on a de la vraie donnée.
 * 2. La branche import et la branche generate partagent le même objectif
 *    déclaré (`useCase`) : la logique de projection doit être commune, seule la
 *    formulation change.
 */

/** Horizon de la projection et de l'engagement, en jours. */
export const PROJECTION_HORIZON_DAYS = 30;

/**
 * Objectif de l'utilisateur, dérivé de `useCase`.
 *
 * C'est la question la plus importante du tunnel : on ne sait pas encore
 * pourquoi les gens installent CookEat (économiser, manquer d'idées, ranger
 * leurs recettes...). Tout le reste de l'onboarding s'aligne sur cette réponse,
 * et PostHog peut segmenter la conversion par objectif.
 */
export type OnboardingGoal = 'waste' | 'money' | 'ideas' | 'organize' | 'time' | 'healthy';

export const USE_CASE_TO_GOAL: Record<string, OnboardingGoal> = {
  usecase_leftovers: 'waste',
  usecase_money: 'money',
  usecase_ideas: 'ideas',
  usecase_organize: 'organize',
  usecase_time: 'time',
  usecase_healthy: 'healthy',
};

/** Objectif retenu quand la question n'a pas (encore) de réponse. */
export const DEFAULT_GOAL: OnboardingGoal = 'ideas';

export type OnboardingProfile = {
  goal: OnboardingGoal;
  /** Permet de distinguer le vrai choix `ideas` du repli générique. */
  hasGoalAnswer: boolean;
  branch: EntryFeature | null;
  cookingForWho: string | null;
  cookingLevel: string | null;
  cookingFrequency: string | null;
  eatOutFrequency: string | null;
  cookingTime: string | null;
  mealBudget: string | null;
  importVolume: string | null;
  importSources: string[];
  importPain: string | null;
};

/**
 * Clé sous laquelle `analytics.setEntryFeature` persiste la branche. C'est la
 * source de vérité depuis que le choix se fait sur l'écran d'accueil ; la clé
 * `entryFeature` reste lue en second pour les tunnels commencés avant.
 */
const ANALYTICS_ENTRY_FEATURE_KEY = 'entry_feature';

const PROFILE_KEYS = [
  'useCase',
  'entryFeature',
  ANALYTICS_ENTRY_FEATURE_KEY,
  'cookingForWho',
  'cookingLevel',
  'cookingFrequency',
  'eatOutFrequency',
  'cookingTime',
  'mealBudget',
  'importVolume',
  'importSources',
  'importPain',
] as const;

/** Les questions `multi` sont stockées en JSON ; les autres en chaîne brute. */
const parseMulti = (raw: string | null): string[] => {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [raw];
  } catch {
    return [raw];
  }
};

export async function loadOnboardingProfile(): Promise<OnboardingProfile> {
  const pairs = await AsyncStorage.multiGet([...PROFILE_KEYS]);
  const map = Object.fromEntries(pairs) as Record<string, string | null>;

  // `'none'` est la valeur écrite quand une question optionnelle est passée :
  // la traiter comme une réponse fausserait les multiplicateurs.
  const read = (key: string) => (map[key] && map[key] !== 'none' ? map[key] : null);

  const branch = read(ANALYTICS_ENTRY_FEATURE_KEY) ?? read('entryFeature');

  const useCase = read('useCase');

  return {
    goal: USE_CASE_TO_GOAL[useCase ?? ''] ?? DEFAULT_GOAL,
    hasGoalAnswer: useCase !== null && USE_CASE_TO_GOAL[useCase] !== undefined,
    branch: branch === 'import' || branch === 'generate' ? branch : null,
    cookingForWho: read('cookingForWho'),
    cookingLevel: read('cookingLevel'),
    cookingFrequency: read('cookingFrequency'),
    eatOutFrequency: read('eatOutFrequency'),
    cookingTime: read('cookingTime'),
    mealBudget: read('mealBudget'),
    importVolume: read('importVolume'),
    importSources: parseMulti(map['importSources'] ?? null),
    importPain: read('importPain'),
  };
}

/* -------------------------------------------------------------------------- */
/*  Paramétrage des chiffres projetés                                          */
/* -------------------------------------------------------------------------- */

/**
 * Bases mensuelles par objectif, et multiplicateurs appliqués selon le profil.
 *
 * Les bases sont calées sur des ordres de grandeur publics et volontairement
 * conservateurs :
 *   - gaspillage : l'ADEME chiffre ~30 kg et ~150 € par personne et par an, soit
 *     ~12,5 € et ~2,5 kg par mois. On reste en dessous.
 *   - courses : ~10 % d'un budget d'épicerie individuel moyen.
 *   - temps : l'interstitiel du tunnel annonce ~1h par semaine passée à décider
 *     quoi manger — les deux chiffres doivent rester cohérents.
 *
 * Elles restent des estimations : les écrans les présentent comme un *objectif
 * personnel*, jamais comme un résultat garanti ni comme une moyenne constatée.
 *
 * ⚠️ À réviser dès qu'on a de la donnée d'usage réelle.
 */
export const TUNING = {
  base: {
    waste: { euros: 12, kg: 2.2 },
    money: { euros: 24 },
    ideas: { recipes: 16 },
    organize: { recipes: 20 },
    time: { hours: 5 },
    healthy: { meals: 18 },
  },
  /** Un foyer plus grand gaspille et cuisine plus : le gain potentiel suit. */
  household: {
    myself: 1,
    myself_and_another_person: 1.6,
    my_family: 2.3,
  } as Record<string, number>,
  /** Un gros budget par repas donne plus à économiser en valeur absolue. */
  budget: {
    budget_small: 0.85,
    budget_medium: 1,
    budget_large: 1.3,
  } as Record<string, number>,
  /** Manger dehors souvent = plus de marge de progression sur l'argent et le temps. */
  eatOut: {
    almost_never: 0.85,
    '1_2_times': 1,
    '3_4_times': 1.2,
    more_than_4_times: 1.45,
  } as Record<string, number>,
  /** Cuisiner souvent = plus de recettes générées / rangées sur le mois. */
  cookingFrequency: {
    rarely: 0.7,
    occasionally: 1,
    frequently: 1.3,
  } as Record<string, number>,
  /** Volume de recettes sauvegardées, déclaré par la branche import. */
  importVolume: {
    import_volume_few: 0.7,
    import_volume_some: 1,
    import_volume_many: 1.5,
    import_volume_chaos: 2,
  } as Record<string, number>,
} as const;

/**
 * Chiffres présentés comme venant de la communauté CookEat.
 *
 * ⚠️ PLACEHOLDERS. Tant que l'app n'a pas d'utilisateurs, ce sont des
 * hypothèses. Deux options le jour où c'est un sujet :
 *   - les remplacer par les vrais chiffres (requête PostHog / Mongo) ;
 *   - passer `SHOW_COMMUNITY_PROOF` à `false` : les écrans basculent alors
 *     automatiquement sur la variante « stat publique » (source ADEME) ou sur
 *     la reformulation de la réponse de l'utilisateur, sans rien casser.
 */
export const SHOW_COMMUNITY_PROOF = true;

export const COMMUNITY_STATS = {
  /** Part des utilisateurs déclarant le même objectif, par objectif. */
  goalShare: {
    waste: 41,
    money: 37,
    ideas: 58,
    organize: 34,
    time: 46,
    healthy: 29,
  } as Record<OnboardingGoal, number>,
  /** Part des utilisateurs qui déclarent jeter de la nourriture chaque semaine. */
  wasteWeekly: 68,
  /** Part des utilisateurs qui ne retrouvent pas une recette déjà sauvegardée. */
  lostRecipes: 73,
  /** Nombre de recettes importées, affiché sur l'écran de preuve import. */
  importedRecipes: 10000,
} as const;

/* -------------------------------------------------------------------------- */
/*  Projection                                                                 */
/* -------------------------------------------------------------------------- */

export type ProjectionUnit = 'eur' | 'kg' | 'recipes' | 'hours' | 'meals';

export type Projection = {
  goal: OnboardingGoal;
  /** Valeur principale atteinte à l'horizon. */
  value: number;
  unit: ProjectionUnit;
  /** Métrique secondaire, affichée en sous-titre quand elle existe. */
  secondary?: { value: number; unit: ProjectionUnit };
  targetDate: Date;
  /** Courbe de progression, du jour 0 à l'horizon. Sert au graphique. */
  series: number[];
};

const multiplier = (table: Record<string, number>, key: string | null) =>
  (key && table[key]) || 1;

/** Arrondi « présentable » : pas de 37,4 € affiché à l'utilisateur. */
const roundValue = (value: number, unit: ProjectionUnit) => {
  if (unit === 'eur') return Math.round(value);
  if (unit === 'hours') return Math.round(value * 2) / 2;
  if (unit === 'kg') return Math.round(value * 10) / 10;
  return Math.round(value);
};

/**
 * Courbe d'adoption : légèrement concave (on progresse vite au début, puis on
 * plafonne). Une droite donnerait un graphique plat et peu crédible.
 */
const buildSeries = (target: number, points = 6) =>
  Array.from({ length: points }, (_, i) => {
    const t = i / (points - 1);
    return target * Math.pow(t, 0.72);
  });

export function getProjection(profile: OnboardingProfile, now: Date = new Date()): Projection {
  const household = multiplier(TUNING.household, profile.cookingForWho);
  const budget = multiplier(TUNING.budget, profile.mealBudget);
  const eatOut = multiplier(TUNING.eatOut, profile.eatOutFrequency);
  const frequency = multiplier(TUNING.cookingFrequency, profile.cookingFrequency);
  const importVolume = multiplier(TUNING.importVolume, profile.importVolume);

  const targetDate = new Date(now);
  targetDate.setDate(targetDate.getDate() + PROJECTION_HORIZON_DAYS);

  let value: number;
  let unit: ProjectionUnit;
  let secondary: Projection['secondary'];

  switch (profile.goal) {
    case 'waste':
      value = TUNING.base.waste.euros * household * budget;
      unit = 'eur';
      secondary = {
        value: roundValue(TUNING.base.waste.kg * household, 'kg'),
        unit: 'kg',
      };
      break;
    case 'money':
      value = TUNING.base.money.euros * household * budget * eatOut;
      unit = 'eur';
      break;
    case 'ideas':
      value = TUNING.base.ideas.recipes * frequency;
      unit = 'recipes';
      break;
    case 'organize':
      // Le volume déclaré ne concerne que la branche import ; il vaut 1 ailleurs.
      value = TUNING.base.organize.recipes * importVolume * frequency;
      unit = 'recipes';
      break;
    case 'time':
      // Pas de multiplicateur de foyer : décider quoi cuisiner prend le même
      // temps qu'on soit une ou quatre personnes à table.
      value = TUNING.base.time.hours * eatOut * frequency;
      unit = 'hours';
      break;
    case 'healthy':
      // On compte des repas préparés, pas des assiettes servies : le nombre de
      // fois où l'on cuisine ne dépend pas non plus de la taille du foyer.
      value = TUNING.base.healthy.meals * frequency;
      unit = 'meals';
      break;
  }

  const rounded = roundValue(value, unit);

  return {
    goal: profile.goal,
    value: rounded,
    unit,
    secondary,
    targetDate,
    series: buildSeries(rounded),
  };
}

/* -------------------------------------------------------------------------- */
/*  Preuve sociale contextuelle                                                */
/* -------------------------------------------------------------------------- */

/** Emplacements où une preuve est intercalée entre deux questions. */
export type ProofKey = 'goal' | 'habits' | 'budget' | 'import';

export type ProofContent = {
  /** Clé i18n du bandeau au-dessus du titre. */
  badgeKey: string;
  /** Clé i18n du titre. Les nombres qu'il contient sont mis en avant. */
  titleKey: string;
  /** Clé i18n de la ligne de contexte sous le titre. */
  subtitleKey: string;
  /** Valeurs d'interpolation i18n. */
  values: Record<string, string | number>;
  /** Clé i18n de l'avis affiché en carte, ou `null` pour n'en afficher aucun. */
  reviewKey: string | null;
};

/**
 * Contenu de l'écran de preuve, choisi d'après la réponse qui vient d'être
 * donnée. Chaque emplacement a une variante « communauté » (chiffre CookEat) et
 * une variante de repli sans chiffre communautaire, utilisée quand
 * `SHOW_COMMUNITY_PROOF` est désactivé.
 */
export function getProofContent(key: ProofKey, profile: OnboardingProfile): ProofContent {
  const community = SHOW_COMMUNITY_PROOF;

  switch (key) {
    case 'goal':
      return {
        badgeKey: 'onboarding.proof.goal.badge',
        titleKey: community
          ? `onboarding.proof.goal.${profile.goal}.title`
          : `onboarding.proof.goal.${profile.goal}.titleNeutral`,
        subtitleKey: `onboarding.proof.goal.${profile.goal}.subtitle`,
        values: { percent: COMMUNITY_STATS.goalShare[profile.goal] },
        reviewKey: `onboarding.proof.goal.${profile.goal}.review`,
      };

    case 'habits':
      return {
        badgeKey: 'onboarding.proof.habits.badge',
        // Quelqu'un qui commande souvent n'a pas le même levier que quelqu'un
        // qui cuisine tous les soirs : la stat affichée change de sujet.
        titleKey:
          profile.eatOutFrequency === '3_4_times' ||
          profile.eatOutFrequency === 'more_than_4_times'
            ? 'onboarding.proof.habits.eatOut.title'
            : 'onboarding.proof.habits.home.title',
        subtitleKey:
          profile.eatOutFrequency === '3_4_times' ||
          profile.eatOutFrequency === 'more_than_4_times'
            ? 'onboarding.proof.habits.eatOut.subtitle'
            : 'onboarding.proof.habits.home.subtitle',
        values: { percent: COMMUNITY_STATS.wasteWeekly },
        reviewKey: community ? 'onboarding.proof.habits.review' : null,
      };

    case 'budget':
      return {
        badgeKey: 'onboarding.proof.budget.badge',
        titleKey: `onboarding.proof.budget.${profile.mealBudget ?? 'budget_medium'}.title`,
        subtitleKey: 'onboarding.proof.budget.subtitle',
        values: {
          euros: roundValue(
            TUNING.base.waste.euros * multiplier(TUNING.household, profile.cookingForWho),
            'eur'
          ),
        },
        reviewKey: community ? 'onboarding.proof.budget.review' : null,
      };

    case 'import':
      return {
        badgeKey: 'onboarding.proof.import.badge',
        titleKey: community
          ? 'onboarding.proof.import.title'
          : 'onboarding.proof.import.titleNeutral',
        subtitleKey: 'onboarding.proof.import.subtitle',
        values: {
          percent: COMMUNITY_STATS.lostRecipes,
          count: COMMUNITY_STATS.importedRecipes,
        },
        reviewKey: 'onboarding.proof.import.review',
      };
  }
}
