import { createClient } from "@/lib/supabase/server";
import { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getLang } from "@/lib/i18n/lang";
import { translate } from "@/lib/i18n/dict";

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getLang();
  return {
    title: translate(lang, "account.metaTitle"),
    description: translate(lang, "account.metaDescription"),
  };
}

export default async function AccountPage() {
  const lang = await getLang();
  const accountCards = [
    {
      href: "/account/profile",
      title: translate(lang, "account.card.profile"),
      description: translate(lang, "account.card.profileDesc"),
    },
    {
      href: "/account/addresses",
      title: translate(lang, "account.card.addresses"),
      description: translate(lang, "account.card.addressesDesc"),
    },
    {
      href: "/account/orders",
      title: translate(lang, "account.card.orders"),
      description: translate(lang, "account.card.ordersDesc"),
    },
    {
      href: "/account/wishlist",
      title: translate(lang, "account.card.wishlist"),
      description: translate(lang, "account.card.wishlistDesc"),
    },
  ];
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/account");
  }

  const { count: orderCount } = await supabase
    .from("pedidos")
    .select("id", { count: "exact", head: true })
    .eq("usuario_id", user.id);

  return (
    <section>
      <div className="mb-6">
        <h2 className="text-xl font-bold">
          {translate(lang, "account.summaryTitle")}
        </h2>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
          {translate(lang, "account.summaryDesc")} {orderCount}{" "}
          {translate(
            lang,
            orderCount === 1 ? "account.orderOne" : "account.orderOther",
          )}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {accountCards.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="rounded-lg border border-neutral-200 bg-white p-6 transition hover:-translate-y-0.5 hover:border-blue-500 hover:shadow-md dark:border-neutral-800 dark:bg-black"
          >
            <h3 className="font-semibold">{card.title}</h3>
            <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
              {card.description}
            </p>
            {card.href === "/account/orders" && orderCount !== null ? (
              <p className="mt-4 text-sm font-medium text-blue-600 dark:text-blue-400">
                {orderCount} {orderCount === 1 ? "pedido" : "pedidos"}
              </p>
            ) : null}
          </Link>
        ))}
      </div>
    </section>
  );
}
