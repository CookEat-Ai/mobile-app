import { PostHog } from 'posthog-react-native';
import { POSTHOG_API_KEY, POSTHOG_HOST } from '../config/posthog';
import { getUniqueDeviceId, rotateUniqueDeviceId } from './deviceStorage';
import { APP_ENVIRONMENT } from '../config/env';
import AsyncStorage from '@react-native-async-storage/async-storage';
import appsFlyerService, { FirstTouchAttribution } from './appsflyer';
import { requestTrackingPermissionsAsync } from 'expo-tracking-transparency';
import { Platform } from 'react-native';
import * as Localization from 'expo-localization';
import * as Sentry from '@sentry/react-native';
import Purchases from 'react-native-purchases';

export type OnboardingVariant = 'A' | 'B' | 'C' | 'D' | 'E' | 'F';

/**
 * Motif d'installation déclaré par l'utilisateur pendant l'onboarding.
 * Cette réponse complète l'attribution AppsFlyer : elle décrit l'intention
 * produit même lorsqu'aucune campagne ou aucun deep link n'est attribuable.
 */
export type EntryFeature = 'import' | 'generate';

/** Première action produit réellement accomplie, quelle que soit l'intention déclarée. */
export type FirstAction = 'import' | 'generate';

const ENTRY_FEATURE_KEY = 'entry_feature';
const FIRST_ACTION_KEY = 'first_action';
const USED_FEATURES_KEY = 'used_features';
const ONBOARDING_COMPLETED_KEY = 'onboarding_completed';
const ONBOARDING_COMPLETED_TRACKED_KEY = '@cookeat_onboarding_completed_tracked';

type PendingEvent = {
  eventName: string;
  properties?: Record<string, any>;
};

/**
 * Variante d'onboarding forcée pour tous les utilisateurs.
 * `null` = répartition normale via le feature flag PostHog `onboarding-variant`.
 * Les variantes non retenues restent implémentées, simplement inatteignables.
 */
const FORCED_ONBOARDING_VARIANT: OnboardingVariant | null = 'C';

class AnalyticsService {
  private posthog: PostHog | null = null;
  private isInitialized = false;
  private userId: string | null = null;
  private canonicalUserId: string | null = null;
  private posthogIdentifiedUserId: string | null = null;
  private posthogReady = false;
  private initPromise: Promise<string | null> | null = null;
  private identityRevision = 0;
  private identitySync: Promise<void> = Promise.resolve();
  private entryFeature: EntryFeature | null = null;
  private attributionUnsubscribe: (() => void) | null = null;
  private deepLinkUnsubscribe: (() => void) | null = null;
  private pendingEvents: PendingEvent[] = [];
  private trackingPermissionPromise: Promise<void> | null = null;
  private readonly FIRST_RUN_KEY = '@cookeat_first_run';

  init(): Promise<string | null> {
    if (this.isInitialized) return Promise.resolve(this.canonicalUserId);
    if (!this.initPromise) {
      this.initPromise = this.initialize().finally(() => { this.initPromise = null; });
    }
    return this.initPromise;
  }

  private async initialize(): Promise<string | null> {
    const revision = this.identityRevision;
    try {
      const storedUserId = await AsyncStorage.getItem('userId');
      const uniqueId = await getUniqueDeviceId();
      if (revision === this.identityRevision) this.canonicalUserId = storedUserId;
      this.userId = this.canonicalUserId;

      if (POSTHOG_API_KEY && !POSTHOG_API_KEY.includes('YOUR_POSTHOG')) {
        this.posthog = new PostHog(POSTHOG_API_KEY, {
          host: POSTHOG_HOST,
        });

        await this.posthog.ready();
        this.posthogReady = true;
        // Migration locale du démarrage précédent : un ID d'installation ne
        // doit jamais être une identité PostHog déjà identifiée.
        if (!this.canonicalUserId && this.posthog.getDistinctId() === uniqueId) {
          this.posthog.reset();
        }
        this.identifyPostHogUser();
        this.userId = this.canonicalUserId || this.posthog.getDistinctId();

        const languageCode = Localization.getLocales()?.[0]?.languageCode || 'en';
        this.posthog.setPersonProperties({
          user_language: languageCode,
          app_environment: APP_ENVIRONMENT,
        });
        await this.posthog.register({ app_environment: APP_ENVIRONMENT });

        console.log('✅ PostHog initialisé');
      }

      this.userId ||= uniqueId; // Fallback local si PostHog est désactivé.

      // Le motif d'installation est rechargé avant tout event pour que chaque
      // event de la session le porte, y compris ceux émis avant que
      // l'utilisateur ne repasse par l'onboarding.
      const storedEntryFeature = await AsyncStorage.getItem(ENTRY_FEATURE_KEY);
      if (storedEntryFeature === 'import' || storedEntryFeature === 'generate') {
        this.entryFeature = storedEntryFeature;
        this.registerSuperProperties({ entry_feature: storedEntryFeature });
      }

      if (!this.attributionUnsubscribe) {
        this.attributionUnsubscribe = appsFlyerService.onFirstTouchAttribution((attribution) =>
          this.applyFirstTouchAttribution(attribution, true),
        );
      }

      if (!this.deepLinkUnsubscribe) {
        this.deepLinkUnsubscribe = appsFlyerService.onDeepLinkAttribution((attribution) =>
          this.track('appsflyer_deep_link_resolved', attribution),
        );
      }

      const storedAttribution = await appsFlyerService.getFirstTouchAttribution();
      if (storedAttribution) {
        await this.applyFirstTouchAttribution(storedAttribution, false);
      }

      // PostHog ne doit pas attendre la fenêtre ATT d'AppsFlyer. À partir d'ici,
      // les événements produit sont capturés immédiatement ; AppsFlyer possède
      // sa propre file d'attente jusqu'à la fin de son initialisation native.
      const hasRunBefore = await AsyncStorage.getItem(this.FIRST_RUN_KEY);
      if (!hasRunBefore) {
        await AsyncStorage.setItem(this.FIRST_RUN_KEY, 'true');
        await this.captureEvent('first_open');
      }

      // first_open précède toujours les écrans mis en attente au démarrage.
      this.isInitialized = true;
      await this.flushPendingEvents();

      // Lire l'identité courante ici : le serveur peut l'avoir fournie pendant
      // l'initialisation. Aucun ID capturé avant un await ne doit la remplacer.
      await appsFlyerService.init(this.userId || undefined);
      await this.enqueueIdentitySync();

      return this.canonicalUserId;
    } catch (error) {
      console.error('❌ Erreur initialisation Analytics:', error);
      return null;
    }
  }

  async requestTrackingPermission(): Promise<void> {
    if (this.trackingPermissionPromise) return this.trackingPermissionPromise;

    this.trackingPermissionPromise = (async () => {
      try {
        const { status } = await requestTrackingPermissionsAsync();
        console.log(`[Analytics] ${Platform.OS} Tracking Status requested: ${status}`);

        // Après la réponse ATT, on redemande aux SDK natifs les identifiants
        // autorisés puis on relie l'AppsFlyer UID au profil PostHog commun.
        await this.enqueueIdentitySync();
      } catch (error) {
        console.error('❌ Erreur demande permission tracking:', error);
      }
    })();

    return this.trackingPermissionPromise;
  }

  async track(eventName: string, properties?: Record<string, any>) {
    if (!this.isInitialized) {
      this.pendingEvents.push({ eventName, properties });
      console.log(`[Analytics - Queued] Event: ${eventName}`, properties);
      return;
    }

    await this.captureEvent(eventName, properties);
  }

  private async captureEvent(eventName: string, properties?: Record<string, any>): Promise<void> {
    // Récupérer la variante actuelle pour l'ajouter à chaque événement
    const variant = await this.getOnboardingVariant();
    const enrichedProperties = {
      ...properties,
      onboarding_variant: variant,
      // Doublonne volontairement la super property : elle garantit la présence
      // de la dimension même si l'utilisateur a répondu avant que PostHog ne
      // soit initialisé, et permet de segmenter côté AppsFlyer aussi.
      ...(this.entryFeature ? { entry_feature: this.entryFeature } : {}),
    };

    // PostHog Tracking
    if (this.posthog) {
      this.posthog.capture(eventName, enrichedProperties);
    } else {
      console.log(`[PostHog - Mock] Event: ${eventName}`, enrichedProperties);
    }

    // AppsFlyer Tracking
    const afEventName = this.mapToAppsFlyerEvent(eventName);
    if (afEventName) {
      appsFlyerService.trackEvent(afEventName, enrichedProperties);
    }
  }

  private mapToAppsFlyerEvent(eventName: string): string | null {
    const mapping: Record<string, string> = {
      'onboarding_completed': 'af_tutorial_completion',
      'first_action_completed': 'af_achievement_unlocked',
      'recipe_generated': 'af_content_view',
      // Une vue de paywall n'est pas encore une intention de paiement. Ce
      // signal ne part qu'au clic qui ouvre réellement la feuille du store.
      'purchase_started': 'af_initiated_checkout'
    };
    // RevenueCat envoie les achats/essais/renouvellements à AppsFlyer côté
    // serveur. Ne pas renvoyer `subscription_started` évite un second signal
    // client susceptible d'être mappé deux fois vers TikTok.
    return mapping[eventName] ?? null;
  }

  private async flushPendingEvents(): Promise<void> {
    const pending = this.pendingEvents.splice(0);
    for (const event of pending) {
      await this.track(event.eventName, event.properties);
    }
  }

  /**
   * Termine l'onboarding et émet la conversion une seule fois par installation.
   * Tous les parcours (achat, restauration, promo intégrale) passent par cette
   * méthode afin que l'état local et les analytics ne puissent plus diverger.
   */
  async completeOnboarding(properties?: Record<string, any>): Promise<void> {
    await AsyncStorage.setItem(ONBOARDING_COMPLETED_KEY, 'true');

    const alreadyTracked = await AsyncStorage.getItem(ONBOARDING_COMPLETED_TRACKED_KEY);
    if (alreadyTracked === 'true') return;

    await AsyncStorage.setItem(ONBOARDING_COMPLETED_TRACKED_KEY, 'true');
    await this.track('onboarding_completed', properties);
  }

  /** Identité serveur uniquement ; l'identité d'installation reste anonyme. */
  async identify(userId: string): Promise<void> {
    const canonicalId = userId.trim();
    if (!canonicalId) return;
    if (this.canonicalUserId !== canonicalId) this.identityRevision++;
    this.canonicalUserId = canonicalId;
    this.userId = canonicalId;
    this.identifyPostHogUser();
    const revision = this.identityRevision;
    await appsFlyerService.setCustomerUserId(canonicalId);
    if (revision !== this.identityRevision) return;
    await this.enqueueIdentitySync();
  }

  getCanonicalUserId(): string | null {
    return this.canonicalUserId;
  }

  getPostHogDistinctId(): string | null {
    return this.posthogReady ? this.posthog!.getDistinctId() : this.canonicalUserId;
  }

  private identifyPostHogUser(): void {
    if (!this.posthogReady || !this.posthog || !this.canonicalUserId) return;
    if (this.posthogIdentifiedUserId && this.posthogIdentifiedUserId !== this.canonicalUserId) {
      // Un véritable changement de compte ne fusionne jamais deux personnes.
      this.posthog.reset();
      this.restorePostHogContext();
    }
    if (this.posthogIdentifiedUserId !== this.canonicalUserId) {
      this.posthog.identify(this.canonicalUserId);
      this.posthogIdentifiedUserId = this.canonicalUserId;
    }
  }

  /** Sérialise les mutations RevenueCat ; ignore les résultats d'une ancienne identité. */
  private enqueueIdentitySync(resetRevenueCat = false): Promise<void> {
    const revision = this.identityRevision;
    const sync = this.identitySync.then(async () => {
      if (revision !== this.identityRevision) return;
      await appsFlyerService.init(this.userId || undefined);
      if (revision !== this.identityRevision) return;
      const appsFlyerUID = await appsFlyerService.getAppsFlyerUID();
      if (revision !== this.identityRevision) return;
      this.applyCrossToolIdentity(appsFlyerUID);
      const attribution = await appsFlyerService.getFirstTouchAttribution();
      if (revision !== this.identityRevision) return;
      if (attribution && this.posthogReady && this.posthog) {
        this.posthog.setPersonProperties({}, { ...attribution });
        this.registerSuperProperties({ ...attribution });
      }
      await this.syncRevenueCatIdentity(revision, appsFlyerUID, resetRevenueCat);
    }).catch(error => {
      console.warn('⚠️ Identité analytics non synchronisée:', error);
    });
    this.identitySync = sync;
    return sync;
  }

  /** Coupe les liens avec le compte supprimé et revient à un vrai profil anonyme. */
  async resetIdentity(options: {
    rotateDeviceId?: boolean;
    clearAttribution?: boolean;
  } = {}): Promise<string> {
    const revision = ++this.identityRevision;
    this.canonicalUserId = null;
    this.posthogIdentifiedUserId = null;
    this.userId = null;
    this.entryFeature = null;
    this.pendingEvents = [];
    if (this.posthogReady && this.posthog) {
      this.posthog.reset();
      this.restorePostHogContext();
    }
    Sentry.setUser(null);

    const installationId = options.rotateDeviceId
      ? await rotateUniqueDeviceId()
      : await getUniqueDeviceId();
    if (revision !== this.identityRevision) return this.userId || installationId;
    this.userId = this.getPostHogDistinctId() || installationId;
    await appsFlyerService.resetCustomerIdentity(this.userId, options.clearAttribution ?? false);
    if (revision === this.identityRevision) await this.enqueueIdentitySync(true);
    return this.userId || installationId;
  }

  private restorePostHogContext(): void {
    this.posthog?.setPersonProperties({
      user_language: Localization.getLocales()?.[0]?.languageCode || 'en',
      app_environment: APP_ENVIRONMENT,
    });
    this.registerSuperProperties({ app_environment: APP_ENVIRONMENT });
  }

  private applyCrossToolIdentity(appsFlyerUID: string | null): void {
    const properties = {
      canonical_user_id: this.canonicalUserId,
      ...(appsFlyerUID ? { appsflyer_id: appsFlyerUID } : {}),
    };
    if (this.posthogReady && this.posthog) {
      // Ajouter des attributs ne doit jamais réidentifier l'utilisateur.
      this.posthog.setPersonProperties(properties);
      this.registerSuperProperties(properties);
    }
    Sentry.setUser(this.canonicalUserId ? {
      id: this.canonicalUserId,
      ...(appsFlyerUID ? { appsflyer_id: appsFlyerUID } : {}),
    } : null);
  }

  private async syncRevenueCatIdentity(
    revision: number,
    appsFlyerUID: string | null,
    resetAnonymous = false,
  ): Promise<void> {
    try {
      if (!(await Purchases.isConfigured()) || revision !== this.identityRevision) return;
      const currentAppUserId = await Purchases.getAppUserID();
      if (revision !== this.identityRevision) return;
      if (this.canonicalUserId && currentAppUserId !== this.canonicalUserId) {
        await Purchases.logIn(this.canonicalUserId);
      } else if (resetAnonymous && !this.canonicalUserId && !(await Purchases.isAnonymous())) {
        if (revision !== this.identityRevision) return;
        await Purchases.logOut();
      }
      if (revision !== this.identityRevision) return;
      const attributionAttributes = await appsFlyerService.getRevenueCatAttributionAttributes();
      if (revision !== this.identityRevision) return;
      const posthogId = this.getPostHogDistinctId();
      await Purchases.setAttributes({
        ...(posthogId ? { $posthogUserId: posthogId } : {}),
        ...(appsFlyerUID ? { $appsflyerId: appsFlyerUID } : {}),
        ...attributionAttributes,
      });
      if (revision !== this.identityRevision) return;
      // Les SDK respectent ATT/LAT ; aucun identifiant publicitaire n'est forcé.
      await Purchases.collectDeviceIdentifiers();
    } catch (error) {
      console.warn('⚠️ Identité RevenueCat non synchronisée:', error);
    }
  }

  private async applyFirstTouchAttribution(
    attribution: FirstTouchAttribution,
    captureResolvedEvent: boolean,
  ) {
    const posthogAttribution = { ...attribution } as Record<string, string | boolean>;

    if (this.posthog) {
      // Les propriétés d'acquisition sont immuables côté profil. Elles restent
      // ainsi cohérentes pour le calcul de LTV, même après un retargeting.
      this.posthog.setPersonProperties({}, posthogAttribution);
      this.registerSuperProperties(posthogAttribution);

      if (captureResolvedEvent) {
        this.posthog.capture('appsflyer_attribution_resolved', posthogAttribution);
      }
    }

    // Si RevenueCat est déjà configuré, les dimensions sont immédiatement
    // disponibles sur les prochains achats. Sinon initialize() les rejouera.
    try {
      if (!(await Purchases.isConfigured())) return;
      const attributes = await appsFlyerService.getRevenueCatAttributionAttributes();
      if (Object.keys(attributes).length > 0) {
        await Purchases.setAttributes(attributes);
      }
    } catch {
      // RevenueCat n'est pas encore initialisé au tout premier lancement.
    }
  }

  setUserProperties(properties: Record<string, any>) {
    if (this.posthog && this.isInitialized) {
      // Dans PostHog, on utilise identify pour lier des propriétés ou capture avec $set
      this.posthog.setPersonProperties(properties);
    }
  }

  setCountry(countryCode: string) {
    this.setUserProperties({ user_country: countryCode });
  }

  /**
   * Attache des propriétés à *chaque* event suivant, figées au moment de l'émission.
   * Contrairement aux person properties (« dernière valeur connue »), ça permet
   * de segmenter un funnel historique sans que la valeur soit réécrite après coup.
   */
  private registerSuperProperties(properties: Record<string, any>) {
    if (!this.posthog) return;
    this.posthog.register(properties).catch((error) => {
      console.error('❌ Erreur enregistrement super properties:', error);
    });
  }

  /**
   * Enregistre le motif d'installation déclaré. À n'appeler qu'une fois, depuis
   * la question de segmentation de l'onboarding.
   */
  async setEntryFeature(feature: EntryFeature, properties?: Record<string, any>) {
    this.entryFeature = feature;
    try {
      await AsyncStorage.setItem(ENTRY_FEATURE_KEY, feature);
    } catch (error) {
      console.error('❌ Erreur sauvegarde entry_feature:', error);
    }
    this.registerSuperProperties({ entry_feature: feature });
    this.setUserProperties({ entry_feature: feature });
    await this.track('onboarding_entry_feature_selected', {
      entry_feature: feature,
      ...properties,
    });
  }

  async getEntryFeature(): Promise<EntryFeature | null> {
    if (this.entryFeature) return this.entryFeature;
    try {
      const stored = await AsyncStorage.getItem(ENTRY_FEATURE_KEY);
      if (stored === 'import' || stored === 'generate') {
        this.entryFeature = stored;
        return stored;
      }
    } catch (error) {
      console.error('❌ Erreur lecture entry_feature:', error);
    }
    return null;
  }

  /**
   * Mémorise qu'une feature a été réellement utilisée au moins une fois.
   * Sert au cross-sell in-app (proposer la feature que l'utilisateur n'a jamais
   * essayée) et à mesurer l'adoption croisée des deux features.
   */
  async markFeatureUsed(feature: FirstAction) {
    try {
      const used = await this.getUsedFeatures();
      if (used.includes(feature)) return;

      const next = [...used, feature];
      await AsyncStorage.setItem(USED_FEATURES_KEY, JSON.stringify(next));
      this.setUserProperties({ used_features: next, uses_both_features: next.length > 1 });
    } catch (error) {
      console.error('❌ Erreur sauvegarde used_features:', error);
    }
  }

  async getUsedFeatures(): Promise<FirstAction[]> {
    try {
      const raw = await AsyncStorage.getItem(USED_FEATURES_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  /**
   * Enregistre la première action produit réellement accomplie. Idempotent :
   * les appels suivants sont ignorés, pour que la propriété reste comparable à
   * `entry_feature` (intention déclarée) et révèle les écarts entre les deux.
   */
  async trackFirstAction(action: FirstAction, properties?: Record<string, any>) {
    try {
      const existing = await AsyncStorage.getItem(FIRST_ACTION_KEY);
      if (existing) return;
      await AsyncStorage.setItem(FIRST_ACTION_KEY, action);
    } catch (error) {
      console.error('❌ Erreur sauvegarde first_action:', error);
      return;
    }

    const declared = await this.getEntryFeature();
    this.setUserProperties({ first_action: action, activated_feature: action });
    await this.track('first_action_completed', {
      first_action: action,
      declared_entry_feature: declared,
      matches_declared_intent: declared ? declared === action : null,
      ...properties,
    });
  }

  async getFeatureFlag(flagName: string): Promise<string | boolean | undefined> {
    if (this.posthog && this.isInitialized) {
      return this.posthog.getFeatureFlag(flagName);
    }
    return undefined;
  }

  async getOnboardingVariant(): Promise<OnboardingVariant> {
    // A/B test temporairement gelé : tout le monde suit le tunnel long variante C.
    // Pour réactiver le test, repasser FORCED_ONBOARDING_VARIANT à null.
    if (FORCED_ONBOARDING_VARIANT) return FORCED_ONBOARDING_VARIANT;

    if (__DEV__) return 'F';

    if (this.posthog && this.isInitialized) {
      // On s'assure que les propriétés (comme user_language) sont envoyées 
      // avant de demander le flag pour garantir le ciblage correct
      await this.posthog.flush().catch(() => { });
    }

    const variant = await this.getFeatureFlag('onboarding-variant');
    console.log('🔍 [Analytics] Onboarding Variant:', variant);
    if (variant === 'control' || variant === 'A') return 'A';
    if (variant === 'B') return 'B';
    if (variant === 'D') return 'D';
    if (variant === 'E') return 'E';
    if (variant === 'F') return 'F';
    return 'C';
  }

  async getLuckyWheelVariant(): Promise<'A' | 'B'> {
    const variant = await this.getFeatureFlag('lucky-wheel-variant');
    // PostHog Experiments utilisent 'test' pour la variante et 'control' pour le témoin
    if (variant === 'test' || variant === 'B') return 'B';
    return 'A'; // 'control', 'A' ou undefined retournent 'A'
  }
}

const analytics = new AnalyticsService();
export default analytics;
