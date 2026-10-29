import SignOutButton from "@/components/auth/sign-out-button";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getLang } from "@/lib/i18n/lang";
import { translate } from "@/lib/i18n/dict";

export default async function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/account");
  }

  const { data: profile } = await supabase
    .from("perfiles")
    .select("full_nombre")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) {
    // `upsert` y no `insert`: con `insert`, dos peticiones simultáneas sobre el
    // mismo perfil (el layout corre en cada navegación) chocan con una violación
    // de clave primaria y el usuario ve un error al recargar.
    await supabase.from("perfiles").upsert(
      {
        id: user.id,
        full_nombre: user.user_metadata?.full_nombre ?? null,
      },
      { onConflict: "id" },
    );
  }

  const lang = await getLang();
  const accountLinks = [
    { href: "/account", label: translate(lang, "account.tab.overview") },
    { href: "/account/profile", label: translate(lang, "account.tab.profile") },
    {
      href: "/account/addresses",
      label: translate(lang, "account.tab.addresses"),
    },
    { href: "/account/orders", label: translate(lang, "account.tab.orders") },
    {
      href: "/account/wishlist",
      label: translate(lang, "account.tab.wishlist"),
    },
  ];

  const fullName =
    profile?.full_nombre ??
    user.user_metadata?.full_nombre ??
    translate(lang, "account.guest");

  return (
    <div className="mx-auto min-h-[70vh] w-full max-w-6xl px-4 py-10 lg:px-6">
      <header className="flex flex-col gap-6 border-b border-neutral-200 pb-8 sm:flex-row sm:items-center sm:justify-between dark:border-neutral-800">
        <div>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            {translate(lang, "account.title")}
          </p>
          <h1 className="mt-1 text-3xl font-bold text-black dark:text-white">
            {translate(lang, "account.hello")}, {fullName}
          </h1>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            {user.email}
          </p>
        </div>
        <SignOutButton />
      </header>

      <nav className="my-8 flex gap-2 overflow-x-auto border-b border-neutral-200 dark:border-neutral-800">
        {accountLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="shrink-0 border-b-2 border-transparent px-3 py-3 text-sm font-medium text-neutral-500 transition hover:border-blue-600 hover:text-black dark:text-neutral-400 dark:hover:text-white"
          >
            {link.label}
          </Link>
        ))}
      </nav>

      {children}
    </div>
  );
}
