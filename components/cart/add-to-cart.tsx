"use client";

import { MinusIcon, PlusIcon } from "@heroicons/react/24/outline";
import clsx from "clsx";
import { addItem } from "components/cart/actions";
import { Product, ProductVariant } from "@/lib/commerce/types";
import { useSearchParams } from "next/navigation";
import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import { useCart } from "./cart-context";
import { translate } from "@/lib/i18n/dict";
import { useLanguage } from "components/i18n/language-context";

const MAX_CANTIDAD = 99;

function SubmitButton({
  disponible,
  pending,
}: {
  disponible: boolean;
  pending: boolean;
}) {
  const buttonClasses =
    "relative flex w-full items-center justify-center rounded-full bg-brand-500 p-4 tracking-wide text-white";
  const disabledClasses = "cursor-not-allowed opacity-60 hover:opacity-60";
  const { lang } = useLanguage();

  if (!disponible)
    return (
      <button disabled className={clsx(buttonClasses, disabledClasses)}>
        {translate(lang, "cart.soldOut")}
      </button>
    );

  return (
    <button
      aria-label={translate(lang, "cart.add")}
      className={clsx(buttonClasses, "hover:opacity-90", {
        "cursor-wait opacity-70 hover:opacity-70": pending,
      })}
      disabled={pending}
    >
      <div className="absolute left-0 ml-4">
        <PlusIcon className="h-5" />
      </div>
      {pending ? translate(lang, "cart.adding") : translate(lang, "cart.add")}
    </button>
  );
}

function QuantitySelector({
  cantidad,
  max,
  onChange,
}: {
  cantidad: number;
  max: number;
  onChange: (valor: number) => void;
}) {
  const boton =
    "px-3 py-2 text-neutral-500 transition hover:text-black disabled:cursor-not-allowed disabled:opacity-40 dark:hover:text-white";
  const { lang } = useLanguage();

  return (
    <div className="mb-4 flex items-center gap-3">
      <label htmlFor="cantidad" className="text-sm font-medium">
        {translate(lang, "cart.quantity")}
      </label>
      <div className="flex items-center rounded-full border border-neutral-300 dark:border-neutral-700">
        <button
          type="button"
          aria-label={translate(lang, "cart.minus")}
          onClick={() => onChange(cantidad - 1)}
          disabled={cantidad <= 1}
          className={boton}
        >
          <MinusIcon className="h-4 w-4" />
        </button>
        <input
          id="cantidad"
          type="number"
          min={1}
          max={max}
          value={cantidad}
          onChange={(event) => onChange(Number(event.target.value))}
          className="w-12 border-x border-neutral-300 bg-transparent py-2 text-center text-sm dark:border-neutral-700"
        />
        <button
          type="button"
          aria-label={translate(lang, "cart.plus")}
          onClick={() => onChange(cantidad + 1)}
          disabled={cantidad >= max}
          className={boton}
        >
          <PlusIcon className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export function AddToCart({ product }: { product: Product }) {
  const { variants, availableForSale } = product;
  const { addCartItem } = useCart();
  const searchParams = useSearchParams();
  const [result, formAction, isPending] = useActionState(addItem, null);
  const [cantidad, setCantidad] = useState(1);
  const { lang } = useLanguage();

  const variant = variants.find((v: ProductVariant) =>
    v.selectedOptions.every(
      (option) => option.value === searchParams.get(option.name.toLowerCase()),
    ),
  );
  const defaultVariantId = variants.length === 1 ? variants[0]?.id : undefined;
  const selectedVariantId = variant?.id || defaultVariantId;
  // Antes se hacía con `!` y petaba con TypeError al renderizar un producto con
  // varias variantes y sin parámetros de URL. Ahora simply cae a la primera.
  const finalVariant = variants.find((v) => v.id === selectedVariantId);

  // El stock solo acota a los productos gestionados por stock; en pre-venta,
  // a-pedido y oferta no hay límite.
  const maxCantidad =
    product.status === "stock" && product.stock > 0
      ? Math.min(MAX_CANTIDAD, product.stock)
      : MAX_CANTIDAD;

  useEffect(() => {
    if (!result) return;
    if (result.ok) {
      toast.success(translate(lang, "cart.added"));
    } else {
      toast.error(result.error ?? translate(lang, "cart.addError"));
    }
  }, [result]);

  const actualizarCantidad = (valor: number) => {
    if (Number.isNaN(valor)) return;
    setCantidad(Math.min(maxCantidad, Math.max(1, valor)));
  };

  const deshabilitado = !availableForSale || !finalVariant;

  if (!finalVariant) return null;

  const addItemAction = formAction.bind(null, {
    productoId: product.id,
    varianteId: finalVariant.id,
    cantidad,
  });

  return (
    <form
      action={async () => {
        if (deshabilitado) return;
        addCartItem({
          productoId: product.id,
          varianteId: finalVariant.id,
          titulo: product.title,
          imagen: product.featuredImage?.url || null,
          varianteTitulo: finalVariant.title,
          precio: Number(finalVariant.price.amount),
          cantidad,
        });
        await addItemAction();
      }}
    >
      <QuantitySelector
        cantidad={cantidad}
        max={maxCantidad}
        onChange={actualizarCantidad}
      />
      <SubmitButton disponible={!deshabilitado} pending={isPending} />
      <p aria-live="polite" className="sr-only" role="status">
        {result && !result.ok ? result.error : ""}
      </p>
    </form>
  );
}
