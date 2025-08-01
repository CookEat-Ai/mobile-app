import Purchases from 'react-native-purchases';

const checkSubscription = async () => {
  try {
    const customerInfo = await Purchases.getCustomerInfo();

    const isPremium = customerInfo.entitlements.active['premium'] !== undefined;

    if (isPremium) {
      console.log("Utilisateur abonné");
      // activer les features premium
    } else {
      console.log("Utilisateur NON abonné");
      // afficher le paywall ou rester en version gratuite
    }
  } catch (e) {
    console.error("Erreur lors de la vérification de l’abonnement", e);
  }
};