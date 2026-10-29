import type { ReactNode } from "react";
import Link from "next/link";
import { DATOS_LEGALES } from "@/app/privacidad/datos";
import { siteConfig } from "@/lib/site";

const ADDRESS = "Calle Mayor 1, 28013 Madrid, Spain";
const SCHEDULE = "Monday to Friday, 9:00 to 18:00";

export const PRIVACIDAD_EN = {
  titulo: "Privacy policy",
  resumen:
    "What personal data we process, on what legal basis, how long we keep it and how to exercise your rights.",
};

const fechaLarga = new Intl.DateTimeFormat("en-GB", {
  year: "numeric",
  month: "long",
  day: "numeric",
});

/**
 * Política de privacidad — versión EN.
 */
export function PrivacidadEn() {
  return (
    <div className="page-container max-w-3xl py-12">
      <header className="mb-10">
        <p className="section-eyebrow">Legal</p>
        <h1 className="mt-2 text-4xl font-extrabold tracking-tight text-ink-950">
          {PRIVACIDAD_EN.titulo}
        </h1>
        <p className="mt-2 text-sm text-ink-500">
          Last updated:{" "}
          {fechaLarga.format(new Date(DATOS_LEGALES.fechaActualizacion))}
        </p>
      </header>

      <div className="flex flex-col gap-10 text-base leading-7 text-ink-700">
        <section aria-labelledby="responsable">
          <h2
            id="responsable"
            className="mb-3 text-2xl font-extrabold tracking-tight text-ink-950"
          >
            1. Data controller
          </h2>
          <ul className="flex flex-col gap-1">
            <Dato termino="Trading name">Animemerchan S.L.</Dato>
            <Dato termino="Tax ID (CIF / NIF)">12341234X</Dato>
            <Dato termino="Registered office">C/ Jerez de la Cueva</Dato>
            <Dato termino="Business address">{ADDRESS}</Dato>
            <Dato termino="Email">
              <a
                href={`mailto:${siteConfig.email}`}
                className="font-medium text-brand-600 underline underline-offset-4 hover:text-brand-700"
              >
                {siteConfig.email}
              </a>
            </Dato>
            <Dato termino="Phone">{siteConfig.phone}</Dato>
            <Dato termino="Support hours">{SCHEDULE}</Dato>
            <Dato termino="AEPD registration">
              Spanish Data Protection Agency
            </Dato>
            <Dato termino="Data protection officer">
              Gerónimo Ferrández Martínez
            </Dato>
          </ul>
        </section>

        <section aria-labelledby="datos">
          <h2
            id="datos"
            className="mb-3 text-2xl font-extrabold tracking-tight text-ink-950"
          >
            2. What data we process
          </h2>
          <div className="flex flex-col gap-3">
            <ul className="flex flex-col gap-1">
              <li>
                <strong className="text-ink-900">Account data:</strong> email
                address, name, phone number and password. The password is stored
                encrypted and is never accessible, not to us nor to anyone with
                access to the database.
              </li>
              <li>
                <strong className="text-ink-900">Shipping address:</strong>{" "}
                street, postcode, city, province and country, as well as the
                recipient&apos;s name and phone number.
              </li>
              <li>
                <strong className="text-ink-900">Purchase data:</strong> ordered
                products, amounts, shipping address and order status.
              </li>
              <li>
                <strong className="text-ink-900">Payment data:</strong> only the
                transaction identifier, the amount and the method.{" "}
                <strong className="text-ink-900">
                  We do not store your full card details
                </strong>
                : they are processed directly by Stripe, our payment provider,
                which is certified under the PCI DSS standard.
              </li>
              <li>
                <strong className="text-ink-900">Wishlist:</strong> the products
                you save and when you saved them.
              </li>
              <li>
                <strong className="text-ink-900">
                  Technical browsing data:
                </strong>{" "}
                the cart session identifier, stored in a cookie so we can keep
                the items you have added even if you are not signed in.
              </li>
            </ul>
          </div>
        </section>

        <section aria-labelledby="finalidades">
          <h2
            id="finalidades"
            className="mb-3 text-2xl font-extrabold tracking-tight text-ink-950"
          >
            3. Why and on what legal basis
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-ink-300">
                  <th
                    scope="col"
                    className="px-3 py-2 font-semibold text-ink-900"
                  >
                    Purpose
                  </th>
                  <th
                    scope="col"
                    className="px-3 py-2 font-semibold text-ink-900"
                  >
                    Legal basis
                  </th>
                  <th
                    scope="col"
                    className="px-3 py-2 font-semibold text-ink-900"
                  >
                    Retention
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                <FilaFinalidad
                  finalidad="Create and maintain your account"
                  base="Performance of the contract (Art. 6.1.b GDPR)"
                  conservacion="As long as the account is active and, after closure, the statutory limitation period."
                />
                <FilaFinalidad
                  finalidad="Manage the shopping cart"
                  base="Performance of pre-contractual measures (Art. 6.1.b GDPR)"
                  conservacion="30 days from the last access, via a session cookie."
                />
                <FilaFinalidad
                  finalidad="Process the order, payment and shipping"
                  base="Performance of the contract (Art. 6.1.b GDPR)"
                  conservacion="Billing data is kept for the period legally required to evidence the transaction."
                />
                <FilaFinalidad
                  finalidad="Handle returns and refunds"
                  base="Performance of the contract (Art. 6.1.b GDPR)"
                  conservacion="The statutory return period and the liability period for defects."
                />
                <FilaFinalidad
                  finalidad="Answer enquiries and rights requests"
                  base="Legal obligation (Art. 6.1.c GDPR)"
                  conservacion="Until the request is resolved and, afterwards, the evidentiary retention period."
                />
                <FilaFinalidad
                  finalidad="Maintain security and prevent fraud"
                  base="Legitimate interest (Art. 6.1.f GDPR)"
                  conservacion="Access and order logs, until the account is deleted."
                />
                <FilaFinalidad
                  finalidad="Send you marketing communications"
                  base="Consent (Art. 6.1.a GDPR), withdrawable at any time"
                  conservacion="Until you withdraw your consent. We currently do not send newsletters."
                />
              </tbody>
            </table>
          </div>
        </section>

        <section aria-labelledby="destinatarios">
          <h2
            id="destinatarios"
            className="mb-3 text-2xl font-extrabold tracking-tight text-ink-950"
          >
            4. Who we share your data with
          </h2>
          <p className="mb-3">
            We do not sell your data or share it for purposes unrelated to this
            shop. We only use the processing operators we need to operate:
          </p>
          <ul className="flex flex-col gap-3">
            <Encargado
              nombre="Supabase"
              motivo="Account authentication, database hosting and storage of product images."
              enlaces="https://supabase.com/privacy"
            />
            <Encargado
              nombre="Stripe"
              motivo="Payment processing. Stripe acts as an independent processor and is the party that comes into contact with your card data."
              enlaces="https://stripe.com/es/legal/privacy"
            />
            <Encargado
              nombre="Vercel"
              motivo="Web hosting and running the server that serves the catalogue."
              enlaces="https://vercel.com/legal/privacy-policy"
            />
          </ul>
          <p className="mt-3 text-sm text-ink-500">
            If we add a shipping company in the future, we will update this list
            before their service is used.
          </p>
        </section>

        <section aria-labelledby="transferencias">
          <h2
            id="transferencias"
            className="mb-3 text-2xl font-extrabold tracking-tight text-ink-950"
          >
            5. International transfers
          </h2>
          <p>
            Some of the processors above may process data outside the European
            Economic Area. When they do, the transfers rely on an adequate
            safeguard: the European Commission&apos;s Adequacy Decision where
            the destination offers an adequate level of protection, or the
            European Commission&apos;s Standard Contractual Clauses together
            with supplementary measures where it does not.
          </p>
          <p className="mt-3">
            You can ask us for more information about the specific safeguards
            for each transfer by writing to{" "}
            <a
              href={`mailto:${siteConfig.email}`}
              className="font-medium text-brand-600 underline underline-offset-4 hover:text-brand-700"
            >
              {siteConfig.email}
            </a>
            .
          </p>
        </section>

        <section aria-labelledby="seguridad">
          <h2
            id="seguridad"
            className="mb-3 text-2xl font-extrabold tracking-tight text-ink-950"
          >
            6. How we protect your data
          </h2>
          <ul className="flex flex-col gap-1">
            <li>
              Your password is stored encrypted with a salted hash. Nobody, not
              even us, can read it.
            </li>
            <li>All website traffic is encrypted with TLS.</li>
            <li>
              Access to the database and the admin panel is restricted to
              authorised staff and protected by authentication and role-based
              access control.
            </li>
            <li>
              Your card data never touches our servers: Stripe handles it in a
              PCI DSS audited environment.
            </li>
          </ul>
        </section>

        <section aria-labelledby="derechos">
          <h2
            id="derechos"
            className="mb-3 text-2xl font-extrabold tracking-tight text-ink-950"
          >
            7. Your rights
          </h2>
          <p className="mb-3">
            You may exercise the following rights at any time:
          </p>
          <dl className="flex flex-col gap-3">
            <Derecho
              nombre="Access"
              texto="Know what data of yours we process and for what."
            />
            <Derecho
              nombre="Rectification"
              texto="Correct inaccurate or incomplete data, straight from your account."
            />
            <Derecho
              nombre="Erasure"
              texto="Ask us to delete your data. You can do it from “My account” or by writing to us."
            />
            <Derecho
              nombre="Objection"
              texto="Object to processing based on legitimate interest."
            />
            <Derecho
              nombre="Restriction"
              texto="Ask us to suspend processing while we verify whether it is lawful."
            />
            <Derecho
              nombre="Portability"
              texto="Receive your data in a structured, commonly used format."
            />
            <Derecho
              nombre="Withdrawal of consent"
              texto="Withdraw consent without affecting the lawfulness of the previous processing."
            />
          </dl>

          <div className="mt-6 rounded-card border border-ink-200 bg-ink-50/60 p-5">
            <h3 className="text-sm font-bold text-ink-900">
              How to exercise them
            </h3>
            <p className="mt-2 text-sm">
              Write to us at{" "}
              <a
                href={`mailto:${siteConfig.email}`}
                className="font-medium text-brand-600 underline underline-offset-4 hover:text-brand-700"
              >
                {siteConfig.email}
              </a>{" "}
              stating which right you want to exercise and the affected account.
              We reply within one month at the latest.
            </p>
            <p className="mt-2 text-sm">
              You can also do it{" "}
              <strong className="text-ink-900">
                without writing to us — straight from your account
              </strong>
              : in the admin panel you can export all your data to a file and
              request its deletion. You do not need to justify it.
            </p>
          </div>
        </section>

        <section aria-labelledby="reclamacion">
          <h2
            id="reclamacion"
            className="mb-3 text-2xl font-extrabold tracking-tight text-ink-950"
          >
            8. Complaints to the Spanish Data Protection Agency
          </h2>
          <p>
            If you believe we have not handled your request properly, you may
            lodge a complaint with the Spanish Data Protection Agency (AEPD):
          </p>
          <ul className="mt-3 flex flex-col gap-1">
            <li>
              Website:{" "}
              <a
                href="https://www.aepd.es"
                rel="noopener noreferrer"
                target="_blank"
                className="font-medium text-brand-600 underline underline-offset-4 hover:text-brand-700"
              >
                www.aepd.es
              </a>
            </li>
            <li>Address: Calle de Jorge Juan, 6, 28001 Madrid, Spain.</li>
            <li>Our registration: Spanish Data Protection Agency</li>
          </ul>
        </section>

        <section aria-labelledby="cookies">
          <h2
            id="cookies"
            className="mb-3 text-2xl font-extrabold tracking-tight text-ink-950"
          >
            9. Cookies
          </h2>
          <p>
            We use our own and third-party cookies. Full information on their
            type, purpose and duration is in the{" "}
            <Link
              href="/cookies"
              className="font-medium text-brand-600 underline underline-offset-4 hover:text-brand-700"
            >
              cookie policy
            </Link>
            .
          </p>
        </section>

        <section aria-labelledby="menores">
          <h2
            id="menores"
            className="mb-3 text-2xl font-extrabold tracking-tight text-ink-950"
          >
            10. Minors
          </h2>
          <p>
            This shop is intended for people over 18. We do not collect or
            process data from minors. If you believe a minor has given us data,
            write to us and we will delete it.
          </p>
        </section>

        <section aria-labelledby="cambios">
          <h2
            id="cambios"
            className="mb-3 text-2xl font-extrabold tracking-tight text-ink-950"
          >
            11. Changes to this policy
          </h2>
          <p>
            We will update this policy when the processing activities or the
            applicable regulations change. The date of the last update appears
            at the top of the document, and relevant changes will be announced
            prominently on the website.
          </p>
        </section>
      </div>
    </div>
  );
}

/* ── Helpers (espejo de los de page.tsx) ── */

function Dato({ termino, children }: { termino: string; children: ReactNode }) {
  return (
    <li>
      <strong className="text-ink-900">{termino}:</strong> {children}
    </li>
  );
}

function FilaFinalidad({
  finalidad,
  base,
  conservacion,
}: {
  finalidad: string;
  base: string;
  conservacion: string;
}) {
  return (
    <tr>
      <td className="border-b border-ink-100 px-3 py-2.5 align-top text-ink-800">
        {finalidad}
      </td>
      <td className="border-b border-ink-100 px-3 py-2.5 align-top text-ink-600">
        {base}
      </td>
      <td className="border-b border-ink-100 px-3 py-2.5 align-top text-ink-600">
        {conservacion}
      </td>
    </tr>
  );
}

function Encargado({
  nombre,
  motivo,
  enlaces,
}: {
  nombre: string;
  motivo: string;
  enlaces: string;
}) {
  return (
    <li>
      <strong className="text-ink-900">{nombre}.</strong> {motivo} See its{" "}
      <a
        href={enlaces}
        rel="noopener noreferrer"
        target="_blank"
        className="font-medium text-brand-600 underline underline-offset-4 hover:text-brand-700"
      >
        privacy policy
      </a>
      .
    </li>
  );
}

function Derecho({ nombre, texto }: { nombre: string; texto: string }) {
  return (
    <div>
      <dt className="font-semibold text-ink-900">{nombre}.</dt>
      <dd>{texto}</dd>
    </div>
  );
}
