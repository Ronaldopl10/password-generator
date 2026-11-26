/**
 * Cliente único de Dodo Payments.
 *
 * Se crea en el primer uso, no al importar el módulo: un build o un test sin
 * variables de entorno no puede romperse por importar este archivo.
 */

import DodoPayments from "dodopayments";

import { readDodoConfig } from "./env";

let client: DodoPayments | null = null;

/** Cliente compartido, configurado para el entorno actual de Dodo. */
export function getDodoClient(): DodoPayments {
  if (client === null) {
    const config = readDodoConfig();

    client = new DodoPayments({
      bearerToken: config.apiKey,
      environment: config.environment,
      webhookKey: config.webhookKey,
    });
  }

  return client;
}
