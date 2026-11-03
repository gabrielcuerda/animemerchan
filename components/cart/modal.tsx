"use client";

import { Dialog, Transition } from "@headlessui/react";
import { ShoppingCartIcon, XMarkIcon } from "@heroicons/react/24/outline";
import clsx from "clsx";
import Price from "@/components/price";
import { DEFAULT_OPTION, IVA_PORCENTAJE } from "@/lib/constants";
import { createUrl } from "@/lib/utils";
import Image from "next/image";
import Link from "next/link";
import { Fragment, useEffect, useRef, useState } from "react";
import { useCart } from "./cart-context";
import { translate } from "@/lib/i18n/dict";
import { useLanguage } from "components/i18n/language-context";
import { DeleteItemButton } from "./delete-item-button";
import { EditItemQuantityButton } from "./edit-item-quantity-button";
import OpenCart from "./open-cart";

export default function CartModal() {
  const { cart, updateCartItem } = useCart();
  const { lang } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const quantityRef = useRef(cart?.totalItems);
  const openCart = () => setIsOpen(true);
  const closeCart = () => setIsOpen(false);

  useEffect(() => {
    if (
      cart?.totalItems &&
      cart?.totalItems !== quantityRef.current &&
      cart?.totalItems > 0
    ) {
      if (!isOpen) setIsOpen(true);
      quantityRef.current = cart?.totalItems;
    }
  }, [isOpen, cart?.totalItems, quantityRef]);

  return (
    <>
      <button aria-label={translate(lang, "cart.open")} onClick={openCart}>
        <OpenCart quantity={cart?.totalItems} />
      </button>
      <Transition show={isOpen}>
        <Dialog onClose={closeCart} className="relative z-50">
          <Transition.Child
            as={Fragment}
            enter="transition-all ease-in-out duration-300"
            enterFrom="opacity-0 backdrop-blur-none"
            enterTo="opacity-100 backdrop-blur-[.5px]"
            leave="transition-all ease-in-out duration-200"
            leaveFrom="opacity-100 backdrop-blur-[.5px]"
            leaveTo="opacity-0 backdrop-blur-none"
          >
            <div className="fixed inset-0 bg-blue-950/40" aria-hidden="true" />
          </Transition.Child>
          <Transition.Child
            as={Fragment}
            enter="transition-all ease-in-out duration-300"
            enterFrom="translate-x-full"
            enterTo="translate-x-0"
            leave="transition-all ease-in-out duration-200"
            leaveFrom="translate-x-0"
            leaveTo="translate-x-full"
          >
            <Dialog.Panel className="fixed bottom-0 right-0 top-0 flex h-full w-full flex-col border-l border-neutral-200 bg-white/80 p-6 text-black backdrop-blur-xl md:w-[390px] dark:border-neutral-700 dark:bg-black/80 dark:text-white">
              <div className="flex items-center justify-between">
                <p className="text-lg font-semibold">
                  {translate(lang, "cart.title")}
                </p>
                <button
                  aria-label={translate(lang, "cart.close")}
                  onClick={closeCart}
                >
                  <CloseCart />
                </button>
              </div>

              {!cart || cart.items.length === 0 ? (
                <div className="mt-20 flex w-full flex-col items-center justify-center overflow-hidden">
                  <ShoppingCartIcon className="h-16" />
                  <p className="mt-6 text-center text-2xl font-bold">
                    {translate(lang, "cart.empty")}
                  </p>
                </div>
              ) : (
                <div className="flex h-full flex-col justify-between overflow-hidden p-1">
                  <ul className="grow overflow-auto py-4">
                    {cart.items
                      .sort((a, b) =>
                        (a.productos?.titulo || "").localeCompare(
                          b.productos?.titulo || "",
                        ),
                      )
                      .map((item, i) => {
                        const merchandiseUrl = createUrl(
                          `/product/${item.productos?.slug || ""}`,
                          new URLSearchParams({}),
                        );
                        return (
                          <li
                            key={i}
                            className="flex w-full flex-col border-b border-neutral-300 dark:border-neutral-700"
                          >
                            <div className="relative flex w-full flex-row justify-between px-1 py-4">
                              <div className="absolute z-40 -ml-1 -mt-2">
                                <DeleteItemButton
                                  item={item}
                                  optimisticUpdate={updateCartItem}
                                />
                              </div>
                              <div className="flex flex-row">
                                <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-md border border-neutral-300 bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-900">
                                  {/* next/image revienta con src="" */}
                                  {item.productos?.producto_imagenes?.[0]
                                    ?.url && (
                                    <Image
                                      className="h-full w-full object-cover"
                                      width={64}
                                      height={64}
                                      alt={
                                        item.productos.producto_imagenes[0]
                                          .alt_text ||
                                        item.productos?.titulo ||
                                        ""
                                      }
                                      src={
                                        item.productos.producto_imagenes[0].url
                                      }
                                    />
                                  )}
                                </div>
                                <Link
                                  href={merchandiseUrl}
                                  onClick={closeCart}
                                  className="z-30 ml-2 flex flex-row space-x-4"
                                >
                                  <div className="flex flex-1 flex-col text-base">
                                    <span className="leading-tight">
                                      {item.productos?.titulo}
                                    </span>
                                    {item.producto_variantes?.titulo !==
                                      DEFAULT_OPTION && (
                                      <p className="text-sm text-neutral-500 dark:text-neutral-400">
                                        {item.producto_variantes?.titulo}
                                      </p>
                                    )}
                                  </div>
                                </Link>
                              </div>
                              <div className="flex h-16 flex-col justify-between">
                                <Price
                                  className="flex justify-end space-y-2 text-right text-sm"
                                  amount={(
                                    (item.producto_variantes?.precio || 0) *
                                    item.cantidad
                                  ).toFixed(2)}
                                  currencyCode="EUR"
                                />
                                <div className="ml-auto flex h-9 flex-row items-center rounded-full border border-neutral-200 dark:border-neutral-700">
                                  <EditItemQuantityButton
                                    item={item}
                                    type="minus"
                                    optimisticUpdate={updateCartItem}
                                  />
                                  <p className="w-6 text-center">
                                    <span className="w-full text-sm">
                                      {item.cantidad}
                                    </span>
                                  </p>
                                  <EditItemQuantityButton
                                    item={item}
                                    type="plus"
                                    optimisticUpdate={updateCartItem}
                                  />
                                </div>
                              </div>
                            </div>
                          </li>
                        );
                      })}
                  </ul>
                  <div className="py-4 text-sm text-neutral-500 dark:text-neutral-400">
                    <div className="mb-3 flex items-center justify-between border-b border-neutral-200 pb-1 dark:border-neutral-700">
                      <p>{translate(lang, "cart.subtotal")}</p>
                      <Price
                        className="text-right"
                        amount={cart.subtotal.toFixed(2)}
                        currencyCode="EUR"
                      />
                    </div>
                    <div className="mb-3 flex items-center justify-between border-b border-neutral-200 pb-1 dark:border-neutral-700">
                      <p>
                        {translate(lang, "cart.vat")} ({IVA_PORCENTAJE} %)
                      </p>
                      <Price
                        className="text-right"
                        amount={cart.iva.toFixed(2)}
                        currencyCode="EUR"
                      />
                    </div>
                    <div className="mb-3 flex items-center justify-between border-b border-neutral-200 pb-1 dark:border-neutral-700">
                      <p>{translate(lang, "cart.shipping")}</p>
                      <p className="text-right">
                        {cart.costeEnvio > 0 ? (
                          <Price
                            className="text-right"
                            amount={cart.costeEnvio.toFixed(2)}
                            currencyCode="EUR"
                          />
                        ) : (
                          translate(lang, "cart.freeShipping")
                        )}
                      </p>
                    </div>
                    <div className="flex items-center justify-between text-base">
                      <p>{translate(lang, "cart.total")}</p>
                      <Price
                        className="text-right text-base font-semibold text-black dark:text-white"
                        amount={cart.total.toFixed(2)}
                        currencyCode="EUR"
                      />
                    </div>
                  </div>
                  <Link
                    href="/checkout"
                    className="block w-full rounded-full bg-blue-600 p-3 text-center text-sm font-medium text-white opacity-90 hover:opacity-100"
                    onClick={closeCart}
                  >
                    {translate(lang, "cart.checkout")}
                  </Link>
                  <Link
                    href="/cart"
                    className="mt-3 block text-center text-sm text-neutral-500 hover:underline"
                    onClick={closeCart}
                  >
                    {translate(lang, "cart.viewFull")}
                  </Link>
                </div>
              )}
            </Dialog.Panel>
          </Transition.Child>
        </Dialog>
      </Transition>
    </>
  );
}

function CloseCart({ className }: { className?: string }) {
  return (
    <div className="relative flex h-11 w-11 items-center justify-center rounded-md border border-neutral-200 text-black transition-colors dark:border-neutral-700 dark:text-white">
      <XMarkIcon
        className={clsx(
          "h-6 transition-all ease-in-out hover:scale-110",
          className,
        )}
      />
    </div>
  );
}
