"use client";

import * as React from "react";
import { HONEYPOT_FIELD, TIMESTAMP_FIELD } from "@/lib/security/honeypot";

/**
 * I due campi invisibili della trappola anti-bot, da inserire in ogni modulo
 * pubblico. Vedi `lib/security/honeypot.ts` per il ragionamento.
 *
 * COME SI NASCONDE, E PERCHÉ NON CON `display: none`:
 * i compilatori automatici più accorti ignorano i campi con `display:none` o
 * `visibility:hidden`, proprio perché è il modo ovvio di fare una trappola.
 * Qui il campo esiste nel flusso, ha dimensione zero e sta fuori dallo schermo:
 * per uno script è un campo normale, per un browser non c'è.
 *
 * ACCESSIBILITÀ: `aria-hidden` lo toglie dall'albero dei lettori di schermo e
 * `tabIndex={-1}` dal percorso di tabulazione, così nessuna persona ci finisce
 * dentro per sbaglio. `autoComplete="off"` evita che un gestore di password lo
 * compili da solo, che sarebbe l'unico falso positivo realistico.
 */
export function HoneypotField() {
  // L'istante di apertura si fissa al montaggio e non cambia più: serve a
  // misurare quanto tempo è passato prima dell'invio.
  const [apertoAlle] = React.useState(() => Date.now());

  return (
    <div
      aria-hidden="true"
      style={{
        position: "absolute",
        width: 1,
        height: 1,
        overflow: "hidden",
        clip: "rect(0 0 0 0)",
        whiteSpace: "nowrap",
        border: 0,
        padding: 0,
        margin: -1,
      }}
    >
      <label htmlFor={HONEYPOT_FIELD}>
        Non compilare questo campo
        <input
          id={HONEYPOT_FIELD}
          name={HONEYPOT_FIELD}
          type="text"
          tabIndex={-1}
          autoComplete="off"
          defaultValue=""
        />
      </label>
      <input
        type="hidden"
        name={TIMESTAMP_FIELD}
        value={String(apertoAlle)}
        readOnly
      />
    </div>
  );
}

/**
 * Variante per i moduli gestiti da react-hook-form, dove i valori non arrivano
 * dal `FormData` nativo ma dallo stato della libreria.
 *
 * Si usa così, passando il `register` del form:
 *
 *   <HoneypotFields register={register} setValue={setValue} />
 *
 * ...e i due campi finiscono nell'oggetto passato alla server action come
 * qualunque altro valore.
 */
export function HoneypotFields({
  register,
}: {
  register: (name: string) => Record<string, unknown>;
}) {
  const [apertoAlle] = React.useState(() => Date.now());

  return (
    <div
      aria-hidden="true"
      style={{
        position: "absolute",
        width: 1,
        height: 1,
        overflow: "hidden",
        clip: "rect(0 0 0 0)",
        whiteSpace: "nowrap",
        border: 0,
        padding: 0,
        margin: -1,
      }}
    >
      <label htmlFor={HONEYPOT_FIELD}>
        Non compilare questo campo
        <input
          id={HONEYPOT_FIELD}
          type="text"
          tabIndex={-1}
          autoComplete="off"
          {...register(HONEYPOT_FIELD)}
        />
      </label>
      <input type="hidden" value={String(apertoAlle)} {...register(TIMESTAMP_FIELD)} />
    </div>
  );
}
