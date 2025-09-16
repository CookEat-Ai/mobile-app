import { API_BASE_URL } from '../config/api';

export interface PromoCodeValidation {
  success: boolean;
  data?: {
    isValid: boolean;
    message?: string;
  };
  message?: string;
}

class PromoCodeService {
  /**
   * Valide un code promo
   */
  async validatePromoCode(code: string): Promise<PromoCodeValidation> {
    try {
      const response = await fetch(`${API_BASE_URL}/promo-code/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code }),
      });

      const result = await response.json();

      if (!response.ok) {
        return {
          success: false,
          message: result.message || 'Erreur lors de la validation du code promo'
        };
      }

      return result;
    } catch (error) {
      console.error('Erreur lors de la validation du code promo:', error);
      return {
        success: false,
        message: 'Erreur de connexion'
      };
    }
  }
}

export default new PromoCodeService();
