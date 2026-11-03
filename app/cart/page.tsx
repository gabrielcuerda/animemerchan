import { getCart } from "@/lib/cart";
import Image from "next/image";
import Link from "next/link";
import Price from "@/components/price";
import { DEFAULT_OPTION, IVA_PORCENTAJE } from "@/lib/constants";
import { ENVIO_GRATIS_DESDE, faltaParaEnvioGratis } from "@/lib/envio";
import { createUrl } from "@/lib/utils";
import { DeleteItemButton } from "@/components/cart/delete-item-button";
import { EditItemQuantityButton } from "@/components/cart/edit-item-quantity-button";
import { clearCartAction } from "@/components/cart/actions";
import { ShoppingCartIcon } from "@heroicons/react/24/outline";

export const dynamic = "force-dynamic";

export default async function CartPage() {
  const cart = await getCart();

  if (!cart || cart.items.length === 0) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center">
        <ShoppingCartIcon className="h-16 w-16 text-neutral-400" />
        <h1 className="mt-6 text-2xl font-bold">Tu carrito está vacío</h1>
        <p className="mt-2 text-neutral-500">
          Todavía no has añadido ningún producto.
        </p>
        <Link
          href="/search"
          className="mt-6 rounded-full bg-blue-600 px-6 py-3 text-sm font-medium text-white hover:opacity-90"
        >
          Seguir comprando
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="mb-8 text-3xl font-bold">Carrito</h1>

      <div className="flex flex-col gap-8 lg:flex-row">
        <div className="flex-1">
          <ul className="divide-y divide-neutral-200 dark:divide-neutral-700">
            {cart.items.map((item) => {
              const merchandiseUrl = createUrl(
                `/product/${item.productos?.slug || ""}`,
                new URLSearchParams({}),
              );
              return (
                <li key={item.id} className="flex gap-4 py-4">
                  <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-md border border-neutral-300 bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-900">
                    {item.productos?.producto_imagenes?.[0]?.url && (
                      <Image
                        className="h-full w-full object-cover"
                        width={96}
                        height={96}
                        alt={
                          item.productos?.producto_imagenes?.[0]?.alt_text ||
                          item.productos?.titulo ||
                          ""
                        }
                        src={item.productos.producto_imagenes[0].url}
                      />
                    )}
                  </div>
                  <div className="flex flex-1 flex-col">
                    <div className="flex justify-between gap-4">
                      <div>
                        <Link
                          href={merchandiseUrl}
                          className="text-base font-medium hover:underline"
                        >
                          {item.productos?.titulo}
                        </Link>
                        {item.producto_variantes?.titulo !== DEFAULT_OPTION && (
                          <p className="text-sm text-neutral-500 dark:text-neutral-400">
                            {item.producto_variantes?.titulo}
                          </p>
                        )}
                      </div>
                      <Price
                        amount={(
                          (item.producto_variantes?.precio || 0) * item.cantidad
                        ).toFixed(2)}
                        currencyCode="EUR"
                      />
                    </div>
                    <div className="mt-auto flex items-center justify-between">
                      <div className="flex h-9 flex-row items-center rounded-full border border-neutral-200 dark:border-neutral-700">
                        <EditItemQuantityButton item={item} type="minus" />
                        <p className="w-6 text-center text-sm">
                          {item.cantidad}
                        </p>
                        <EditItemQuantityButton item={item} type="plus" />
                      </div>
                      <DeleteItemButton item={item} />
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>

          <form
            action={async () => {
              await clearCartAction();
            }}
            className="mt-4"
          >
            <button
              type="submit"
              className="text-sm text-neutral-500 underline hover:text-neutral-800 dark:hover:text-neutral-300"
            >
              Vaciar carrito
            </button>
          </form>
        </div>

        <div className="w-full lg:w-80">
          <div className="rounded-lg border border-neutral-200 p-6 dark:border-neutral-700">
            <h2 className="mb-4 text-lg font-semibold">Resumen del pedido</h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-neutral-500 dark:text-neutral-400">
                  Subtotal
                </span>
                <Price amount={cart.subtotal.toFixed(2)} currencyCode="EUR" />
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500 dark:text-neutral-400">
                  IVA ({IVA_PORCENTAJE} %)
                </span>
                <Price amount={cart.iva.toFixed(2)} currencyCode="EUR" />
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500 dark:text-neutral-400">
                  Envío
                </span>
                <span>
                  {cart.costeEnvio > 0 ? (
                    <Price
                      amount={cart.costeEnvio.toFixed(2)}
                      currencyCode="EUR"
                    />
                  ) : (
                    "Gratis"
                  )}
                </span>
              </div>
              <div className="flex justify-between border-t border-neutral-200 pt-3 text-base font-semibold dark:border-neutral-700">
                <span>Total</span>
                <Price amount={cart.total.toFixed(2)} currencyCode="EUR" />
              </div>
            </div>

            <p className="mt-3 text-xs text-neutral-500">
              Los precios no incluyen IVA. Se aplica un {IVA_PORCENTAJE} % en el
              momento del pago.
            </p>

            <p className="mt-1 text-xs text-neutral-500">
              {cart.costeEnvio > 0
                ? `Envío gratis a partir de ${ENVIO_GRATIS_DESDE} €. Te faltan ${faltaParaEnvioGratis(cart.subtotal).toFixed(2)} €.`
                : "Este pedido tiene envío gratuito."}
            </p>

            <Link
              href="/checkout"
              className="mt-6 block w-full rounded-full bg-blue-600 p-3 text-center text-sm font-medium text-white opacity-90 hover:opacity-100"
            >
              Ir a pagar
            </Link>
            <Link
              href="/search"
              className="mt-3 block text-center text-sm text-neutral-500 hover:underline"
            >
              Seguir comprando
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
