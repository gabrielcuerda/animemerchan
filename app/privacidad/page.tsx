import type { Metadata } from "next";
import Link from "next/link";
import {
  DATOS_LEGALES,
  HAY_PENDIENTES,
  Pendiente,
  RESUMEN,
  TITULO,
} from "@/app/privacidad/datos";
import { fechaEnEspañol } from "@/lib/admin/formato";
import { getLang } from "@/lib/i18n/lang";
import { PRIVACIDAD_EN, PrivacidadEn } from "@/lib/i18n/privacidad.en";
import { siteConfig } from "@/lib/site";

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getLang();
  const title = lang === "en" ? PRIVACIDAD_EN.titulo : TITULO;
  const description = lang === "en" ? PRIVACIDAD_EN.resumen : RESUMEN;
  return {
    title,
    description,
    openGraph: { title, description, type: "article" },
  };
}

/**
 * Política de privacidad (LOPD y RGPD).
 */
export default async function PoliticaPrivacidadPage() {
  const lang = await getLang();
  if (lang === "en") return <PrivacidadEn />;
  return <PoliticaPrivacidadEs />;
}

function PoliticaPrivacidadEs() {
  return (
    <div className="page-container max-w-3xl py-12">
      <header className="mb-10">
        <p className="section-eyebrow">Legal</p>
        <h1 className="mt-2 text-4xl font-extrabold tracking-tight text-ink-950">
          {TITULO}
        </h1>
        <p className="mt-2 text-sm text-ink-500">
          Última actualización:{" "}
          {fechaEnEspañol(DATOS_LEGALES.fechaActualizacion)}
        </p>
      </header>

      <div className="flex flex-col gap-10 text-base leading-7 text-ink-700">
        <section aria-labelledby="responsable">
          <h2
            id="responsable"
            className="mb-3 text-2xl font-extrabold tracking-tight text-ink-950"
          >
            1. Responsable del tratamiento
          </h2>
          <ul className="flex flex-col gap-1">
            <Dato termino="Nombre comercial">{"Animemerchan S.L. "}</Dato>
            <Dato termino="CIF / NIF">12341234X</Dato>
            <Dato termino="Domicilio fiscal">C/ Jerez de la Cueva</Dato>
            <Dato termino="Domicilio comercial">{siteConfig.address}</Dato>
            <Dato termino="Correo electrónico">
              <a
                href={`mailto:${siteConfig.email}`}
                className="font-medium text-brand-600 underline underline-offset-4 hover:text-brand-700"
              >
                {siteConfig.email}
              </a>
            </Dato>
            <Dato termino="Teléfono">{siteConfig.phone}</Dato>
            <Dato termino="Horario de atención">{siteConfig.schedule}</Dato>
            <Dato termino="Registro en la AEPD">
              Dirección de la Agencia Española de Protección de Datos
            </Dato>
            <Dato termino="Delegado de protección de datos">
              Gerónimo Ferrández Martínez
            </Dato>
          </ul>
        </section>

        <section aria-labelledby="datos">
          <h2
            id="datos"
            className="mb-3 text-2xl font-extrabold tracking-tight text-ink-950"
          >
            2. Qué datos tratamos
          </h2>
          <div className="flex flex-col gap-3">
            <ul className="flex flex-col gap-1">
              <li>
                <strong className="text-ink-900">Datos de cuenta:</strong>{" "}
                correo electrónico, nombre, teléfono y contraseña. La contraseña
                se almacena cifrada y nunca es accesible, ni para nosotros ni
                para nadie que acceda a la base de datos.
              </li>
              <li>
                <strong className="text-ink-900">Dirección de envío:</strong>{" "}
                calle, código postal, ciudad, provincia y país, así como el
                nombre y teléfono del destinatario.
              </li>
              <li>
                <strong className="text-ink-900">Datos de compra:</strong>{" "}
                productos pedidos, importes, dirección de envío y estado del
                pedido.
              </li>
              <li>
                <strong className="text-ink-900">Datos de pago:</strong>{" "}
                únicamente el identificador de la transacción, el importe y el
                método.{" "}
                <strong className="text-ink-900">
                  No almacenamos los datos completos de tu tarjeta
                </strong>
                : los trata directamente Stripe, nuestro proveedor de pagos, que
                está certificado según el estándar PCI DSS.
              </li>
              <li>
                <strong className="text-ink-900">Lista de deseos:</strong> los
                productos que guardas y cuándo los guardaste.
              </li>
              <li>
                <strong className="text-ink-900">
                  Datos técnicos de navegación:
                </strong>{" "}
                el identificador de sesión del carrito, que se guarda en una
                cookie para poder mantener los productos que has añadido aunque
                no tengas cuenta iniciada.
              </li>
            </ul>
          </div>
        </section>

        <section aria-labelledby="finalidades">
          <h2
            id="finalidades"
            className="mb-3 text-2xl font-extrabold tracking-tight text-ink-950"
          >
            3. Para qué y con qué base legal
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-ink-300">
                  <th
                    scope="col"
                    className="px-3 py-2 font-semibold text-ink-900"
                  >
                    Finalidad
                  </th>
                  <th
                    scope="col"
                    className="px-3 py-2 font-semibold text-ink-900"
                  >
                    Base legal
                  </th>
                  <th
                    scope="col"
                    className="px-3 py-2 font-semibold text-ink-900"
                  >
                    Conservación
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                <FilaFinalidad
                  finalidad="Crear y mantener tu cuenta"
                  base="Ejecución del contrato (art. 6.1.b RGPD)"
                  conservacion="Mientras la cuenta esté activa y, tras la baja, el plazo de prescripción legal."
                />
                <FilaFinalidad
                  finalidad="Gestionar el carrito de la compra"
                  base="Ejecución de medidas precontractuales (art. 6.1.b RGPD)"
                  conservacion="30 días desde el último acceso, mediante una cookie de sesión."
                />
                <FilaFinalidad
                  finalidad="Procesar el pedido, el pago y el envío"
                  base="Ejecución del contrato (art. 6.1.b RGPD)"
                  conservacion="Los datos de facturación se conservan el plazo legalmente exigible para acreditar la operación."
                />
                <FilaFinalidad
                  finalidad="Gestionar devoluciones y reimbursos"
                  base="Ejecución del contrato (art. 6.1.b RGPD)"
                  conservacion="El plazo legal de devolución y el de responsabilidad por vicios."
                />
                <FilaFinalidad
                  finalidad="Atender consultas y solicitudes de derechos"
                  base="Obligación legal (art. 6.1.c RGPD)"
                  conservacion="Hasta resolver la solicitud y, después, el plazo de acreditación."
                />
                <FilaFinalidad
                  finalidad="Mantener la seguridad y prevenir el fraude"
                  base="Interés legítimo (art. 6.1.f RGPD)"
                  conservacion="Registros de acceso y dePedido, mientras no se borre la cuenta."
                />
                <FilaFinalidad
                  finalidad="Enviarte comunicaciones comerciales"
                  base="Consentimiento (art. 6.1.a RGPD), retirable en cualquier momento"
                  conservacion="Hasta que retires tu consentimiento. Hoy no enviamos newsletters."
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
            4. Con quién compartimos tus datos
          </h2>
          <p className="mb-3">
            No vendemos tus datos ni los cedemos con fines ajenos a los de esta
            tienda. Únicamente los usamos encargados de tratamiento que nos
            hacen falta para operar:
          </p>
          <ul className="flex flex-col gap-3">
            <Encargado
              nombre="Supabase"
              motivo="Autenticación de cuentas, alojamiento de la base de datos y almacenamiento de las imágenes de producto."
              enlaces="https://supabase.com/privacy"
            />
            <Encargado
              nombre="Stripe"
              motivo="Procesamiento de los pagos. Stripe actúa como encargado independiente y es quien entra en contacto con los datos de tu tarjeta."
              enlaces="https://stripe.com/es/legal/privacy"
            />
            <Encargado
              nombre="Vercel"
              motivo="Alojamiento de la web y ejecución del servidor que sirve el catálogo."
              enlaces="https://vercel.com/legal/privacy-policy"
            />
          </ul>
          <p className="mt-3 text-sm text-ink-500">
            Si en el futuro añadimos a la empresa de envíos, actualizaremos esta
            lista antes de que se use su servicio.
          </p>
        </section>

        <section aria-labelledby="transferencias">
          <h2
            id="transferencias"
            className="mb-3 text-2xl font-extrabold tracking-tight text-ink-950"
          >
            5. Transferencias internacionales
          </h2>
          <p>
            Algunos de los encargados anteriores pueden tratar datos fuera del
            Espacio Económico Europeo. Cuando lo hacen, las transferencias se
            apoyan en una garantía adecuada: la Decisión de Adecuación de la
            Comisión Europea cuando el destino tiene nivel adecuado de
            protección, o las Cláusulas Contractuales Tipo de la Comisión
            Europea junto con medidas complementarias cuando no lo tiene.
          </p>
          <p className="mt-3">
            Puedes pedirnos más información sobre las garantías concretas de
            cada transferencia escribiendo a{" "}
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
            6. Cómo protegemos tus datos
          </h2>
          <ul className="flex flex-col gap-1">
            <li>
              Tu contraseña se guarda cifrada con un hash con sal. Nadie, ni
              siquiera nosotros, puede leerla.
            </li>
            <li>Todo el tráfico de la web va cifrado con TLS.</li>
            <li>
              El acceso a la base de datos y al panel de administración está
              restringido a personal autorizado y protegido por autenticación y
              control de acceso por rol.
            </li>
            <li>
              Los datos de tu tarjeta nunca pasan por nuestros servidores: los
              gestiona Stripe en un entorno PCI DSS auditado.
            </li>
          </ul>
        </section>

        <section aria-labelledby="derechos">
          <h2
            id="derechos"
            className="mb-3 text-2xl font-extrabold tracking-tight text-ink-950"
          >
            7. Tus derechos
          </h2>
          <p className="mb-3">
            Puedes ejercer en cualquier momento los siguientes derechos:
          </p>
          <dl className="flex flex-col gap-3">
            <Derecho
              nombre="Acceso"
              texto="Saber qué datos tuyos tratamos y para qué."
            />
            <Derecho
              nombre="Rectificación"
              texto="Corregir datos inexactos o incompletos, desde tu cuenta."
            />
            <Derecho
              nombre="Supresión"
              texto="Pedir que eliminemos tus datos. Puedes hacerlo desde «Mi cuenta» o escribiéndonos."
            />
            <Derecho
              nombre="Oposición"
              texto="Oponerte a un tratamiento basado en interés legítimo."
            />
            <Derecho
              nombre="Limitación"
              texto="Pedir que suspendamos el tratamiento mientras verificamos si es lícito."
            />
            <Derecho
              nombre="Portabilidad"
              texto="Recibir tus datos en un formato estructurado y de uso común."
            />
            <Derecho
              nombre="Revocación del consentimiento"
              texto="Retirar el consentimiento, sin que ello afecte a la licitud del tratamiento previo."
            />
          </dl>

          <div className="mt-6 rounded-card border border-ink-200 bg-ink-50/60 p-5">
            <h3 className="text-sm font-bold text-ink-900">Cómo ejercerlos</h3>
            <p className="mt-2 text-sm">
              Escríbenos a{" "}
              <a
                href={`mailto:${siteConfig.email}`}
                className="font-medium text-brand-600 underline underline-offset-4 hover:text-brand-700"
              >
                {siteConfig.email}
              </a>{" "}
              indicando qué derecho quieres ejercer y la cuenta afectada.
              Respondemos en el plazo máximo de un mes.
            </p>
            <p className="mt-2 text-sm">
              También puedes hacerlo{" "}
              <strong className="text-ink-900">
                sin escribirnos, escribiéndonos desde la cuenta
              </strong>
              : en el panel de administración puedes exportar todos tus datos en
              un archivo y solicitar que se eliminen. No necesitas justificarlo.
            </p>
          </div>
        </section>

        <section aria-labelledby="reclamacion">
          <h2
            id="reclamacion"
            className="mb-3 text-2xl font-extrabold tracking-tight text-ink-950"
          >
            8. Reclamación ante la Agencia Española de Protección de Datos
          </h2>
          <p>
            Si consideras que no hemos atendido correctamente tu solicitud,
            puedes presentar una reclamación ante la Agencia Española de
            Protección de Datos (AEPD):
          </p>
          <ul className="mt-3 flex flex-col gap-1">
            <li>
              Sitio web:{" "}
              <a
                href="https://www.aepd.es"
                rel="noopener noreferrer"
                target="_blank"
                className="font-medium text-brand-600 underline underline-offset-4 hover:text-brand-700"
              >
                www.aepd.es
              </a>
            </li>
            <li>Dirección: Calle de Jorge Juan, 6, 28001 Madrid.</li>
            <li>
              Nuestra inscripción: Dirección de la Agencia Española de
              Protección de Datos
            </li>
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
            Usamos cookies propias y de terceros. La información completa sobre
            su tipo, finalidad y duración está en la{" "}
            <Link
              href="/cookies"
              className="font-medium text-brand-600 underline underline-offset-4 hover:text-brand-700"
            >
              política de cookies
            </Link>
            .
          </p>
        </section>

        <section aria-labelledby="menores">
          <h2
            id="menores"
            className="mb-3 text-2xl font-extrabold tracking-tight text-ink-950"
          >
            10. Menores de edad
          </h2>
          <p>
            Esta tienda se dirige a mayores de 18 años. No recogemos ni tratamos
            datos de menores de esa edad. Si crees que un menor nos ha
            facilitado datos, escríbenos y los eliminaremos.
          </p>
        </section>

        <section aria-labelledby="cambios">
          <h2
            id="cambios"
            className="mb-3 text-2xl font-extrabold tracking-tight text-ink-950"
          >
            11. Cambios en esta política
          </h2>
          <p>
            Actualizaremos esta política cuando cambien los tratamientos o la
            normativa aplicable. La fecha de la última actualización aparece al
            principio del documento, y los cambios relevantes se anunciarán de
            forma visible en la web.
          </p>
        </section>
      </div>
    </div>
  );
}

function Dato({
  termino,
  children,
}: {
  termino: string;
  children: React.ReactNode;
}) {
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
      <strong className="text-ink-900">{nombre}.</strong> {motivo} Consulta su{" "}
      <a
        href={enlaces}
        rel="noopener noreferrer"
        target="_blank"
        className="font-medium text-brand-600 underline underline-offset-4 hover:text-brand-700"
      >
        política de privacidad
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
